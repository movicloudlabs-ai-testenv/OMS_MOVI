import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import 'status_badge.dart';

class EnterpriseHeader extends StatelessWidget {
  final String? title;
  final String? subtitle;
  final String? userName;
  final String? roleSlug;
  final int unreadNotifications;
  final VoidCallback? onNotificationPressed;
  final VoidCallback? onProfilePressed;

  const EnterpriseHeader({
    super.key,
    this.title,
    this.subtitle,
    this.userName,
    this.roleSlug,
    this.unreadNotifications = 0,
    this.onNotificationPressed,
    this.onProfilePressed,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: title != null
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title!,
                        style: AppTypography.headingXl(color: AppColors.darkText),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          subtitle!,
                          style: AppTypography.bodySm(color: AppColors.darkTextMuted),
                        ),
                      ],
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'WELCOME BACK,',
                        style: AppTypography.captionXs(color: AppColors.darkTextMuted).copyWith(
                          letterSpacing: 0.8,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              userName ?? 'Workspace User',
                              style: AppTypography.headingLg(color: AppColors.darkText),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (roleSlug != null) ...[
                            const SizedBox(width: 8),
                            StatusBadge(
                              label: roleSlug!.replaceAll('-', ' '),
                              variant: 'primary',
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
          ),
          const SizedBox(width: 12),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (onNotificationPressed != null) ...[
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.darkSurface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.darkBorder),
                      ),
                      child: IconButton(
                        icon: const Icon(LucideIcons.bell, size: 18, color: AppColors.darkText),
                        onPressed: onNotificationPressed,
                        padding: EdgeInsets.zero,
                      ),
                    ),
                    if (unreadNotifications > 0)
                      Positioned(
                        top: -4,
                        right: -4,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.danger,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.darkBg, width: 1.5),
                          ),
                          constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                          child: Text(
                            unreadNotifications > 9 ? '9+' : '$unreadNotifications',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 8),
              ],
              if (onProfilePressed != null)
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.primary),
                  ),
                  child: IconButton(
                    icon: const Icon(LucideIcons.user, size: 18, color: AppColors.primaryLight),
                    onPressed: onProfilePressed,
                    padding: EdgeInsets.zero,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
