import axios from 'axios';
import { getAuthToken } from '../utils/auth';

// Use environment variable with fallback
const API_URL = process.env.EXPO_PUBLIC_API_URL 
  ? `${process.env.EXPO_PUBLIC_API_URL}/api`
  : 'https://iot-backend-dj8u.onrender.com/api';

// Log the API URL for debugging
console.log('Using API URL:', API_URL);

// Types
export interface Device {
  _id: string;
  deviceId: string;
  name: string;
  location: string;
  createdAt: string;
  authToken: string;
}

export interface SensorReading {
  _id: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  timestamp: string;
}

export interface DevicesResponse {
  success: boolean;
  count: number;
  devices: Device[];
}

export interface SensorData {
  temperature: number;
  humidity: number;
  timestamp: string;
}

export interface SensorResponse {
  success: boolean;
  data: SensorData;
}

export interface SensorHistoryResponse {
  success: boolean;
  data: SensorData[];
}

export interface SensorDataInput {
  deviceId: string;
  temperature: number;
  humidity: number;
}

export interface SensorDataResponse {
  success: boolean;
  data: {
    deviceId: string;
    temperature: number;
    humidity: number;
    timestamp: string;
  };
}

export interface RelayControlResponse {
  success: boolean;
  deviceId: string;
  relay: 'on' | 'off';
}

