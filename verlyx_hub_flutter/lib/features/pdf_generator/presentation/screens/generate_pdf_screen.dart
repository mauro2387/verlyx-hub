import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/pdf_template_model.dart';
import '../../data/repositories/pdf_generator_repository.dart';
import 'pdf_generator_screen.dart';

class GeneratePdfScreen extends ConsumerStatefulWidget {
  final PdfTemplateModel template;

  const GeneratePdfScreen({Key? key, required this.template}) : super(key: key);

  @override
  ConsumerState<GeneratePdfScreen> createState() => _GeneratePdfScreenState();
}

class _GeneratePdfScreenState extends ConsumerState<GeneratePdfScreen> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, dynamic> _formData = {};
  bool _isGenerating = false;

  @override
  void initState() {
    super.initState();
    _initializeFormData();
  }

  void _initializeFormData() {
    final fields = widget.template.templateData['fields'] as List<dynamic>?;
    if (fields != null) {
      for (var field in fields) {
        final fieldMap = field as Map<String, dynamic>;
        final name = fieldMap['name'] as String;
        final type = fieldMap['type'] as String;
        final defaultValue = fieldMap['default'];

        if (type == 'list') {
          _formData[name] = [];
        } else if (defaultValue != null) {
          _formData[name] = defaultValue;
        }
      }
    }
  }

  Widget _buildField(Map<String, dynamic> field) {
    final name = field['name'] as String;
    final label = field['label'] as String? ?? name;
    final type = field['type'] as String;
    final required = field['required'] as bool? ?? false;
    final calculated = field['calculated'] as bool? ?? false;

    if (calculated) {
      return const SizedBox.shrink(); // Los campos calculados se muestran pero no se editan
    }

    switch (type) {
      case 'text':
      case 'email':
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: TextFormField(
            decoration: InputDecoration(
              labelText: label + (required ? ' *' : ''),
              border: const OutlineInputBorder(),
            ),
            keyboardType: type == 'email' ? TextInputType.emailAddress : TextInputType.text,
            validator: required ? (value) => value?.isEmpty ?? true ? 'Campo requerido' : null : null,
            onSaved: (value) => _formData[name] = value,
            initialValue: _formData[name]?.toString(),
          ),
        );

      case 'number':
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: TextFormField(
            decoration: InputDecoration(
              labelText: label + (required ? ' *' : ''),
              border: const OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            validator: required ? (value) => value?.isEmpty ?? true ? 'Campo requerido' : null : null,
            onSaved: (value) => _formData[name] = value != null && value.isNotEmpty ? num.tryParse(value) : null,
            onChanged: (value) {
              _formData[name] = value.isNotEmpty ? num.tryParse(value) : null;
              // Recalcular si es tax o discount
              if (name == 'tax' || name == 'discount') {
                setState(() => _calculateAllFields());
              }
            },
            initialValue: _formData[name]?.toString(),
          ),
        );

      case 'date':
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: InkWell(
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                initialDate: DateTime.now(),
                firstDate: DateTime(2000),
                lastDate: DateTime(2100),
              );
              if (date != null) {
                setState(() => _formData[name] = date.toIso8601String().split('T')[0]);
              }
            },
            child: InputDecorator(
              decoration: InputDecoration(
                labelText: label + (required ? ' *' : ''),
                border: const OutlineInputBorder(),
                suffixIcon: const Icon(Icons.calendar_today),
              ),
              child: Text(_formData[name]?.toString() ?? 'Seleccionar fecha'),
            ),
          ),
        );

      case 'textarea':
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: TextFormField(
            decoration: InputDecoration(
              labelText: label + (required ? ' *' : ''),
              border: const OutlineInputBorder(),
            ),
            maxLines: 4,
            validator: required ? (value) => value?.isEmpty ?? true ? 'Campo requerido' : null : null,
            onSaved: (value) => _formData[name] = value,
            initialValue: _formData[name]?.toString(),
          ),
        );

      case 'select':
        final options = field['options'] as List<dynamic>?;
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: DropdownButtonFormField<String>(
            decoration: InputDecoration(
              labelText: label + (required ? ' *' : ''),
              border: const OutlineInputBorder(),
            ),
            value: _formData[name]?.toString(),
            items: options?.map((opt) {
              return DropdownMenuItem(
                value: opt.toString(),
                child: Text(opt.toString()),
              );
            }).toList(),
            validator: required ? (value) => value == null ? 'Campo requerido' : null : null,
            onChanged: (value) => setState(() => _formData[name] = value),
          ),
        );

      case 'list':
        return _buildListField(field);

      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildListField(Map<String, dynamic> field) {
    final name = field['name'] as String;
    final label = field['label'] as String? ?? name;
    final listFields = field['fields'] as List<dynamic>?;
    final items = (_formData[name] as List<dynamic>?) ?? [];

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ElevatedButton.icon(
                    onPressed: () {
                      setState(() {
                        final newItem = <String, dynamic>{};
                        if (listFields != null) {
                          for (var f in listFields) {
                            final fMap = f as Map<String, dynamic>;
                            final fName = fMap['name'] as String;
                            final fType = fMap['type'] as String;
                            if (fType == 'number') {
                              newItem[fName] = 0;
                            } else {
                              newItem[fName] = '';
                            }
                          }
                        }
                        items.add(newItem);
                        _formData[name] = items;
                      });
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Agregar'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.deepPurple,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...items.asMap().entries.map((entry) {
                final index = entry.key;
                final item = entry.value as Map<String, dynamic>;
                return Card(
                  color: Colors.grey[100],
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Item ${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold)),
                            IconButton(
                              icon: const Icon(Icons.delete, color: Colors.red),
                              onPressed: () {
                                setState(() {
                                  items.removeAt(index);
                                  _formData[name] = items;
                                });
                              },
                            ),
                          ],
                        ),
                        if (listFields != null)
                          ...listFields.map((f) {
                            final fMap = f as Map<String, dynamic>;
                            final fName = fMap['name'] as String;
                            final fLabel = fMap['label'] as String? ?? fName;
                            final fType = fMap['type'] as String;
                            final fCalculated = fMap['calculated'] as bool? ?? false;

                            if (fCalculated) {
                              // Mostrar campo calculado pero no editable
                              final value = _calculateField(item, fMap);
                              return Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: InputDecorator(
                                  decoration: InputDecoration(
                                    labelText: fLabel,
                                    border: const OutlineInputBorder(),
                                    filled: true,
                                    fillColor: Colors.grey[200],
                                  ),
                                  child: Text(value?.toString() ?? '0'),
                                ),
                              );
                            }

                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: TextFormField(
                                decoration: InputDecoration(
                                  labelText: fLabel,
                                  border: const OutlineInputBorder(),
                                ),
                                keyboardType: fType == 'number' ? TextInputType.number : TextInputType.text,
                                initialValue: item[fName]?.toString() ?? '',
                                onChanged: (value) {
                                  setState(() {
                                    if (fType == 'number') {
                                      item[fName] = value.isNotEmpty ? num.tryParse(value) ?? 0 : 0;
                                    } else {
                                      item[fName] = value;
                                    }
                                    // Recalcular todos los campos cuando cambie quantity o price
                                    if (fName == 'quantity' || fName == 'price') {
                                      _calculateAllFields();
                                    }
                                  });
                                },
                              ),
                            );
                          }).toList(),
                      ],
                    ),
                  ),
                );
              }).toList(),
              if (items.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text('No hay items. Usa el botón "Agregar" para añadir.', style: TextStyle(color: Colors.grey[600])),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  dynamic _calculateField(Map<String, dynamic> item, Map<String, dynamic> fieldDef) {
    final name = fieldDef['name'] as String;
    
    // Si es total en un item, calcular quantity * price
    if (name == 'total') {
      final quantity = item['quantity'] as num? ?? 0;
      final price = item['price'] as num? ?? 0;
      return quantity * price;
    }
    
    return null;
  }

  dynamic _calculateGlobalField(String name, Map<String, dynamic> fieldDef) {
    // Subtotal = sum of all items.total
    if (name == 'subtotal') {
      final items = _formData['items'] as List<dynamic>?;
      if (items != null && items.isNotEmpty) {
        num sum = 0;
        for (var item in items) {
          final itemMap = item as Map<String, dynamic>;
          final quantity = itemMap['quantity'] as num? ?? 0;
          final price = itemMap['price'] as num? ?? 0;
          sum += quantity * price;
        }
        return sum;
      }
      return 0;
    }
    
    // Tax amount = subtotal * (tax / 100)
    if (name == 'tax_amount') {
      final subtotal = _formData['subtotal'] as num? ?? 0;
      final taxRate = _formData['tax'] as num? ?? 0;
      return (subtotal * taxRate) / 100;
    }
    
    // Discount amount = subtotal * (discount / 100)
    if (name == 'discount_amount') {
      final subtotal = _formData['subtotal'] as num? ?? 0;
      final discountRate = _formData['discount'] as num? ?? 0;
      return (subtotal * discountRate) / 100;
    }
    
    // Total = subtotal + tax_amount - discount_amount
    if (name == 'total') {
      final subtotal = _formData['subtotal'] as num? ?? 0;
      final taxAmount = _formData['tax_amount'] as num? ?? 0;
      final discountAmount = _formData['discount_amount'] as num? ?? 0;
      return subtotal + taxAmount - discountAmount;
    }
    
    return null;
  }

  void _calculateAllFields() {
    // Calcular en orden: subtotal -> discount_amount -> tax_amount -> total
    
    // 1. Calcular subtotal (suma de items.total)
    _formData['subtotal'] = _calculateGlobalField('subtotal', {});
    
    // 2. Calcular discount_amount si hay descuento
    if (_formData['discount'] != null) {
      _formData['discount_amount'] = _calculateGlobalField('discount_amount', {});
    }
    
    // 3. Calcular tax_amount
    _formData['tax_amount'] = _calculateGlobalField('tax_amount', {});
    
    // 4. Calcular total final
    _formData['total'] = _calculateGlobalField('total', {});
  }

  Future<void> _generatePdf() async {
    if (!_formKey.currentState!.validate()) return;

    _formKey.currentState!.save();
    _calculateAllFields();

    setState(() => _isGenerating = true);

    try {
      final repository = ref.read(pdfGeneratorRepositoryProvider);
      final fileName = '${widget.template.templateType}_${DateTime.now().millisecondsSinceEpoch}.pdf';

      await repository.generatePdf(
        templateId: widget.template.id,
        fileName: fileName,
        documentData: _formData,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('PDF generado exitosamente'), backgroundColor: Colors.green),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al generar PDF: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => _isGenerating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fields = widget.template.templateData['fields'] as List<dynamic>?;

    return Scaffold(
      appBar: AppBar(
        title: Text('Generar ${widget.template.name}'),
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Card(
                      color: Colors.deepPurple[50],
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, color: Colors.deepPurple[700]),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                widget.template.description ?? 'Complete los siguientes campos para generar el PDF',
                                style: TextStyle(color: Colors.deepPurple[700]),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (fields != null && fields.isNotEmpty)
                      ...fields.where((f) {
                        final fMap = f as Map<String, dynamic>;
                        return !(fMap['calculated'] as bool? ?? false);
                      }).map((field) => _buildField(field as Map<String, dynamic>)).toList()
                    else
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: Text('Esta plantilla no tiene campos definidos', style: TextStyle(color: Colors.grey)),
                        ),
                      ),
                    // Mostrar campos calculados globales al final
                    ...?fields?.where((f) {
                      final fMap = f as Map<String, dynamic>;
                      final calculated = fMap['calculated'] as bool? ?? false;
                      final name = fMap['name'] as String;
                      // Solo mostrar campos calculados globales, no de items
                      return calculated && !['description', 'quantity', 'price', 'total'].contains(name);
                    }).map((f) {
                      final fMap = f as Map<String, dynamic>;
                      final name = fMap['name'] as String;
                      final label = fMap['label'] as String? ?? name;
                      
                      // Calcular el valor actual
                      final value = _calculateGlobalField(name, fMap);
                      
                      // Color según el tipo de campo
                      Color bgColor = Colors.blue[50]!;
                      if (name == 'subtotal') bgColor = Colors.grey[100]!;
                      if (name == 'tax_amount') bgColor = Colors.orange[50]!;
                      if (name == 'discount_amount') bgColor = Colors.green[50]!;
                      if (name == 'total') bgColor = Colors.green[100]!;
                      
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: InputDecorator(
                          decoration: InputDecoration(
                            labelText: label,
                            border: const OutlineInputBorder(),
                            filled: true,
                            fillColor: bgColor,
                          ),
                          child: Text(
                            value != null ? '€${(value as num).toStringAsFixed(2)}' : '€0.00',
                            style: TextStyle(
                              fontSize: name == 'total' ? 22 : 18,
                              fontWeight: name == 'total' ? FontWeight.bold : FontWeight.w600,
                              color: name == 'total' ? Colors.green[800] : Colors.black87,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 4,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _isGenerating ? null : _generatePdf,
                  icon: _isGenerating
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.picture_as_pdf),
                  label: Text(_isGenerating ? 'Generando...' : 'Generar PDF'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepPurple,
                    foregroundColor: Colors.white,
                    textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
