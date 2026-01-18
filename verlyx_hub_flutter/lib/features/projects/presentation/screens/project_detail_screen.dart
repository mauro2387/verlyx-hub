import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../providers/projects_provider.dart';
import '../../data/models/project_model.dart';
import '../../../my_companies/presentation/providers/my_companies_provider.dart';
import '../../../clients/presentation/providers/clients_provider.dart';

class ProjectDetailScreen extends ConsumerStatefulWidget {
  final String projectId;

  const ProjectDetailScreen({
    Key? key,
    required this.projectId,
  }) : super(key: key);

  @override
  ConsumerState<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends ConsumerState<ProjectDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
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

  @override
  Widget build(BuildContext context) {
    final projectAsync = ref.watch(projectProvider(widget.projectId));

    return Scaffold(
      body: projectAsync.when(
        data: (projectData) {
          final project = projectData as ProjectModel;
          return NestedScrollView(
            headerSliverBuilder: (context, innerBoxIsScrolled) {
              return [
                SliverAppBar(
                  expandedHeight: 200,
                  floating: false,
                  pinned: true,
                  flexibleSpace: FlexibleSpaceBar(
                    title: Text(
                      project.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        shadows: [
                          Shadow(
                            offset: Offset(0, 1),
                            blurRadius: 3,
                            color: Colors.black45,
                          ),
                        ],
                      ),
                    ),
                    background: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            _getStatusColor(project.status),
                            _getStatusColor(project.status).withOpacity(0.7),
                          ],
                        ),
                      ),
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withOpacity(0.4),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  actions: [
                    IconButton(
                      icon: const Icon(Icons.edit),
                      onPressed: () {
                        context.go('/projects/${widget.projectId}/edit');
                      },
                    ),
                    PopupMenuButton<String>(
                      onSelected: (value) async {
                        if (value == 'delete') {
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Eliminar Proyecto'),
                              content: const Text(
                                '¿Estás seguro de que deseas eliminar este proyecto?',
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context, false),
                                  child: const Text('Cancelar'),
                                ),
                                TextButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  style: TextButton.styleFrom(
                                    foregroundColor: Colors.red,
                                  ),
                                  child: const Text('Eliminar'),
                                ),
                              ],
                            ),
                          );

                          if (confirm == true && mounted) {
                            try {
                              final repository = ref.read(projectsRepositoryProvider);
                              await repository.deleteProject(widget.projectId);
                              if (mounted) {
                                Navigator.pop(context, true);
                              }
                            } catch (e) {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Error: $e')),
                                );
                              }
                            }
                          }
                        }
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete, color: Colors.red),
                              SizedBox(width: 8),
                              Text('Eliminar'),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                  bottom: TabBar(
                    controller: _tabController,
                    tabs: const [
                      Tab(text: 'Información', icon: Icon(Icons.info_outline)),
                      Tab(text: 'Progreso', icon: Icon(Icons.timeline)),
                      Tab(text: 'Finanzas', icon: Icon(Icons.attach_money)),
                    ],
                  ),
                ),
              ];
            },
            body: TabBarView(
              controller: _tabController,
              children: [
                _buildInfoTab(context, project),
                _buildProgressTab(context, project),
                _buildFinancesTab(context, project),
              ],
            ),
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
                'Error al cargar proyecto',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(error.toString()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoTab(BuildContext context, ProjectModel project) {
    final dateFormat = DateFormat('dd/MM/yyyy');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Estado y prioridad
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Estado y Prioridad',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem(
                        context,
                        'Estado',
                        _formatStatus(project.status),
                        color: _getStatusColor(project.status),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildInfoItem(
                        context,
                        'Prioridad',
                        project.priority.toUpperCase(),
                        color: _getPriorityColor(project.priority),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        // Empresas
        if (project.myCompanyId != null || project.companyId != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Empresas',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 12),
                  if (project.myCompanyId != null)
                    _buildMyCompanyCard(context, project.myCompanyId!),
                  if (project.myCompanyId != null && project.companyId != null)
                    const SizedBox(height: 12),
                  if (project.companyId != null)
                    _buildClientCompanyCard(context, project.companyId!),
                ],
              ),
            ),
          ),
        const SizedBox(height: 16),
        // Descripción
        if (project.description != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Descripción',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(project.description!),
                ],
              ),
            ),
          ),
        const SizedBox(height: 16),
        // Fechas
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Fechas',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 12),
                if (project.startDate != null)
                  _buildDateItem(
                    context,
                    Icons.play_circle_outline,
                    'Inicio',
                    dateFormat.format(project.startDate!),
                  ),
                if (project.dueDate != null)
                  _buildDateItem(
                    context,
                    Icons.flag,
                    'Vencimiento',
                    dateFormat.format(project.dueDate!),
                    isOverdue: project.isOverdue,
                  ),
                if (project.completionDate != null)
                  _buildDateItem(
                    context,
                    Icons.check_circle_outline,
                    'Completado',
                    dateFormat.format(project.completionDate!),
                  ),
                if (project.daysRemaining != null && project.daysRemaining! > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.timelapse, color: Colors.orange, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            '${project.daysRemaining} días restantes',
                            style: const TextStyle(
                              color: Colors.orange,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        // Tags
        if (project.tags != null && project.tags!.isNotEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tags',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: project.tags!.map((tag) {
                      return Chip(
                        label: Text(tag),
                        backgroundColor: Colors.blue.withOpacity(0.1),
                        labelStyle: const TextStyle(color: Colors.blue),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildProgressTab(BuildContext context, ProjectModel project) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Status workflow
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Estado del Proyecto',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 16),
                _buildStatusWorkflow(context, project),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Text(
                  'Progreso del Proyecto',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: 150,
                  height: 150,
                  child: Stack(
                    children: [
                      CircularProgressIndicator(
                        value: (project.progressPercentage ?? 0) / 100,
                        strokeWidth: 12,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _getStatusColor(project.status),
                        ),
                      ),
                      Center(
                        child: Text(
                          '${project.progressPercentage ?? 0}%',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                LinearProgressIndicator(
                  value: (project.progressPercentage ?? 0) / 100,
                  minHeight: 8,
                  backgroundColor: Colors.grey[200],
                  valueColor: AlwaysStoppedAnimation<Color>(
                    _getStatusColor(project.status),
                  ),
                  borderRadius: BorderRadius.circular(4),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFinancesTab(BuildContext context, ProjectModel project) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Budget overview
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Resumen Financiero',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 16),
                _buildFinanceItem(
                  context,
                  'Presupuesto',
                  project.budget != null
                      ? '\$${project.budget!.toStringAsFixed(2)}'
                      : 'No especificado',
                  Colors.blue,
                ),
                const Divider(height: 24),
                _buildFinanceItem(
                  context,
                  'Gastado',
                  project.spentAmount != null
                      ? '\$${project.spentAmount!.toStringAsFixed(2)}'
                      : '\$0.00',
                  Colors.orange,
                ),
                if (project.budget != null && project.spentAmount != null) ...[
                  const Divider(height: 24),
                  _buildFinanceItem(
                    context,
                    'Restante',
                    '\$${(project.budget! - project.spentAmount!).toStringAsFixed(2)}',
                    (project.budget! - project.spentAmount!) >= 0
                        ? Colors.green
                        : Colors.red,
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        // Profitability
        if (project.profitability != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Rentabilidad',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 16),
                  _buildFinanceItem(
                    context,
                    'Ganancia/Pérdida',
                    '\$${project.profitability!.toStringAsFixed(2)}',
                    project.profitability! >= 0 ? Colors.green : Colors.red,
                  ),
                  if (project.profitabilityPercentage != null) ...[
                    const Divider(height: 24),
                    _buildFinanceItem(
                      context,
                      'Margen',
                      '${project.profitabilityPercentage!.toStringAsFixed(1)}%',
                      project.profitabilityPercentage! >= 0
                          ? Colors.green
                          : Colors.red,
                    ),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildInfoItem(BuildContext context, String label, String value,
      {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
        ),
      ],
    );
  }

  Widget _buildDateItem(
    BuildContext context,
    IconData icon,
    String label,
    String date, {
    bool? isOverdue,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(
            icon,
            color: isOverdue == true ? Colors.red : Colors.blue,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
                      ),
                ),
                Text(
                  date,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                        color: isOverdue == true ? Colors.red : null,
                      ),
                ),
              ],
            ),
          ),
          if (isOverdue == true)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Vencido',
                style: TextStyle(
                  color: Colors.red,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFinanceItem(
    BuildContext context,
    String label,
    String value,
    Color color,
  ) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyLarge,
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
        ),
      ],
    );
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

  Map<String, List<String>> _getValidTransitions() {
    return {
      'backlog': ['planning', 'in_progress', 'on_hold', 'cancelled'],
      'planning': ['backlog', 'in_progress', 'on_hold', 'review', 'done', 'cancelled'],
      'in_progress': ['backlog', 'planning', 'on_hold', 'review', 'done', 'cancelled'],
      'on_hold': ['backlog', 'planning', 'in_progress', 'review', 'done', 'cancelled'],
      'review': ['backlog', 'planning', 'in_progress', 'on_hold', 'done', 'cancelled'],
      'done': ['backlog', 'planning', 'in_progress', 'on_hold', 'review', 'cancelled'],
      'cancelled': ['backlog', 'planning', 'in_progress', 'on_hold', 'review', 'done'],
    };
  }

  Widget _buildStatusWorkflow(BuildContext context, ProjectModel project) {
    final allStatuses = ['backlog', 'planning', 'in_progress', 'on_hold', 'review', 'done', 'cancelled'];
    final currentStatus = project.status.toLowerCase();
    
    return Column(
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: allStatuses.map((status) {
            final isCurrent = status == currentStatus;
            final isCompleted = _isStatusCompleted(currentStatus, status);
            
            return InkWell(
              onTap: status != currentStatus ? () => _changeProjectStatus(context, project, status) : null,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isCurrent 
                      ? _getStatusColor(status)
                      : isCompleted 
                          ? _getStatusColor(status).withOpacity(0.2)
                          : Colors.grey[200],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isCurrent 
                        ? _getStatusColor(status)
                        : isCompleted
                            ? _getStatusColor(status).withOpacity(0.5)
                            : Colors.grey[300]!,
                    width: 2,
                  ),
                ),
                child: Column(
                  children: [
                    Icon(
                      _getStatusIcon(status),
                      color: isCurrent 
                          ? Colors.white 
                          : _getStatusColor(status),
                      size: 24,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatStatus(status),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                        color: isCurrent ? Colors.white : Colors.black87,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        Text(
          'Toca un estado para cambiar',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
        ),
      ],
    );
  }

  bool _isStatusCompleted(String currentStatus, String checkStatus) {
    final statusOrder = {
      'backlog': 0,
      'planning': 1,
      'in_progress': 2,
      'review': 3,
      'done': 4,
      'on_hold': 2,
      'cancelled': 4,
    };
    
    final currentOrder = statusOrder[currentStatus] ?? 0;
    final checkOrder = statusOrder[checkStatus] ?? 0;
    
    return checkOrder < currentOrder;
  }

  Future<void> _changeProjectStatus(BuildContext context, ProjectModel project, String newStatus) async {
    final validTransitions = _getValidTransitions();
    final allowedStatuses = validTransitions[project.status.toLowerCase()] ?? [];
    
    if (!allowedStatuses.contains(newStatus)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('No se puede cambiar de "${_formatStatus(project.status)}" a "${_formatStatus(newStatus)}"'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    try {
      final repository = ref.read(projectsRepositoryProvider);
      await repository.updateProject(
        project.id,
        {'status': newStatus},
      );
      
      ref.invalidate(projectProvider(widget.projectId));
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Estado cambiado a: ${_formatStatus(newStatus)}'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'backlog':
        return Icons.inbox;
      case 'planning':
        return Icons.edit_calendar;
      case 'in_progress':
        return Icons.play_circle;
      case 'on_hold':
        return Icons.pause_circle;
      case 'review':
        return Icons.rate_review;
      case 'done':
        return Icons.check_circle;
      case 'cancelled':
        return Icons.cancel;
      default:
        return Icons.help;
    }
  }

  Widget _buildMyCompanyCard(BuildContext context, String myCompanyId) {
    final myCompanyAsync = ref.watch(myCompanyProvider(myCompanyId));
    
    return myCompanyAsync.when(
      data: (myCompany) {
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Color(int.parse(myCompany.primaryColor.replaceFirst('#', '0xff'))).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: Color(int.parse(myCompany.primaryColor.replaceFirst('#', '0xff'))),
              width: 2,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Color(int.parse(myCompany.primaryColor.replaceFirst('#', '0xff'))),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.business, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Mi Empresa',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      myCompany.name,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildClientCompanyCard(BuildContext context, String clientCompanyId) {
    final clientAsync = ref.watch(clientProvider(clientCompanyId));
    
    return clientAsync.when(
      data: (client) {
        final color = client.primaryColor != null 
            ? Color(int.parse(client.primaryColor!.replaceFirst('#', '0xff')))
            : Colors.blue;
        
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: color,
              width: 2,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.corporate_fare, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Empresa Cliente',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      client.name,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const LinearProgressIndicator(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}
