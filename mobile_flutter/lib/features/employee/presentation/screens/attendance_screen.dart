import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../../theme/app_colors.dart';
import '../../../../theme/app_typography.dart';
import '../../../../core/widgets/screen_container.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../core/widgets/shimmer_skeleton.dart';
import '../../../../models/task_item.dart';
import '../../../../models/leave_item.dart';
import '../../../../models/attendance_record.dart';
import '../../data/employee_api.dart';
import 'task_detail_screen.dart';
import '../controllers/attendance_controller.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  final EmployeeApi _api = EmployeeApi();

  bool get _isIntern {
    final user = ref.read(authProvider).user;
    if (user == null) return true;
    final slug = user.role.slug.toLowerCase();
    final name = user.role.name.toLowerCase();
    return slug.contains('intern') || name.contains('intern');
  }
  double get _standardShiftHours => _isIntern ? 3.0 : 8.0;
  double get _halfDayHours => _isIntern ? 1.5 : 4.5;

  bool _loadingSecondary = false;
  List<TaskItem> _tasks = [];
  LeaveBalance? _leaveBalance;
  List<LeaveRequestItem> _leaveRequests = [];

  // Work Mode Selection: Remote, Client Site, Office (Defaults to Remote)
  String _selectedWorkMode = 'Remote';

  // Top Tabs: exactly 2 tabs per enterprise standard
  // 0 = Today's Shift, 1 = Shift History
  int _activeViewIndex = 0;

  // Sub-tab inside Shift History (0 = Shift Logs, 1 = Leave Requests)
  int _historySubTabIndex = 0;

  // Today's Deliverables Filter & Accordion Expansion State
  String _deliverableFilter = 'All'; // 'All', 'Active', 'Completed'
  final Set<String> _expandedTaskIds = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(attendanceProvider.notifier).loadAttendance();
    });
    _loadSecondaryData();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(attendanceProvider.notifier).loadAttendance();
      _loadSecondaryData();
    }
  }

  Future<void> _loadSecondaryData() async {
    setState(() => _loadingSecondary = true);
    try {
      List<TaskItem> tasks = [];
      LeaveBalance? balance;
      List<LeaveRequestItem> leaveReqs = [];

      try {
        tasks = await _api.getMyTasks();
      } catch (_) {}

      try {
        balance = await _api.getLeaveBalance();
      } catch (_) {}

      try {
        leaveReqs = await _api.getMyLeaveRequests();
      } catch (_) {}

      if (mounted) {
        setState(() {
          _tasks = tasks;
          _leaveBalance = balance;
          _leaveRequests = leaveReqs;
          for (final t in tasks) {
            if (t.subtasks.isNotEmpty) {
              _expandedTaskIds.add(t.id);
            }
          }
        });
      }
    } finally {
      if (mounted) setState(() => _loadingSecondary = false);
    }
  }

  Future<void> _loadAllData() async {
    await Future.wait([
      ref.read(attendanceProvider.notifier).loadAttendance(),
      _loadSecondaryData(),
    ]);
  }

  Future<void> _handlePunchIn() async {
    HapticFeedback.mediumImpact();
    final success = await ref.read(attendanceProvider.notifier).clockIn(
      workMode: _selectedWorkMode,
    );

    if (mounted) {
      if (success) {
        _showBannerDialog(
          title: 'Shift Clocked In',
          message: 'Your shift has started under "$_selectedWorkMode" mode. Start timestamp has been recorded in the database.',
          isError: false,
        );
      } else {
        final err = ref.read(attendanceProvider).errorMessage ??
            'Could not record check-in. Please ensure connectivity and try again.';
        _showBannerDialog(
          title: 'Punch In Failed',
          message: err,
          isError: true,
        );
      }
    }
  }

  Future<void> _handlePunchOut() async {
    HapticFeedback.heavyImpact();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.darkSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Confirm Clock Out', style: AppTypography.headingLg(color: AppColors.darkText)),
        content: Text(
          'Are you sure you want to end your workday shift? You will complete your EOD report before finalizing your stop time.',
          style: AppTypography.bodySm(color: AppColors.darkTextMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: AppColors.darkTextDim)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Proceed', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    if (mounted) {
      await _openEodReportModal();
    }
  }

  Future<void> _doCheckOut() async {
    HapticFeedback.heavyImpact();
    final success = await ref.read(attendanceProvider.notifier).clockOut();
    if (mounted) {
      if (success) {
        _showBannerDialog(
          title: 'Shift Complete! 🎉',
          message: 'Your shift stop time and total hours have been safely recorded in the database.',
          isError: false,
        );
      } else {
        final err = ref.read(attendanceProvider).errorMessage ??
            'Could not record check-out. Please try again.';
        _showBannerDialog(
          title: 'Punch Out Failed',
          message: err,
          isError: true,
        );
      }
    }
  }

  // ─── BREAK MANAGEMENT ────────────────────────────────────────────────────────

  Future<void> _handleBreakToggle() async {
    HapticFeedback.mediumImpact();
    final wasOnBreak = ref.read(attendanceProvider).isOnBreak;
    final success = await ref.read(attendanceProvider.notifier).toggleBreak();
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              wasOnBreak ? 'Shift resumed! Break duration deducted from net hours.' : 'Break started! Timer is paused.',
            ),
            backgroundColor: wasOnBreak ? const Color(0xFF059669) : const Color(0xFFD97706),
            duration: const Duration(seconds: 2),
          ),
        );
      } else {
        final err = ref.read(attendanceProvider).errorMessage ?? 'Failed to update break status.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  // ─── ADD PERSONAL TASK MODAL ──────────────────────────────────────────────

  void _openAddTaskModal() {
    HapticFeedback.selectionClick();
    final titleCtrl = TextEditingController();
    final notesCtrl = TextEditingController();
    String priority = 'Medium';
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Container(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 28,
          ),
          decoration: const BoxDecoration(
            color: AppColors.darkSurface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40, height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.darkBorder,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(LucideIcons.plus, size: 20, color: Color(0xFF6366F1)),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Add Personal Task', style: AppTypography.headingLg(color: AppColors.darkText)),
                        Text('Only visible to you • Auto-appears in EOD', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                Text('TASK TITLE *', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                const SizedBox(height: 6),
                TextField(
                  controller: titleCtrl,
                  autofocus: true,
                  style: AppTypography.bodyMd(color: AppColors.darkText),
                  decoration: InputDecoration(
                    hintText: 'e.g. Review PR #142, Write unit tests for auth module...',
                    hintStyle: AppTypography.bodySm(color: AppColors.darkTextDim),
                    filled: true,
                    fillColor: AppColors.darkBg,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF6366F1))),
                  ),
                ),
                const SizedBox(height: 14),

                Text('PRIORITY', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                const SizedBox(height: 8),
                Row(
                  children: ['Low', 'Medium', 'High', 'Critical'].map((p) {
                    final isSelected = priority == p;
                    final Color pc = p == 'Critical' ? AppColors.danger
                        : p == 'High' ? AppColors.warning
                        : p == 'Medium' ? AppColors.primaryLight
                        : AppColors.success;
                    return Expanded(
                      child: GestureDetector(
                        onTap: () => setModalState(() => priority = p),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          margin: const EdgeInsets.only(right: 6),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? pc.withOpacity(0.15) : AppColors.darkBg,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isSelected ? pc : AppColors.darkBorder,
                              width: isSelected ? 1.5 : 1.0,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              p,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: isSelected ? pc : AppColors.darkTextMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),

                Text('NOTES (optional)', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                const SizedBox(height: 6),
                TextField(
                  controller: notesCtrl,
                  maxLines: 2,
                  style: AppTypography.bodyMd(color: AppColors.darkText),
                  decoration: InputDecoration(
                    hintText: 'Any context or links...',
                    hintStyle: AppTypography.bodySm(color: AppColors.darkTextDim),
                    filled: true,
                    fillColor: AppColors.darkBg,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                  ),
                ),
                const SizedBox(height: 20),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: isSubmitting
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(LucideIcons.plus, size: 18, color: Colors.white),
                    label: Text(
                      isSubmitting ? 'Adding...' : 'Add to Today\'s Tasks',
                      style: AppTypography.buttonText(),
                    ),
                    onPressed: isSubmitting ? null : () async {
                      final t = titleCtrl.text.trim();
                      if (t.isEmpty) {
                        ScaffoldMessenger.of(modalCtx).showSnackBar(
                          const SnackBar(content: Text('Please enter a task title.')),
                        );
                        return;
                      }
                      setModalState(() => isSubmitting = true);
                      final created = await _api.createPersonalTask(
                        title: t,
                        priority: priority,
                        notes: notesCtrl.text.trim().isEmpty ? null : notesCtrl.text.trim(),
                      );
                      setModalState(() => isSubmitting = false);
                      if (modalCtx.mounted) Navigator.pop(modalCtx);
                      if (created != null && mounted) {
                        setState(() => _tasks = [created, ..._tasks]);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('"${created.title}" added to your deliverables.'),
                            backgroundColor: const Color(0xFF6366F1),
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
      ),
    );
  }

  // ─── EOD REPORT MODAL (Auto-opens on Clock-Out & Viewable anytime) ─────────

  Future<void> _openEodReportModal() async {
    final completedTasks = _tasks.where((t) =>
        t.isCompleted ||
        t.status.toLowerCase() == 'in review' ||
        t.status.toLowerCase() == 'done' ||
        t.subtasks.any((s) => s.completed)).toList();
    final remainingTasks = _tasks.where((t) =>
        !t.isCompleted &&
        t.status.toLowerCase() != 'in review' &&
        t.status.toLowerCase() != 'done').toList();

    final attState = ref.read(attendanceProvider);
    final elapsed = attState.elapsedShift;
    final hasCheckedOut = attState.isShiftCompleted;
    final double netHours = (attState.todayRecord?.netHoursWorked ??
        attState.todayRecord?.hoursWorked ??
        (elapsed.inSeconds / 3600.0));
    final double grossHours = netHours + ((attState.todayRecord?.totalBreakMinutes ?? 0) / 60.0);
    final grossH = netHours.floor();
    final grossM = ((netHours - grossH) * 60).round();
    final breakMins = (attState.todayRecord?.totalBreakMinutes ?? 0).round();

    final additionalNotesCtrl = TextEditingController();
    final blockersCtrl = TextEditingController();
    final learningsCtrl = TextEditingController();

    String defaultTomorrow = '';
    if (remainingTasks.isNotEmpty) {
      defaultTomorrow = remainingTasks.map((t) => '• Continue: ${t.taskCode != null ? "[${t.taskCode}] " : ""}${t.title}').join('\n');
    }
    final tomorrowCtrl = TextEditingController(text: defaultTomorrow);
    String selectedMood = 'good';
    bool hasBlockers = false;
    bool isSubmitting = false;

    final moodData = [
      {'key': 'exhausted', 'emoji': '😴', 'label': 'Tired'},
      {'key': 'low', 'emoji': '😐', 'label': 'Slow'},
      {'key': 'neutral', 'emoji': '🙂', 'label': 'Steady'},
      {'key': 'good', 'emoji': '😃', 'label': 'Productive'},
      {'key': 'energized', 'emoji': '🚀', 'label': 'Crushed It!'},
    ];

    final moodEmojiMap = {
      'exhausted': '😴',
      'low': '😐',
      'neutral': '🙂',
      'good': '😃',
      'energized': '🚀',
    };

    String buildAccomplishedText() {
      final buf = StringBuffer();
      final tasksToReport = completedTasks.isNotEmpty ? completedTasks : _tasks;
      for (final t in tasksToReport) {
        final codePrefix = t.taskCode != null ? '[${t.taskCode}] ' : '';
        buf.writeln('• $codePrefix${t.title} (${t.priority.toUpperCase()})');
        for (final s in t.subtasks) {
          final mark = s.completed ? '✔' : '◻';
          buf.writeln('   $mark ${s.title}');
        }
      }
      if (additionalNotesCtrl.text.trim().isNotEmpty) {
        buf.writeln('\n• Additional Highlights / PRs:\n  ${additionalNotesCtrl.text.trim()}');
      }
      return buf.toString().trim();
    }

    String buildReportMarkdown({
      required String accomplished,
      required String blockers,
      required String learnings,
      required String tomorrow,
      required String mood,
    }) {
      final currentUser = ref.read(authProvider).user;
      final userName = currentUser?.name ?? 'Team Member';
      final roleName = currentUser?.role.name ?? 'Developer';
      final todayFormatted = DateFormat('EEEE, MMMM d, yyyy').format(DateTime.now());
      final inTime = attState.todayRecord?.checkIn ?? '--:--';
      final outTime = attState.todayRecord?.checkOut ?? DateFormat('hh:mm a').format(DateTime.now());
      final totalPts = _tasks.fold<int>(0, (s, t) => s + t.priorityPoints);
      final donePts = completedTasks.fold<int>(0, (s, t) => s + t.priorityPoints);

      final lines = <String>[
        '📋 *END-OF-DAY (EOD) REPORT*',
        '👤 *Employee:* $userName ($roleName)',
        '📅 *Date:* $todayFormatted',
        '⏱ *Shift Timing:* $inTime – $outTime (${grossH}h ${grossM}m net logged, $_selectedWorkMode)',
        '⚡ *Velocity:* $donePts / $totalPts pts • ${completedTasks.length}/${_tasks.length} Deliverables Done',
        '',
        '✅ *ACCOMPLISHED TODAY:*',
        accomplished.isNotEmpty ? accomplished : '• Completed scheduled workday assignments',
        '',
        '🔴 *BLOCKERS / IMPEDIMENTS:*',
        blockers.isNotEmpty ? blockers : '🟢 None (All systems operational)',
        '',
        if (learnings.isNotEmpty) ...[
          '💡 *KEY LEARNINGS:*',
          learnings,
          '',
        ],
        '📅 *TOMORROW\'S PLAN:*',
        tomorrow.isNotEmpty ? tomorrow : '• Continue sprint priorities & next deliverables',
        '',
        '🌟 *ENERGY / MOOD:* ${moodEmojiMap[mood] ?? "🙂"} ${mood.toUpperCase()}',
      ];
      return lines.join('\n');
    }

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      enableDrag: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Container(
          height: MediaQuery.of(modalCtx).size.height * 0.93,
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Top drag bar
              const SizedBox(height: 12),
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Header with Title and Close Button (Zero Overflow Layout)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 14, 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFDBEAFE)),
                      ),
                      child: const Icon(LucideIcons.clipboardCheck, size: 22, color: Color(0xFF2563EB)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFDBEAFE)),
                                ),
                                child: const Text(
                                  'DAILY WORKDAY SYNC',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF2563EB),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          const Text(
                            'End-of-Day (EOD) Report',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              letterSpacing: -0.3,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Logged: ${grossH}h ${grossM}m${breakMins > 0 ? " • Break: ${breakMins}m" : ""} • Broadcast to Project Group',
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    Container(
                      decoration: const BoxDecoration(
                        color: Color(0xFFF1F5F9),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(LucideIcons.x, size: 18, color: Color(0xFF64748B)),
                        padding: const EdgeInsets.all(6),
                        constraints: const BoxConstraints(),
                        onPressed: () => Navigator.pop(modalCtx),
                      ),
                    ),
                  ],
                ),
              ),

              const Divider(height: 1, color: Color(0xFFE2E8F0)),

              // Scrollable Form Body
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Target Group Channel Info - Compact Pill Dock
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF10B981).withOpacity(0.4),
                                    blurRadius: 4,
                                    spreadRadius: 1,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: RichText(
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                text: const TextSpan(
                                  text: 'Connected: ',
                                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                                  children: [
                                    TextSpan(
                                      text: '#general',
                                      style: TextStyle(fontSize: 12, color: Color(0xFF0F172A), fontWeight: FontWeight.w700),
                                    ),
                                    TextSpan(
                                      text: ' • Team Channels',
                                      style: TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFDBEAFE)),
                              ),
                              child: const Text(
                                'Auto-Sync ⚡',
                                style: TextStyle(color: Color(0xFF2563EB), fontSize: 10.5, fontWeight: FontWeight.w800),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Velocity / Energy Selector - Unified Segmented Dock
                      const Text(
                        'HOW WAS YOUR WORKDAY VELOCITY?',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: moodData.map((m) {
                            final isSelected = selectedMood == m['key'];
                            return Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  HapticFeedback.selectionClick();
                                  setModalState(() => selectedMood = m['key']!);
                                },
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 180),
                                  curve: Curves.easeOutCubic,
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  decoration: BoxDecoration(
                                    color: isSelected ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(10),
                                    border: isSelected
                                        ? Border.all(color: const Color(0xFF2563EB), width: 1.5)
                                        : Border.all(color: Colors.transparent),
                                    boxShadow: isSelected
                                        ? [
                                            BoxShadow(
                                              color: const Color(0xFF2563EB).withOpacity(0.12),
                                              blurRadius: 8,
                                              offset: const Offset(0, 2),
                                            )
                                          ]
                                        : null,
                                  ),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(m['emoji']!, style: const TextStyle(fontSize: 20)),
                                      const SizedBox(height: 3),
                                      Text(
                                        m['label']!,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 9.5,
                                          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                          color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF64748B),
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
                      const SizedBox(height: 18),

                      // Deliverables Accomplished Section
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(LucideIcons.checkCircle2, size: 14, color: Color(0xFF2563EB)),
                              SizedBox(width: 6),
                              Text(
                                'DELIVERABLES ACCOMPLISHED TODAY',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.6,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFDBEAFE)),
                            ),
                            child: Text(
                              '${completedTasks.length} Deliverables',
                              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Verified deliverables & subtasks will be permanently locked once submitted.',
                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 10),

                      // Structured Deliverables Cards - Linear Style with 3.5px Priority Accent Bar
                      if (completedTasks.isNotEmpty) ...[
                        ...completedTasks.map((t) {
                          Color priorityColor;
                          switch (t.priority.toLowerCase()) {
                            case 'critical':
                              priorityColor = const Color(0xFFEF4444);
                              break;
                            case 'high':
                              priorityColor = const Color(0xFFF59E0B);
                              break;
                            case 'low':
                              priorityColor = const Color(0xFF10B981);
                              break;
                            default:
                              priorityColor = const Color(0xFF2563EB);
                              break;
                          }

                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF0F172A).withOpacity(0.04),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: IntrinsicHeight(
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    // 3.5px Priority Accent Bar
                                    Container(width: 3.5, color: priorityColor),
                                    Expanded(
                                      child: Padding(
                                        padding: const EdgeInsets.all(12),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                if (t.taskCode != null) ...[
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: const Color(0xFFF1F5F9),
                                                      borderRadius: BorderRadius.circular(4),
                                                      border: Border.all(color: const Color(0xFFE2E8F0)),
                                                    ),
                                                    child: Text(
                                                      t.taskCode!,
                                                      style: const TextStyle(
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.w800,
                                                        fontFamily: 'monospace',
                                                        color: Color(0xFF0284C7),
                                                        letterSpacing: 0.3,
                                                      ),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 6),
                                                ],
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFFECFDF5),
                                                    borderRadius: BorderRadius.circular(4),
                                                    border: Border.all(color: const Color(0xFFA7F3D0)),
                                                  ),
                                                  child: Text(
                                                    t.status,
                                                    style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                                                  ),
                                                ),
                                                const Spacer(),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: priorityColor.withOpacity(0.1),
                                                    borderRadius: BorderRadius.circular(4),
                                                    border: Border.all(color: priorityColor.withOpacity(0.25)),
                                                  ),
                                                  child: Text(
                                                    t.priority.toUpperCase(),
                                                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: priorityColor),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              t.title,
                                              style: const TextStyle(
                                                fontSize: 13.5,
                                                fontWeight: FontWeight.w700,
                                                color: Color(0xFF0F172A),
                                                height: 1.35,
                                              ),
                                            ),
                                            if (t.subtasks.isNotEmpty) ...[
                                              const SizedBox(height: 8),
                                              ...t.subtasks.map((s) => Padding(
                                                    padding: const EdgeInsets.only(bottom: 6),
                                                    child: Row(
                                                      crossAxisAlignment: CrossAxisAlignment.center,
                                                      children: [
                                                        Container(
                                                          width: 16,
                                                          height: 16,
                                                          decoration: BoxDecoration(
                                                            shape: BoxShape.circle,
                                                            color: s.completed ? const Color(0xFF10B981) : const Color(0xFFF8FAFC),
                                                            border: Border.all(
                                                              color: s.completed ? const Color(0xFF10B981) : const Color(0xFFCBD5E1),
                                                              width: 1.4,
                                                            ),
                                                          ),
                                                          child: s.completed
                                                              ? const Icon(LucideIcons.check, size: 10, color: Colors.white)
                                                              : null,
                                                        ),
                                                        const SizedBox(width: 8),
                                                        Expanded(
                                                          child: Text(
                                                            s.title,
                                                            style: TextStyle(
                                                              fontSize: 12,
                                                              color: s.completed ? const Color(0xFF334155) : const Color(0xFF64748B),
                                                              fontWeight: s.completed ? FontWeight.w600 : FontWeight.w400,
                                                            ),
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  )),
                                            ],
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }),
                      ] else ...[
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: const Row(
                            children: [
                              Icon(LucideIcons.info, size: 16, color: Color(0xFF2563EB)),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'No deliverables marked complete yet. Check subtasks in the main view or write your highlights below.',
                                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.35),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 10),

                      // Additional highlights & PR links
                      _buildEodField(
                        label: 'ADDITIONAL HIGHLIGHTS, COMMITS & PRS (OPTIONAL)',
                        hint: 'PR #12, commit hashes, code reviews, deployment links...',
                        controller: additionalNotesCtrl,
                        maxLines: 2,
                        icon: LucideIcons.gitPullRequest,
                        iconColor: const Color(0xFF2563EB),
                      ),
                      const SizedBox(height: 16),

                      // Blockers / Impediments with Segmented Pill Toggle
                      const Row(
                        children: [
                          Icon(LucideIcons.alertTriangle, size: 12, color: Color(0xFFF59E0B)),
                          SizedBox(width: 5),
                          Text(
                            'BLOCKERS / IMPEDIMENTS',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.6,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () => setModalState(() {
                                  hasBlockers = false;
                                  blockersCtrl.clear();
                                }),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  decoration: BoxDecoration(
                                    color: !hasBlockers ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                    border: !hasBlockers ? Border.all(color: const Color(0xFF10B981), width: 1.2) : Border.all(color: Colors.transparent),
                                    boxShadow: !hasBlockers
                                        ? [
                                            BoxShadow(
                                              color: const Color(0xFF10B981).withOpacity(0.12),
                                              blurRadius: 4,
                                              offset: const Offset(0, 1),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(LucideIcons.checkCircle2, size: 13, color: !hasBlockers ? const Color(0xFF059669) : const Color(0xFF94A3B8)),
                                      const SizedBox(width: 6),
                                      Text(
                                        'All Clear (No Blockers)',
                                        style: TextStyle(
                                          fontSize: 11.5,
                                          fontWeight: !hasBlockers ? FontWeight.w700 : FontWeight.w500,
                                          color: !hasBlockers ? const Color(0xFF059669) : const Color(0xFF64748B),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: GestureDetector(
                                onTap: () => setModalState(() => hasBlockers = true),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  decoration: BoxDecoration(
                                    color: hasBlockers ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                    border: hasBlockers ? Border.all(color: const Color(0xFFEF4444), width: 1.2) : Border.all(color: Colors.transparent),
                                    boxShadow: hasBlockers
                                        ? [
                                            BoxShadow(
                                              color: const Color(0xFFEF4444).withOpacity(0.12),
                                              blurRadius: 4,
                                              offset: const Offset(0, 1),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(LucideIcons.alertCircle, size: 13, color: hasBlockers ? const Color(0xFFDC2626) : const Color(0xFF94A3B8)),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Had Impediments',
                                        style: TextStyle(
                                          fontSize: 11.5,
                                          fontWeight: hasBlockers ? FontWeight.w700 : FontWeight.w500,
                                          color: hasBlockers ? const Color(0xFFDC2626) : const Color(0xFF64748B),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (hasBlockers) ...[
                        const SizedBox(height: 8),
                        TextField(
                          controller: blockersCtrl,
                          maxLines: 2,
                          autofocus: true,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF991B1B), fontWeight: FontWeight.w500),
                          decoration: InputDecoration(
                            hintText: 'Describe technical bugs, API blocks, or dependency issues...',
                            hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFFF87171)),
                            filled: true,
                            fillColor: const Color(0xFFFEF2F2),
                            contentPadding: const EdgeInsets.all(12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFFECACA))),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFFECACA))),
                            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFEF4444), width: 1.5)),
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),

                      // Learnings
                      _buildEodField(
                        label: 'KEY LEARNINGS & ARCHITECTURE NOTES',
                        hint: 'Technical takeaways, solved problems, design patterns...',
                        controller: learningsCtrl,
                        maxLines: 2,
                        icon: LucideIcons.brain,
                        iconColor: const Color(0xFF8B5CF6),
                      ),
                      const SizedBox(height: 14),

                      // Next Day Plan
                      _buildEodField(
                        label: "NEXT WORKING DAY'S PLAN",
                        hint: 'Upcoming tasks, sprint milestones to tackle next...',
                        controller: tomorrowCtrl,
                        maxLines: 2,
                        icon: LucideIcons.sunrise,
                        iconColor: const Color(0xFFF59E0B),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),

              // Fixed Bottom Action Bar (Sticky, Safe Dock)
              Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: const Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0F172A).withOpacity(0.06),
                      blurRadius: 16,
                      offset: const Offset(0, -4),
                    ),
                  ],
                ),
                child: SafeArea(
                  top: false,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          // Action Button 1: Send to Team Group Chat (Executive Royal Blue Gradient)
                          Expanded(
                            child: SizedBox(
                              height: 48,
                              child: Container(
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF2563EB).withOpacity(0.3),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    shadowColor: Colors.transparent,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    padding: const EdgeInsets.symmetric(horizontal: 16),
                                  ),
                                  icon: isSubmitting
                                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                      : const Icon(LucideIcons.send, size: 16, color: Colors.white),
                                  label: Text(
                                    isSubmitting
                                        ? 'Broadcasting to Team...'
                                        : (hasCheckedOut ? 'Send EOD to Team 🚀' : 'Send EOD & Clock Out 🚀'),
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: Colors.white, letterSpacing: 0.2),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  onPressed: isSubmitting
                                      ? null
                                      : () async {
                                          final accomplishedText = buildAccomplishedText();
                                          final blockersText = hasBlockers && blockersCtrl.text.trim().isNotEmpty
                                              ? blockersCtrl.text.trim()
                                              : '';

                                          setModalState(() => isSubmitting = true);

                                          // Collect task IDs that were completed/reported in this EOD
                                          final tasksToLock = completedTasks.isNotEmpty ? completedTasks : _tasks;
                                          final taskIds = tasksToLock.map((t) => t.id).toList();

                                          // Submit to EOD database and lock tasks
                                          try {
                                            await _api.submitEodReport(
                                              tasksCompleted: accomplishedText,
                                              blockers: blockersText.isEmpty ? null : blockersText,
                                              learnings: learningsCtrl.text.trim().isEmpty ? null : learningsCtrl.text.trim(),
                                              plansTomorrow: tomorrowCtrl.text.trim().isEmpty ? null : tomorrowCtrl.text.trim(),
                                              mood: selectedMood,
                                              hoursWorked: grossHours,
                                              netHoursWorked: netHours,
                                              taskIds: taskIds,
                                            );
                                          } catch (_) {}

                                          // Update local task state immediately to reflect locked status
                                          if (mounted) {
                                            setState(() {
                                              _tasks = _tasks.map((t) {
                                                if (taskIds.contains(t.id)) {
                                                  return t.copyWith(
                                                    status: 'Done',
                                                    eodSubmitted: true,
                                                    eodSubmittedAt: DateTime.now(),
                                                    subtasks: t.subtasks
                                                        .map((s) => SubTask(
                                                              id: s.id,
                                                              title: s.title,
                                                              completed: true,
                                                            ))
                                                        .toList(),
                                                  );
                                                }
                                                return t;
                                              }).toList();
                                            });
                                          }

                                          if (modalCtx.mounted) Navigator.pop(modalCtx);

                                          if (!hasCheckedOut) {
                                            await _doCheckOut();
                                          }

                                          await _loadSecondaryData();

                                          if (mounted) {
                                            _showBannerDialog(
                                              title: 'EOD Dispatched & Tasks Locked! 🚀',
                                              message: 'Your End-of-Day report has been synchronized with HR and posted to the project team group. Completed deliverables are now locked from changes.',
                                              isError: false,
                                            );
                                          }
                                        },
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          // Action Button 2: Copy to Clipboard Icon Button
                          SizedBox(
                            height: 48,
                            width: 48,
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                backgroundColor: const Color(0xFFF8FAFC),
                                foregroundColor: const Color(0xFF0F172A),
                                side: const BorderSide(color: Color(0xFFE2E8F0)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: EdgeInsets.zero,
                              ),
                              child: const Icon(LucideIcons.copy, size: 18, color: Color(0xFF475569)),
                              onPressed: () {
                                final accomplishedText = buildAccomplishedText();
                                final blockersText = hasBlockers && blockersCtrl.text.trim().isNotEmpty
                                    ? blockersCtrl.text.trim()
                                    : '';
                                final markdown = buildReportMarkdown(
                                  accomplished: accomplishedText,
                                  blockers: blockersText,
                                  learnings: learningsCtrl.text.trim(),
                                  tomorrow: tomorrowCtrl.text.trim(),
                                  mood: selectedMood,
                                );
                                Clipboard.setData(ClipboardData(text: markdown));
                                HapticFeedback.mediumImpact();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Row(
                                      children: [
                                        Icon(LucideIcons.check, color: Colors.white, size: 16),
                                        SizedBox(width: 8),
                                        Expanded(child: Text('EOD Report copied! Ready to paste into chat.')),
                                      ],
                                    ),
                                    backgroundColor: AppColors.success,
                                    duration: Duration(seconds: 3),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),

                      if (!hasCheckedOut) ...[
                        const SizedBox(height: 6),
                        TextButton(
                          onPressed: isSubmitting
                              ? null
                              : () async {
                                  if (modalCtx.mounted) Navigator.pop(modalCtx);
                                  await _doCheckOut();
                                },
                          child: const Text(
                            'Skip EOD & Clock Out',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ],
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

  Future<void> _confirmResetToday() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.darkSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(LucideIcons.rotateCcw, color: AppColors.danger, size: 20),
            SizedBox(width: 8),
            Text('Reset Today Shift?', style: TextStyle(color: AppColors.darkText, fontSize: 16, fontWeight: FontWeight.w700)),
          ],
        ),
        content: const Text(
          'This will delete today\'s clock-in/out records from the server and reset the stopwatch back to 00h 00m 00s so you can re-test attendance from scratch.\n\nAre you sure?',
          style: TextStyle(color: AppColors.darkTextMuted, fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: AppColors.darkTextMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Reset Shift'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await ref.read(attendanceProvider.notifier).resetToday();
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Today shift reset! Ready to test clock-in.'),
              backgroundColor: AppColors.success,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to reset today shift.'),
              backgroundColor: AppColors.danger,
            ),
          );
        }
      }
    }
  }

  Widget _buildEodField({
    required String label,
    required String hint,
    required TextEditingController controller,
    required int maxLines,
    required IconData icon,
    required Color iconColor,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 13, color: iconColor),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
                color: Color(0xFF475569),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          maxLines: maxLines,
          style: const TextStyle(
            fontSize: 13,
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.w500,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: iconColor, width: 1.5)),
          ),
        ),
      ],
    );
  }

  Future<void> _toggleTaskStatus(TaskItem task) async {
    HapticFeedback.selectionClick();
    if (task.eodSubmitted) {
      HapticFeedback.heavyImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFFD97706),
          content: Row(
            children: [
              Icon(LucideIcons.lock, color: Colors.white, size: 16),
              SizedBox(width: 8),
              Expanded(
                child: Text('This deliverable has been submitted in today\'s EOD report and is locked 🔒'),
              ),
            ],
          ),
          duration: Duration(seconds: 3),
        ),
      );
      return;
    }
    final newStatus = task.isCompleted ? 'In Progress' : 'Done';

    setState(() {
      final idx = _tasks.indexWhere((t) => t.id == task.id);
      if (idx != -1) {
        // If marking complete, mark all subtasks complete as well
        final updatedSubtasks = (newStatus == 'Done')
            ? task.subtasks.map((s) => SubTask(id: s.id, title: s.title, completed: true)).toList()
            : task.subtasks;
        _tasks[idx] = task.copyWith(status: newStatus, subtasks: updatedSubtasks);
      }
    });

    try {
      await _api.updateTaskStatus(task.id, newStatus);
    } catch (e) {
      if (mounted) {
        setState(() {
          final idx = _tasks.indexWhere((t) => t.id == task.id);
          if (idx != -1) {
            _tasks[idx] = task;
          }
        });
        String errMsg = 'Failed to update deliverable. Please try again.';
        if (e is DioException && e.response?.data != null) {
          final d = e.response!.data;
          if (d is Map && d['message'] != null) {
            errMsg = d['message'].toString();
          }
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF991B1B),
            content: Text(errMsg),
          ),
        );
      }
    }
  }

  Future<void> _toggleSubtask(TaskItem task, SubTask subtask) async {
    HapticFeedback.selectionClick();
    if (task.eodSubmitted && subtask.completed) {
      HapticFeedback.heavyImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFFD97706),
          content: Row(
            children: [
              Icon(LucideIcons.lock, color: Colors.white, size: 16),
              SizedBox(width: 8),
              Expanded(
                child: Text('Cannot undo subtask: Task was locked upon EOD report submission 🔒'),
              ),
            ],
          ),
          duration: Duration(seconds: 3),
        ),
      );
      return;
    }
    final taskIdx = _tasks.indexWhere((t) => t.id == task.id);
    if (taskIdx == -1) return;

    final subtaskIdx = task.subtasks.indexWhere((s) =>
        (s.id != null && s.id == subtask.id) || s.title == subtask.title);
    if (subtaskIdx == -1) return;

    final updatedCompleted = !subtask.completed;
    final updatedSubtasks = List<SubTask>.from(task.subtasks);
    updatedSubtasks[subtaskIdx] = SubTask(
      id: subtask.id,
      title: subtask.title,
      completed: updatedCompleted,
    );

    // If all subtasks completed, auto-mark task as Done (finished).
    // If unchecking a completed task, move back to In Progress
    final allDone = updatedSubtasks.every((s) => s.completed);
    final newStatus = allDone
        ? 'Done'
        : (task.status.toLowerCase() == 'done'
            ? 'In Progress'
            : task.status);

    setState(() {
      _tasks[taskIdx] = task.copyWith(
        subtasks: updatedSubtasks,
        status: newStatus,
      );
    });

    try {
      final subtaskIdOrIndex = (subtask.id != null && subtask.id!.isNotEmpty)
          ? subtask.id!
          : subtaskIdx.toString();
      await _api.toggleSubtask(task.id, subtaskIdOrIndex);
      if (allDone && task.status.toLowerCase() != newStatus.toLowerCase()) {
        await _api.updateTaskStatus(task.id, newStatus);
      }
    } catch (e) {
      String errMsg = 'Failed to update subtask. Please try again.';
      if (e is DioException && e.response?.data is Map) {
        final serverMsg = e.response?.data['message']?.toString();
        if (serverMsg != null && serverMsg.isNotEmpty) {
          errMsg = serverMsg;
        }
      }
      if (mounted) {
        setState(() {
          _tasks[taskIdx] = task;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF991B1B),
            content: Text(errMsg),
          ),
        );
      }
    }
  }

  void _showBannerDialog({required String title, required String message, bool isError = false}) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.darkSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(
              isError ? LucideIcons.alertCircle : LucideIcons.checkCircle2,
              color: isError ? AppColors.danger : AppColors.success,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(child: Text(title, style: AppTypography.headingLg(color: AppColors.darkText))),
          ],
        ),
        content: Text(message, style: AppTypography.bodySm(color: AppColors.darkTextMuted)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('OK', style: TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // ─── LEAVE APPLICATION MODAL (Direct to HR Leave Management) ───────────────

  void _openApplyLeaveModal() {
    HapticFeedback.selectionClick();
    DateTime fromDate = DateTime.now().add(const Duration(days: 1));
    DateTime toDate = DateTime.now().add(const Duration(days: 1));
    String leaveType = 'casual'; // casual, sick, earned, unpaid
    String session = 'Full Day'; // Full Day, First Half, Second Half
    final reasonCtrl = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) {
          final diffDays = toDate.difference(fromDate).inDays + 1;
          final durationLabel = session == 'Full Day'
              ? (diffDays <= 1 ? '1 Day' : '$diffDays Days')
              : '0.5 Day ($session)';

          return Container(
            padding: EdgeInsets.only(
              top: 20,
              left: 20,
              right: 20,
              bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
            ),
            decoration: const BoxDecoration(
              color: AppColors.darkSurface,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
                      decoration: BoxDecoration(
                        color: AppColors.darkBorder,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Header
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(LucideIcons.calendarDays, size: 20, color: AppColors.primaryLight),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Apply for Leave', style: AppTypography.headingXl(color: AppColors.darkText)),
                            Text('Direct routing to HR Leave Management', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // Quota balance chips
                  Text('LEAVE QUOTA BALANCES', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _buildQuotaMiniPill('Casual', '${_leaveBalance?.casualLeave.remaining ?? 10}d left', AppColors.primaryLight),
                      const SizedBox(width: 8),
                      _buildQuotaMiniPill('Sick', '${_leaveBalance?.sickLeave.remaining ?? 7}d left', AppColors.warning),
                      const SizedBox(width: 8),
                      _buildQuotaMiniPill('Earned', '${_leaveBalance?.earnedLeave.remaining ?? 15}d left', AppColors.success),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Leave Type Selection
                  Text('SELECT LEAVE CATEGORY *', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildLeaveTypeChip('casual', 'Casual Leave', leaveType, (val) => setModalState(() => leaveType = val)),
                      _buildLeaveTypeChip('sick', 'Sick Leave', leaveType, (val) => setModalState(() => leaveType = val)),
                      _buildLeaveTypeChip('earned', 'Earned Leave', leaveType, (val) => setModalState(() => leaveType = val)),
                      _buildLeaveTypeChip('unpaid', 'Loss of Pay', leaveType, (val) => setModalState(() => leaveType = val)),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Date Range Pickers (From Date -> To Date)
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('FROM DATE *', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                            const SizedBox(height: 6),
                            InkWell(
                              onTap: () async {
                                final picked = await showDatePicker(
                                  context: modalCtx,
                                  initialDate: fromDate,
                                  firstDate: DateTime.now().subtract(const Duration(days: 30)),
                                  lastDate: DateTime.now().add(const Duration(days: 365)),
                                  builder: (c, child) => Theme(
                                    data: ThemeData.dark().copyWith(
                                      colorScheme: const ColorScheme.dark(primary: AppColors.primaryLight),
                                    ),
                                    child: child!,
                                  ),
                                );
                                if (picked != null) {
                                  setModalState(() {
                                    fromDate = picked;
                                    if (toDate.isBefore(fromDate)) toDate = fromDate;
                                  });
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                                decoration: BoxDecoration(
                                  color: AppColors.darkBg,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppColors.darkBorder),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(DateFormat('MMM d, yyyy').format(fromDate), style: AppTypography.bodyMd(color: AppColors.darkText)),
                                    const Icon(LucideIcons.calendar, size: 16, color: AppColors.primaryLight),
                                  ],
                                ),
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
                            Text('TO DATE *', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                            const SizedBox(height: 6),
                            InkWell(
                              onTap: () async {
                                final picked = await showDatePicker(
                                  context: modalCtx,
                                  initialDate: toDate.isBefore(fromDate) ? fromDate : toDate,
                                  firstDate: fromDate,
                                  lastDate: DateTime.now().add(const Duration(days: 365)),
                                  builder: (c, child) => Theme(
                                    data: ThemeData.dark().copyWith(
                                      colorScheme: const ColorScheme.dark(primary: AppColors.primaryLight),
                                    ),
                                    child: child!,
                                  ),
                                );
                                if (picked != null) {
                                  setModalState(() => toDate = picked);
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                                decoration: BoxDecoration(
                                  color: AppColors.darkBg,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppColors.darkBorder),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(DateFormat('MMM d, yyyy').format(toDate), style: AppTypography.bodyMd(color: AppColors.darkText)),
                                    const Icon(LucideIcons.calendar, size: 16, color: AppColors.primaryLight),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Duration and Session Bar
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.darkBg,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.darkBorder),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(LucideIcons.clock, size: 14, color: AppColors.primaryLight),
                            const SizedBox(width: 6),
                            Text('Duration: $durationLabel',
                                style: AppTypography.bodySm(color: AppColors.darkText).copyWith(fontWeight: FontWeight.w700)),
                          ],
                        ),
                        DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: session,
                            dropdownColor: AppColors.darkSurface,
                            style: const TextStyle(fontSize: 12, color: AppColors.primaryLight, fontWeight: FontWeight.bold),
                            items: ['Full Day', 'First Half', 'Second Half']
                                .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                                .toList(),
                            onChanged: (val) {
                              if (val != null) setModalState(() => session = val);
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Reason for Leave
                  Text('REASON FOR LEAVE *', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: reasonCtrl,
                    maxLines: 3,
                    style: AppTypography.bodyMd(color: AppColors.darkText),
                    decoration: InputDecoration(
                      hintText: 'Provide details for HR review (e.g. personal emergency, medical checkup, family event)...',
                      hintStyle: AppTypography.bodySm(color: AppColors.darkTextDim),
                      filled: true,
                      fillColor: AppColors.darkBg,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Submit Button
                  CustomButton(
                    text: 'Submit to HR for Approval',
                    isLoading: isSubmitting,
                    icon: const Icon(LucideIcons.send, size: 18, color: Colors.white),
                    onPressed: () async {
                      final reason = reasonCtrl.text.trim();
                      if (reason.isEmpty) {
                        ScaffoldMessenger.of(modalCtx).showSnackBar(
                          const SnackBar(content: Text('Please provide a reason for the leave request.')),
                        );
                        return;
                      }

                      setModalState(() => isSubmitting = true);
                      try {
                        final formattedStart = DateFormat('yyyy-MM-dd').format(fromDate);
                        final formattedEnd = DateFormat('yyyy-MM-dd').format(toDate);
                        await _api.applyLeave(
                          leaveType: leaveType,
                          startDate: formattedStart,
                          endDate: formattedEnd,
                          reason: session == 'Full Day' ? reason : '[$session] $reason',
                        );
                        setModalState(() => isSubmitting = false);
                        if (modalCtx.mounted) Navigator.pop(modalCtx);
                        if (mounted) {
                          _showBannerDialog(
                            title: 'Leave Request Submitted',
                            message: 'Your leave application from $formattedStart to $formattedEnd has been routed to HR for approval.',
                          );
                          _loadAllData();
                        }
                      } catch (e) {
                        setModalState(() => isSubmitting = false);
                        String errMsg = 'Failed to submit leave request. Please verify fields and try again.';
                        if (e is DioException && e.response?.data != null) {
                          final d = e.response!.data;
                          if (d is Map && d['message'] != null) {
                            errMsg = d['message'].toString();
                          }
                        }
                        if (modalCtx.mounted) {
                          ScaffoldMessenger.of(modalCtx).showSnackBar(
                            SnackBar(
                              backgroundColor: const Color(0xFF991B1B),
                              content: Text(errMsg),
                            ),
                          );
                        }
                      }
                    },
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildQuotaMiniPill(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(color: AppColors.darkText, fontSize: 11, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaveTypeChip(String type, String label, String selectedType, Function(String) onSelect) {
    final isSelected = selectedType == type;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppColors.primaryLight,
      backgroundColor: AppColors.darkBg,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : AppColors.darkTextMuted,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
      onSelected: (_) => onSelect(type),
    );
  }

  @override
  Widget build(BuildContext context) {
    final attState = ref.watch(attendanceProvider);
    final hours = attState.elapsedShift.inHours;
    final minutes = attState.elapsedShift.inMinutes.remainder(60);
    final seconds = attState.elapsedShift.inSeconds.remainder(60);
    final formattedShift = '${hours.toString().padLeft(2, '0')}h ${minutes.toString().padLeft(2, '0')}m ${seconds.toString().padLeft(2, '0')}s';
    final progress = (attState.elapsedShift.inMinutes / (_standardShiftHours * 60)).clamp(0.0, 1.0);

    if ((attState.isLoading || _loadingSecondary) && attState.todayRecord == null) {
      return const ScreenContainer(
        child: SkeletonAttendanceScreen(),
      );
    }

    return ScreenContainer(
      onRefresh: _loadAllData,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Bar with Apply Leave action
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Workday Attendance', style: AppTypography.headingXl(color: AppColors.darkText)),
                    const SizedBox(height: 2),
                    Text(
                      'Shift Stopwatch & Team Deliverables Tracker',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.bodySm(color: AppColors.darkTextMuted),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primaryLight,
                  side: const BorderSide(color: AppColors.primaryLight),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                ),
                icon: const Icon(LucideIcons.calendarPlus, size: 15),
                label: const Text('Apply Leave', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                onPressed: _openApplyLeaveModal,
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Top Bar: Exactly 2 Tabs (Enterprise Standard)
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.darkSurface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.darkBorder),
            ),
            child: Row(
              children: [
                _buildSegmentTab(
                  index: 0,
                  title: "Today's Shift",
                  icon: LucideIcons.clock,
                ),
                _buildSegmentTab(
                  index: 1,
                  title: 'Shift History',
                  icon: LucideIcons.history,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Render Active View
          if (_activeViewIndex == 0) ...[
            _buildTodayShiftView(attState, formattedShift, progress),
          ] else ...[
            _buildShiftHistoryView(attState),
          ],
        ],
      ),
    );
  }

  Widget _buildSegmentTab({required int index, required String title, required IconData icon, int badgeCount = 0}) {
    final isSelected = _activeViewIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          setState(() => _activeViewIndex = index);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primaryLight : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 15, color: isSelected ? Colors.white : AppColors.darkTextMuted),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: isSelected ? Colors.white : AppColors.darkTextMuted,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
              if (badgeCount > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.white.withOpacity(0.3) : AppColors.warning,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$badgeCount',
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ─── TAB 1: TODAY'S SHIFT VIEW ──────────────────────────────────────────────

  Widget _buildTodayShiftView(AttendanceState attState, String formattedShift, double progress) {
    final hasRecordedCheckIn = attState.todayRecord?.checkIn != null;
    final isCurrentlyPunchedIn = attState.isPunchedIn;
    final hasCheckedOut = attState.isShiftCompleted;
    final isOnBreak = attState.isOnBreak;
    final isPunching = attState.isPunching;
    final breakM = attState.elapsedBreak.inMinutes;
    final breakS = attState.elapsedBreak.inSeconds.remainder(60);

    IconData modeIcon;
    switch (_selectedWorkMode) {
      case 'Client Site':
        modeIcon = LucideIcons.briefcase;
        break;
      case 'Office':
        modeIcon = LucideIcons.building2;
        break;
      case 'Remote':
      default:
        modeIcon = LucideIcons.laptop;
        break;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Work Mode Selector Strip: Remote (Default), Client Site, Office
        if (!hasRecordedCheckIn) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('SELECT WORK MODE', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(LucideIcons.shieldCheck, size: 10, color: Color(0xFF10B981)),
                    SizedBox(width: 4),
                    Text(
                      'No Geofencing Required',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF10B981)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildWorkModePill('Remote', LucideIcons.laptop),
              const SizedBox(width: 8),
              _buildWorkModePill('Client Site', LucideIcons.briefcase),
              const SizedBox(width: 8),
              _buildWorkModePill('Office', LucideIcons.building2),
            ],
          ),
          const SizedBox(height: 14),
        ],

        // Hero Punch & Shift Card
        CustomCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          DateFormat('EEEE, MMMM d, yyyy').format(DateTime.now()).toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.captionXs(color: AppColors.darkTextMuted).copyWith(
                            letterSpacing: 0.8,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Icon(
                              modeIcon,
                              size: 13,
                              color: AppColors.primaryLight,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                'Mode: $_selectedWorkMode (Cloud Direct)',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.captionXs(color: AppColors.primaryLight).copyWith(fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isOnBreak)
                        const StatusBadge(label: 'On Break', variant: 'warning')
                      else if (isCurrentlyPunchedIn)
                        StatusBadge(
                          label: 'Present • In at ${attState.todayRecord?.checkIn ?? ""}',
                          variant: 'present',
                        )
                      else if (hasCheckedOut)
                        const StatusBadge(label: 'Completed', variant: 'info')
                      else
                        const StatusBadge(label: 'Not Marked', variant: 'pending'),
                      if (hasRecordedCheckIn) ...[
                        const SizedBox(width: 4),
                        Tooltip(
                          message: 'Reset Today Shift (Test)',
                          child: InkWell(
                            borderRadius: BorderRadius.circular(6),
                            onTap: _confirmResetToday,
                            child: const Padding(
                              padding: EdgeInsets.all(4),
                              child: Icon(LucideIcons.rotateCcw, size: 14, color: AppColors.darkTextDim),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Digital Shift Stopwatch Meter
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [
                      Color(0xFF0F172A),
                      Color(0xFF1E293B),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isOnBreak
                        ? const Color(0xFFF59E0B).withOpacity(0.6)
                        : (isCurrentlyPunchedIn
                            ? const Color(0xFF10B981).withOpacity(0.5)
                            : const Color(0xFF334155)),
                    width: (isOnBreak || isCurrentlyPunchedIn) ? 1.5 : 1.0,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: (isOnBreak
                              ? const Color(0xFFF59E0B)
                              : (hasRecordedCheckIn ? const Color(0xFF10B981) : const Color(0xFF0F172A)))
                          .withOpacity(0.08),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: isOnBreak
                                ? const Color(0xFFF59E0B)
                                : (isCurrentlyPunchedIn ? const Color(0xFF10B981) : (hasCheckedOut ? const Color(0xFF60A5FA) : const Color(0xFF94A3B8))),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          isOnBreak
                              ? 'SHIFT PAUSED • BREAK: ${breakM}m ${breakS.toString().padLeft(2, '0')}s'
                              : (isCurrentlyPunchedIn
                                  ? 'ACTIVE WORKDAY SHIFT • RUNNING'
                                  : (hasCheckedOut ? 'TOTAL HOURS LOGGED • SYNCHRONIZED' : 'STANDARD WORKDAY: ${_standardShiftHours.toStringAsFixed(1)} HOURS')),
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      hasRecordedCheckIn ? formattedShift : '00h 00m 00s',
                      style: const TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'monospace',
                        color: Colors.white,
                        letterSpacing: 2.0,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 8,
                        backgroundColor: const Color(0xFF334155),
                        valueColor: AlwaysStoppedAnimation<Color>(
                          progress >= 1.0 ? const Color(0xFF10B981) : const Color(0xFF3B82F6),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Target: ${_standardShiftHours.toStringAsFixed(1)} hrs', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                        Text(
                          '${(progress * 100).toInt()}% Shift Completed',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: progress >= 1.0 ? const Color(0xFF10B981) : const Color(0xFF60A5FA),
                          ),
                        ),
                      ],
                    ),
                    // Break deduction hint
                    if (isCurrentlyPunchedIn && (attState.todayRecord?.totalBreakMinutes ?? 0) > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(LucideIcons.coffee, size: 12, color: Color(0xFFFDE68A)),
                            const SizedBox(width: 4),
                            Text(
                              'Break: ${(attState.todayRecord!.totalBreakMinutes).round()}m deducted from net hours',
                              style: const TextStyle(fontSize: 11, color: Color(0xFFFDE68A), fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Punch Timestamps Grid
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(LucideIcons.arrowDownLeft, size: 14, color: AppColors.success),
                              const SizedBox(width: 4),
                              Text('PUNCH IN', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            attState.todayRecord?.checkIn ?? '--:--',
                            style: AppTypography.headingLg(color: AppColors.darkText),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            hasRecordedCheckIn ? 'Recorded in DB' : 'Pending Start',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: hasRecordedCheckIn ? AppColors.success : AppColors.darkTextDim,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(LucideIcons.arrowUpRight, size: 14, color: AppColors.danger),
                              const SizedBox(width: 4),
                              Text('PUNCH OUT', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            attState.todayRecord?.checkOut ?? '--:--',
                            style: AppTypography.headingLg(color: AppColors.darkText),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            hasCheckedOut ? 'Recorded in DB' : (isCurrentlyPunchedIn ? 'Shift In Progress' : 'Pending End'),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: hasCheckedOut ? AppColors.primaryLight : AppColors.darkTextDim,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Primary Punch Action Button
              if (!hasRecordedCheckIn && !hasCheckedOut)
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: isPunching ? null : _handlePunchIn,
                    icon: isPunching
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(LucideIcons.playCircle, size: 19, color: Colors.white),
                    label: Text(
                      isPunching ? 'Clocking In to Database...' : 'Clock In Now • Remote Shift',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                )
              else if (isCurrentlyPunchedIn) ...[
                // Break Toggle Button & Clock Out Side-by-Side
                Row(
                  children: [
                    Expanded(
                      flex: 5,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: isOnBreak ? const Color(0xFFD97706) : const Color(0xFF475569),
                          side: BorderSide(
                            color: isOnBreak ? const Color(0xFFF59E0B) : const Color(0xFFCBD5E1),
                            width: isOnBreak ? 1.5 : 1.0,
                          ),
                          backgroundColor: isOnBreak ? const Color(0xFFFFFBEB) : Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                        ),
                        icon: Icon(
                          isOnBreak ? LucideIcons.play : LucideIcons.coffee,
                          size: 16,
                          color: isOnBreak ? const Color(0xFFD97706) : const Color(0xFF475569),
                        ),
                        label: Text(
                          isOnBreak ? 'Resume Shift' : 'Take Break',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: isOnBreak ? const Color(0xFFD97706) : const Color(0xFF334155),
                          ),
                        ),
                        onPressed: isPunching ? null : _handleBreakToggle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      flex: 5,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                        ),
                        icon: const Icon(LucideIcons.logOut, size: 16, color: Colors.white),
                        label: const Text(
                          'Clock Out',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.white),
                        ),
                        onPressed: isPunching ? null : _handlePunchOut,
                      ),
                    ),
                  ],
                ),
              ] else ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.shieldCheck, size: 20, color: Color(0xFF059669)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              'Shift Complete • Punches Synced in DB',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF065F46),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Logged: ${(attState.todayRecord?.netHoursWorked ?? attState.todayRecord?.hoursWorked ?? 0).toStringAsFixed(1)} net hours today',
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF047857),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(LucideIcons.clipboardCheck, size: 16),
                        label: const Text(
                          'View / Send EOD Report',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                        ),
                        onPressed: _openEodReportModal,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 2,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFDC2626),
                          side: const BorderSide(color: Color(0xFFFCA5A5)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(LucideIcons.rotateCcw, size: 14),
                        label: const Text(
                          'Reset (Test)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                        onPressed: _confirmResetToday,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 18),

        // ─── TODAY'S ASSIGNED DELIVERABLES / EOD CHECKLIST ───────────────────
        _buildEodTaskChecklistSection(),
        const SizedBox(height: 18),

        // ─── LEAVE QUOTA & TIME-OFF SUMMARY CARD (Direct to HR) ──────────────
        _buildLeaveQuotaSummaryCard(),
      ],
    );
  }

  Widget _buildEodTaskChecklistSection() {
    final totalCount = _tasks.length;
    final completedCount = _tasks.where((t) => t.isCompleted).length;
    final openCount = totalCount - completedCount;
    final totalPriorityPoints = _tasks.fold<int>(0, (sum, t) => sum + t.priorityPoints);
    final completedPriorityPoints = _tasks.where((t) => t.isCompleted).fold<int>(0, (sum, t) => sum + t.priorityPoints);
    final velocityRatio = totalCount > 0 ? (completedCount / totalCount).clamp(0.0, 1.0) : 0.0;

    List<TaskItem> displayedTasks = _tasks;
    if (_deliverableFilter == 'Active') {
      displayedTasks = _tasks.where((t) => !t.isCompleted).toList();
    } else if (_deliverableFilter == 'Completed') {
      displayedTasks = _tasks.where((t) => t.isCompleted).toList();
    }

    return CustomCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Header Row 1: Title + Action Buttons (No Squeeze, Zero Truncation!)
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(LucideIcons.listTodo, size: 16, color: Color(0xFF818CF8)),
              ),
              const SizedBox(width: 9),
              const Expanded(
                child: Text(
                  "Today's Deliverables",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.2,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              // Add Task Pill
              GestureDetector(
                onTap: _openAddTaskModal,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(7),
                    border: Border.all(color: const Color(0xFFDBEAFE)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.plus, size: 12, color: Color(0xFF2563EB)),
                      SizedBox(width: 4),
                      Text('Task', style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w700, fontSize: 11)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),
              // EOD Report Pill
              GestureDetector(
                onTap: _openEodReportModal,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(7),
                    border: Border.all(color: const Color(0xFFDBEAFE)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.clipboardCheck, size: 12, color: Color(0xFF2563EB)),
                      SizedBox(width: 4),
                      Text('EOD', style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w700, fontSize: 11)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Subtitle Stats Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$completedCount of $totalCount Done • ${(velocityRatio * 100).toInt()}% Velocity',
                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
              ),
              Text(
                '$completedPriorityPoints / $totalPriorityPoints pts',
                style: const TextStyle(fontSize: 11, color: Color(0xFF2563EB), fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Slim Integrated 4px Velocity Progress Line
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: velocityRatio,
              minHeight: 4,
              backgroundColor: const Color(0xFFE2E8F0),
              valueColor: AlwaysStoppedAnimation<Color>(
                velocityRatio >= 1.0 ? const Color(0xFF10B981) : const Color(0xFF2563EB),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Enterprise Segmented Filter Tabs
          Row(
            children: [
              _buildDeliverableFilterTab('All', 'All ($totalCount)'),
              const SizedBox(width: 8),
              _buildDeliverableFilterTab('Active', 'Active ($openCount)'),
              const SizedBox(width: 8),
              _buildDeliverableFilterTab('Completed', 'Done ($completedCount)'),
            ],
          ),
          const SizedBox(height: 12),

          // Bounded Viewport for Deliverables List (NO unlimited scroll)
          if (_tasks.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Center(
                child: Column(
                  children: [
                    Icon(LucideIcons.clipboardCheck, size: 30, color: Color(0xFF94A3B8)),
                    SizedBox(height: 8),
                    Text(
                      'No Deliverables Assigned for Today',
                      style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Your Team Leader has not queued any pending EOD tasks.',
                      style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
          else if (displayedTasks.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Center(
                child: Text(
                  'No ${_deliverableFilter.toLowerCase()} tasks in this view.',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
              ),
            )
          else
            // Bounded scroll container with maximum height
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 460),
              child: ScrollConfiguration(
                behavior: const ScrollBehavior().copyWith(scrollbars: false),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const BouncingScrollPhysics(),
                  padding: EdgeInsets.zero,
                  itemCount: displayedTasks.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (_, idx) => _buildEodTaskTile(displayedTasks[idx]),
                ),
              ),
            ),

          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(LucideIcons.sparkles, size: 12, color: Color(0xFF2563EB)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Subtasks sync automatically. Complete all subtasks to resolve parent task.',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.captionXs(color: AppColors.darkTextDim),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDeliverableFilterTab(String key, String label) {
    final isSelected = _deliverableFilter == key;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _deliverableFilter = key);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildEodTaskTile(TaskItem task) {
    Color priorityColor;
    switch (task.priority.toLowerCase()) {
      case 'urgent':
      case 'critical':
        priorityColor = const Color(0xFFEF4444);
        break;
      case 'high':
        priorityColor = const Color(0xFFF59E0B);
        break;
      case 'medium':
        priorityColor = const Color(0xFF3B82F6);
        break;
      case 'low':
      default:
        priorityColor = const Color(0xFF10B981);
        break;
    }

    String deadlineText = 'Due: Today';
    if (task.dueDate != null && task.dueDate!.isNotEmpty) {
      try {
        final parsed = DateTime.parse(task.dueDate!);
        deadlineText = 'Due: ${DateFormat('MMM d').format(parsed)}';
      } catch (_) {
        deadlineText = 'Due: ${task.dueDate}';
      }
    }

    final hasSubtasks = task.subtasks.isNotEmpty;
    final isExpanded = _expandedTaskIds.contains(task.id);
    final completedSubsCount = task.subtasks.where((s) => s.completed).length;
    final totalSubsCount = task.subtasks.length;
    final subtaskRatio = totalSubsCount > 0 ? completedSubsCount / totalSubsCount : 0.0;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: task.isCompleted
              ? const Color(0xFF10B981).withOpacity(0.35)
              : const Color(0xFFE2E8F0),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 3.5px Priority Accent Bar on Left Edge (Linear Style)
              Container(
                width: 3.5,
                color: priorityColor,
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Main Task Header
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Tactile Circular Completion Ring for Main Task
                          GestureDetector(
                            onTap: () => _toggleTaskStatus(task),
                            child: Container(
                              margin: const EdgeInsets.only(top: 2),
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: task.eodSubmitted
                                    ? const Color(0xFF059669)
                                    : (task.isCompleted ? const Color(0xFF10B981) : const Color(0xFFF8FAFC)),
                                border: Border.all(
                                  color: task.eodSubmitted
                                      ? const Color(0xFF10B981)
                                      : (task.isCompleted ? const Color(0xFF10B981) : const Color(0xFFCBD5E1)),
                                  width: 1.6,
                                ),
                              ),
                              child: task.eodSubmitted
                                  ? const Icon(LucideIcons.lock, size: 10, color: Colors.white)
                                  : (task.isCompleted
                                      ? const Icon(LucideIcons.check, size: 11, color: Colors.white)
                                      : null),
                            ),
                          ),
                          const SizedBox(width: 10),

                          // Main Task Details (Tap to view full deliverable details)
                          Expanded(
                            child: InkWell(
                              borderRadius: BorderRadius.circular(8),
                              onTap: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => TaskDetailScreen(initialTask: task),
                                  ),
                                );
                                _loadSecondaryData();
                              },
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 2),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Badges Wrap
                                    Wrap(
                                      spacing: 6,
                                      runSpacing: 4,
                                      crossAxisAlignment: WrapCrossAlignment.center,
                                      children: [
                                        if (task.taskCode != null)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFF1F5F9),
                                              borderRadius: BorderRadius.circular(4),
                                              border: Border.all(color: const Color(0xFFE2E8F0)),
                                            ),
                                            child: Text(
                                              task.taskCode!,
                                              style: const TextStyle(
                                                fontSize: 9.5,
                                                fontWeight: FontWeight.w800,
                                                fontFamily: 'monospace',
                                                color: Color(0xFF0284C7),
                                                letterSpacing: 0.3,
                                              ),
                                            ),
                                          ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: (task.isCompleted ? const Color(0xFFECFDF5) : const Color(0xFFEFF6FF)),
                                            borderRadius: BorderRadius.circular(4),
                                            border: Border.all(
                                              color: (task.isCompleted ? const Color(0xFFA7F3D0) : const Color(0xFFDBEAFE)),
                                            ),
                                          ),
                                          child: Text(
                                            task.status,
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.w700,
                                              color: task.isCompleted ? const Color(0xFF059669) : const Color(0xFF2563EB),
                                            ),
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: priorityColor.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(4),
                                            border: Border.all(color: priorityColor.withOpacity(0.25)),
                                          ),
                                          child: Text(
                                            '${task.priority} • ${task.priorityPoints} pts',
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.w700,
                                              color: priorityColor,
                                            ),
                                          ),
                                        ),
                                        Text(
                                          deadlineText,
                                          style: const TextStyle(
                                            fontSize: 9.5,
                                            color: Color(0xFF64748B),
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        if (task.projectName != null && task.projectName!.isNotEmpty)
                                          Text(
                                            '• ${task.projectName!}',
                                            style: const TextStyle(fontSize: 9.5, color: Color(0xFF64748B)),
                                          ),
                                        if (task.eodSubmitted)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFECFDF5),
                                              borderRadius: BorderRadius.circular(4),
                                              border: Border.all(color: const Color(0xFFA7F3D0)),
                                            ),
                                            child: const Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(LucideIcons.lock, size: 8, color: Color(0xFF059669)),
                                                SizedBox(width: 3),
                                                Text(
                                                  'LOCKED IN EOD',
                                                  style: TextStyle(
                                                    fontSize: 8.5,
                                                    fontWeight: FontWeight.w800,
                                                    color: Color(0xFF059669),
                                                    letterSpacing: 0.3,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),

                                    // Main Task Title
                                    Text(
                                      task.title,
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w700,
                                        color: task.isCompleted ? const Color(0xFF94A3B8) : const Color(0xFF0F172A),
                                        decoration: task.isCompleted ? TextDecoration.lineThrough : null,
                                        decorationColor: const Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Subtasks Section (Cardless Timeline Flow)
                    if (hasSubtasks) ...[
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      // Subtasks Toggle Line
                      InkWell(
                        onTap: () {
                          HapticFeedback.selectionClick();
                          setState(() {
                            if (isExpanded) {
                              _expandedTaskIds.remove(task.id);
                            } else {
                              _expandedTaskIds.add(task.id);
                            }
                          });
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                          child: Row(
                            children: [
                              Icon(
                                completedSubsCount == totalSubsCount
                                    ? LucideIcons.checkCircle2
                                    : LucideIcons.listChecks,
                                size: 13,
                                color: completedSubsCount == totalSubsCount ? const Color(0xFF10B981) : const Color(0xFF2563EB),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                '$completedSubsCount of $totalSubsCount subtasks done',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: completedSubsCount == totalSubsCount ? const Color(0xFF10B981) : const Color(0xFF2563EB),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(2),
                                  child: LinearProgressIndicator(
                                    value: subtaskRatio,
                                    minHeight: 3.5,
                                    backgroundColor: const Color(0xFFE2E8F0),
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      subtaskRatio >= 1.0 ? const Color(0xFF10B981) : const Color(0xFF2563EB),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Icon(
                                isExpanded ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                                size: 13,
                                color: const Color(0xFF64748B),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Subtasks Checklist Items (Cardless, tactile rings)
                      if (isExpanded) ...[
                        Padding(
                          padding: const EdgeInsets.fromLTRB(14, 2, 14, 10),
                          child: Column(
                            children: task.subtasks.map((subtask) {
                              final isLocked = task.eodSubmitted && subtask.completed;
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 3),
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(6),
                                  onTap: () => _toggleSubtask(task, subtask),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                                    child: Row(
                                      children: [
                                        // Tactile Completion Ring
                                        Container(
                                          width: 16,
                                          height: 16,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: isLocked
                                                ? const Color(0xFF059669)
                                                : (subtask.completed ? const Color(0xFF10B981) : const Color(0xFFF8FAFC)),
                                            border: Border.all(
                                              color: isLocked
                                                  ? const Color(0xFF10B981)
                                                  : (subtask.completed ? const Color(0xFF10B981) : const Color(0xFFCBD5E1)),
                                              width: 1.5,
                                            ),
                                          ),
                                          child: isLocked
                                              ? const Icon(LucideIcons.lock, size: 8.5, color: Colors.white)
                                              : (subtask.completed
                                                  ? const Icon(LucideIcons.check, size: 9.5, color: Colors.white)
                                                  : null),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            subtask.title,
                                            style: TextStyle(
                                              fontSize: 11.5,
                                              color: subtask.completed ? const Color(0xFF64748B) : const Color(0xFF1E293B),
                                              decoration: subtask.completed ? TextDecoration.lineThrough : null,
                                              decorationColor: const Color(0xFF64748B),
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
                      ],
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLeaveQuotaSummaryCard() {
    final cl = _leaveBalance?.casualLeave;
    final sl = _leaveBalance?.sickLeave;

    return CustomCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(LucideIcons.calendarDays, size: 16, color: AppColors.primaryLight),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        'Leave Quotas',
                        style: AppTypography.headingLg(color: AppColors.darkText),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'SYNCED',
                        style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, color: Color(0xFF10B981), letterSpacing: 0.3),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: _openApplyLeaveModal,
                borderRadius: BorderRadius.circular(8),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  child: Text('Apply →', style: TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Quota Balance Tiles: Only Casual Leave and Sick Leave (Default 2 Days, Earned Leave removed)
          Row(
            children: [
              _buildQuotaCardTile(
                'Casual Leave',
                cl?.remaining ?? 2,
                cl?.used ?? 0,
                cl?.total ?? 2,
                AppColors.primaryLight,
              ),
              const SizedBox(width: 10),
              _buildQuotaCardTile(
                'Sick Leave',
                sl?.remaining ?? 2,
                sl?.used ?? 0,
                sl?.total ?? 2,
                AppColors.warning,
              ),
            ],
          ),
          const SizedBox(height: 12),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.darkBg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.clock, size: 14, color: AppColors.darkTextDim),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Standard ${_isIntern ? "intern" : "company"} workday: ${_standardShiftHours.toStringAsFixed(1)} hours. Minimum half-day credit: ${_halfDayHours.toStringAsFixed(1)} hours.',
                    style: AppTypography.captionXs(color: AppColors.darkTextDim),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuotaCardTile(String title, int remaining, int used, int total, Color color) {
    final double pct = total > 0 ? (used / total).clamp(0.0, 1.0) : 0.0;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.darkBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.darkBorder.withOpacity(0.8)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.captionXs(color: AppColors.darkTextMuted),
            ),
            const SizedBox(height: 5),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  '$remaining',
                  style: TextStyle(
                    color: color,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(width: 3),
                const Text(
                  'Days',
                  style: TextStyle(
                    color: AppColors.darkTextDim,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(2),
              child: LinearProgressIndicator(
                value: pct,
                minHeight: 3,
                backgroundColor: AppColors.darkSurface,
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '$used used / $total',
              style: const TextStyle(
                color: AppColors.darkTextDim,
                fontSize: 9.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkModePill(String mode, IconData icon) {
    final isSelected = _selectedWorkMode == mode;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          setState(() => _selectedWorkMode = mode);
          ref.read(attendanceProvider.notifier).setWorkMode(mode);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFEFF6FF) : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
              width: isSelected ? 1.5 : 1.0,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withOpacity(0.08),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14, color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                mode,
                style: TextStyle(
                  color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF0F172A),
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── TAB 2: SHIFT HISTORY (Attendance Log & Leave Requests) ─────────────────

  Widget _buildShiftHistoryView(AttendanceState attState) {
    final history = attState.history;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Sub-navigation segment inside History: Log vs Leave Requests
        Container(
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            color: AppColors.darkSurface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.darkBorder),
          ),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    setState(() => _historySubTabIndex = 0);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: _historySubTabIndex == 0 ? AppColors.primaryLight.withOpacity(0.2) : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      border: _historySubTabIndex == 0 ? Border.all(color: AppColors.primaryLight) : null,
                    ),
                    child: Center(
                      child: Text(
                        'Shift Logs (${history.length})',
                        style: TextStyle(
                          color: _historySubTabIndex == 0 ? AppColors.primaryLight : AppColors.darkTextMuted,
                          fontWeight: _historySubTabIndex == 0 ? FontWeight.bold : FontWeight.normal,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    setState(() => _historySubTabIndex = 1);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: _historySubTabIndex == 1 ? AppColors.primaryLight.withOpacity(0.2) : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      border: _historySubTabIndex == 1 ? Border.all(color: AppColors.primaryLight) : null,
                    ),
                    child: Center(
                      child: Text(
                        'Leave Requests (${_leaveRequests.length})',
                        style: TextStyle(
                          color: _historySubTabIndex == 1 ? AppColors.primaryLight : AppColors.darkTextMuted,
                          fontWeight: _historySubTabIndex == 1 ? FontWeight.bold : FontWeight.normal,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        if (_historySubTabIndex == 0) ...[
          // Legend row
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.darkSurface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.darkBorder),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildLegendDot(AppColors.success, 'Present'),
                _buildLegendDot(AppColors.warning, 'Half-Day / Late'),
                _buildLegendDot(AppColors.danger, 'Absent'),
                _buildLegendDot(AppColors.info, 'Leave'),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Attendance Records Log
          Text('Attendance Records Log', style: AppTypography.headingLg(color: AppColors.darkText)),
          const SizedBox(height: 10),
          if (history.isEmpty)
            const CustomCard(
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('No attendance history found', style: TextStyle(color: AppColors.darkTextMuted)),
                ),
              ),
            )
          else
            ...history.map(
              (rec) => CustomCard(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: _getStatusColor(rec.status).withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              rec.status.toLowerCase() == 'present' ? LucideIcons.checkCircle2 : LucideIcons.clock,
                              size: 16,
                              color: _getStatusColor(rec.status),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _formatLogDate(rec.date),
                                  style: AppTypography.bodyMd(color: AppColors.darkText).copyWith(fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _formatLogSubtitle(rec),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTypography.captionXs(color: AppColors.darkTextMuted),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    StatusBadge(label: rec.status, variant: rec.status),
                  ],
                ),
              ),
            ),
        ] else ...[
          // Leave Requests Sub-View
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'My Time-Off Requests',
                  style: AppTypography.headingLg(color: AppColors.darkText),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              TextButton.icon(
                onPressed: _openApplyLeaveModal,
                icon: const Icon(LucideIcons.plus, size: 16, color: AppColors.primaryLight),
                label: const Text('Apply Leave', style: TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_leaveRequests.isEmpty)
            CustomCard(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    const Icon(LucideIcons.calendarOff, size: 36, color: AppColors.darkTextDim),
                    const SizedBox(height: 10),
                    Text('No leave requests submitted yet', style: AppTypography.bodyMd(color: AppColors.darkTextMuted)),
                    const SizedBox(height: 4),
                    Text(
                      'Planning time off? Tap "Apply Leave" above.',
                      style: AppTypography.captionXs(color: AppColors.darkTextDim),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
          else
            ..._leaveRequests.map(
              (req) => CustomCard(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              const Icon(LucideIcons.calendar, size: 14, color: AppColors.primaryLight),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  '${req.leaveType.toUpperCase()} LEAVE (${req.days}d)',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTypography.bodyMd(color: AppColors.darkText).copyWith(fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        StatusBadge(label: req.status, variant: req.status.toLowerCase()),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Dates: ${_formatLeaveDateRange(req.startDate, req.endDate, req.days)}',
                      style: AppTypography.captionXs(color: AppColors.primaryLight).copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '"${req.reason}"',
                      style: AppTypography.bodySm(color: AppColors.darkTextMuted).copyWith(fontStyle: FontStyle.italic),
                    ),
                    if (req.reviewNote != null && req.reviewNote!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.darkBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          children: [
                            const Icon(LucideIcons.messageSquare, size: 12, color: AppColors.darkTextDim),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'HR Review: ${req.reviewNote}',
                                style: AppTypography.captionXs(color: AppColors.darkTextDim),
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
        ],
      ],
    );
  }

  Widget _buildLegendDot(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
      ],
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return AppColors.success;
      case 'half-day':
      case 'late':
        return AppColors.warning;
      case 'leave':
        return AppColors.info;
      case 'absent':
      default:
        return AppColors.danger;
    }
  }

  String _formatLogDate(String rawDate) {
    if (rawDate.isEmpty) return 'Recent Shift';
    final dt = DateTime.tryParse(rawDate)?.toLocal();
    if (dt == null) return rawDate;

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(dt.year, dt.month, dt.day);
    final diffDays = today.difference(target).inDays;

    final formatted = DateFormat('EEE, MMM d, yyyy').format(dt);
    if (diffDays == 0) {
      return 'Today • $formatted';
    } else if (diffDays == 1) {
      return 'Yesterday • $formatted';
    } else {
      return formatted;
    }
  }

  String _formatLogSubtitle(AttendanceRecord rec) {
    final mode = rec.workMode.isNotEmpty ? rec.workMode : 'Remote';
    final inTime = rec.checkIn ?? '--';

    // Check if shift is still open / active today
    final isOutPresent = rec.checkOut != null && rec.checkOut!.isNotEmpty;
    final outTime = isOutPresent ? rec.checkOut! : 'Active (In Progress)';

    final hours = rec.netHoursWorked ?? rec.hoursWorked;
    final durationStr = (hours > 0) ? '  •  ${hours.toStringAsFixed(1)} hrs' : '';

    return 'In: $inTime  •  Out: $outTime$durationStr  •  $mode';
  }

  String _formatLeaveDateRange(String? start, String? end, int days) {
    if (start == null || start.isEmpty) return 'Date not specified';
    final sDt = DateTime.tryParse(start)?.toLocal();
    final eDt = (end != null && end.isNotEmpty) ? DateTime.tryParse(end)?.toLocal() : null;

    if (sDt == null) return '$start → ${end ?? ""}';

    final sFormatted = DateFormat('MMM d, yyyy').format(sDt);
    if (eDt == null || sDt.isAtSameMomentAs(eDt) || days == 1) {
      return '$sFormatted (1 Day)';
    }

    final eFormatted = DateFormat('MMM d, yyyy').format(eDt);
    return '$sFormatted → $eFormatted ($days ${days == 1 ? "Day" : "Days"})';
  }
}
