import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../theme/app_colors.dart';
import '../../../../theme/app_typography.dart';
import '../../../../models/task_item.dart';
import '../../../../models/user_profile.dart';
import '../../../../features/auth/presentation/controllers/auth_controller.dart';
import '../../data/employee_api.dart';

/// Enterprise Bottom Sheet for Project Leaders to create and assign deliverables.
class AssignTaskSheet extends ConsumerStatefulWidget {
  final List<ProjectMiniInfo> projects;
  final ProjectMiniInfo? initialProject;
  final void Function(TaskItem) onTaskCreated;

  const AssignTaskSheet({
    super.key,
    required this.projects,
    this.initialProject,
    required this.onTaskCreated,
  });

  @override
  ConsumerState<AssignTaskSheet> createState() => _AssignTaskSheetState();
}

class _AssignTaskSheetState extends ConsumerState<AssignTaskSheet> {
  final EmployeeApi _api = EmployeeApi();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _subtaskCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  ProjectMiniInfo? _selectedProject;
  List<UserProfile> _members = [];
  UserProfile? _selectedMember;
  UserProfile? _selectedTester;
  String _priority = 'Medium';
  DateTime? _dueDate;
  final List<String> _subtasks = [];
  bool _loadingMembers = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialProject != null) {
      _selectedProject = widget.initialProject;
    } else if (widget.projects.isNotEmpty) {
      _selectedProject = widget.projects.firstWhere(
        (p) => p.isLeader,
        orElse: () => widget.projects.first,
      );
    }
    if (_selectedProject != null) {
      _loadMembers(_selectedProject!.id);
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _subtaskCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMembers(String projectId) async {
    setState(() {
      _loadingMembers = true;
      _selectedMember = null;
      _selectedTester = null;
    });
    try {
      final members = await _api.getProjectTeamMembers(projectId);
      if (mounted) {
        setState(() {
          _members = members;
          _loadingMembers = false;
          if (_members.isNotEmpty) {
            // Default primary assignee to fullstack/engineer
            _selectedMember = _members.firstWhere(
              (m) =>
                  (m.designation ?? '').toLowerCase().contains('stack') ||
                  (m.designation ?? '').toLowerCase().contains('engineer') ||
                  (m.designation ?? '').toLowerCase().contains('developer'),
              orElse: () => _members.first,
            );
            // Default QA tester to dedicated QA personnel
            _selectedTester = _members.firstWhere(
              (m) =>
                  (m.designation ?? '').toLowerCase().contains('qa') ||
                  (m.designation ?? '').toLowerCase().contains('test'),
              orElse: () => _members.length > 1 ? _members.last : _members.first,
            );
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingMembers = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 5)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppThemeColors.primary,
            onPrimary: Colors.white,
            surface: Colors.white,
            onSurface: AppThemeColors.textPrimary,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _dueDate = picked);
  }

  void _addSubtask() {
    final text = _subtaskCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _subtasks.add(text);
      _subtaskCtrl.clear();
    });
    HapticFeedback.selectionClick();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedProject == null) {
      _showError('Please select a target project');
      return;
    }
    if (_selectedMember == null) {
      _showError('Please assign a primary engineer / team member');
      return;
    }

    setState(() => _submitting = true);
    HapticFeedback.mediumImpact();

    final task = await _api.createProjectTask(
      projectId: _selectedProject!.id,
      title: _titleCtrl.text.trim(),
      description: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
      assignedTo: _selectedMember!.id,
      assignedTester: _selectedTester?.id,
      priority: _priority,
      dueDate: _dueDate?.toIso8601String(),
      subtasks: _subtasks,
    );

    if (mounted) {
      setState(() => _submitting = false);
      if (task != null) {
        Navigator.pop(context);
        widget.onTaskCreated(task);
      } else {
        _showError('Failed to create deliverable. Please verify connection.');
      }
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
        backgroundColor: AppThemeColors.danger,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.92,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(20, 12, 20, 20 + bottomInset),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Sheet Handle
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppThemeColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // ── Shortened Single-Line Header ──────────────────────────────
              Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withOpacity(0.28),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(LucideIcons.plusCircle, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text(
                              'Create Deliverable',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                                letterSpacing: -0.2,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Text(
                                '${(_selectedProject?.code ?? "PRJ").replaceAll("-", "")}-${DateTime.now().year}${DateTime.now().month.toString().padLeft(2, '0')}${DateTime.now().day.toString().padLeft(2, '0')}-00X',
                                style: const TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  fontFamily: 'monospace',
                                  color: Color(0xFF38BDF8),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 1),
                        const Text(
                          'Auto-allocated daily code & QA verification lifecycle',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 19, color: AppThemeColors.textDim),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // ── 1. PROJECT SELECTOR ──────────────────────────────────────────
              if (widget.projects.isNotEmpty) ...[
                _buildFieldLabel('Target Project *'),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: AppThemeColors.surfaceSubtle,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppThemeColors.border),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<ProjectMiniInfo>(
                      isExpanded: true,
                      value: _selectedProject,
                      icon: const Icon(LucideIcons.chevronDown, size: 18, color: AppThemeColors.textMuted),
                      items: widget.projects.map((proj) {
                        return DropdownMenuItem<ProjectMiniInfo>(
                          value: proj,
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppThemeColors.primarySoft,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  proj.code ?? 'PRJ',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: AppThemeColors.primary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  proj.name,
                                  style: AppTypography.bodyMd(color: AppThemeColors.textPrimary),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (proj.isLeader)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppThemeColors.warningSoft,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'LEAD',
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                      color: AppThemeColors.warning,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        );
                      }).toList(),
                      onChanged: (newProj) {
                        if (newProj != null && newProj.id != _selectedProject?.id) {
                          setState(() => _selectedProject = newProj);
                          _loadMembers(newProj.id);
                        }
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // ── 2. DELIVERABLE TITLE ─────────────────────────────────────────
              _buildFieldLabel('Deliverable Title *'),
              const SizedBox(height: 6),
              TextFormField(
                controller: _titleCtrl,
                style: const TextStyle(color: AppThemeColors.textPrimary, fontSize: 13.5, fontWeight: FontWeight.w600),
                decoration: _inputDecoration(
                  hint: 'e.g. Implement OAuth2 Token Refresh Flow',
                  icon: LucideIcons.fileText,
                ),
                validator: (v) => v == null || v.trim().isEmpty ? 'Deliverable title is required' : null,
              ),
              const SizedBox(height: 14),

              // ── 3. DESCRIPTION / CRITERIA ─────────────────────────────────────
              _buildFieldLabel('Description / Acceptance Criteria'),
              const SizedBox(height: 6),
              TextFormField(
                controller: _descCtrl,
                maxLines: 3,
                style: const TextStyle(color: AppThemeColors.textPrimary, fontSize: 12.5),
                decoration: _inputDecoration(
                  hint: 'Detail requirements, architectural scope, and expected test outcomes...',
                ),
              ),
              const SizedBox(height: 14),

              // ── 4. PRIMARY ASSIGNEE (ENGINEER / FULLSTACK) ───────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildFieldLabel('Assign Primary Engineer *'),
                  if (_members.isNotEmpty)
                    InkWell(
                      onTap: () {
                        final currentUserId = ref.read(authProvider).user?.id;
                        final me = _members.where((m) => m.id == currentUserId).firstOrNull ??
                            _members.where((m) =>
                                (m.designation ?? '').toLowerCase().contains('lead') ||
                                (m.designation ?? '').toLowerCase().contains('manager') ||
                                m.role.name.toLowerCase().contains('lead') ||
                                m.role.name.toLowerCase().contains('manager')).firstOrNull;
                        if (me != null) {
                          setState(() => _selectedMember = me);
                          HapticFeedback.selectionClick();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Self-assigned deliverable to ${me.name} (Tech Lead)'),
                              behavior: SnackBarBehavior.floating,
                              duration: const Duration(seconds: 1),
                              backgroundColor: AppThemeColors.primary,
                            ),
                          );
                        }
                      },
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppThemeColors.primarySoft,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppThemeColors.primary.withOpacity(0.2)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(LucideIcons.userCheck, size: 12, color: AppThemeColors.primary),
                            SizedBox(width: 4),
                            Text(
                              'Assign to Me (Tech Lead)',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: AppThemeColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              _loadingMembers
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
                      ),
                    )
                  : _buildAssigneePicker(),
              const SizedBox(height: 14),

              // ── 5. QA TESTER (QUALITY ASSURANCE) ─────────────────────────────
              _buildFieldLabel('Designated QA Tester (Quality Assurance)'),
              const SizedBox(height: 6),
              _buildTesterPicker(),
              const SizedBox(height: 14),

              // ── 6. PRIORITY & DUE DATE ───────────────────────────────────────
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Priority
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFieldLabel('Priority'),
                        const SizedBox(height: 6),
                        _buildPrioritySelector(),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Due Date
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFieldLabel('Target Due Date'),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: _pickDate,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            decoration: BoxDecoration(
                              color: AppThemeColors.surfaceSubtle,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppThemeColors.border),
                            ),
                            child: Row(
                              children: [
                                const Icon(LucideIcons.calendar, size: 16, color: AppThemeColors.primary),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _dueDate == null
                                        ? 'Select date'
                                        : '${_dueDate!.day} ${_monthName(_dueDate!.month)} ${_dueDate!.year}',
                                    style: TextStyle(
                                      color: _dueDate == null ? AppThemeColors.textDim : AppThemeColors.textPrimary,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    overflow: TextOverflow.ellipsis,
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
              ),
              const SizedBox(height: 16),

              // ── 7. SUBTASKS CHECKLIST (INDIVIDUALLY TESTABLE BY QA) ──────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildFieldLabel('Subtasks (Verifiable in QA)'),
                  if (_subtasks.isNotEmpty)
                    Text(
                      '${_subtasks.length} subtask${_subtasks.length > 1 ? "s" : ""}',
                      style: AppTypography.captionXs(color: AppThemeColors.primary),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _subtaskCtrl,
                      style: const TextStyle(fontSize: 13, color: AppThemeColors.textPrimary),
                      decoration: _inputDecoration(
                        hint: 'e.g. Write integration test suite',
                        icon: LucideIcons.listTodo,
                      ),
                      onFieldSubmitted: (_) => _addSubtask(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: _addSubtask,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppThemeColors.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(LucideIcons.plus, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),

              if (_subtasks.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppThemeColors.surfaceSubtle,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppThemeColors.border),
                  ),
                  child: Column(
                    children: _subtasks.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final text = entry.value;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppThemeColors.border),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 20,
                              height: 20,
                              decoration: const BoxDecoration(
                                color: AppThemeColors.primarySoft,
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  '${idx + 1}',
                                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppThemeColors.primary),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                text,
                                style: const TextStyle(fontSize: 12.5, color: AppThemeColors.textPrimary, fontWeight: FontWeight.w500),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(LucideIcons.x, size: 16, color: AppThemeColors.textDim),
                              onPressed: () => setState(() => _subtasks.removeAt(idx)),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],

              const SizedBox(height: 22),

              // ── 8. SUBMIT BUTTON ─────────────────────────────────────────────
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppThemeColors.primary,
                    disabledBackgroundColor: AppThemeColors.primary.withOpacity(0.5),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _submitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(LucideIcons.send, color: Colors.white, size: 17),
                            SizedBox(width: 8),
                            Text(
                              'Create & Assign Deliverable',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13.5),
                            ),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String text) {
    return Text(
      text,
      style: AppTypography.bodySm(color: AppThemeColors.textSecondary).copyWith(
        fontWeight: FontWeight.w700,
      ),
    );
  }

  Widget _buildAssigneePicker() {
    if (_members.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppThemeColors.surfaceSubtle,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppThemeColors.border),
        ),
        child: Row(
          children: const [
            Icon(LucideIcons.info, size: 16, color: AppThemeColors.textDim),
            SizedBox(width: 8),
            Text('No team members found for this project', style: TextStyle(fontSize: 12, color: AppThemeColors.textMuted)),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppThemeColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppThemeColors.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<UserProfile>(
          isExpanded: true,
          value: _selectedMember,
          icon: const Icon(LucideIcons.chevronDown, size: 18, color: AppThemeColors.textMuted),
          items: _members.map((member) {
            final isIntern = (member.designation ?? '').toLowerCase().contains('intern') ||
                member.role.name.toLowerCase().contains('intern');
            return DropdownMenuItem<UserProfile>(
              value: member,
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: isIntern
                        ? const Color(0xFFF3E8FF)
                        : AppThemeColors.primary.withOpacity(0.12),
                    child: isIntern
                        ? const Icon(LucideIcons.graduationCap, size: 14, color: Color(0xFF7C3AED))
                        : Text(
                            member.name.isNotEmpty ? member.name[0].toUpperCase() : 'U',
                            style: const TextStyle(color: AppThemeColors.primary, fontSize: 11, fontWeight: FontWeight.w700),
                          ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                member.name,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppThemeColors.textPrimary),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (isIntern) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF3E8FF),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFFDDD6FE)),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(LucideIcons.graduationCap, size: 8, color: Color(0xFF7C3AED)),
                                    SizedBox(width: 2),
                                    Text(
                                      'INTERN',
                                      style: TextStyle(
                                        fontSize: 7.5,
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
                        Text(
                          member.designation ?? member.role.name,
                          style: TextStyle(
                            fontSize: 11,
                            color: isIntern ? const Color(0xFF7C3AED) : AppThemeColors.textMuted,
                            fontWeight: isIntern ? FontWeight.w600 : FontWeight.normal,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
          onChanged: (newMember) {
            if (newMember != null) {
              setState(() => _selectedMember = newMember);
            }
          },
        ),
      ),
    );
  }

  Widget _buildTesterPicker() {
    if (_members.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppThemeColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppThemeColors.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<UserProfile?>(
          isExpanded: true,
          value: _selectedTester,
          icon: const Icon(LucideIcons.chevronDown, size: 18, color: AppThemeColors.textMuted),
          items: [
            DropdownMenuItem<UserProfile?>(
              value: null,
              child: Row(
                children: [
                  Container(
                    width: 26,
                    height: 26,
                    decoration: const BoxDecoration(
                      color: AppThemeColors.border,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.users, size: 13, color: AppThemeColors.textMuted),
                  ),
                  const SizedBox(width: 10),
                  const Text('General QA Queue (Any Tester)', style: TextStyle(fontSize: 12.5, color: AppThemeColors.textMuted)),
                ],
              ),
            ),
            ..._members.map((m) {
              final isQA = (m.designation ?? '').toLowerCase().contains('qa') ||
                  (m.designation ?? '').toLowerCase().contains('test');
              return DropdownMenuItem<UserProfile?>(
                value: m,
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 13,
                      backgroundColor: isQA ? const Color(0xFF8B5CF6).withOpacity(0.15) : AppThemeColors.surface,
                      child: Text(
                        m.name.isNotEmpty ? m.name[0].toUpperCase() : 'U',
                        style: TextStyle(
                          color: isQA ? const Color(0xFF7C3AED) : AppThemeColors.textSecondary,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  m.name,
                                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppThemeColors.textPrimary),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (isQA) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF3E8FF),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text('QA', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: Color(0xFF7C3AED))),
                                ),
                              ],
                            ],
                          ),
                          Text(
                            m.designation ?? m.role.name,
                            style: const TextStyle(fontSize: 10.5, color: AppThemeColors.textMuted),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
          onChanged: (newTester) {
            setState(() => _selectedTester = newTester);
          },
        ),
      ),
    );
  }

  Widget _buildPrioritySelector() {
    const priorities = [
      {'label': 'Low', 'color': Color(0xFF10B981)},
      {'label': 'Medium', 'color': Color(0xFF2563EB)},
      {'label': 'High', 'color': Color(0xFFF59E0B)},
      {'label': 'Critical', 'color': Color(0xFFEF4444)},
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppThemeColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppThemeColors.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          isExpanded: true,
          value: _priority,
          icon: const Icon(LucideIcons.chevronDown, size: 18, color: AppThemeColors.textMuted),
          items: priorities.map((p) {
            final color = p['color'] as Color;
            final label = p['label'] as String;
            return DropdownMenuItem<String>(
              value: label,
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 8),
                  Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppThemeColors.textPrimary)),
                ],
              ),
            );
          }).toList(),
          onChanged: (v) {
            if (v != null) setState(() => _priority = v);
          },
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({required String hint, IconData? icon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: AppThemeColors.textDim, fontSize: 13),
      filled: true,
      fillColor: AppThemeColors.surfaceSubtle,
      prefixIcon: icon != null ? Icon(icon, size: 16, color: AppThemeColors.textMuted) : null,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppThemeColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppThemeColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppThemeColors.primary, width: 1.5),
      ),
    );
  }

  String _monthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (month >= 1 && month <= 12) ? months[month - 1] : '';
  }
}
