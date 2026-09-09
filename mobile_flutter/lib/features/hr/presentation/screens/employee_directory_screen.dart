import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../../theme/theme.dart';
import '../../../../models/user_profile.dart';
import '../../../../core/widgets/shimmer_skeleton.dart';
import '../../../../core/widgets/enterprise_pull_to_refresh.dart';
import '../../../admin/data/admin_api.dart';
import '../../../admin/presentation/screens/user_dossier_screen.dart';
import '../../data/hr_api.dart';

class EmployeeDirectoryScreen extends StatefulWidget {
  final bool showBackButton;

  const EmployeeDirectoryScreen({super.key, this.showBackButton = false});

  @override
  State<EmployeeDirectoryScreen> createState() => _EmployeeDirectoryScreenState();
}

class _EmployeeDirectoryScreenState extends State<EmployeeDirectoryScreen> {
  final AdminApi _adminApi = AdminApi();
  final HrApi _hrApi = HrApi();
  final TextEditingController _searchController = TextEditingController();

  List<UserProfile> _employees = [];
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
    _fetchStaff();
    _fetchMeta();
  }

  void _fetchMeta() async {
    try {
      final depts = await _adminApi.getDepartments();
      final roles = await _adminApi.getRoles();
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

  Future<void> _fetchStaff() async {
    try {
      // Try admin users endpoint first for full workspace directory
      final res = await _adminApi.getUsers();
      if (mounted) {
        setState(() {
          _employees = res;
          _isLoading = false;
        });
      }
    } catch (_) {
      try {
        final staff = await _hrApi.getEmployees();
        if (mounted) {
          setState(() {
            _employees = staff;
            _isLoading = false;
          });
        }
      } catch (_) {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  List<UserProfile> get _filteredEmployees {
    final query = _searchController.text.trim().toLowerCase();

    return _employees.where((user) {
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
    if (filter == 'All') return _employees.length;
    return _employees.where((u) {
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
  // Add Employee with Credentials Modal (Matching Admin UI)
  // -------------------------------------------------------------
  void _showAddEmployeeModal() {
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
                              'Provision New Employee',
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

                  // ── Dual Action Bar (Cancel & Create Employee) ──
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
                              isSubmitting ? 'Creating Employee...' : 'Create Employee',
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
                                      final created = await _adminApi.createUser(
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
                                        _fetchStaff();
                                        _showCredentialsSuccessDialog(created, passCtrl.text.trim());
                                      }
                                    } catch (e) {
                                      setModalState(() => isSubmitting = false);
                                      String errorMsg = 'Failed to provision employee';
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
    _fetchStaff();
  }

  // -------------------------------------------------------------
  // Promote & Modify Personnel Modal (HR Specific)
  // -------------------------------------------------------------
  void _showPromotePersonnelModal(UserProfile emp) {
    final desigCtrl = TextEditingController(text: emp.designation ?? emp.role.name);
    final reasonCtrl = TextEditingController();
    String selectedDept = emp.department ?? 'Engineering';
    String selectedStatus = emp.status;
    String employmentType = emp.employmentType ?? 'Full-time';
    DateTime effectiveDate = DateTime.now();
    bool isSaving = false;

    final deptOptions = [
      'Engineering',
      'Product & Design',
      'Human Resources',
      'Management',
      'Operations',
      'Quality Assurance',
      'Data & Analytics',
    ];

    final statusOptions = [
      'Active',
      'On Probation',
      'On Notice',
      'Suspended',
      'Relieved',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: const Color(0xFFEDE9FE), borderRadius: BorderRadius.circular(10)),
                      child: const Icon(LucideIcons.trendingUp, size: 20, color: Color(0xFF7C3AED)),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Promote & Modify Personnel',
                          style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        ),
                        Text(
                          '${emp.name} • ${emp.employeeId ?? ""}',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 22, color: Color(0xFFE2E8F0)),

                TextField(
                  controller: desigCtrl,
                  decoration: InputDecoration(
                    labelText: 'Designation / Title *',
                    hintText: 'e.g. Senior Full Stack Engineer',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['Junior', 'Senior', 'Lead', 'Staff', 'Principal', 'Manager'].map((tag) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ActionChip(
                          label: Text('+ $tag', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                          backgroundColor: const Color(0xFFF1F5F9),
                          onPressed: () {
                            setModalState(() {
                              final current = desigCtrl.text.trim();
                              if (!current.contains(tag)) {
                                desigCtrl.text = '$tag $current'.trim();
                              }
                            });
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 12),

                DropdownButtonFormField<String>(
                  value: deptOptions.contains(selectedDept) ? selectedDept : deptOptions.first,
                  decoration: InputDecoration(
                    labelText: 'Department',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  items: deptOptions.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                  onChanged: (v) => setModalState(() => selectedDept = v ?? 'Engineering'),
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: statusOptions.contains(selectedStatus) ? selectedStatus : 'Active',
                        decoration: InputDecoration(
                          labelText: 'Employment Status',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                        items: statusOptions.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                        onChanged: (v) => setModalState(() => selectedStatus = v ?? 'Active'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: ['Full-time', 'Part-time', 'Contract'].contains(employmentType) ? employmentType : 'Full-time',
                        decoration: InputDecoration(
                          labelText: 'Type',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                        items: ['Full-time', 'Part-time', 'Contract'].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                        onChanged: (v) => setModalState(() => employmentType = v ?? 'Full-time'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: modalCtx,
                      initialDate: effectiveDate,
                      firstDate: DateTime(2025),
                      lastDate: DateTime.now().add(const Duration(days: 90)),
                    );
                    if (picked != null) {
                      setModalState(() => effectiveDate = picked);
                    }
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(LucideIcons.calendar, size: 16, color: Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Text('Effective: ${DateFormat("d MMM yyyy").format(effectiveDate)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                          ],
                        ),
                        const Icon(LucideIcons.chevronDown, size: 14, color: Color(0xFF64748B)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: reasonCtrl,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: 'HR Promotion / Transfer Justification',
                    hintText: 'e.g. Commendable performance in Q1-Q2 and technical leadership...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
                const SizedBox(height: 18),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: isSaving ? null : () async {
                      if (desigCtrl.text.trim().isEmpty) return;
                      setModalState(() => isSaving = true);
                      final updatedUser = await _hrApi.updateEmployeePersonnel(emp.id, {
                        'designation': desigCtrl.text.trim(),
                        'departmentName': selectedDept,
                        'status': selectedStatus,
                        'employmentType': employmentType,
                        'effectiveDate': effectiveDate.toIso8601String(),
                        'reason': reasonCtrl.text.trim().isNotEmpty
                            ? reasonCtrl.text.trim()
                            : 'Merit promotion and role alignment',
                      });
                      if (modalCtx.mounted) Navigator.pop(modalCtx);
                      if (updatedUser != null) {
                        _fetchStaff();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Personnel update saved! ${emp.name} is now ${desigCtrl.text.trim()}'),
                              backgroundColor: const Color(0xFF10B981),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7C3AED),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: isSaving
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Confirm Promotion & Update Journey', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _exportDirectoryCsv() {
    final buffer = StringBuffer();
    buffer.writeln('Employee ID,Name,Email,Role,Department,Employment Type,Project,Status');
    for (final u in _employees) {
      buffer.writeln(
        '"${u.employeeId ?? ""}","${u.name}","${u.email}","${u.role.name}","${u.department ?? ""}","${u.employmentType ?? ""}","${u.project?.name ?? "Bench"}","${u.isActive ? "Active" : "Disabled"}"',
      );
    }
    Clipboard.setData(ClipboardData(text: buffer.toString()));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Exported ${_employees.length} team members to CSV clipboard'),
        backgroundColor: const Color(0xFF16A34A),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredEmployees;

    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      body: SafeArea(
        child: EnterprisePullToRefresh(
          onRefresh: _fetchStaff,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Action Bar
                Row(
                  children: [
                    if (widget.showBackButton || Navigator.of(context).canPop()) ...[
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
                        'Employee Directory',
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
                      onPressed: _exportDirectoryCsv,
                    ),
                    const SizedBox(width: 6),
                    // Quick add employee pill button
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: _showAddEmployeeModal,
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
                                'Add Employee',
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
                                      '${_employees.length} team members registered',
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
                      onLongPress: () => _showPromotePersonnelModal(user),
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

                            // User Info with Wrap for badges
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
