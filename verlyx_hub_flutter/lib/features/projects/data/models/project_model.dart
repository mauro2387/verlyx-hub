class ProjectModel {
  final String id;
  final String? myCompanyId;
  final String? companyId; // Now represents client_company_id
  final String name;
  final String? description;
  final String status;
  final String priority;
  final double? budget;
  final double? spentAmount;
  final String? currency;
  final DateTime? startDate;
  final DateTime? dueDate;
  final DateTime? completionDate;
  final int? progressPercentage;
  final String? clientId;
  final String? clientOrganizationId;
  final String? dealId;
  final String? projectManagerId;
  final List<String>? tags;
  final Map<String, dynamic>? customFields;
  final bool isArchived;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  // Metrics (calculated fields)
  final double? profitability;
  final double? profitabilityPercentage;
  final bool? isOverdue;
  final int? daysRemaining;

  ProjectModel({
    required this.id,
    this.myCompanyId,
    this.companyId,
    required this.name,
    this.description,
    required this.status,
    required this.priority,
    this.budget,
    this.spentAmount,
    this.currency,
    this.startDate,
    this.dueDate,
    this.completionDate,
    this.progressPercentage,
    this.clientId,
    this.clientOrganizationId,
    this.dealId,
    this.projectManagerId,
    this.tags,
    this.customFields,
    this.isArchived = false,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.profitability,
    this.profitabilityPercentage,
    this.isOverdue,
    this.daysRemaining,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    // Helper function to parse budget that can be string or number
    double? parseBudget(dynamic value) {
      if (value == null) return null;
      if (value is num) return value.toDouble();
      if (value is String) {
        try {
          return double.parse(value);
        } catch (e) {
          return null;
        }
      }
      return null;
    }

    return ProjectModel(
      id: json['id'] as String,
      myCompanyId: json['myCompanyId'] as String? ?? json['my_company_id'] as String?,
      companyId: json['clientCompanyId'] as String? ?? json['client_company_id'] as String? ?? json['companyId'] as String? ?? json['company_id'] as String?,
      name: json['name'] as String,
      description: json['description'] as String?,
      status: json['status'] as String,
      priority: json['priority'] as String,
      budget: parseBudget(json['budget']),
      spentAmount: json['spentAmount'] != null || json['spent_amount'] != null
          ? ((json['spentAmount'] ?? json['spent_amount']) as num).toDouble()
          : null,
      currency: json['currency'] as String? ?? 'USD',
      startDate: json['startDate'] != null || json['start_date'] != null
          ? DateTime.parse(json['startDate'] ?? json['start_date'])
          : null,
      dueDate: json['dueDate'] != null || json['due_date'] != null
          ? DateTime.parse(json['dueDate'] ?? json['due_date'])
          : null,
      completionDate: json['completionDate'] != null || json['completion_date'] != null
          ? DateTime.parse(json['completionDate'] ?? json['completion_date'])
          : null,
      progressPercentage: json['progressPercentage'] as int? ?? json['progress_percentage'] as int? ?? 0,
      clientId: json['clientId'] as String? ?? json['client_id'] as String?,
      clientOrganizationId: json['clientOrganizationId'] as String? ?? json['client_organization_id'] as String?,
      dealId: json['dealId'] as String? ?? json['deal_id'] as String?,
      projectManagerId: json['projectManagerId'] as String? ?? json['project_manager_id'] as String?,
      tags: json['tags'] != null ? List<String>.from(json['tags']) : null,
      customFields: json['customFields'] as Map<String, dynamic>? ?? json['custom_fields'] as Map<String, dynamic>?,
      isArchived: json['isArchived'] as bool? ?? json['is_archived'] as bool? ?? false,
      createdBy: json['createdBy'] as String? ?? json['created_by'] as String?,
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at']),
      profitability: json['profitability'] != null ? (json['profitability'] as num).toDouble() : null,
      profitabilityPercentage: json['profitabilityPercentage'] != null 
          ? (json['profitabilityPercentage'] as num).toDouble() 
          : null,
      isOverdue: json['isOverdue'] as bool?,
      daysRemaining: json['daysRemaining'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'myCompanyId': myCompanyId,
      'clientCompanyId': companyId,
      'name': name,
      'description': description,
      'status': status,
      'priority': priority,
      'budget': budget,
      'spentAmount': spentAmount,
      'currency': currency,
      'startDate': startDate?.toIso8601String(),
      'dueDate': dueDate?.toIso8601String(),
      'completionDate': completionDate?.toIso8601String(),
      'progressPercentage': progressPercentage,
      'clientId': clientId,
      'clientOrganizationId': clientOrganizationId,
      'dealId': dealId,
      'projectManagerId': projectManagerId,
      'tags': tags,
      'customFields': customFields,
      'isArchived': isArchived,
    };
  }

  ProjectModel copyWith({
    String? id,
    String? myCompanyId,
    String? companyId,
    String? name,
    String? description,
    String? status,
    String? priority,
    double? budget,
    double? spentAmount,
    String? currency,
    DateTime? startDate,
    DateTime? dueDate,
    DateTime? completionDate,
    int? progressPercentage,
    String? clientId,
    String? clientOrganizationId,
    String? dealId,
    String? projectManagerId,
    List<String>? tags,
    Map<String, dynamic>? customFields,
    bool? isArchived,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ProjectModel(
      id: id ?? this.id,
      myCompanyId: myCompanyId ?? this.myCompanyId,
      companyId: companyId ?? this.companyId,
      name: name ?? this.name,
      description: description ?? this.description,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      budget: budget ?? this.budget,
      spentAmount: spentAmount ?? this.spentAmount,
      currency: currency ?? this.currency,
      startDate: startDate ?? this.startDate,
      dueDate: dueDate ?? this.dueDate,
      completionDate: completionDate ?? this.completionDate,
      progressPercentage: progressPercentage ?? this.progressPercentage,
      clientId: clientId ?? this.clientId,
      clientOrganizationId: clientOrganizationId ?? this.clientOrganizationId,
      dealId: dealId ?? this.dealId,
      projectManagerId: projectManagerId ?? this.projectManagerId,
      tags: tags ?? this.tags,
      customFields: customFields ?? this.customFields,
      isArchived: isArchived ?? this.isArchived,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
