import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../models/user_profile.dart';

class LoginResponse {
  final bool success;
  final String? token;
  final String? refreshToken;
  final UserProfile user;

  LoginResponse({
    required this.success,
    this.token,
    this.refreshToken,
    required this.user,
  });
}

class AuthApi {
  final ApiClient _client = ApiClient();

  Future<LoginResponse> login(String identifier, String password) async {
    final response = await _client.dio.post(
      ApiEndpoints.login,
      data: {
        'identifier': identifier,
        'password': password,
      },
    );

    final data = response.data;
    final payload = data['data'] ?? data;

    return LoginResponse(
      success: data['success'] ?? true,
      token: payload['token'] ?? payload['accessToken'],
      refreshToken: payload['refreshToken'],
      user: UserProfile.fromJson(payload['user'] ?? {}),
    );
  }

  Future<UserProfile> getMe() async {
    final response = await _client.dio.get(ApiEndpoints.me);
    final data = response.data;
    final userPayload = data['data'] ?? data['user'] ?? data;
    return UserProfile.fromJson(userPayload);
  }

  Future<void> logout() async {
    try {
      await _client.dio.post(ApiEndpoints.logout);
    } catch (_) {
      // Ignore network errors during logout
    }
  }
}
