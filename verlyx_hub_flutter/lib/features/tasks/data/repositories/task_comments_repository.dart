import 'package:dio/dio.dart';
import '../models/task_comment_model.dart';

class TaskCommentsRepository {
  final Dio _dio;
  
  TaskCommentsRepository(this._dio);
  
  Future<List<TaskCommentModel>> getComments(String taskId) async {
    final response = await _dio.get('/task-comments/task/$taskId');
    final List<dynamic> data = response.data ?? [];
    return data.map((json) => TaskCommentModel.fromJson(json)).toList();
  }
  
  Future<List<TaskCommentModel>> getReplies(String commentId) async {
    final response = await _dio.get('/task-comments/$commentId/replies');
    final List<dynamic> data = response.data ?? [];
    return data.map((json) => TaskCommentModel.fromJson(json)).toList();
  }
  
  Future<TaskCommentModel> createComment(TaskCommentModel comment) async {
    final response = await _dio.post('/task-comments', data: comment.toJson());
    return TaskCommentModel.fromJson(response.data);
  }
  
  Future<TaskCommentModel> updateComment(String id, TaskCommentModel comment) async {
    final response = await _dio.patch('/task-comments/$id', data: comment.toJson());
    return TaskCommentModel.fromJson(response.data);
  }
  
  Future<void> deleteComment(String id) async {
    await _dio.delete('/task-comments/$id');
  }
  
  Future<TaskCommentModel> addReaction(String commentId, String emoji) async {
    final response = await _dio.post('/task-comments/$commentId/reactions', data: {
      'emoji': emoji,
    });
    return TaskCommentModel.fromJson(response.data);
  }
  
  Future<TaskCommentModel> removeReaction(String commentId, String emoji) async {
    final response = await _dio.delete('/task-comments/$commentId/reactions', data: {
      'emoji': emoji,
    });
    return TaskCommentModel.fromJson(response.data);
  }
}
