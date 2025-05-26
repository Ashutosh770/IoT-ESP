export type DeviceType = 'switch' | 'sensor' | 'other';

export type Device = {
  id: string;
  name: string;
  type: DeviceType;
  status?: 'on' | 'off';
  value?: any; // Use a more specific type if possible
  // Add other common device properties here
};

// Example utility function: Generate a unique device ID
export const generateDeviceId = (): string => {
  // In a real app, use a proper unique ID generation method (e.g., UUID)
  return `device-${Math.random().toString(36).substr(2, 9)}`;
};

// Example utility function: Format a sensor value
export const formatSensorValue = (value: any, unit: string = ''): string => {
  if (value === undefined || value === null) {
    return 'N/A';
  }
  if (typeof value === 'number') {
    return `${value.toFixed(1)}${unit}`;
  }
  return `${value}${unit}`;
};

// Example utility function: Parse MQTT message for device update
export const parseMqttMessage = (topic: string, message: string): { deviceId: string; payload: any } | null => {
  try {
    // Assuming topic format is something like 'devices/{deviceId}/status'
    const topicParts = topic.split('/');
    if (topicParts.length >= 2 && topicParts[0] === 'devices') {
      const deviceId = topicParts[1];
      const payload = JSON.parse(message);
      return { deviceId, payload };
    }
    return null;
  } catch (error) {
    console.error('Error parsing MQTT message:', error);
    return null;
  }
};

// Add other utility functions as needed (e.g., validate device data, handle different device types) 