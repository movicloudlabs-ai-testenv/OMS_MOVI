import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageKeys {
  static const String accessToken = 'movi_access_token';
  static const String refreshToken = 'movi_refresh_token';
  static const String userProfile = 'movi_user_profile';
  static const String rememberedEmail = 'movi_remembered_email';
  static const String biometricToken = 'movi_biometric_token';
  static const String shiftStartTime = 'movi_shift_start_time';
  static const String breakStartTime = 'movi_break_start_time';
  static const String totalBreakSeconds = 'movi_total_break_seconds';
}

class StorageService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  static Future<String?> get(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (e) {
      return null;
    }
  }

  static Future<void> set(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (_) {}
  }

  static Future<void> delete(String key) async {
    try {
      await _storage.delete(key: key);
    } catch (_) {}
  }

  static Future<void> clearAll() async {
    try {
      await _storage.deleteAll();
    } catch (_) {}
  }
}
