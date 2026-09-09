class AttendanceRecord {
  final String? id;
  final String? user;
  final String date;
  final String? checkIn;
  final String? checkOut;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final String status;
  final String workMode;
  final double? latitude;
  final double? longitude;
  final bool isGeofenced;
  final bool isLate;
  final double hoursWorked;
  final double totalBreakMinutes;
  final double? netHoursWorked;
  final List<Map<String, dynamic>> breaks;
  final String? note;

  AttendanceRecord({
    this.id,
    this.user,
    required this.date,
    this.checkIn,
    this.checkOut,
    this.checkInTime,
    this.checkOutTime,
    required this.status,
    this.workMode = 'Office',
    this.latitude,
    this.longitude,
    this.isGeofenced = false,
    this.isLate = false,
    this.hoursWorked = 0.0,
    this.totalBreakMinutes = 0.0,
    this.netHoursWorked,
    this.breaks = const [],
    this.note,
  });

  /// True when there is an open break session (break started, not yet ended)
  bool get hasActiveBreak {
    if (breaks.isEmpty) return false;
    final last = breaks.last;
    return last['end'] == null;
  }


  DateTime? get effectiveCheckInTime {
    if (checkInTime != null) return checkInTime;
    if (checkIn == null || checkIn!.isEmpty) return null;
    final parsed = DateTime.tryParse(checkIn!);
    if (parsed != null) return parsed;

    // Handle 12-hour format like "09:30 AM"
    try {
      final str = checkIn!.trim();
      if (str.contains('AM') || str.contains('PM')) {
        final parts = str.split(' ');
        final hm = parts[0].split(':');
        int hour = int.parse(hm[0]);
        final minute = int.parse(hm[1]);
        final ampm = parts[1].toUpperCase();
        if (ampm == 'PM' && hour != 12) hour += 12;
        if (ampm == 'AM' && hour == 12) hour = 0;
        final now = DateTime.now();
        return DateTime(now.year, now.month, now.day, hour, minute);
      }
    } catch (_) {}
    return null;
  }

  DateTime? get effectiveCheckOutTime {
    if (checkOutTime != null) return checkOutTime;
    if (checkOut == null || checkOut!.isEmpty) return null;
    final parsed = DateTime.tryParse(checkOut!);
    if (parsed != null) return parsed;

    // Handle 12-hour format like "04:29 PM"
    try {
      final str = checkOut!.trim();
      if (str.contains('AM') || str.contains('PM')) {
        final parts = str.split(' ');
        final hm = parts[0].split(':');
        int hour = int.parse(hm[0]);
        final minute = int.parse(hm[1]);
        final ampm = parts[1].toUpperCase();
        if (ampm == 'PM' && hour != 12) hour += 12;
        if (ampm == 'AM' && hour == 12) hour = 0;
        final now = DateTime.now();
        return DateTime(now.year, now.month, now.day, hour, minute);
      }
    } catch (_) {}
    return null;
  }

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    final checkInVal = json['checkIn']?.toString() ?? json['loginTime']?.toString();
    final hours = (json['hoursWorked'] as num?)?.toDouble() ?? 0.0;
    final mode = json['workMode']?.toString();
    final normalizedMode = mode == 'remote' ? 'WFH' : (mode ?? 'Office');

    DateTime? inTime;
    if (json['checkInTime'] != null) {
      inTime = DateTime.tryParse(json['checkInTime'].toString());
    }

    DateTime? outTime;
    if (json['checkOutTime'] != null) {
      outTime = DateTime.tryParse(json['checkOutTime'].toString());
    }

    // Parse breaks array
    List<Map<String, dynamic>> breaksList = [];
    if (json['breaks'] is List) {
      breaksList = (json['breaks'] as List)
          .map((b) => Map<String, dynamic>.from(b as Map))
          .toList();
    }

    return AttendanceRecord(
      id: json['_id']?.toString(),
      user: json['user'] is Map ? json['user']['_id']?.toString() : json['user']?.toString(),
      date: json['date']?.toString() ?? '',
      checkIn: checkInVal,
      checkOut: json['checkOut']?.toString(),
      checkInTime: inTime,
      checkOutTime: outTime,
      status: json['status']?.toString() ?? 'Present',
      workMode: normalizedMode,
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      isGeofenced: json['isGeofenced'] ?? false,
      isLate: json['isLate'] ?? false,
      hoursWorked: hours,
      totalBreakMinutes: (json['totalBreakMinutes'] as num?)?.toDouble() ?? 0.0,
      netHoursWorked: json['netHoursWorked'] != null
          ? (json['netHoursWorked'] as num).toDouble()
          : null,
      breaks: breaksList,
      note: json['note']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) '_id': id,
        if (user != null) 'user': user,
        'date': date,
        if (checkIn != null) 'checkIn': checkIn,
        if (checkOut != null) 'checkOut': checkOut,
        if (checkInTime != null) 'checkInTime': checkInTime!.toIso8601String(),
        if (checkOutTime != null) 'checkOutTime': checkOutTime!.toIso8601String(),
        'status': status,
        'workMode': workMode,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        'isGeofenced': isGeofenced,
        'isLate': isLate,
        'hoursWorked': hoursWorked,
        if (note != null) 'note': note,
      };
}

