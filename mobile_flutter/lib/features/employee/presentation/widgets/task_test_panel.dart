import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../theme/app_colors.dart';
import '../../../../models/task_item.dart';
import '../../data/employee_api.dart';

/// QA Testing Panel — shown inside TaskDetailScreen when status == 'Testing'.
/// Testers can mark each subtask as Pass or Fail with optional notes.
class TaskTestPanel extends StatefulWidget {
  final TaskItem task;
  final void Function(TaskItem) onUpdated;

  const TaskTestPanel({
    super.key,
    required this.task,
    required this.onUpdated,
  });

  @override
  State<TaskTestPanel> createState() => _TaskTestPanelState();
}

class _TaskTestPanelState extends State<TaskTestPanel> {
  final EmployeeApi _api = EmployeeApi();
  late List<_SubtaskTestState> _states;
  // ignore: prefer_final_fields
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _buildStates();
  }

  @override
  void didUpdateWidget(TaskTestPanel old) {
    super.didUpdateWidget(old);
    if (old.task.id != widget.task.id) _buildStates();
  }

  void _buildStates() {
    final testResults = widget.task.testingStatus?.results ?? [];
    _states = widget.task.subtasks.map((sub) {
      final existing = testResults.where((r) => r.subtaskId == sub.id).firstOrNull;
      return _SubtaskTestState(
        subtaskId: sub.id ?? '',
        title: sub.title,
        result: existing?.result ?? 'Pending',
        notes: existing?.notes ?? '',
        notesCtrl: TextEditingController(text: existing?.notes ?? ''),
      );
    }).toList();
  }

  Future<void> _submitVerdict(int idx, String result) async {
    if (_submitting) return;
    final s = _states[idx];
    if (s.subtaskId.isEmpty) return;

    setState(() {
      _states[idx] = s.copyWith(result: result, saving: true);
    });
    HapticFeedback.lightImpact();

    final updatedTask = await _api.submitTestResult(
      taskId: widget.task.id,
      subtaskId: s.subtaskId,
      result: result,
      notes: s.notesCtrl.text.trim().isEmpty ? null : s.notesCtrl.text.trim(),
    );

    if (mounted) {
      final success = updatedTask != null;
      setState(() {
        _states[idx] = s.copyWith(result: success ? result : s.result, saving: false);
      });
      if (success) {
        HapticFeedback.selectionClick();
        if (updatedTask.status.toLowerCase() == 'in progress' && result == 'Fail') {
          _showToast('🚨 Defect recorded: Deliverable returned to In Progress for developer fixes', false);
        } else if (updatedTask.status.toLowerCase() == 'done') {
          _showToast('🎉 All subtasks passed! Deliverable marked Done with zero defects!', true);
        } else {
          _showToast('${s.title} marked as $result', result == 'Pass');
        }
        widget.onUpdated(updatedTask);
      }
    }
  }

  void _showToast(String msg, bool success) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: success ? AppColors.success : AppColors.danger,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  void dispose() {
    for (final s in _states) {
      s.notesCtrl.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_states.isEmpty) {
      return _EmptySubtasks();
    }

    final overallResult = widget.task.testingStatus?.overallResult ?? 'Pending';
    final allDone = _states.every((s) => s.result != 'Pending');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Panel header ────────────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                const Color(0xFF7C3AED).withOpacity(0.08),
                const Color(0xFF6D28D9).withOpacity(0.04),
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF7C3AED).withOpacity(0.2)),
          ),
          child: Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(LucideIcons.flaskConical,
                    color: Color(0xFF7C3AED), size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'QA Testing Panel',
                      style: TextStyle(
                        color: Color(0xFF0F172A),
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      '${_states.where((s) => s.result != 'Pending').length}/${_states.length} subtasks reviewed',
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              // Overall result badge
              if (allDone) _OverallBadge(overallResult),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // ── Overall progress bar ────────────────────────────────────────────
        _ProgressBar(
          done: _states.where((s) => s.result != 'Pending').length,
          total: _states.length,
          passed: _states.where((s) => s.result == 'Pass').length,
          failed: _states.where((s) => s.result == 'Fail').length,
        ),

        const SizedBox(height: 16),

        // ── Subtask test items ──────────────────────────────────────────────
        ..._states.asMap().entries.map((e) => _SubtaskTestItem(
              state: e.value,
              onPass: () => _submitVerdict(e.key, 'Pass'),
              onFail: () => _submitVerdict(e.key, 'Fail'),
              onReset: () => _submitVerdict(e.key, 'Pending'),
            )),
      ],
    );
  }
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
class _ProgressBar extends StatelessWidget {
  final int done;
  final int total;
  final int passed;
  final int failed;

