import 'package:dio/dio.dart';
import '../../config/env.dart';
import '../services/storage_service.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  late final Dio dio;

  factory ApiClient() => _instance;

  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: Env.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await StorageService.get(StorageKeys.accessToken);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            final isRetry = error.requestOptions.extra['retry'] == true;
            if (!isRetry) {
              error.requestOptions.extra['retry'] = true;
              try {
                final refreshToken = await StorageService.get(StorageKeys.refreshToken);
                if (refreshToken != null && refreshToken.isNotEmpty) {
                  // Separate client to avoid interceptor recursion
                  final refreshDio = Dio(
                    BaseOptions(
                      baseUrl: Env.apiBaseUrl,
                      headers: {'Content-Type': 'application/json'},
                    ),
                  );

                  final refreshRes = await refreshDio.post(
                    '/api/auth/refresh',
                    data: {'refreshToken': refreshToken},
                  );

                  final newAccessToken = refreshRes.data?['data']?['token'] ??
                      refreshRes.data?['data']?['accessToken'] ??
                      refreshRes.data?['token'] ??
                      refreshRes.data?['accessToken'];

                  if (newAccessToken != null) {
                    await StorageService.set(
                      StorageKeys.accessToken,
                      newAccessToken.toString(),
                    );

                    error.requestOptions.headers['Authorization'] =
                        'Bearer $newAccessToken';

                    final clonedRequest = await dio.fetch(error.requestOptions);
                    return handler.resolve(clonedRequest);
                  }
                }
              } catch (_) {
                // If refresh fails, clear tokens
                await StorageService.delete(StorageKeys.accessToken);
                await StorageService.delete(StorageKeys.refreshToken);
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }
}
