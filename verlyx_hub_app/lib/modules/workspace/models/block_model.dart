enum BlockType {
  paragraph,
  heading1,
  heading2,
  heading3,
  bulletedList,
  numberedList,
  todo,
  toggle,
  quote,
  divider,
  callout,
  code,
  image,
  video,
  file,
  embed,
  table,
  tableRow,
  bookmark,
  linkToPage;

  static BlockType fromString(String value) {
    return BlockType.values.firstWhere(
      (e) => e.name == value,
      orElse: () => BlockType.paragraph,
    );
  }
}

class BlockModel {
  final String id;
  final String pageId;
  final String? parentBlockId;
  final BlockType type;
  final Map<String, dynamic> content;
  final int order;
  final int indentLevel;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? createdBy;

  BlockModel({
    required this.id,
    required this.pageId,
    this.parentBlockId,
    required this.type,
    required this.content,
    required this.order,
    required this.indentLevel,
    required this.createdAt,
    this.updatedAt,
    this.createdBy,
  });

  factory BlockModel.fromJson(Map<String, dynamic> json) {
    return BlockModel(
      id: json['id'] as String,
      pageId: json['page_id'] as String,
      parentBlockId: json['parent_block_id'] as String?,
      type: BlockType.fromString(json['type'] as String),
      content: Map<String, dynamic>.from(json['content'] as Map),
      order: json['order'] as int? ?? 0,
      indentLevel: json['indent_level'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at'] as String) 
          : null,
      createdBy: json['created_by'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'page_id': pageId,
      'parent_block_id': parentBlockId,
      'type': type.name,
      'content': content,
      'order': order,
      'indent_level': indentLevel,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'created_by': createdBy,
    };
  }

  BlockModel copyWith({
    String? id,
    String? pageId,
    String? parentBlockId,
    BlockType? type,
    Map<String, dynamic>? content,
    int? order,
    int? indentLevel,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? createdBy,
  }) {
    return BlockModel(
      id: id ?? this.id,
      pageId: pageId ?? this.pageId,
      parentBlockId: parentBlockId ?? this.parentBlockId,
      type: type ?? this.type,
      content: content ?? this.content,
      order: order ?? this.order,
      indentLevel: indentLevel ?? this.indentLevel,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      createdBy: createdBy ?? this.createdBy,
    );
  }
}
