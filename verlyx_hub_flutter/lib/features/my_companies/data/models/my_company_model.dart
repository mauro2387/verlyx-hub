class MyCompanyModel {
  final String id;
  final String name;
  final String type;
  final String? description;
  final String? logoUrl;
  final String primaryColor;
  final String secondaryColor;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  MyCompanyModel({
    required this.id,
    required this.name,
    required this.type,
    this.description,
    this.logoUrl,
    required this.primaryColor,
    required this.secondaryColor,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MyCompanyModel.fromJson(Map<String, dynamic> json) {
    return MyCompanyModel(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      description: json['description'] as String?,
      logoUrl: json['logoUrl'] as String?,
      primaryColor: json['primaryColor'] as String? ?? '#6366f1',
      secondaryColor: json['secondaryColor'] as String? ?? '#8b5cf6',
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'description': description,
      'logoUrl': logoUrl,
      'primaryColor': primaryColor,
      'secondaryColor': secondaryColor,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
