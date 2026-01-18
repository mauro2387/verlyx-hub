import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/network/dio_provider.dart';
import '../../../../core/presentation/bottom_nav_bar.dart';
import '../../../../features/tasks/presentation/screens/tasks_screen.dart';
import '../../../../features/documents/presentation/screens/documents_screen.dart';
import '../../../../features/workspace/presentation/screens/workspaces_list_screen.dart';
import '../../../../features/my_companies/providers/my_companies_provider.dart';
import '../../../../features/pdf_generator/presentation/screens/pdf_generator_screen.dart';
import '../../../../features/ai/presentation/screens/conversations_list_screen.dart';

// Providers para estadísticas
final statsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final results = await Future.wait([
      dio.get('/projects/stats'),
      dio.get('/tasks/stats'),
    ]);
    
    return {
      'projects': results[0].data,
      'tasks': results[1].data,
    };
  } catch (e) {
    return {
      'projects': {'total': 0},
      'tasks': {'total': 0, 'pending': 0},
    };
  }
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(statsProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.account_circle_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: statsAsync.when(
        data: (stats) => _buildDashboardContent(context, stats),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Error al cargar estadísticas'),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref.refresh(statsProvider),
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      ),
      drawer: _buildDrawer(context, ref),
      bottomNavigationBar: buildBottomNavBar(context, 0),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/ai'),
        icon: const Icon(Icons.auto_awesome),
        label: const Text('IA'),
        backgroundColor: const Color(0xFF8B5CF6),
      ),
    );
  }

  Widget _buildDashboardContent(BuildContext context, Map<String, dynamic> stats) {
    final projectsTotal = stats['projects']?['total'] ?? 0;
    final tasksPending = stats['tasks']?['pending'] ?? 0;
    final tasksTotal = stats['tasks']?['total'] ?? 0;
    
    return RefreshIndicator(
      onRefresh: () async {
        // El provider se refrescará automáticamente
      },
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bienvenido',
              style: Theme.of(context).textTheme.displaySmall,
            ),
            const SizedBox(height: 24),
            
            // Stats Cards
            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _buildStatCard(
                  context, 
                  'Proyectos', 
                  '$projectsTotal', 
                  Icons.work_outline, 
                  Colors.purple,
                  onTap: () => context.go('/projects'),
                ),
                _buildStatCard(
                  context, 
                  'Tareas Pendientes', 
                  '$tasksPending', 
                  Icons.task_alt_outlined, 
                  Colors.orange,
                  onTap: () => context.go('/tasks'),
                ),
                _buildStatCard(
                  context, 
                  'Total Tareas', 
                  '$tasksTotal', 
                  Icons.checklist, 
                  Colors.green,
                  onTap: () => context.go('/tasks'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(BuildContext context, String title, String value, IconData icon, Color color, {VoidCallback? onTap}) {
    return Card(
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 32, color: color),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    title,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDrawer(BuildContext context, WidgetRef ref) {
    return Drawer(
      child: ListView(
        children: [
          const DrawerHeader(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CircleAvatar(
                  radius: 30,
                  child: Icon(Icons.person, size: 35),
                ),
                SizedBox(height: 10),
                Text(
                  'Owner Verlyx',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Text(
                  'owner@verlyx.com',
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard_outlined),
            title: const Text('Dashboard'),
            onTap: () => Navigator.pop(context),
          ),
          ListTile(
            leading: const Icon(Icons.work_outlined),
            title: const Text('Proyectos'),
            onTap: () {
              Navigator.pop(context);
              context.go('/projects');
            },
          ),
          ListTile(
            leading: const Icon(Icons.apartment_outlined),
            title: const Text('Verlyx Ecosystem'),
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Módulo en desarrollo')),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.payment_outlined),
            title: const Text('Pagos'),
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Módulo en desarrollo')),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.psychology_outlined),
            title: const Text('Asistente IA'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ConversationsListScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.task_outlined),
            title: const Text('Tareas'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const TasksScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.folder_outlined),
            title: const Text('Documentos'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const DocumentsScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.book_outlined),
            title: const Text('Workspace'),
            onTap: () {
              final myCompanyId = ref.read(selectedMyCompanyIdProvider);
              if (myCompanyId == null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Selecciona una empresa primero')),
                );
                return;
              }
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => WorkspacesListScreen(myCompanyId: myCompanyId),
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.picture_as_pdf_outlined),
            title: const Text('Generador de PDFs'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const PdfGeneratorScreen()),
              );
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text('Configuración'),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.logout_outlined),
            title: const Text('Cerrar Sesión'),
            onTap: () {},
          ),
        ],
      ),
    );
  }
}
