// ─── SubTask ───────────────────────────────────────────────────────────────────
class SubTask {
  final String? id;
  final String title;
  final bool completed;

  SubTask({this.id, required this.title, this.completed = false});

  factory SubTask.fromJson(Map<String, dynamic> json) {
    return SubTask(
      id: json['_id']?.toString() ?? json['id']?.toString(),
      title: json['title']?.toString() ?? '',
      completed: json['completed'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) '_id': id,
        'title': title,
        'completed': completed,
      };

  SubTask copyWith({bool? completed}) {
    return SubTask(id: id, title: title, completed: completed ?? this.completed);
  }
}

// ─── SubTaskTestResult ─────────────────────────────────────────────────────────
class SubTaskTestResult {
  final String subtaskId;
  final String subtaskTitle;
  final String result; // 'Pending' | 'Pass' | 'Fail'
  final String notes;
  final String? testedByName;
  final DateTime? testedAt;

  SubTaskTestResult({
    required this.subtaskId,
    required this.subtaskTitle,
    required this.result,
    this.notes = '',
    this.testedByName,
    this.testedAt,
  });

  factory SubTaskTestResult.fromJson(Map<String, dynamic> json) {
    String? testerName;
    if (json['testedBy'] is Map) {
      testerName = json['testedBy']['name']?.toString();
    }
    return SubTaskTestResult(
      subtaskId: json['subtaskId']?.toString() ?? '',
      subtaskTitle: json['subtaskTitle']?.toString() ?? '',
      result: json['result']?.toString() ?? 'Pending',
      notes: json['notes']?.toString() ?? '',
      testedByName: testerName,
      testedAt: json['testedAt'] != null ? DateTime.tryParse(json['testedAt'].toString()) : null,
    );
  }
}

// ─── TestingStatus ─────────────────────────────────────────────────────────────
class TestingStatus {
  final String overallResult; // 'Pending' | 'Passed' | 'Failed' | 'Partial'
  final List<SubTaskTestResult> results;
  final DateTime? completedAt;

  TestingStatus({
    required this.overallResult,
    required this.results,
    this.completedAt,
  });

  factory TestingStatus.fromJson(Map<String, dynamic> json) {
    List<SubTaskTestResult> results = [];
    if (json['results'] is List) {
      results = (json['results'] as List)
          .map((r) => SubTaskTestResult.fromJson(r as Map<String, dynamic>))
          .toList();
    }
    return TestingStatus(
      overallResult: json['overallResult']?.toString() ?? 'Pending',
      results: results,
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'].toString())
          : null,
    );
  }
}

// ─── ProjectMiniInfo ───────────────────────────────────────────────────────────
class ProjectMiniInfo {
  final String id;
  final String name;
  final String? code;
  final String status;
  final bool isLeader;
  final String memberRole;
  final String? managerName;
  final int teamSize;

  ProjectMiniInfo({
    required this.id,
    required this.name,
    this.code,
    this.status = 'Active',
    this.isLeader = false,
    this.memberRole = 'Team Member',
    this.managerName,
    this.teamSize = 0,
  });

  factory ProjectMiniInfo.fromJson(Map<String, dynamic> json) {
    return ProjectMiniInfo(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString(),
      status: json['status']?.toString() ?? 'Active',
      isLeader: json['isLeader'] == true,
      memberRole: json['memberRole']?.toString() ?? 'Team Member',
      managerName: json['managerName']?.toString(),
      teamSize: json['teamSize'] is int ? json['teamSize'] : 0,
    );
  }
}

// ─── TaskItem ──────────────────────────────────────────────────────────────────
class TaskItem {
  final String id;
  final String title;
  final String? description;
  final String status;
  final String priority;
  final String? projectId;
  final String? projectName;
  final String? projectKey;
  final String? taskCode;
  final String? assignedToId;
  final String? assignedToName;
  final String? assignedToAvatar;
  final String? assignedById;
  final String? assignedByName;
  final String? assignedTesterId;
  final String? assignedTesterName;
  final String? assignedTesterAvatar;
  final String? dueDate;
  final DateTime? sentToTestingAt;
  final String? qaRejectionNotes;
  final DateTime? qaRejectedAt;
  final List<SubTask> subtasks;
  final int commentsCount;
  final String taskType; // 'project' | 'personal'
  final TestingStatus? testingStatus;
  final bool eodSubmitted;
  final DateTime? eodSubmittedAt;

