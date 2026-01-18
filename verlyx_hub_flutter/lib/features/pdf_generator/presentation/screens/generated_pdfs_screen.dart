import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'dart:io';
import '../../../../core/network/dio_provider.dart';
import '../../data/models/generated_pdf_model.dart';
import '../../data/repositories/pdf_generator_repository.dart';

final pdfGeneratorRepositoryProvider = Provider<PdfGeneratorRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return PdfGeneratorRepository(dio);
});

class GeneratedPdfsScreen extends ConsumerStatefulWidget {
  const GeneratedPdfsScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<GeneratedPdfsScreen> createState() => _GeneratedPdfsScreenState();
}

class _GeneratedPdfsScreenState extends ConsumerState<GeneratedPdfsScreen> {
  List<GeneratedPdfModel> _pdfs = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPdfs();
  }

  Future<void> _loadPdfs() async {
    setState(() => _isLoading = true);
    try {
      final repository = ref.read(pdfGeneratorRepositoryProvider);
      final pdfs = await repository.getGeneratedPdfs();
      setState(() {
        _pdfs = pdfs;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al cargar PDFs: $e')),
        );
      }
    }
  }

  Future<void> _downloadPdf(GeneratedPdfModel pdf) async {
    try {
      // Pedir permisos según versión de Android
      PermissionStatus status;
      
      if (Platform.isAndroid) {
        final androidInfo = await DeviceInfoPlugin().androidInfo;
        if (androidInfo.version.sdkInt >= 30) {
          // Android 11+ necesita MANAGE_EXTERNAL_STORAGE
          status = await Permission.manageExternalStorage.request();
        } else {
          // Android 10 y anteriores usan WRITE_EXTERNAL_STORAGE
          status = await Permission.storage.request();
        }
      } else {
        status = await Permission.storage.request();
      }
      
      if (!status.isGranted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Se necesita permiso de almacenamiento'),
              action: SnackBarAction(
                label: 'Configuración',
                onPressed: () => openAppSettings(),
              ),
            ),
          );
        }
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Descargando PDF...'),
          backgroundColor: Colors.green,
        ),
      );

      // Usar directorio público de Downloads
      final downloadsPath = '/storage/emulated/0/Download';
      final directory = Directory(downloadsPath);
      
      // Crear directorio si no existe
      if (!await directory.exists()) {
        await directory.create(recursive: true);
      }

      final filePath = '$downloadsPath/${pdf.fileName}';

      // Descargar archivo
      final dio = Dio();
      await dio.download(
        pdf.filePath,
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            final progress = (received / total * 100).toStringAsFixed(0);
            print('Descargando: $progress%');
          }
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('PDF guardado en Descargas'),
            action: SnackBarAction(
              label: 'Abrir',
              onPressed: () async {
                final uri = Uri.parse(pdf.filePath);
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              },
            ),
            duration: const Duration(seconds: 5),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al descargar: $e')),
        );
      }
    }
  }

  Future<void> _deletePdf(GeneratedPdfModel pdf) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar PDF'),
        content: Text('¿Eliminar "${pdf.fileName}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
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
        final repository = ref.read(pdfGeneratorRepositoryProvider);
        await repository.deleteGeneratedPdf(pdf.id);
        _loadPdfs();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('PDF eliminado')),
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
  }

  String _getDocumentTypeLabel(Map<String, dynamic> data) {
    if (data.containsKey('invoice_number')) return 'Factura';
    if (data.containsKey('receipt_number')) return 'Recibo';
    if (data.containsKey('contract_number')) return 'Contrato';
    if (data.containsKey('quote_number')) return 'Presupuesto';
    if (data.containsKey('report_title')) return 'Informe';
    return 'Documento';
  }

  IconData _getDocumentIcon(Map<String, dynamic> data) {
    if (data.containsKey('invoice_number')) return Icons.receipt_long;
    if (data.containsKey('receipt_number')) return Icons.receipt;
    if (data.containsKey('contract_number')) return Icons.description;
    if (data.containsKey('quote_number')) return Icons.request_quote;
    if (data.containsKey('report_title')) return Icons.assessment;
    return Icons.insert_drive_file;
  }

  Color _getDocumentColor(Map<String, dynamic> data) {
    if (data.containsKey('invoice_number')) return Colors.green;
    if (data.containsKey('receipt_number')) return Colors.orange;
    if (data.containsKey('contract_number')) return Colors.indigo;
    if (data.containsKey('quote_number')) return Colors.blue;
    if (data.containsKey('report_title')) return Colors.purple;
    return Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PDFs Generados'),
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _pdfs.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.picture_as_pdf, size: 80, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text(
                        'No hay PDFs generados',
                        style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Genera tu primer PDF desde las plantillas',
                        style: TextStyle(color: Colors.grey[500]),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadPdfs,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _pdfs.length,
                    itemBuilder: (context, index) {
                      final pdf = _pdfs[index];
                      final docType = _getDocumentTypeLabel(pdf.documentData);
                      final docIcon = _getDocumentIcon(pdf.documentData);
                      final docColor = _getDocumentColor(pdf.documentData);

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 2,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: docColor.withOpacity(0.2),
                                    radius: 24,
                                    child: Icon(docIcon, color: docColor, size: 28),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          pdf.fileName,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 16,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Chip(
                                              label: Text(docType),
                                              backgroundColor: docColor.withOpacity(0.1),
                                              padding: EdgeInsets.zero,
                                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              labelStyle: TextStyle(
                                                color: docColor,
                                                fontSize: 12,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              _formatDate(pdf.createdAt),
                                              style: TextStyle(
                                                color: Colors.grey[600],
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  OutlinedButton.icon(
                                    onPressed: () => _deletePdf(pdf),
                                    icon: const Icon(Icons.delete_outline, size: 18),
                                    label: const Text('Eliminar'),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: Colors.red,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  ElevatedButton.icon(
                                    onPressed: () => _downloadPdf(pdf),
                                    icon: const Icon(Icons.download, size: 18),
                                    label: const Text('Descargar'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.deepPurple,
                                      foregroundColor: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        return 'Hace ${difference.inMinutes} min';
      }
      return 'Hace ${difference.inHours}h';
    } else if (difference.inDays < 7) {
      return 'Hace ${difference.inDays}d';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}
