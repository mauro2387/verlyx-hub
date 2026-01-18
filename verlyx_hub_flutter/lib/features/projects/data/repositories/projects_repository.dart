import 'package:dio/dio.dart';
import '../models/project_model.dart';

class ProjectsRepository {
  final Dio _dio;
  
  ProjectsRepository(this._dio);
  
  Future<List<ProjectModel>> getProjects({
    String? companyId,
    String? status,
    String? priority,
    String? search,
    bool? includeArchived,
    int? page,
    int? limit,
  }) async {
    final response = await _dio.get('/projects', queryParameters: {
      if (companyId != null) 'companyId': companyId,
      if (status != null) 'status': status,
      if (priority != null) 'priority': priority,
      if (search != null) 'search': search,
      if (includeArchived != null) 'includeArchived': includeArchived,
      if (page != null) 'page': page,
      if (limit != null) 'limit': limit,
    });
    
    final List<dynamic> data = response.data['data'] ?? [];
    return data.map((json) => ProjectModel.fromJson(json)).toList();
  }
  
  Future<ProjectModel> getProject(String id) async {
    final response = await _dio.get('/projects/$id');
    return ProjectModel.fromJson(response.data);
  }
  
  Future<Map<String, dynamic>> getStats({String? companyId}) async {
    final response = await _dio.get('/projects/stats', queryParameters: {
      if (companyId != null) 'companyId': companyId,
    });
    return response.data;
  }
  
  Future<ProjectModel> createProject(Map<String, dynamic> data) async {
    final response = await _dio.post('/projects', data: data);
    return ProjectModel.fromJson(response.data);
  }
  
  Future<ProjectModel> updateProject(String id, Map<String, dynamic> data) async {
    final response = await _dio.patch('/projects/$id', data: data);
    return ProjectModel.fromJson(response.data);
  }
  
  Future<void> deleteProject(String id) async {
    await _dio.delete('/projects/$id');
  }
}
