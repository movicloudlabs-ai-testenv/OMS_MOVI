import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../theme/theme.dart';
import '../../../../models/user_profile.dart';
import '../../../../core/widgets/shimmer_skeleton.dart';
import '../../../../core/widgets/enterprise_pull_to_refresh.dart';
import '../../data/admin_api.dart';
import 'user_dossier_screen.dart';

class UserManagementScreen extends StatefulWidget {
  const UserManagementScreen({super.key});

  @override
  State<UserManagementScreen> createState() => _UserManagementScreenState();
}

class _UserManagementScreenState extends State<UserManagementScreen> {
  final AdminApi _api = AdminApi();
  final TextEditingController _searchController = TextEditingController();
  List<UserProfile> _users = [];
  List<Map<String, dynamic>> _dynamicDepartments = [];
  List<Map<String, dynamic>> _dynamicRoles = [];
  bool _isLoading = true;
  String _selectedRoleFilter = 'All';

  final List<String> _roleFilters = [
    'All',
    'Employee',
    'Intern',
    'PMO Lead',
    'HR Manager',
    'Admin',
  ];

  @override
  void initState() {
    super.initState();
    _fetchUsers();
    _fetchMeta();
  }

  void _fetchMeta() async {
    try {
      final depts = await _api.getDepartments();
      final roles = await _api.getRoles();
      if (mounted) {
        setState(() {
          _dynamicDepartments = depts;
          _dynamicRoles = roles;
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchUsers() async {
    try {
      final res = await _api.getUsers();
      if (mounted) {
        setState(() {
          _users = res;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<UserProfile> get _filteredUsers {
    final query = _searchController.text.trim().toLowerCase();

    return _users.where((user) {
      // 1. Role Filter
      if (_selectedRoleFilter != 'All') {
        final roleSlug = user.role.slug.toLowerCase();
        final roleName = user.role.name.toLowerCase();
        final empType = (user.employmentType ?? '').toLowerCase();

        switch (_selectedRoleFilter) {
          case 'Employee':
            final isEmp = roleSlug.contains('emp') ||
                roleName.contains('employee') ||
                empType.contains('full-time') ||
                empType.contains('employee');
            final isOther = roleSlug.contains('hr') ||
                roleSlug.contains('pmo') ||
                roleSlug.contains('admin') ||
                roleSlug.contains('intern');
            if (!isEmp && isOther) return false;
            break;
          case 'Intern':
            if (!roleSlug.contains('intern') &&
                !roleName.contains('intern') &&
                !empType.contains('intern')) {
              return false;
            }
            break;
          case 'PMO Lead':
            if (!roleSlug.contains('pmo') && !roleName.contains('pmo')) {
              return false;
            }
            break;
          case 'HR Manager':
            if (!roleSlug.contains('hr') && !roleName.contains('hr')) {
              return false;
            }
            break;
          case 'Admin':
            if (!roleSlug.contains('admin') && !roleName.contains('admin')) {
              return false;
            }
            break;
        }
      }

      // 2. Search Query
      if (query.isNotEmpty) {
        final nameMatch = user.name.toLowerCase().contains(query);
        final emailMatch = user.email.toLowerCase().contains(query);
        final deptMatch = user.department?.toLowerCase().contains(query) ?? false;
        final roleMatch = user.role.name.toLowerCase().contains(query);
        final idMatch = user.employeeId?.toLowerCase().contains(query) ?? false;
        final projMatch = user.project?.name.toLowerCase().contains(query) ?? false;
        return nameMatch || emailMatch || deptMatch || roleMatch || idMatch || projMatch;
      }

      return true;
    }).toList();
  }

  int _getCountForFilter(String filter) {
    if (filter == 'All') return _users.length;
    return _users.where((u) {
      final roleSlug = u.role.slug.toLowerCase();
      final roleName = u.role.name.toLowerCase();
      final empType = (u.employmentType ?? '').toLowerCase();

      switch (filter) {
        case 'Employee':
          final isEmp = roleSlug.contains('emp') ||
              roleName.contains('employee') ||
              empType.contains('full-time') ||
              empType.contains('employee');
          final isOther = roleSlug.contains('hr') ||
              roleSlug.contains('pmo') ||
              roleSlug.contains('admin') ||
              roleSlug.contains('intern');
          return isEmp && !isOther;
        case 'Intern':
          return roleSlug.contains('intern') || roleName.contains('intern') || empType.contains('intern');
        case 'PMO Lead':
          return roleSlug.contains('pmo') || roleName.contains('pmo');
        case 'HR Manager':
          return roleSlug.contains('hr') || roleName.contains('hr');
        case 'Admin':
          return roleSlug.contains('admin') || roleName.contains('admin');
        default:
          return true;
      }
    }).length;
  }

  // -------------------------------------------------------------
  // Add User with Credentials Modal
  // -------------------------------------------------------------
  void _showAddUserModal() {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final passCtrl = TextEditingController(
      text: 'OWMS@${(100000 + (DateTime.now().millisecondsSinceEpoch % 900000))}',
    );
    final phoneCtrl = TextEditingController();
    final designationCtrl = TextEditingController();

    // Map dynamic roles or fallback gracefully
    final List<Map<String, String>> roles = _dynamicRoles.isNotEmpty
        ? _dynamicRoles
            .map((r) => {
                  'label': (r['name'] ?? r['slug'] ?? 'Employee').toString(),
                  'value': (r['_id'] ?? r['slug'] ?? 'employee').toString(),
                })
            .toList()
        : [
            {'label': 'Employee', 'value': 'employee'},
            {'label': 'Intern', 'value': 'intern'},
            {'label': 'PMO Lead', 'value': 'pmo-lead'},
            {'label': 'HR Manager', 'value': 'hr-manager'},
            {'label': 'Admin', 'value': 'admin'},
          ];

    // Map dynamic departments or fallback gracefully
    final List<Map<String, String>> departments = _dynamicDepartments.isNotEmpty
        ? _dynamicDepartments
            .map((d) => {
                  'label': (d['name'] ?? d['code'] ?? 'Engineering').toString(),
                  'value': (d['_id'] ?? d['name'] ?? 'Engineering').toString(),
                })
            .toList()
        : [
            {'label': 'Engineering', 'value': 'Engineering'},
            {'label': 'Product & Design', 'value': 'Product & Design'},
            {'label': 'Human Resources', 'value': 'Human Resources'},
            {'label': 'PMO & Strategy', 'value': 'PMO & Strategy'},
            {'label': 'Finance & Operations', 'value': 'Finance & Operations'},
            {'label': 'Marketing', 'value': 'Marketing'},
          ];

    String selectedRole = roles.first['value']!;
    String selectedDept = departments.first['value']!;
    bool obscurePass = false;
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      elevation: 0,
      barrierColor: const Color(0x380F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.90,
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 12,
          ),
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Drag handle
                  Center(
                    child: Container(
                      width: 44,
                      height: 4.5,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Title & Close
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFDBEAFE)),
                        ),
                        child: const Icon(LucideIcons.userPlus, size: 20, color: Color(0xFF2563EB)),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Provision New User',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                                letterSpacing: -0.3,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Create account credentials & assign workspace role',
                              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Color(0xFFF1F5F9),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(LucideIcons.x, size: 16, color: Color(0xFF64748B)),
                        ),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const Divider(height: 24, color: Color(0xFFE2E8F0)),

                  // Full Name
                  const Text('Full Name *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: nameCtrl,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Name is required' : null,
                    decoration: InputDecoration(
                      hintText: 'e.g. David Miller',
                      prefixIcon: const Icon(LucideIcons.user, size: 18, color: Color(0xFF64748B)),
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Email
                  const Text('Work Email *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) => (v == null || !v.contains('@')) ? 'Valid work email required' : null,
                    decoration: InputDecoration(
                      hintText: 'e.g. david.miller@movicloudlabs.com',
                      prefixIcon: const Icon(LucideIcons.mail, size: 18, color: Color(0xFF64748B)),
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Credentials / Password
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Initial Password *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                      InkWell(
                        onTap: () {
                          setModalState(() {
                            passCtrl.text = 'OWMS@${(100000 + (DateTime.now().millisecondsSinceEpoch % 900000))}';
                          });
                        },
                        child: const Text('Generate New', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: passCtrl,
                    obscureText: obscurePass,
                    validator: (v) => (v == null || v.length < 8) ? 'Password must be at least 8 characters' : null,
                    decoration: InputDecoration(
                      prefixIcon: const Icon(LucideIcons.key, size: 18, color: Color(0xFF64748B)),
                      suffixIcon: IconButton(
                        icon: Icon(obscurePass ? LucideIcons.eyeOff : LucideIcons.eye, size: 18, color: const Color(0xFF64748B)),
                        onPressed: () => setModalState(() => obscurePass = !obscurePass),
                      ),
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // System Role
                  const Text('System Role *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: selectedRole,
                    isExpanded: true,
                    decoration: InputDecoration(
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      prefixIcon: const Icon(LucideIcons.shieldCheck, size: 18, color: Color(0xFF64748B)),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                    items: roles
                        .map((r) => DropdownMenuItem(
                              value: r['value'],
                              child: Text(r['label']!, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis),
                            ))
                        .toList(),
                    onChanged: (v) {
                      if (v != null) setModalState(() => selectedRole = v);
                    },
                  ),
                  const SizedBox(height: 14),

                  // Assigned Department
                  const Text('Assigned Department *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: selectedDept,
                    isExpanded: true,
                    decoration: InputDecoration(
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      prefixIcon: const Icon(LucideIcons.building2, size: 18, color: Color(0xFF64748B)),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                    items: departments
                        .map((d) => DropdownMenuItem(
                              value: d['value'],
                              child: Text(d['label']!, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis),
                            ))
                        .toList(),
                    onChanged: (v) {
                      if (v != null) setModalState(() => selectedDept = v);
                    },
                  ),
                  const SizedBox(height: 14),

                  // Designation & Phone
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Designation', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: designationCtrl,
                              decoration: InputDecoration(
                                hintText: 'e.g. Architect',
                                fillColor: const Color(0xFFF8FAFC),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Phone', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: phoneCtrl,
                              keyboardType: TextInputType.phone,
                              decoration: InputDecoration(
                                hintText: 'e.g. +1 555-0199',
                                fillColor: const Color(0xFFF8FAFC),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),

                  // ── Dual Action Bar (Cancel & Create User) ──
                  Row(
                    children: [
                      Expanded(
                        flex: 1,
                        child: SizedBox(
                          height: 48,
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFFCBD5E1)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              foregroundColor: const Color(0xFF475569),
                            ),
                            onPressed: isSubmitting ? null : () => Navigator.pop(ctx),
                            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: SizedBox(
                          height: 48,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppThemeColors.primary,
                              foregroundColor: Colors.white,
                              elevation: 2,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            icon: isSubmitting
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Icon(LucideIcons.userPlus, size: 17),
                            label: Text(
                              isSubmitting ? 'Creating User...' : 'Create User',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                            ),
                            onPressed: isSubmitting
                                ? null
                                : () async {
                                    if (!formKey.currentState!.validate()) return;
                                    setModalState(() => isSubmitting = true);
                                    final nav = Navigator.of(ctx);
                                    final messenger = ScaffoldMessenger.of(context);

                                    try {
                                      final isIntern = selectedRole.toLowerCase().contains('intern');
                                      final created = await _api.createUser(
                                        name: nameCtrl.text.trim(),
                                        email: emailCtrl.text.trim(),
                                        password: passCtrl.text.trim(),
                                        roleId: selectedRole,
                                        departmentId: selectedDept,
                                        designation: designationCtrl.text.trim(),
                                        phone: phoneCtrl.text.trim(),
                                        employmentType: isIntern ? 'Intern' : 'Full-time',
                                      );

                                      if (mounted) {
                                        nav.pop();
                                        _fetchUsers();
                                        _showCredentialsSuccessDialog(created, passCtrl.text.trim());
                                      }
                                    } catch (e) {
                                      setModalState(() => isSubmitting = false);
                                      String errorMsg = 'Failed to provision user';
                                      if (e is DioException) {
                                        final data = e.response?.data;
                                        if (data is Map && data['message'] != null) {
                                          errorMsg = data['message'].toString();
                                        } else if (data is Map && data['error'] != null) {
                                          errorMsg = data['error'].toString();
                                        } else if (e.message != null && e.message!.isNotEmpty) {
                                          errorMsg = e.message!;
                                        }
                                      } else {
                                        errorMsg = e.toString();
                                      }
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text(errorMsg),
                                          backgroundColor: AppThemeColors.danger,
                                          duration: const Duration(seconds: 4),
                                        ),
                                      );
                                    }
                                  },
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // Dialog: Display Newly Created Credentials
  // -------------------------------------------------------------
  void _showCredentialsSuccessDialog(UserProfile user, String password) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFDCFCE7),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(LucideIcons.checkCheck, size: 20, color: Color(0xFF16A34A)),
            ),
            const SizedBox(width: 12),
            const Text(
              'Account Provisioned',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${user.name} has been provisioned successfully in the workspace directory.',
              style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildCredentialRow('Employee ID', user.employeeId ?? 'EMP-2026-AUTO'),
                  const Divider(height: 12, color: Color(0xFFE2E8F0)),
                  _buildCredentialRow('Email', user.email),
                  const Divider(height: 12, color: Color(0xFFE2E8F0)),
                  _buildCredentialRow('Password', password, isCopyable: true),
                ],
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  Widget _buildCredentialRow(String label, String value, {bool isCopyable = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
        Row(
          children: [
            Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
            if (isCopyable) ...[
              const SizedBox(width: 6),
              InkWell(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: value));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Password copied to clipboard'), duration: Duration(seconds: 2)),
                  );
                },
                child: const Icon(LucideIcons.copy, size: 14, color: Color(0xFF2563EB)),
              ),
            ],
          ],
        ),
      ],
    );
  }

  // -------------------------------------------------------------
  // Open Personnel 360° Profile & Performance Dossier
  // -------------------------------------------------------------
  Future<void> _openUserDossier(UserProfile user) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => UserDossierScreen(
          userId: user.id,
          initialUser: user,
        ),
      ),
    );
    _fetchUsers();
  }



  void _exportUsersCsv() {
    final buffer = StringBuffer();
    buffer.writeln('Employee ID,Name,Email,Role,Department,Employment Type,Project,Status');
    for (final u in _users) {
      buffer.writeln(
        '"${u.employeeId ?? ""}","${u.name}","${u.email}","${u.role.name}","${u.department ?? ""}","${u.employmentType ?? ""}","${u.project?.name ?? "Bench"}","${u.isActive ? "Active" : "Disabled"}"',
      );
    }
    Clipboard.setData(ClipboardData(text: buffer.toString()));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Exported ${_users.length} team members to CSV clipboard'),
        backgroundColor: const Color(0xFF16A34A),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredUsers;

    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      body: SafeArea(
        child: EnterprisePullToRefresh(
          onRefresh: _fetchUsers,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Action Bar
                Row(
                  children: [
                    if (Navigator.of(context).canPop()) ...[
                      IconButton(
                        icon: const Icon(LucideIcons.arrowLeft, size: 20, color: Color(0xFF0F172A)),
                        onPressed: () => Navigator.of(context).pop(),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      const SizedBox(width: 12),
                    ],
                    const Expanded(
                      child: Text(
                        'User Management',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.4,
                        ),
                      ),
                    ),
                    // Export Directory CSV button
                    IconButton(
                      icon: Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFDBEAFE)),
                        ),
                        child: const Icon(LucideIcons.download, size: 16, color: Color(0xFF2563EB)),
                      ),
                      tooltip: 'Export Directory CSV',
                      onPressed: _exportUsersCsv,
                    ),
                    const SizedBox(width: 6),
                    // Quick add user pill button
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: _showAddUserModal,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF2563EB).withOpacity(0.30),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(LucideIcons.userPlus, size: 15, color: Colors.white),
                              SizedBox(width: 5),
                              Text(
                                'Add User',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                  letterSpacing: 0.1,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 14),

                // Hero Graphic Banner: 3D Holographic Team Ops
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0F172A).withOpacity(0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Stack(
                      children: [
                        Positioned(
                          right: -10,
                          top: -10,
                          bottom: -10,
                          width: 170,
                          child: Opacity(
                            opacity: 0.85,
                            child: Image.asset(
                              'assets/images/team_management_banner.jpg',
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => const SizedBox(),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(LucideIcons.users, size: 22, color: Color(0xFF2563EB)),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Workspace Directory',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${_users.length} team members registered',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF64748B),
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 14),

                // Search Bar
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Search by name, email, department, project...',
                      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                      prefixIcon: const Icon(LucideIcons.search, size: 18, color: Color(0xFF64748B)),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(LucideIcons.x, size: 16, color: Color(0xFF94A3B8)),
                              onPressed: () {
                                _searchController.clear();
                                setState(() {});
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                // Quick Role Filters (Pill Carousel with live counts)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: _roleFilters.map((filter) {
                      final isSelected = _selectedRoleFilter == filter;
                      final count = _getCountForFilter(filter);

                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: InkWell(
                          onTap: () {
                            HapticFeedback.selectionClick();
                            setState(() => _selectedRoleFilter = filter);
                          },
                          borderRadius: BorderRadius.circular(20),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFFEFF6FF) : Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                                width: isSelected ? 1.5 : 1.0,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  filter,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                    color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF475569),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    '$count',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: isSelected ? Colors.white : const Color(0xFF64748B),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),

                const SizedBox(height: 14),

                // User List (Enterprise Shimmer Skeleton)
                if (_isLoading)
                  const ShimmerLoading(
                    isLoading: true,
                    child: Column(
                      children: [
                        SkeletonUserCard(),
                        SkeletonUserCard(),
                        SkeletonUserCard(),
                        SkeletonUserCard(),
                      ],
                    ),
                  )
                else if (filtered.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: const [
                        Icon(LucideIcons.userX, size: 32, color: Color(0xFF94A3B8)),
                        SizedBox(height: 10),
                        Text(
                          'No team members match this filter',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Try clearing your search query or selecting "All".',
                          style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  )
                else
                  ...filtered.map(
                    (user) => InkWell(
                      onTap: () => _openUserDossier(user),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF0F172A).withOpacity(0.03),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Avatar
                            CircleAvatar(
                              radius: 20,
                              backgroundColor: const Color(0xFFEFF6FF),
                              child: Text(
                                user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF2563EB),
                                  fontSize: 15,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),

                            // User Info with Wrap for badges (Fixes 17px/11px overflow)
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          user.name,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFF0F172A),
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: user.isActive ? const Color(0xFFECFDF5) : const Color(0xFFFEE2E2),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          user.isActive ? 'ACTIVE' : 'DISABLED',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w800,
                                            color: user.isActive ? const Color(0xFF065F46) : const Color(0xFFDC2626),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    user.email,
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 6),

                                  // Zero-Overflow Badges: Role, Department, and Project
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 4,
                                    children: [
                                      // Role Badge
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFEFF6FF),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          user.role.name.toUpperCase(),
                                          style: const TextStyle(
                                            fontSize: 9.5,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFF2563EB),
                                          ),
                                        ),
                                      ),

                                      // Department Badge
                                      if (user.department != null && user.department!.isNotEmpty)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF1F5F9),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            user.department!.toUpperCase(),
                                            style: const TextStyle(
                                              fontSize: 9.5,
                                              fontWeight: FontWeight.w700,
                                              color: Color(0xFF475569),
                                            ),
                                          ),
                                        ),

                                      // Assigned Project Badge
                                      if (user.project != null)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF0FDF4),
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(color: const Color(0xFFDCFCE7)),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(LucideIcons.folder, size: 10, color: Color(0xFF16A34A)),
                                              const SizedBox(width: 3),
                                              Text(
                                                user.project!.name,
                                                style: const TextStyle(
                                                  fontSize: 9.5,
                                                  fontWeight: FontWeight.w700,
                                                  color: Color(0xFF16A34A),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ),

                            // Trailing Chevron
                            const Padding(
                              padding: EdgeInsets.only(top: 8),
                              child: Icon(LucideIcons.chevronRight, size: 16, color: Color(0xFF94A3B8)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                // Floating Nav padding clearance
                const SizedBox(height: 90),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
