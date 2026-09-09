class LeaveCategory {
  final int total;
  final int used;
  final int remaining;

  LeaveCategory({required this.total, required this.used, required this.remaining});

  factory LeaveCategory.fromJson(Map<String, dynamic>? json) {
    if (json == null) return LeaveCategory(total: 0, used: 0, remaining: 0);
    final t = (json['total'] as num?)?.toInt() ?? 0;
    final u = (json['used'] as num?)?.toInt() ?? 0;
    final r = (json['remaining'] as num?)?.toInt() ?? (t - u);
    return LeaveCategory(
      total: t,
      used: u,
      remaining: r >= 0 ? r : 0,
    );
  }
}

class LeaveBalance {
  final LeaveCategory casualLeave;
  final LeaveCategory sickLeave;
  final LeaveCategory earnedLeave;
  final LeaveCategory emergencyLeave;
  final LeaveCategory compensatoryLeave;

  LeaveBalance({
    required this.casualLeave,
    required this.sickLeave,
    required this.earnedLeave,
    LeaveCategory? emergencyLeave,
    LeaveCategory? compensatoryLeave,
  })  : emergencyLeave = emergencyLeave ?? LeaveCategory(total: 2, used: 0, remaining: 2),
        compensatoryLeave = compensatoryLeave ?? LeaveCategory(total: 0, used: 0, remaining: 0);

  int get totalEntitled => casualLeave.total + sickLeave.total + earnedLeave.total;
  int get totalUsed => casualLeave.used + sickLeave.used + earnedLeave.used;
  int get totalRemaining => casualLeave.remaining + sickLeave.remaining + earnedLeave.remaining;

  factory LeaveBalance.fromJson(Map<String, dynamic> json) {
    return LeaveBalance(
      casualLeave: LeaveCategory.fromJson(
        (json['casual'] ?? json['casualLeave']) as Map<String, dynamic>?,
      ),
      sickLeave: LeaveCategory.fromJson(
        (json['sick'] ?? json['sickLeave']) as Map<String, dynamic>?,
      ),
      earnedLeave: LeaveCategory.fromJson(
        (json['annual'] ?? json['earned'] ?? json['earnedLeave']) as Map<String, dynamic>?,
      ),
      emergencyLeave: LeaveCategory.fromJson(
        (json['emergency'] ?? json['emergencyLeave']) as Map<String, dynamic>?,
      ),
      compensatoryLeave: LeaveCategory.fromJson(
        (json['compensatory'] ?? json['compensatoryLeave']) as Map<String, dynamic>?,
      ),
    );
  }
}

class StaffLeaveQuotaItem {
  final String userId;
  final String name;
  final String email;
  final String employeeId;
  final String department;
  final String role;
  final String employmentType;
  final String? avatar;
  final LeaveBalance leaveBalance;

  StaffLeaveQuotaItem({
    required this.userId,
    required this.name,
    required this.email,
    required this.employeeId,
    required this.department,
    required this.role,
    required this.employmentType,
    this.avatar,
    required this.leaveBalance,
  });

  factory StaffLeaveQuotaItem.fromJson(Map<String, dynamic> json) {
    final userMap = (json['user'] is Map) ? json['user'] as Map<String, dynamic> : <String, dynamic>{};
    final balMap = (json['leaveBalance'] is Map) ? json['leaveBalance'] as Map<String, dynamic> : <String, dynamic>{};

    String deptName = 'General';
    if (userMap['department'] is Map) {
      deptName = userMap['department']['name']?.toString() ?? 'General';
    } else if (userMap['department'] != null) {
      deptName = userMap['department'].toString();
    }

    String roleName = 'Employee';
    if (userMap['role'] is Map) {
      roleName = userMap['role']['name']?.toString() ?? 'Employee';
    } else if (userMap['role'] != null) {
      roleName = userMap['role'].toString();
    }

    return StaffLeaveQuotaItem(
      userId: userMap['_id']?.toString() ?? userMap['id']?.toString() ?? '',
      name: userMap['name']?.toString() ?? 'Staff Member',
      email: userMap['email']?.toString() ?? '',
      employeeId: userMap['employeeId']?.toString() ?? 'EMP',
      department: deptName,
      role: roleName,
      employmentType: userMap['employmentType']?.toString() ?? 'Full-time',
      avatar: userMap['avatar']?.toString(),
      leaveBalance: LeaveBalance.fromJson(balMap),
    );
  }
}

class LeaveRequestItem {
  final String id;
  final String leaveType;
  final String startDate;
  final String endDate;
  final int days;
  final String reason;
  final String status;
  final String? applicantName;
  final String? department;
  final String? employeeId;
  final String? reviewNote;
  final String? projectImpact;
  final String? createdAt;

  LeaveRequestItem({
    required this.id,
    required this.leaveType,
    required this.startDate,
    required this.endDate,
    required this.days,
    required this.reason,
    required this.status,
    this.applicantName,
    this.department,
    this.employeeId,
    this.reviewNote,
    this.projectImpact,
    this.createdAt,
  });

  factory LeaveRequestItem.fromJson(Map<String, dynamic> json) {
    String? applicant;
    String? dept;
    String? empId;
    if (json['user'] is Map) {
      applicant = json['user']['name']?.toString();
      dept = json['user']['department']?.toString();
      empId = json['user']['employeeId']?.toString();
    }

    return LeaveRequestItem(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      leaveType: json['type']?.toString() ?? json['leaveType']?.toString() ?? 'Casual',
      startDate: json['fromDate']?.toString() ?? json['startDate']?.toString() ?? '',
      endDate: json['toDate']?.toString() ?? json['endDate']?.toString() ?? '',
      days: (json['days'] as num?)?.toInt() ?? 1,
      reason: json['reason']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Pending',
      applicantName: applicant,
      department: dept,
      employeeId: empId,
      reviewNote: json['reviewNote']?.toString(),
      projectImpact: json['projectImpact']?.toString(),
      createdAt: json['createdAt']?.toString(),
    );
  }
}
