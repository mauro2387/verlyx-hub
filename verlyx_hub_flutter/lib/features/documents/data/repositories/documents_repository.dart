import 'package:dio/dio.dart';
import '../models/document_model.dart';

class DocumentsRepository {
  final Dio _dio;
  
  DocumentsRepository(this._dio);
  
  Future<List<DocumentModel>> getDocuments({String? folder}) async {
    final response = await _dio.get('/documents', queryParameters: {
      if (folder != null) 'folder': folder,
    });
    
    final List<dynamic> data = response.data['data'] ?? [];
    return data.map((json) => DocumentModel.fromJson(json)).toList();
  }
  
  Future<DocumentModel> createDocument(DocumentModel document) async {
    final response = await _dio.post('/documents', data: document.toJson());
    return DocumentModel.fromJson(response.data);
  }
  
  Future<DocumentModel> updateDocument(String id, DocumentModel document) async {
    final response = await _dio.patch('/documents/$id', data: document.toJson());
    return DocumentModel.fromJson(response.data);
  }
  
  Future<void> deleteDocument(String id) async {
    await _dio.delete('/documents/$id');
  }
}
