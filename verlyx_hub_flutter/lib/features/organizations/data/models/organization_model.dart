class OrganizationModel {
  final String id;
  final String myCompanyId;
  final String clientId;
  final String? parentOrganizationId;
  final String name;
  final String? code;
  final String type;
  
  // Location
  final String? address;
  final String? city;
  final String? state;
  final String? country;
  final String? postalCode;
  final double? latitude;
  final double? longitude;
  
  // Contact
  final String? phone;
  final String? email;
  final String? website;
  
  // Details
  final int? employeesCount;
  final int? size;
  final String? businessHours;
  final String? timezone;
  
  // Primary contact
  final String? primaryContactName;
  final String? primaryContactEmail;
  final String? primaryContactPhone;
  
  // Metadata
  final List<String>? tags;
  final Map<String, dynamic>? customFields;
  final String? notes;
  final bool isActive;
  
  // Timestamps
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? createdBy;
  
  // Hierarchy (optional, populated when fetching hierarchy)
  final int? level;
  final List<String>? path;
  final List<OrganizationModel>? children;

  OrganizationModel({
    required this.id,
    required this.myCompanyId,
    required this.clientId,
    this.parentOrganizationId,
    required this.name,
    this.code,
    required this.type,
    this.address,
    this.city,
    this.state,
    this.country,
    this.postalCode,
    this.latitude,
    this.longitude,
    this.phone,
    this.email,
    this.website,
    this.employeesCount,
    this.size,
    this.businessHours,
    this.timezone,
    this.primaryContactName,
    this.primaryContactEmail,
    this.primaryContactPhone,
    this.tags,
    this.customFields,
    this.notes,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
    this.createdBy,
    this.level,
    this.path,
    this.children,
  });

  factory OrganizationModel.fromJson(Map<String, dynamic> json) {
    return OrganizationModel(
      id: json['id'],
      myCompanyId: json['myCompanyId'],
      clientId: json['clientId'],
      parentOrganizationId: json['parentOrganizationId'],
      name: json['name'],
      code: json['code'],
      type: json['type'],
      address: json['address'],
      city: json['city'],
      state: json['state'],
      country: json['country'],
      postalCode: json['postalCode'],
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      phone: json['phone'],
      email: json['email'],
      website: json['website'],
      employeesCount: json['employeesCount'],
      size: json['size'],
      businessHours: json['businessHours'],
      timezone: json['timezone'],
      primaryContactName: json['primaryContactName'],
      primaryContactEmail: json['primaryContactEmail'],
      primaryContactPhone: json['primaryContactPhone'],
      tags: json['tags'] != null ? List<String>.from(json['tags']) : null,
      customFields: json['customFields'],
      notes: json['notes'],
      isActive: json['isActive'] ?? true,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      createdBy: json['createdBy'],
      level: json['level'],
      path: json['path'] != null ? List<String>.from(json['path']) : null,
      children: json['children'] != null
          ? (json['children'] as List)
              .map((child) => OrganizationModel.fromJson(child))
              .toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'myCompanyId': myCompanyId,
      'clientId': clientId,
      'parentOrganizationId': parentOrganizationId,
      'name': name,
      'code': code,
      'type': type,
      'address': address,
      'city': city,
      'state': state,
      'country': country,
      'postalCode': postalCode,
      'latitude': latitude,
      'longitude': longitude,
      'phone': phone,
      'email': email,
      'website': website,
      'employeesCount': employeesCount,
      'size': size,
      'businessHours': businessHours,
      'timezone': timezone,
      'primaryContactName': primaryContactName,
      'primaryContactEmail': primaryContactEmail,
      'primaryContactPhone': primaryContactPhone,
      'tags': tags,
      'customFields': customFields,
      'notes': notes,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'createdBy': createdBy,
    };
  }

  OrganizationModel copyWith({
    String? id,
    String? myCompanyId,
    String? clientId,
    String? parentOrganizationId,
    String? name,
    String? code,
    String? type,
    String? address,
    String? city,
    String? state,
    String? country,
    String? postalCode,
    double? latitude,
    double? longitude,
    String? phone,
    String? email,
    String? website,
    int? employeesCount,
    int? size,
    String? businessHours,
    String? timezone,
    String? primaryContactName,
    String? primaryContactEmail,
    String? primaryContactPhone,
    List<String>? tags,
    Map<String, dynamic>? customFields,
    String? notes,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? createdBy,
  }) {
    return OrganizationModel(
      id: id ?? this.id,
      myCompanyId: myCompanyId ?? this.myCompanyId,
      clientId: clientId ?? this.clientId,
      parentOrganizationId: parentOrganizationId ?? this.parentOrganizationId,
      name: name ?? this.name,
      code: code ?? this.code,
      type: type ?? this.type,
      address: address ?? this.address,
      city: city ?? this.city,
      state: state ?? this.state,
      country: country ?? this.country,
      postalCode: postalCode ?? this.postalCode,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      website: website ?? this.website,
      employeesCount: employeesCount ?? this.employeesCount,
      size: size ?? this.size,
      businessHours: businessHours ?? this.businessHours,
      timezone: timezone ?? this.timezone,
      primaryContactName: primaryContactName ?? this.primaryContactName,
      primaryContactEmail: primaryContactEmail ?? this.primaryContactEmail,
      primaryContactPhone: primaryContactPhone ?? this.primaryContactPhone,
      tags: tags ?? this.tags,
      customFields: customFields ?? this.customFields,
      notes: notes ?? this.notes,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      createdBy: createdBy ?? this.createdBy,
    );
  }
}