class AttendanceRegularizationItem {
  final String id;
  final String? userId;
  final String? userName;
  final String? userEmail;
  final String? employeeId;
  final String? department;
  final String? employmentType;
  final String date;
  final String requestType;
  final String requestedCheckIn;
  final String requestedCheckOut;
  final String workMode;
  final String reason;
  final String status;
  final String? reviewedByName;
  final String? reviewNote;
  final DateTime? reviewedAt;
  final DateTime? createdAt;

  AttendanceRegularizationItem({
    required this.id,
    this.userId,
    this.userName,
    this.userEmail,
    this.employeeId,
    this.department,
    this.employmentType,
    required this.date,
    required this.requestType,
    required this.requestedCheckIn,
    required this.requestedCheckOut,
    required this.workMode,
    required this.reason,
    required this.status,
    this.reviewedByName,
    this.reviewNote,
    this.reviewedAt,
    this.createdAt,
  });

  factory AttendanceRegularizationItem.fromJson(Map<String, dynamic> json) {
    String? uId;
    String? uName;
    String? uEmail;
    String? uEmpId;
    String? uDept;
    String? uType;

    if (json['user'] is Map) {
      final u = json['user'] as Map<String, dynamic>;
      uId = u['_id']?.toString();
      uName = u['name']?.toString();
      uEmail = u['email']?.toString();
      uEmpId = u['employeeId']?.toString();
      uDept = u['department']?.toString();
      uType = u['employmentType']?.toString();
    } else {
      uId = json['user']?.toString();
    }

    String? revName;
    if (json['reviewedBy'] is Map) {
      revName = json['reviewedBy']['name']?.toString();
    }

    return AttendanceRegularizationItem(
      id: json['_id']?.toString() ?? '',
      userId: uId,
      userName: uName,
      userEmail: uEmail,
      employeeId: uEmpId,
      department: uDept,
      employmentType: uType,
      date: json['date']?.toString() ?? '',
      requestType: json['requestType']?.toString() ?? 'Both',
      requestedCheckIn: json['requestedCheckIn']?.toString() ?? '',
      requestedCheckOut: json['requestedCheckOut']?.toString() ?? '',
      workMode: json['workMode']?.toString() ?? 'Office',
      reason: json['reason']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Pending',
      reviewedByName: revName,
      reviewNote: json['reviewNote']?.toString(),
      reviewedAt: json['reviewedAt'] != null ? DateTime.tryParse(json['reviewedAt'].toString()) : null,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
    );
  }
}

class TodayRosterItem {
  final String userId;
  final String name;
  final String email;
  final String employeeId;
  final String designation;
  final String department;
  final String employmentType;
  final String status;
  final String? checkIn;
  final String? checkOut;
  final double hoursWorked;
  final String workMode;
  final bool isLate;
  final String note;
  final String? attendanceId;

  TodayRosterItem({
    required this.userId,
    required this.name,
    required this.email,
    required this.employeeId,
    required this.designation,
    required this.department,
    required this.employmentType,
    required this.status,
    this.checkIn,
    this.checkOut,
    required this.hoursWorked,
    required this.workMode,
    required this.isLate,
    required this.note,
    this.attendanceId,
  });

  factory TodayRosterItem.fromJson(Map<String, dynamic> json) {
    final u = json['user'] as Map<String, dynamic>? ?? {};
    return TodayRosterItem(
      userId: u['_id']?.toString() ?? '',
      name: u['name']?.toString() ?? 'Staff Member',
      email: u['email']?.toString() ?? '',
      employeeId: u['employeeId']?.toString() ?? '',
      designation: u['designation']?.toString() ?? '',
      department: u['department']?.toString() ?? 'General',
      employmentType: u['employmentType']?.toString() ?? 'Full-time',
      status: json['status']?.toString() ?? 'Absent',
      checkIn: json['checkIn']?.toString(),
      checkOut: json['checkOut']?.toString(),
      hoursWorked: (json['hoursWorked'] as num?)?.toDouble() ?? 0.0,
      workMode: json['workMode']?.toString() ?? 'Office',
      isLate: json['isLate'] ?? false,
      note: json['note']?.toString() ?? '',
      attendanceId: json['attendanceId']?.toString(),
    );
  }
}

class TodayRosterSummary {
  final int totalStaff;
  final int presentCount;
  final int lateCount;
  final int absentCount;
  final int leaveCount;
  final int wfhCount;
  final int internsCount;
  final int employeesCount;
  final int attendanceRate;

  TodayRosterSummary({
    required this.totalStaff,
    required this.presentCount,
    required this.lateCount,
    required this.absentCount,
    required this.leaveCount,
    required this.wfhCount,
    required this.internsCount,
    required this.employeesCount,
    required this.attendanceRate,
  });

  factory TodayRosterSummary.fromJson(Map<String, dynamic> json) {
    return TodayRosterSummary(
      totalStaff: (json['totalStaff'] as num?)?.toInt() ?? 0,
      presentCount: (json['presentCount'] as num?)?.toInt() ?? 0,
      lateCount: (json['lateCount'] as num?)?.toInt() ?? 0,
      absentCount: (json['absentCount'] as num?)?.toInt() ?? 0,
      leaveCount: (json['leaveCount'] as num?)?.toInt() ?? 0,
      wfhCount: (json['wfhCount'] as num?)?.toInt() ?? 0,
      internsCount: (json['internsCount'] as num?)?.toInt() ?? 0,
      employeesCount: (json['employeesCount'] as num?)?.toInt() ?? 0,
      attendanceRate: (json['attendanceRate'] as num?)?.toInt() ?? 0,
    );
  }
}
