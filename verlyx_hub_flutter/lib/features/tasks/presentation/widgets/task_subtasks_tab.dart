import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_provider.dart';
import '../../data/models/task_model.dart';
import '../../data/repositories/tasks_repository.dart';

final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return TasksRepository(dio);
});

class TaskSubtasksTab extends ConsumerStatefulWidget {
  final TaskModel parentTask;

  const TaskSubtasksTab({
    Key? key,
    required this.parentTask,
  }) : super(key: key);

  @override
  ConsumerState<TaskSubtasksTab> createState() => _TaskSubtasksTabState();
}

class _TaskSubtasksTabState extends ConsumerState<TaskSubtasksTab> {
  List<TaskModel> _subtasks = [];
  bool _isLoading = false;
  final Set<String> _expandedTasks = {};

  @override
  void initState() {
    super.initState();
    _loadSubtasks();
  }

  Future<void> _loadSubtasks() async {
    setState(() => _isLoading = true);
    try {
      final repository = ref.read(tasksRepositoryProvider);
      final hierarchy = await repository.getTaskHierarchy(widget.parentTask.id);
      setState(() {
        _subtasks = hierarchy;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showCreateSubtaskDialog({String? parentTaskId}) {
    final titleController = TextEditingController();
    final descController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nueva Subtarea'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleController,
              decoration: const InputDecoration(
                labelText: 'Título *',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descController,
              decoration: const InputDecoration(
                labelText: 'Descripción',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (titleController.text.trim().isEmpty) return;

              try {
                final repository = ref.read(tasksRepositoryProvider);
                final subtask = TaskModel(
                  id: '',
                  myCompanyId: widget.parentTask.myCompanyId,
                  parentTaskId: parentTaskId ?? widget.parentTask.id,
                  title: titleController.text.trim(),
                  description: descController.text.trim().isEmpty ? null : descController.text.trim(),
                  status: 'TODO',
                  priority: 'MEDIUM',
                  createdAt: DateTime.now(),
                  updatedAt: DateTime.now(),
                );

                await repository.createTask(subtask);
                Navigator.pop(context);
                _loadSubtasks();

                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('✅ Subtarea creada'), backgroundColor: Colors.green),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('❌ Error: $e'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text('Crear'),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'TODO': return Colors.orange;
      case 'IN_PROGRESS': return Colors.blue;
      case 'REVIEW': return Colors.purple;
      case 'BLOCKED': return Colors.red;
      case 'DONE': return Colors.green;
      case 'CANCELLED': return Colors.grey;
      default: return Colors.grey;
    }
  }

  String _getPriorityEmoji(String priority) {
    switch (priority.toUpperCase()) {
      case 'URGENT': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '';
    }
  }

  List<TaskModel> _getChildTasks(String parentId) {
    return _subtasks.where((t) => t.parentTaskId == parentId).toList();
  }

  int _calculateProgress(String parentId) {
    final children = _getChildTasks(parentId);
    if (children.isEmpty) return 0;

    final completedCount = children.where((t) => t.status == 'DONE').length;
    return ((completedCount / children.length) * 100).round();
  }

  Widget _buildSubtaskItem(TaskModel task, int level) {
    final hasChildren = _getChildTasks(task.id).isNotEmpty;
    final isExpanded = _expandedTasks.contains(task.id);
    final progress = _calculateProgress(task.id);
    final indentWidth = level * 20.0;

    return Column(
      children: [
        Container(
          margin: EdgeInsets.only(left: indentWidth, bottom: 8),
          child: Card(
            elevation: 2,
            child: ListTile(
              leading: hasChildren
                  ? IconButton(
                      icon: Icon(isExpanded ? Icons.expand_more : Icons.chevron_right),
                      onPressed: () {
                        setState(() {
                          if (isExpanded) {
                            _expandedTasks.remove(task.id);
                          } else {
                            _expandedTasks.add(task.id);
                          }
                        });
                      },
                    )
                  : const SizedBox(width: 48, child: Icon(Icons.subdirectory_arrow_right, size: 20)),
              title: Row(
                children: [
                  Text(_getPriorityEmoji(task.priority)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(task.title)),
                ],
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: _getStatusColor(task.status).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: _getStatusColor(task.status)),
                        ),
                        child: Text(
                          task.status,
                          style: TextStyle(
                            fontSize: 10,
                            color: _getStatusColor(task.status),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (hasChildren) ...[
                        const SizedBox(width: 8),
                        Text(
                          '${_getChildTasks(task.id).length} subtareas',
                          style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                        ),
                      ],
                    ],
                  ),
                  if (hasChildren && progress > 0) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: LinearProgressIndicator(
                            value: progress / 100,
                            backgroundColor: Colors.grey[300],
                            minHeight: 4,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              progress == 100 ? Colors.green : Colors.blue,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text('$progress%', style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                      ],
                    ),
                  ],
                ],
              ),
              trailing: PopupMenuButton(
                itemBuilder: (context) => [
                  if (level < 4) // Max 5 levels (0-4)
                    const PopupMenuItem(value: 'add', child: Text('Agregar subtarea')),
                  const PopupMenuItem(value: 'edit', child: Text('Editar')),
                  const PopupMenuItem(value: 'delete', child: Text('Eliminar')),
                ],
                onSelected: (value) {
                  if (value == 'add') {
                    _showCreateSubtaskDialog(parentTaskId: task.id);
                  } else if (value == 'edit') {
                    // TODO: Edit task
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Edición próximamente')),
                    );
                  } else if (value == 'delete') {
                    // TODO: Delete task
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Eliminación próximamente')),
                    );
                  }
                },
              ),
            ),
          ),
        ),

        // Render children if expanded
        if (hasChildren && isExpanded)
          ..._getChildTasks(task.id).map((child) => _buildSubtaskItem(child, level + 1)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final directChildren = _getChildTasks(widget.parentTask.id);

    return Column(
      children: [
        Expanded(
          child: directChildren.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.account_tree, size: 80, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text('Sin subtareas', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                      const SizedBox(height: 8),
                      ElevatedButton.icon(
                        onPressed: () => _showCreateSubtaskDialog(),
                        icon: const Icon(Icons.add),
                        label: const Text('Crear Primera Subtarea'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Parent task info
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.orange[50],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.orange),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.task_alt, color: Colors.orange),
                              const SizedBox(width: 8),
                              const Text('Tarea Principal', style: TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(widget.parentTask.title),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: LinearProgressIndicator(
                                  value: _calculateProgress(widget.parentTask.id) / 100,
                                  backgroundColor: Colors.grey[300],
                                  minHeight: 6,
                                  valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text('${_calculateProgress(widget.parentTask.id)}%'),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Subtasks tree
                    ...directChildren.map((child) => _buildSubtaskItem(child, 0)),
                  ],
                ),
        ),

        // Create button
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withOpacity(0.2),
                blurRadius: 4,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: ElevatedButton.icon(
            onPressed: () => _showCreateSubtaskDialog(),
            icon: const Icon(Icons.add),
            label: const Text('Nueva Subtarea'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(48),
            ),
          ),
        ),
      ],
    );
  }
}
