import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import '../config/app_config.dart';
import '../storage/token_storage.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );
  
  // Interceptor for logging
  if (AppConfig.isDevelopment) {
    dio.interceptors.add(
      PrettyDioLogger(
        requestHeader: true,
        requestBody: true,
        responseBody: true,
        responseHeader: false,
        error: true,
        compact: true,
      ),
    );
  }
  
  // Interceptor for auth token
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final tokenStorage = ref.read(tokenStorageProvider);
        final token = await tokenStorage.getAccessToken();
        
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        
        handler.next(options);
      },
      onError: (error, handler) async {
        // Handle 401 - Token expired
        if (error.response?.statusCode == 401) {
          final tokenStorage = ref.read(tokenStorageProvider);
          final refreshToken = await tokenStorage.getRefreshToken();
          
          if (refreshToken != null) {
            try {
              // Try to refresh token
              final response = await dio.post(
                '/auth/refresh',
                data: {'refreshToken': refreshToken},
              );
              
              final newAccessToken = response.data['accessToken'];
              final newRefreshToken = response.data['refreshToken'];
              
              await tokenStorage.saveTokens(newAccessToken, newRefreshToken);
              
              // Retry original request
              final opts = error.requestOptions;
              opts.headers['Authorization'] = 'Bearer $newAccessToken';
              
              final cloneReq = await dio.request(
                opts.path,
                options: Options(
                  method: opts.method,
                  headers: opts.headers,
                ),
                data: opts.data,
                queryParameters: opts.queryParameters,
              );
              
              return handler.resolve(cloneReq);
            } catch (e) {
              // Refresh failed - logout user
              await tokenStorage.clearTokens();
              // TODO: Navigate to login
            }
          }
        }
        
        handler.next(error);
      },
    ),
  );
  
  return dio;
});
