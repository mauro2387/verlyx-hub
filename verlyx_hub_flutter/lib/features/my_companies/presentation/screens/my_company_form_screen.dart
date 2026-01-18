import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/my_companies_provider.dart';

class MyCompanyFormScreen extends ConsumerStatefulWidget {
  final String? companyId;

  const MyCompanyFormScreen({
    Key? key,
    this.companyId,
  }) : super(key: key);

  @override
  ConsumerState<MyCompanyFormScreen> createState() => _MyCompanyFormScreenState();
}

class _MyCompanyFormScreenState extends ConsumerState<MyCompanyFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _selectedType;
  bool _isLoading = false;

  final List<String> _companyTypes = [
    'technology',
    'consulting',
    'retail',
    'services',
    'education',
    'health',
    'finance',
    'manufacturing',
    'real_estate',
    'marketing',
    'design',
    'legal',
    'other',
  ];

  final Map<String, String> _typeLabels = {
    'technology': 'Tecnología',
    'consulting': 'Consultoría',
    'retail': 'Retail / Venta',
    'services': 'Servicios',
    'education': 'Educación',
    'health': 'Salud',
    'finance': 'Finanzas',
    'manufacturing': 'Manufactura',
    'real_estate': 'Inmobiliaria',
    'marketing': 'Marketing',
    'design': 'Diseño',
    'legal': 'Legal',
    'other': 'Otro',
  };

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final repository = ref.read(myCompaniesRepositoryProvider);
      final data = {
        'name': _nameController.text.trim(),
        'type': _selectedType,
        'description': _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
      };

      if (widget.companyId != null) {
        await repository.updateMyCompany(widget.companyId!, data);
      } else {
        await repository.createMyCompany(data);
      }

      if (mounted) {
        ref.invalidate(myCompaniesProvider);
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.companyId != null ? 'Empresa actualizada' : 'Empresa creada',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.companyId != null ? 'Editar Mi Empresa' : 'Nueva Empresa'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nombre *',
                hintText: 'Ej: Verlyx, PulsarMoon, Venta de Vapes',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'El nombre es requerido';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _selectedType,
              decoration: const InputDecoration(
                labelText: 'Tipo de empresa *',
                border: OutlineInputBorder(),
              ),
              items: _companyTypes.map((type) {
                return DropdownMenuItem(
                  value: type,
                  child: Text(_typeLabels[type] ?? type),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedType = value;
                });
              },
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'El tipo es requerido';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Descripción',
                hintText: 'Breve descripción de tu empresa',
                border: OutlineInputBorder(),
              ),
              maxLines: 4,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(widget.companyId != null ? 'Actualizar' : 'Crear'),
            ),
          ],
        ),
      ),
    );
  }
}
