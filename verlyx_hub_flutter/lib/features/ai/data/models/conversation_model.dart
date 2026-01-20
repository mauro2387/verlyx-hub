class ConversationModel {
  final String id;
  final String userId;
  final String title;
  final String contextType;
  final bool isPinned;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int? messageCount;

  ConversationModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.contextType,
    required this.isPinned,
    required this.createdAt,
    required this.updatedAt,
    this.messageCount,
  });

  factory ConversationModel.fromJson(Map<String, dynamic> json) {
    return ConversationModel(
      id: json['id'],
      userId: json['user_id'],
      title: json['title'],
      contextType: json['context_type'],
      isPinned: json['is_pinned'] ?? false,
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      messageCount: json['ai_messages'] != null
          ? (json['ai_messages'] as List).length
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'title': title,
      'context_type': contextType,
      'is_pinned': isPinned,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}
