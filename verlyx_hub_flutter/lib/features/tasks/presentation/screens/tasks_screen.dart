import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_provider.dart';
import '../../../../core/presentation/bottom_nav_bar.dart';
import '../../../my_companies/providers/my_companies_provider.dart';
import '../../data/models/task_model.dart';
import '../../data/repositories/tasks_repository.dart';
import 'tasks_kanban_screen.dart';
import 'tasks_calendar_screen.dart';
import '../widgets/task_form_dialog.dart';

final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return TasksRepository(dio);
});

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  List<TaskModel> _tasks = [];
  bool _isLoading = true;
  String? _filterStatus;

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    setState(() => _isLoading = true);
    try {
      final myCompanyId = ref.read(selectedMyCompanyIdProvider);
      
      if (myCompanyId == null) {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No hay empresa seleccionada')),
          );
        }
        return;
      }
      
      final repository = ref.read(tasksRepositoryProvider);
      final tasks = await repository.getTasks(
        myCompanyId: myCompanyId,
        status: _filterStatus,
      );
      setState(() {
        _tasks = tasks;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'DONE': return Colors.green;
      case 'IN_PROGRESS': return Colors.blue;
      case 'REVIEW': return Colors.purple;
      case 'TODO': return Colors.orange;
      case 'BLOCKED': return Colors.red.shade300;
      case 'CANCELLED': return Colors.red;
      default: return Colors.grey;
    }
  }

  String _getStatusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'TODO': return 'Por Hacer';
      case 'IN_PROGRESS': return 'En Progreso';
      case 'REVIEW': return 'En Revisión';
      case 'BLOCKED': return 'Bloqueada';
      case 'DONE': return 'Completada';
      case 'CANCELLED': return 'Cancelada';
      default: return status;
    }
  }

  void _showCreateDialog() async {
    final selectedCompanyId = ref.read(selectedMyCompanyIdProvider);
    if (selectedCompanyId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Selecciona una empresa primero')),
        );
      }
      return;
    }

    final result = await showDialog<TaskModel>(
      context: context,
      builder: (context) => TaskFormDialog(myCompanyId: selectedCompanyId),
    );

    if (result != null) {
      _createTask(result);
    }
  }

  Future<void> _createTask(TaskModel task) async {
    try {
      final repository = ref.read(tasksRepositoryProvider);
      await repository.createTask(task);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Tarea creada'), backgroundColor: Colors.green),
        );
        _loadTasks();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tareas'),
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month),
            tooltip: 'Vista Calendario',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const TasksCalendarScreen(),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.view_kanban),
            tooltip: 'Vista Kanban',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const TasksKanbanScreen(),
                ),
              );
            },
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() => _filterStatus = value == 'all' ? null : value);
              _loadTasks();
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'all', child: Text('Todas')),
              PopupMenuItem(value: 'TODO', child: Text('Por Hacer')),
              PopupMenuItem(value: 'IN_PROGRESS', child: Text('En Progreso')),
              PopupMenuItem(value: 'REVIEW', child: Text('En Revisión')),
              PopupMenuItem(value: 'BLOCKED', child: Text('Bloqueadas')),
              PopupMenuItem(value: 'DONE', child: Text('Completadas')),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateDialog,
        backgroundColor: Colors.orange,
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: buildBottomNavBar(context, 2),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _tasks.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.task_outlined, size: 80, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text('No hay tareas', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                      const SizedBox(height: 8),
                      ElevatedButton.icon(
                        onPressed: _showCreateDialog,
                        icon: const Icon(Icons.add),
                        label: const Text('Crear Tarea'),
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.orange, foregroundColor: Colors.white),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadTasks,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _tasks.length,
                    itemBuilder: (context, index) {
                      final task = _tasks[index];
                      final isDone = task.status.toUpperCase() == 'DONE';
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: Checkbox(
                            value: isDone,
                            onChanged: (_) async {
                              final updatedTask = TaskModel(
                                id: task.id,
                                myCompanyId: task.myCompanyId,
                                projectId: task.projectId,
                                title: task.title,
                                description: task.description,
                                status: isDone ? 'TODO' : 'DONE',
                                priority: task.priority,
                              );
                              try {
                                final repository = ref.read(tasksRepositoryProvider);
                                await repository.updateTask(task.id, updatedTask);
                                _loadTasks();
                              } catch (e) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Error: $e')),
                                );
                              }
                            },
                          ),
                          title: Text(
                            task.title,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              decoration: isDone ? TextDecoration.lineThrough : null,
                              color: isDone ? Colors.grey : null,
                            ),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (task.description != null) ...[
                                const SizedBox(height: 4),
                                Text(task.description!, maxLines: 2, overflow: TextOverflow.ellipsis),
                              ],
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: _getStatusColor(task.status).withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(color: _getStatusColor(task.status)),
                                    ),
                                    child: Text(
                                      _getStatusLabel(task.status),
                                      style: TextStyle(fontSize: 11, color: _getStatusColor(task.status)),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    task.priority.toUpperCase() == 'URGENT' ? '🔴' :
                                    task.priority.toUpperCase() == 'HIGH' ? '🟠' :
                                    task.priority.toUpperCase() == 'MEDIUM' ? '🟡' : '🟢',
                                    style: const TextStyle(fontSize: 16),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_outline, color: Colors.red),
                            onPressed: () async {
                              final confirm = await showDialog<bool>(
                                context: context,
                                builder: (context) => AlertDialog(
                                  title: const Text('Eliminar tarea'),
                                  content: const Text('¿Estás seguro?'),
                                  actions: [
                                    TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
                                    ElevatedButton(
                                      onPressed: () => Navigator.pop(context, true),
                                      style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                                      child: const Text('Eliminar'),
                                    ),
                                  ],
                                ),
                              );
                              if (confirm == true) {
                                try {
                                  final repository = ref.read(tasksRepositoryProvider);
                                  await repository.deleteTask(task.id);
                                  _loadTasks();
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('✅ Tarea eliminada'), backgroundColor: Colors.green),
                                    );
                                  }
                                } catch (e) {
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Error: $e')),
                                    );
                                  }
                                }
                              }
                            },
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
