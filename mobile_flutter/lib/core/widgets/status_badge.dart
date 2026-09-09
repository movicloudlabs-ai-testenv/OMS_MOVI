import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

class StatusBadge extends StatelessWidget {
  final String label;
  final String? variant;
  final Color? customBgColor;
  final Color? customTextColor;

  const StatusBadge({
    super.key,
    required this.label,
    this.variant,
    this.customBgColor,
    this.customTextColor,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;

    final key = (variant ?? label).toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');

    switch (key) {
      case 'present':
      case 'approved':
      case 'done':
      case 'completed':
      case 'active':
      case 'on-track':
        bg = AppColors.success.withOpacity(0.15);
        fg = AppColors.success;
        break;
      case 'pending':
      case 'in-progress':
      case 'in-review':
      case 'half-day':
      case 'planning':
        bg = AppColors.warning.withOpacity(0.15);
        fg = AppColors.warning;
        break;
      case 'absent':
      case 'rejected':
      case 'blocked':
      case 'urgent':
      case 'at-risk':
      case 'delayed':
        bg = AppColors.danger.withOpacity(0.15);
        fg = AppColors.danger;
        break;
      case 'leave':
      case 'holiday':
      case 'info':
      case 'office':
      case 'remote':
      case 'hybrid':
      case 'primary':
      default:
        bg = AppColors.primary.withOpacity(0.15);
        fg = AppColors.primaryLight;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: customBgColor ?? bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label.toUpperCase(),
        style: AppTypography.captionXs(color: customTextColor ?? fg).copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}
