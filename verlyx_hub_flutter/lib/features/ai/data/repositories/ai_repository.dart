import 'package:dio/dio.dart';
import '../models/conversation_model.dart';
import '../models/message_model.dart';

class AiRepository {
  final Dio _dio;

  AiRepository(this._dio);

  // ========== CONVERSACIONES ==========

  Future<ConversationModel> createConversation({
    required String title,
    String contextType = 'general',
  }) async {
    final response = await _dio.post(
      '/ai/conversations',
      data: {
        'title': title,
        'contextType': contextType,
      },
    );
    return ConversationModel.fromJson(response.data);
  }

  Future<List<ConversationModel>> getConversations({
    String? contextType,
  }) async {
    final response = await _dio.get(
      '/ai/conversations',
      queryParameters: {
        if (contextType != null) 'contextType': contextType,
      },
    );
    return (response.data as List)
        .map((json) => ConversationModel.fromJson(json))
        .toList();
  }

  Future<ConversationModel> getConversation(String id) async {
    final response = await _dio.get('/ai/conversations/$id');
    return ConversationModel.fromJson(response.data);
  }

  Future<ConversationModel> updateConversation(
    String id, {
    String? title,
    bool? isPinned,
  }) async {
    final response = await _dio.patch(
      '/ai/conversations/$id',
      data: {
        if (title != null) 'title': title,
        if (isPinned != null) 'isPinned': isPinned,
      },
    );
    return ConversationModel.fromJson(response.data);
  }

  Future<void> deleteConversation(String id) async {
    await _dio.delete('/ai/conversations/$id');
  }

  // ========== MENSAJES ==========

  Future<Map<String, dynamic>> sendMessage(
    String conversationId,
    String content,
  ) async {
    final response = await _dio.post(
      '/ai/conversations/$conversationId/messages',
      data: {'content': content},
    );
    return response.data;
  }

  Future<List<MessageModel>> getMessages(
    String conversationId, {
    int limit = 50,
  }) async {
    final response = await _dio.get(
      '/ai/conversations/$conversationId/messages',
      queryParameters: {'limit': limit},
    );
    return (response.data as List)
        .map((json) => MessageModel.fromJson(json))
        .toList();
  }

  // ========== LEGACY ENDPOINTS ==========

  Future<String> chat(String message, {String? context}) async {
    final response = await _dio.post(
      '/ai/chat',
      data: {
        'message': message,
        if (context != null) 'context': context,
      },
    );
    return response.data['response'] as String;
  }

  Future<Map<String, dynamic>> suggestFields(
    String documentType,
    Map<String, dynamic> existingData,
  ) async {
    final response = await _dio.post(
      '/ai/suggest-fields',
      data: {
        'documentType': documentType,
        'existingData': existingData,
      },
    );
    return response.data['suggestions'] as Map<String, dynamic>;
  }

  Future<String> analyzeDocument(Map<String, dynamic> documentData) async {
    final response = await _dio.post(
      '/ai/analyze-document',
      data: {'documentData': documentData},
    );
    return response.data['analysis'] as String;
  }

  Future<String> generateProjectDescription(String projectName) async {
    final response = await _dio.post(
      '/ai/generate-project-description',
      data: {'projectName': projectName},
    );
    return response.data['description'] as String;
  }

  Future<List<String>> suggestTasks(
    String projectName, {
    String? projectDescription,
  }) async {
    final response = await _dio.post(
      '/ai/suggest-tasks',
      data: {
        'projectName': projectName,
        if (projectDescription != null) 'projectDescription': projectDescription,
      },
    );
    return List<String>.from(response.data['tasks'] as List);
  }

  Future<String> summarize(String itemType, List<dynamic> items) async {
    final response = await _dio.post(
      '/ai/summarize',
      data: {
        'itemType': itemType,
        'items': items,
      },
    );
    return response.data['summary'] as String;
  }

  Future<String> translate(String text, {String targetLang = 'es'}) async {
    final response = await _dio.post(
      '/ai/translate',
      data: {
        'text': text,
        'targetLang': targetLang,
      },
    );
    return response.data['translation'] as String;
  }
}

