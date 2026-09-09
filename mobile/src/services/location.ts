import * as Location from 'expo-location';
import { ENV } from '../config/env';

export interface GeoLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  isMocked: boolean;
  distanceFromOfficeMeters: number;
  isWithinGeofence: boolean;
}

// Calculate distance in meters between two GPS coordinates using Haversine formula
export const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

export const LocationService = {
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.warn('Location permission request failed:', error);
      return false;
    }
  },

  async getCurrentLocation(): Promise<GeoLocationResult> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Location permission denied. Please enable GPS permissions in device settings.');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude, accuracy, mocked } = location.coords as {
      latitude: number;
      longitude: number;
      accuracy: number | null;
      mocked?: boolean;
    };

    const isMocked = Boolean(mocked);

    const distance = calculateDistanceMeters(
      latitude,
      longitude,
      ENV.OFFICE_COORDINATES.latitude,
      ENV.OFFICE_COORDINATES.longitude
    );

    const isWithinGeofence = distance <= ENV.OFFICE_COORDINATES.radiusMeters;

    return {
      latitude,
      longitude,
      accuracy,
      isMocked,
      distanceFromOfficeMeters: distance,
      isWithinGeofence,
    };
  },
};
