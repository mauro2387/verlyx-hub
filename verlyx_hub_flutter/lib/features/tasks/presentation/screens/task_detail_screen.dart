import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../data/models/task_model.dart';
import '../../data/repositories/tasks_repository.dart';
import '../../../../core/network/dio_provider.dart';
import '../widgets/task_comments_tab.dart';
import '../widgets/task_subtasks_tab.dart';

final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return TasksRepository(dio);
});

class TaskDetailScreen extends ConsumerStatefulWidget {
  final TaskModel task;

  const TaskDetailScreen({
    Key? key,
    required this.task,
  }) : super(key: key);

  @override
  ConsumerState<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends ConsumerState<TaskDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late TaskModel _currentTask;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _currentTask = widget.task;
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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

  String _getPriorityEmoji(String priority) {
    switch (priority.toUpperCase()) {
      case 'URGENT': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '';
    }
  }

  Widget _buildDetailsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status & Priority
          Row(
            children: [
              Expanded(
                child: _buildInfoCard(
                  'Estado',
                  _getStatusLabel(_currentTask.status),
                  Icons.flag,
                  _getStatusColor(_currentTask.status),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildInfoCard(
                  'Prioridad',
                  '${_getPriorityEmoji(_currentTask.priority)} ${_currentTask.priority}',
                  Icons.priority_high,
                  Colors.orange,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Title
          _buildSection('Título', _currentTask.title),

          // Description
          if (_currentTask.description != null)
            _buildSection('Descripción', _currentTask.description!),

          // Dates
          if (_currentTask.startDate != null || _currentTask.dueDate != null) ...[
            const Divider(height: 32),
            const Text('Fechas', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                if (_currentTask.startDate != null)
                  Expanded(
                    child: _buildDateCard('Inicio', _currentTask.startDate!, Icons.play_arrow),
                  ),
                if (_currentTask.startDate != null && _currentTask.dueDate != null)
                  const SizedBox(width: 12),
                if (_currentTask.dueDate != null)
                  Expanded(
                    child: _buildDateCard('Vencimiento', _currentTask.dueDate!, Icons.event),
                  ),
              ],
            ),
          ],

          // Hours & Progress
          if (_currentTask.estimatedHours != null || _currentTask.progressPercentage != null) ...[
            const Divider(height: 32),
            const Text('Progreso', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (_currentTask.estimatedHours != null || _currentTask.actualHours != null)
              Row(
                children: [
                  Expanded(
                    child: _buildInfoCard(
                      'Estimadas',
                      '${_currentTask.estimatedHours ?? 0}h',
                      Icons.schedule,
                      Colors.blue,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildInfoCard(
                      'Reales',
                      '${_currentTask.actualHours ?? 0}h',
                      Icons.timer,
                      Colors.green,
                    ),
                  ),
                ],
              ),
            if (_currentTask.progressPercentage != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: LinearProgressIndicator(
                      value: _currentTask.progressPercentage! / 100,
                      backgroundColor: Colors.grey[300],
                      minHeight: 10,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        _currentTask.progressPercentage! == 100 ? Colors.green : Colors.blue,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '${_currentTask.progressPercentage}%',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ],

          // Blocking
          if (_currentTask.isBlocked == true) ...[
            const Divider(height: 32),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red, width: 2),
              ),
              child: Row(
                children: [
                  const Icon(Icons.block, color: Colors.red),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Tarea Bloqueada',
                          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red),
                        ),
                        if (_currentTask.blockedReason != null)
                          Text(_currentTask.blockedReason!),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Tags
          if (_currentTask.tags != null && _currentTask.tags!.isNotEmpty) ...[
            const Divider(height: 32),
            const Text('Etiquetas', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _currentTask.tags!.map((tag) {
                return Chip(
                  label: Text(tag),
                  backgroundColor: Colors.blue[100],
                  labelStyle: const TextStyle(fontSize: 12),
                );
              }).toList(),
            ),
          ],

          // Checklist
          if (_currentTask.checklist != null && _currentTask.checklist!.isNotEmpty) ...[
            const Divider(height: 32),
            const Text('Checklist', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ..._currentTask.checklist!.map((item) {
              final text = item['text'] as String? ?? '';
              final completed = item['completed'] as bool? ?? false;
              return CheckboxListTile(
                title: Text(
                  text,
                  style: TextStyle(
                    decoration: completed ? TextDecoration.lineThrough : null,
                  ),
                ),
                value: completed,
                onChanged: (value) {
                  // TODO: Update checklist item
                },
              );
            }).toList(),
          ],

          const SizedBox(height: 80), // Espacio para el FAB
        ],
      ),
    );
  }

  Widget _buildSubtasksTab() {
    return TaskSubtasksTab(parentTask: _currentTask);
  }

  Widget _buildCommentsTab() {
    return TaskCommentsTab(taskId: _currentTask.id);
  }

  Widget _buildHistoryTab() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.history, size: 80, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text('Historial', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
          const SizedBox(height: 8),
          Text('Próximamente', style: TextStyle(color: Colors.grey[500])),
        ],
      ),
    );
  }

  Widget _buildSection(String title, String content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(height: 32),
        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text(content, style: const TextStyle(fontSize: 16)),
      ],
    );
  }

  Widget _buildInfoCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildDateCard(String label, DateTime date, IconData icon) {
    final now = DateTime.now();
    final diff = date.difference(now).inDays;
    final isOverdue = diff < 0;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isOverdue ? Colors.red[50] : Colors.blue[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isOverdue ? Colors.red : Colors.blue,
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Icon(icon, color: isOverdue ? Colors.red : Colors.blue),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
          ),
          const SizedBox(height: 4),
          Text(
            DateFormat('dd/MM/yyyy').format(date),
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: isOverdue ? Colors.red : Colors.blue,
            ),
          ),
          if (isOverdue)
            Text(
              '${-diff} días atrasado',
              style: const TextStyle(fontSize: 11, color: Colors.red),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalle de Tarea'),
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(icon: Icon(Icons.info), text: 'Detalles'),
            Tab(icon: Icon(Icons.account_tree), text: 'Subtareas'),
            Tab(icon: Icon(Icons.comment), text: 'Comentarios'),
            Tab(icon: Icon(Icons.history), text: 'Historial'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDetailsTab(),
          _buildSubtasksTab(),
          _buildCommentsTab(),
          _buildHistoryTab(),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: Edit task
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Edición próximamente')),
          );
        },
        backgroundColor: Colors.orange,
        child: const Icon(Icons.edit),
      ),
    );
  }
}
