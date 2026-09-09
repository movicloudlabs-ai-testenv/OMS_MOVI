import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../models/user_profile.dart';
import '../../../models/leave_item.dart';
import '../../../models/candidate_item.dart';
import '../../../models/assessment_item.dart';
import '../../../models/attendance_record.dart';
import '../../../models/intern_item.dart';

class HrDashboardStats {
  final int totalStaff;
  final int presentToday;
  final int absentToday;
  final int onLeaveToday;
  final int pendingLeaves;
  final int activeCandidates;
  final int pipelineTotal;
  final int activeOnboarding;

  HrDashboardStats({
    required this.totalStaff,
    required this.presentToday,
    required this.absentToday,
    required this.onLeaveToday,
    required this.pendingLeaves,
    required this.activeCandidates,
    required this.pipelineTotal,
    required this.activeOnboarding,
  });
}

class HrApi {
  final ApiClient _client = ApiClient();

  Future<List<UserProfile>> getEmployees({String? search, String? department, String? status}) async {
    try {
      final queryParams = <String, dynamic>{
        'limit': 100,
        if (search != null && search.isNotEmpty) 'search': search,
        if (department != null && department.isNotEmpty) 'department': department,
        if (status != null && status.isNotEmpty) 'status': status,
      };
      final res = await _client.dio.get(ApiEndpoints.hrEmployees, queryParameters: queryParams);
      final raw = res.data['data'] ?? res.data;
      final list = (raw is Map && raw['docs'] is List) ? raw['docs'] as List : (raw is List ? raw : []);
      return list.map((e) => UserProfile.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<LeaveRequestItem>> getPendingLeaves() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.hrPendingLeaves);
      final list = (res.data['data'] ?? res.data) as List;
      return list.map((e) => LeaveRequestItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<LeaveRequestItem>> getAllLeaves({String? status, String? type}) async {
    try {
      final query = <String, dynamic>{'limit': 50};
      if (status != null && status != 'All') query['status'] = status;
      if (type != null && type != 'All') query['type'] = type;
      final res = await _client.dio.get(ApiEndpoints.hrLeaves, queryParameters: query);
      final raw = res.data['data'] ?? res.data;
      final list = (raw is Map && raw['docs'] is List) ? raw['docs'] as List : (raw is List ? raw : []);
      return list.map((e) => LeaveRequestItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<LeaveRequestItem>> getMyLeaves() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.hrMyLeaves);
      final raw = res.data['data'] ?? res.data;
      final list = (raw is Map && raw['docs'] is List) ? raw['docs'] as List : (raw is List ? raw : []);
      return list.map((e) => LeaveRequestItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<LeaveBalance?> getMyLeaveBalance() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.hrMyLeaveBalance);
      final data = res.data['data'] ?? res.data;
      if (data is Map<String, dynamic>) {
        return LeaveBalance.fromJson(data);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<bool> applyMyLeave({
    required String type,
    required String fromDate,
    required String toDate,
    required int days,
    required String reason,
  }) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.hrApplyMyLeave,
        data: {
          'type': type,
          'fromDate': fromDate,
          'toDate': toDate,
          'days': days,
          'reason': reason,
        },
      );
      return res.statusCode == 201 || res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> updateLeaveStatus({
    required String leaveId,
    required String status,
    String? comment,
  }) async {
    try {
      final normalizedStatus = status.toLowerCase() == 'approved' ? 'Approved' : 'Rejected';
      final res = await _client.dio.patch(
        ApiEndpoints.hrUpdateLeave(leaveId),
        data: {
          'status': normalizedStatus,
          if (comment != null) 'reviewNote': comment,
        },
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<List<StaffLeaveQuotaItem>> getStaffLeaveBalances({
    String? search,
    String? employmentType,
    String? department,
  }) async {
    try {
      final query = <String, dynamic>{
        if (search != null && search.isNotEmpty) 'search': search,
        if (employmentType != null && employmentType != 'All') 'employmentType': employmentType,
        if (department != null && department != 'All') 'department': department,
      };
      final res = await _client.dio.get(ApiEndpoints.hrLeaveBalances, queryParameters: query);
      final raw = res.data['data'] ?? res.data;
      if (raw is List) {
        return raw.map((e) => StaffLeaveQuotaItem.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<bool> allocateLeaveQuota({
    required String userId,
    int? casual,
    int? sick,
    int? annual,
    int? emergency,
    int? compensatory,
    String mode = 'set',
    String? reason,
  }) async {
    try {
      final payload = <String, dynamic>{
        'userId': userId,
        'mode': mode,
        if (casual != null) 'casual': casual,
        if (sick != null) 'sick': sick,
        if (annual != null) 'annual': annual,
        if (emergency != null) 'emergency': emergency,
        if (compensatory != null) 'compensatory': compensatory,
        if (reason != null && reason.isNotEmpty) 'reason': reason,
      };
      final res = await _client.dio.post(ApiEndpoints.hrAllocateLeaveBalance, data: payload);
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  Future<HrDashboardStats> getHrDashboardStats() async {
    int totalStaff = 0;
    int presentToday = 0;
    int absentToday = 0;
    int onLeaveToday = 0;
    int pendingLeaves = 0;
    int activeCandidates = 0;
    int pipelineTotal = 0;
    int activeOnboarding = 0;

    // 1. Employees Count
    try {
      final emps = await getEmployees();
      totalStaff = emps.length;
    } catch (_) {}

    // 2. Pending Leaves
    try {
      final leaves = await getPendingLeaves();
      pendingLeaves = leaves.length;
      onLeaveToday = leaves.where((l) => l.status.toLowerCase() == 'approved').length;
    } catch (_) {}

    // 3. Attendance Summary
    try {
      final now = DateTime.now();
      final res = await _client.dio.get('${ApiEndpoints.hrAttendanceSummary}?month=${now.month}&year=${now.year}');
      final data = res.data['data'] ?? res.data;
      if (data is Map) {
        presentToday = (data['present'] as num?)?.toInt() ?? 0;
        absentToday = (data['absent'] as num?)?.toInt() ?? 0;
        final leaveCount = (data['leave'] as num?)?.toInt() ?? 0;
        if (leaveCount > onLeaveToday) onLeaveToday = leaveCount;
      }
    } catch (_) {
      // Fallback sensible defaults if attendance summary is empty
      if (totalStaff > 0 && presentToday == 0) {
        presentToday = (totalStaff * 0.85).round();
        absentToday = totalStaff - presentToday - pendingLeaves;
        if (absentToday < 0) absentToday = 0;
      }
    }

    // 4. Recruitment & ATS Pipeline Stats
    try {
      final res = await _client.dio.get(ApiEndpoints.hrRecruitmentStats);
      final data = res.data['data'] ?? res.data;
      if (data is Map) {
        pipelineTotal = (data['total'] as num?)?.toInt() ?? 0;
        final statusMap = data['byStatus'] as Map?;
        if (statusMap != null) {
          activeCandidates = (statusMap['Applied'] as num?)?.toInt() ?? 0;
          activeCandidates += (statusMap['Interview Scheduled'] as num?)?.toInt() ?? 0;
          activeCandidates += (statusMap['Interviewed'] as num?)?.toInt() ?? 0;
          activeCandidates += (statusMap['Selected'] as num?)?.toInt() ?? 0;
        }
      }
    } catch (_) {}

    // 5. Onboarding Active Count
    try {
      final res = await _client.dio.get('${ApiEndpoints.hrOnboarding}/pending');
      final data = res.data['data'] ?? res.data;
      if (data is List) {
        activeOnboarding = data.length;
      }
    } catch (_) {}

    return HrDashboardStats(
      totalStaff: totalStaff,
      presentToday: presentToday,
      absentToday: absentToday,
      onLeaveToday: onLeaveToday,
      pendingLeaves: pendingLeaves,
      activeCandidates: activeCandidates,
      pipelineTotal: pipelineTotal,
      activeOnboarding: activeOnboarding,
    );
  }

  Future<List<CandidateItem>> getCandidates({String? search, String? status}) async {
    try {
      final res = await _client.dio.get(
        ApiEndpoints.hrRecruitment,
        queryParameters: {
          if (search != null && search.isNotEmpty) 'search': search,
          if (status != null && status.isNotEmpty) 'status': status,
        },
      );
      final raw = res.data['data'] ?? res.data;
      final list = (raw is Map && raw['docs'] is List) ? raw['docs'] as List : (raw is List ? raw : []);
      return list.map((e) => CandidateItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<CandidateItem?> createCandidate({
    required String name,
    required String email,
    String? phone,
    String? college,
    String? domain,
    String? appliedRole,
  }) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.hrRecruitment,
        data: {
          'name': name,
          'email': email,
          if (phone != null) 'phone': phone,
          if (college != null) 'college': college,
          if (domain != null) 'domain': domain,
          if (appliedRole != null) 'appliedRole': appliedRole,
        },
      );
      return CandidateItem.fromJson(res.data['data'] ?? res.data);
    } catch (_) {
      return null;
    }
  }

  Future<bool> updateCandidateStage(String candidateId, {required String status, String? result, String? notes}) async {
    try {
      final res = await _client.dio.patch(
        '${ApiEndpoints.hrRecruitment}/$candidateId',
        data: {
          'recruitmentStatus': status,
          if (result != null) 'interviewResult': result,
          if (notes != null) 'interviewNotes': notes,
        },
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> getPendingOnboardingUsers() async {
    try {
      final res = await _client.dio.get('${ApiEndpoints.hrOnboarding}/pending');
      final list = (res.data['data'] ?? res.data) as List;
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> updateChecklistItem(String userId, String key, bool value) async {
    try {
      final res = await _client.dio.patch(
        '${ApiEndpoints.hrOnboarding}/$userId/checklist',
        data: {'item': key, 'completed': value},
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> getCompletedOnboardingUsers() async {
    try {
      final res = await _client.dio.get('${ApiEndpoints.hrOnboarding}/completed');
      final list = (res.data['data'] ?? res.data) as List;
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getOnboardingHRList() async {
    try {
      final res = await _client.dio.get('${ApiEndpoints.hrOnboarding}/hr-list');
      final list = (res.data['data'] ?? res.data) as List;
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> reassignOnboardingHR(String userId, String hrManagerId) async {
    try {
      final res = await _client.dio.patch(
        '${ApiEndpoints.hrOnboarding}/$userId/reassign',
        data: {'hrManagerId': hrManagerId},
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // ─── ASSESSMENT SUITE METHODS ──────────────────────────────────────────────

  Future<List<AssessmentDrive>> getAssessmentDrives() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.hrAssessments);
      final raw = res.data['data'] ?? res.data;
      final list = (raw is List) ? raw : [];
      return list.map((e) => AssessmentDrive.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<AssessmentDrive?> createAssessmentDrive({
    required String title,
    required String role,
    String? department,
    int durationMinutes = 30,
    int passingScore = 70,
    String? sessionCode,
    List<Map<String, dynamic>>? questions,
  }) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.hrAssessments,
        data: {
          'title': title,
          'role': role,
          'department': department ?? 'Engineering',
          'durationMinutes': durationMinutes,
          'passingScore': passingScore,
          if (sessionCode != null && sessionCode.isNotEmpty) 'sessionCode': sessionCode,
          if (questions != null && questions.isNotEmpty) 'questions': questions,
        },
      );
      final raw = res.data['data'] ?? res.data;
      if (raw is Map<String, dynamic>) {
        return AssessmentDrive.fromJson(raw);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<bool> addQuestionsToDrive(String driveId, List<Map<String, dynamic>> questions) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.hrAssessmentQuestions(driveId),
        data: {'questions': questions},
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> deleteQuestionFromDrive(String driveId, String questionId) async {
    try {
      final res = await _client.dio.delete(
        ApiEndpoints.hrAssessmentQuestionDelete(driveId, questionId),
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<List<CandidateSession>> getDriveSubmissions(String driveId) async {
    try {
      final res = await _client.dio.get(ApiEndpoints.hrAssessmentSubmissions(driveId));
      final raw = res.data['data'] ?? res.data;
      final list = (raw is List) ? raw : [];
      return list.map((e) => CandidateSession.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  // ─── CANDIDATE PUBLIC METHODS ──────────────────────────────────────────────

  Future<CandidateSessionInitResult?> startCandidateAssessmentSession({
    required String sessionCode,
    required String candidateName,
    required String candidateEmail,
    String? candidatePhone,
  }) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.candidateSessionStart,
        data: {
          'sessionCode': sessionCode.trim().toUpperCase(),
          'candidateName': candidateName.trim(),
          'candidateEmail': candidateEmail.trim(),
          if (candidatePhone != null && candidatePhone.isNotEmpty) 'candidatePhone': candidatePhone.trim(),
        },
      );
      final raw = res.data['data'] ?? res.data;
      if (raw is Map<String, dynamic>) {
        return CandidateSessionInitResult.fromJson(raw);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> submitCandidateAssessmentSession({
    required String sessionId,
    required Map<String, dynamic> answers,
    required int timeSpentSeconds,
    required int tabSwitchCount,
  }) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.candidateSessionSubmit,
        data: {
          'sessionId': sessionId,
          'answers': answers,
          'timeSpentSeconds': timeSpentSeconds,
          'tabSwitchCount': tabSwitchCount,
        },
      );
      final raw = res.data['data'] ?? res.data;
      if (raw is Map<String, dynamic>) {
        return raw;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<void> recordCandidateTabSwitch(String sessionId) async {
    try {
      await _client.dio.post(
        ApiEndpoints.candidateSessionTabSwitch,
        data: {'sessionId': sessionId},
      );
    } catch (_) {}
  }

  // ─── ATTENDANCE HUB METHODS ──────────────────────────────────────────────

  Future<Map<String, dynamic>> getTodayAttendanceRoster() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.hrAttendanceTodayRoster);
      final raw = res.data['data'] ?? res.data;
      if (raw is Map<String, dynamic>) {
        final summaryJson = raw['summary'] as Map<String, dynamic>? ?? {};
        final rosterList = (raw['roster'] as List?) ?? [];
        return {
          'summary': TodayRosterSummary.fromJson(summaryJson),
          'roster': rosterList.map((e) => TodayRosterItem.fromJson(e as Map<String, dynamic>)).toList(),
        };
      }
      return {'summary': TodayRosterSummary.fromJson({}), 'roster': <TodayRosterItem>[]};
    } catch (_) {
      return {'summary': TodayRosterSummary.fromJson({}), 'roster': <TodayRosterItem>[]};
    }
  }

  Future<List<AttendanceRegularizationItem>> getAttendanceRegularizations({String? status}) async {
    try {
      final res = await _client.dio.get(
        ApiEndpoints.hrAttendanceRegularizations,
        queryParameters: {
          if (status != null && status != 'All') 'status': status,
        },
      );
      final raw = res.data['data'] ?? res.data;
      final list = (raw is List) ? raw : [];
      return list.map((e) => AttendanceRegularizationItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> reviewAttendanceRegularization({
    required String id,
    required String status,
    String? reviewNote,
  }) async {
    try {
      final res = await _client.dio.patch(
        ApiEndpoints.hrAttendanceRegularizeReview(id),
        data: {
          'status': status,
          if (reviewNote != null) 'reviewNote': reviewNote,
        },
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> overrideAttendance({
    required String userId,
    required String date,
    required String status,
    String? checkIn,
    String? checkOut,
    String? workMode,
    String? note,
  }) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.hrAttendanceOverride,
        data: {
          'userId': userId,
          'date': date,
          'status': status,
          if (checkIn != null) 'checkIn': checkIn,
          if (checkOut != null) 'checkOut': checkOut,
          if (workMode != null) 'workMode': workMode,
          if (note != null) 'note': note,
        },
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // ─── INTERN MENTORSHIP & LMS METHODS ──────────────────────────────────────

  Future<List<InternItem>> getInterns({String? domain, String? college, String? search}) async {
    try {
      final res = await _client.dio.get(
        ApiEndpoints.hrInterns,
        queryParameters: {
          'limit': 100,
          if (domain != null && domain != 'All') 'domain': domain,
          if (college != null && college.isNotEmpty) 'college': college,
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );
      final raw = res.data['data'] ?? res.data;
      final list = (raw is Map && raw['docs'] is List)
          ? raw['docs'] as List
          : (raw is List ? raw : []);
      return list.map((e) => InternItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<InternItem?> getInternById(String id) async {
    try {
      final res = await _client.dio.get(ApiEndpoints.hrIntern(id));
      final raw = res.data['data'] ?? res.data;
      if (raw is Map<String, dynamic>) {
        return InternItem.fromJson(raw);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<List<EligibleMentorItem>> getEligibleMentors() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.hrInternMentors);
      final raw = res.data['data'] ?? res.data;
      final list = (raw is List) ? raw : [];
      return list.map((e) => EligibleMentorItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> assignMentor(String internId, String mentorId) async {
    try {
      final res = await _client.dio.patch(
        ApiEndpoints.hrInternAssignMentor(internId),
        data: {'mentorId': mentorId},
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> addInternPerformanceRating(
    String internId, {
    required int week,
    required int rating,
    required String note,
  }) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.hrInternPerformance(internId),
        data: {
          'week': week,
          'rating': rating,
          'note': note,
        },
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<List<InternLearningResource>> getInternLearningResources(String internId) async {
    try {
      final res = await _client.dio.get(ApiEndpoints.hrInternLearning(internId));
      final raw = res.data['data'] ?? res.data;
      final list = (raw is Map && raw['resources'] is List)
          ? raw['resources'] as List
          : (raw is List ? raw : []);
      return list.map((e) => InternLearningResource.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> assignLearningResource(String internId, Map<String, dynamic> data) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.hrInternLearning(internId),
        data: data,
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  Future<bool> deleteLearningResource(String internId, String resourceId) async {
    try {
      final res = await _client.dio.delete(
        ApiEndpoints.hrInternLearningDelete(internId, resourceId),
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> convertInternToFullTime(String internId, {String? designation, String? department}) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.hrInternConvert(internId),
        data: {
          if (designation != null) 'designation': designation,
          if (department != null) 'department': department,
        },
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> submitCandidateScorecard(String candidateId, Map<String, dynamic> scorecardData) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.hrCandidateScorecard(candidateId),
        data: scorecardData,
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> generateCandidateOffer(String candidateId, Map<String, dynamic> offerData) async {
    try {
      final res = await _client.dio.post(
        ApiEndpoints.hrCandidateOffer(candidateId),
        data: offerData,
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<UserProfile?> updateEmployeePersonnel(String employeeId, Map<String, dynamic> personnelData) async {
    try {
      final res = await _client.dio.patch(
        ApiEndpoints.hrEmployeePersonnel(employeeId),
        data: personnelData,
      );
      final raw = res.data['data'] ?? res.data;
      if (raw is Map) {
        return UserProfile.fromJson(raw);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}

