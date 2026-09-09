import 'dart:math' as math;
import 'package:geolocator/geolocator.dart';
import '../../config/env.dart';

class GeoLocationResult {
  final double latitude;
  final double longitude;
  final double? accuracy;
  final bool isMocked;
  final double distanceFromOfficeMeters;
  final bool isWithinGeofence;

  GeoLocationResult({
    required this.latitude,
    required this.longitude,
    this.accuracy,
    required this.isMocked,
    required this.distanceFromOfficeMeters,
    required this.isWithinGeofence,
  });
}

class LocationService {
  /// Calculate distance in meters between two GPS coordinates using Haversine formula
  static double calculateDistanceMeters(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const double earthRadiusMeters = 6371000.0;
    final double dLat = (lat2 - lat1) * (math.pi / 180.0);
    final double dLon = (lon2 - lon1) * (math.pi / 180.0);

    final double a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * (math.pi / 180.0)) *
            math.cos(lat2 * (math.pi / 180.0)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);

    final double c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return (earthRadiusMeters * c).roundToDouble();
  }

  /// Request foreground location permissions
  static Future<bool> requestPermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  /// Get current GPS location with anti-spoofing and geofence check
  static Future<GeoLocationResult> getCurrentLocation() async {
    final hasPermission = await requestPermissions();
    if (!hasPermission) {
      throw Exception(
        'Location permission denied. Please enable GPS permissions in device settings.',
      );
    }

    final Position position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
      timeLimit: const Duration(seconds: 15),
    );

    final double distance = calculateDistanceMeters(
      position.latitude,
      position.longitude,
      Env.officeLatitude,
      Env.officeLongitude,
    );

    final bool isWithinGeofence = distance <= Env.officeRadiusMeters;

    return GeoLocationResult(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      isMocked: position.isMocked,
      distanceFromOfficeMeters: distance,
      isWithinGeofence: isWithinGeofence,
    );
  }
}
