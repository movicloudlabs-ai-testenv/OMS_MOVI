import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../config/env.dart';
import '../../../../core/services/biometrics_service.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../models/user_profile.dart';
import '../../data/auth_api.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final UserProfile? user;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.errorMessage,
  });

  bool get isAuthenticated => status == AuthStatus.authenticated && user != null;
  bool get isLoading => status == AuthStatus.loading || status == AuthStatus.initial;
  String get roleSlug => user?.role.slug ?? '';

  AuthState copyWith({
    AuthStatus? status,
    UserProfile? user,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthApi _api = AuthApi();

  AuthNotifier() : super(const AuthState()) {
    restoreSession();
  }

  Future<void> restoreSession() async {
    try {
      final token = await StorageService.get(StorageKeys.accessToken);
      if (token == null || token.isEmpty) {
        state = state.copyWith(status: AuthStatus.unauthenticated);
        return;
      }

      // Try reading cached user profile first for instant UI
      final cachedProfile = await StorageService.get(StorageKeys.userProfile);
      if (cachedProfile != null) {
        try {
          final profile = UserProfile.fromJson(jsonDecode(cachedProfile));
          state = state.copyWith(
            status: AuthStatus.authenticated,
            user: profile,
          );
        } catch (_) {}
      }

      // Verify token with backend
      final user = await _api.getMe();
      await StorageService.set(StorageKeys.userProfile, jsonEncode(user.toJson()));
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
      );
    } catch (e) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> login(String identifier, String password) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final res = await _api.login(identifier, password);
      if (res.token != null) {
        await StorageService.set(StorageKeys.accessToken, res.token!);
      }
      if (res.refreshToken != null) {
        await StorageService.set(StorageKeys.refreshToken, res.refreshToken!);
      }
      await StorageService.set(StorageKeys.userProfile, jsonEncode(res.user.toJson()));

      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: res.user,
      );
      return true;
    } catch (e) {
      String msg = 'Authentication failed. Please verify your credentials.';
      if (e is DioException) {
        if (e.response?.data is Map && e.response?.data['message'] != null) {
          msg = e.response!.data['message'].toString();
        } else if (e.type == DioExceptionType.connectionError ||
            e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.sendTimeout ||
            e.type == DioExceptionType.receiveTimeout) {
          msg = 'Cannot connect to server at ${Env.apiBaseUrl}. Please verify host/LAN connection.';
        }
      }
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: msg,
      );
      return false;
    }
  }

  Future<bool> biometricLogin() async {
    final available = await BiometricsService.isBiometricsAvailable();
    if (!available) return false;

    final authenticated = await BiometricsService.authenticate();
    if (!authenticated) return false;

    final token = await StorageService.get(StorageKeys.accessToken);
    if (token != null && token.isNotEmpty) {
      await restoreSession();
      return state.isAuthenticated;
    }
    return false;
  }

  Future<void> logout() async {
    await _api.logout();
    await StorageService.delete(StorageKeys.accessToken);
    await StorageService.delete(StorageKeys.refreshToken);
    await StorageService.delete(StorageKeys.userProfile);
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
