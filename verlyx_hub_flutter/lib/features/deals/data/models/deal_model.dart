class DealModel {
  final String id;
  final String myCompanyId;
  final String clientId;
  final String? organizationId;
  final String title;
  final String? description;
  final String stage;
  final String priority;
  final double? amount;
  final String currency;
  final int probability;
  final double? expectedRevenue;
  final DateTime? expectedCloseDate;
  final DateTime? actualCloseDate;
  final DateTime? lostDate;
  final String? lostReason;
  final String? wonReason;
  final String? ownerUserId;
  final List<String>? assignedUsers;
  final String? source;
  final String? sourceDetails;
  final String? primaryContactId;
  final List<String>? tags;
  final Map<String, dynamic>? customFields;
  final DateTime stageChangedAt;
  final int daysInStage;
  final String? nextAction;
  final DateTime? nextActionDate;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? createdBy;

  DealModel({
    required this.id,
    required this.myCompanyId,
    required this.clientId,
    this.organizationId,
    required this.title,
    this.description,
    required this.stage,
    required this.priority,
    this.amount,
    required this.currency,
    required this.probability,
    this.expectedRevenue,
    this.expectedCloseDate,
    this.actualCloseDate,
    this.lostDate,
    this.lostReason,
    this.wonReason,
    this.ownerUserId,
    this.assignedUsers,
    this.source,
    this.sourceDetails,
    this.primaryContactId,
    this.tags,
    this.customFields,
    required this.stageChangedAt,
    required this.daysInStage,
    this.nextAction,
    this.nextActionDate,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
    this.createdBy,
  });

  factory DealModel.fromJson(Map<String, dynamic> json) {
    return DealModel(
      id: json['id'],
      myCompanyId: json['myCompanyId'],
      clientId: json['clientId'],
      organizationId: json['organizationId'],
      title: json['title'],
      description: json['description'],
      stage: json['stage'],
      priority: json['priority'],
      amount: json['amount']?.toDouble(),
      currency: json['currency'] ?? 'ARS',
      probability: json['probability'] ?? 50,
      expectedRevenue: json['expectedRevenue']?.toDouble(),
      expectedCloseDate: json['expectedCloseDate'] != null
          ? DateTime.parse(json['expectedCloseDate'])
          : null,
      actualCloseDate: json['actualCloseDate'] != null
          ? DateTime.parse(json['actualCloseDate'])
          : null,
      lostDate: json['lostDate'] != null
          ? DateTime.parse(json['lostDate'])
          : null,
      lostReason: json['lostReason'],
      wonReason: json['wonReason'],
      ownerUserId: json['ownerUserId'],
      assignedUsers: json['assignedUsers'] != null
          ? List<String>.from(json['assignedUsers'])
          : null,
      source: json['source'],
      sourceDetails: json['sourceDetails'],
      primaryContactId: json['primaryContactId'],
      tags: json['tags'] != null ? List<String>.from(json['tags']) : null,
      customFields: json['customFields'],
      stageChangedAt: DateTime.parse(json['stageChangedAt']),
      daysInStage: json['daysInStage'] ?? 0,
      nextAction: json['nextAction'],
      nextActionDate: json['nextActionDate'] != null
          ? DateTime.parse(json['nextActionDate'])
          : null,
      isActive: json['isActive'] ?? true,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      createdBy: json['createdBy'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'myCompanyId': myCompanyId,
      'clientId': clientId,
      'organizationId': organizationId,
      'title': title,
      'description': description,
      'stage': stage,
      'priority': priority,
      'amount': amount,
      'currency': currency,
      'probability': probability,
      'expectedRevenue': expectedRevenue,
      'expectedCloseDate': expectedCloseDate?.toIso8601String(),
      'actualCloseDate': actualCloseDate?.toIso8601String(),
      'lostDate': lostDate?.toIso8601String(),
      'lostReason': lostReason,
      'wonReason': wonReason,
      'ownerUserId': ownerUserId,
      'assignedUsers': assignedUsers,
      'source': source,
      'sourceDetails': sourceDetails,
      'primaryContactId': primaryContactId,
      'tags': tags,
      'customFields': customFields,
      'stageChangedAt': stageChangedAt.toIso8601String(),
      'daysInStage': daysInStage,
      'nextAction': nextAction,
      'nextActionDate': nextActionDate?.toIso8601String(),
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'createdBy': createdBy,
    };
  }

  DealModel copyWith({
    String? title,
    String? description,
    String? stage,
    String? priority,
    double? amount,
    int? probability,
    DateTime? expectedCloseDate,
    String? nextAction,
    DateTime? nextActionDate,
    bool? isActive,
  }) {
    return DealModel(
      id: id,
      myCompanyId: myCompanyId,
      clientId: clientId,
      organizationId: organizationId,
      title: title ?? this.title,
      description: description ?? this.description,
      stage: stage ?? this.stage,
      priority: priority ?? this.priority,
      amount: amount ?? this.amount,
      currency: currency,
      probability: probability ?? this.probability,
      expectedRevenue: expectedRevenue,
      expectedCloseDate: expectedCloseDate ?? this.expectedCloseDate,
      actualCloseDate: actualCloseDate,
      lostDate: lostDate,
      lostReason: lostReason,
      wonReason: wonReason,
      ownerUserId: ownerUserId,
      assignedUsers: assignedUsers,
      source: source,
      sourceDetails: sourceDetails,
      primaryContactId: primaryContactId,
      tags: tags,
      customFields: customFields,
      stageChangedAt: stageChangedAt,
      daysInStage: daysInStage,
      nextAction: nextAction ?? this.nextAction,
      nextActionDate: nextActionDate ?? this.nextActionDate,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt,
      updatedAt: updatedAt,
      createdBy: createdBy,
    );
  }
}

class PipelineStats {
  final String stage;
  final int count;
  final double totalAmount;
  final double avgAmount;
  final double totalWeighted;

  PipelineStats({
    required this.stage,
    required this.count,
    required this.totalAmount,
    required this.avgAmount,
    required this.totalWeighted,
  });

  factory PipelineStats.fromJson(Map<String, dynamic> json) {
    return PipelineStats(
      stage: json['stage'],
      count: json['count'],
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      avgAmount: (json['avgAmount'] ?? 0).toDouble(),
      totalWeighted: (json['totalWeighted'] ?? 0).toDouble(),
    );
  }
}
