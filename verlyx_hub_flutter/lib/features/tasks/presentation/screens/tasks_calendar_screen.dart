import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import '../../data/models/task_model.dart';
import '../../data/repositories/tasks_repository.dart';
import '../../../my_companies/providers/my_companies_provider.dart';
import '../../../../core/network/dio_provider.dart';
import 'task_detail_screen.dart';

final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return TasksRepository(dio);
});

class TasksCalendarScreen extends ConsumerStatefulWidget {
  const TasksCalendarScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<TasksCalendarScreen> createState() => _TasksCalendarScreenState();
}

class _TasksCalendarScreenState extends ConsumerState<TasksCalendarScreen> {
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  List<TaskModel> _allTasks = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    setState(() => _isLoading = true);
    try {
      final myCompanyId = ref.read(selectedMyCompanyIdProvider);
      if (myCompanyId == null) return;

      final repository = ref.read(tasksRepositoryProvider);
      final tasks = await repository.getTasks(myCompanyId: myCompanyId);
      
      setState(() {
        _allTasks = tasks;
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

  List<TaskModel> _getTasksForDay(DateTime day) {
    return _allTasks.where((task) {
      if (task.dueDate == null) return false;
      return isSameDay(task.dueDate, day);
    }).toList();
  }

  Future<void> _rescheduleTask(TaskModel task, DateTime newDate) async {
    try {
      final repository = ref.read(tasksRepositoryProvider);
      final updatedTask = TaskModel(
        id: task.id,
        myCompanyId: task.myCompanyId,
        projectId: task.projectId,
        dealId: task.dealId,
        clientId: task.clientId,
        organizationId: task.organizationId,
        parentTaskId: task.parentTaskId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo,
        assignedUsers: task.assignedUsers,
        startDate: task.startDate,
        dueDate: newDate.toUtc(),
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
        updatedAt: DateTime.now().toUtc(),
      );

      await repository.updateTask(task.id, updatedTask);
      await _loadTasks();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Tarea reagendada'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 1),
          ),
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

  void _showTaskOptionsDialog(TaskModel task) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(task.title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (task.description != null) ...[
              Text(task.description!),
              const SizedBox(height: 12),
            ],
            Row(
              children: [
                const Icon(Icons.flag, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text(_getPriorityLabel(task.priority)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text(DateFormat('dd/MM/yyyy').format(task.dueDate!)),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => TaskDetailScreen(task: task),
                ),
              );
            },
            child: const Text('Ver Detalles'),
          ),
        ],
      ),
    );
  }

  String _getPriorityLabel(String priority) {
    switch (priority) {
      case 'URGENT': return '🔴 Urgente';
      case 'HIGH': return '🟠 Alta';
      case 'MEDIUM': return '🟡 Media';
      case 'LOW': return '🟢 Baja';
      default: return priority;
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority) {
      case 'URGENT': return Colors.red;
      case 'HIGH': return Colors.orange;
      case 'MEDIUM': return Colors.yellow[700]!;
      case 'LOW': return Colors.green;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Calendario de Tareas'),
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTasks,
          ),
          PopupMenuButton<CalendarFormat>(
            icon: const Icon(Icons.view_module),
            onSelected: (format) {
              setState(() => _calendarFormat = format);
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: CalendarFormat.month,
                child: Text('Vista Mes'),
              ),
              const PopupMenuItem(
                value: CalendarFormat.twoWeeks,
                child: Text('Vista 2 Semanas'),
              ),
              const PopupMenuItem(
                value: CalendarFormat.week,
                child: Text('Vista Semana'),
              ),
            ],
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Calendar
                TableCalendar<TaskModel>(
                  firstDay: DateTime.utc(2020, 1, 1),
                  lastDay: DateTime.utc(2030, 12, 31),
                  focusedDay: _focusedDay,
                  calendarFormat: _calendarFormat,
                  selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                  eventLoader: _getTasksForDay,
                  startingDayOfWeek: StartingDayOfWeek.monday,
                  calendarStyle: CalendarStyle(
                    todayDecoration: BoxDecoration(
                      color: Colors.orange[300],
                      shape: BoxShape.circle,
                    ),
                    selectedDecoration: const BoxDecoration(
                      color: Colors.orange,
                      shape: BoxShape.circle,
                    ),
                    markerDecoration: const BoxDecoration(
                      color: Colors.blue,
                      shape: BoxShape.circle,
                    ),
                    weekendTextStyle: const TextStyle(color: Colors.red),
                  ),
                  headerStyle: const HeaderStyle(
                    formatButtonVisible: false,
                    titleCentered: true,
                  ),
                  onDaySelected: (selectedDay, focusedDay) {
                    setState(() {
                      _selectedDay = selectedDay;
                      _focusedDay = focusedDay;
                    });
                  },
                  onFormatChanged: (format) {
                    setState(() => _calendarFormat = format);
                  },
                  onPageChanged: (focusedDay) {
                    _focusedDay = focusedDay;
                  },
                ),
                const Divider(height: 1),
                // Tasks list for selected day
                Expanded(
                  child: _buildTasksList(),
                ),
              ],
            ),
    );
  }

  Widget _buildTasksList() {
    final tasksForDay = _getTasksForDay(_selectedDay!);

    if (tasksForDay.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_busy, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No hay tareas para este día',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              DateFormat('dd/MM/yyyy').format(_selectedDay!),
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: tasksForDay.length,
      itemBuilder: (context, index) {
        final task = tasksForDay[index];
        final isOverdue = task.dueDate != null &&
            task.dueDate!.isBefore(DateTime.now()) &&
            task.status != 'DONE';

        return Draggable<TaskModel>(
          data: task,
          feedback: Material(
            elevation: 8,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: MediaQuery.of(context).size.width * 0.8,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange[100],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange, width: 2),
              ),
              child: Row(
                children: [
                  const Icon(Icons.drag_indicator, color: Colors.orange),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      task.title,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
          childWhenDragging: Opacity(
            opacity: 0.3,
            child: _buildTaskCard(task, isOverdue),
          ),
          child: DragTarget<TaskModel>(
            onAcceptWithDetails: (details) {
              if (details.data.id != task.id) {
                // Swap dates
                final draggedTask = details.data;
                final targetDate = task.dueDate!;
                _rescheduleTask(draggedTask, targetDate);
              }
            },
            builder: (context, candidateData, rejectedData) {
              final isHovering = candidateData.isNotEmpty;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  border: isHovering
                      ? Border.all(color: Colors.orange, width: 2)
                      : null,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: _buildTaskCard(task, isOverdue),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildTaskCard(TaskModel task, bool isOverdue) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => _showTaskOptionsDialog(task),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 4,
                height: 50,
                decoration: BoxDecoration(
                  color: _getPriorityColor(task.priority),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            task.title,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        if (isOverdue)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.red[100],
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              'VENCIDA',
                              style: TextStyle(
                                color: Colors.red,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                    if (task.description != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        task.description!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: Colors.grey[600], fontSize: 12),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildChip(
                          _getStatusLabel(task.status),
                          _getStatusColor(task.status),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _getPriorityLabel(task.priority),
                          style: const TextStyle(fontSize: 12),
                        ),
                        const Spacer(),
                        const Icon(Icons.drag_indicator, color: Colors.grey),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color, width: 1),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'TODO': return 'Por Hacer';
      case 'IN_PROGRESS': return 'En Progreso';
      case 'REVIEW': return 'Revisión';
      case 'BLOCKED': return 'Bloqueada';
      case 'DONE': return 'Completada';
      case 'CANCELLED': return 'Cancelada';
      default: return status;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'TODO': return Colors.orange;
      case 'IN_PROGRESS': return Colors.blue;
      case 'REVIEW': return Colors.purple;
      case 'BLOCKED': return Colors.red;
      case 'DONE': return Colors.green;
      case 'CANCELLED': return Colors.grey;
      default: return Colors.grey;
    }
  }
}
