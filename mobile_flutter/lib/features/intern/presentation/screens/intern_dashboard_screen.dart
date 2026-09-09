import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/screen_container.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../core/widgets/shimmer_skeleton.dart';
import '../../../../models/task_item.dart';
import '../../../../models/project_item.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../notifications/presentation/controllers/notifications_controller.dart';
import '../../../employee/data/employee_api.dart';
import '../../../employee/presentation/controllers/attendance_controller.dart';
import '../../../pmo/data/pmo_api.dart';
import 'intern_team_screen.dart';

/// Enterprise Intern Dashboard — Modeled after Linear, Workday, and Rippling.
/// Delivers rich project visibility, remote attendance telemetry,
/// weekly sprint burndown, and interactive learning milestones.
class InternDashboardScreen extends ConsumerStatefulWidget {
  const InternDashboardScreen({super.key});

  @override
  ConsumerState<InternDashboardScreen> createState() => _InternDashboardScreenState();
}

class _InternDashboardScreenState extends ConsumerState<InternDashboardScreen> with WidgetsBindingObserver {
  final EmployeeApi _employeeApi = EmployeeApi();
  final PmoApi _pmoApi = PmoApi();

  List<TaskItem> _tasks = [];
  List<ProjectItem> _projects = [];
  bool _isLoading = true;
  String _taskFilter = 'All';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadDashboardData();
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
    }
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);
    try {
      List<TaskItem> tasks = [];
      List<ProjectItem> projs = [];

      try {
        tasks = await _employeeApi.getMyTasks();
      } catch (e) {
        debugPrint('Dashboard tasks load error: $e');
      }

      try {
        projs = await _pmoApi.getProjects();
      } catch (e) {
        debugPrint('Dashboard projects load error: $e');
      }

      try {
        await ref.read(attendanceProvider.notifier).loadAttendance();
      } catch (e) {
        debugPrint('Dashboard attendance load error: $e');
      }

      if (mounted) {
        setState(() {
          _tasks = tasks;
          _projects = projs;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleQuickClockIn() async {
    HapticFeedback.mediumImpact();
    final ok = await ref.read(attendanceProvider.notifier).clockIn(workMode: 'Remote');
    if (mounted) {
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF065F46),
            content: const Row(
              children: [
                Icon(LucideIcons.checkCircle2, color: Colors.white, size: 18),
                SizedBox(width: 8),
                Text('Clocked in remotely. Shift active!'),
              ],
            ),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      } else {
        final err = ref.read(attendanceProvider).errorMessage ?? 'Failed to record punch.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF991B1B),
            content: Text(err),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  Future<void> _handleQuickClockOut() async {
    HapticFeedback.heavyImpact();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Confirm Clock Out', style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text('Are you sure you want to end your remote shift? This will record your stop time and finalize your hours in the HR register.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Clock Out Shift', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final ok = await ref.read(attendanceProvider.notifier).clockOut();
      if (!mounted) return;
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF065F46),
            content: const Row(
              children: [
                Icon(LucideIcons.checkCheck, color: Color(0xFF10B981), size: 18),
                SizedBox(width: 8),
                Text('Clock out recorded. Entry and stop times saved in DB!'),
              ],
            ),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      } else {
        final err = ref.read(attendanceProvider).errorMessage ?? 'Failed to record clock-out.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF991B1B),
            content: Text(err),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final notifState = ref.watch(notificationsProvider);
    final attState = ref.watch(attendanceProvider);

    final openTasks = _tasks.where((t) => !t.isCompleted).toList();
    final inProgressTasks = _tasks.where((t) {
      final s = t.status.toLowerCase().replaceAll('-', ' ').replaceAll('_', ' ').trim();
      return s == 'in progress' || s == 'ongoing';
    }).toList();
    final inReviewTasks = _tasks.where((t) => t.status.toLowerCase() == 'in review').toList();
    final testingTasks = _tasks.where((t) => t.status.toLowerCase() == 'testing').toList();

    // Filtered deliverables list
    List<TaskItem> filteredTasks = _tasks;
    if (_taskFilter == 'In Progress') {
      filteredTasks = inProgressTasks;
    } else if (_taskFilter == 'In Review') {
      filteredTasks = inReviewTasks;
    } else if (_taskFilter == 'Testing') {
      filteredTasks = testingTasks;
    } else if (_taskFilter == 'Done') {
      filteredTasks = _tasks.where((t) => t.isCompleted).toList();
    }

    final primaryProject = _projects.isNotEmpty ? _projects.first : null;
    final currentUserId = authState.user?.id ?? '';
    final leadingProjects = _projects.where((p) => p.isUserLead(currentUserId)).toList();
    final contributingProjects = _projects.where((p) => p.isUserMember(currentUserId)).toList();

    final totalSprintTasks = _tasks.length;
    final activeCount = inProgressTasks.isNotEmpty ? inProgressTasks.length : openTasks.length;

    return ScreenContainer(
      onRefresh: _loadDashboardData,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── 1. EXECUTIVE COHORT HEADER ────────────────────────────────────
          _buildExecutiveCohortHeader(
            name: authState.user?.name ?? 'Sanjitsriram',
            unreadCount: notifState.unreadCount,
          ),

          const SizedBox(height: 16),

          if (_isLoading)
            const SkeletonDashboardScreen()
          else ...[
            // ─── 2. SMART REMOTE ATTENDANCE & QUICK ACTIONS ─────────────────
            _buildRemoteAttendanceQuickCard(attState),

            const SizedBox(height: 14),

            // ─── 3. HIGH-DENSITY METRIC HUD CARDS ─────────────────────────────
            _buildMetricHudGrid(
              totalTasks: totalSprintTasks,
              activeTasks: activeCount,
              completedTasks: _tasks.where((t) => t.isCompleted).length,
              attState: attState,
            ),

            const SizedBox(height: 18),

            // ─── 4. ASSIGNED FLAGSHIP PROJECT BANNER ──────────────────────────
            _buildMyProjectsSection(
              currentUserId: currentUserId,
              leadingProjects: leadingProjects,
              contributingProjects: contributingProjects,
              fallbackProject: primaryProject,
            ),

            const SizedBox(height: 18),


            // ─── 6. SPRINT DELIVERABLES (BOUNDED LINEAR VIEW) ─────────────────
            _buildSprintDeliverablesHeader(openTasks.length),

            const SizedBox(height: 10),

            _buildDeliverablesFilterChips(),

            const SizedBox(height: 12),

            if (filteredTasks.isEmpty)
              _buildEmptyTasksCard()
            else ...[
              ...filteredTasks.take(3).map((task) => _buildTaskItemCard(task)),
              if (filteredTasks.length > 3)
                _buildViewAllTasksFooter(filteredTasks.length, 3),
            ],
          ],

          const SizedBox(height: 96),
        ],
      ),
    );
  }

  // ─── COMPONENT BUILDERS ────────────────────────────────────────────────────

  Widget _buildExecutiveCohortHeader({
    required String name,
    required int unreadCount,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // Premium Avatar with Ambient Shadow
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF2563EB).withOpacity(0.3),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Center(
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'I',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),

        // User and Cohort Identity
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'WELCOME BACK,',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF64748B),
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 2),
              Row(
                children: [
                  Flexible(
                    child: Text(
                      name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.3,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'INTERN',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF2563EB),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        // Notifications Bell
        GestureDetector(
          onTap: () {
            HapticFeedback.selectionClick();
            context.push('/notifications');
          },
          child: Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0F172A).withOpacity(0.04),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                const Icon(LucideIcons.bell, size: 18, color: Color(0xFF334155)),
                if (unreadCount > 0)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        color: Color(0xFFEF4444),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),

        // Settings / Profile Shortcut
        GestureDetector(
          onTap: () {
            HapticFeedback.selectionClick();
            context.push('/profile');
          },
          child: Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0F172A).withOpacity(0.04),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const Icon(LucideIcons.user, size: 18, color: Color(0xFF334155)),
          ),
        ),
      ],
    );
  }

  Widget _buildRemoteAttendanceQuickCard(AttendanceState attState) {
    final isPunchedIn = attState.isPunchedIn;
    final isOnBreak = attState.isOnBreak;
    final isCompleted = attState.isShiftCompleted;
    final isPunching = attState.isPunching;

    String formattedTime = '--:--';
    if (attState.todayRecord?.checkIn != null) {
      formattedTime = attState.todayRecord!.checkIn!;
    }

    final h = attState.elapsedShift.inHours;
    final m = attState.elapsedShift.inMinutes.remainder(60);
    final s = attState.elapsedShift.inSeconds.remainder(60);
    final elapsedClock = '${h.toString().padLeft(2, '0')}h ${m.toString().padLeft(2, '0')}m ${s.toString().padLeft(2, '0')}s';

    final breakM = attState.elapsedBreak.inMinutes;
    final breakS = attState.elapsedBreak.inSeconds.remainder(60);

    // Dynamic state badge & theme colors
    Color statusBgColor;
    Color statusBorderColor;
    Color statusIconColor;
    Color beaconColor;
    String statusTitle;
    String statusSubtitle;
    IconData statusIcon;

    if (isOnBreak) {
      statusBgColor = const Color(0xFFFFFBEB);
      statusBorderColor = const Color(0xFFFDE68A);
      statusIconColor = const Color(0xFFD97706);
      beaconColor = const Color(0xFFF59E0B);
      statusTitle = 'ON BREAK • SHIFT PAUSED';
      statusSubtitle = 'Break in progress: ${breakM}m ${breakS.toString().padLeft(2, '0')}s';
      statusIcon = LucideIcons.coffee;
    } else if (isPunchedIn) {
      statusBgColor = const Color(0xFFECFDF5);
      statusBorderColor = const Color(0xFFA7F3D0);
      statusIconColor = const Color(0xFF059669);
      beaconColor = const Color(0xFF10B981);
      statusTitle = 'ACTIVE SHIFT • IN AT $formattedTime';
      statusSubtitle = '$elapsedClock active workday';
      statusIcon = LucideIcons.checkCircle2;
    } else if (isCompleted) {
      statusBgColor = const Color(0xFFEEF2FF);
      statusBorderColor = const Color(0xFFC7D2FE);
      statusIconColor = const Color(0xFF4F46E5);
      beaconColor = const Color(0xFF6366F1);
      statusTitle = 'SHIFT COMPLETED • SYNCHRONIZED';
      final totalH = attState.todayRecord?.netHoursWorked ?? attState.todayRecord?.hoursWorked ?? 0;
      statusSubtitle = '${totalH.toStringAsFixed(1)}h logged today in HR portal';
      statusIcon = LucideIcons.award;
    } else {
      statusBgColor = const Color(0xFFEFF6FF);
      statusBorderColor = const Color(0xFFBFDBFE);
      statusIconColor = const Color(0xFF2563EB);
      beaconColor = const Color(0xFF94A3B8);
      statusTitle = 'REMOTE WORK • READY TO CLOCK IN';
      statusSubtitle = 'Remote Attendance Ready';
      statusIcon = LucideIcons.laptop;
    }

    return CustomCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: Icon, Status, Info & Chevron to full details
          InkWell(
            onTap: () {
              HapticFeedback.lightImpact();
              context.push('/attendance');
            },
            borderRadius: BorderRadius.circular(10),
            child: Row(
              children: [
                // Animated work mode icon container
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: statusBgColor,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: statusBorderColor),
                  ),
                  child: Icon(
                    statusIcon,
                    color: statusIconColor,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),

                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              color: beaconColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              statusTitle,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: statusIconColor,
                                letterSpacing: 0.3,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        statusSubtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(LucideIcons.checkCheck, size: 12, color: statusIconColor),
                          const SizedBox(width: 4),
                          const Expanded(
                            child: Text(
                              'Synced with HR Portal • Standard 3h Shift',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const Icon(LucideIcons.chevronRight, size: 18, color: Color(0xFF94A3B8)),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // Action Buttons according to shift status
          if (!isPunchedIn && !isCompleted) ...[
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton.icon(
                onPressed: isPunching ? null : _handleQuickClockIn,
                icon: isPunching
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(LucideIcons.playCircle, size: 17, color: Colors.white),
                label: Text(
                  isPunching ? 'Starting Remote Shift...' : 'Quick Clock In • Remote Shift',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ] else if (isOnBreak) ...[
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: ElevatedButton.icon(
                    onPressed: isPunching ? null : () => ref.read(attendanceProvider.notifier).toggleBreak(),
                    icon: const Icon(LucideIcons.play, size: 15, color: Colors.white),
                    label: const Text('Resume Shift', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: OutlinedButton.icon(
                    onPressed: isPunching ? null : _handleQuickClockOut,
                    icon: const Icon(LucideIcons.logOut, size: 15, color: Color(0xFFEF4444)),
                    label: const Text('Clock Out', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFEF4444))),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFFECACA)),
                      backgroundColor: const Color(0xFFFEF2F2),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
          ] else if (isPunchedIn) ...[
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: isPunching ? null : () => ref.read(attendanceProvider.notifier).toggleBreak(),
                    icon: const Icon(LucideIcons.coffee, size: 14, color: Color(0xFFD97706)),
                    label: const Text('Break', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFD97706))),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFFDE68A)),
                      backgroundColor: const Color(0xFFFFFBEB),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      HapticFeedback.selectionClick();
                      context.push('/attendance');
                    },
                    icon: const Icon(LucideIcons.calendarDays, size: 14, color: Color(0xFF2563EB)),
                    label: const Text('Register', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFBFDBFE)),
                      backgroundColor: const Color(0xFFEFF6FF),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: isPunching ? null : _handleQuickClockOut,
                    icon: isPunching
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(LucideIcons.logOut, size: 14, color: Colors.white),
                    label: const Text('Clock Out', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFEF4444),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
          ] else ...[
            SizedBox(
              width: double.infinity,
              height: 42,
              child: OutlinedButton.icon(
                onPressed: () => context.push('/attendance'),
                icon: const Icon(LucideIcons.calendarDays, size: 15, color: Color(0xFF2563EB)),
                label: const Text('View Workday Attendance Register', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFBFDBFE)),
                  backgroundColor: const Color(0xFFEFF6FF),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMetricHudGrid({
    required int totalTasks,
    required int activeTasks,
    required int completedTasks,
    required AttendanceState attState,
  }) {
    final taskProgressPct = totalTasks > 0 ? (completedTasks / totalTasks).clamp(0.0, 1.0) : 0.0;

    // Real dynamic weekly hours calculation
    final weeklyHours = attState.weeklyHoursLogged;
    final pastHours = attState.pastWeeklyHours;
    final isPunchedIn = attState.isPunchedIn;
    final liveMinutes = attState.elapsedShift.inMinutes;
    const goalHours = 15.0; // 3h/day * 5 days = 15h standard weekly goal for interns
    final hoursProgressPct = (weeklyHours / goalHours).clamp(0.0, 1.0);

    return Row(
      children: [
        // ─── HUD 1: SPRINT TASKS ──────────────────────────────────────────
        Expanded(
          child: InkWell(
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() => _taskFilter = 'In Progress');
            },
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F172A).withOpacity(0.03),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(LucideIcons.checkSquare, size: 15, color: Color(0xFF2563EB)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Text(
                          '$activeTasks Active',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        '$totalTasks',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(width: 4),
                      const Text(
                        'Sprint Tasks',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // Progress Track
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: taskProgressPct,
                      minHeight: 4,
                      backgroundColor: const Color(0xFFF1F5F9),
                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2563EB)),
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    totalTasks > 0
                        ? '$completedTasks of $totalTasks Done (${(taskProgressPct * 100).round()}%)'
                        : 'No active sprint tasks',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
          ),
        ),

        const SizedBox(width: 10),

        // ─── HUD 2: LOGGED WORK HOURS ────────────────────────────────────
        Expanded(
          child: InkWell(
            onTap: () {
              HapticFeedback.selectionClick();
              context.push('/attendance');
            },
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F172A).withOpacity(0.03),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: isPunchedIn ? const Color(0xFFECFDF5) : const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          isPunchedIn ? LucideIcons.playCircle : LucideIcons.timer,
                          size: 15,
                          color: isPunchedIn ? const Color(0xFF059669) : const Color(0xFFD97706),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: isPunchedIn ? const Color(0xFFECFDF5) : const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: isPunchedIn ? const Color(0xFFA7F3D0) : const Color(0xFFFDE68A),
                          ),
                        ),
                        child: Text(
                          isPunchedIn ? '● Live Shift' : 'Goal: 15h',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: isPunchedIn ? const Color(0xFF065F46) : const Color(0xFF92400E),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        weeklyHours.toStringAsFixed(1),
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(width: 3),
                      const Text(
                        'hrs',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(width: 4),
                      const Expanded(
                        child: Text(
                          'This Week',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // Progress Track
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: hoursProgressPct,
                      minHeight: 4,
                      backgroundColor: const Color(0xFFF1F5F9),
                      valueColor: AlwaysStoppedAnimation<Color>(
                        isPunchedIn ? const Color(0xFF059669) : const Color(0xFFD97706),
                      ),
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    isPunchedIn
                        ? (pastHours > 0
                            ? '${pastHours.toStringAsFixed(1)}h past + ${liveMinutes}m live'
                            : '$liveMinutes min active today')
                        : (weeklyHours > 0
                            ? '${weeklyHours.toStringAsFixed(1)}h logged • HR verified'
                            : '0.0h logged • Shift ready'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      color: isPunchedIn ? const Color(0xFF059669) : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMyProjectsSection({
    required String currentUserId,
    required List<ProjectItem> leadingProjects,
    required List<ProjectItem> contributingProjects,
    required ProjectItem? fallbackProject,
  }) {
    if (leadingProjects.isEmpty && contributingProjects.isEmpty) {
      return _buildFlagshipProjectCard(fallbackProject, isLead: false);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (leadingProjects.isNotEmpty) ...[
          // Lead Section Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Icon(LucideIcons.crown, size: 15, color: Color(0xFFD97706)),
                  SizedBox(width: 6),
                  Text(
                    'PROJECTS I LEAD',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF92400E),
                      letterSpacing: 0.6,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFEF3C7), Color(0xFFFDE68A)],
                  ),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFF59E0B)),
                ),
                child: Text(
                  '${leadingProjects.length} Active Lead',
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF78350F),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Team Pulse Strip
          _buildLeadTeamPulseStrip(leadingProjects.first),
          const SizedBox(height: 10),

          ...leadingProjects.map((p) => _buildFlagshipProjectCard(p, isLead: true)),
          const SizedBox(height: 16),
        ],

        if (contributingProjects.isNotEmpty) ...[
          Row(
            children: const [
              Icon(LucideIcons.checkCheck, size: 15, color: Color(0xFF16A34A)),
              SizedBox(width: 6),
              Text(
                'CONTRIBUTING INITIATIVES',
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF15803D),
                  letterSpacing: 0.6,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...contributingProjects.map((p) => _buildFlagshipProjectCard(p, isLead: false)),
        ],
      ],
    );
  }

  Widget _buildLeadTeamPulseStrip(ProjectItem project) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: Color(0xFF10B981),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '${project.team.length} Team Members Allocated • Velocity: ${project.completionPercent}%',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Color(0xFF92400E),
              ),
              overflow: TextOverflow.ellipsis,
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
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Roster',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFB45309),
                  ),
                ),
                SizedBox(width: 3),
                Icon(LucideIcons.chevronRight, size: 12, color: Color(0xFFB45309)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFlagshipProjectCard(ProjectItem? project, {bool isLead = false}) {
    final title = project?.name ?? 'Enterprise Mobile Cloud Hub';
    final description = project?.description ??
        'Next-generation cross-platform operations suite with biometric hardware integration & real-time socket events.';
    final progress = (project?.completionPercent ?? 72).clamp(0, 100);
    final status = project?.status ?? 'Active';

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isLead ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0),
          width: isLead ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: isLead
                ? const Color(0xFFF59E0B).withOpacity(0.08)
                : const Color(0xFF2563EB).withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            HapticFeedback.lightImpact();
            if (project != null) {
              context.push('/project-detail', extra: project);
            }
          },
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(7),
                          decoration: BoxDecoration(
                            color: isLead
                                ? const Color(0xFFFEF3C7)
                                : const Color(0xFF2563EB).withOpacity(0.12),
                            borderRadius: BorderRadius.circular(9),
                          ),
                          child: Icon(
                            isLead ? LucideIcons.crown : LucideIcons.layers,
                            size: 16,
                            color: isLead ? const Color(0xFFD97706) : const Color(0xFF2563EB),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          isLead ? 'PROJECT LEAD INITIATIVE' : 'ASSIGNED PROJECT',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: isLead ? const Color(0xFF92400E) : const Color(0xFF2563EB),
                            letterSpacing: 0.6,
                          ),
                        ),
                      ],
                    ),
                    StatusBadge(label: status, variant: status),
                  ],
                ),
                const SizedBox(height: 12),

                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(fontSize: 12.5, color: Color(0xFF475569), height: 1.4),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),

                const SizedBox(height: 14),

                // Progress Indicator
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Sprint Milestone Progress',
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                    ),
                    Text(
                      '$progress%',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: isLead ? const Color(0xFFD97706) : const Color(0xFF2563EB),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: progress / 100,
                    backgroundColor: const Color(0xFFF1F5F9),
                    color: isLead ? const Color(0xFFF59E0B) : const Color(0xFF2563EB),
                    minHeight: 7,
                  ),
                ),

                const SizedBox(height: 14),

                // Tech Stack & Action Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Wrap(
                      spacing: 6,
                      children: [
                        _buildPill('Flutter', const Color(0xFF0284C7)),
                        _buildPill('Riverpod', const Color(0xFF7C3AED)),
                        _buildPill('Node.js', const Color(0xFF16A34A)),
                      ],
                    ),
                    if (isLead && project != null)
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
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD97706),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(LucideIcons.users, size: 12, color: Colors.white),
                              SizedBox(width: 4),
                              Text(
                                'Manage Team',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      const Row(
                        children: [
                          Text(
                            'View Dossier',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                          ),
                          SizedBox(width: 4),
                          Icon(LucideIcons.arrowRight, size: 14, color: Color(0xFF2563EB)),
                        ],
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPill(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }

  Widget _buildViewAllTasksFooter(int totalCount, int displayedCount) {
    return Container(
      margin: const EdgeInsets.only(top: 4, bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(LucideIcons.layers, size: 15, color: Color(0xFF64748B)),
              const SizedBox(width: 8),
              Text(
                'Showing $displayedCount of $totalCount sprint tasks',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
              ),
            ],
          ),
          InkWell(
            onTap: () async {
              HapticFeedback.lightImpact();
              await context.push('/tasks');
              _loadDashboardData();
            },
            borderRadius: BorderRadius.circular(6),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              child: Row(
                children: [
                  Text(
                    'Kanban View',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                  ),
                  SizedBox(width: 4),
                  Icon(LucideIcons.arrowRight, size: 14, color: Color(0xFF2563EB)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }


  Widget _buildSprintDeliverablesHeader(int openCount) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            const Text(
              'Sprint Deliverables',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
                letterSpacing: -0.2,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Text(
                '$openCount Open',
                style: const TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1D4ED8),
                ),
              ),
            ),
          ],
        ),
        TextButton(
          onPressed: () async {
            await context.push('/tasks');
            _loadDashboardData();
          },
          child: const Row(
            children: [
              Text(
                'Kanban View',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
              ),
              SizedBox(width: 4),
              Icon(LucideIcons.chevronRight, size: 14, color: Color(0xFF2563EB)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDeliverablesFilterChips() {
    final filters = ['All', 'In Progress', 'In Review', 'Testing', 'Done'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: filters.map((f) {
          final isSelected = _taskFilter == f;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _taskFilter = f);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF2563EB) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1),
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: const Color(0xFF2563EB).withOpacity(0.25),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  f,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : const Color(0xFF475569),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildEmptyTasksCard() {
    return CustomCard(
      padding: const EdgeInsets.all(28),
      child: Center(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(LucideIcons.checkCheck, size: 28, color: Color(0xFF10B981)),
            ),
            const SizedBox(height: 12),
            const Text(
              'All Sprints Up to Date!',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 4),
            const Text(
              'You have completed all assigned sprint items. Great job! Review learning modules or sync with your team.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
            ),
            const SizedBox(height: 14),
            OutlinedButton.icon(
              onPressed: () => context.push('/learning-resources'),
              icon: const Icon(LucideIcons.bookOpen, size: 14),
              label: const Text('Explore Modules'),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFCBD5E1)),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskItemCard(TaskItem task) {
    return CustomCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      onTap: () async {
        await context.push('/task-detail', extra: task);
        _loadDashboardData();
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  StatusBadge(label: task.priority, variant: task.priority),
                  if (task.projectName != null && task.projectName!.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        task.projectName!,
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                      ),
                    ),
                  ],
                ],
              ),
              StatusBadge(label: task.status, variant: task.status),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            task.title,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
          ),
          if (task.description != null && task.description!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              task.description!,
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          if (task.subtasks.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(LucideIcons.checkSquare, size: 12, color: Color(0xFF6366F1)),
                const SizedBox(width: 4),
                Text(
                  '${task.subtasks.where((s) => s.completed).length} of ${task.subtasks.length} subtasks done',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6366F1)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(3),
                    child: LinearProgressIndicator(
                      value: task.subtasks.isEmpty
                          ? 0.0
                          : task.subtasks.where((s) => s.completed).length / task.subtasks.length,
                      minHeight: 4,
                      backgroundColor: const Color(0xFFE2E8F0),
                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
