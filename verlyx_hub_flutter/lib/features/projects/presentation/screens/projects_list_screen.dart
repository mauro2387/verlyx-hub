import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../providers/projects_provider.dart';
import '../../data/models/project_model.dart';
import '../../../../core/presentation/bottom_nav_bar.dart';

class ProjectsListScreen extends ConsumerStatefulWidget {
  const ProjectsListScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<ProjectsListScreen> createState() => _ProjectsListScreenState();
}

class _ProjectsListScreenState extends ConsumerState<ProjectsListScreen> {
  final _searchController = TextEditingController();
  String? _selectedStatus;
  String? _selectedPriority;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'backlog':
        return Colors.grey;
      case 'planning':
        return Colors.blue;
      case 'in_progress':
        return Colors.orange;
      case 'on_hold':
        return Colors.amber;
      case 'review':
        return Colors.purple;
      case 'done':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'low':
        return Colors.green;
      case 'medium':
        return Colors.blue;
      case 'high':
        return Colors.orange;
      case 'critical':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _formatStatus(String status) {
    final Map<String, String> statusMap = {
      'backlog': 'Pendiente',
      'planning': 'Planificación',
      'in_progress': 'En Progreso',
      'on_hold': 'En Espera',
      'review': 'Revisión',
      'done': 'Completado',
      'cancelled': 'Cancelado',
    };
    return statusMap[status.toLowerCase()] ?? status;
  }

  String _formatPriority(String priority) {
    final Map<String, String> priorityMap = {
      'low': 'Baja',
      'medium': 'Media',
      'high': 'Alta',
      'critical': 'Crítica',
    };
    return priorityMap[priority.toLowerCase()] ?? priority;
  }

  @override
  Widget build(BuildContext context) {
    final projectsAsync = ref.watch(projectsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Proyectos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_off),
            onPressed: () {
              setState(() {
                _selectedStatus = null;
                _selectedPriority = null;
                _searchController.clear();
              });
              ref.read(projectsProvider.notifier).clearFilters();
            },
            tooltip: 'Limpiar filtros',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(projectsProvider.notifier).refresh(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Barra de búsqueda y filtros
          Container(
            padding: const EdgeInsets.all(16),
            color: Theme.of(context).cardColor,
            child: Column(
              children: [
                // Barra de búsqueda
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Buscar proyectos...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              ref.read(projectsProvider.notifier).loadProjects(search: null);
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: Theme.of(context).scaffoldBackgroundColor,
                  ),
                  onChanged: (value) {
                    if (value.isEmpty) {
                      ref.read(projectsProvider.notifier).loadProjects(search: null);
                    }
                  },
                  onSubmitted: (value) {
                    if (value.isNotEmpty) {
                      ref.read(projectsProvider.notifier).loadProjects(search: value);
                    }
                  },
                ),
                const SizedBox(height: 12),
                // Filtros de estado y prioridad
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedStatus,
                        decoration: InputDecoration(
                          labelText: 'Estado',
                          prefixIcon: const Icon(Icons.flag_outlined),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          filled: true,
                          fillColor: Theme.of(context).scaffoldBackgroundColor,
                        ),
                        items: [
                          const DropdownMenuItem(value: null, child: Text('Todos')),
                          ...['backlog', 'planning', 'in_progress', 'on_hold', 'review', 'done', 'cancelled']
                              .map((status) => DropdownMenuItem(
                                    value: status,
                                    child: Text(_formatStatus(status)),
                                  )),
                        ],
                        onChanged: (value) {
                          setState(() => _selectedStatus = value);
                          ref.read(projectsProvider.notifier).loadProjects(status: value);
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedPriority,
                        decoration: InputDecoration(
                          labelText: 'Prioridad',
                          prefixIcon: const Icon(Icons.priority_high),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          filled: true,
                          fillColor: Theme.of(context).scaffoldBackgroundColor,
                        ),
                        items: [
                          const DropdownMenuItem(value: null, child: Text('Todas')),
                          ...['low', 'medium', 'high', 'critical']
                              .map((priority) => DropdownMenuItem(
                                    value: priority,
                                    child: Text(_formatPriority(priority)),
                                  )),
                        ],
                        onChanged: (value) {
                          setState(() => _selectedPriority = value);
                          ref.read(projectsProvider.notifier).loadProjects(priority: value);
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Lista de proyectos
          Expanded(
            child: projectsAsync.when(
              data: (projects) {
                if (projects.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.work_off_outlined, size: 80, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          'No hay proyectos',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                color: Colors.grey[600],
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Crea tu primer proyecto',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Colors.grey[500],
                              ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: projects.length,
                  itemBuilder: (context, index) {
                    final project = projects[index];
                    return _buildProjectCard(context, project);
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 80, color: Colors.red),
                    const SizedBox(height: 16),
                    Text(
                      'Error al cargar proyectos',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      error.toString(),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => ref.read(projectsProvider.notifier).refresh(),
                      icon: const Icon(Icons.refresh),
                      label: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: buildBottomNavBar(context, 1),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/projects/new'),
        icon: const Icon(Icons.add),
        label: const Text('Nuevo Proyecto'),
      ),
    );
  }

  Widget _buildProjectCard(BuildContext context, ProjectModel project) {
    final dateFormat = DateFormat('dd/MM/yyyy');

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => context.go('/projects/${project.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: nombre y estado
              Row(
                children: [
                  Expanded(
                    child: Text(
                      project.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _getStatusColor(project.status).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _formatStatus(project.status),
                      style: TextStyle(
                        color: _getStatusColor(project.status),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              if (project.description != null) ...[
                const SizedBox(height: 8),
                Text(
                  project.description!,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 12),
              // Progress bar
              if (project.progressPercentage != null) ...[
                Row(
                  children: [
                    Expanded(
                      child: LinearProgressIndicator(
                        value: project.progressPercentage! / 100,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _getStatusColor(project.status),
                        ),
                        minHeight: 6,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${project.progressPercentage}%',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
              // Info chips
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  // Prioridad
                  _buildChip(
                    context,
                    icon: Icons.flag,
                    label: _formatPriority(project.priority),
                    color: _getPriorityColor(project.priority),
                  ),
                  // Fechas
                  if (project.dueDate != null)
                    _buildChip(
                      context,
                      icon: Icons.calendar_today,
                      label: dateFormat.format(project.dueDate!),
                      color: project.isOverdue == true ? Colors.red : Colors.blue,
                    ),
                  // Budget
                  if (project.budget != null)
                    _buildChip(
                      context,
                      icon: Icons.attach_money,
                      label: '\$${project.budget!.toStringAsFixed(0)}',
                      color: Colors.green,
                    ),
                  // Overdue badge
                  if (project.isOverdue == true)
                    _buildChip(
                      context,
                      icon: Icons.warning,
                      label: 'Vencido',
                      color: Colors.red,
                    ),
                  // Days remaining
                  if (project.daysRemaining != null && project.daysRemaining! > 0)
                    _buildChip(
                      context,
                      icon: Icons.timelapse,
                      label: '${project.daysRemaining} días',
                      color: Colors.orange,
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChip(BuildContext context, {
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
