class DocumentModel {
  final String id;
  final String name;
  final String filePath;
  final int? fileSize;
  final String? mimeType;
  final String? description;
  final String? folder;
  final String? projectId;
  final List<String>? tags;
  final String? uploadedBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  DocumentModel({
    required this.id,
    required this.name,
    required this.filePath,
    this.fileSize,
    this.mimeType,
    this.description,
    this.folder,
    this.projectId,
    this.tags,
    this.uploadedBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory DocumentModel.fromJson(Map<String, dynamic> json) {
    return DocumentModel(
      id: json['id'] as String,
      name: json['name'] as String,
      filePath: (json['file_path'] ?? json['filePath']) as String,
      fileSize: json['file_size'] as int? ?? json['fileSize'] as int?,
      mimeType: json['mime_type'] as String? ?? json['mimeType'] as String?,
      description: json['description'] as String?,
      folder: json['folder'] as String?,
      projectId: json['project_id'] as String? ?? json['projectId'] as String?,
      tags: json['tags'] != null ? List<String>.from(json['tags']) : null,
      uploadedBy: json['uploaded_by'] as String? ?? json['uploadedBy'] as String?,
      createdAt: DateTime.parse(json['created_at'] ?? json['createdAt']),
      updatedAt: DateTime.parse(json['updated_at'] ?? json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'filePath': filePath,
      'fileSize': fileSize,
      'mimeType': mimeType,
      'description': description,
      'folder': folder,
      'projectId': projectId,
      'tags': tags,
    };
  }
}
