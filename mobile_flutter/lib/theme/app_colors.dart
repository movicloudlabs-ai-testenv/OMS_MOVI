import 'package:flutter/material.dart';
import 'theme.dart';

export 'theme.dart';

/// Legacy AppColors redirected to the unified executive light theme palette.
class AppColors {
  // Brand Primary (Royal Blue enterprise palette)
  static const Color primary = AppThemeColors.primary;
  static const Color primaryDark = AppThemeColors.primaryDark;
  static const Color primaryLight = AppThemeColors.primaryLight;
  static const Color primaryBg = AppThemeColors.primarySoft;
  static const Color primarySoft = AppThemeColors.primarySoft;

  // Status & Accents
  static const Color success = AppThemeColors.success;
  static const Color successLight = AppThemeColors.successSoft;
  static const Color successSoft = AppThemeColors.successSoft;
  static const Color successBorder = AppThemeColors.successBorder;
  static const Color warning = AppThemeColors.warning;
  static const Color warningLight = AppThemeColors.warningSoft;
  static const Color danger = AppThemeColors.danger;
  static const Color dangerLight = AppThemeColors.dangerSoft;
  static const Color info = Color(0xFF3B82F6);
  static const Color infoLight = Color(0xFFDBEAFE);

  // Surfaces & Backgrounds unified to light executive theme
  static const Color darkBg = AppThemeColors.bg; // #F8FAFC
  static const Color darkSurface = Colors.white; // #FFFFFF
  static const Color darkSurfaceSubtle = AppThemeColors.surfaceSubtle;
  static const Color darkBorder = AppThemeColors.border; // #E2E8F0
  static const Color darkText = AppThemeColors.textPrimary; // #0F172A
  static const Color darkTextMuted = AppThemeColors.textMuted; // #64748B
  static const Color darkTextDim = AppThemeColors.textDim; // #94A3B8

  // Light Card & Surfaces
  static const Color lightBg = AppThemeColors.bg;
  static const Color cardSurface = Colors.white;
  static const Color cardBorder = AppThemeColors.border;
  static const Color cardText = AppThemeColors.textPrimary;
  static const Color cardTextMuted = AppThemeColors.textMuted;
  static const Color cardTextDim = AppThemeColors.textDim;

  // Gradients
  static const LinearGradient heroGradient = LinearGradient(
    colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
