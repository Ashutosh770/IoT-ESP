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

// Update SensorData and related interfaces

export interface SensorData {
  temperature: number;
  humidity: number;
  soilMoisture: number;
  distance: number;
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
  soilMoisture: number;
}

export interface SensorDataResponse {
  success: boolean;
  data: {
    deviceId: string;
    temperature: number;
    humidity: number;
    soilMoisture: number;
    timestamp: string;
  };
}

export interface RelayControlResponse {
  success: boolean;
  deviceId: string;
  relay: 'on' | 'off';
}

export interface DeviceDetails {
  deviceId: string;
  authToken: string;
  name: string;
  location: string;
  lastSeen: string;
}

export interface DeviceDetailsResponse {
  success: boolean;
  device: DeviceDetails;
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
    console.log('Raw device response:', JSON.stringify(data, null, 2));
    
    if (!data.success || !Array.isArray(data.devices)) {
      throw new Error('Invalid response format');
    }

    // Transform the data to match our Device interface
    const transformedDevices = data.devices.map((device: any) => {
      console.log('Processing device:', JSON.stringify(device, null, 2));
      return {
        _id: device._id?.$oid || device._id || device.deviceId,
        deviceId: device.deviceId,
        name: device.name,
        location: device.location,
        createdAt: device.createdAt?.$date || device.createdAt || device.lastSeen,
        authToken: device.authToken || device.auth_token // Try both possible field names
      };
    });
    
    console.log('Transformed devices:', JSON.stringify(transformedDevices, null, 2));
    
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
          soilMoisture: 0,
          distance: 0,
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
        soilMoisture: data.data.soilMoisture,
        distance: data.data.distance,
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
        soilMoisture: 0,
        distance: 0,
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
    // console.log('History data response:', data);
    
    if (!data.success || !Array.isArray(data.data)) {
      console.error('Invalid history data response format:', data);
      throw new Error('Invalid response format');
    }

    return {
      success: true,
      data: data.data.map((reading: { temperature: number; humidity: number; soilMoisture: number; distance?: number; timestamp: string }) => ({
        temperature: reading.temperature,
        humidity: reading.humidity,
        soilMoisture: reading.soilMoisture,
        distance: reading.distance || 0,
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
  soilMoisture: number,
  authToken: string
): Promise<SensorDataResponse> => {
  console.log('Sending sensor data:', { deviceId, temperature, humidity, soilMoisture });
  
  // Validate input ranges
  if (temperature < -40 || temperature > 80) {
    throw new Error('Temperature must be between -40°C and 80°C');
  }
  if (humidity < 0 || humidity > 100) {
    throw new Error('Humidity must be between 0% and 100%');
  }
  if (soilMoisture < 0 || soilMoisture > 100) {
    throw new Error('Soil moisture must be between 0% and 100%');
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
        humidity,
        soilMoisture
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
        soilMoisture: data.data.soilMoisture,
        timestamp: data.data.timestamp
      }
    };
  } catch (error: any) {
    console.error('Error sending sensor data:', error);
    throw error; // Re-throw to let the caller handle the error
  }
};

export const getRelayStatus = async (deviceId: string): Promise<{
  success: boolean;
  deviceId: string;
  relays: {
    relay1: 'on' | 'off';
    relay2: 'on' | 'off';
    relay3: 'on' | 'off';
    relay4: 'on' | 'off';
  };
}> => {
  try {
    const authToken = await getAuthToken(deviceId);
    if (!authToken) {
      throw new Error('No auth token found for device');
    }

    console.log('Fetching relay status for device:', deviceId);
    const response = await fetch(`${API_URL}/relay/status/${deviceId}`, {
      headers: {
        'x-auth-token': authToken
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Relay status fetch failed:', { 
        status: response.status, 
        error: errorText,
        url: `${API_URL}/relay/status/${deviceId}`
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Relay status response:', JSON.stringify(data, null, 2));

    if (!data.success || !data.deviceId || !data.relays) {
      console.error('Invalid relay status response format:', {
        hasSuccess: !!data.success,
        hasDeviceId: !!data.deviceId,
        hasRelays: !!data.relays,
        data
      });
      throw new Error('Invalid response format from server');
    }

    return data;
  } catch (error) {
    console.error('Error fetching relay status:', error);
    throw error;
  }
};

export const controlRelay = async (
  deviceId: string,
  relayNumber: number,
  state: 'on' | 'off'
): Promise<{
  success: boolean;
  deviceId: string;
  relays: {
    relay1: 'on' | 'off';
    relay2: 'on' | 'off';
    relay3: 'on' | 'off';
    relay4: 'on' | 'off';
  };
}> => {
  try {
    const authToken = await getAuthToken(deviceId);
    if (!authToken) {
      throw new Error('No auth token found for device');
    }

    console.log('Controlling relay:', { 
      deviceId, 
      relayNumber, 
      state,
      url: `${API_URL}/relay/control`
    });

    const response = await fetch(`${API_URL}/relay/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': authToken
      },
      body: JSON.stringify({
        deviceId,
        relayNumber,
        state
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Relay control failed:', { 
        status: response.status, 
        error: errorText,
        url: `${API_URL}/relay/control`
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Relay control response:', JSON.stringify(data, null, 2));

    if (!data.success || !data.deviceId || !data.relays) {
      console.error('Invalid relay control response format:', {
        hasSuccess: !!data.success,
        hasDeviceId: !!data.deviceId,
        hasRelays: !!data.relays,
        data
      });
      throw new Error('Invalid response format from server');
    }

    return data;
  } catch (error) {
    console.error('Error controlling relay:', error);
    throw error;
  }
};

export const fetchDeviceDetails = async (deviceId: string): Promise<DeviceDetailsResponse> => {
  try {
    if (!deviceId) {
      throw new Error('Device ID is required');
    }

    const url = `${API_URL}/devices/${deviceId}`;
    console.log('Fetching device details from:', url);
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Device details response:', JSON.stringify(data, null, 2));
    
    if (!data.success || !data.device) {
      throw new Error('Invalid response format');
    }

    // The API response already matches our interface, no transformation needed
    return {
      success: true,
      device: data.device
    };
  } catch (error: any) {
    console.error('Error fetching device details:', error);
    throw error;
  }
};
 