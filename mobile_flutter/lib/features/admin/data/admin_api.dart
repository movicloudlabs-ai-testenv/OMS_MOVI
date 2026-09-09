import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../models/user_profile.dart';
import '../../../models/audit_log_item.dart';

class AdminDashboardStats {
  final int totalUsers;
  final int activeProjects;
  final int todayAttendance;
  final int pendingLeaves;
  final bool apiServer;
  final bool dbConnected;
  final int usersOnline;
  final int uptimeSec;

  AdminDashboardStats({
    required this.totalUsers,
    required this.activeProjects,
    required this.todayAttendance,
    required this.pendingLeaves,
    this.apiServer = true,
    this.dbConnected = true,
    this.usersOnline = 1,
    this.uptimeSec = 0,
  });

  factory AdminDashboardStats.fromJson(Map<String, dynamic> json) {
    final health = json['health'] is Map ? json['health'] as Map : null;
    return AdminDashboardStats(
      totalUsers: (json['totalUsers'] as num?)?.toInt() ?? 0,
      activeProjects: (json['activeProjects'] as num?)?.toInt() ?? 0,
      todayAttendance: (json['todayAttendance'] as num?)?.toInt() ?? 0,
      pendingLeaves: (json['pendingLeaves'] as num?)?.toInt() ?? 0,
      apiServer: health?['apiServer'] == true,
      dbConnected: health?['dbConnected'] == true,
      usersOnline: (json['usersOnline'] as num?)?.toInt() ?? 1,
      uptimeSec: (health?['uptimeSec'] as num?)?.toInt() ?? 0,
    );
  }
}

class AdminApi {
  final ApiClient _client = ApiClient();

  Future<AdminDashboardStats> getSystemStats() async {
    final res = await _client.dio.get(ApiEndpoints.adminStats);
    return AdminDashboardStats.fromJson(res.data['data'] ?? res.data);
  }

  Future<List<UserProfile>> getUsers() async {
    final res = await _client.dio.get(ApiEndpoints.adminUsers);
    final list = (res.data['data'] ?? res.data) as List;
    return list.map((e) => UserProfile.fromJson(e)).toList();
  }

  Future<UserProfile> getUserDetails(String id) async {
    final res = await _client.dio.get('${ApiEndpoints.adminUsers}/$id');
    return UserProfile.fromJson(res.data['data'] ?? res.data);
  }

  Future<UserProfile> createUser({
    required String name,
    required String email,
    required String password,
    required String roleId,
    String? departmentId,
    String? designation,
    String? phone,
    String? employmentType,
  }) async {
    final payload = {
      'name': name,
      'email': email,
      'password': password,
      'role': roleId,
      if (departmentId != null && departmentId.isNotEmpty) 'department': departmentId,
      if (designation != null && designation.isNotEmpty) 'designation': designation,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      if (employmentType != null && employmentType.isNotEmpty) 'employmentType': employmentType,
    };
    final res = await _client.dio.post(ApiEndpoints.adminUsers, data: payload);
    return UserProfile.fromJson(res.data['data'] ?? res.data);
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

  Future<List<Map<String, dynamic>>> getRoles() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.adminRoles);
      final list = (res.data['data'] ?? res.data) as List;
      return list.cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<List<AuditLogItem>> getAuditLogs({int page = 1, int limit = 20}) async {
    final res = await _client.dio.get('${ApiEndpoints.adminLogs}?page=$page&limit=$limit');
    final list = (res.data['data'] ?? res.data) as List;
    return list.map((e) => AuditLogItem.fromJson(e)).toList();
  }

  Future<bool> updateUserStatus(String userId, String status) async {
    try {
      final res = await _client.dio.patch(
        '${ApiEndpoints.adminUsers}/$userId/status',
        data: {'status': status},
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> getUserFullDossier(String id) async {
    final res = await _client.dio.get('${ApiEndpoints.adminUsers}/$id');
    final data = res.data['data'] ?? res.data;
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    return {};
  }

  Future<List<Map<String, dynamic>>> getUserProjects(String userId) async {
    try {
      final res = await _client.dio.get('${ApiEndpoints.adminUsers}/$userId/projects');
      final list = (res.data['data'] ?? res.data) as List;
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getAllProjects() async {
    try {
      final res = await _client.dio.get(ApiEndpoints.pmoProjects);
      final raw = res.data['data'] ?? res.data;
      if (raw is List) {
        return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      } else if (raw is Map && raw['projects'] is List) {
        return (raw['projects'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<bool> assignUserToProject(String userId, String projectId) async {
    try {
      final res = await _client.dio.put(
        '${ApiEndpoints.adminUsers}/$userId',
        data: {'project': projectId},
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<String?> resetUserPassword(String userId) async {
    try {
      final res = await _client.dio.post('${ApiEndpoints.adminUsers}/$userId/reset-password');
      final data = res.data['data'] ?? res.data;
      return data['tempPassword']?.toString();
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> getUserDeletionImpact(String userId) async {
    try {
      final res = await _client.dio.get('${ApiEndpoints.adminUsers}/$userId/deletion-impact');
      final data = res.data['data'] ?? res.data;
      if (data is Map) return Map<String, dynamic>.from(data);
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<bool> deleteUser(String userId, {String? reason}) async {
    try {
      final res = await _client.dio.delete(
        '${ApiEndpoints.adminUsers}/$userId',
        data: {'reason': reason ?? 'Archived by administrator'},
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
