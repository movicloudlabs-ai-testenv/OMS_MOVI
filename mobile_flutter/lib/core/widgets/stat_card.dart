import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import 'custom_card.dart';

class StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String? subtitle;
  final Widget? icon;
  final Color? iconColor;
  final VoidCallback? onTap;

  const StatCard({
    super.key,
    required this.title,
    required this.value,
    this.subtitle,
    this.icon,
    this.iconColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return CustomCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title.toUpperCase(),
                style: AppTypography.captionXs(color: AppColors.darkTextMuted).copyWith(
                  letterSpacing: 0.5,
                ),
              ),
              if (icon != null)
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: (iconColor ?? AppColors.primary).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: icon,
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: AppTypography.headingXl(color: AppColors.darkText),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              style: AppTypography.captionXs(color: AppColors.darkTextDim),
            ),
          ],
        ],
      ),
    );
  }
}
