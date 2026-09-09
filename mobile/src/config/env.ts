import { Platform } from 'react-native';

// Production backend hosted on Render
const PRODUCTION_API_URL = 'https://oms-movi-tp3i.onrender.com';

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL,
  OFFICE_COORDINATES: {
    // Default office location for geofenced attendance testing (lat, lng, radius in meters)
    latitude: 12.9716,
    longitude: 77.5946,
    radiusMeters: 200, // 200 meter radius allowed
  },
  APP_NAME: 'Movi OWMS',
  VERSION: '1.0.0',
};
