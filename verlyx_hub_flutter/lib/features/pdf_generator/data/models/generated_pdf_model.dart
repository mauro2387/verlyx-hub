class GeneratedPdfModel {
  final String id;
  final String templateId;
  final String fileName;
  final String filePath;
  final Map<String, dynamic> documentData;
  final String? relatedContactId;
  final String? relatedProjectId;
  final DateTime createdAt;

  GeneratedPdfModel({
    required this.id,
    required this.templateId,
    required this.fileName,
    required this.filePath,
    required this.documentData,
    this.relatedContactId,
    this.relatedProjectId,
    required this.createdAt,
  });

  factory GeneratedPdfModel.fromJson(Map<String, dynamic> json) {
    return GeneratedPdfModel(
      id: json['id'] as String,
      templateId: (json['template_id'] ?? json['templateId']) as String,
      fileName: (json['file_name'] ?? json['fileName']) as String,
      filePath: (json['file_path'] ?? json['filePath']) as String,
      documentData: Map<String, dynamic>.from(json['document_data'] ?? json['documentData'] ?? {}),
      relatedContactId: json['related_contact_id'] as String? ?? json['relatedContactId'] as String?,
      relatedProjectId: json['related_project_id'] as String? ?? json['relatedProjectId'] as String?,
      createdAt: DateTime.parse(json['created_at'] ?? json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'template_id': templateId,
      'file_name': fileName,
      'file_path': filePath,
      'document_data': documentData,
      'related_contact_id': relatedContactId,
      'related_project_id': relatedProjectId,
    };
  }
}
