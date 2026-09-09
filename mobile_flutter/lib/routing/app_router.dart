import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/presentation/controllers/auth_controller.dart';
import '../features/auth/presentation/screens/login_screen.dart';
import '../features/splash/presentation/screens/splash_screen.dart';
import '../features/shell/presentation/role_shell_screen.dart';
import '../features/employee/presentation/screens/attendance_screen.dart';
import '../features/employee/presentation/screens/task_board_screen.dart';
import '../features/employee/presentation/screens/task_detail_screen.dart';
import '../features/employee/presentation/screens/leave_request_screen.dart';
import '../features/employee/presentation/screens/eod_report_screen.dart';
import '../features/notifications/presentation/screens/notifications_screen.dart';
import '../features/profile/presentation/screens/profile_screen.dart';
import '../features/hr/presentation/screens/employee_directory_screen.dart';
import '../features/hr/presentation/screens/onboarding_checklist_screen.dart';
import '../features/hr/presentation/screens/hr_assessment_hub_screen.dart';
import '../features/hr/presentation/screens/hr_attendance_hub_screen.dart';
import '../features/hr/presentation/screens/hr_intern_lms_hub_screen.dart';
import '../features/hr/presentation/screens/hr_recruitment_pipeline_screen.dart';
import '../features/hr/presentation/screens/hr_leave_quota_management_screen.dart';
import '../features/pmo/presentation/screens/project_detail_screen.dart';
import '../features/admin/presentation/screens/user_management_screen.dart';
import '../features/intern/presentation/screens/daily_tracker_screen.dart';
import '../features/intern/presentation/screens/learning_resources_screen.dart';
import '../features/intern/presentation/screens/intern_team_screen.dart';
import '../features/intern/presentation/screens/achievements_screen.dart';
import '../models/task_item.dart';
import '../models/project_item.dart';
import 'app_routes.dart';

class RouterNotifier extends ChangeNotifier {
  final Ref _ref;

  RouterNotifier(this._ref) {
    _ref.listen<AuthState>(authProvider, (_, _) {
      notifyListeners();
    });
  }

  String? redirect(BuildContext context, GoRouterState state) {
    final authState = _ref.read(authProvider);
    final isLoading = authState.isLoading;
    final isAuthenticated = authState.isAuthenticated;
    final isSplash = state.matchedLocation == AppRoutes.splash;
    final isLoggingIn = state.matchedLocation == AppRoutes.login;

    // While restoring session on app startup:
    if (isLoading) {
      // If user is on login screen (logging in), NEVER redirect to splash
      if (isLoggingIn) return null;
      return isSplash ? null : AppRoutes.splash;
    }

    // Not authenticated
    if (!isAuthenticated) {
      return isLoggingIn ? null : AppRoutes.login;
    }

    // Authenticated
    // If on splash screen or login screen, go directly to role shell
    if (isSplash || isLoggingIn) {
      return AppRoutes.shell;
    }

    return null;
  }
}

final routerNotifierProvider = Provider<RouterNotifier>((ref) {
  return RouterNotifier(ref);
});

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = ref.watch(routerNotifierProvider);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: notifier,
    redirect: notifier.redirect,
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.shell,
        builder: (context, state) => const RoleShellScreen(),
      ),
      GoRoute(
        path: AppRoutes.attendance,
        builder: (context, state) => const AttendanceScreen(),
      ),
      GoRoute(
        path: AppRoutes.tasks,
        builder: (context, state) => const TaskBoardScreen(),
      ),
      GoRoute(
        path: AppRoutes.taskDetail,
        builder: (context, state) {
          final extra = state.extra;
          TaskItem? task;
          bool isLeader = false;
          if (extra is TaskItem) {
            task = extra;
          } else if (extra is Map) {
            task = extra['task'] as TaskItem?;
            isLeader = extra['isLeader'] as bool? ?? false;
          }
          return TaskDetailScreen(initialTask: task, isLeader: isLeader);
        },
      ),
      GoRoute(
        path: AppRoutes.leaves,
        builder: (context, state) => const LeaveRequestScreen(),
      ),
      GoRoute(
        path: AppRoutes.eod,
        builder: (context, state) => const EodReportScreen(),
      ),
      GoRoute(
        path: AppRoutes.notifications,
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: AppRoutes.profile,
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: AppRoutes.employeeDirectory,
        builder: (context, state) => const EmployeeDirectoryScreen(),
      ),
      GoRoute(
        path: AppRoutes.onboardingChecklist,
        builder: (context, state) => const OnboardingChecklistScreen(),
      ),
      GoRoute(
        path: AppRoutes.projectDetail,
        builder: (context, state) {
          final project = state.extra is ProjectItem ? state.extra as ProjectItem : null;
          return ProjectDetailScreen(initialProject: project);
        },
      ),
      GoRoute(
        path: AppRoutes.userManagement,
        builder: (context, state) => const UserManagementScreen(),
      ),
      GoRoute(
        path: AppRoutes.dailyTracker,
        builder: (context, state) => const DailyTrackerScreen(),
      ),
      GoRoute(
        path: AppRoutes.learningResources,
        builder: (context, state) => const LearningResourcesScreen(),
      ),
      GoRoute(
        path: AppRoutes.hrAssessments,
        builder: (context, state) => const HrAssessmentHubScreen(),
      ),
      GoRoute(
        path: AppRoutes.hrAttendance,
        builder: (context, state) => const HrAttendanceHubScreen(),
      ),
      GoRoute(
        path: AppRoutes.hrInternLms,
        builder: (context, state) => const HrInternLmsHubScreen(),
      ),
      GoRoute(
        path: AppRoutes.hrRecruitmentPipeline,
        builder: (context, state) {
          final stage = state.uri.queryParameters['stage'] ?? (state.extra as String?) ?? 'All';
          return HrRecruitmentPipelineScreen(initialStage: stage);
        },
      ),
      GoRoute(
        path: AppRoutes.internTeam,
        builder: (context, state) {
          final project = state.extra as ProjectItem;
          return InternTeamScreen(project: project);
        },
      ),
      GoRoute(
        path: AppRoutes.achievements,
        builder: (context, state) => const AchievementsScreen(),
      ),
      GoRoute(
        path: AppRoutes.hrLeaveQuota,
        builder: (context, state) => const HrLeaveQuotaManagementScreen(),
      ),
    ],
  );
});
