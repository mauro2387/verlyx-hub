import 'block_model.dart';

class PageModel {
  final String id;
  final String workspaceId;
  final String? parentPageId;
  final String title;
  final String? icon;
  final String? coverUrl;
  final bool isPublic;
  final bool isTemplate;
  final String? templateType;
  final bool canComment;
  final bool canEditByOthers;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? createdBy;
  final String? lastEditedBy;
  final List<BlockModel>? blocks;

  PageModel({
    required this.id,
    required this.workspaceId,
    this.parentPageId,
    required this.title,
    this.icon,
    this.coverUrl,
    required this.isPublic,
    required this.isTemplate,
    this.templateType,
    required this.canComment,
    required this.canEditByOthers,
    required this.createdAt,
    this.updatedAt,
    this.createdBy,
    this.lastEditedBy,
    this.blocks,
  });

  factory PageModel.fromJson(Map<String, dynamic> json) {
    return PageModel(
      id: json['id'] as String,
      workspaceId: json['workspace_id'] as String,
      parentPageId: json['parent_page_id'] as String?,
      title: json['title'] as String,
      icon: json['icon'] as String?,
      coverUrl: json['cover_url'] as String?,
      isPublic: json['is_public'] as bool? ?? false,
      isTemplate: json['is_template'] as bool? ?? false,
      templateType: json['template_type'] as String?,
      canComment: json['can_comment'] as bool? ?? true,
      canEditByOthers: json['can_edit_by_others'] as bool? ?? true,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at'] as String) 
          : null,
      createdBy: json['created_by'] as String?,
      lastEditedBy: json['last_edited_by'] as String?,
      blocks: json['blocks'] != null
          ? (json['blocks'] as List).map((b) => BlockModel.fromJson(b)).toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspace_id': workspaceId,
      'parent_page_id': parentPageId,
      'title': title,
      'icon': icon,
      'cover_url': coverUrl,
      'is_public': isPublic,
      'is_template': isTemplate,
      'template_type': templateType,
      'can_comment': canComment,
      'can_edit_by_others': canEditByOthers,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'created_by': createdBy,
      'last_edited_by': lastEditedBy,
      if (blocks != null) 'blocks': blocks!.map((b) => b.toJson()).toList(),
    };
  }

  PageModel copyWith({
    String? id,
    String? workspaceId,
    String? parentPageId,
    String? title,
    String? icon,
    String? coverUrl,
    bool? isPublic,
    bool? isTemplate,
    String? templateType,
    bool? canComment,
    bool? canEditByOthers,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? createdBy,
    String? lastEditedBy,
    List<BlockModel>? blocks,
  }) {
    return PageModel(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      parentPageId: parentPageId ?? this.parentPageId,
      title: title ?? this.title,
      icon: icon ?? this.icon,
      coverUrl: coverUrl ?? this.coverUrl,
      isPublic: isPublic ?? this.isPublic,
      isTemplate: isTemplate ?? this.isTemplate,
      templateType: templateType ?? this.templateType,
      canComment: canComment ?? this.canComment,
      canEditByOthers: canEditByOthers ?? this.canEditByOthers,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      createdBy: createdBy ?? this.createdBy,
      lastEditedBy: lastEditedBy ?? this.lastEditedBy,
      blocks: blocks ?? this.blocks,
    );
  }
}
