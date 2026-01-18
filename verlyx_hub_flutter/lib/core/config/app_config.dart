import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  // API
  static String get apiBaseUrl => dotenv.env['API_BASE_URL'] ?? 'http://localhost:3000/api';
  
  // Supabase
  static String get supabaseUrl => dotenv.env['SUPABASE_URL'] ?? '';
  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY'] ?? '';
  
  // App
  static String get appName => dotenv.env['APP_NAME'] ?? 'Verlyx Hub';
  static String get appEnv => dotenv.env['APP_ENV'] ?? 'development';
  
  static bool get isDevelopment => appEnv == 'development';
  static bool get isProduction => appEnv == 'production';
}
