import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../theme/app_colors.dart';
import '../../../../theme/app_typography.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../models/task_item.dart';
import '../../../../features/auth/presentation/controllers/auth_controller.dart';
import '../../data/employee_api.dart';
import '../widgets/task_test_panel.dart';

class TaskDetailScreen extends ConsumerStatefulWidget {
  final TaskItem? initialTask;
  final bool isLeader;
  final void Function(TaskItem)? onTaskUpdated;

  const TaskDetailScreen({
    super.key,
    this.initialTask,
    this.isLeader = false,
    this.onTaskUpdated,
  });

  @override
  ConsumerState<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends ConsumerState<TaskDetailScreen> {
  final EmployeeApi _api = EmployeeApi();
  late TaskItem _task;
  late List<SubTask> _subtasks;
  final TextEditingController _commentController = TextEditingController();
  final List<Map<String, String>> _comments = [];
  bool _sendingToTest = false;
  bool _updatingStatus = false;

  @override
  void initState() {
    super.initState();
    _task = widget.initialTask ??
        TaskItem(
          id: 'demo-1',
          title: 'Implement Mobile Task Details Screen',
          description:
              'Build complete task detail view with subtask checklist, comments stream, and status changer.',
          status: 'In Progress',
          priority: 'High',
          projectName: 'Movi Mobile Launch',
          projectKey: 'MVI-202',
          subtasks: [
            SubTask(id: 's1', title: 'Design card UI and subtasks checklist', completed: true),
            SubTask(id: 's2', title: 'Connect comment submission API', completed: false),
            SubTask(id: 's3', title: 'Integrate native attachment picker', completed: false),
          ],
        );
    _subtasks = List.from(_task.subtasks);
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _toggleSubtask(int idx) async {
    HapticFeedback.selectionClick();
    final old = _subtasks[idx];
    if (_task.eodSubmitted && old.completed) {
      _showToast('Cannot uncheck subtask: Locked in submitted EOD report 🔒', success: false);
      return;
    }
    final updated = old.copyWith(completed: !old.completed);
    setState(() => _subtasks[idx] = updated);

    if (old.id != null) {
      try {
        final serverSubs = await _api.toggleSubtask(_task.id, old.id!);
        if (serverSubs.isNotEmpty && mounted) {
          setState(() => _subtasks = serverSubs);
        }
      } catch (_) {}
    }
  }

  Future<void> _sendToTesting() async {
    setState(() => _sendingToTest = true);
    HapticFeedback.mediumImpact();
    final ok = await _api.sendToTesting(_task.id);
    if (mounted) {
      setState(() => _sendingToTest = false);
      if (ok) {
        final updated = _task.copyWith(status: 'Testing');
        setState(() => _task = updated);
        widget.onTaskUpdated?.call(updated);
        _showToast('Deliverable moved to Testing 🧪', success: true);
      } else {
        _showToast('Failed to move deliverable to testing', success: false);
      }
    }
  }

  Future<void> _changeStatus(String newStatus) async {
    if (_task.eodSubmitted &&
        (newStatus.toLowerCase() == 'todo' || newStatus.toLowerCase() == 'in progress')) {
      _showToast('Cannot revert task: Already included in submitted EOD report 🔒', success: false);
      return;
    }
    setState(() => _updatingStatus = true);
    HapticFeedback.selectionClick();
    try {
      final updated = await _api.updateTaskStatus(_task.id, newStatus);
      if (mounted) {
        setState(() {
          _task = updated;
          _updatingStatus = false;
        });
        widget.onTaskUpdated?.call(updated);
        _showToast('Status updated to $newStatus', success: true);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _updatingStatus = false);
        _showToast('Failed to update status', success: false);
      }
    }
  }

  void _addComment() {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;
    HapticFeedback.lightImpact();
    setState(() {
      _comments.add({
        'author': 'You',
        'text': text,
        'time': 'Just now',
      });
      _commentController.clear();
    });
  }

  void _showToast(String msg, {required bool success}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
        backgroundColor: success ? AppThemeColors.success : AppThemeColors.danger,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authUser = ref.watch(authProvider).user;
    final roleSlug = ref.watch(authProvider).roleSlug.toLowerCase();
    final roleName = (authUser?.role.name ?? '').toLowerCase();
    final userEmail = (authUser?.email ?? '').toLowerCase();
    final userDesignation = (authUser?.designation ?? '').toLowerCase();
    final isTester = roleSlug.contains('qa') ||
        roleSlug.contains('test') ||
        roleName.contains('qa') ||
        roleName.contains('test') ||
        userDesignation.contains('qa') ||
        userDesignation.contains('test') ||
        userEmail.contains('elena') ||
        userEmail.contains('marcus') ||
        _task.assignedTesterId == authUser?.id;
    final canTest = isTester || widget.isLeader;
    final isInReview = _task.status.toLowerCase() == 'in review';
    final isTesting = _task.status.toLowerCase() == 'testing';
    final hasSubtasks = _subtasks.isNotEmpty;
    final completedCount = _subtasks.where((s) => s.completed).length;

    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: AppThemeColors.textPrimary, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _task.projectName ?? 'Deliverable Details',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppThemeColors.textPrimary,
              ),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
            const SizedBox(height: 2),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: AppThemeColors.primarySoft,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    _task.taskCode ?? _task.projectKey ?? 'DELIVERABLE',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'monospace',
                      color: AppThemeColors.primary,
                      letterSpacing: 0.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          _buildStatusMenu(canTest),
          const SizedBox(width: 8),
        ],
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: AppThemeColors.border),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── 0.5. EOD SUBMITTED & LOCKED BANNER ──────────────────────────
            if (_task.eodSubmitted) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF064E3B).withOpacity(0.15),
                      const Color(0xFF065F46).withOpacity(0.08),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(LucideIcons.lock, size: 18, color: Color(0xFF059669)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'LOCKED IN TODAY\'S EOD REPORT',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF059669),
                              letterSpacing: 0.4,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'This deliverable and verified checklist have been submitted in your EOD report and cannot be undone.',
                            style: TextStyle(fontSize: 11.5, color: AppThemeColors.textSecondary, height: 1.3),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],

            // ── 1. DELIVERABLE HERO CARD ────────────────────────────────────
            CustomCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      StatusBadge(label: _task.status, variant: _task.status),
                      _buildPriorityTag(_task.priority),
                      if (_task.taskCode != null)
                        InkWell(
                          onTap: () {
                            Clipboard.setData(ClipboardData(text: _task.taskCode!));
                            HapticFeedback.selectionClick();
                            _showToast('Task Code ${_task.taskCode} copied to clipboard', success: true);
                          },
                          borderRadius: BorderRadius.circular(6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(LucideIcons.hash, size: 10, color: Color(0xFF38BDF8)),
                                const SizedBox(width: 3),
                                Text(
                                  _task.taskCode!,
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                    fontFamily: 'monospace',
                                    color: Colors.white,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                const Icon(LucideIcons.copy, size: 10, color: Color(0xFF94A3B8)),
                              ],
                            ),
                          ),
                        ),
                      if (_task.dueDateTime != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
                          decoration: BoxDecoration(
                            color: _task.isOverdue ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: _task.isOverdue ? const Color(0xFFFECACA) : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                LucideIcons.calendar,
                                size: 11,
                                color: _task.isOverdue ? AppThemeColors.danger : AppThemeColors.textDim,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Due ${_formatDue(_task.dueDateTime!)}',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: _task.isOverdue ? FontWeight.w700 : FontWeight.w500,
                                  color: _task.isOverdue ? AppThemeColors.danger : AppThemeColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _task.title,
                    style: AppTypography.headingLg(color: AppThemeColors.textPrimary).copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (_task.description != null && _task.description!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      _task.description!,
                      style: AppTypography.bodyMd(color: AppThemeColors.textSecondary),
                    ),
                  ],
                ],
              ),
            ),

            // ── 1.5. QA DEFECT BOUNCE-BACK FEEDBACK PANEL ───────────────────
            if (_task.hasQaRejection || (_task.qaRejectionNotes != null && _task.qaRejectionNotes!.isNotEmpty && _task.status.toLowerCase() == 'in progress')) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [
                      Color(0xFFFEF2F2),
                      Color(0xFFFFF1F2),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFFECDD3), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFE11D48).withOpacity(0.08),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE11D48).withOpacity(0.12),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(LucideIcons.alertTriangle, size: 18, color: Color(0xFFE11D48)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'QA FLAW DETECTED • ACTION REQUIRED',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF9F1239),
                                  letterSpacing: 0.4,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Deliverable failed verification & bounced back to In Progress',
                                style: TextStyle(fontSize: 11, color: Color(0xFFBE123C), fontWeight: FontWeight.w500),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE11D48),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'REJECTED',
                            style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.5),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFFFE4E6)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(LucideIcons.messageSquare, size: 14, color: Color(0xFFE11D48)),
                              const SizedBox(width: 6),
                              const Text(
                                'Tester Feedback & Defect Log:',
                                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF881337)),
                              ),
                              const Spacer(),
                              if (_task.qaRejectedAt != null)
                                Text(
                                  _formatDue(_task.qaRejectedAt!),
                                  style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w500),
                                ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _task.qaRejectionNotes ?? 'Subtask verification failed acceptance criteria.',
                            style: const TextStyle(fontSize: 13, color: Color(0xFF1E293B), fontWeight: FontWeight.w600, height: 1.35),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: const [
                        Icon(LucideIcons.info, size: 13, color: Color(0xFFBE123C)),
                        SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Remediate the flagged subtasks below. When fixed, update status back to In Review for lead verification.',
                            style: TextStyle(fontSize: 11, color: Color(0xFF9F1239), fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],

            // ── 2. LEADER CALL TO ACTION: MOVE IN REVIEW → TESTING ──────────
            if (widget.isLeader && isInReview) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppThemeColors.warningSoft,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppThemeColors.warningBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: const [
                        Icon(LucideIcons.alertCircle, size: 18, color: AppThemeColors.warning),
                        SizedBox(width: 8),
                        Text(
                          'Ready for Quality Assurance?',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppThemeColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'As Project Leader, verify acceptance criteria before routing to QA testing pipeline.',
                      style: TextStyle(fontSize: 12, color: AppThemeColors.textSecondary),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      height: 40,
                      child: ElevatedButton.icon(
                        onPressed: _sendingToTest ? null : _sendToTesting,
                        icon: _sendingToTest
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(LucideIcons.send, size: 16),
                        label: const Text(
                          'Send to QA Testing 🚀',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppThemeColors.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // ── 3. ASSIGNEE & ASSIGNER METADATA ─────────────────────────────
            const SizedBox(height: 12),
            CustomCard(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: AppThemeColors.primary.withOpacity(0.12),
                          child: Text(
                            (_task.assignedToName?.isNotEmpty == true)
                                ? _task.assignedToName![0].toUpperCase()
                                : 'U',
                            style: const TextStyle(
                              color: AppThemeColors.primary,
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'ASSIGNED TO',
                                style: AppTypography.captionXs(color: AppThemeColors.textDim),
                              ),
                              Text(
                                _task.assignedToName ?? 'Team Member',
                                style: AppTypography.bodyMd(color: AppThemeColors.textPrimary).copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_task.assignedByName != null) ...[
                    Container(width: 1, height: 32, color: AppThemeColors.border),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 16,
                            backgroundColor: AppThemeColors.purple.withOpacity(0.12),
                            child: Text(
                              _task.assignedByName![0].toUpperCase(),
                              style: const TextStyle(
                                color: AppThemeColors.purple,
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'ASSIGNED BY',
                                  style: AppTypography.captionXs(color: AppThemeColors.textDim),
                                ),
                                Text(
                                  _task.assignedByName!,
                                  style: AppTypography.bodyMd(color: AppThemeColors.textPrimary).copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // ── 4. QA VERIFICATION STATUS (SHOWN TO DEVELOPERS DURING TESTING) ─
            if (isTesting && !canTest) ...[
              const SizedBox(height: 14),
              _buildDeveloperQaVerificationCard(),
            ],

            // ── 4. SUBTASKS CHECKLIST ────────────────────────────────────────
            // Shown when there are subtasks, EXCEPT when a QA tester is in testing mode
            // (since TaskTestPanel provides the dedicated tester matrix with verdicts).
            if (hasSubtasks && !(canTest && isTesting)) ...[
              const SizedBox(height: 14),
              CustomCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(LucideIcons.listChecks, size: 18, color: AppThemeColors.primary),
                            const SizedBox(width: 8),
                            Text(
                              'Subtasks Checklist',
                              style: AppTypography.headingMd(color: AppThemeColors.textPrimary),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: completedCount == _subtasks.length
                                ? AppThemeColors.successSoft
                                : AppThemeColors.primarySoft,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '$completedCount / ${_subtasks.length}',
                            style: TextStyle(
                              color: completedCount == _subtasks.length
                                  ? AppThemeColors.success
                                  : AppThemeColors.primary,
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: _subtasks.isEmpty ? 0 : completedCount / _subtasks.length,
                        backgroundColor: AppThemeColors.surfaceSubtle,
                        color: completedCount == _subtasks.length
                            ? AppThemeColors.success
                            : AppThemeColors.primary,
                        minHeight: 6,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ..._subtasks.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final sub = entry.value;
                      final testResult = _task.testingStatus?.results
                          .where((r) =>
                              (r.subtaskId.isNotEmpty && r.subtaskId == sub.id) ||
                              (r.subtaskTitle.isNotEmpty && r.subtaskTitle == sub.title))
                          .firstOrNull;
                      final isFail = testResult?.result == 'Fail';
                      final isPass = testResult?.result == 'Pass';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        decoration: BoxDecoration(
                          color: isFail
                              ? const Color(0xFFFFF1F2)
                              : isPass
                                  ? const Color(0xFFF0FDF4)
                                  : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          border: isFail
                              ? Border.all(color: const Color(0xFFFECDD3))
                              : isPass
                                  ? Border.all(color: const Color(0xFFBBF7D0))
                                  : null,
                        ),
                        child: InkWell(
                          onTap: isTesting
                              ? () => _showToast('Subtasks are locked during QA testing', success: false)
                              : (_task.eodSubmitted && sub.completed)
                                  ? () => _showToast('Subtask locked: Already included in submitted EOD report 🔒', success: false)
                                  : () => _toggleSubtask(idx),
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      (_task.eodSubmitted && sub.completed)
                                          ? LucideIcons.lock
                                          : (sub.completed ? LucideIcons.checkSquare : LucideIcons.square),
                                      size: 18,
                                      color: (_task.eodSubmitted && sub.completed)
                                          ? const Color(0xFF059669)
                                          : (sub.completed
                                              ? AppThemeColors.success
                                              : (isFail ? const Color(0xFFE11D48) : AppThemeColors.textDim)),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        sub.title,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: sub.completed
                                              ? AppThemeColors.textDim
                                              : AppThemeColors.textPrimary,
                                          decoration: sub.completed ? TextDecoration.lineThrough : null,
                                          fontWeight: sub.completed ? FontWeight.w400 : FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    if (_task.eodSubmitted && sub.completed)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF065F46).withOpacity(0.12),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text(
                                          'EOD LOCKED',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF059669),
                                            letterSpacing: 0.3,
                                          ),
                                        ),
                                      )
                                    else if (isFail)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFE11D48),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text(
                                          'QA FAIL',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.white,
                                            letterSpacing: 0.3,
                                          ),
                                        ),
                                      )
                                    else if (isPass)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF16A34A),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text(
                                          'PASS ✓',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.white,
                                          ),
                                        ),
                                      )
                                    else if (isTesting)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF94A3B8).withOpacity(0.18),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text(
                                          '⏳ PENDING QA',
                                          style: TextStyle(
                                            fontSize: 8.5,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFF475569),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                if (isFail && testResult?.notes != null && testResult!.notes.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Padding(
                                    padding: const EdgeInsets.only(left: 28),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Icon(LucideIcons.alertCircle, size: 12, color: Color(0xFFE11D48)),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            'Tester finding: "${testResult.notes}"',
                                            style: const TextStyle(
                                              fontSize: 11.5,
                                              fontStyle: FontStyle.italic,
                                              color: Color(0xFF9F1239),
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ],

            // ── 5. QA TESTING PIPELINE (ONLY SHOWN TO TESTERS & LEADERS) ─────
            if (isTesting && canTest) ...[
              const SizedBox(height: 14),
              TaskTestPanel(
                task: _task,
                onUpdated: (updated) {
                  setState(() => _task = updated);
                  widget.onTaskUpdated?.call(updated);
                },
              ),
            ],

            // ── 6. COMMENTS STREAM ───────────────────────────────────────────
            const SizedBox(height: 16),
            CustomCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(LucideIcons.messagesSquare, size: 18, color: AppThemeColors.primary),
                      const SizedBox(width: 8),
                      Text(
                        'Discussion & Activity',
                        style: AppTypography.headingMd(color: AppThemeColors.textPrimary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_comments.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Center(
                        child: Text(
                          'No comments yet. Start the conversation...',
                          style: AppTypography.bodySm(color: AppThemeColors.textMuted),
                        ),
                      ),
                    )
                  else
                    ..._comments.map((c) => Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppThemeColors.surfaceSubtle,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    c['author'] ?? 'User',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppThemeColors.textPrimary),
                                  ),
                                  Text(
                                    c['time'] ?? '',
                                    style: const TextStyle(fontSize: 10, color: AppThemeColors.textDim),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                c['text'] ?? '',
                                style: const TextStyle(fontSize: 13, color: AppThemeColors.textSecondary),
                              ),
                            ],
                          ),
                        )),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _commentController,
                          style: const TextStyle(fontSize: 13, color: AppThemeColors.textPrimary),
                          decoration: InputDecoration(
                            hintText: 'Add an update or note...',
                            hintStyle: const TextStyle(color: AppThemeColors.textDim, fontSize: 13),
                            filled: true,
                            fillColor: AppThemeColors.surfaceSubtle,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: AppThemeColors.border),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: AppThemeColors.border),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(LucideIcons.send, color: AppThemeColors.primary),
                        onPressed: _addComment,
                      ),
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

  Widget _buildDeveloperQaVerificationCard() {
    final results = _task.testingStatus?.results ?? [];
    final passCount = results.where((r) => r.result == 'Pass').length;
    final failCount = results.where((r) => r.result == 'Fail').length;
    final total = _subtasks.length;
    final testerName = _task.assignedTesterName ?? 'QA Engineering Team';

    return CustomCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3E8FF),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(LucideIcons.flaskConical, size: 20, color: Color(0xFF9333EA)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'QA Verification in Progress',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Assigned Tester: $testerName',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF6B21A8),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF5FF),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFE9D5FF)),
                ),
                child: Text(
                  '$passCount / $total Passed',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF9333EA),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: AppThemeColors.borderSubtle),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(LucideIcons.info, size: 14, color: AppThemeColors.textDim),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  failCount > 0
                      ? '$failCount defect(s) flagged below. Fix issues and request re-test.'
                      : 'Subtasks are currently locked while QA tests acceptance criteria. You will receive an alert once verified.',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: failCount > 0 ? const Color(0xFFE11D48) : AppThemeColors.textMuted,
                    fontWeight: failCount > 0 ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusMenu(bool canTest) {
    final roleSlug = ref.watch(authProvider).roleSlug.toLowerCase();
    final isLeadOrAdmin = widget.isLeader || canTest || roleSlug.contains('admin') || roleSlug.contains('lead') || roleSlug.contains('hr');
    final statuses = isLeadOrAdmin
        ? const ['Todo', 'In Progress', 'In Review', 'Testing', 'Done']
        : const ['Todo', 'In Progress', 'In Review'];

    return PopupMenuButton<String>(
      icon: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: AppThemeColors.surfaceSubtle,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppThemeColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _task.status,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppThemeColors.textPrimary),
            ),
            if (_task.eodSubmitted) ...[
              const SizedBox(width: 4),
              const Icon(LucideIcons.lock, size: 12, color: Color(0xFF059669)),
            ],
            const SizedBox(width: 4),
            const Icon(LucideIcons.chevronDown, size: 14, color: AppThemeColors.textMuted),
          ],
        ),
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      itemBuilder: (_) => statuses.map((s) {
        return PopupMenuItem(
          value: s,
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: _statusColor(s),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                s,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: s == _task.status ? FontWeight.w700 : FontWeight.w500,
                  color: s == _task.status ? AppThemeColors.primary : AppThemeColors.textPrimary,
                ),
              ),
            ],
          ),
        );
      }).toList(),
      onSelected: (newStatus) {
        if (newStatus != _task.status && !_updatingStatus) {
          _changeStatus(newStatus);
        }
      },
    );
  }

  Widget _buildPriorityTag(String priority) {
    Color color;
    switch (priority.toLowerCase()) {
      case 'critical':
        color = AppThemeColors.danger;
        break;
      case 'high':
        color = AppThemeColors.warning;
        break;
      case 'low':
        color = AppThemeColors.success;
        break;
      default:
        color = AppThemeColors.primary;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 4),
          Text(
            priority.toUpperCase(),
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: color),
          ),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'done':
        return AppThemeColors.success;
      case 'in review':
        return AppThemeColors.warning;
      case 'testing':
        return AppThemeColors.purple;
      case 'in progress':
        return AppThemeColors.primary;
      default:
        return AppThemeColors.textDim;
    }
  }

  String _formatDue(DateTime date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }
}
