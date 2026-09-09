import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class Env {
  // Local development backend on port 5000
  // Android Emulator maps 10.0.2.2 to host Windows localhost:5000
  // Web / Desktop use http://localhost:5000
  static String get defaultApiUrl => 'https://mcl-mobile.onrender.com';

  // Active backend URL
  // Configured to https://mcl-mobile.onrender.com for mobile app and web clients
  static String apiBaseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://mcl-mobile.onrender.com',
  );

  // Office GPS coordinates for geofenced attendance
  static const double officeLatitude = 12.9716;
  static const double officeLongitude = 77.5946;
  static const double officeRadiusMeters = 200.0;

  static const String appName = 'Movi OWMS';
  static const String version = '1.0.0';
}
