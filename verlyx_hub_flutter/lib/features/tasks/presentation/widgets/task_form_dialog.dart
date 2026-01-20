import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../data/models/task_model.dart';

class TaskFormDialog extends ConsumerStatefulWidget {
  final TaskModel? task; // null = create, non-null = edit
  final String myCompanyId;

  const TaskFormDialog({
    Key? key,
    this.task,
    required this.myCompanyId,
  }) : super(key: key);

  @override
  ConsumerState<TaskFormDialog> createState() => _TaskFormDialogState();
}

class _TaskFormDialogState extends ConsumerState<TaskFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late TextEditingController _estimatedHoursController;
  late TextEditingController _actualHoursController;
  late TextEditingController _blockedReasonController;

  String _selectedStatus = 'TODO';
  String _selectedPriority = 'MEDIUM';
  DateTime? _startDate;
  DateTime? _dueDate;
  int _progressPercentage = 0;
  bool _isBlocked = false;
  List<String> _tags = [];
  List<Map<String, dynamic>> _checklist = [];
  final _tagController = TextEditingController();
  final _checklistItemController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final task = widget.task;
    _titleController = TextEditingController(text: task?.title ?? '');
    _descriptionController = TextEditingController(text: task?.description ?? '');
    _estimatedHoursController = TextEditingController(
      text: task?.estimatedHours?.toString() ?? '',
    );
    _actualHoursController = TextEditingController(
      text: task?.actualHours?.toString() ?? '',
    );
    _blockedReasonController = TextEditingController(text: task?.blockedReason ?? '');

    if (task != null) {
      _selectedStatus = task.status;
      _selectedPriority = task.priority;
      _startDate = task.startDate;
      _dueDate = task.dueDate;
      _progressPercentage = task.progressPercentage ?? 0;
      _isBlocked = task.isBlocked ?? false;
      _tags = List<String>.from(task.tags ?? []);
      _checklist = List<Map<String, dynamic>>.from(task.checklist ?? []);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _estimatedHoursController.dispose();
    _actualHoursController.dispose();
    _blockedReasonController.dispose();
    _tagController.dispose();
    _checklistItemController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context, bool isStartDate) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: (isStartDate ? _startDate : _dueDate) ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        if (isStartDate) {
          _startDate = picked;
        } else {
          _dueDate = picked;
        }
      });
    }
  }

  void _addTag() {
    if (_tagController.text.trim().isNotEmpty) {
      setState(() {
        _tags.add(_tagController.text.trim());
        _tagController.clear();
      });
    }
  }

  void _removeTag(int index) {
    setState(() => _tags.removeAt(index));
  }

  void _addChecklistItem() {
    if (_checklistItemController.text.trim().isNotEmpty) {
      setState(() {
        _checklist.add({
          'text': _checklistItemController.text.trim(),
          'completed': false,
          'order': _checklist.length,
        });
        _checklistItemController.clear();
      });
    }
  }

  void _removeChecklistItem(int index) {
    setState(() => _checklist.removeAt(index));
  }

  void _toggleChecklistItem(int index) {
    setState(() {
      _checklist[index]['completed'] = !(_checklist[index]['completed'] as bool);
    });
  }

  TaskModel _buildTask() {
    return TaskModel(
      id: widget.task?.id ?? '',
      myCompanyId: widget.myCompanyId,
      title: _titleController.text.trim(),
      description: _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      status: _selectedStatus,
      priority: _selectedPriority,
      startDate: _startDate?.toUtc(),
      dueDate: _dueDate?.toUtc(),
      estimatedHours: _estimatedHoursController.text.isEmpty
          ? null
          : double.tryParse(_estimatedHoursController.text),
      actualHours: _actualHoursController.text.isEmpty
          ? null
          : double.tryParse(_actualHoursController.text),
      progressPercentage: _progressPercentage,
      isBlocked: _isBlocked,
      blockedReason: _isBlocked && _blockedReasonController.text.trim().isNotEmpty
          ? _blockedReasonController.text.trim()
          : null,
      tags: _tags.isEmpty ? null : _tags,
      checklist: _checklist.isEmpty ? null : _checklist,
      createdAt: widget.task?.createdAt ?? DateTime.now().toUtc(),
      updatedAt: DateTime.now().toUtc(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(maxWidth: 600),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.task_alt, color: Colors.white),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        widget.task == null ? 'Nueva Tarea' : 'Editar Tarea',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              // Body
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Título
                      TextFormField(
                        controller: _titleController,
                        decoration: const InputDecoration(
                          labelText: 'Título *',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.title),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'El título es requerido';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Descripción
                      TextFormField(
                        controller: _descriptionController,
                        decoration: const InputDecoration(
                          labelText: 'Descripción',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.description),
                        ),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 16),

                      // Status y Priority
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _selectedStatus,
                              decoration: const InputDecoration(
                                labelText: 'Estado',
                                border: OutlineInputBorder(),
                                prefixIcon: Icon(Icons.flag),
                              ),
                              items: const [
                                DropdownMenuItem(value: 'TODO', child: Text('Por Hacer')),
                                DropdownMenuItem(value: 'IN_PROGRESS', child: Text('En Progreso')),
                                DropdownMenuItem(value: 'REVIEW', child: Text('En Revisión')),
                                DropdownMenuItem(value: 'BLOCKED', child: Text('Bloqueada')),
                                DropdownMenuItem(value: 'DONE', child: Text('Completada')),
                                DropdownMenuItem(value: 'CANCELLED', child: Text('Cancelada')),
                              ],
                              onChanged: (value) => setState(() => _selectedStatus = value!),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _selectedPriority,
                              decoration: const InputDecoration(
                                labelText: 'Prioridad',
                                border: OutlineInputBorder(),
                                prefixIcon: Icon(Icons.priority_high),
                              ),
                              items: const [
                                DropdownMenuItem(value: 'LOW', child: Text('🟢 Baja')),
                                DropdownMenuItem(value: 'MEDIUM', child: Text('🟡 Media')),
                                DropdownMenuItem(value: 'HIGH', child: Text('🟠 Alta')),
                                DropdownMenuItem(value: 'URGENT', child: Text('🔴 Urgente')),
                              ],
                              onChanged: (value) => setState(() => _selectedPriority = value!),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Fechas
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => _selectDate(context, true),
                              child: InputDecorator(
                                decoration: const InputDecoration(
                                  labelText: 'Fecha Inicio',
                                  border: OutlineInputBorder(),
                                  prefixIcon: Icon(Icons.calendar_today),
                                ),
                                child: Text(
                                  _startDate == null
                                      ? 'Seleccionar'
                                      : DateFormat('dd/MM/yyyy').format(_startDate!),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: InkWell(
                              onTap: () => _selectDate(context, false),
                              child: InputDecorator(
                                decoration: const InputDecoration(
                                  labelText: 'Fecha Vencimiento',
                                  border: OutlineInputBorder(),
                                  prefixIcon: Icon(Icons.event),
                                ),
                                child: Text(
                                  _dueDate == null
                                      ? 'Seleccionar'
                                      : DateFormat('dd/MM/yyyy').format(_dueDate!),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Horas
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _estimatedHoursController,
                              decoration: const InputDecoration(
                                labelText: 'Horas Estimadas',
                                border: OutlineInputBorder(),
                                prefixIcon: Icon(Icons.schedule),
                                suffixText: 'h',
                              ),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _actualHoursController,
                              decoration: const InputDecoration(
                                labelText: 'Horas Reales',
                                border: OutlineInputBorder(),
                                prefixIcon: Icon(Icons.timer),
                                suffixText: 'h',
                              ),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Progress
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Text('Progreso: '),
                              Text(
                                '$_progressPercentage%',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          Slider(
                            value: _progressPercentage.toDouble(),
                            min: 0,
                            max: 100,
                            divisions: 20,
                            label: '$_progressPercentage%',
                            onChanged: (value) {
                              setState(() => _progressPercentage = value.round());
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Blocking
                      CheckboxListTile(
                        title: const Text('Tarea Bloqueada'),
                        subtitle: const Text('Marca si hay impedimentos'),
                        value: _isBlocked,
                        onChanged: (value) => setState(() => _isBlocked = value!),
                        contentPadding: EdgeInsets.zero,
                      ),
                      if (_isBlocked) ...[
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _blockedReasonController,
                          decoration: const InputDecoration(
                            labelText: 'Razón del Bloqueo',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.block),
                          ),
                          maxLines: 2,
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Tags
                      const Text('Etiquetas', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: _tags.asMap().entries.map((entry) {
                          return Chip(
                            label: Text(entry.value),
                            deleteIcon: const Icon(Icons.close, size: 16),
                            onDeleted: () => _removeTag(entry.key),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _tagController,
                              decoration: const InputDecoration(
                                hintText: 'Nueva etiqueta',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                              onSubmitted: (_) => _addTag(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            onPressed: _addTag,
                            icon: const Icon(Icons.add),
                            style: IconButton.styleFrom(backgroundColor: Colors.blue[50]),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Checklist
                      const Text('Checklist', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      ..._checklist.asMap().entries.map((entry) {
                        final index = entry.key;
                        final item = entry.value;
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Checkbox(
                            value: item['completed'] as bool,
                            onChanged: (_) => _toggleChecklistItem(index),
                          ),
                          title: Text(
                            item['text'] as String,
                            style: TextStyle(
                              decoration: (item['completed'] as bool)
                                  ? TextDecoration.lineThrough
                                  : null,
                            ),
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete, size: 20),
                            onPressed: () => _removeChecklistItem(index),
                          ),
                        );
                      }).toList(),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _checklistItemController,
                              decoration: const InputDecoration(
                                hintText: 'Nuevo item',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                              onSubmitted: (_) => _addChecklistItem(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            onPressed: _addChecklistItem,
                            icon: const Icon(Icons.add),
                            style: IconButton.styleFrom(backgroundColor: Colors.blue[50]),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),

              // Footer
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(8)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar'),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: () {
                        if (_formKey.currentState!.validate()) {
                          Navigator.pop(context, _buildTask());
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange,
                        foregroundColor: Colors.white,
                      ),
                      child: Text(widget.task == null ? 'Crear' : 'Guardar'),
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
}
