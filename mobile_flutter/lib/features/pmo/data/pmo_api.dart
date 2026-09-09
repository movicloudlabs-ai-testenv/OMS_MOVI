import 'dart:io';
import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../models/project_item.dart';
import '../../../models/task_item.dart';
import '../../../models/user_profile.dart';
import '../../../models/sprint_item.dart';
import '../../../models/gantt_item.dart';

class PmoApi {
  final ApiClient _client = ApiClient();

  // ─── Project Listing & Details ──────────────────────────────────────────────
  Future<List<ProjectItem>> getProjects({String? status, String? search}) async {
    final queryParams = <String, dynamic>{};
    if (status != null && status != 'All') queryParams['status'] = status;
    if (search != null && search.trim().isNotEmpty) queryParams['search'] = search.trim();

    try {
      final res = await _client.dio.get(
        ApiEndpoints.pmoProjects,
        queryParameters: queryParams,
      );
      final list = (res.data['data'] ?? res.data) as List;
      return list.map((e) => ProjectItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      try {
        final res = await _client.dio.get(
          ApiEndpoints.internProjects,
          queryParameters: queryParams,
        );
        final list = (res.data['data'] ?? res.data) as List;
        return list.map((e) => ProjectItem.fromJson(e as Map<String, dynamic>)).toList();
      } catch (_) {
        rethrow;
      }
    }
  }

  Future<ProjectItem> getProjectById(String id) async {
    try {
      final res = await _client.dio.get(ApiEndpoints.pmoProject(id));
      final data = res.data['data'] ?? res.data;
      return ProjectItem.fromJson(data as Map<String, dynamic>);
    } catch (_) {
      final res = await _client.dio.get(ApiEndpoints.internProject(id));
      final data = res.data['data'] ?? res.data;
      return ProjectItem.fromJson(data as Map<String, dynamic>);
    }
  }

  Future<ProjectItem> createProject(Map<String, dynamic> data) async {
    final res = await _client.dio.post(ApiEndpoints.pmoProjects, data: data);
    final created = res.data['data'] ?? res.data;
    return ProjectItem.fromJson(created as Map<String, dynamic>);
  }

  Future<bool> updateProject(String id, Map<String, dynamic> data) async {
    final res = await _client.dio.put(ApiEndpoints.pmoProject(id), data: data);
    return res.data?['success'] ?? true;
  }

  /// Transfer project lead/manager to another user.
  /// Returns the updated [ProjectItem] reflecting the new manager.
  Future<ProjectItem> changeProjectLead(
    String projectId, {
    required String newManagerId,
    String? handoverNotes,
  }) async {
    final res = await _client.dio.patch(
      ApiEndpoints.pmoProjectChangeLead(projectId),
      data: {
        'newManagerId': newManagerId,
        if (handoverNotes != null && handoverNotes.trim().isNotEmpty)
          'handoverNotes': handoverNotes.trim(),
      },
    );
    final data = res.data['data'] ?? res.data;
    return ProjectItem.fromJson(data as Map<String, dynamic>);
  }

  /// Fetch all active employees who can be designated as project leads.
  Future<List<UserProfile>> getAvailableLeads() async {
    final res = await _client.dio.get(
      ApiEndpoints.pmoAvailableManagers,
      queryParameters: {'type': 'employee'},
    );
    final list = (res.data['data'] ?? res.data) as List;
    return list
        .map((e) => UserProfile.fromJson(e as Map<dynamic, dynamic>))
        .toList();
  }

  Future<bool> deleteProject(String id) async {
    final res = await _client.dio.delete(ApiEndpoints.pmoProject(id));
    return res.data?['success'] ?? true;
  }

  Future<List<Map<String, dynamic>>> getDepartments() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.adminDepartments);
      final list = (res.data['data'] ?? res.data) as List;
      return list.cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── Team Members ───────────────────────────────────────────────────────────
  Future<List<UserProfile>> getAvailableTeamMembers({
    String type = 'employee',
    bool? unassignedOnly,
  }) async {
    final queryParams = <String, dynamic>{'type': type};
    if (unassignedOnly != null) {
      queryParams['unassignedOnly'] = unassignedOnly.toString();
    }

    final res = await _client.dio.get(
      ApiEndpoints.pmoAvailableTeam,
      queryParameters: queryParams,
    );
    final list = (res.data['data'] ?? res.data) as List;
    return list.map((e) => UserProfile.fromJson(e as Map<dynamic, dynamic>)).toList();
  }

