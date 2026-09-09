import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../models/project_item.dart';
import '../../../../models/user_profile.dart';
import '../../data/pmo_api.dart';
import '../../../admin/data/admin_api.dart';

/// ─── MODULAR REUSABLE PROJECT TEAM & ALLOCATION TAB ─────────────────────────
/// Manages project personnel roster, Team Lead designations, capacity planning (FTEs),
/// and audit-tracked member assignments.
class ProjectTeamTab extends StatefulWidget {
  final ProjectItem project;
  final VoidCallback? onDataChanged;

  const ProjectTeamTab({
    super.key,
    required this.project,
    this.onDataChanged,
  });

  @override
  State<ProjectTeamTab> createState() => _ProjectTeamTabState();
}

class _ProjectTeamTabState extends State<ProjectTeamTab> {
  final PmoApi _api = PmoApi();
  final AdminApi _adminApi = AdminApi();

  // ─── MODAL: ADD / EDIT TEAM MEMBER WITH ALLOCATION % ───────────────────────
  void _showAddTeamMemberModal([ProjectTeamMember? existingMember, bool defaultAsLead = false]) {
    final isEditing = existingMember != null;
    String? selectedUserId = existingMember?.userId;

    bool isLeadDesignation = existingMember?.isLead ?? defaultAsLead;

    final roleCtrl = TextEditingController(
      text: isEditing
          ? existingMember.role
          : (defaultAsLead ? 'Team Lead' : 'Senior Software Engineer'),
    );
    final allocCtrl = TextEditingController(
      text: isEditing ? existingMember.allocationPercentage.toString() : '100',
    );

    List<UserProfile> availableUsers = [];
    bool isLoadingUsers = !isEditing;
    String? loadError;
    bool isSubmitting = false;

    // Role Presets for Quick Selection
    final List<Map<String, dynamic>> rolePresets = [
      {'title': 'Team Lead', 'icon': LucideIcons.crown, 'isLead': true},
      {'title': 'Tech Lead', 'icon': LucideIcons.zap, 'isLead': true},
      {'title': 'Principal Architect', 'icon': LucideIcons.award, 'isLead': true},
      {'title': 'Senior Software Engineer', 'icon': LucideIcons.code, 'isLead': false},
      {'title': 'Full-Stack Developer', 'icon': LucideIcons.layers, 'isLead': false},
      {'title': 'QA / Test Lead', 'icon': LucideIcons.checkCircle2, 'isLead': true},
      {'title': 'DevOps Engineer', 'icon': LucideIcons.shieldCheck, 'isLead': false},
      {'title': 'Software Intern', 'icon': LucideIcons.user, 'isLead': false},
    ];

    // Capacity Presets
    final List<Map<String, dynamic>> capacityPresets = [
      {'pct': 25, 'label': '25%', 'desc': 'Advisory (10h/w)'},
      {'pct': 50, 'label': '50%', 'desc': 'Shared (20h/w)'},
      {'pct': 75, 'label': '75%', 'desc': 'Core (30h/w)'},
      {'pct': 100, 'label': '100%', 'desc': 'Full-Time (40h/w)'},
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setMState) {
          if (!isEditing && isLoadingUsers && availableUsers.isEmpty && loadError == null) {
            Future.microtask(() async {
              try {
                List<UserProfile> fetched = await _api.getAvailableTeamMembers(type: 'employee');
                if (fetched.isEmpty) {
                  fetched = await _adminApi.getUsers();
                }

                final currentTeamIds = widget.project.team.map((t) => t.userId).toSet();
                fetched.sort((a, b) {
                  final aIn = currentTeamIds.contains(a.id) ? 1 : 0;
                  final bIn = currentTeamIds.contains(b.id) ? 1 : 0;
                  if (aIn != bIn) return aIn.compareTo(bIn);
                  return a.name.compareTo(b.name);
                });

                if (ctx.mounted) {
                  setMState(() {
                    availableUsers = fetched;
                    isLoadingUsers = false;
                    if (selectedUserId == null && fetched.isNotEmpty) {
                      final candidate = fetched.firstWhere(
                        (u) => !currentTeamIds.contains(u.id),
                        orElse: () => fetched.first,
                      );
                      selectedUserId = candidate.id;
                      if (!defaultAsLead && candidate.designation != null && candidate.designation!.isNotEmpty) {
                        roleCtrl.text = candidate.designation!;
                        final lower = candidate.designation!.toLowerCase();
                        isLeadDesignation = lower.contains('lead') || lower.contains('architect') || lower.contains('manager');
                      }
                    }
                  });
                }
              } catch (err) {
                if (ctx.mounted) {
                  setMState(() {
                    isLoadingUsers = false;
                    loadError = err.toString();
                  });
                }
              }
            });
          }

          final currentAlloc = int.tryParse(allocCtrl.text.trim()) ?? 100;

          String bandwidthLabel;
          Color bandwidthColor;
          if (currentAlloc >= 100) {
            bandwidthLabel = 'Full-Time (1.0 FTE • 40h/w)';
            bandwidthColor = const Color(0xFF16A34A);
          } else if (currentAlloc >= 75) {
            bandwidthLabel = 'Core Focus (0.75 FTE • 30h/w)';
            bandwidthColor = const Color(0xFF2563EB);
          } else if (currentAlloc >= 50) {
            bandwidthLabel = 'Shared (0.5 FTE • 20h/w)';
            bandwidthColor = const Color(0xFFD97706);
          } else {
            bandwidthLabel = 'Advisory ($currentAlloc% • ${(currentAlloc * 0.4).toStringAsFixed(0)}h/w)';
            bandwidthColor = const Color(0xFF64748B);
          }

          return ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.90,
            ),
            child: Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                left: 20,
                right: 20,
                top: 14,
              ),
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFCBD5E1),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Header
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: isLeadDesignation
                                ? const Color(0xFFFEF3C7)
                                : (isEditing ? const Color(0xFFEFF6FF) : const Color(0xFFF0FDF4)),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isLeadDesignation ? const Color(0xFFFDE68A) : Colors.transparent,
                            ),
                          ),
                          child: Icon(
                            isLeadDesignation
                                ? LucideIcons.crown
                                : (isEditing ? LucideIcons.userCheck : LucideIcons.userPlus),
                            size: 18,
                            color: isLeadDesignation
                                ? const Color(0xFFB45309)
                                : (isEditing ? const Color(0xFF2563EB) : const Color(0xFF16A34A)),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isEditing
                                    ? (isLeadDesignation ? 'Update Team Lead Allocation' : 'Update Personnel Allocation')
                                    : (isLeadDesignation ? 'Appoint Team Lead' : 'Allocate Personnel to Project'),
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              Text(
                                isLeadDesignation
                                    ? 'Set lead authority, engineering title and dedicated capacity.'
                                    : (isEditing
                                        ? 'Adjust dedicated capacity & role on this project.'
                                        : 'Select employee, set project role and capacity %.'),
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Personnel Selector or Read-Only Card
                    if (isEditing) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: isLeadDesignation ? const Color(0xFFD97706) : const Color(0xFF2563EB),
                              child: Text(
                                existingMember.name.isNotEmpty
                                    ? existingMember.name[0].toUpperCase()
                                    : 'U',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    existingMember.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                  Text(
                                    existingMember.department ?? 'Engineering Roster',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: isLeadDesignation ? const Color(0xFFFEF3C7) : const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isLeadDesignation ? const Color(0xFFFDE68A) : const Color(0xFFBFDBFE),
                                ),
                              ),
                              child: Text(
                                isLeadDesignation ? 'Team Lead' : 'Active Member',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: isLeadDesignation ? const Color(0xFFB45309) : const Color(0xFF2563EB),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ] else if (isLoadingUsers) ...[
                      Container(
                        height: 54,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: const Row(
                          children: [
                            SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                            SizedBox(width: 12),
                            Text(
                              'Loading enterprise personnel directory...',
                              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ] else if (loadError != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFFECACA)),
                        ),
                        child: Row(
                          children: [
                            const Icon(LucideIcons.alertCircle, size: 16, color: Color(0xFFEF4444)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Could not fetch users: $loadError',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF991B1B)),
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                setMState(() {
                                  isLoadingUsers = true;
                                  loadError = null;
                                });
                              },
                              child: const Text('Retry', style: TextStyle(fontSize: 11)),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      DropdownButtonFormField<String>(
                        value: selectedUserId,
                        isExpanded: true,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF0F172A),
                        ),
                        decoration: InputDecoration(
                          labelText: 'Select Personnel *',
                          labelStyle: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          prefixIcon: const Icon(LucideIcons.user, size: 16, color: Color(0xFF64748B)),
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                        ),
                        items: availableUsers.map((u) {
                          final currentTeamIds = widget.project.team.map((t) => t.userId).toSet();
                          final isAlreadyIn = currentTeamIds.contains(u.id);
                          final deptInfo = u.department != null && u.department!.isNotEmpty
                              ? u.department!
                              : (u.role.name);
                          final assignmentNote = isAlreadyIn
                              ? 'Already on Roster'
                              : (u.project != null
                                  ? 'Assigned: ${u.project!.name}'
                                  : 'Bench Pool');

                          return DropdownMenuItem<String>(
                            value: u.id,
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 11,
                                  backgroundColor: const Color(0xFF2563EB),
                                  child: Text(
                                    u.name.isNotEmpty ? u.name[0].toUpperCase() : 'U',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '${u.name} • $deptInfo',
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: isAlreadyIn
                                          ? const Color(0xFF94A3B8)
                                          : const Color(0xFF0F172A),
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isAlreadyIn
                                        ? const Color(0xFFF1F5F9)
                                        : (u.project != null
                                            ? const Color(0xFFFEF3C7)
                                            : const Color(0xFFDCFCE7)),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    assignmentNote,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w700,
                                      color: isAlreadyIn
                                          ? const Color(0xFF64748B)
                                          : (u.project != null
                                              ? const Color(0xFFB45309)
                                              : const Color(0xFF15803D)),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val == null) return;
                          final u = availableUsers.firstWhere(
                            (usr) => usr.id == val,
                            orElse: () => availableUsers.first,
                          );
                          setMState(() {
                            selectedUserId = val;
                            if (!isLeadDesignation && u.designation != null && u.designation!.isNotEmpty) {
                              roleCtrl.text = u.designation!;
                              final lower = u.designation!.toLowerCase();
                              isLeadDesignation = lower.contains('lead') || lower.contains('architect') || lower.contains('manager');
                            }
                          });
                        },
                      ),
                    ],
                    const SizedBox(height: 12),

                    // 👑 LEADERSHIP DESIGNATION SWITCH CARD
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isLeadDesignation ? const Color(0xFFFFFBEB) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isLeadDesignation ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0),
                          width: isLeadDesignation ? 1.5 : 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(7),
                                decoration: BoxDecoration(
                                  color: isLeadDesignation
                                      ? const Color(0xFFF59E0B).withOpacity(0.18)
                                      : const Color(0xFFE2E8F0),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  LucideIcons.crown,
                                  size: 16,
                                  color: isLeadDesignation
                                      ? const Color(0xFFB45309)
                                      : const Color(0xFF64748B),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        const Flexible(
                                          child: Text(
                                            'Project Team Lead',
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w800,
                                              color: Color(0xFF0F172A),
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                          decoration: BoxDecoration(
                                            color: isLeadDesignation ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(
                                              color: isLeadDesignation ? const Color(0xFFF59E0B) : const Color(0xFFCBD5E1),
                                            ),
                                          ),
                                          child: Text(
                                            isLeadDesignation ? 'LEAD' : 'MEMBER',
                                            style: TextStyle(
                                              fontSize: 8.5,
                                              fontWeight: FontWeight.w800,
                                              color: isLeadDesignation ? const Color(0xFFB45309) : const Color(0xFF64748B),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    const Text(
                                      'Technical authority, code review lead & PMO focal point',
                                      style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              SizedBox(
                                height: 30,
                                child: FittedBox(
                                  fit: BoxFit.contain,
                                  child: Switch.adaptive(
                                    value: isLeadDesignation,
                                    activeColor: const Color(0xFFD97706),
                                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    onChanged: (val) {
                                      setMState(() {
                                        isLeadDesignation = val;
                                        if (val) {
                                          final cur = roleCtrl.text.toLowerCase();
                                          if (!cur.contains('lead') &&
                                              !cur.contains('architect') &&
                                              !cur.contains('manager')) {
                                            roleCtrl.text = 'Team Lead';
                                          }
                                        } else {
                                          if (roleCtrl.text == 'Team Lead' || roleCtrl.text == 'Tech Lead') {
                                            roleCtrl.text = (existingMember?.designation?.isNotEmpty == true)
                                                ? existingMember!.designation!
                                                : 'Senior Software Engineer';
                                          }
                                        }
                                      });
                                    },
                                  ),
                                ),
                              ),
                            ],
                          ),
                          if (isLeadDesignation) ...[
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7).withOpacity(0.7),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Row(
                                children: [
                                  Icon(LucideIcons.award, size: 13, color: Color(0xFFB45309)),
                                  SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      'Leadership status will highlight this member in the Roster with PR review ownership.',
                                      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF92400E)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Quick Role Presets Horizontal Scroll
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Quick Role Presets',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                            ),
                            Text(
                              'Tap to apply title',
                              style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          child: Row(
                            children: rolePresets.map((rp) {
                              final title = rp['title'] as String;
                              final isLead = rp['isLead'] as bool;
                              final icon = rp['icon'] as IconData;
                              final isSelected = roleCtrl.text.trim().toLowerCase() == title.toLowerCase();

                              return Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: InkWell(
                                  onTap: () {
                                    setMState(() {
                                      roleCtrl.text = title;
                                      isLeadDesignation = isLead;
                                    });
                                  },
                                  borderRadius: BorderRadius.circular(8),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? (isLead ? const Color(0xFFFEF3C7) : const Color(0xFFEFF6FF))
                                          : const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: isSelected
                                            ? (isLead ? const Color(0xFFF59E0B) : const Color(0xFF2563EB))
                                            : const Color(0xFFE2E8F0),
                                        width: isSelected ? 1.5 : 1,
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          icon,
                                          size: 12,
                                          color: isSelected
                                              ? (isLead ? const Color(0xFFB45309) : const Color(0xFF1D4ED8))
                                              : const Color(0xFF64748B),
                                        ),
                                        const SizedBox(width: 5),
                                        Text(
                                          title,
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                            color: isSelected
                                                ? (isLead ? const Color(0xFF92400E) : const Color(0xFF1E40AF))
                                                : const Color(0xFF334155),
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
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Project Role Field
                    TextField(
                      controller: roleCtrl,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                      onChanged: (txt) {
                        final lower = txt.toLowerCase();
                        final shouldBeLead = lower.contains('lead') || lower.contains('architect') || lower.contains('manager') || lower.contains('head') || lower.contains('owner');
                        if (shouldBeLead != isLeadDesignation) {
                          setMState(() {
                            isLeadDesignation = shouldBeLead;
                          });
                        }
                      },
                      decoration: InputDecoration(
                        labelText: 'Project Role / Title *',
                        labelStyle: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        hintText: 'e.g. Team Lead, Tech Lead, Senior Developer',
                        prefixIcon: Icon(
                          isLeadDesignation ? LucideIcons.crown : LucideIcons.briefcase,
                          size: 16,
                          color: isLeadDesignation ? const Color(0xFFD97706) : const Color(0xFF64748B),
                        ),
                        suffixIcon: isLeadDesignation
                            ? Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFEF3C7),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: const Color(0xFFF59E0B)),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(LucideIcons.crown, size: 10, color: Color(0xFFB45309)),
                                          SizedBox(width: 3),
                                          Text(
                                            'Lead Role',
                                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFFB45309)),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            : null,
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: isLeadDesignation ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Dedicated Capacity % Field & Meter
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          flex: 4,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Dedicated Capacity % *',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                              ),
                              const SizedBox(height: 4),
                              TextField(
                                controller: allocCtrl,
                                keyboardType: TextInputType.number,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  fontFamily: 'monospace',
                                  color: Color(0xFF2563EB),
                                ),
                                decoration: InputDecoration(
                                  hintText: '100',
                                  suffixText: '%',
                                  suffixStyle: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                                  prefixIcon: const Icon(LucideIcons.percent, size: 15, color: Color(0xFF2563EB)),
                                  filled: true,
                                  fillColor: const Color(0xFFF8FAFC),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                  ),
                                ),
                                onChanged: (_) => setMState(() {}),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        // Visual Allocation Meter
                        Expanded(
                          flex: 5,
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text('Bandwidth', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                                    Flexible(
                                      child: Text(
                                        bandwidthLabel,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          color: bandwidthColor,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: (currentAlloc / 100.0).clamp(0.0, 1.0),
                                    backgroundColor: const Color(0xFFE2E8F0),
                                    color: bandwidthColor,
                                    minHeight: 6,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Preset Chips Row
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        const Text('Presets: ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                        ...capacityPresets.map((preset) {
                          final pct = preset['pct'] as int;
                          final isSelected = currentAlloc == pct;
                          return InkWell(
                            onTap: () {
                              setMState(() {
                                allocCtrl.text = pct.toString();
                              });
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSelected ? const Color(0xFF1D4ED8) : const Color(0xFFE2E8F0),
                                ),
                              ),
                              child: Text(
                                '$pct%',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected ? Colors.white : const Color(0xFF475569),
                                ),
                              ),
                            ),
                          );
                        }),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Submit Action Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        icon: isSubmitting
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : Icon(
                                isLeadDesignation
                                    ? LucideIcons.crown
                                    : (isEditing ? LucideIcons.checkCheck : LucideIcons.userPlus),
                                size: 16,
                              ),
                        label: Text(
                          isSubmitting
                              ? 'Updating Roster...'
                              : (isEditing
                                  ? (isLeadDesignation ? 'Update Team Lead Allocation' : 'Update Allocation')
                                  : (isLeadDesignation ? 'Appoint as Team Lead' : 'Allocate to Roster')),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isLeadDesignation ? const Color(0xFFD97706) : const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 2,
                        ),
                        onPressed: (isSubmitting || selectedUserId == null)
                            ? null
                            : () async {
                                final role = roleCtrl.text.trim();
                                if (role.isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Please enter a valid project role/title'),
                                      backgroundColor: Color(0xFFEF4444),
                                    ),
                                  );
                                  return;
                                }

                                final alloc = int.tryParse(allocCtrl.text.trim()) ?? 100;
                                if (alloc <= 0 || alloc > 100) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Capacity % must be between 1 and 100'),
                                      backgroundColor: Color(0xFFEF4444),
                                    ),
                                  );
                                  return;
                                }

                                setMState(() => isSubmitting = true);
                                final nav = Navigator.of(ctx);
                                final messenger = ScaffoldMessenger.of(context);

                                try {
                                  await _api.addTeamMembers(widget.project.id, [
                                    {
                                      'userId': selectedUserId,
                                      'role': role,
                                      'allocationPercentage': alloc,
                                    }
                                  ]);
                                  nav.pop();
                                  widget.onDataChanged?.call();
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        isLeadDesignation
                                            ? 'Designated ${existingMember?.name ?? "member"} as $role ($alloc% capacity).'
                                            : (isEditing
                                                ? 'Updated ${existingMember.name} capacity to $alloc%.'
                                                : 'Personnel allocated to project team successfully.'),
                                      ),
                                      backgroundColor: const Color(0xFF16A34A),
                                    ),
                                  );
                                } catch (e) {
                                  setMState(() => isSubmitting = false);
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content: Text('Failed: $e'),
                                      backgroundColor: const Color(0xFFEF4444),
                                    ),
                                  );
                                }
                              },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildReleaseStatBox(
    String title,
    String value,
    Color color,
    Color bgColor,
    Color borderColor,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 9.5,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTeamMemberCard(ProjectTeamMember m, {bool isLeadership = false, bool isInternship = false}) {
    final avatarLetter = m.name.isNotEmpty ? m.name[0].toUpperCase() : 'U';
    final isLead = m.isLead || isLeadership;
    final isIntern = m.isIntern || isInternship;

    Color avatarBg = const Color(0xFF2563EB);
    if (isLead) {
      avatarBg = const Color(0xFFD97706);
    } else if (isIntern) {
      avatarBg = const Color(0xFF7C3AED);
    }

    Color capacityColor = const Color(0xFF2563EB);
    if (isIntern) {
      capacityColor = const Color(0xFF7C3AED);
    } else if (m.allocationPercentage >= 100) {
      capacityColor = const Color(0xFF16A34A);
    } else if (m.allocationPercentage <= 30) {
      capacityColor = const Color(0xFFF59E0B);
    }

    final cardBg = isLead
        ? const Color(0xFFFFFDF5)
        : (isIntern ? const Color(0xFFFAF5FF) : Colors.white);
    final cardBorder = isLead
        ? const Color(0xFFFDE68A)
        : (isIntern ? const Color(0xFFE9D5FF) : const Color(0xFFE2E8F0));

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: cardBorder,
          width: (isLead || isIntern) ? 1.4 : 1.0,
        ),
        boxShadow: isLead
            ? [
                BoxShadow(
                  color: const Color(0xFFF59E0B).withOpacity(0.08),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ]
            : (isIntern
                ? [
                    BoxShadow(
                      color: const Color(0xFF7C3AED).withOpacity(0.06),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null),
      ),
      child: Row(
        children: [
          // Avatar with Lead crown or Intern grad cap indicator
          Stack(
            clipBehavior: Clip.none,
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: avatarBg,
                child: isIntern
                    ? const Icon(LucideIcons.graduationCap, size: 16, color: Colors.white)
                    : Text(
                        avatarLetter,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
                      ),
              ),
              if (isLead)
                Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: const BoxDecoration(
                      color: Color(0xFFF59E0B),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.crown, size: 10, color: Colors.white),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 10),

          // Member info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        m.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    if (isLead) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFF59E0B)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.crown, size: 9, color: Color(0xFFB45309)),
                            SizedBox(width: 3),
                            Text(
                              'LEAD',
                              style: TextStyle(
                                fontSize: 8.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFFB45309),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ] else if (isIntern) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3E8FF),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFDDD6FE)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.graduationCap, size: 9, color: Color(0xFF7C3AED)),
                            SizedBox(width: 3),
                            Text(
                              'INTERN',
                              style: TextStyle(
                                fontSize: 8.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF7C3AED),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        m.designation ?? m.role,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isLead
                              ? const Color(0xFF92400E)
                              : (isIntern ? const Color(0xFF6B21A8) : const Color(0xFF64748B)),
                        ),
                      ),
                    ),
                    if (m.department != null &&
                        m.department!.isNotEmpty &&
                        !RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(m.department!)) ...[
                      const SizedBox(width: 5),
                      Text('•', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                      const SizedBox(width: 5),
                      Flexible(
                        child: Text(
                          m.department!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),

          // Capacity % pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: capacityColor.withOpacity(0.10),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: capacityColor.withOpacity(0.25)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(LucideIcons.pieChart, size: 10, color: capacityColor),
                const SizedBox(width: 3),
                Text(
                  '${m.allocationPercentage}%',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'monospace',
                    color: capacityColor,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 2),

          // Enterprise Context Menu
          PopupMenuButton<String>(
            icon: const Icon(LucideIcons.moreVertical, size: 16, color: Color(0xFF64748B)),
            padding: EdgeInsets.zero,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            onSelected: (action) async {
              if (action == 'lead') {
                _showAddTeamMemberModal(m, !isLead);
              } else if (action == 'edit') {
                _showAddTeamMemberModal(m);
              } else if (action == 'remove') {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Remove from Project?'),
                    content: Text('Remove ${m.name} from project team and release back to enterprise bench pool?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Remove'),
                      ),
                    ],
                  ),
                );

                if (confirm == true) {
                  await _api.removeTeamMember(widget.project.id, m.userId);
                  widget.onDataChanged?.call();
                }
              }
            },
            itemBuilder: (ctx) => [
              PopupMenuItem(
                value: 'lead',
                child: Row(
                  children: [
                    Icon(
                      LucideIcons.crown,
                      size: 15,
                      color: isLead ? const Color(0xFF64748B) : const Color(0xFFD97706),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      isLead ? 'Change Lead Role' : 'Designate as Team Lead',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isLead ? const Color(0xFF0F172A) : const Color(0xFFD97706),
                      ),
                    ),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(LucideIcons.edit3, size: 15, color: Color(0xFF2563EB)),
                    SizedBox(width: 10),
                    Text(
                      'Adjust Capacity & Role',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                    ),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'remove',
                child: Row(
                  children: [
                    Icon(LucideIcons.userMinus, size: 15, color: Color(0xFFEF4444)),
                    SizedBox(width: 10),
                    Text(
                      'Remove from Project',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFEF4444)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── MODAL: TRANSFER PROJECT LEAD ──────────────────────────────────────────
  // Allows reassigning the project lead/manager to any active employee with
  // optional handover notes, audit trail, and in-app notification dispatch.
  void _showTransferLeadModal() {
    String? selectedUserId;
    String? selectedUserName;
    final handoverCtrl = TextEditingController();
    List<UserProfile> availableUsers = [];
    bool isLoadingUsers = true;
    String? loadError;
    bool isSubmitting = false;

    final currentLeads = widget.project.team.where((m) => m.isLead).toList();
    final currentLeadId = currentLeads.isNotEmpty ? currentLeads.first.userId : null;
    final currentLeadName = currentLeads.isNotEmpty ? currentLeads.first.name : (widget.project.managerName ?? 'Unassigned');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setMState) {
          // Load users once
          if (isLoadingUsers && availableUsers.isEmpty && loadError == null) {
            Future.microtask(() async {
              try {
                List<UserProfile> fetched = await _api.getAvailableLeads();
                if (fetched.isEmpty) {
                  fetched = await _adminApi.getUsers();
                }
                // Sort: current lead first, others alpha
                fetched.sort((a, b) {
                  final aIsLead = a.id == currentLeadId ? 0 : 1;
                  final bIsLead = b.id == currentLeadId ? 0 : 1;
                  if (aIsLead != bIsLead) return aIsLead.compareTo(bIsLead);
                  return a.name.compareTo(b.name);
                });
                if (ctx.mounted) {
                  setMState(() {
                    availableUsers = fetched;
                    isLoadingUsers = false;
                    // Pre-select first non-current lead
                    final candidate = fetched.firstWhere(
                      (u) => u.id != currentLeadId,
                      orElse: () => fetched.first,
                    );
                    selectedUserId = candidate.id;
                    selectedUserName = candidate.name;
                  });
                }
              } catch (err) {
                if (ctx.mounted) {
                  setMState(() {
                    isLoadingUsers = false;
                    loadError = err.toString();
                  });
                }
              }
            });
          }

          return ConstrainedBox(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
            child: Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                left: 20,
                right: 20,
                top: 14,
              ),
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Drag Handle
                    Center(
                      child: Container(
                        width: 40, height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFCBD5E1),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Header
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFFEF3C7), Color(0xFFFDE68A)],
                            ),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFF59E0B)),
                          ),
                          child: const Icon(LucideIcons.crown, size: 20, color: Color(0xFFB45309)),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Transfer Project Leadership',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                              ),
                              Text(
                                'Designate a new project lead with full authority transfer.',
                                style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          icon: const Icon(LucideIcons.x, size: 18, color: Color(0xFF64748B)),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Current Lead Card
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.userCheck, size: 16, color: Color(0xFFB45309)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Current Project Lead', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF92400E))),
                                Text(
                                  currentLeadName,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF78350F)),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFF59E0B)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(LucideIcons.crown, size: 10, color: Color(0xFFB45309)),
                                SizedBox(width: 3),
                                Text('CURRENT', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFFB45309))),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Arrow indicator
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.arrowDown, size: 14, color: Color(0xFF64748B)),
                            SizedBox(width: 4),
                            Text('Transfer To', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // New Lead Picker
                    if (isLoadingUsers)
                      Container(
                        height: 54,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: const Center(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                              SizedBox(width: 10),
                              Text('Loading personnel directory...', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                            ],
                          ),
                        ),
                      )
                    else if (loadError != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFFECACA)),
                        ),
                        child: Row(
                          children: [
                            const Icon(LucideIcons.alertCircle, size: 16, color: Color(0xFFEF4444)),
                            const SizedBox(width: 8),
                            Expanded(child: Text('Failed to load users: $loadError', style: const TextStyle(fontSize: 11, color: Color(0xFF991B1B)))),
                            TextButton(
                              onPressed: () => setMState(() { isLoadingUsers = true; loadError = null; }),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    else
                      DropdownButtonFormField<String>(
                        value: selectedUserId,
                        isExpanded: true,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          labelText: 'New Project Lead *',
                          labelStyle: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          prefixIcon: const Icon(LucideIcons.crown, size: 16, color: Color(0xFFD97706)),
                          filled: true,
                          fillColor: const Color(0xFFFFFBEB),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFFDE68A))),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFFDE68A))),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFD97706), width: 2)),
                        ),
                        items: availableUsers.map((u) {
                          final isCurrent = u.id == currentLeadId;
                          return DropdownMenuItem<String>(
                            value: u.id,
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 12,
                                  backgroundColor: isCurrent ? const Color(0xFFD97706) : const Color(0xFF2563EB),
                                  child: Text(u.name.isNotEmpty ? u.name[0].toUpperCase() : 'U',
                                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(u.name, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                                      Text(u.department ?? u.role.name, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 9.5, color: Color(0xFF64748B))),
                                    ],
                                  ),
                                ),
                                if (isCurrent)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                    decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(4)),
                                    child: const Text('CURRENT', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: Color(0xFFB45309))),
                                  ),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setMState(() {
                            selectedUserId = val;
                            final user = availableUsers.firstWhere((u) => u.id == val, orElse: () => availableUsers.first);
                            selectedUserName = user.name;
                          });
                        },
                      ),
                    const SizedBox(height: 12),

                    // Handover Notes
                    const Text('Handover Notes (Optional)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                    const SizedBox(height: 4),
                    TextField(
                      controller: handoverCtrl,
                      maxLines: 3,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF0F172A)),
                      decoration: InputDecoration(
                        hintText: 'e.g., Active sprint #4 in progress. PR #123 pending review. Architecture doc updated...',
                        hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.all(12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Warning Notice
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF7ED),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFFED7AA)),
                      ),
                      child: const Row(
                        children: [
                          Icon(LucideIcons.alertTriangle, size: 14, color: Color(0xFFEA580C)),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'This action will notify both the current and new lead. An audit trail will be recorded and the new lead will have full project authority.',
                              style: TextStyle(fontSize: 10.5, color: Color(0xFF9A3412), height: 1.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: isSubmitting || selectedUserId == null
                            ? null
                            : () async {
                                if (selectedUserId == currentLeadId) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Selected user is already the project lead.'),
                                      backgroundColor: Color(0xFFF59E0B),
                                    ),
                                  );
                                  return;
                                }
                                setMState(() => isSubmitting = true);
                                final nav = Navigator.of(ctx);
                                final messenger = ScaffoldMessenger.of(context);
                                try {
                                  await _api.changeProjectLead(
                                    widget.project.id,
                                    newManagerId: selectedUserId!,
                                    handoverNotes: handoverCtrl.text.trim().isNotEmpty ? handoverCtrl.text.trim() : null,
                                  );
                                  nav.pop();
                                  widget.onDataChanged?.call();
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content: Text('✅ Project leadership successfully transferred to $selectedUserName.'),
                                      backgroundColor: const Color(0xFF16A34A),
                                    ),
                                  );
                                } catch (e) {
                                  setMState(() => isSubmitting = false);
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content: Text('Failed: $e'),
                                      backgroundColor: const Color(0xFFEF4444),
                                    ),
                                  );
                                }
                              },
                        icon: isSubmitting
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Icon(LucideIcons.crown, size: 16),
                        label: Text(
                          isSubmitting ? 'Transferring...' : 'Transfer Leadership Now',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD97706),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.project;
    final leads = p.team.where((m) => m.isLead).toList();

    // Grouping personnel: Leads, Core Contributors, Interns
    final teamIds = p.team.map((m) => m.userId).toSet();
    final interns = [
      ...p.team.where((m) => m.isIntern),
      ...p.interns.where((i) => !teamIds.contains(i.userId) || i.isIntern),
    ];
    final seenInternIds = <String>{};
    final uniqueInterns = interns.where((i) => seenInternIds.add(i.userId)).toList();

    final contributors = p.team.where((m) => !m.isLead && !m.isIntern).toList();
    final totalPersonnelCount = leads.length + contributors.length + uniqueInterns.length;

    final totalAlloc = p.team.fold<int>(0, (sum, m) => sum + m.allocationPercentage) +
        uniqueInterns.where((i) => !teamIds.contains(i.userId)).fold<int>(0, (sum, i) => sum + i.allocationPercentage);
    final fteCount = (totalAlloc / 100.0).toStringAsFixed(1);

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(14),
      children: [
        // Roster Summary Header Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0F172A).withOpacity(0.04),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFDBEAFE)),
                    ),
                    child: const Icon(LucideIcons.users, size: 20, color: Color(0xFF2563EB)),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Project Engineering Roster',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                            letterSpacing: -0.2,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Dedicated capacity, roles & team leadership',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _showTransferLeadModal(),
                      icon: const Icon(LucideIcons.crown, size: 14, color: Color(0xFFD97706)),
                      label: const Text(
                        'Transfer Lead',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF92400E)),
                      ),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: const Color(0xFFFFFBEB),
                        side: const BorderSide(color: Color(0xFFFDE68A)),
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _showAddTeamMemberModal(),
                      icon: const Icon(LucideIcons.userPlus, size: 14),
                      label: const Text(
                        'Add Member',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildReleaseStatBox(
                      'ACTIVE ROSTER',
                      uniqueInterns.isNotEmpty
                          ? '${leads.length + contributors.length} Core • ${uniqueInterns.length} Interns'
                          : '$totalPersonnelCount Personnel',
                      const Color(0xFF2563EB),
                      const Color(0xFFEFF6FF),
                      const Color(0xFFDBEAFE),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildReleaseStatBox(
                      'TOTAL CAPACITY',
                      '$totalAlloc% ($fteCount FTEs)',
                      const Color(0xFF059669),
                      const Color(0xFFECFDF5),
                      const Color(0xFFA7F3D0),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildReleaseStatBox(
                      'TEAM LEAD',
                      leads.isNotEmpty ? leads.first.name : 'Unassigned',
                      leads.isNotEmpty ? const Color(0xFFD97706) : const Color(0xFF64748B),
                      leads.isNotEmpty ? const Color(0xFFFFFBEB) : const Color(0xFFF8FAFC),
                      leads.isNotEmpty ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        // Unassigned Team Lead Notice Banner
        if (p.team.isNotEmpty && leads.isEmpty) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: const BoxDecoration(
                    color: Color(0xFFFEF3C7),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.crown, size: 16, color: Color(0xFFB45309)),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'No Team Lead Appointed',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF92400E)),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Appoint a Lead to direct sprints & review code deliverables.',
                        style: TextStyle(fontSize: 10.5, color: Color(0xFFB45309)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: () => _showAddTeamMemberModal(null, true),
                  icon: const Icon(LucideIcons.crown, size: 12),
                  label: const Text('Appoint Lead', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD97706),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 16),

        if (totalPersonnelCount == 0)
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Center(
              child: Column(
                children: [
                  const Icon(LucideIcons.userX, size: 36, color: Color(0xFF94A3B8)),
                  const SizedBox(height: 8),
                  const Text(
                    'No personnel allocated to project yet.',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Tap "Add Member" above to assign engineers and set capacity.',
                    style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: [
                      ElevatedButton.icon(
                        onPressed: () => _showAddTeamMemberModal(),
                        icon: const Icon(LucideIcons.userPlus, size: 14),
                        label: const Text('Add Member'),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white),
                      ),
                      ElevatedButton.icon(
                        onPressed: () => _showAddTeamMemberModal(null, true),
                        icon: const Icon(LucideIcons.crown, size: 14),
                        label: const Text('Appoint Team Lead'),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD97706), foregroundColor: Colors.white),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          )
        else ...[
          // 👑 SECTION 1: PROJECT LEADERSHIP & LEADS
          if (leads.isNotEmpty) ...[
            Row(
              children: [
                const Icon(LucideIcons.crown, size: 16, color: Color(0xFFD97706)),
                const SizedBox(width: 6),
                const Text(
                  'Project Leadership & Leads',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Text(
                    '${leads.length} ${leads.length == 1 ? 'Lead' : 'Leads'}',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFFB45309)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ...leads.map((member) => _buildTeamMemberCard(member, isLeadership: true)),
            const SizedBox(height: 16),
          ],

          // 👥 SECTION 2: ENGINEERING & CONTRIBUTORS
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(LucideIcons.users, size: 16, color: Color(0xFF2563EB)),
                  const SizedBox(width: 6),
                  const Text(
                    'Engineering & Contributors',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: Text(
                      '${contributors.length} Members',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF1E40AF)),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),

          if (contributors.isEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Center(
                child: Text(
                  'No additional contributors. Tap "Add Member" to allocate more engineers.',
                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
              ),
            )
          else
            ...contributors.map((member) => _buildTeamMemberCard(member, isLeadership: false)),

          // 🎓 SECTION 3: INTERNS & TRAINEES
          if (uniqueInterns.isNotEmpty) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3E8FF),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Icon(LucideIcons.graduationCap, size: 14, color: Color(0xFF7C3AED)),
                ),
                const SizedBox(width: 6),
                const Text(
                  'Interns & Trainees',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3E8FF),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFDDD6FE)),
                  ),
                  child: Text(
                    '${uniqueInterns.length} ${uniqueInterns.length == 1 ? 'Intern' : 'Interns'}',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF7C3AED)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ...uniqueInterns.map((member) => _buildTeamMemberCard(member, isInternship: true)),
          ],
        ],

        const SizedBox(height: 80),
      ],
    );
  }
}
