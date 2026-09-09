class InternPerformanceRating {
  final int week;
  final int rating;
  final String note;
  final String source;
  final String? addedBy;
  final DateTime? createdAt;

  InternPerformanceRating({
    required this.week,
    required this.rating,
    required this.note,
    this.source = 'hr',
    this.addedBy,
    this.createdAt,
  });

  factory InternPerformanceRating.fromJson(Map<String, dynamic> json) {
    return InternPerformanceRating(
      week: (json['week'] as num?)?.toInt() ?? 1,
      rating: (json['rating'] as num?)?.toInt() ?? 5,
      note: json['note']?.toString() ?? '',
      source: json['source']?.toString() ?? 'hr',
      addedBy: json['addedBy']?.toString(),
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'week': week,
        'rating': rating,
        'note': note,
        'source': source,
        if (addedBy != null) 'addedBy': addedBy,
      };
}

class InternLearningResource {
  final String id;
  final String title;
  final String type; // 'Video', 'Document', 'Link', 'Course'
  final String url;
  final String description;
  final String? assignedTo;
  final String? assignedByName;
  final String? projectName;
  final DateTime? dueDate;
  final int estimatedMinutes;
  final String status; // 'Pending', 'In Progress', 'Completed'
  final DateTime? completedAt;

  InternLearningResource({
    required this.id,
    required this.title,
    required this.type,
    this.url = '',
    this.description = '',
    this.assignedTo,
    this.assignedByName,
    this.projectName,
    this.dueDate,
    this.estimatedMinutes = 0,
    this.status = 'Pending',
    this.completedAt,
  });

  factory InternLearningResource.fromJson(Map<String, dynamic> json) {
    String? byName;
    if (json['assignedBy'] is Map) {
      byName = json['assignedBy']['name']?.toString();
    }
    String? projName;
    if (json['project'] is Map) {
      projName = json['project']['name']?.toString();
    }

    return InternLearningResource(
      id: json['_id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Resource',
      type: json['type']?.toString() ?? 'Document',
      url: json['url']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      assignedTo: json['assignedTo']?.toString(),
      assignedByName: byName,
      projectName: projName,
      dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate'].toString()) : null,
      estimatedMinutes: (json['estimatedMinutes'] as num?)?.toInt() ?? 0,
      status: json['status']?.toString() ?? 'Pending',
      completedAt: json['completedAt'] != null ? DateTime.tryParse(json['completedAt'].toString()) : null,
    );
  }
}

class EligibleMentorItem {
  final String id;
  final String name;
  final String email;
  final String employeeId;
  final String designation;
  final String department;

  EligibleMentorItem({
    required this.id,
    required this.name,
    required this.email,
    required this.employeeId,
    required this.designation,
    required this.department,
  });

  factory EligibleMentorItem.fromJson(Map<String, dynamic> json) {
    String deptName = 'General';
    if (json['department'] is Map) {
      deptName = json['department']['name']?.toString() ?? 'General';
    } else if (json['department'] != null) {
      deptName = json['department'].toString();
    }

    return EligibleMentorItem(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Senior Engineer',
      email: json['email']?.toString() ?? '',
      employeeId: json['employeeId']?.toString() ?? '',
      designation: json['designation']?.toString() ?? 'Staff Member',
      department: deptName,
    );
  }
}

class InternItem {
  final String id;
  final String name;
  final String email;
  final String employeeId;
  final String phone;
  final String college;
  final String domain;
  final String batch;
  final String status;
  final String? mentorId;
  final String? mentorName;
  final String? departmentName;
  final String? projectName;
  final DateTime? internshipStart;
  final DateTime? internshipEnd;
  final List<InternPerformanceRating> performanceRatings;
  final int tasksTotal;
  final int tasksDone;
  final int attendancePresent;
  final int attendanceTotal;
  final double averageRating;

  InternItem({
    required this.id,
    required this.name,
    required this.email,
    required this.employeeId,
    required this.phone,
    required this.college,
    required this.domain,
    required this.batch,
    required this.status,
    this.mentorId,
    this.mentorName,
    this.departmentName,
    this.projectName,
    this.internshipStart,
    this.internshipEnd,
    required this.performanceRatings,
    this.tasksTotal = 0,
    this.tasksDone = 0,
    this.attendancePresent = 0,
    this.attendanceTotal = 0,
    this.averageRating = 5.0,
  });

  factory InternItem.fromJson(Map<String, dynamic> json) {
    String? mId;
    String? mName;
    if (json['mentor'] is Map) {
      mId = json['mentor']['_id']?.toString();
      mName = json['mentor']['name']?.toString();
    } else if (json['mentor'] != null) {
      mId = json['mentor'].toString();
    }

    String? dept;
    if (json['department'] is Map) {
      dept = json['department']['name']?.toString();
    } else if (json['department'] != null) {
      dept = json['department'].toString();
    }

    String? proj;
    if (json['project'] is Map) {
      proj = json['project']['name']?.toString();
    } else if (json['project'] != null) {
      proj = json['project'].toString();
    }

    final ratingsList = (json['performanceRatings'] as List?) ?? [];
    final ratings = ratingsList
        .map((r) => InternPerformanceRating.fromJson(r as Map<String, dynamic>))
        .toList();

    double avg = 5.0;
    if (ratings.isNotEmpty) {
      final total = ratings.fold<int>(0, (sum, r) => sum + r.rating);
      avg = double.tryParse((total / ratings.length).toStringAsFixed(1)) ?? 5.0;
    }

    int tTotal = 0, tDone = 0;
    if (json['taskStats'] is Map) {
      tTotal = (json['taskStats']['total'] as num?)?.toInt() ?? 0;
      tDone = (json['taskStats']['done'] as num?)?.toInt() ?? 0;
    }

    int aPresent = 0, aTotal = 0;
    if (json['attendanceStats'] is Map) {
      aPresent = (json['attendanceStats']['present'] as num?)?.toInt() ?? 0;
      aTotal = (json['attendanceStats']['total'] as num?)?.toInt() ?? 0;
    }

    return InternItem(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Intern Student',
      email: json['email']?.toString() ?? '',
      employeeId: json['employeeId']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      college: json['college']?.toString() ?? 'University',
      domain: json['domain']?.toString() ?? 'Engineering',
      batch: json['batch']?.toString() ?? 'Summer 2026',
      status: json['status']?.toString() ?? 'Active',
      mentorId: mId,
      mentorName: mName,
      departmentName: dept,
      projectName: proj,
      internshipStart: json['internshipStart'] != null ? DateTime.tryParse(json['internshipStart'].toString()) : null,
      internshipEnd: json['internshipEnd'] != null ? DateTime.tryParse(json['internshipEnd'].toString()) : null,
      performanceRatings: ratings,
      tasksTotal: tTotal,
      tasksDone: tDone,
      attendancePresent: aPresent,
      attendanceTotal: aTotal,
      averageRating: avg,
    );
  }
}
