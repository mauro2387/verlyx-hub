import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../my_companies/providers/my_companies_provider.dart';
import '../../data/models/task_model.dart';
import '../../data/repositories/tasks_repository.dart';
import 'task_detail_screen.dart';

class TasksKanbanScreen extends ConsumerStatefulWidget {
  const TasksKanbanScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<TasksKanbanScreen> createState() => _TasksKanbanScreenState();
}

class _TasksKanbanScreenState extends ConsumerState<TasksKanbanScreen> {
  final _scrollController = ScrollController();
  List<TaskModel> _tasks = [];
  bool _isLoading = false;
  String? _selectedPriority;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadTasks());
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadTasks() async {
    final myCompanyId = ref.read(selectedMyCompanyIdProvider);
    if (myCompanyId == null) return;

    setState(() => _isLoading = true);
    try {
      final repository = ref.read(tasksRepositoryProvider);
      final result = await repository.getTasks(
        myCompanyId: myCompanyId,
        priority: _selectedPriority,
      );
      setState(() {
        _tasks = result;
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

  Future<void> _updateTaskStatus(TaskModel task, String newStatus) async {
    try {
      final repository = ref.read(tasksRepositoryProvider);
      final updatedTask = TaskModel(
        id: task.id,
        myCompanyId: task.myCompanyId,
        title: task.title,
        description: task.description,
        status: newStatus,
        priority: task.priority,
        projectId: task.projectId,
        dealId: task.dealId,
        clientId: task.clientId,
        organizationId: task.organizationId,
        parentTaskId: task.parentTaskId,
        assignedTo: task.assignedTo,
        assignedUsers: task.assignedUsers,
        startDate: task.startDate,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        progressPercentage: task.progressPercentage,
        isBlocked: task.isBlocked,
        blockedReason: task.blockedReason,
        tags: task.tags,
        customFields: task.customFields,
        attachments: task.attachments,
        checklist: task.checklist,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      );
      
      await repository.updateTask(task.id, updatedTask);
      _loadTasks(); // Refresh
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Estado actualizado'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  final List<Map<String, dynamic>> _columns = [
    {'status': 'TODO', 'label': 'Por Hacer', 'color': Colors.orange},
    {'status': 'IN_PROGRESS', 'label': 'En Progreso', 'color': Colors.blue},
    {'status': 'REVIEW', 'label': 'En Revisión', 'color': Colors.purple},
    {'status': 'DONE', 'label': 'Completadas', 'color': Colors.green},
  ];

  Color _getPriorityColor(String priority) {
    switch (priority.toUpperCase()) {
      case 'URGENT': return Colors.red;
      case 'HIGH': return Colors.orange;
      case 'MEDIUM': return Colors.yellow.shade700;
      case 'LOW': return Colors.green;
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

  Widget _buildStatsBar() {
    final todoCount = _tasks.where((t) => t.status == 'TODO').length;
    final inProgressCount = _tasks.where((t) => t.status == 'IN_PROGRESS').length;
    final reviewCount = _tasks.where((t) => t.status == 'REVIEW').length;
    final doneCount = _tasks.where((t) => t.status == 'DONE').length;
    final totalHours = _tasks.fold<double>(0, (sum, t) => sum + (t.estimatedHours ?? 0));

    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.grey[100],
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem('Por Hacer', todoCount, Colors.orange),
          _buildStatItem('En Progreso', inProgressCount, Colors.blue),
          _buildStatItem('En Revisión', reviewCount, Colors.purple),
          _buildStatItem('Completadas', doneCount, Colors.green),
          _buildStatItem('Horas', totalHours.toStringAsFixed(0), Colors.grey[700]!),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, dynamic value, Color color) {
    return Column(
      children: [
        Text(
          value.toString(),
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color),
        ),
        const SizedBox(height: 4),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
      ],
    );
  }

  Widget _buildKanbanColumn(String status, String label, Color color) {
    final columnTasks = _tasks.where((t) => t.status == status).toList();
    final columnHours = columnTasks.fold<double>(0, (sum, t) => sum + (t.estimatedHours ?? 0));

    return Container(
      width: 300,
      margin: const EdgeInsets.symmetric(horizontal: 8),
      child: Column(
        children: [
          // Column header
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${columnTasks.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Column content
          Expanded(
            child: DragTarget<TaskModel>(
              onWillAccept: (task) => task != null,
              onAccept: (task) {
                if (task.status != status) {
                  _updateTaskStatus(task, status);
                }
              },
              builder: (context, candidateData, rejectedData) {
                return Container(
                  decoration: BoxDecoration(
                    color: candidateData.isNotEmpty
                        ? color.withOpacity(0.1)
                        : Colors.grey[50],
                    border: Border.all(
                      color: candidateData.isNotEmpty ? color : Colors.grey[300]!,
                      width: 2,
                    ),
                    borderRadius: const BorderRadius.vertical(bottom: Radius.circular(8)),
                  ),
                  child: columnTasks.isEmpty
                      ? Center(
                          child: Text(
                            'Sin tareas',
                            style: TextStyle(color: Colors.grey[400]),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(8),
                          itemCount: columnTasks.length,
                          itemBuilder: (context, index) {
                            final task = columnTasks[index];
                            return _buildTaskCard(task, color);
                          },
                        ),
                );
              },
            ),
          ),

          // Column footer with hours
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(8)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.access_time, size: 16, color: Colors.grey),
                const SizedBox(width: 4),
                Text(
                  '${columnHours.toStringAsFixed(0)}h',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[700],
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskCard(TaskModel task, Color columnColor) {
    return Draggable<TaskModel>(
      data: task,
      feedback: Material(
        elevation: 8,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 280,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: columnColor, width: 2),
          ),
          child: _buildTaskCardContent(task),
        ),
      ),
      childWhenDragging: Opacity(
        opacity: 0.3,
        child: _buildTaskCardUI(task, columnColor),
      ),
      child: _buildTaskCardUI(task, columnColor),
    );
  }

  Widget _buildTaskCardUI(TaskModel task, Color columnColor) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: columnColor.withOpacity(0.3), width: 1),
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => TaskDetailScreen(task: task),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: _buildTaskCardContent(task),
        ),
      ),
    );
  }

  Widget _buildTaskCardContent(TaskModel task) {
    final daysLeft = task.dueDate != null
        ? task.dueDate!.difference(DateTime.now()).inDays
        : null;
    final isOverdue = daysLeft != null && daysLeft < 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Priority badge
        Row(
          children: [
            Text(
              _getPriorityEmoji(task.priority),
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(width: 4),
            Text(
              task.priority,
              style: TextStyle(
                fontSize: 10,
                color: _getPriorityColor(task.priority),
                fontWeight: FontWeight.bold,
              ),
            ),
            const Spacer(),
            if (task.isBlocked == true)
              const Icon(Icons.block, size: 16, color: Colors.red),
          ],
        ),
        const SizedBox(height: 8),

        // Title
        Text(
          task.title,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),

        if (task.description != null) ...[
          const SizedBox(height: 4),
          Text(
            task.description!,
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],

        const SizedBox(height: 8),

        // Metadata row
        Row(
          children: [
            if (task.dueDate != null) ...[
              Icon(
                Icons.calendar_today,
                size: 12,
                color: isOverdue ? Colors.red : Colors.grey,
              ),
              const SizedBox(width: 4),
              Text(
                DateFormat('dd/MM').format(task.dueDate!),
                style: TextStyle(
                  fontSize: 11,
                  color: isOverdue ? Colors.red : Colors.grey[600],
                  fontWeight: isOverdue ? FontWeight.bold : FontWeight.normal,
                ),
              ),
              const SizedBox(width: 8),
            ],
            if (task.estimatedHours != null) ...[
              const Icon(Icons.access_time, size: 12, color: Colors.grey),
              const SizedBox(width: 4),
              Text(
                '${task.estimatedHours}h',
                style: TextStyle(fontSize: 11, color: Colors.grey[600]),
              ),
            ],
          ],
        ),

        // Progress bar
        if (task.progressPercentage != null && task.progressPercentage! > 0) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: LinearProgressIndicator(
                  value: task.progressPercentage! / 100,
                  backgroundColor: Colors.grey[300],
                  valueColor: AlwaysStoppedAnimation<Color>(
                    task.progressPercentage! == 100 ? Colors.green : Colors.blue,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${task.progressPercentage}%',
                style: TextStyle(fontSize: 10, color: Colors.grey[600]),
              ),
            ],
          ),
        ],

        // Tags
        if (task.tags != null && task.tags!.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 4,
            runSpacing: 4,
            children: task.tags!.take(3).map((tag) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  tag,
                  style: TextStyle(fontSize: 10, color: Colors.grey[700]),
                ),
              );
            }).toList(),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final selectedCompany = ref.watch(selectedMyCompanyProvider);

    if (selectedCompany == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Tareas - Kanban')),
        body: const Center(child: Text('Selecciona una empresa primero')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tareas - Kanban'),
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() {
                _selectedPriority = value == 'all' ? null : value;
              });
              _loadTasks();
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'all', child: Text('Todas')),
              const PopupMenuItem(value: 'URGENT', child: Text('🔴 Urgente')),
              const PopupMenuItem(value: 'HIGH', child: Text('🟠 Alta')),
              const PopupMenuItem(value: 'MEDIUM', child: Text('🟡 Media')),
              const PopupMenuItem(value: 'LOW', child: Text('🟢 Baja')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTasks,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                _buildStatsBar(),
                Expanded(
                  child: ListView(
                    controller: _scrollController,
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.all(16),
                    children: _columns.map((col) {
                      return _buildKanbanColumn(
                        col['status'] as String,
                        col['label'] as String,
                        col['color'] as Color,
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
    );
  }
}
