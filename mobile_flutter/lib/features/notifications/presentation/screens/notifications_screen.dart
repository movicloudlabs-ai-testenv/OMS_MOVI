import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../theme/app_colors.dart';
import '../../../../theme/app_typography.dart';
import '../../../../core/widgets/screen_container.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../controllers/notifications_controller.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifState = ref.watch(notificationsProvider);
    final notifier = ref.read(notificationsProvider.notifier);

    return ScreenContainer(
      onRefresh: () => notifier.loadNotifications(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(LucideIcons.arrowLeft, color: AppColors.darkText, size: 20),
                onPressed: () => context.pop(),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text('Notifications', style: AppTypography.headingXl(color: AppColors.darkText)),
              ),
              if (notifState.unreadCount > 0)
                TextButton(
                  onPressed: () => notifier.markAllAsRead(),
                  child: const Text('Mark all read', style: TextStyle(color: AppColors.primaryLight)),
                ),
            ],
          ),
          const SizedBox(height: 16),

          if (notifState.notifications.isEmpty)
            const CustomCard(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Center(
                  child: Column(
                    children: [
                      Icon(LucideIcons.bell, size: 36, color: AppColors.darkTextDim),
                      SizedBox(height: 10),
                      Text('No notifications', style: TextStyle(color: AppColors.darkText, fontSize: 16, fontWeight: FontWeight.bold)),
                      SizedBox(height: 4),
                      Text('You are all caught up!', style: TextStyle(color: AppColors.darkTextMuted)),
                    ],
                  ),
                ),
              ),
            )
          else
            ...notifState.notifications.map(
              (item) => CustomCard(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                borderColor: !item.isRead ? AppColors.primary : AppColors.darkBorder,
                backgroundColor: !item.isRead ? const Color(0xFF1E2442) : AppColors.darkSurface,
                onTap: () {
                  if (!item.isRead) notifier.markAsRead(item.id);
                },
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: AppTypography.headingLg(color: AppColors.darkText),
                          ),
                        ),
                        if (!item.isRead)
                          const StatusBadge(label: 'NEW', variant: 'danger'),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(item.message, style: AppTypography.bodySm(color: AppColors.darkTextMuted)),
                    const SizedBox(height: 8),
                    Text(item.createdAt, style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