// Helper function to add timeout to fetch
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 60000) => { // 1 minute timeout
  console.log(`Making request to ${url} with ${timeout}ms timeout`);
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Test the API endpoint
export const testApiEndpoint = async (): Promise<boolean> => {
  try {
    console.log('Testing API endpoint...');
    const response = await fetchWithTimeout(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (response.ok) {
      console.log('API endpoint is accessible');
      return true;
    } else {
      console.error('API endpoint returned error:', response.status);
      return false;
    }
  } catch (error) {
    console.error('API endpoint test failed:', error);
    return false;
  }
};

// Wake up the server with retries
const wakeUpServer = async (maxRetries = 3, delay = 2000): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Wake-up attempt ${i + 1}/${maxRetries}...`);
      const response = await fetchWithTimeout(`${API_URL}/wakeup`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      }, 30000); // 30 second timeout for wake-up

      if (response.ok) {
        console.log('Server is awake');
        return true;
      }
    } catch (error) {
      console.log(`Wake-up attempt ${i + 1} failed:`, error);
    }
    
    if (i < maxRetries - 1) {
      console.log(`Waiting ${delay/1000} seconds before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
};

// Regular fetch devices function
export const fetchDevices = async (): Promise<DevicesResponse> => {
  try {
    console.log('Fetching devices from:', `${API_URL}/devices/count`);
    const response = await fetchWithTimeout(`${API_URL}/devices/count`);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Raw device response:', data);
    
    if (!data.success || !Array.isArray(data.devices)) {
      throw new Error('Invalid response format');
    }

    // Transform the data to match our Device interface
    const transformedDevices = data.devices.map((device: any) => ({
      _id: device._id?.$oid || device._id || device.deviceId,
      deviceId: device.deviceId,
      name: device.name,
      location: device.location,
      createdAt: device.createdAt?.$date || device.createdAt || device.lastSeen,
      authToken: device.authToken || 'ec0d7c50f303ef0af51928bd681f246f1d2cd53c5e9db7ac8afc4713380f660b' // Use the provided auth token
    }));
    
    console.log('Transformed devices:', transformedDevices);
    
    return {
      success: true,
      count: transformedDevices.length,
      devices: transformedDevices
    };
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    return {
      success: false,
      count: 0,
      devices: []
    };
  }
};

// Fetch devices with wake-up
export const fetchDevicesWithWakeup = async (): Promise<DevicesResponse> => {
  try {
    // First try to wake up the server
    console.log('Attempting to wake up server...');
    const isAwake = await wakeUpServer();
    
    if (!isAwake) {
      console.log('Server wake-up failed, trying direct fetch...');
    }

    // Then fetch devices
    return await fetchDevices();
  } catch (error) {
    console.error('Error in fetchDevicesWithWakeup:', error);
    return {
      success: false,
      count: 0,
      devices: []
    };
  }
};

export const fetchLatestData = async (deviceId: string): Promise<SensorResponse> => {
  try {
    if (!deviceId) {
      console.error('No device ID provided to fetchLatestData');
      throw new Error('Device ID is required');
    }

    const url = `${API_URL}/devices/${deviceId}/latest`;
    console.log('Fetching latest data from:', url);
    const response = await fetchWithTimeout(url);
    
    if (response.status === 404) {
      console.log('No latest data found, fetching most recent from history...');
      // Try to get the most recent reading from history
      const historyResponse = await fetchHistoryData(deviceId, 1);
      if (historyResponse.success && historyResponse.data.length > 0) {
        const mostRecent = historyResponse.data[0];
        console.log('Using most recent history data:', mostRecent);
        return {
          success: true,
          data: mostRecent
        };
      }
      
      console.log('No history data found for device:', deviceId);
      return {
        success: true,
        data: {
          temperature: 0,
          humidity: 0,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    if (!response.ok) {
      console.error('Latest data fetch failed with status:', response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Latest data response:', data);
    
    if (!data.success || !data.data) {
      console.error('Invalid latest data response format:', data);
      throw new Error('Invalid response format');
    }

    return {
      success: true,
      data: {
        temperature: data.data.temperature,
        humidity: data.data.humidity,
        timestamp: data.data.timestamp
      }
    };
  } catch (error: any) {
    console.error('Error fetching latest data:', error);
    // Try to get the most recent reading from history as a fallback
    try {
      const historyResponse = await fetchHistoryData(deviceId, 1);
      if (historyResponse.success && historyResponse.data.length > 0) {
        const mostRecent = historyResponse.data[0];
        console.log('Using most recent history data as fallback:', mostRecent);
        return {
          success: true,
          data: mostRecent
        };
      }
    } catch (historyError) {
      console.error('Failed to fetch history data as fallback:', historyError);
    }
    
    return {
      success: false,
      data: {
        temperature: 0,
        humidity: 0,
        timestamp: new Date().toISOString()
      }
    };
  }
};

export const fetchHistoryData = async (deviceId: string, limit: number = 100): Promise<SensorHistoryResponse> => {
  try {
    if (!deviceId) {
      console.error('No device ID provided to fetchHistoryData');
      throw new Error('Device ID is required');
    }

    const url = `${API_URL}/devices/${deviceId}/history?limit=${limit}`;
    console.log('Fetching history data from:', url);
    const response = await fetchWithTimeout(url);
    
    if (response.status === 404) {
      console.log('No history data found for device:', deviceId);
      return {
        success: true,
        data: []
      };
    }
    
    if (!response.ok) {
      console.error('History data fetch failed with status:', response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('History data response:', data);
    
    if (!data.success || !Array.isArray(data.data)) {
      console.error('Invalid history data response format:', data);
      throw new Error('Invalid response format');
    }

    return {
      success: true,
      data: data.data.map((reading: { temperature: number; humidity: number; timestamp: string }) => ({
        temperature: reading.temperature,
        humidity: reading.humidity,
        timestamp: reading.timestamp
      }))
    };
  } catch (error: any) {
    console.error('Error fetching history data:', error);
    return {
      success: false,
      data: []
    };
  }
};

export const sendSensorData = async (
  deviceId: string,
  temperature: number,
  humidity: number,
  authToken: string
): Promise<SensorDataResponse> => {
  console.log('Sending sensor data:', { deviceId, temperature, humidity });
  
  // Validate input ranges
  if (temperature < -40 || temperature > 80) {
    throw new Error('Temperature must be between -40°C and 80°C');
  }
  if (humidity < 0 || humidity > 100) {
    throw new Error('Humidity must be between 0% and 100%');
  }

  try {
    const url = `${API_URL}/data`;
    console.log('Sending data to:', url);
    
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': authToken
      },
      body: JSON.stringify({
        deviceId,
        temperature,
        humidity
      })
    });

    if (!response.ok) {
      console.error('Failed to send sensor data:', response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Sensor data response:', data);

    if (!data.success || !data.data) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format');
    }

    return {
      success: true,
      data: {
        deviceId: data.data.deviceId,
        temperature: data.data.temperature,
        humidity: data.data.humidity,
        timestamp: data.data.timestamp
      }
    };
  } catch (error: any) {
    console.error('Error sending sensor data:', error);
    throw error; // Re-throw to let the caller handle the error
  }
};

export const controlRelay = async (deviceId: string, state: 'on' | 'off'): Promise<RelayControlResponse> => {
  try {
    const authToken = await getAuthToken(deviceId);
    if (!authToken) {
      console.error('No auth token found for device:', deviceId);
      throw new Error('No auth token found for device');
    }

    console.log('Controlling relay:', { 
      deviceId, 
      state, 
      authToken: authToken.substring(0, 10) + '...' // Log partial token for debugging
    });

    const response = await fetch(`${API_URL}/relay/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': authToken
      },
      body: JSON.stringify({
        deviceId,
        relay: state,
        authToken
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Relay control failed:', { 
        status: response.status, 
        error: errorText,
        authToken: authToken.substring(0, 10) + '...' // Log partial token in error
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // console.log('Relay control response:', data);

    // Ensure response matches RelayControlResponse type
    if (!data.success || !data.deviceId || !data.relay) {
      throw new Error('Invalid response format from server');
    }

    return {
      success: data.success,
      deviceId: data.deviceId,
      relay: data.relay
    };
  } catch (error) {
    console.error('Error controlling relay:', error);
    throw error;
  }
};
 