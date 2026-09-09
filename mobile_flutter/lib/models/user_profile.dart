class UserRole {
  final String id;
  final String name;
  final String slug;

  UserRole({
    required this.id,
    required this.name,
    required this.slug,
  });

  factory UserRole.fromJson(dynamic json) {
    if (json is String) {
      return UserRole(id: '', name: json, slug: json.toLowerCase().replaceAll(' ', '-'));
    }
    if (json is Map) {
      return UserRole(
        id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? 'User',
        slug: json['slug']?.toString() ?? (json['name']?.toString().toLowerCase().replaceAll(' ', '-') ?? 'employee'),
      );
    }
    return UserRole(id: '', name: 'User', slug: 'employee');
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'name': name,
        'slug': slug,
      };
}

class UserProjectInfo {
  final String id;
  final String name;
  final String? code;
  final String status;
  final String? description;
  final String? role;

  UserProjectInfo({
    required this.id,
    required this.name,
    this.code,
    this.status = 'Active',
    this.description,
    this.role,
  });

  factory UserProjectInfo.fromJson(dynamic json) {
    if (json is Map) {
      return UserProjectInfo(
        id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? 'Workspace Initiative',
        code: json['code']?.toString() ?? 'PRJ-2026',
        status: json['status']?.toString() ?? 'Active',
        description: json['description']?.toString(),
        role: json['role']?.toString(),
      );
    }
    if (json is String && json.isNotEmpty) {
      return UserProjectInfo(id: json, name: 'Project Assignment');
    }
    return UserProjectInfo(id: '', name: 'Project Assignment');
  }
}

class CareerHistoryItem {
  final String changeType; // 'Promotion', 'Transfer', 'Status Change'
  final String? oldDesignation;
  final String? newDesignation;
  final String? oldDepartmentName;
  final String? newDepartmentName;
  final String? oldStatus;
  final String? newStatus;
  final DateTime effectiveDate;
  final String? reason;
  final DateTime? createdAt;

  CareerHistoryItem({
    required this.changeType,
    this.oldDesignation,
    this.newDesignation,
    this.oldDepartmentName,
    this.newDepartmentName,
    this.oldStatus,
    this.newStatus,
    required this.effectiveDate,
    this.reason,
    this.createdAt,
  });

  factory CareerHistoryItem.fromJson(Map<dynamic, dynamic> json) {
    return CareerHistoryItem(
      changeType: json['changeType']?.toString() ?? 'Promotion',
      oldDesignation: json['oldDesignation']?.toString(),
      newDesignation: json['newDesignation']?.toString(),
      oldDepartmentName: json['oldDepartmentName']?.toString(),
      newDepartmentName: json['newDepartmentName']?.toString(),
      oldStatus: json['oldStatus']?.toString(),
      newStatus: json['newStatus']?.toString(),
      effectiveDate: json['effectiveDate'] != null
          ? DateTime.tryParse(json['effectiveDate'].toString()) ?? DateTime.now()
          : DateTime.now(),
      reason: json['reason']?.toString(),
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
    );
  }
}

class UserProfile {
  final String id;
  final String name;
  final String email;
  final String? employeeId;
  final UserRole role;
  final String? department;
  final String? designation;
  final String? avatar;
  final String? phone;
  final String? employmentType;
  final String status;
  final bool isActive;
  final UserProjectInfo? project;
  final List<CareerHistoryItem> careerHistory;

  UserProfile({
    required this.id,
    required this.name,
    required this.email,
    this.employeeId,
    required this.role,
    this.department,
    this.designation,
    this.avatar,
    this.phone,
    this.employmentType,
    this.status = 'Active',
    this.isActive = true,
    this.project,
    this.careerHistory = const [],
  });

  factory UserProfile.fromJson(Map<dynamic, dynamic> json) {
    String? deptStr;
    if (json['department'] is Map) {
      deptStr = json['department']['name']?.toString();
    } else if (json['department'] is String) {
      deptStr = json['department'];
    }

    UserProjectInfo? proj;
    if (json['project'] != null && json['project'] != false) {
      proj = UserProjectInfo.fromJson(json['project']);
    }

    final rawStatus = json['status']?.toString() ?? (json['isActive'] == false ? 'Inactive' : 'Active');
    final active = rawStatus.toLowerCase() == 'active' || json['isActive'] == true;

    final historyList = <CareerHistoryItem>[];
    if (json['careerHistory'] is List) {
      for (final h in json['careerHistory']) {
        if (h is Map) historyList.add(CareerHistoryItem.fromJson(h));
      }
    }

    return UserProfile(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      employeeId: json['employeeId']?.toString(),
      role: UserRole.fromJson(json['role']),
      department: deptStr,
      designation: json['designation']?.toString(),
      avatar: json['avatar']?.toString(),
      phone: json['phone']?.toString(),
      employmentType: json['employmentType']?.toString() ?? 'Full-time',
      status: rawStatus,
      isActive: active,
      project: proj,
      careerHistory: historyList,
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'name': name,
        'email': email,
        'employeeId': employeeId,
        'role': role.toJson(),
        'department': department,
        'designation': designation,
        'avatar': avatar,
        'phone': phone,
        'employmentType': employmentType,
        'status': status,
        'isActive': isActive,
      };
}
