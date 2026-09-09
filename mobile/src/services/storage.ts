import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// In-memory fallback for web/testing
const memoryStorage: Record<string, string> = {};

export const SecureStorage = {
  async set(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        memoryStorage[key] = value;
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.warn('SecureStore set error, fallback to memory:', error);
      memoryStorage[key] = value;
    }
  },

  async get(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return memoryStorage[key] || null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn('SecureStore get error, fallback to memory:', error);
      return memoryStorage[key] || null;
    }
  },

  async delete(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        delete memoryStorage[key];
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.warn('SecureStore delete error:', error);
      delete memoryStorage[key];
    }
  },
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'owms_access_token',
  REFRESH_TOKEN: 'owms_refresh_token',
  USER_DATA: 'owms_user_data',
  BIOMETRIC_ENABLED: 'owms_biometric_enabled',
};
