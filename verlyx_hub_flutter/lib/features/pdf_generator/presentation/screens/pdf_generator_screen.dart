import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_provider.dart';
import '../../data/models/pdf_template_model.dart';
import '../../data/repositories/pdf_generator_repository.dart';
import 'generate_pdf_screen.dart';
import 'generated_pdfs_screen.dart';

final pdfGeneratorRepositoryProvider = Provider<PdfGeneratorRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return PdfGeneratorRepository(dio);
});

class PdfGeneratorScreen extends ConsumerStatefulWidget {
  const PdfGeneratorScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<PdfGeneratorScreen> createState() => _PdfGeneratorScreenState();
}

class _PdfGeneratorScreenState extends ConsumerState<PdfGeneratorScreen> {
  List<PdfTemplateModel> _templates = [];
  bool _isLoading = true;
  String? _filterType;

  @override
  void initState() {
    super.initState();
    _loadTemplates();
  }

  Future<void> _loadTemplates() async {
    setState(() => _isLoading = true);
    try {
      final repository = ref.read(pdfGeneratorRepositoryProvider);
      final templates = await repository.getTemplates(templateType: _filterType);
      setState(() {
        _templates = templates;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  IconData _getTemplateIcon(String templateType) {
    switch (templateType) {
      case 'contract': return Icons.description;
      case 'invoice': return Icons.receipt_long;
      case 'receipt': return Icons.receipt;
      case 'quote': return Icons.request_quote;
      case 'report': return Icons.assessment;
      default: return Icons.insert_drive_file;
    }
  }

  String _getTemplateTypeLabel(String templateType) {
    switch (templateType) {
      case 'contract': return 'Contrato';
      case 'invoice': return 'Factura';
      case 'receipt': return 'Recibo';
      case 'quote': return 'Cotización';
      case 'report': return 'Reporte';
      default: return templateType;
    }
  }

  Color _getTemplateTypeColor(String templateType) {
    switch (templateType) {
      case 'contract': return Colors.indigo;
      case 'invoice': return Colors.green;
      case 'receipt': return Colors.orange;
      case 'quote': return Colors.blue;
      case 'report': return Colors.purple;
      default: return Colors.grey;
    }
  }

  void _showGenerateDialog(PdfTemplateModel template) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => GeneratePdfScreen(template: template),
      ),
    ).then((_) => _loadTemplates()); // Recargar templates al volver
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Generador de PDFs'),
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.folder_open),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const GeneratedPdfsScreen(),
                ),
              );
            },
            tooltip: 'Ver PDFs generados',
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() => _filterType = value == 'all' ? null : value);
              _loadTemplates();
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'all', child: Text('Todos')),
              PopupMenuItem(value: 'invoice', child: Text('Facturas')),
              PopupMenuItem(value: 'receipt', child: Text('Recibos')),
              PopupMenuItem(value: 'contract', child: Text('Contratos')),
              PopupMenuItem(value: 'quote', child: Text('Cotizaciones')),
              PopupMenuItem(value: 'report', child: Text('Reportes')),
            ],
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _templates.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.picture_as_pdf, size: 80, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text('No hay plantillas', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                      const SizedBox(height: 8),
                      Text('Contacta al administrador para configurar plantillas', style: TextStyle(color: Colors.grey[500])),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadTemplates,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _templates.length,
                    itemBuilder: (context, index) {
                      final template = _templates[index];
                      final hasFields = (template.templateData['fields'] as List<dynamic>?)?.isNotEmpty ?? false;
                      
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 2,
                        child: InkWell(
                          onTap: hasFields ? () => _showGenerateDialog(template) : null,
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    CircleAvatar(
                                      backgroundColor: _getTemplateTypeColor(template.templateType).withOpacity(0.2),
                                      radius: 24,
                                      child: Icon(
                                        _getTemplateIcon(template.templateType), 
                                        color: _getTemplateTypeColor(template.templateType),
                                        size: 28,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            template.name, 
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            _getTemplateTypeLabel(template.templateType),
                                            style: TextStyle(color: _getTemplateTypeColor(template.templateType), fontSize: 12),
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (hasFields)
                                      Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey[400]),
                                  ],
                                ),
                                if (template.description != null) ...[
                                  const SizedBox(height: 12),
                                  Text(
                                    template.description!,
                                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                                  ),
                                ],
                                if (!hasFields) ...[
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: Colors.orange[50],
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(Icons.warning_amber, size: 16, color: Colors.orange[700]),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            'Plantilla sin campos configurados',
                                            style: TextStyle(color: Colors.orange[700], fontSize: 12),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
