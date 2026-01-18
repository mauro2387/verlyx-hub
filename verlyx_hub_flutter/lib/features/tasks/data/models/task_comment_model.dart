class TaskCommentModel {
  final String id;
  final String taskId;
  final String? parentCommentId;
  final String content;
  final String? createdBy;
  final List<String>? mentionedUsers;
  final Map<String, dynamic>? reactions; // {emoji: [userId1, userId2]}
  final List<Map<String, dynamic>>? attachments;
  final bool isEdited;
  final DateTime createdAt;
  final DateTime updatedAt;

  TaskCommentModel({
    required this.id,
    required this.taskId,
    this.parentCommentId,
    required this.content,
    this.createdBy,
    this.mentionedUsers,
    this.reactions,
    this.attachments,
    this.isEdited = false,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TaskCommentModel.fromJson(Map<String, dynamic> json) {
    return TaskCommentModel(
      id: json['id'] ?? '',
      taskId: json['taskId'] ?? json['task_id'] ?? '',
      parentCommentId: json['parentCommentId'] ?? json['parent_comment_id'],
      content: json['content'] ?? '',
      createdBy: json['createdBy'] ?? json['created_by'],
      mentionedUsers: json['mentionedUsers'] != null
          ? List<String>.from(json['mentionedUsers'])
          : (json['mentioned_users'] != null ? List<String>.from(json['mentioned_users']) : null),
      reactions: json['reactions'] != null ? Map<String, dynamic>.from(json['reactions']) : null,
      attachments: json['attachments'] != null ? List<Map<String, dynamic>>.from(json['attachments']) : null,
      isEdited: json['isEdited'] ?? json['is_edited'] ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : (json['created_at'] != null ? DateTime.parse(json['created_at']) : DateTime.now()),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : (json['updated_at'] != null ? DateTime.parse(json['updated_at']) : DateTime.now()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id.isNotEmpty) 'id': id,
      'taskId': taskId,
      if (parentCommentId != null) 'parentCommentId': parentCommentId,
      'content': content,
      if (createdBy != null) 'createdBy': createdBy,
      if (mentionedUsers != null) 'mentionedUsers': mentionedUsers,
      if (reactions != null) 'reactions': reactions,
      if (attachments != null) 'attachments': attachments,
      'isEdited': isEdited,
    };
  }
}
