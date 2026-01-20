import 'package:dio/dio.dart';
import '../models/user_model.dart';

class AuthApiService {
  final Dio _dio;

  AuthApiService(this._dio);

  Future<LoginResponse> login(Map<String, dynamic> body) async {
    final response = await _dio.post('/auth/login', data: body);
    return LoginResponse.fromJson(response.data);
  }
  
  Future<void> logout() async {
    await _dio.post('/auth/logout');
  }
  
  Future<UserModel> getCurrentUser() async {
    final response = await _dio.get('/auth/me');
    return UserModel.fromJson(response.data);
  }
  
  Future<RefreshTokenResponse> refreshToken(Map<String, dynamic> body) async {
    final response = await _dio.post('/auth/refresh', data: body);
    return RefreshTokenResponse.fromJson(response.data);
  }
}

class LoginResponse {
  final UserModel user;
  final String accessToken;
  final String refreshToken;

  LoginResponse({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      user: UserModel.fromJson(json['user']),
      accessToken: json['accessToken'],
      refreshToken: json['refreshToken'],
    );
  }
}

class RefreshTokenResponse {
  final String accessToken;
  final String refreshToken;

  RefreshTokenResponse({
    required this.accessToken,
    required this.refreshToken,
  });

  factory RefreshTokenResponse.fromJson(Map<String, dynamic> json) {
    return RefreshTokenResponse(
      accessToken: json['accessToken'],
      refreshToken: json['refreshToken'],
    );
  }
}
