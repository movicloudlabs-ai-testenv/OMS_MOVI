import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

enum ButtonVariant { primary, secondary, outline, danger }

class CustomButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final bool isLoading;
  final Widget? icon;
  final bool iconAfterText;
  final double? width;
  final double height;

  const CustomButton({
    super.key,
    required this.text,
    this.onPressed,
    this.variant = ButtonVariant.primary,
    this.isLoading = false,
    this.icon,
    this.iconAfterText = false,
    this.width,
    this.height = 48,
  });

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color textColor;
    Border? border;

    switch (variant) {
      case ButtonVariant.primary:
        bgColor = AppColors.primary;
        textColor = Colors.white;
        border = null;
        break;
      case ButtonVariant.secondary:
        bgColor = AppColors.darkSurface;
        textColor = AppColors.darkText;
        border = Border.all(color: AppColors.darkBorder);
        break;
      case ButtonVariant.outline:
        bgColor = Colors.transparent;
        textColor = AppColors.primaryLight;
        border = Border.all(color: AppColors.primary);
        break;
      case ButtonVariant.danger:
        bgColor = AppColors.danger;
        textColor = Colors.white;
        border = null;
        break;
    }

    final isInteractive = onPressed != null && !isLoading;

    return SizedBox(
      width: width ?? double.infinity,
      height: height,
      child: Material(
        color: isInteractive ? bgColor : bgColor.withOpacity(0.5),
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          onTap: isInteractive ? onPressed : null,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            decoration: BoxDecoration(
              border: border,
              borderRadius: BorderRadius.circular(10),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Center(
              child: isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (icon != null && !iconAfterText) ...[
                          icon!,
                          const SizedBox(width: 8),
                        ],
                        Text(
                          text,
                          style: AppTypography.buttonText(color: textColor),
                        ),
                        if (icon != null && iconAfterText) ...[
                          const SizedBox(width: 8),
                          icon!,
                        ],
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
