import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../data/models/project_model.dart';
import '../providers/projects_provider.dart';
import '../../../../core/network/dio_provider.dart';
import '../../../my_companies/presentation/providers/my_companies_provider.dart';
import '../../../clients/presentation/providers/clients_provider.dart';

class ProjectFormScreen extends ConsumerStatefulWidget {
  final String? projectId;

  const ProjectFormScreen({
    Key? key,
    this.projectId,
  }) : super(key: key);

  @override
  ConsumerState<ProjectFormScreen> createState() => _ProjectFormScreenState();
}

class _ProjectFormScreenState extends ConsumerState<ProjectFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _budgetController;
  late final TextEditingController _clientIdController;

  String? _selectedMyCompanyId;
  String? _selectedClientCompanyId;
  String _selectedStatus = 'planning';
  String _selectedPriority = 'medium';
  DateTime? _startDate;
  DateTime? _dueDate;
  List<String> _tags = [];
  final TextEditingController _tagController = TextEditingController();

  bool _isLoading = false;

  final List<String> _statuses = [
    'planning',
    'in_progress',
    'on_hold',
    'review',
    'done',
    'cancelled',
    'backlog',
  ];

  final List<String> _priorities = ['low', 'medium', 'high', 'critical'];

  // My Companies and Client Companies
  List<Map<String, String>> _myCompanies = [];
  List<Map<String, String>> _clientCompanies = [];
  bool _loadingMyCompanies = true;
  bool _loadingClientCompanies = true;
  ProjectModel? _project;
  bool _loadingProject = false;

  @override
  void initState() {
    super.initState();
    _loadMyCompanies();
    _loadClientCompanies();
    
    // Initialize controllers with empty values
    _nameController = TextEditingController();
    _descriptionController = TextEditingController();
    _budgetController = TextEditingController();
    _clientIdController = TextEditingController();

    // Load project if editing
    if (widget.projectId != null) {
      _loadProject();
    }
  }

  Future<void> _loadProject() async {
    setState(() {
      _loadingProject = true;
    });

    try {
      final projectAsync = ref.read(projectProvider(widget.projectId!).future);
      final projectData = await projectAsync;
      _project = projectData as ProjectModel;

      // Populate form with project data
      _nameController.text = _project!.name;
      _descriptionController.text = _project!.description ?? '';
      _budgetController.text = _project!.budget?.toString() ?? '';
      _clientIdController.text = _project!.clientId ?? '';
      
      setState(() {
        _selectedMyCompanyId = _project!.myCompanyId;
        _selectedClientCompanyId = _project!.companyId;
        _selectedStatus = _project!.status;
        _selectedPriority = _project!.priority;
        _startDate = _project!.startDate;
        _dueDate = _project!.dueDate;
        _tags = List.from(_project!.tags ?? []);
        _loadingProject = false;
      });
    } catch (e) {
      setState(() {
        _loadingProject = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al cargar proyecto: $e')),
        );
      }
    }
  }

  Future<void> _loadMyCompanies() async {
    try {
      final myCompaniesAsync = await ref.read(myCompaniesProvider.future);
      
      setState(() {
        _myCompanies = myCompaniesAsync
            .map((company) => {
                  'id': company.id,
                  'name': company.name,
                })
            .toList();
        _loadingMyCompanies = false;
      });
    } catch (e) {
      setState(() {
        _loadingMyCompanies = false;
        _myCompanies = [];
      });
    }
  }

  Future<void> _loadClientCompanies() async {
    try {
      final clientsAsync = await ref.read(clientsProvider.future);
      
      setState(() {
        _clientCompanies = clientsAsync
            .map((client) => {
                  'id': client.id,
                  'name': client.name,
                })
            .toList();
        _loadingClientCompanies = false;
      });
    } catch (e) {
      setState(() {
        _loadingClientCompanies = false;
        _clientCompanies = [];
      });
    }
  }

  Future<void> _loadCompanies() async {
    // Deprecated - now using _loadMyCompanies and _loadClientCompanies
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _budgetController.dispose();
    _clientIdController.dispose();
    _tagController.dispose();
    super.dispose();
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
    return statusMap[status] ?? status;
  }

  String _formatPriority(String priority) {
    final Map<String, String> priorityMap = {
      'low': 'Baja',
      'medium': 'Media',
      'high': 'Alta',
      'critical': 'Crítica',
    };
    return priorityMap[priority] ?? priority;
  }

  Future<void> _selectDate(BuildContext context, bool isStartDate) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isStartDate
          ? (_startDate ?? DateTime.now())
          : (_dueDate ?? DateTime.now()),
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
    final tag = _tagController.text.trim();
    if (tag.isNotEmpty && !_tags.contains(tag)) {
      setState(() {
        _tags.add(tag);
        _tagController.clear();
      });
    }
  }

  void _removeTag(String tag) {
    setState(() {
      _tags.remove(tag);
    });
  }

  Future<void> _saveProject() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // Company is optional - allow null for testing
    // if (_selectedCompanyId == null) {
    //   ScaffoldMessenger.of(context).showSnackBar(
    //     const SnackBar(content: Text('Selecciona una empresa')),
    //   );
    //   return;
    // }

    setState(() {
      _isLoading = true;
    });

    try {
      final repository = ref.read(projectsRepositoryProvider);

      final projectData = {
        'name': _nameController.text.trim(),
        'description': _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        'myCompanyId': _selectedMyCompanyId,
        'clientCompanyId': _selectedClientCompanyId,
        'status': _selectedStatus,
        'priority': _selectedPriority,
        'budget': _budgetController.text.trim().isEmpty
            ? null
            : double.parse(_budgetController.text.trim()),
        'startDate': _startDate?.toIso8601String(),
        'dueDate': _dueDate?.toIso8601String(),
        'clientId': null, // TODO: Implement client selector with valid UUIDs
        'tags': _tags.isEmpty ? null : _tags,
      };

      if (_project != null) {
        // Update existing project
        await repository.updateProject(_project!.id, projectData);
      } else {
        // Create new project
        await repository.createProject(projectData);
      }

      if (mounted) {
        // Invalidate projects list to refresh
        ref.invalidate(projectsProvider);
        // If updating, also invalidate the specific project cache
        if (_project != null) {
          ref.invalidate(projectProvider(_project!.id));
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _project != null
                  ? 'Proyecto actualizado'
                  : 'Proyecto creado',
            ),
          ),
        );
        
        // Wait a moment for cache invalidation before navigating back
        await Future.delayed(const Duration(milliseconds: 100));
        if (mounted) {
          Navigator.pop(context, true);
        }
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
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd/MM/yyyy');

    return Scaffold(
      appBar: AppBar(
        title: Text(_project != null ? 'Editar Proyecto' : 'Nuevo Proyecto'),
        actions: [
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.check),
              onPressed: _saveProject,
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // My Company Dropdown
            if (_loadingMyCompanies)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(16.0),
                  child: CircularProgressIndicator(),
                ),
              )
            else
              DropdownButtonFormField<String>(
                value: _selectedMyCompanyId,
                decoration: const InputDecoration(
                  labelText: 'Mi Empresa (Opcional)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.business_center),
                  helperText: 'Para cuál de tus empresas es este proyecto',
                ),
                items: [
                  const DropdownMenuItem(
                    value: null,
                    child: Text('Sin empresa', style: TextStyle(fontStyle: FontStyle.italic)),
                  ),
                  ..._myCompanies.map((company) {
                    return DropdownMenuItem(
                      value: company['id'],
                      child: Text(company['name']!),
                    );
                  }),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedMyCompanyId = value;
                  });
                },
              ),
            const SizedBox(height: 16),
            // Client Company Dropdown
            if (_loadingClientCompanies)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(16.0),
                  child: CircularProgressIndicator(),
                ),
              )
            else
              DropdownButtonFormField<String>(
                value: _selectedClientCompanyId,
                decoration: const InputDecoration(
                  labelText: 'Empresa Cliente (Opcional)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.people),
                  helperText: 'Cliente para quien es este proyecto',
                ),
                items: [
                  const DropdownMenuItem(
                    value: null,
                    child: Text('Sin cliente', style: TextStyle(fontStyle: FontStyle.italic)),
                  ),
                  ..._clientCompanies.map((client) {
                    return DropdownMenuItem(
                      value: client['id'],
                      child: Text(client['name']!),
                    );
                  }),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedClientCompanyId = value;
                  });
                },
              ),
            const SizedBox(height: 16),
            // Name
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nombre *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.title),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Ingresa un nombre';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            // Description
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Descripción',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.description),
              ),
              maxLines: 4,
            ),
            const SizedBox(height: 16),
            // Status and Priority
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedStatus,
                    decoration: const InputDecoration(
                      labelText: 'Estado *',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.flag),
                    ),
                    items: _statuses.map((status) {
                      return DropdownMenuItem(
                        value: status,
                        child: Text(_formatStatus(status)),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedStatus = value!;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedPriority,
                    decoration: const InputDecoration(
                      labelText: 'Prioridad *',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.priority_high),
                    ),
                    items: _priorities.map((priority) {
                      return DropdownMenuItem(
                        value: priority,
                        child: Text(_formatPriority(priority)),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedPriority = value!;
                      });
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Budget
            TextFormField(
              controller: _budgetController,
              decoration: const InputDecoration(
                labelText: 'Presupuesto',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.attach_money),
                hintText: '0.00',
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
              ],
              validator: (value) {
                if (value != null && value.trim().isNotEmpty) {
                  final budget = double.tryParse(value.trim());
                  if (budget == null || budget < 0) {
                    return 'Ingresa un presupuesto válido';
                  }
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            // Dates
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => _selectDate(context, true),
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Fecha de inicio',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.calendar_today),
                      ),
                      child: Text(
                        _startDate != null
                            ? dateFormat.format(_startDate!)
                            : 'Seleccionar',
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: InkWell(
                    onTap: () => _selectDate(context, false),
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Fecha de vencimiento',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.event),
                      ),
                      child: Text(
                        _dueDate != null
                            ? dateFormat.format(_dueDate!)
                            : 'Seleccionar',
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Client ID
            TextFormField(
              controller: _clientIdController,
              decoration: const InputDecoration(
                labelText: 'ID del Cliente',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person),
                hintText: 'Opcional',
              ),
            ),
            const SizedBox(height: 16),
            // Tags
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _tagController,
                        decoration: const InputDecoration(
                          labelText: 'Tags',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.label),
                          hintText: 'Agregar tag',
                        ),
                        onSubmitted: (_) => _addTag(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.add),
                      onPressed: _addTag,
                      style: IconButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
                if (_tags.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _tags.map((tag) {
                      return Chip(
                        label: Text(tag),
                        deleteIcon: const Icon(Icons.close, size: 18),
                        onDeleted: () => _removeTag(tag),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 24),
            // Validation info
            if (_dueDate != null &&
                _startDate != null &&
                _dueDate!.isBefore(_startDate!))
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning, color: Colors.red),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'La fecha de vencimiento debe ser posterior a la fecha de inicio',
                        style: TextStyle(color: Colors.red),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isLoading ? null : _saveProject,
        icon: _isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Icon(Icons.save),
        label: Text(_project != null ? 'Actualizar' : 'Crear'),
      ),
    );
  }
}