  TaskItem({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    required this.priority,
    this.projectId,
    this.projectName,
    this.projectKey,
    this.taskCode,
    this.assignedToId,
    this.assignedToName,
    this.assignedToAvatar,
    this.assignedById,
    this.assignedByName,
    this.assignedTesterId,
    this.assignedTesterName,
    this.assignedTesterAvatar,
    this.dueDate,
    this.sentToTestingAt,
    this.qaRejectionNotes,
    this.qaRejectedAt,
    this.subtasks = const [],
    this.commentsCount = 0,
    this.taskType = 'project',
    this.testingStatus,
    this.eodSubmitted = false,
    this.eodSubmittedAt,
  });

  bool get isPersonal => taskType == 'personal';

  bool get isTesting => status == 'Testing';

  bool get isInReview => status == 'In Review';

  bool get hasQaRejection =>
      (testingStatus?.overallResult == 'Failed' ||
          (qaRejectionNotes != null && qaRejectionNotes!.isNotEmpty)) &&
      status.toLowerCase() == 'in progress';

  int get priorityPoints {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 50;
      case 'high':
        return 35;
      case 'medium':
        return 20;
      case 'low':
      default:
        return 10;
    }
  }

  bool get isCompleted =>
      status.toLowerCase() == 'done' || status.toLowerCase() == 'completed';

  DateTime? get dueDateTime => dueDate != null ? DateTime.tryParse(dueDate!) : null;

  bool get isOverdue {
    final dt = dueDateTime;
    if (dt == null) return false;
    return dt.isBefore(DateTime.now()) && !isCompleted;
  }

  TaskItem copyWith({
    String? id,
    String? title,
    String? description,
    String? status,
    String? priority,
    String? projectId,
    String? projectName,
    String? projectKey,
    String? taskCode,
    String? assignedToId,
    String? assignedToName,
    String? assignedToAvatar,
    String? assignedById,
    String? assignedByName,
    String? assignedTesterId,
    String? assignedTesterName,
    String? assignedTesterAvatar,
    String? dueDate,
    DateTime? sentToTestingAt,
    String? qaRejectionNotes,
    DateTime? qaRejectedAt,
    List<SubTask>? subtasks,
    int? commentsCount,
    String? taskType,
    TestingStatus? testingStatus,
    bool? eodSubmitted,
    DateTime? eodSubmittedAt,
  }) {
    return TaskItem(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      projectId: projectId ?? this.projectId,
      projectName: projectName ?? this.projectName,
      projectKey: projectKey ?? this.projectKey,
      taskCode: taskCode ?? this.taskCode,
      assignedToId: assignedToId ?? this.assignedToId,
      assignedToName: assignedToName ?? this.assignedToName,
      assignedToAvatar: assignedToAvatar ?? this.assignedToAvatar,
      assignedById: assignedById ?? this.assignedById,
      assignedByName: assignedByName ?? this.assignedByName,
      assignedTesterId: assignedTesterId ?? this.assignedTesterId,
      assignedTesterName: assignedTesterName ?? this.assignedTesterName,
      assignedTesterAvatar: assignedTesterAvatar ?? this.assignedTesterAvatar,
      dueDate: dueDate ?? this.dueDate,
      sentToTestingAt: sentToTestingAt ?? this.sentToTestingAt,
      qaRejectionNotes: qaRejectionNotes ?? this.qaRejectionNotes,
      qaRejectedAt: qaRejectedAt ?? this.qaRejectedAt,
      subtasks: subtasks ?? this.subtasks,
      commentsCount: commentsCount ?? this.commentsCount,
      taskType: taskType ?? this.taskType,
      testingStatus: testingStatus ?? this.testingStatus,
      eodSubmitted: eodSubmitted ?? this.eodSubmitted,
      eodSubmittedAt: eodSubmittedAt ?? this.eodSubmittedAt,
    );
  }

