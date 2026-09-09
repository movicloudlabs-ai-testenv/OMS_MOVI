import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../theme/theme.dart';
import '../../auth/presentation/controllers/auth_controller.dart';
import '../../employee/presentation/screens/employee_dashboard_screen.dart';
import '../../employee/presentation/screens/attendance_screen.dart';
import '../../employee/presentation/screens/task_board_screen.dart';
import '../../employee/presentation/screens/leave_request_screen.dart';
import '../../employee/presentation/screens/eod_report_screen.dart';
import '../../hr/presentation/screens/hr_dashboard_screen.dart';
import '../../hr/presentation/screens/employee_directory_screen.dart';
import '../../hr/presentation/screens/hr_attendance_hub_screen.dart';
import '../../pmo/presentation/screens/pmo_dashboard_screen.dart';
import '../../pmo/presentation/screens/project_management_screen.dart';
import '../../admin/presentation/screens/admin_dashboard_screen.dart';
import '../../admin/presentation/screens/user_management_screen.dart';
import '../../chat/presentation/screens/company_chat_screen.dart';
import '../../intern/presentation/screens/intern_dashboard_screen.dart';
import '../../intern/presentation/screens/learning_resources_screen.dart';
import '../../profile/presentation/screens/profile_screen.dart';

class _NavTabItem {
  final IconData icon;
  final String label;

  const _NavTabItem({required this.icon, required this.label});
}

class RoleShellScreen extends ConsumerStatefulWidget {
  const RoleShellScreen({super.key});

  @override
  ConsumerState<RoleShellScreen> createState() => _RoleShellScreenState();
}

class _RoleShellScreenState extends ConsumerState<RoleShellScreen> {
  int _currentIndex = 0;
  String? _previousRole;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    if (!authState.isAuthenticated || authState.user == null) {
      return const Scaffold(
        backgroundColor: AppThemeColors.bg,
        body: Center(
          child: CircularProgressIndicator(color: AppThemeColors.primary),
        ),
      );
    }

    final role = authState.roleSlug;
    if (_previousRole != null && _previousRole != role) {
      _currentIndex = 0;
    }
    _previousRole = role;

    List<Widget> screens;
    List<_NavTabItem> tabItems;

    switch (role) {
      case 'super-admin':
      case 'admin':
        screens = const [
          AdminDashboardScreen(),
          UserManagementScreen(),
          ProjectManagementScreen(),
          CompanyChatScreen(),
          ProfileScreen(),
        ];
        tabItems = const [
          _NavTabItem(icon: LucideIcons.home, label: 'Home'),
          _NavTabItem(icon: LucideIcons.users, label: 'Users'),
          _NavTabItem(icon: LucideIcons.layers, label: 'Projects'),
          _NavTabItem(icon: LucideIcons.messagesSquare, label: 'Chat'),
          _NavTabItem(icon: LucideIcons.settings, label: 'Settings'),
        ];
        break;

      case 'hr-manager':
        screens = const [
          HrDashboardScreen(),
          EmployeeDirectoryScreen(),
          HrAttendanceHubScreen(),
          ProjectManagementScreen(),
          CompanyChatScreen(),
        ];
        tabItems = const [
          _NavTabItem(icon: LucideIcons.layoutDashboard, label: 'Home'),
          _NavTabItem(icon: LucideIcons.users, label: 'Directory'),
          _NavTabItem(icon: LucideIcons.calendarCheck, label: 'Attendance'),
          _NavTabItem(icon: LucideIcons.layers, label: 'Projects'),
          _NavTabItem(icon: LucideIcons.messagesSquare, label: 'Chat'),
        ];
        break;

      case 'pmo-lead':
        screens = const [
          PmoDashboardScreen(),
          ProjectManagementScreen(),
          TaskBoardScreen(),
          LeaveRequestScreen(),
        ];
        tabItems = const [
          _NavTabItem(icon: LucideIcons.layoutDashboard, label: 'Home'),
          _NavTabItem(icon: LucideIcons.folder, label: 'Project'),
          _NavTabItem(icon: LucideIcons.checkSquare, label: 'Tasks'),
          _NavTabItem(icon: LucideIcons.calendar, label: 'Leaves'),
        ];
        break;

      case 'intern':
        screens = const [
          InternDashboardScreen(),
          ProjectManagementScreen(),
          TaskBoardScreen(),
          CompanyChatScreen(),
          LearningResourcesScreen(),
        ];
        tabItems = const [
          _NavTabItem(icon: LucideIcons.layoutDashboard, label: 'Home'),
          _NavTabItem(icon: LucideIcons.layers, label: 'Projects'),
          _NavTabItem(icon: LucideIcons.checkSquare, label: 'Tasks'),
          _NavTabItem(icon: LucideIcons.messagesSquare, label: 'Chat'),
          _NavTabItem(icon: LucideIcons.graduationCap, label: 'Learn'),
        ];
        break;

      case 'employee':
      default:
        screens = const [
          EmployeeDashboardScreen(),
          AttendanceScreen(),
          TaskBoardScreen(),
          LeaveRequestScreen(),
          EodReportScreen(),
        ];
        tabItems = const [
          _NavTabItem(icon: LucideIcons.layoutDashboard, label: 'Home'),
          _NavTabItem(icon: LucideIcons.clock, label: 'Attendance'),
          _NavTabItem(icon: LucideIcons.checkSquare, label: 'Tasks'),
          _NavTabItem(icon: LucideIcons.calendar, label: 'Leaves'),
          _NavTabItem(icon: LucideIcons.fileText, label: 'EOD'),
        ];
        break;
    }

    final safeIndex = _currentIndex >= screens.length ? 0 : _currentIndex;

    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      extendBody: true,
      body: IndexedStack(
        index: safeIndex,
        children: screens,
      ),
      bottomNavigationBar: _buildEnterpriseFloatingNavBar(
        items: tabItems,
        selectedIndex: safeIndex,
        onTap: (index) {
          HapticFeedback.selectionClick();
          setState(() => _currentIndex = index);
        },
      ),
    );
  }

  Widget _buildEnterpriseFloatingNavBar({
    required List<_NavTabItem> items,
    required int selectedIndex,
    required ValueChanged<int> onTap,
  }) {
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 14),
        height: 66,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(33),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF2563EB).withOpacity(0.08),
              blurRadius: 20,
              offset: const Offset(0, 6),
            ),
            BoxShadow(
              color: const Color(0xFF64748B).withOpacity(0.06),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(33),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18, tileMode: TileMode.decal),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.88),
                borderRadius: BorderRadius.circular(33),
                border: Border.all(
                  color: Colors.white.withOpacity(0.80),
                  width: 1.5,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(items.length, (index) {
                  final isSelected = index == selectedIndex;
                  final item = items[index];

                  return GestureDetector(
                    onTap: () => onTap(index),
                    behavior: HitTestBehavior.opaque,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 260),
                      curve: Curves.easeOutCubic,
                      padding: isSelected
                          ? const EdgeInsets.symmetric(horizontal: 14, vertical: 9)
                          : const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                      decoration: BoxDecoration(
                        gradient: isSelected
                            ? const LinearGradient(
                                colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              )
                            : null,
                        color: isSelected ? null : Colors.transparent,
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: const Color(0xFF2563EB).withOpacity(0.38),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ]
                            : null,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            item.icon,
                            size: 19,
                            color: isSelected ? Colors.white : const Color(0xFF64748B),
                          ),
                          if (isSelected) ...[
                            const SizedBox(width: 6),
                            Text(
                              item.label,
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                letterSpacing: 0.1,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
