import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/projects/presentation/screens/projects_list_screen.dart';
import '../../features/projects/presentation/screens/project_detail_screen.dart';
import '../../features/projects/presentation/screens/project_form_screen.dart';
import '../../features/clients/presentation/screens/clients_list_screen.dart';
import '../../features/clients/presentation/screens/client_form_screen.dart';
import '../../features/my_companies/presentation/screens/my_companies_list_screen.dart';
import '../../features/my_companies/presentation/screens/my_company_form_screen.dart';
import '../../features/verlyx/presentation/screens/verlyx_screen.dart';
import '../../features/payments/presentation/screens/payments_screen.dart';
import '../../features/ai/presentation/screens/conversations_list_screen.dart';
import '../../features/tasks/presentation/screens/tasks_screen.dart';
import '../../features/documents/presentation/screens/documents_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);
  
  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggedIn = authState.user != null;
      final isLoginRoute = state.uri.path == '/login';
      final isSplashRoute = state.uri.path == '/splash';
      
      // Not logged in - redirect to login
      if (!isLoggedIn && !isLoginRoute && !isSplashRoute) {
        return '/login';
      }
      
      // Logged in but on login page - redirect to dashboard
      if (isLoggedIn && isLoginRoute) {
        return '/';
      }
      
      return null;
    },
    routes: [
      // Splash
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      
      // Login
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      
      // Main App
      GoRoute(
        path: '/',
        builder: (context, state) => const DashboardScreen(),
      ),
      
      // Projects
      GoRoute(
        path: '/projects',
        builder: (context, state) => const ProjectsListScreen(),
        routes: [
          // New Project (must be before :id to avoid conflict)
          GoRoute(
            path: 'new',
            builder: (context, state) => const ProjectFormScreen(),
          ),
          // Project Detail
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return ProjectDetailScreen(projectId: id);
            },
            routes: [
              // Edit Project
              GoRoute(
                path: 'edit',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return ProjectFormScreen(projectId: id);
                },
              ),
            ],
          ),
        ],
      ),
      
      // Verlyx Ecosystem
      GoRoute(
        path: '/verlyx',
        builder: (context, state) => const VerlyxScreen(),
      ),
      
      // Payments
      GoRoute(
        path: '/payments',
        builder: (context, state) => const PaymentsScreen(),
      ),
      
      // AI Chat
      GoRoute(
        path: '/ai',
        builder: (context, state) => const ConversationsListScreen(),
      ),
      
      // Tasks
      GoRoute(
        path: '/tasks',
        builder: (context, state) => const TasksScreen(),
      ),
      
      // Documents
      GoRoute(
        path: '/documents',
        builder: (context, state) => const DocumentsScreen(),
      ),
      
      // Clients
      GoRoute(
        path: '/clients',
        builder: (context, state) => const ClientsListScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const ClientFormScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return ClientFormScreen(clientId: id);
            },
          ),
        ],
      ),
      
      // My Companies
      GoRoute(
        path: '/my-companies',
        builder: (context, state) => const MyCompaniesListScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const MyCompanyFormScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return MyCompanyFormScreen(companyId: id);
            },
          ),
        ],
      ),
    ],
  );
});