  const _ProgressBar({
    required this.done,
    required this.total,
    required this.passed,
    required this.failed,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            _Stat('Passed', passed, AppColors.success),
            const SizedBox(width: 16),
            _Stat('Failed', failed, AppColors.danger),
            const SizedBox(width: 16),
            _Stat('Pending', total - done, const Color(0xFF94A3B8)),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: SizedBox(
            height: 6,
            child: Row(
              children: [
                if (passed > 0)
                  Flexible(
                    flex: passed,
                    child: Container(color: AppColors.success),
                  ),
                if (failed > 0)
                  Flexible(
                    flex: failed,
                    child: Container(color: AppColors.danger),
                  ),
                if (total - done > 0)
                  Flexible(
                    flex: total - done,
                    child: Container(color: const Color(0xFFE2E8F0)),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _Stat(this.label, this.count, this.color);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 8, height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          '$count $label',
          style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

// ─── Subtask Test Item ────────────────────────────────────────────────────────
class _SubtaskTestItem extends StatefulWidget {
  final _SubtaskTestState state;
  final VoidCallback onPass;
  final VoidCallback onFail;
  final VoidCallback onReset;

  const _SubtaskTestItem({
    required this.state,
    required this.onPass,
    required this.onFail,
    required this.onReset,
  });

  @override
  State<_SubtaskTestItem> createState() => _SubtaskTestItemState();
}

class _SubtaskTestItemState extends State<_SubtaskTestItem> {
  bool _expanded = false;

  Color get _resultColor {
    switch (widget.state.result) {
      case 'Pass':
        return AppColors.success;
      case 'Fail':
        return AppColors.danger;
      default:
        return const Color(0xFF94A3B8);
    }
  }

  IconData get _resultIcon {
    switch (widget.state.result) {
      case 'Pass':
        return LucideIcons.checkCircle2;
      case 'Fail':
        return LucideIcons.xCircle;
      default:
        return LucideIcons.circle;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isPending = widget.state.result == 'Pending';
    final isPassed = widget.state.result == 'Pass';
    final isFailed = widget.state.result == 'Fail';

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isPassed
            ? AppColors.success.withOpacity(0.04)
            : isFailed
                ? AppColors.danger.withOpacity(0.04)
                : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isPassed
              ? AppColors.success.withOpacity(0.25)
              : isFailed
                  ? AppColors.danger.withOpacity(0.25)
                  : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(_resultIcon, color: _resultColor, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    widget.state.title,
                    style: TextStyle(
                      color: const Color(0xFF0F172A),
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      decoration: isPassed ? TextDecoration.lineThrough : null,
                      decorationColor: AppColors.success,
                    ),
                  ),
                ),
                if (widget.state.saving)
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                else if (isPending) ...[
                  _ActionBtn(
                    label: 'Pass',
                    color: AppColors.success,
                    icon: LucideIcons.check,
                    onTap: widget.onPass,
                  ),
                  const SizedBox(width: 6),
                  _ActionBtn(
                    label: 'Fail',
                    color: AppColors.danger,
                    icon: LucideIcons.x,
                    onTap: widget.onFail,
                  ),
                ] else ...[
                  GestureDetector(
                    onTap: () => setState(() => _expanded = !_expanded),
                    child: Icon(
                      _expanded ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                      size: 16,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Expanded notes + reset
          if (_expanded && !isPending) ...[
            const Divider(height: 1, color: Color(0xFFE9EEF4)),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: widget.state.notesCtrl,
                    maxLines: 2,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF374151)),
                    decoration: InputDecoration(
                      hintText: 'Add notes about this subtask...',
                      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      TextButton.icon(
                        onPressed: isPassed ? widget.onFail : widget.onPass,
                        icon: Icon(
                          isPassed ? LucideIcons.x : LucideIcons.check,
                          size: 14,
                          color: isPassed ? AppColors.danger : AppColors.success,
                        ),
                        label: Text(
                          isPassed ? 'Mark as Fail' : 'Mark as Pass',
                          style: TextStyle(
                            color: isPassed ? AppColors.danger : AppColors.success,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style: TextButton.styleFrom(padding: EdgeInsets.zero),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: widget.onReset,
                        child: const Text(
                          'Reset',
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;

  const _ActionBtn({
    required this.label,
    required this.color,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OverallBadge extends StatelessWidget {
  final String result;
  const _OverallBadge(this.result);

  @override
  Widget build(BuildContext context) {
    Color color;
    IconData icon;
    switch (result) {
      case 'Passed':
        color = AppColors.success;
        icon = LucideIcons.shieldCheck;
        break;
      case 'Failed':
        color = AppColors.danger;
        icon = LucideIcons.shieldOff;
        break;
      case 'Partial':
        color = AppColors.warning;
        icon = LucideIcons.shieldAlert;
        break;
      default:
        color = const Color(0xFF94A3B8);
        icon = LucideIcons.shield;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(
            result,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptySubtasks extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: const Center(
        child: Text(
          'No subtasks to test for this task.',
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        ),
      ),
    );
  }
}

// ─── State model ──────────────────────────────────────────────────────────────
class _SubtaskTestState {
  final String subtaskId;
  final String title;
  final String result;
  final String notes;
  final TextEditingController notesCtrl;
  final bool saving;

  _SubtaskTestState({
    required this.subtaskId,
    required this.title,
    required this.result,
    required this.notes,
    required this.notesCtrl,
    this.saving = false,
  });

  _SubtaskTestState copyWith({
    String? result,
    String? notes,
    bool? saving,
  }) {
    return _SubtaskTestState(
      subtaskId: subtaskId,
      title: title,
      result: result ?? this.result,
      notes: notes ?? this.notes,
      notesCtrl: notesCtrl,
      saving: saving ?? this.saving,
    );
  }
}
