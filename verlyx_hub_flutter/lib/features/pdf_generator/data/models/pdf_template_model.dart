class PdfTemplateModel {
  final String id;
  final String name;
  final String templateType;
  final Map<String, dynamic> templateData;
  final String? description;
  final bool isActive;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  PdfTemplateModel({
    required this.id,
    required this.name,
    required this.templateType,
    required this.templateData,
    this.description,
    required this.isActive,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PdfTemplateModel.fromJson(Map<String, dynamic> json) {
    return PdfTemplateModel(
      id: json['id'] as String,
      name: json['name'] as String,
      templateType: (json['template_type'] ?? json['templateType']) as String,
      templateData: Map<String, dynamic>.from(json['template_data'] ?? json['templateData'] ?? {}),
      description: json['description'] as String?,
      isActive: (json['is_active'] ?? json['isActive'] ?? true) as bool,
      createdBy: json['created_by'] as String? ?? json['createdBy'] as String?,
      createdAt: DateTime.parse(json['created_at'] ?? json['createdAt']),
      updatedAt: DateTime.parse(json['updated_at'] ?? json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'template_type': templateType,
      'template_data': templateData,
      'description': description,
      'is_active': isActive,
      'created_by': createdBy,
    };
  }
}
