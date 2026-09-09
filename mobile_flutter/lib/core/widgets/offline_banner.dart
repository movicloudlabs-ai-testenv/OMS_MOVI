import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

class OfflineBanner extends StatelessWidget {
  final bool isOffline;

  const OfflineBanner({super.key, this.isOffline = false});

  @override
  Widget build(BuildContext context) {
    if (!isOffline) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      color: AppColors.danger,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(LucideIcons.wifiOff, color: Colors.white, size: 16),
          const SizedBox(width: 8),
          Text(
            'No Internet Connection. Working in Offline Mode.',
            style: AppTypography.captionXs(color: Colors.white).copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
