export interface SensorData {
  deviceId: string;
  temperature: number;
  humidity: number;
  timestamp: string;
}

export interface ApiResponse {
  success: boolean;
  data: SensorData | null;
} 