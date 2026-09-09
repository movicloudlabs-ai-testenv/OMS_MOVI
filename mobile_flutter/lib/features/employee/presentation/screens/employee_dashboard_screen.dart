import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../theme/app_colors.dart';
import '../../../../theme/app_typography.dart';
import '../../../../core/widgets/screen_container.dart';
import '../../../../core/widgets/enterprise_header.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../models/task_item.dart';
import '../../../../models/attendance_record.dart';
import '../../../../models/leave_item.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../notifications/presentation/controllers/notifications_controller.dart';
import '../../data/employee_api.dart';

class EmployeeDashboardScreen extends ConsumerStatefulWidget {
  const EmployeeDashboardScreen({super.key});

  @override
  ConsumerState<EmployeeDashboardScreen> createState() => _EmployeeDashboardScreenState();
}

class _EmployeeDashboardScreenState extends ConsumerState<EmployeeDashboardScreen> {
  final EmployeeApi _api = EmployeeApi();
  List<TaskItem> _tasks = [];
  AttendanceRecord? _attendance;
  LeaveBalance? _leaveBalance;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    try {
      final tasks = await _api.getMyTasks();
      final att = await _api.getTodayAttendance();
      final bal = await _api.getLeaveBalance();
      if (mounted) {
        setState(() {
          _tasks = tasks;
          _attendance = att;
          _leaveBalance = bal;
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final notifState = ref.watch(notificationsProvider);

    final openTasks = _tasks.where((t) => t.status.toLowerCase() != 'done').toList();
    final inProgressTasks = _tasks.where((t) => t.status.toLowerCase() == 'in progress').toList();
    final totalLeavesRemaining = (_leaveBalance?.casualLeave.remaining ?? 0) +
        (_leaveBalance?.sickLeave.remaining ?? 0) +
        (_leaveBalance?.earnedLeave.remaining ?? 0);

    return ScreenContainer(
      onRefresh: _loadDashboard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          EnterpriseHeader(
            userName: authState.user?.name ?? 'Employee User',
            roleSlug: authState.roleSlug,
            unreadNotifications: notifState.unreadCount,
            onNotificationPressed: () => context.push('/notifications'),
            onProfilePressed: () => context.push('/profile'),
          ),

          // ─── 1. EXECUTIVE METRICS HUD RIBBON ─────────────────────────────
          _buildExecutiveMetricsHUD(openTasks.length, inProgressTasks.length, totalLeavesRemaining),

          const SizedBox(height: 14),

          // ─── 2. MY WEEK ATTENDANCE CALENDAR STRIP ─────────────────────────
          _buildWeekCalendarStrip(),

          const SizedBox(height: 14),

          // ─── 3. ATTENDANCE QUICK PUNCH WIDGET ─────────────────────────────
          CustomCard(
            padding: const EdgeInsets.all(16),
            onTap: () => context.push('/attendance'),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: _attendance?.checkIn != null
                        ? AppColors.success.withOpacity(0.12)
                        : AppColors.primary.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    _attendance?.checkIn != null ? LucideIcons.checkCircle2 : LucideIcons.clock,
                    color: _attendance?.checkIn != null ? AppColors.success : AppColors.primaryLight,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Today\'s Attendance', style: AppTypography.headingLg(color: AppColors.darkText)),
                      const SizedBox(height: 2),
                      Text(
                        _attendance?.checkIn != null
                            ? 'Punched in at ${DateFormat("hh:mm a").format(DateTime.tryParse(_attendance!.checkIn!) ?? DateTime.now())}'
                            : 'Remote Work Shift • Tap for Attendance & Quick Actions',
                        style: AppTypography.bodySm(color: AppColors.darkTextMuted),
                      ),
                    ],
                  ),
                ),
                const Icon(LucideIcons.chevronRight, size: 18, color: AppColors.darkTextDim),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // ─── 4. WELLNESS & PACE SCORE CARD ────────────────────────────────
          _buildWellnessScoreCard(),

          const SizedBox(height: 16),

          // ─── 5. QUICK ACTION SHORTCUTS ────────────────────────────────────
          Text('Quick Actions', style: AppTypography.headingLg(color: AppColors.darkText)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _buildActionTile(
                  icon: LucideIcons.clock,
                  label: 'Punch In/Out',
                  color: AppColors.primaryLight,
                  onTap: () => context.push('/attendance'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildActionTile(
                  icon: LucideIcons.calendar,
                  label: 'Request Leave',
                  color: AppColors.warning,
                  onTap: () => context.push('/leaves'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildActionTile(
                  icon: LucideIcons.fileText,
                  label: 'Submit EOD',
                  color: AppColors.success,
                  onTap: () => context.push('/eod'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildActionTile(
                  icon: LucideIcons.messagesSquare,
                  label: 'Team Chat',
                  color: const Color(0xFF8B5CF6),
                  onTap: () => context.push('/chat'),
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),

          // Priority Deliverables List
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Priority Tasks', style: AppTypography.headingLg(color: AppColors.darkText)),
              TextButton(
                onPressed: () => context.push('/tasks'),
                child: Text('View All (${openTasks.length})', style: const TextStyle(color: AppColors.primaryLight)),
              ),
            ],
          ),
          const SizedBox(height: 6),

          if (openTasks.isEmpty)
            const CustomCard(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Center(
                  child: Text('All tasks completed! Great work.', style: TextStyle(color: AppColors.darkTextMuted)),
                ),
              ),
            )
          else
            ...openTasks.take(4).map(
              (task) => CustomCard(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                onTap: () async {
                  await context.push('/task-detail', extra: task);
                  _loadDashboard();
                },
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              StatusBadge(label: task.priority, variant: task.priority),
                              const SizedBox(width: 8),
                              if (task.projectName != null)
                                Text(
                                  task.projectName!,
                                  style: AppTypography.captionXs(color: AppColors.primaryLight),
                                ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            task.title,
                            style: AppTypography.bodyMd(color: AppColors.darkText).copyWith(fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    StatusBadge(label: task.status, variant: task.status),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return CustomCard(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: AppTypography.captionXs(color: AppColors.darkText).copyWith(
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildExecutiveMetricsHUD(int openTasks, int inProgress, int leavesRemaining) {
    return Row(
      children: [
        Expanded(
          child: _buildHudCard(
            title: 'Active Tasks',
            value: '$openTasks',
            badge: '$inProgress in prog',
            badgeColor: AppColors.info,
            icon: LucideIcons.checkSquare,
            iconColor: AppColors.primaryLight,
            onTap: () async {
              await context.push('/my-tasks');
              _loadDashboard();
            },
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildHudCard(
            title: 'Leaves Left',
            value: '$leavesRemaining d',
            badge: 'Prorated',
            badgeColor: AppColors.success,
            icon: LucideIcons.calendarDays,
            iconColor: AppColors.success,
            onTap: () => context.push('/leaves'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildHudCard(
            title: 'Compliance',
            value: '98%',
            badge: 'Optimal',
            badgeColor: AppColors.primaryLight,
            icon: LucideIcons.shieldCheck,
            iconColor: const Color(0xFF6366F1),
            onTap: () => context.push('/attendance'),
          ),
        ),
      ],
    );
  }

  Widget _buildHudCard({
    required String title,
    required String value,
    required String badge,
    required Color badgeColor,
    required IconData icon,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return CustomCard(
      padding: const EdgeInsets.all(12),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(icon, size: 14, color: iconColor),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                decoration: BoxDecoration(
                  color: badgeColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  badge,
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: badgeColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: AppTypography.headingXl(color: AppColors.darkText).copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: AppTypography.captionXs(color: AppColors.darkTextMuted),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildWeekCalendarStrip() {
    final now = DateTime.now();
    final daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final monday = now.subtract(Duration(days: now.weekday - 1));

    return CustomCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(LucideIcons.calendarCheck, size: 16, color: AppColors.primaryLight),
                  const SizedBox(width: 6),
                  Text('Weekly Attendance Pulse', style: AppTypography.bodyMd(color: AppColors.darkText).copyWith(fontWeight: FontWeight.w600)),
                ],
              ),
              Text(
                'Week ${((now.day - 1) / 7).floor() + 1}',
                style: AppTypography.captionXs(color: AppColors.darkTextMuted),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(7, (index) {
              final dayDate = monday.add(Duration(days: index));
              final isToday = dayDate.year == now.year && dayDate.month == now.month && dayDate.day == now.day;
              final isPast = dayDate.isBefore(DateTime(now.year, now.month, now.day));
              final isWeekend = index >= 5;

              Color bg;
              Color border;
              Color textColor;
              Widget statusDot;

              if (isToday) {
                bg = AppColors.primary.withOpacity(0.15);
                border = AppColors.primaryLight;
                textColor = AppColors.primaryLight;
                statusDot = Container(
                  width: 5,
                  height: 5,
                  decoration: const BoxDecoration(color: AppColors.primaryLight, shape: BoxShape.circle),
                );
              } else if (isPast && !isWeekend) {
                bg = AppColors.darkSurfaceSubtle;
                border = AppColors.darkBorder;
                textColor = AppColors.darkText;
                statusDot = Container(
                  width: 5,
                  height: 5,
                  decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
                );
              } else if (isWeekend) {
                bg = AppColors.darkSurface;
                border = Colors.transparent;
                textColor = AppColors.darkTextDim;
                statusDot = Container(
                  width: 5,
                  height: 5,
                  decoration: const BoxDecoration(color: AppColors.darkTextDim, shape: BoxShape.circle),
                );
              } else {
                bg = AppColors.darkSurface;
                border = AppColors.darkBorder;
                textColor = AppColors.darkTextDim;
                statusDot = Container(
                  width: 5,
                  height: 5,
                  decoration: const BoxDecoration(color: AppColors.darkBorder, shape: BoxShape.circle),
                );
              }

              return Container(
                width: 38,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: bg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: border, width: isToday ? 1.5 : 1),
                ),
                child: Column(
                  children: [
                    Text(
                      daysOfWeek[index],
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isToday ? AppColors.primaryLight : AppColors.darkTextMuted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${dayDate.day}',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 4),
                    statusDot,
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildWellnessScoreCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF6366F1).withOpacity(0.12),
            const Color(0xFF8B5CF6).withOpacity(0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1).withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(LucideIcons.heartPulse, color: Color(0xFFA5B4FC), size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('Executive Wellness Pulse', style: AppTypography.bodyMd(color: AppColors.darkText).copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.success.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'OPTIMAL',
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.success),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  'Work-life pace is balanced. 0 pending urgent escalations today.',
                  style: AppTypography.captionXs(color: AppColors.darkTextMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
