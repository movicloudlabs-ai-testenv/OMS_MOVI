import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import 'offline_banner.dart';

class ScreenContainer extends StatelessWidget {
  final Widget child;
  final bool scrollable;
  final EdgeInsetsGeometry? padding;
  final Future<void> Function()? onRefresh;
  final bool isOffline;

  const ScreenContainer({
    super.key,
    required this.child,
    this.scrollable = true,
    this.padding,
    this.onRefresh,
    this.isOffline = false,
  });

  @override
  Widget build(BuildContext context) {
    final effectivePadding = padding ?? const EdgeInsets.fromLTRB(16, 12, 16, 24);

    Widget content = Padding(
      padding: effectivePadding,
      child: child,
    );

    if (scrollable) {
      content = SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        child: content,
      );
    }

    if (onRefresh != null) {
      content = RefreshIndicator(
        onRefresh: onRefresh!,
        color: AppColors.primary,
        backgroundColor: AppColors.darkSurface,
        child: content,
      );
    }

    return Scaffold(
      backgroundColor: AppColors.darkBg,
      body: SafeArea(
        child: Column(
          children: [
            OfflineBanner(isOffline: isOffline),
            Expanded(child: content),
          ],
        ),
      ),
    );
  }
}
