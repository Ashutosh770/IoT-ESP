export interface RelayControlResponse {
  success: boolean;
  deviceId: string;
  relay: 'on' | 'off';
} 