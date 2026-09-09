import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../theme/theme.dart';
import '../../../../models/project_item.dart';
import '../../../../core/widgets/shimmer_skeleton.dart';
import '../../../../core/widgets/enterprise_pull_to_refresh.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../intern/presentation/screens/intern_team_screen.dart';
import '../../data/pmo_api.dart';
import 'project_dossier_screen.dart';

/// ── WORKSPACE PROJECTS DIRECTORY ─────────────────────────────────────────────
/// Linear & Jira inspired high-density project portfolio hub with live search,
/// health indicators, progress rings, budget utilization, and provisioning modal.
class ProjectManagementScreen extends ConsumerStatefulWidget {
  const ProjectManagementScreen({super.key});

  @override
  ConsumerState<ProjectManagementScreen> createState() => _ProjectManagementScreenState();
}

class _ProjectManagementScreenState extends ConsumerState<ProjectManagementScreen> {
  final PmoApi _api = PmoApi();
  final TextEditingController _searchController = TextEditingController();

  List<ProjectItem> _projects = [];
  List<Map<String, dynamic>> _departments = [];
  bool _isLoading = true;
  String _selectedStatusFilter = 'All';

  final List<String> _statusFilters = [
    'All',
    'Leading',
    'Contributing',
    'Active',
    'Planning',
    'Completed',
    'On Hold',
  ];

  @override
  void initState() {
    super.initState();
    _fetchProjects();
    _fetchDepartments();
  }

