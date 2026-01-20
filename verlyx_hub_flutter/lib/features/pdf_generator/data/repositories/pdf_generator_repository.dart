import 'package:dio/dio.dart';
import '../models/pdf_template_model.dart';
import '../models/generated_pdf_model.dart';

class PdfGeneratorRepository {
  final Dio _dio;
  
  PdfGeneratorRepository(this._dio);
  
  Future<List<PdfTemplateModel>> getTemplates({String? templateType}) async {
    final response = await _dio.get('/pdf/templates', queryParameters: {
      if (templateType != null) 'template_type': templateType,
    });
    
    // El backend devuelve el array directamente, no paginado
    final List<dynamic> data = response.data is List ? response.data : [];
    return data.map((json) => PdfTemplateModel.fromJson(json)).toList();
  }
  
  Future<PdfTemplateModel> createTemplate(PdfTemplateModel template) async {
    final response = await _dio.post('/pdf/templates', data: template.toJson());
    return PdfTemplateModel.fromJson(response.data);
  }
  
  Future<PdfTemplateModel> updateTemplate(String id, PdfTemplateModel template) async {
    final response = await _dio.patch('/pdf/templates/$id', data: template.toJson());
    return PdfTemplateModel.fromJson(response.data);
  }
  
  Future<void> deleteTemplate(String id) async {
    await _dio.delete('/pdf/templates/$id');
  }

  Future<Map<String, dynamic>> generatePdf({
    required String templateId,
    required String fileName,
    required Map<String, dynamic> documentData,
    String? relatedContactId,
    String? relatedProjectId,
  }) async {
    final response = await _dio.post('/pdf/generate', data: {
      'template_id': templateId,
      'file_name': fileName,
      'document_data': documentData,
      'related_contact_id': relatedContactId,
      'related_project_id': relatedProjectId,
    });
    
    return response.data;
  }

  Future<List<GeneratedPdfModel>> getGeneratedPdfs({String? templateId}) async {
    final response = await _dio.get('/pdf/generated', queryParameters: {
      if (templateId != null) 'template_id': templateId,
    });
    
    final List<dynamic> data = response.data is List ? response.data : [];
    return data.map((json) => GeneratedPdfModel.fromJson(json)).toList();
  }

  Future<void> deleteGeneratedPdf(String id) async {
    await _dio.delete('/pdf/generated/$id');
  }
}