  Future<bool> addTeamMembers(String id, List<Map<String, dynamic>> members) async {
    final res = await _client.dio.post(
      ApiEndpoints.pmoProjectTeam(id),
      data: {'members': members},
    );
    return res.data?['success'] ?? true;
  }

  Future<bool> removeTeamMember(String id, String userId) async {
    final res = await _client.dio.delete(ApiEndpoints.pmoProjectTeamMember(id, userId));
    return res.data?['success'] ?? true;
  }

  // ─── Milestones ─────────────────────────────────────────────────────────────
  Future<bool> addMilestone(String id, Map<String, dynamic> data) async {
    final res = await _client.dio.post(ApiEndpoints.pmoProjectMilestones(id), data: data);
    return res.data?['success'] ?? true;
  }

  Future<bool> updateMilestone(String id, String milestoneId, Map<String, dynamic> data) async {
    final res = await _client.dio.patch(
      ApiEndpoints.pmoProjectMilestone(id, milestoneId),
      data: data,
    );
    return res.data?['success'] ?? true;
  }

  // ─── Deployments ────────────────────────────────────────────────────────────
  Future<bool> recordDeployment(String id, Map<String, dynamic> data) async {
    final res = await _client.dio.post(ApiEndpoints.pmoProjectDeployments(id), data: data);
    return res.data?['success'] ?? true;
  }

  // ─── Credentials Vault (AES-256-GCM) ────────────────────────────────────────
  Future<ProjectCredential> addCredential(String id, Map<String, dynamic> data) async {
    final res = await _client.dio.post(ApiEndpoints.pmoProjectCredentials(id), data: data);
    final cred = res.data['data'] ?? res.data;
    return ProjectCredential.fromJson(cred as Map<String, dynamic>);
  }

  Future<void> addCredentialsBatch(String id, List<Map<String, dynamic>> secrets) async {
    await _client.dio.post(ApiEndpoints.pmoProjectCredentials(id), data: {'secrets': secrets});
  }

  Future<String> revealCredential(String id, String credId) async {
    final res = await _client.dio.post(ApiEndpoints.pmoProjectCredentialReveal(id, credId));
    final data = res.data['data'] ?? res.data;
    return data['plaintext']?.toString() ?? '';
  }

  Future<bool> deleteCredential(String id, String credId) async {
    final res = await _client.dio.delete(ApiEndpoints.pmoProjectCredentialDelete(id, credId));
    return res.data?['success'] ?? true;
  }