  Future<void> _fetchDepartments() async {
    try {
      final depts = await _api.getDepartments();
      if (mounted && depts.isNotEmpty) {
        setState(() => _departments = depts);
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchProjects() async {
    try {
      final res = await _api.getProjects();
      if (mounted) {
        setState(() {
          _projects = res;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _normalizeStatus(String raw) {
    final s = raw.trim().toLowerCase();
    if (s == 'in progress' || s == 'active') return 'active';
    if (s == 'planning') return 'planning';
    if (s == 'completed' || s == 'done') return 'completed';
    if (s == 'on hold' || s == 'on-hold' || s == 'paused') return 'on hold';
    if (s == 'cancelled' || s == 'canceled') return 'cancelled';
    return s;
  }

  List<ProjectItem> get _filteredProjects {
    final currentUserId = ref.read(authProvider).user?.id ?? '';
    final query = _searchController.text.trim().toLowerCase();
    return _projects.where((p) {
      if (_selectedStatusFilter == 'Leading') {
        if (!p.isUserLead(currentUserId)) return false;
      } else if (_selectedStatusFilter == 'Contributing') {
        if (!p.isUserMember(currentUserId)) return false;
      } else if (_selectedStatusFilter != 'All' && _normalizeStatus(p.status) != _normalizeStatus(_selectedStatusFilter)) {
        return false;
      }
      if (query.isEmpty) return true;
      return p.name.toLowerCase().contains(query) ||
          p.code.toLowerCase().contains(query) ||
          (p.departmentName ?? '').toLowerCase().contains(query) ||
          (p.description ?? '').toLowerCase().contains(query);
    }).toList();
  }

  int _getCountForFilter(String filter) {
    final currentUserId = ref.read(authProvider).user?.id ?? '';
    if (filter == 'All') return _projects.length;
    if (filter == 'Leading') return _projects.where((p) => p.isUserLead(currentUserId)).length;
    if (filter == 'Contributing') return _projects.where((p) => p.isUserMember(currentUserId)).length;
    final target = _normalizeStatus(filter);
    return _projects.where((p) => _normalizeStatus(p.status) == target).length;
  }

  void _exportProjectsCsv() {
    final buffer = StringBuffer();
    buffer.writeln('Code,Name,Department,Status,Health,Priority,Completion%,Version,Cadence,Channel,TeamSize,Bugs');
    for (final p in _projects) {
      buffer.writeln(
        '"${p.code}","${p.name}","${p.departmentName ?? ""}","${p.status}","${p.healthStatus}","${p.priority}",${p.completionPercent},"${p.currentVersion}","${p.releaseCadence}","${p.targetChannel}",${p.teamCount},${p.activeBugsCount}',
      );
    }
    Clipboard.setData(ClipboardData(text: buffer.toString()));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Exported ${_projects.length} projects to CSV clipboard'),
        backgroundColor: const Color(0xFF16A34A),
      ),
    );
  }

  void _openProjectDossier(ProjectItem project) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProjectDossierScreen(
          projectId: project.id,
          initialProject: project,
        ),
      ),
    );
    _fetchProjects();
  }

  // ─── PROVISION NEW PROJECT MODAL ───────────────────────────────────────────
  void _showCreateProjectModal() {
    final authState = ref.read(authProvider);
    final roleSlug = authState.roleSlug.toLowerCase();
    final roleName = (authState.user?.role.name ?? '').toLowerCase();
    final canCreateProject = roleSlug.contains('admin') ||
        roleName.contains('admin') ||
        roleSlug.contains('hr') ||
        roleName.contains('hr');

    if (!canCreateProject) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Access restricted: Only Admin and HR can create new projects.'),
          backgroundColor: Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final versionCtrl = TextEditingController(text: 'v1.0.0');
    final repoCtrl = TextEditingController();
    final releaseNotesCtrl = TextEditingController();
    final customTechCtrl = TextEditingController();

    final scrollController = ScrollController();

    final availableDepts = _departments.isNotEmpty
        ? _departments
        : [
            {'_id': '6a9ac39305ac3b678ebf5e43', 'name': 'Engineering'},
            {'_id': '6a9ac39305ac3b678ebf5e45', 'name': 'Project Management'},
            {'_id': '6a9ac39305ac3b678ebf5e44', 'name': 'Human Resources'},
          ];

    String selectedDeptId = availableDepts.first['_id']?.toString() ?? '6a9ac39305ac3b678ebf5e43';
    String selectedPriority = 'Medium';
    String selectedCadence = 'Bi-weekly Sprint';
    String selectedChannel = 'Production';
    DateTime startDate = DateTime.now();
    DateTime endDate = DateTime.now().add(const Duration(days: 90));
    bool isSubmitting = false;
    String? modalError;

    final releaseCadences = [
      'Continuous Delivery',
      'Bi-weekly Sprint',
      'Monthly Release',
      'Quarterly Milestone',
    ];

    final targetChannels = [
      'Production',
      'Staging',
      'QA',
      'Development',
    ];

    final popularTechs = [
      'Flutter',
      'Node.js',
      'MongoDB',
      'Docker',
      'AWS',
      'PostgreSQL',
      'TypeScript',
      'Python',
    ];

    final Set<String> selectedTechStack = {'Flutter', 'Node.js'};

    // Helper to calculate project key preview
    String getProjectKeyPreview(String name) {
      if (name.trim().isEmpty) return 'PRJ-${DateTime.now().year}';
      final parts = name.trim().split(RegExp(r'\s+'));
      String prefix;
      if (parts.length >= 2) {
        prefix = (parts[0][0] + parts[1][0]).toUpperCase();
      } else {
        prefix = parts[0].substring(0, parts[0].length >= 3 ? 3 : parts[0].length).toUpperCase();
      }
      return '$prefix-${DateTime.now().year}';
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          final durationDays = endDate.difference(startDate).inDays;

          return Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.92,
            ),
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              left: 20,
              right: 20,
              top: 10,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Top drag handle
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

                // Top Header Row with Icon, Title, Subtitle, and Close 'X'
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(9),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFDBEAFE)),
                      ),
                      child: const Icon(LucideIcons.folderPlus, size: 20, color: Color(0xFF2563EB)),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Create New Project',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              letterSpacing: -0.3,
                            ),
                          ),
                          SizedBox(height: 1),
                          Text(
                            'Configure scope, delivery roadmap & tech stack',
                            style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                    InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () => Navigator.of(ctx).pop(),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Icon(LucideIcons.x, size: 16, color: Color(0xFF64748B)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 12),

                // Scrollable Form Body
                Flexible(
                  child: SingleChildScrollView(
                    controller: scrollController,
                    physics: const BouncingScrollPhysics(),
                    child: Form(
                      key: formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // ── SECTION 1: GENERAL DETAILS ──
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Project Name *',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFDBEAFE)),
                                ),
                                child: Text(
                                  'KEY: ${getProjectKeyPreview(nameCtrl.text)}',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF2563EB),
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: nameCtrl,
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Project name is required' : null,
                            onChanged: (_) => setModalState(() {}),
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              hintText: 'e.g. Next-Gen Mobile Core Architecture',
                              hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                              prefixIcon: const Icon(LucideIcons.folder, size: 16, color: Color(0xFF64748B)),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Executive Description
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Executive Description',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                              ),
                              const Text(
                                'Optional',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF94A3B8)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: descCtrl,
                            maxLines: 2,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              hintText: 'Strategic objectives, deliverables & core capabilities overview...',
                              hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            ),
                          ),
                          const SizedBox(height: 14),

                          // ── SECTION 2: GOVERNANCE & TIMELINE ──
                          const Text(
                            'GOVERNANCE & TIMELINE',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.7,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 8),

                          Row(
                            children: [
                              // Department Dropdown
                              Expanded(
                                flex: 6,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Department *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                                    const SizedBox(height: 5),
                                    DropdownButtonFormField<String>(
                                      value: selectedDeptId,
                                      isExpanded: true,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                                      items: availableDepts
                                          .map((d) => DropdownMenuItem(
                                                value: d['_id']?.toString() ?? '',
                                                child: Text(d['name']?.toString() ?? 'Department', overflow: TextOverflow.ellipsis),
                                              ))
                                          .toList(),
                                      onChanged: (v) {
                                        if (v != null) setModalState(() => selectedDeptId = v);
                                      },
                                      decoration: InputDecoration(
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        prefixIcon: const Icon(LucideIcons.building2, size: 15, color: Color(0xFF64748B)),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              // Priority Dropdown with colored pills
                              Expanded(
                                flex: 5,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Priority *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                                    const SizedBox(height: 5),
                                    DropdownButtonFormField<String>(
                                      value: selectedPriority,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                                      items: [
                                        {'label': 'Critical', 'color': const Color(0xFFEF4444)},
                                        {'label': 'High', 'color': const Color(0xFFF97316)},
                                        {'label': 'Medium', 'color': const Color(0xFF2563EB)},
                                        {'label': 'Low', 'color': const Color(0xFF64748B)},
                                      ].map((p) {
                                        final color = p['color'] as Color;
                                        final label = p['label'] as String;
                                        return DropdownMenuItem(
                                          value: label,
                                          child: Row(
                                            children: [
                                              Container(
                                                width: 7,
                                                height: 7,
                                                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                                              ),
                                              const SizedBox(width: 6),
                                              Text(label),
                                            ],
                                          ),
                                        );
                                      }).toList(),
                                      onChanged: (v) => setModalState(() => selectedPriority = v!),
                                      decoration: InputDecoration(
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Target Delivery Date Selector
                          InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: endDate,
                                firstDate: DateTime.now(),
                                lastDate: DateTime.now().add(const Duration(days: 1825)),
                                builder: (context, child) {
                                  return Theme(
                                    data: Theme.of(context).copyWith(
                                      colorScheme: const ColorScheme.light(
                                        primary: Color(0xFF2563EB),
                                        onPrimary: Colors.white,
                                        onSurface: Color(0xFF0F172A),
                                      ),
                                    ),
                                    child: child!,
                                  );
                                },
                              );
                              if (picked != null) {
                                setModalState(() => endDate = picked);
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(LucideIcons.calendar, size: 16, color: Color(0xFF2563EB)),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Target Delivery Date',
                                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                                        ),
                                        Text(
                                          DateFormat('MMM dd, yyyy').format(endDate),
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEFF6FF),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      '$durationDays days',
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF2563EB),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),

                          // ── SECTION 3: VERSION RELEASE & ARCHITECTURE ──
                          const Text(
                            'VERSION RELEASE & ARCHITECTURE',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.7,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Initial Version Tag & Target Channel Row
                          Row(
                            children: [
                              // Initial Version Tag (SemVer)
                              Expanded(
                                flex: 5,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        const Text('Initial Version *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                                        const SizedBox(width: 4),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFEFF6FF),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: const Text('SemVer', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF2563EB), fontFamily: 'monospace')),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 5),
                                    TextFormField(
                                      controller: versionCtrl,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A), fontFamily: 'monospace'),
                                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Version is required' : null,
                                      decoration: InputDecoration(
                                        hintText: 'v1.0.0',
                                        hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8), fontFamily: 'monospace'),
                                        prefixIcon: const Icon(LucideIcons.tag, size: 15, color: Color(0xFF2563EB)),
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              // Target Release Channel
                              Expanded(
                                flex: 6,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Target Channel *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                                    const SizedBox(height: 5),
                                    DropdownButtonFormField<String>(
                                      value: selectedChannel,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                                      items: targetChannels
                                          .map((ch) => DropdownMenuItem(
                                                value: ch,
                                                child: Row(
                                                  children: [
                                                    Icon(
                                                      ch == 'Production' ? LucideIcons.shieldCheck : LucideIcons.layers,
                                                      size: 14,
                                                      color: ch == 'Production' ? const Color(0xFF10B981) : const Color(0xFF2563EB),
                                                    ),
                                                    const SizedBox(width: 6),
                                                    Text(ch),
                                                  ],
                                                ),
                                              ))
                                          .toList(),
                                      onChanged: (v) => setModalState(() => selectedChannel = v!),
                                      decoration: InputDecoration(
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),

                          // Release Cadence & Repository URL Row
                          Row(
                            children: [
                              // Cadence
                              Expanded(
                                flex: 5,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Release Cadence *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                                    const SizedBox(height: 5),
                                    DropdownButtonFormField<String>(
                                      value: selectedCadence,
                                      isExpanded: true,
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                                      items: releaseCadences
                                          .map((c) => DropdownMenuItem(
                                                value: c,
                                                child: Text(c, overflow: TextOverflow.ellipsis),
                                              ))
                                          .toList(),
                                      onChanged: (v) => setModalState(() => selectedCadence = v!),
                                      decoration: InputDecoration(
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        prefixIcon: const Icon(LucideIcons.repeat, size: 14, color: Color(0xFF64748B)),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              // Repository URL
                              Expanded(
                                flex: 6,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Repository URL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                                    const SizedBox(height: 5),
                                    TextFormField(
                                      controller: repoCtrl,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                                      decoration: InputDecoration(
                                        hintText: 'github.com/repo',
                                        hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                                        prefixIcon: const Icon(LucideIcons.gitFork, size: 15, color: Color(0xFF64748B)),
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),

                          // Initial Release Notes (Changelog)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Initial Release Notes',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                              ),
                              const Text(
                                'Scope baseline',
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: Color(0xFF94A3B8)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 5),
                          TextFormField(
                            controller: releaseNotesCtrl,
                            maxLines: 2,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              hintText: 'e.g. Initial v1.0.0 baseline release with core architecture & auth pipeline.',
                              hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                              prefixIcon: const Padding(
                                padding: EdgeInsets.only(bottom: 18),
                                child: Icon(LucideIcons.fileText, size: 14, color: Color(0xFF64748B)),
                              ),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Tech Stack Quick Chips
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Tech Stack',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                              ),
                              Text(
                                '${selectedTechStack.length} selected',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF2563EB)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: popularTechs.map((tech) {
                              final isSelected = selectedTechStack.contains(tech);
                              return InkWell(
                                borderRadius: BorderRadius.circular(8),
                                onTap: () {
                                  HapticFeedback.lightImpact();
                                  setModalState(() {
                                    if (isSelected) {
                                      selectedTechStack.remove(tech);
                                    } else {
                                      selectedTechStack.add(tech);
                                    }
                                  });
                                },
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 150),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: isSelected ? const Color(0xFF1D4ED8) : const Color(0xFFE2E8F0),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (isSelected) ...[
                                        const Icon(LucideIcons.check, size: 12, color: Colors.white),
                                        const SizedBox(width: 4),
                                      ],
                                      Text(
                                        tech,
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: isSelected ? Colors.white : const Color(0xFF475569),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 8),

                          // Custom Tech Tag input
                          TextFormField(
                            controller: customTechCtrl,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              hintText: 'Add custom tags (press + or comma separated)',
                              hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                              prefixIcon: const Icon(LucideIcons.code, size: 14, color: Color(0xFF64748B)),
                              suffixIcon: IconButton(
                                icon: const Icon(LucideIcons.plus, size: 16, color: Color(0xFF2563EB)),
                                onPressed: () {
                                  final tag = customTechCtrl.text.trim();
                                  if (tag.isNotEmpty) {
                                    setModalState(() {
                                      selectedTechStack.add(tag);
                                      customTechCtrl.clear();
                                    });
                                  }
                                },
                              ),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                          const SizedBox(height: 18),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 10),
                if (modalError != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFECACA)),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.alertCircle, size: 16, color: Color(0xFFDC2626)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            modalError!,
                            style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626), fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 12),

                // ── DUAL ACTION BAR (CANCEL & CREATE PROJECT) ──
                Row(
                  children: [
                    // Secondary Action: Cancel
                    Expanded(
                      flex: 1,
                      child: SizedBox(
                        height: 46,
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFFCBD5E1)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            foregroundColor: const Color(0xFF475569),
                          ),
                          onPressed: isSubmitting ? null : () => Navigator.of(ctx).pop(),
                          child: const Text(
                            'Cancel',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Primary Action: Create Project
                    Expanded(
                      flex: 2,
                      child: SizedBox(
                        height: 46,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                            elevation: 2,
                            shadowColor: const Color(0xFF2563EB).withOpacity(0.35),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: isSubmitting
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : const Icon(LucideIcons.arrowRight, size: 16),
                          label: Text(
                            isSubmitting ? 'Creating Project...' : 'Create Project',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                          onPressed: isSubmitting
                              ? null
                              : () async {
                                  if (!formKey.currentState!.validate()) {
                                    scrollController.animateTo(
                                      0,
                                      duration: const Duration(milliseconds: 300),
                                      curve: Curves.easeOut,
                                    );
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Please enter a valid Project Name and required fields.'),
                                        backgroundColor: Color(0xFFF59E0B),
                                        behavior: SnackBarBehavior.floating,
                                      ),
                                    );
                                    return;
                                  }
                                  setModalState(() {
                                    isSubmitting = true;
                                    modalError = null;
                                  });
                                  final nav = Navigator.of(ctx);
                                  final messenger = ScaffoldMessenger.of(context);

                                  try {
                                    // Add any unsubmitted custom tag
                                    final extra = customTechCtrl.text.trim();
                                    if (extra.isNotEmpty) {
                                      selectedTechStack.add(extra);
                                    }

                                    final created = await _api.createProject({
                                      'name': nameCtrl.text.trim(),
                                      'description': descCtrl.text.trim(),
                                      'department': selectedDeptId,
                                      'priority': selectedPriority,
                                      'currentVersion': versionCtrl.text.trim().isEmpty ? 'v1.0.0' : versionCtrl.text.trim(),
                                      'initialVersion': versionCtrl.text.trim().isEmpty ? 'v1.0.0' : versionCtrl.text.trim(),
                                      'releaseCadence': selectedCadence,
                                      'targetChannel': selectedChannel,
                                      'releaseNotes': releaseNotesCtrl.text.trim(),
                                      'startDate': startDate.toIso8601String(),
                                      'endDate': endDate.toIso8601String(),
                                      'repositoryUrl': repoCtrl.text.trim(),
                                      'techStack': selectedTechStack.toList(),
                                    });

                                    if (mounted) {
                                      nav.pop();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text('Project "${created.name}" created successfully!'),
                                          backgroundColor: const Color(0xFF16A34A),
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                      _fetchProjects();
                                      _openProjectDossier(created);
                                    }
                                  } catch (e) {
                                    String errorMsg = e.toString();
                                    if (e is DioException && e.response?.data != null) {
                                      final resData = e.response!.data;
                                      if (resData is Map && resData['message'] != null) {
                                        errorMsg = resData['message'].toString();
                                      }
                                    }
                                    setModalState(() {
                                      isSubmitting = false;
                                      modalError = errorMsg;
                                    });
                                    messenger.showSnackBar(
                                      SnackBar(
                                        content: Text('Failed to create project: $errorMsg'),
                                        backgroundColor: AppThemeColors.danger,
                                        behavior: SnackBarBehavior.floating,
                                      ),
                                    );
                                  }
                                },
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ─── QUICK STATUS UPDATE ───────────────────────────────────────────────────
  Future<void> _updateProjectStatus(ProjectItem project, String newStatus) async {
    try {
      await _api.updateProject(project.id, {'status': newStatus});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Status updated to "$newStatus" for ${project.code}'),
            backgroundColor: const Color(0xFF16A34A),
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchProjects();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update status: $e'),
            backgroundColor: AppThemeColors.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  // ─── CONFIRM DELETE PROJECT MODAL ──────────────────────────────────────────
  Future<bool> _confirmDeleteProject(ProjectItem project) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(LucideIcons.trash2, size: 20, color: Color(0xFFEF4444)),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Delete Project?',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you sure you want to delete "${project.name}" (${project.code})?',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
            ),
            const SizedBox(height: 8),
            const Text(
              'This action is irreversible. Associated milestones, sprints, tasks, and credentials will be removed.',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.3),
            ),
          ],
        ),
        actions: [
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFFCBD5E1)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF475569), fontWeight: FontWeight.w700)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete Permanently', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _api.deleteProject(project.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Project "${project.name}" deleted successfully.'),
              backgroundColor: const Color(0xFF16A34A),
              behavior: SnackBarBehavior.floating,
            ),
          );
          _fetchProjects();
        }
        return true;
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete project: $e'),
              backgroundColor: AppThemeColors.danger,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
        return false;
      }
    }
    return false;
  }

  // ─── EDIT PROJECT MODAL ───────────────────────────────────────────────────
  void _showEditProjectModal(ProjectItem project) {
    final formKey = GlobalKey<FormState>();
    final scrollController = ScrollController();
    final nameCtrl = TextEditingController(text: project.name);
    final descCtrl = TextEditingController(text: project.description ?? '');
    final versionCtrl = TextEditingController(text: project.currentVersion);
    final repoCtrl = TextEditingController(text: project.repositoryUrl ?? '');
    final releaseNotesCtrl = TextEditingController(text: project.releaseNotes ?? '');
    final customTechCtrl = TextEditingController();

    final availableDepts = _departments.isNotEmpty
        ? _departments
        : [
            {'_id': '6a9ac39305ac3b678ebf5e43', 'name': 'Engineering'},
            {'_id': '6a9ac39305ac3b678ebf5e45', 'name': 'Project Management'},
            {'_id': '6a9ac39305ac3b678ebf5e44', 'name': 'Human Resources'},
          ];

    String selectedDeptId = availableDepts.first['_id']?.toString() ?? '6a9ac39305ac3b678ebf5e43';
    for (final d in availableDepts) {
      if (d['name'] == project.departmentName || d['_id'] == project.departmentName) {
        selectedDeptId = d['_id']?.toString() ?? selectedDeptId;
        break;
      }
    }

    String selectedStatus = project.status;
    String selectedPriority = project.priority;
    String selectedCadence = project.releaseCadence;
    String selectedChannel = project.targetChannel;
    bool isSubmitting = false;

    final statuses = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];

    final releaseCadences = [
      'Continuous Delivery',
      'Bi-weekly Sprint',
      'Monthly Release',
      'Quarterly Milestone',
    ];

    final targetChannels = [
      'Production',
      'Staging',
      'QA',
      'Development',
    ];

    final popularTechs = [
      'Flutter',
      'Node.js',
      'MongoDB',
      'Docker',
      'AWS',
      'PostgreSQL',
      'TypeScript',
      'Python',
    ];

    final Set<String> selectedTechStack = Set<String>.from(project.techStack);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.92,
            ),
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              left: 20,
              right: 20,
              top: 10,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
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

                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(9),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFDBEAFE)),
                      ),
                      child: const Icon(LucideIcons.edit3, size: 20, color: Color(0xFF2563EB)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Edit Project Scope',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 1),
                          Text(
                            'Updating ${project.code} • Governance & Deliverables',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                    InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () => Navigator.of(ctx).pop(),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Icon(LucideIcons.x, size: 16, color: Color(0xFF64748B)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 12),

                Flexible(
                  child: SingleChildScrollView(
                    controller: scrollController,
                    physics: const BouncingScrollPhysics(),
                    child: Form(
                      key: formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Project Name *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: nameCtrl,
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Project name is required' : null,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              prefixIcon: const Icon(LucideIcons.folder, size: 16, color: Color(0xFF64748B)),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            ),
                          ),
                          const SizedBox(height: 12),

                          const Text('Executive Description', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: descCtrl,
                            maxLines: 2,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Status & Priority Row
                          Row(
                            children: [
                              Expanded(
                                flex: 6,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Project Status *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                                    const SizedBox(height: 5),
                                    DropdownButtonFormField<String>(
                                      value: selectedStatus,
                                      isExpanded: true,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                      items: statuses.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                                      onChanged: (v) => setModalState(() => selectedStatus = v!),
                                      decoration: InputDecoration(
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        prefixIcon: const Icon(LucideIcons.activity, size: 15, color: Color(0xFF2563EB)),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                flex: 5,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Priority *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                                    const SizedBox(height: 5),
                                    DropdownButtonFormField<String>(
                                      value: selectedPriority,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                                      items: ['Critical', 'High', 'Medium', 'Low'].map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                                      onChanged: (v) => setModalState(() => selectedPriority = v!),
                                      decoration: InputDecoration(
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Department Dropdown
                          const Text('Department *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                          const SizedBox(height: 5),
                          DropdownButtonFormField<String>(
                            value: selectedDeptId,
                            isExpanded: true,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                            items: availableDepts.map((d) {
                              return DropdownMenuItem<String>(
                                value: d['_id']?.toString() ?? '',
                                child: Text(d['name']?.toString() ?? 'Department', overflow: TextOverflow.ellipsis),
                              );
                            }).toList(),
                            onChanged: (v) {
                              if (v != null) setModalState(() => selectedDeptId = v);
                            },
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              prefixIcon: const Icon(LucideIcons.building2, size: 15, color: Color(0xFF64748B)),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Version & Target Channel Row
                          Row(
                            children: [
                              Expanded(
                                flex: 5,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Version *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                                    const SizedBox(height: 5),
                                    TextFormField(
                                      controller: versionCtrl,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A), fontFamily: 'monospace'),
                                      decoration: InputDecoration(
                                        prefixIcon: const Icon(LucideIcons.tag, size: 15, color: Color(0xFF2563EB)),
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                flex: 6,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Target Channel *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                                    const SizedBox(height: 5),
                                    DropdownButtonFormField<String>(
                                      value: selectedChannel,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                                      items: targetChannels.map((ch) => DropdownMenuItem(value: ch, child: Text(ch))).toList(),
                                      onChanged: (v) => setModalState(() => selectedChannel = v!),
                                      decoration: InputDecoration(
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Cadence & Repository URL
                          Row(
                            children: [
                              Expanded(
                                flex: 5,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Release Cadence *', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                                    const SizedBox(height: 5),
                                    DropdownButtonFormField<String>(
                                      value: selectedCadence,
                                      isExpanded: true,
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                                      items: releaseCadences.map((c) => DropdownMenuItem(value: c, child: Text(c, overflow: TextOverflow.ellipsis))).toList(),
                                      onChanged: (v) => setModalState(() => selectedCadence = v!),
                                      decoration: InputDecoration(
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        prefixIcon: const Icon(LucideIcons.repeat, size: 14, color: Color(0xFF64748B)),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                flex: 6,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Repository URL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                                    const SizedBox(height: 5),
                                    TextFormField(
                                      controller: repoCtrl,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                                      decoration: InputDecoration(
                                        prefixIcon: const Icon(LucideIcons.gitFork, size: 15, color: Color(0xFF64748B)),
                                        filled: true,
                                        fillColor: const Color(0xFFF8FAFC),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Tech Stack Chips
                          const Text('Tech Stack & Architecture', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: popularTechs.map((tech) {
                              final isSelected = selectedTechStack.contains(tech);
                              return InkWell(
                                onTap: () {
                                  setModalState(() {
                                    if (isSelected) {
                                      selectedTechStack.remove(tech);
                                    } else {
                                      selectedTechStack.add(tech);
                                    }
                                  });
                                },
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFFEFF6FF) : const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                      color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (isSelected) ...[
                                        const Icon(LucideIcons.check, size: 12, color: Color(0xFF2563EB)),
                                        const SizedBox(width: 4),
                                      ],
                                      Text(
                                        tech,
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                          color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF475569),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 18),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 10),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      flex: 1,
                      child: SizedBox(
                        height: 46,
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFFCBD5E1)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: isSubmitting ? null : () => Navigator.of(ctx).pop(),
                          child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF475569))),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: SizedBox(
                        height: 46,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: isSubmitting
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Icon(LucideIcons.check, size: 16),
                          label: Text(
                            isSubmitting ? 'Saving Changes...' : 'Save Scope Changes',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                          onPressed: isSubmitting
                              ? null
                              : () async {
                                  if (!formKey.currentState!.validate()) return;
                                  setModalState(() => isSubmitting = true);
                                  final messenger = ScaffoldMessenger.of(context);
                                  try {
                                    final extra = customTechCtrl.text.trim();
                                    if (extra.isNotEmpty) selectedTechStack.add(extra);

                                    await _api.updateProject(project.id, {
                                      'name': nameCtrl.text.trim(),
                                      'description': descCtrl.text.trim(),
                                      'department': selectedDeptId,
                                      'status': selectedStatus,
                                      'priority': selectedPriority,
                                      'currentVersion': versionCtrl.text.trim().isEmpty ? 'v1.0.0' : versionCtrl.text.trim(),
                                      'releaseCadence': selectedCadence,
                                      'targetChannel': selectedChannel,
                                      'releaseNotes': releaseNotesCtrl.text.trim(),
                                      'repositoryUrl': repoCtrl.text.trim(),
                                      'techStack': selectedTechStack.toList(),
                                    });

                                    if (ctx.mounted) {
                                      Navigator.of(ctx).pop();
                                    }
                                    if (mounted) {
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text('Project "${nameCtrl.text.trim()}" updated successfully!'),
                                          backgroundColor: const Color(0xFF16A34A),
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                      _fetchProjects();
                                    }
                                  } catch (e) {
                                    setModalState(() => isSubmitting = false);
                                    String errorMsg = e.toString();
                                    if (e is DioException && e.response?.data != null) {
                                      final resData = e.response!.data;
                                      if (resData is Map && resData['message'] != null) {
                                        errorMsg = resData['message'].toString();
                                      }
                                    }
                                    if (mounted) {
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text('Failed to update project: $errorMsg'),
                                          backgroundColor: AppThemeColors.danger,
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                    }
                                  }
                                },
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredProjects;
    final authState = ref.watch(authProvider);
    final roleSlug = authState.roleSlug.toLowerCase();
    final roleName = (authState.user?.role.name ?? '').toLowerCase();
    final canCreateProject = roleSlug.contains('admin') ||
        roleName.contains('admin') ||
        roleSlug.contains('hr') ||
        roleName.contains('hr');

    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      body: SafeArea(
        child: EnterprisePullToRefresh(
          onRefresh: _fetchProjects,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header Action Bar
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Project Workspace',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.4,
                        ),
                      ),
                    ),
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
                      tooltip: 'Export Projects CSV',
                      onPressed: _exportProjectsCsv,
                    ),
                    if (canCreateProject) ...[
                      const SizedBox(width: 6),
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(10),
                          onTap: _showCreateProjectModal,
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
                                Icon(LucideIcons.plus, size: 15, color: Colors.white),
                                SizedBox(width: 5),
                                Text(
                                  'New Project',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 14),

                // Hero Portfolio Banner
                _buildPortfolioHeroBanner(),
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
                      hintText: 'Search by project name, code (PRJ-...), dept...',
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
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Status Filter Carousel
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: _statusFilters.map((filter) {
                      final isSelected = _selectedStatusFilter == filter;
                      final count = _getCountForFilter(filter);

                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: InkWell(
                          onTap: () {
                            HapticFeedback.selectionClick();
                            setState(() => _selectedStatusFilter = filter);
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

                // Project List or Shimmer
                if (_isLoading)
                  const ShimmerLoading(
                    isLoading: true,
                    child: Column(
                      children: [
                        SkeletonProjectCard(),
                        SkeletonProjectCard(),
                        SkeletonProjectCard(),
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
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: const BoxDecoration(
                            color: Color(0xFFEFF6FF),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(LucideIcons.filterX, size: 28, color: Color(0xFF2563EB)),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _selectedStatusFilter != 'All'
                              ? 'No "$_selectedStatusFilter" Projects'
                              : 'No Projects Found',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _selectedStatusFilter != 'All'
                              ? 'There are currently 0 projects marked as "$_selectedStatusFilter". Workspace has ${_projects.length} total project(s).'
                              : (_searchController.text.isNotEmpty
                                  ? 'No projects matching "${_searchController.text}".'
                                  : (canCreateProject
                                      ? 'Tap "New Project" to provision your first initiative.'
                                      : 'No projects available in your workspace.')),
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 16),
                        if (_selectedStatusFilter != 'All') ...[
                          ElevatedButton.icon(
                            onPressed: () {
                              setState(() => _selectedStatusFilter = 'All');
                            },
                            icon: const Icon(LucideIcons.layers, size: 14),
                            label: Text('Show All Projects (${_projects.length})'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ] else if (canCreateProject) ...[
                          ElevatedButton.icon(
                            onPressed: _showCreateProjectModal,
                            icon: const Icon(LucideIcons.plus, size: 15),
                            label: const Text('Provision Project'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ],
                      ],
                    ),
                  )
                else ...[
                  // Swipe Action Hint Banner
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8, left: 2, right: 2),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.arrowLeftRight, size: 12, color: Color(0xFF94A3B8)),
                        const SizedBox(width: 6),
                        Text(
                          'Swipe right to edit • Swipe left to delete',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade500),
                        ),
                        const Spacer(),
                        Text(
                          '${filtered.length} visible',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade400),
                        ),
                      ],
                    ),
                  ),
                  ...filtered.map((project) => _buildProjectCard(project)),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─── HERO PORTFOLIO BANNER ──────────────────────────────────────────────────
  Widget _buildPortfolioHeroBanner() {
    final activeCount = _projects.where((p) => p.status.toLowerCase() == 'active').length;
    final onTrackCount = _projects.where((p) => p.healthStatus == 'On Track').length;
    final delayedCount = _projects.where((p) => p.healthStatus == 'Delayed').length;

    return Container(
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
              right: 0,
              top: 0,
              bottom: 0,
              width: 180,
              child: ShaderMask(
                shaderCallback: (rect) {
                  return const LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [Colors.transparent, Colors.black, Colors.black],
                    stops: [0.0, 0.22, 1.0],
                  ).createShader(rect);
                },
                blendMode: BlendMode.dstIn,
                child: Image.asset(
                  'assets/images/project_workspace_hero.webp',
                  fit: BoxFit.cover,
                  alignment: Alignment.centerRight,
                  errorBuilder: (_, _, _) => const SizedBox(),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(LucideIcons.briefcase, size: 18, color: Color(0xFF2563EB)),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'Corporate Portfolio',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      _buildHeroStat('Active', '$activeCount', const Color(0xFF2563EB)),
                      const SizedBox(width: 16),
                      _buildHeroStat('On Track', '$onTrackCount', const Color(0xFF10B981)),
                      const SizedBox(width: 16),
                      _buildHeroStat('Delayed', '$delayedCount', delayedCount > 0 ? const Color(0xFFEF4444) : const Color(0xFF64748B)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
        ),
      ],
    );
  }

  // ─── STATUS BADGE COMPONENT ────────────────────────────────────────────────
  Widget _buildStatusBadge(String status) {
    final s = _normalizeStatus(status);
    Color bg = const Color(0xFFEFF6FF);
    Color text = const Color(0xFF2563EB);
    Color border = const Color(0xFFDBEAFE);
    IconData icon = LucideIcons.activity;
    String label = status;

    if (s == 'planning') {
      bg = const Color(0xFFF5F3FF);
      text = const Color(0xFF7C3AED);
      border = const Color(0xFFDDD6FE);
      icon = LucideIcons.compass;
      label = 'Planning';
    } else if (s == 'active') {
      bg = const Color(0xFFECFDF5);
      text = const Color(0xFF059669);
      border = const Color(0xFFA7F3D0);
      icon = LucideIcons.playCircle;
      label = 'Active';
    } else if (s == 'completed') {
      bg = const Color(0xFFEFF6FF);
      text = const Color(0xFF1D4ED8);
      border = const Color(0xFFBFDBFE);
      icon = LucideIcons.checkCircle2;
      label = 'Completed';
    } else if (s == 'on hold') {
      bg = const Color(0xFFFFFBEB);
      text = const Color(0xFFD97706);
      border = const Color(0xFFFDE68A);
      icon = LucideIcons.pauseCircle;
      label = 'On Hold';
    } else if (s == 'cancelled') {
      bg = const Color(0xFFFEF2F2);
      text = const Color(0xFFDC2626);
      border = const Color(0xFFFECACA);
      icon = LucideIcons.xCircle;
      label = 'Cancelled';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: text),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: text,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }

  // ─── PROJECT CARD (SWIPE TO EDIT & DELETE) ──────────────────────────────────
  Widget _buildProjectCard(ProjectItem project) {
    final currentUserId = ref.watch(authProvider).user?.id ?? '';
    final isLead = project.isUserLead(currentUserId);
    final isMember = project.isUserMember(currentUserId);

    Color healthColor = const Color(0xFF10B981);
    if (project.healthStatus == 'At Risk') healthColor = const Color(0xFFF59E0B);
    if (project.healthStatus == 'Delayed') healthColor = const Color(0xFFEF4444);

    Color priorityColor = const Color(0xFF64748B);
    if (project.priority == 'Critical') priorityColor = const Color(0xFFEF4444);
    if (project.priority == 'High') priorityColor = const Color(0xFFF97316);
    if (project.priority == 'Medium') priorityColor = const Color(0xFF2563EB);

    return Dismissible(
      key: ValueKey('project_${project.id}'),
      direction: DismissDirection.horizontal,
      confirmDismiss: (direction) async {
        if (direction == DismissDirection.startToEnd) {
          HapticFeedback.mediumImpact();
          _showEditProjectModal(project);
          return false;
        } else if (direction == DismissDirection.endToStart) {
          HapticFeedback.heavyImpact();
          final deleted = await _confirmDeleteProject(project);
          return deleted;
        }
        return false;
      },
      // Swipe Right -> Edit Scope (Linear Blue)
      background: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1D4ED8), Color(0xFF2563EB), Color(0xFF3B82F6)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF2563EB).withOpacity(0.25),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.22),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.edit3, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 12),
            const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Edit Scope',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  'Swipe to modify',
                  style: TextStyle(
                    color: Color(0xFFDBEAFE),
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      // Swipe Left -> Delete (Danger Red)
      secondaryBackground: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFEF4444), Color(0xFFDC2626), Color(0xFFB91C1C)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFEF4444).withOpacity(0.25),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  'Delete',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  'Irreversible',
                  style: TextStyle(
                    color: Color(0xFFFEE2E2),
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.22),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.trash2, color: Colors.white, size: 18),
            ),
          ],
        ),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
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
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => _openProjectDossier(project),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Row: Code Pill, Lifecycle Status Badge, Priority Badge, Health Badge, 3-dots Menu
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Left Tags (Code, Lifecycle, Priority) wrapped safely
                      Expanded(
                        child: Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            // Project Code
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                project.code,
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF0F172A),
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),

                            // Lifecycle Status Badge (Planning, Active, Completed, etc.)
                            _buildStatusBadge(project.status),

                            // Project-contextual Lead / Member Badge
                            if (isLead)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFFFEF3C7), Color(0xFFFDE68A)],
                                  ),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFF59E0B)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    Icon(LucideIcons.crown, size: 10.5, color: Color(0xFFB45309)),
                                    SizedBox(width: 3.5),
                                    Text(
                                      'LEAD',
                                      style: TextStyle(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w900,
                                        color: Color(0xFF78350F),
                                        letterSpacing: 0.3,
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            else if (isMember)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF0FDF4),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFBBF7D0)),
                                ),
                                child: const Text(
                                  'MEMBER',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF15803D),
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ),

                            // Priority Pill
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: priorityColor.withOpacity(0.10),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                project.priority,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: priorityColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),

                      // Health Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: healthColor.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(color: healthColor, shape: BoxShape.circle),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              project.healthStatus,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: healthColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 2),

                      // 3-dots Context Menu
                      SizedBox(
                        width: 24,
                        height: 24,
                        child: PopupMenuButton<String>(
                          padding: EdgeInsets.zero,
                          icon: const Icon(LucideIcons.moreVertical, size: 16, color: Color(0xFF64748B)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          onSelected: (action) {
                            if (action == 'edit') {
                              _showEditProjectModal(project);
                            } else if (action == 'delete') {
                              _confirmDeleteProject(project);
                            } else if (action == 'status_active') {
                              _updateProjectStatus(project, 'Active');
                            } else if (action == 'status_planning') {
                              _updateProjectStatus(project, 'Planning');
                            } else if (action == 'status_completed') {
                              _updateProjectStatus(project, 'Completed');
                            } else if (action == 'status_onhold') {
                              _updateProjectStatus(project, 'On Hold');
                            }
                          },
                          itemBuilder: (ctx) => [
                            const PopupMenuItem(
                              value: 'edit',
                              child: Row(
                                children: [
                                  Icon(LucideIcons.edit3, size: 15, color: Color(0xFF2563EB)),
                                  SizedBox(width: 8),
                                  Text('Edit Project Scope', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                ],
                              ),
                            ),
                            const PopupMenuDivider(),
                            if (project.status.toLowerCase() != 'active')
                              const PopupMenuItem(
                                value: 'status_active',
                                child: Row(
                                  children: [
                                    Icon(LucideIcons.playCircle, size: 15, color: Color(0xFF059669)),
                                    SizedBox(width: 8),
                                    Text('Mark as Active', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            if (project.status.toLowerCase() != 'planning')
                              const PopupMenuItem(
                                value: 'status_planning',
                                child: Row(
                                  children: [
                                    Icon(LucideIcons.compass, size: 15, color: Color(0xFF7C3AED)),
                                    SizedBox(width: 8),
                                    Text('Mark as Planning', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            if (project.status.toLowerCase() != 'completed')
                              const PopupMenuItem(
                                value: 'status_completed',
                                child: Row(
                                  children: [
                                    Icon(LucideIcons.checkCircle2, size: 15, color: Color(0xFF1D4ED8)),
                                    SizedBox(width: 8),
                                    Text('Mark as Completed', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            if (project.status.toLowerCase() != 'on hold')
                              const PopupMenuItem(
                                value: 'status_onhold',
                                child: Row(
                                  children: [
                                    Icon(LucideIcons.pauseCircle, size: 15, color: Color(0xFFD97706)),
                                    SizedBox(width: 8),
                                    Text('Mark as On Hold', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            const PopupMenuDivider(),
                            const PopupMenuItem(
                              value: 'delete',
                              child: Row(
                                children: [
                                  Icon(LucideIcons.trash2, size: 15, color: Color(0xFFEF4444)),
                                  SizedBox(width: 8),
                                  Text('Delete Initiative', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFEF4444))),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Title & Department
                  Text(
                    project.name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (project.departmentName != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      project.departmentName!,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF64748B)),
                    ),
                  ],
                  const SizedBox(height: 12),

                  // Completion Progress Bar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Delivery Progress',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                      ),
                      Text(
                        '${project.completionPercent}%',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: (project.completionPercent / 100).clamp(0.0, 1.0),
                      backgroundColor: const Color(0xFFE2E8F0),
                      color: const Color(0xFF2563EB),
                      minHeight: 6,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Lead Command Strip (Only shown if user is lead on this project)
                  if (isLead) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFFFFBEB), Color(0xFFFEF3C7)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Color(0xFFD97706),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(LucideIcons.crown, size: 11, color: Colors.white),
                          ),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'You Lead This Initiative',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF78350F),
                                  ),
                                ),
                                Text(
                                  'Delegate sprint tasks & review roster',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF92400E),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          InkWell(
                            onTap: () {
                              HapticFeedback.lightImpact();
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => InternTeamScreen(project: project),
                                ),
                              );
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFD97706),
                                borderRadius: BorderRadius.circular(8),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFD97706).withOpacity(0.3),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ],
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(LucideIcons.users, size: 11, color: Colors.white),
                                  SizedBox(width: 4),
                                  Text(
                                    'Team Ops',
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  // Bottom Meta Row: Team, Version, Target Channel, Bugs, Chevron
                  Row(
                    children: [
                      Expanded(
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            // Team Count Pill
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(LucideIcons.users, size: 14, color: Color(0xFF64748B)),
                                const SizedBox(width: 4),
                                Text(
                                  '${project.teamCount} on team',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                                ),
                              ],
                            ),

                            // Version Release Badge
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFDBEAFE)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(LucideIcons.tag, size: 11, color: Color(0xFF2563EB)),
                                  const SizedBox(width: 3),
                                  Text(
                                    project.currentVersion,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF2563EB),
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Target Channel Pill
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                project.targetChannel,
                                style: const TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF475569),
                                ),
                              ),
                            ),

                            // Open Bugs
                            if (project.activeBugsCount > 0) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF2F2),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFFECACA)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(LucideIcons.bug, size: 12, color: Color(0xFFEF4444)),
                                    const SizedBox(width: 3),
                                    Text(
                                      '${project.activeBugsCount} bugs',
                                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFFEF4444)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(LucideIcons.chevronRight, size: 16, color: Color(0xFF94A3B8)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
