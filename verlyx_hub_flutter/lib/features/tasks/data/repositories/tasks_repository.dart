import 'package:dio/dio.dart';
import '../models/task_model.dart';

class TasksRepository {
  final Dio _dio;
  
  TasksRepository(this._dio);
  
  Future<List<TaskModel>> getTasks({
    String? myCompanyId,
    String? status,
    String? priority,
    String? projectId,
    String? assignedTo,
  }) async {
    final response = await _dio.get('/tasks', queryParameters: {
      if (myCompanyId != null) 'myCompanyId': myCompanyId,
      if (status != null) 'status': status,
      if (priority != null) 'priority': priority,
      if (projectId != null) 'projectId': projectId,
      if (assignedTo != null) 'assignedTo': assignedTo,
    });
    
    final List<dynamic> data = response.data['data'] ?? [];
    return data.map((json) => TaskModel.fromJson(json)).toList();
  }
  
  Future<TaskModel> createTask(TaskModel task) async {
    final response = await _dio.post('/tasks', data: task.toJson());
    return TaskModel.fromJson(response.data);
  }
  
  Future<TaskModel> updateTask(String id, TaskModel task) async {
    final response = await _dio.patch('/tasks/$id', data: task.toJson());
    return TaskModel.fromJson(response.data);
  }
  
  Future<void> deleteTask(String id) async {
    await _dio.delete('/tasks/$id');
  }
  
  Future<List<TaskModel>> getTaskHierarchy(String taskId) async {
    final response = await _dio.get('/tasks/hierarchy/$taskId');
    final List<dynamic> data = response.data ?? [];
    return data.map((json) => TaskModel.fromJson(json)).toList();
  }
  
  Future<Map<String, dynamic>> getTasksStats(String myCompanyId, {String? projectId}) async {
    final response = await _dio.get('/tasks/stats/$myCompanyId', queryParameters: {
      if (projectId != null) 'projectId': projectId,
    });
    return response.data as Map<String, dynamic>;
  }
}