  // ─── Bug Resolution Matrix ──────────────────────────────────────────────────
  Future<List<ProjectBug>> getProjectBugs(String id) async {
    final res = await _client.dio.get(ApiEndpoints.pmoProjectBugs(id));
    final list = (res.data['data'] ?? res.data) as List;
    return list.map((e) => ProjectBug.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ProjectBug> createProjectBug(String id, Map<String, dynamic> data) async {
    final res = await _client.dio.post(ApiEndpoints.pmoProjectBugs(id), data: data);
    final bug = res.data['data'] ?? res.data;
    return ProjectBug.fromJson(bug as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>?> uploadBugAttachment(File file) async {
    try {
      final fileName = file.path.split(Platform.isWindows ? r'\' : '/').last;
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: fileName),
      });
      final res = await _client.dio.post(
        ApiEndpoints.chatUpload,
        data: formData,
      );
      final raw = res.data['data'] ?? res.data;
      if (raw is Map) {
        return Map<String, dynamic>.from(raw);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<ProjectBug> resolveProjectBug(String id, String bugId, Map<String, dynamic> data) async {
    final res = await _client.dio.patch(
      ApiEndpoints.pmoProjectBugResolve(id, bugId),
      data: data,
    );
    final bug = res.data['data'] ?? res.data;
    return ProjectBug.fromJson(bug as Map<String, dynamic>);
  }

  Future<ProjectBug> reopenProjectBug(String id, String bugId, String reason) async {
    final res = await _client.dio.patch(
      ApiEndpoints.pmoProjectBugReopen(id, bugId),
      data: {'reason': reason},
    );
    final bug = res.data['data'] ?? res.data;
    return ProjectBug.fromJson(bug as Map<String, dynamic>);
  }

  Future<bool> addProjectBugComment(String id, String bugId, String text) async {
    final res = await _client.dio.post(
      ApiEndpoints.pmoProjectBugComments(id, bugId),
      data: {'text': text},
    );
    return res.data?['success'] ?? true;
  }

  // ─── Live Activity Feed ─────────────────────────────────────────────────────
  Future<List<ProjectActivityItem>> getProjectActivity(String id) async {
    final res = await _client.dio.get(ApiEndpoints.pmoProjectActivity(id));
    final list = (res.data['data'] ?? res.data) as List;
    return list.map((e) => ProjectActivityItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ─── PMO Tasks ──────────────────────────────────────────────────────────────
  Future<List<TaskItem>> getProjectTasks([String? projectId]) async {
    final url = projectId != null
        ? '${ApiEndpoints.pmoTasks}?project=$projectId'
        : ApiEndpoints.pmoTasks;
    final res = await _client.dio.get(url);
    final list = (res.data['data'] ?? res.data) as List;
    return list.map((e) => TaskItem.fromJson(e)).toList();
  }

  Future<bool> approveTask({
    required String taskId,
    required String approvalStatus,
    String? feedback,
  }) async {
    final res = await _client.dio.post(
      ApiEndpoints.pmoReviewTask(taskId),
      data: {
        'status': approvalStatus,
        if (feedback != null) 'feedback': feedback,
      },
    );
    return res.data?['success'] ?? true;
  }

  // ─── Agile Sprints & Cycles ─────────────────────────────────────────────────
  Future<Map<String, dynamic>> getProjectSprints(String id) async {
    final res = await _client.dio.get(ApiEndpoints.pmoProjectSprints(id));
    final data = res.data['data'] ?? res.data;
    final list = (data['sprints'] as List?) ?? [];
    return {
      'sprints': list.map((e) => SprintItem.fromJson(e as Map<String, dynamic>)).toList(),
      'activeSprint': data['activeSprint'] != null ? SprintItem.fromJson(data['activeSprint'] as Map<String, dynamic>) : null,
      'totalSprints': data['totalSprints'] ?? 0,
    };
  }

  Future<SprintItem> createSprint(String id, Map<String, dynamic> data) async {
    final res = await _client.dio.post(ApiEndpoints.pmoProjectSprints(id), data: data);
    final item = res.data['data'] ?? res.data;
    return SprintItem.fromJson(item as Map<String, dynamic>);
  }

  Future<bool> startSprint(String id, String sprintId) async {
    final res = await _client.dio.patch(ApiEndpoints.pmoProjectSprintStart(id, sprintId));
    return res.data?['success'] ?? true;
  }

  Future<Map<String, dynamic>> completeSprint(String id, String sprintId) async {
    final res = await _client.dio.patch(ApiEndpoints.pmoProjectSprintComplete(id, sprintId));
    return (res.data['data'] ?? res.data) as Map<String, dynamic>;
  }

  // ─── Interactive Kanban Board ───────────────────────────────────────────────
  Future<KanbanBoardData> getProjectKanban(String id, {String? sprintId}) async {
    final queryParams = <String, dynamic>{};
    if (sprintId != null) queryParams['sprintId'] = sprintId;

    final res = await _client.dio.get(
      ApiEndpoints.pmoProjectKanban(id),
      queryParameters: queryParams,
    );
    final data = res.data['data'] ?? res.data;
    return KanbanBoardData.fromJson(data as Map<String, dynamic>);
  }

  Future<bool> moveTaskStatus(String id, String taskId, String status, {String? blockedReason}) async {
    final res = await _client.dio.patch(
      ApiEndpoints.pmoProjectTaskStatus(id, taskId),
      data: {
        'status': status,
        if (blockedReason != null) 'blockedReason': blockedReason,
      },
    );
    return res.data?['success'] ?? true;
  }

  // ─── Interactive Gantt & Critical Path ──────────────────────────────────────
  Future<GanttAnalysisData> getProjectGantt(String id) async {
    final res = await _client.dio.get(ApiEndpoints.pmoProjectGantt(id));
    final data = res.data['data'] ?? res.data;
    return GanttAnalysisData.fromJson(data as Map<String, dynamic>);
  }
}
