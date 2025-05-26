import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@auth_token';

export const storeAuthToken = async (deviceId: string, token: string) => {
  try {
    const key = `${AUTH_TOKEN_KEY}_${deviceId}`;
    await AsyncStorage.setItem(key, token);
    console.log('Auth token stored successfully for device:', deviceId);
  } catch (error) {
    console.error('Error storing auth token:', error);
  }
};

export const getAuthToken = async (deviceId: string): Promise<string | null> => {
  try {
    const key = `${AUTH_TOKEN_KEY}_${deviceId}`;
    const token = await AsyncStorage.getItem(key);
    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
}; 