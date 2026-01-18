import 'package:dartz/dartz.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_api_service.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/storage/token_storage.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthApiService apiService;
  final TokenStorage tokenStorage;

  AuthRepositoryImpl({
    required this.apiService,
    required this.tokenStorage,
  });

  @override
  Future<Either<Failure, UserEntity>> login(String email, String password) async {
    try {
      final response = await apiService.login({
        'email': email,
        'password': password,
      });
      
      // Save tokens
      await tokenStorage.saveTokens(
        response.accessToken,
        response.refreshToken,
      );
      
      return Right(response.user);
    } catch (e) {
      return Left(ServerFailure(message: 'Login failed: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      await apiService.logout();
      await tokenStorage.clearTokens();
      return const Right(null);
    } catch (e) {
      return Left(ServerFailure(message: 'Logout failed: $e'));
    }
  }

  @override
  Future<Either<Failure, UserEntity>> getCurrentUser() async {
    try {
      final user = await apiService.getCurrentUser();
      return Right(user);
    } catch (e) {
      return Left(ServerFailure(message: 'Failed to get user: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> refreshToken() async {
    try {
      final refreshToken = await tokenStorage.getRefreshToken();
      
      if (refreshToken == null) {
        return Left(CacheFailure(message: 'No refresh token found'));
      }
      
      final response = await apiService.refreshToken({
        'refreshToken': refreshToken,
      });
      
      await tokenStorage.saveTokens(
        response.accessToken,
        response.refreshToken,
      );
      
      return const Right(null);
    } catch (e) {
      return Left(ServerFailure(message: 'Token refresh failed: $e'));
    }
  }
}
