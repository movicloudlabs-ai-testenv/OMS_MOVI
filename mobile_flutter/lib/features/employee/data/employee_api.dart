import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../models/attendance_record.dart';
import '../../../models/task_item.dart';
import '../../../models/leave_item.dart';
import '../../../models/user_profile.dart';

class EmployeeApi {
  final ApiClient _client = ApiClient();

  // ── Attendance ─────────────────────────────────────────────────────────────

  Future<AttendanceRecord?> getTodayAttendance() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.todayAttendance);
      if (res.data?['data'] == null) return null;
      return AttendanceRecord.fromJson(res.data['data']);
    } catch (_) {
      try {
        final res = await _client.dio.get(ApiEndpoints.internAttendanceToday);
        if (res.data?['data'] == null) return null;
        return AttendanceRecord.fromJson(res.data['data']);
      } catch (_) {
        return null;
      }
    }
  }

  Future<AttendanceRecord> checkIn({
    double? latitude,
    double? longitude,
    double? accuracy,
    bool? isGeofenced,
    String workMode = 'Remote',
  }) async {
    final payload = {
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (accuracy != null) 'accuracy': accuracy,
      if (isGeofenced != null) 'isGeofenced': isGeofenced,
      'workMode': workMode,
    };
    try {
      final res = await _client.dio.post(ApiEndpoints.checkIn, data: payload);
      return AttendanceRecord.fromJson(res.data['data'] ?? res.data);
    } catch (_) {
      final res = await _client.dio.post(ApiEndpoints.internCheckIn, data: payload);
      return AttendanceRecord.fromJson(res.data['data'] ?? res.data);
    }
  }

  Future<AttendanceRecord> checkOut() async {
    try {
      final res = await _client.dio.post(ApiEndpoints.checkOut);
      return AttendanceRecord.fromJson(res.data['data'] ?? res.data);
    } catch (_) {
      final res = await _client.dio.post(ApiEndpoints.internCheckOut);
      return AttendanceRecord.fromJson(res.data['data'] ?? res.data);
    }
  }

  // ── Break Management ───────────────────────────────────────────────────────

  Future<AttendanceRecord?> startBreak() async {
    try {
      final res = await _client.dio.post(ApiEndpoints.breakStart);
      final raw = res.data['data'] ?? res.data;
      if (raw == null) return null;
      return AttendanceRecord.fromJson(raw as Map<String, dynamic>);
    } catch (_) {
      try {
        final res = await _client.dio.post(ApiEndpoints.internBreakStart);
        final raw = res.data['data'] ?? res.data;
        if (raw == null) return null;
        return AttendanceRecord.fromJson(raw as Map<String, dynamic>);
      } catch (_) {
        return null;
      }
    }
  }

  Future<AttendanceRecord?> endBreak() async {
    try {
      final res = await _client.dio.post(ApiEndpoints.breakEnd);
      final raw = res.data['data'] ?? res.data;
      if (raw == null) return null;
      return AttendanceRecord.fromJson(raw as Map<String, dynamic>);
    } catch (_) {
      try {
        final res = await _client.dio.post(ApiEndpoints.internBreakEnd);
        final raw = res.data['data'] ?? res.data;
        if (raw == null) return null;
        return AttendanceRecord.fromJson(raw as Map<String, dynamic>);
      } catch (_) {
        return null;
      }
    }
  }

  Future<bool> resetTodayAttendance() async {
    try {
      await _client.dio.post(ApiEndpoints.resetTodayAttendance);
      return true;
    } catch (_) {
      try {
        await _client.dio.post(ApiEndpoints.internResetTodayAttendance);
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  Future<List<AttendanceRecord>> getMyAttendanceHistory() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.attendanceHistory);
      return _parseAttendanceList(res.data);
    } catch (_) {
      try {
        final res = await _client.dio.get(ApiEndpoints.internAttendanceHistory);
        return _parseAttendanceList(res.data);
      } catch (_) {
        return [];
      }
    }
  }

  List<AttendanceRecord> _parseAttendanceList(dynamic data) {
    if (data == null) return [];
    final payload = (data is Map && data['data'] != null) ? data['data'] : data;
    List rawList = [];
    if (payload is List) {
      rawList = payload;
    } else if (payload is Map && payload['records'] is List) {
      rawList = payload['records'];
    } else if (payload is Map && payload['attendance'] is List) {
      rawList = payload['attendance'];
    }
    return rawList
        .whereType<Map>()
        .map((e) => AttendanceRecord.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  // Regularization
  Future<bool> submitRegularization({
    required String date,
    required String requestType,
    required String requestedCheckIn,
    required String requestedCheckOut,
    required String workMode,
    required String reason,
  }) async {
    final payload = {
      'date': date,
      'requestType': requestType,
      'requestedCheckIn': requestedCheckIn,
      'requestedCheckOut': requestedCheckOut,
      'workMode': workMode,
      'reason': reason,
    };
    try {
      final res = await _client.dio.post(ApiEndpoints.attendanceRegularize, data: payload);
      return res.statusCode == 201 || res.statusCode == 200;
    } catch (_) {
      try {
        final res = await _client.dio.post(ApiEndpoints.internAttendanceRegularize, data: payload);
        return res.statusCode == 201 || res.statusCode == 200;
      } catch (_) {
        return false;
      }
    }
  }

  Future<List<AttendanceRegularizationItem>> getMyRegularizations() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.myAttendanceRegularizations);
      final raw = res.data['data'] ?? res.data;
      final list = (raw is List) ? raw : [];
      return list.map((e) => AttendanceRegularizationItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      try {
        final res = await _client.dio.get(ApiEndpoints.internAttendanceRegularizeMy);
        final raw = res.data['data'] ?? res.data;
        final list = (raw is List) ? raw : [];
        return list.map((e) => AttendanceRegularizationItem.fromJson(e as Map<String, dynamic>)).toList();
      } catch (_) {
        return [];
      }
    }
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  Future<List<TaskItem>> getMyTasks({String? projectId, String? scope, String? view}) async {
    try {
      final params = <String, dynamic>{};
      if (projectId != null) params['projectId'] = projectId;
      if (scope != null) params['scope'] = scope;
      if (view != null) params['view'] = view;
      final res = await _client.dio.get(ApiEndpoints.employeeTasks,
          queryParameters: params.isNotEmpty ? params : null);
      final list = (res.data['data'] ?? res.data) as List;
      return list.map((e) => TaskItem.fromJson(e)).toList();
    } catch (_) {
      try {
        final params = <String, dynamic>{};
        if (projectId != null) params['projectId'] = projectId;
        if (scope != null) params['scope'] = scope;
        if (view != null) params['view'] = view;
        final res = await _client.dio.get(ApiEndpoints.internTasks,
            queryParameters: params.isNotEmpty ? params : null);
        final list = (res.data['data'] ?? res.data) as List;
        return list.map((e) => TaskItem.fromJson(e)).toList();
      } catch (_) {
        return [];
      }
    }
  }

  /// Fetch all projects the current user belongs to (member or manager).
  Future<List<ProjectMiniInfo>> getMyProjects() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.employeeMyProjects);
      final list = (res.data['data'] ?? res.data) as List;
      return list
          .map((e) => ProjectMiniInfo.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Fetch team members for a project — used in Assign Task sheet.
  Future<List<UserProfile>> getProjectTeamMembers(String projectId) async {
    try {
      final res = await _client.dio.get(ApiEndpoints.employeeProjectMembers(projectId));
      final list = (res.data['data'] ?? res.data) as List;
      return list
          .map((e) => UserProfile.fromJson(e as Map<dynamic, dynamic>))
          .toList();
    } catch (_) {
      try {
        final res = await _client.dio.get(
          ApiEndpoints.pmoAvailableTeam,
          queryParameters: {'type': 'employee'},
        );
        final list = (res.data['data'] ?? res.data) as List;
        return list
            .map((e) => UserProfile.fromJson(e as Map<dynamic, dynamic>))
            .toList();
      } catch (_) {
        return [];
      }
    }
  }

  /// Leader creates & assigns a task in a project.
  Future<TaskItem?> createProjectTask({
    required String projectId,
    required String title,
    required String assignedTo,
    String? assignedTester,
    String priority = 'Medium',
    String? description,
    String? dueDate,
    List<String> subtasks = const [],
  }) async {
    final payload = {
      'title': title,
      'description': description,
      'project': projectId,
      'projectId': projectId,
      'assignedTo': assignedTo,
      if (assignedTester != null && assignedTester.isNotEmpty)
        'assignedTester': assignedTester,
      'priority': priority,
      if (dueDate != null) 'dueDate': dueDate,
      if (subtasks.isNotEmpty)
        'subtasks': subtasks.map((t) => {'title': t, 'completed': false}).toList(),
    };

    try {
      final res = await _client.dio.post(
        ApiEndpoints.employeeCreateProjectTask,
        data: payload,
      );
      final raw = res.data['data'] ?? res.data;
      return TaskItem.fromJson(raw as Map<String, dynamic>);
    } catch (_) {
      try {
        final res = await _client.dio.post(
          ApiEndpoints.pmoTasks,
          data: payload,
        );
        final raw = res.data['data'] ?? res.data;
        return TaskItem.fromJson(raw as Map<String, dynamic>);
      } catch (_) {
        return null;
      }
    }
  }

  /// Leader sends a task from In Review → Testing.
  Future<bool> sendToTesting(String taskId) async {
    try {
      final res = await _client.dio.post(ApiEndpoints.employeeSendToTesting(taskId));
      return res.data?['success'] ?? true;
    } catch (_) {
      try {
        final res = await _client.dio.post(ApiEndpoints.pmoSendToTesting(taskId));
        return res.data?['success'] ?? true;
      } catch (_) {
        return false;
      }
    }
  }

  /// Tester submits a pass/fail verdict for a single subtask.
  Future<TaskItem?> submitTestResult({
    required String taskId,
    required String subtaskId,
    required String result, // 'Pass' | 'Fail'
    String? notes,
  }) async {
    final payload = {
      'result': result,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    };
    try {
      final res = await _client.dio.patch(
        ApiEndpoints.employeeTestSubtask(taskId, subtaskId),
        data: payload,
      );
      final raw = res.data?['data'] ?? res.data;
      if (raw is Map<String, dynamic>) {
        return TaskItem.fromJson(raw);
      }
      return null;
    } catch (_) {
      try {
        final res = await _client.dio.patch(
          ApiEndpoints.pmoTestSubtask(taskId, subtaskId),
          data: payload,
        );
        final raw = res.data?['data'] ?? res.data;
        if (raw is Map<String, dynamic>) {
          return TaskItem.fromJson(raw);
        }
        return null;
      } catch (_) {
        return null;
      }
    }
  }

  Future<TaskItem> updateTaskStatus(String taskId, String status) async {
    try {
      final res = await _client.dio.patch(
        ApiEndpoints.updateTaskStatus(taskId),
        data: {'status': status},
      );
      return TaskItem.fromJson(res.data['data'] ?? res.data);
    } catch (_) {
      final res = await _client.dio.patch(
        ApiEndpoints.internTaskStatus(taskId),
        data: {'status': status},
      );
      return TaskItem.fromJson(res.data['data'] ?? res.data);
    }
  }

  /// Create a personal to-do task (no project, self-assigned)
  Future<TaskItem?> createPersonalTask({
    required String title,
    String priority = 'Medium',
    String? notes,
  }) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.createPersonalTask,
        data: {
          'title': title,
          'priority': priority,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
        },
      );
      final raw = res.data['data'] ?? res.data;
      return TaskItem.fromJson(raw as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  // ── Leaves ─────────────────────────────────────────────────────────────────

  Future<LeaveBalance> getLeaveBalance() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.leaveBalance);
      return LeaveBalance.fromJson(res.data['data'] ?? res.data);
    } catch (_) {
      final res = await _client.dio.get(ApiEndpoints.internLeaveBalance);
      return LeaveBalance.fromJson(res.data['data'] ?? res.data);
    }
  }

  Future<List<LeaveRequestItem>> getMyLeaveRequests() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.leaveRequests);
      final list = (res.data['data'] ?? res.data) as List;
      return list.map((e) => LeaveRequestItem.fromJson(e)).toList();
    } catch (_) {
      final res = await _client.dio.get(ApiEndpoints.internLeaves);
      final list = (res.data['data'] ?? res.data) as List;
      return list.map((e) => LeaveRequestItem.fromJson(e)).toList();
    }
  }

  Future<LeaveRequestItem> applyLeave({
    required String leaveType,
    required String startDate,
    required String endDate,
    required String reason,
  }) async {
    String normalizedType = 'Casual';
    final lower = leaveType.toLowerCase().trim();
    if (lower.contains('casual')) {
      normalizedType = 'Casual';
    } else if (lower.contains('sick')) {
      normalizedType = 'Sick';
    } else if (lower.contains('earned') || lower.contains('annual')) {
      normalizedType = 'Annual';
    } else if (lower.contains('unpaid') || lower.contains('emergency') || lower.contains('loss')) {
      normalizedType = 'Emergency';
    }

    final payload = {
      'type': normalizedType,
      'fromDate': startDate,
      'toDate': endDate,
      'leaveType': normalizedType,
      'startDate': startDate,
      'endDate': endDate,
      'reason': reason,
    };
    try {
      final res = await _client.dio.post(ApiEndpoints.applyLeave, data: payload);
      return LeaveRequestItem.fromJson(res.data['data'] ?? res.data);
    } catch (_) {
      final res = await _client.dio.post(ApiEndpoints.internLeaves, data: payload);
      return LeaveRequestItem.fromJson(res.data['data'] ?? res.data);
    }
  }

  Future<List<SubTask>> toggleSubtask(String taskId, String subtaskId) async {
    dynamic resData;
    try {
      final res = await _client.dio.patch(
        ApiEndpoints.toggleSubtask(taskId, subtaskId),
      );
      resData = res.data['data'] ?? res.data;
    } catch (e) {
      try {
        final res = await _client.dio.patch(
          ApiEndpoints.internToggleSubtask(taskId, subtaskId),
        );
        resData = res.data['data'] ?? res.data;
      } catch (_) {
        rethrow;
      }
    }

    if (resData is Map && resData['subtasks'] is List) {
      return (resData['subtasks'] as List)
          .map((e) => SubTask.fromJson(e as Map<String, dynamic>))
          .toList();
    } else if (resData is List) {
      return resData
          .map((e) => SubTask.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  // ── EOD Report ─────────────────────────────────────────────────────────────

  /// Submit a fully structured EOD report. The backend will:
  ///  1. Save to DB with all structured fields
  ///  2. Auto-dispatch formatted summary to the user's project chat channel(s)
  Future<bool> submitEodReport({
    String? tasksCompleted,
    String? blockers,
    String? learnings,
    String? plansTomorrow,
    String mood = 'neutral',
    double hoursWorked = 8.0,
    double? netHoursWorked,
    List<String>? taskIds,
  }) async {
    final res = await _client.dio.post(
      ApiEndpoints.submitEod,
      data: {
        if (tasksCompleted != null && tasksCompleted.isNotEmpty) 'tasksCompleted': tasksCompleted,
        if (blockers != null && blockers.isNotEmpty) 'blockers': blockers,
        if (learnings != null && learnings.isNotEmpty) 'learnings': learnings,
        if (plansTomorrow != null && plansTomorrow.isNotEmpty) 'plansTomorrow': plansTomorrow,
        'mood': mood,
        'hoursWorked': hoursWorked,
        if (netHoursWorked != null) 'netHoursWorked': netHoursWorked,
        if (taskIds != null && taskIds.isNotEmpty) 'taskIds': taskIds,
      },
    );
    return res.data?['success'] ?? true;
  }
}

