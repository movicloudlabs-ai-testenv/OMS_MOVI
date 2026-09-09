import 'package:local_auth/local_auth.dart';

class BiometricsService {
  static final LocalAuthentication _auth = LocalAuthentication();

  /// Check if device has biometric hardware and enrolled biometrics
  static Future<bool> isBiometricsAvailable() async {
    try {
      final canCheck = await _auth.canCheckBiometrics;
      final isSupported = await _auth.isDeviceSupported();
      return canCheck && isSupported;
    } catch (e) {
      return false;
    }
  }

  /// Trigger biometric authentication prompt
  static Future<bool> authenticate({
    String reason = 'Authenticate to access your Movi Workspace',
  }) async {
    try {
      final available = await isBiometricsAvailable();
      if (!available) return false;

      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
          useErrorDialogs: true,
        ),
      );
    } catch (e) {
      return false;
    }
  }

  /// Get list of available biometric types (fingerprint, face, etc.)
  static Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _auth.getAvailableBiometrics();
    } catch (_) {
      return [];
    }
  }
}
