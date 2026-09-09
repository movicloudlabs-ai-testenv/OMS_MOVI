import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../theme/app_colors.dart';
import '../../../../theme/app_typography.dart';
import '../../../../core/widgets/screen_container.dart';
import '../../../../core/widgets/enterprise_header.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../core/widgets/stat_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../models/project_item.dart';
import '../../../notifications/presentation/controllers/notifications_controller.dart';
import '../../data/pmo_api.dart';

class PmoDashboardScreen extends ConsumerStatefulWidget {
  const PmoDashboardScreen({super.key});

  @override
  ConsumerState<PmoDashboardScreen> createState() => _PmoDashboardScreenState();
}

class _PmoDashboardScreenState extends ConsumerState<PmoDashboardScreen> {
  final PmoApi _api = PmoApi();
  List<ProjectItem> _projects = [];

  @override
  void initState() {
    super.initState();
    _loadProjects();
  }

  Future<void> _loadProjects() async {
    try {
      final res = await _api.getProjects();
      if (mounted) setState(() => _projects = res);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final notifState = ref.watch(notificationsProvider);
    final active = _projects.where((p) => p.status == 'active').length;
    final onTrack = _projects.where((p) => p.health == 'On Track').length;

    return ScreenContainer(
      onRefresh: _loadProjects,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          EnterpriseHeader(
            title: 'PMO Workspace',
            subtitle: 'Project Portfolio & Sprint Operations',
            unreadNotifications: notifState.unreadCount,
            onNotificationPressed: () => context.push('/notifications'),
            onProfilePressed: () => context.push('/profile'),
          ),

          Row(
            children: [
              Expanded(
                child: StatCard(
                  title: 'Active Projects',
                  value: '$active',
                  subtitle: '${_projects.length} Total registered',
                  icon: const Icon(LucideIcons.folder, size: 18, color: AppColors.primaryLight),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: StatCard(
                  title: 'Health Status',
                  value: '$onTrack/${_projects.isNotEmpty ? _projects.length : 1}',
                  subtitle: 'On Track',
                  icon: const Icon(LucideIcons.checkCircle2, size: 18, color: AppColors.success),
                  iconColor: AppColors.success,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          Text('Active Portfolios', style: AppTypography.headingLg(color: AppColors.darkText)),
          const SizedBox(height: 10),

          if (_projects.isEmpty)
            const CustomCard(
              child: Padding(
                padding: EdgeInsets.all(28),
                child: Center(
                  child: Text('No active projects found', style: TextStyle(color: AppColors.darkTextMuted)),
                ),
              ),
            )
          else
            ..._projects.map(
              (p) => CustomCard(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                onTap: () => context.push('/project-detail', extra: p),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          p.key ?? 'PROJ',
                          style: AppTypography.captionXs(color: AppColors.primaryLight).copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Row(
                          children: [
                            StatusBadge(label: p.health, variant: p.health),
                            const SizedBox(width: 6),
                            StatusBadge(label: p.status, variant: p.status),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(p.name, style: AppTypography.headingLg(color: AppColors.darkText)),
                    if (p.description != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        p.description!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.bodySm(color: AppColors.darkTextMuted),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Lead: ${p.leadName ?? "Unassigned"}', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
                        Row(
                          children: [
                            Text('${p.taskCount} tasks', style: AppTypography.captionXs(color: AppColors.primaryLight)),
                            const SizedBox(width: 4),
                            const Icon(LucideIcons.chevronRight, size: 14, color: AppColors.darkTextDim),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
