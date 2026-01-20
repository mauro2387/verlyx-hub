class TaskModel {
  final String id;
  final String? myCompanyId;
  final String? projectId;
  final String? dealId;
  final String? clientId;
  final String? organizationId;
  final String? parentTaskId;
  final String title;
  final String? description;
  final String status;
  final String priority;
  final String? assignedTo;
  final List<String>? assignedUsers;
  final DateTime? startDate;
  final DateTime? dueDate;
  final DateTime? completedAt;
  final double? estimatedHours;
  final double? actualHours;
  final int? progressPercentage;
  final bool? isBlocked;
  final String? blockedReason;
  final List<String>? tags;
  final Map<String, dynamic>? customFields;
  final List<dynamic>? attachments;
  final List<dynamic>? checklist;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  TaskModel({
    this.id = '',
    this.myCompanyId,
    this.projectId,
    this.dealId,
    this.clientId,
    this.organizationId,
    this.parentTaskId,
    required this.title,
    this.description,
    required this.status,
    required this.priority,
    this.assignedTo,
    this.assignedUsers,
    this.startDate,
    this.dueDate,
    this.completedAt,
    this.estimatedHours,
    this.actualHours,
    this.progressPercentage,
    this.isBlocked,
    this.blockedReason,
    this.tags,
    this.customFields,
    this.attachments,
    this.checklist,
    this.createdAt,
    this.updatedAt,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'] as String? ?? '',
      myCompanyId: json['myCompanyId'] as String?,
      projectId: json['projectId'] as String?,
      dealId: json['dealId'] as String?,
      clientId: json['clientId'] as String?,
      organizationId: json['organizationId'] as String?,
      parentTaskId: json['parentTaskId'] as String?,
      title: json['title'] as String,
      description: json['description'] as String?,
      status: json['status'] as String,
      priority: json['priority'] as String,
      assignedTo: json['assignedTo'] as String?,
      assignedUsers: json['assignedUsers'] != null ? List<String>.from(json['assignedUsers']) : null,
      startDate: json['startDate'] != null ? DateTime.parse(json['startDate']) : null,
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate']) : null,
      completedAt: json['completedAt'] != null ? DateTime.parse(json['completedAt']) : null,
      estimatedHours: json['estimatedHours']?.toDouble(),
      actualHours: json['actualHours']?.toDouble(),
      progressPercentage: json['progressPercentage'] as int?,
      isBlocked: json['isBlocked'] as bool?,
      blockedReason: json['blockedReason'] as String?,
      tags: json['tags'] != null ? List<String>.from(json['tags']) : null,
      customFields: json['customFields'] as Map<String, dynamic>?,
      attachments: json['attachments'] as List<dynamic>?,
      checklist: json['checklist'] as List<dynamic>?,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (myCompanyId != null) 'myCompanyId': myCompanyId,
      if (projectId != null) 'projectId': projectId,
      if (dealId != null) 'dealId': dealId,
      if (clientId != null) 'clientId': clientId,
      if (organizationId != null) 'organizationId': organizationId,
      if (parentTaskId != null) 'parentTaskId': parentTaskId,
      'title': title,
      if (description != null) 'description': description,
      'status': status,
      'priority': priority,
      if (assignedTo != null) 'assignedTo': assignedTo,
      if (assignedUsers != null) 'assignedUsers': assignedUsers,
      if (startDate != null) 'startDate': startDate!.toIso8601String(),
      if (dueDate != null) 'dueDate': dueDate!.toIso8601String(),
      if (estimatedHours != null) 'estimatedHours': estimatedHours,
      if (actualHours != null) 'actualHours': actualHours,
      if (progressPercentage != null) 'progressPercentage': progressPercentage,
      if (isBlocked != null) 'isBlocked': isBlocked,
      if (blockedReason != null) 'blockedReason': blockedReason,
      if (tags != null) 'tags': tags,
      if (customFields != null) 'customFields': customFields,
      if (attachments != null) 'attachments': attachments,
      if (checklist != null) 'checklist': checklist,
    };
  }
}
