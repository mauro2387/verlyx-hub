class WorkspaceModel {
  final String id;
  final String myCompanyId;
  final String name;
  final String? description;
  final String? icon;
  final String? color;
  final bool isPublic;
  final String? defaultPageTemplate;
  final int order;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? createdBy;

  WorkspaceModel({
    required this.id,
    required this.myCompanyId,
    required this.name,
    this.description,
    this.icon,
    this.color,
    required this.isPublic,
    this.defaultPageTemplate,
    required this.order,
    required this.createdAt,
    this.updatedAt,
    this.createdBy,
  });

  factory WorkspaceModel.fromJson(Map<String, dynamic> json) {
    return WorkspaceModel(
      id: json['id'] as String,
      myCompanyId: json['my_company_id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      icon: json['icon'] as String?,
      color: json['color'] as String?,
      isPublic: json['is_public'] as bool? ?? false,
      defaultPageTemplate: json['default_page_template'] as String?,
      order: json['order'] as int? ?? 0,
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
      'my_company_id': myCompanyId,
      'name': name,
      'description': description,
      'icon': icon,
      'color': color,
      'is_public': isPublic,
      'default_page_template': defaultPageTemplate,
      'order': order,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'created_by': createdBy,
    };
  }

  WorkspaceModel copyWith({
    String? id,
    String? myCompanyId,
    String? name,
    String? description,
    String? icon,
    String? color,
    bool? isPublic,
    String? defaultPageTemplate,
    int? order,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? createdBy,
  }) {
    return WorkspaceModel(
      id: id ?? this.id,
      myCompanyId: myCompanyId ?? this.myCompanyId,
      name: name ?? this.name,
      description: description ?? this.description,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      isPublic: isPublic ?? this.isPublic,
      defaultPageTemplate: defaultPageTemplate ?? this.defaultPageTemplate,
      order: order ?? this.order,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      createdBy: createdBy ?? this.createdBy,
    );
  }
}