  factory TaskItem.fromJson(Map<String, dynamic> json) {
    String? pId;
    String? pName;
    String? pKey;
    if (json['project'] is Map) {
      pId = json['project']['_id']?.toString() ?? json['project']['id']?.toString();
      pName = json['project']['name']?.toString();
      pKey = json['project']['key']?.toString() ?? json['project']['code']?.toString();
    } else if (json['project'] is String) {
      pId = json['project'];
    }

    String? assigneeId;
    String? assigneeName;
    String? assigneeAvatar;
    if (json['assignedTo'] is Map) {
      assigneeId = json['assignedTo']['_id']?.toString();
      assigneeName = json['assignedTo']['name']?.toString();
      assigneeAvatar = json['assignedTo']['avatar']?.toString();
    }

    String? assignedById;
    String? assignedByName;
    if (json['assignedBy'] is Map) {
      assignedById = json['assignedBy']['_id']?.toString();
      assignedByName = json['assignedBy']['name']?.toString();
    }

    String? testerId;
    String? testerName;
    String? testerAvatar;
    if (json['assignedTester'] is Map) {
      testerId = json['assignedTester']['_id']?.toString();
      testerName = json['assignedTester']['name']?.toString();
      testerAvatar = json['assignedTester']['avatar']?.toString();
    } else if (json['assignedTester'] != null) {
      testerId = json['assignedTester'].toString();
    }

    List<SubTask> subs = [];
    if (json['subtasks'] is List) {
      subs = (json['subtasks'] as List)
          .map((item) => SubTask.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    TestingStatus? testing;
    if (json['testingStatus'] is Map) {
      testing = TestingStatus.fromJson(json['testingStatus'] as Map<String, dynamic>);
    }

    return TaskItem(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString(),
      status: json['status']?.toString() ?? 'Todo',
      priority: json['priority']?.toString() ?? 'Medium',
      projectId: pId,
      projectName: pName,
      projectKey: pKey,
      taskCode: json['taskCode']?.toString(),
      assignedToId: assigneeId,
      assignedToName: assigneeName,
      assignedToAvatar: assigneeAvatar,
      assignedById: assignedById,
      assignedByName: assignedByName,
      assignedTesterId: testerId,
      assignedTesterName: testerName,
      assignedTesterAvatar: testerAvatar,
      dueDate: json['dueDate']?.toString(),
      sentToTestingAt: json['sentToTestingAt'] != null
          ? DateTime.tryParse(json['sentToTestingAt'].toString())
          : null,
      qaRejectionNotes: json['qaRejectionNotes']?.toString(),
      qaRejectedAt: json['qaRejectedAt'] != null
          ? DateTime.tryParse(json['qaRejectedAt'].toString())
          : null,
      subtasks: subs,
      commentsCount: json['commentsCount'] ?? 0,
      taskType: json['taskType']?.toString() ?? 'project',
      testingStatus: testing,
      eodSubmitted: json['eodSubmitted'] == true,
      eodSubmittedAt: json['eodSubmittedAt'] != null
          ? DateTime.tryParse(json['eodSubmittedAt'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'taskCode': taskCode,
        'title': title,
        'description': description,
        'status': status,
        'priority': priority,
        'dueDate': dueDate,
        'subtasks': subtasks.map((e) => e.toJson()).toList(),
        'commentsCount': commentsCount,
      };
}
