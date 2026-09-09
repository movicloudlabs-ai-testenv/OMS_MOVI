import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Enterprise color palette matching the recent executive design system.
class AppThemeColors {
  // Background & Surfaces
  static const Color bg = Color(0xFFF8FAFC); // Slate 50
  static const Color surface = Colors.white; // Pure White
  static const Color surfaceSubtle = Color(0xFFF1F5F9); // Slate 100
  static const Color surfaceHover = Color(0xFFE2E8F0); // Slate 200

  // Borders & Dividers
  static const Color border = Color(0xFFE2E8F0); // Slate 200
  static const Color borderSubtle = Color(0xFFF1F5F9); // Slate 100

  // Brand Primary (Royal Blue)
  static const Color primary = Color(0xFF2563EB); // Blue 600
  static const Color primaryDark = Color(0xFF1D4ED8); // Blue 700
  static const Color primaryLight = Color(0xFF60A5FA); // Blue 400
  static const Color primarySoft = Color(0xFFEFF6FF); // Blue 50

  // Typography (Slate Hierarchy)
  static const Color textPrimary = Color(0xFF0F172A); // Slate 900
  static const Color textSecondary = Color(0xFF475569); // Slate 600
  static const Color textMuted = Color(0xFF64748B); // Slate 500
  static const Color textDim = Color(0xFF94A3B8); // Slate 400

  // Status & Accents
  static const Color success = Color(0xFF10B981); // Emerald 500
  static const Color successSoft = Color(0xFFECFDF5); // Emerald 50
  static const Color successBorder = Color(0xFFA7F3D0); // Emerald 200

  static const Color danger = Color(0xFFEF4444); // Red 500
  static const Color dangerSoft = Color(0xFFFEE2E2); // Red 50
  static const Color dangerBorder = Color(0xFFFECACA); // Red 200

  static const Color warning = Color(0xFFF59E0B); // Amber 500
  static const Color warningSoft = Color(0xFFFEF3C7); // Amber 50
  static const Color warningBorder = Color(0xFFFDE68A); // Amber 200

  static const Color purple = Color(0xFF9333EA); // Purple 600
  static const Color purpleSoft = Color(0xFFFAF5FF); // Purple 50
  static const Color purpleBorder = Color(0xFFF3E8FF); // Purple 200
}

/// Unified Theme Definition
ThemeData buildEnterpriseTheme() {
  final baseTextTheme = GoogleFonts.interTextTheme();

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: AppThemeColors.bg,
    primaryColor: AppThemeColors.primary,
    cardColor: AppThemeColors.surface,
    dividerColor: AppThemeColors.border,
    colorScheme: const ColorScheme.light(
      primary: AppThemeColors.primary,
      secondary: AppThemeColors.primaryLight,
      surface: AppThemeColors.surface,
      error: AppThemeColors.danger,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: AppThemeColors.textPrimary,
      outline: AppThemeColors.border,
    ),
    textTheme: baseTextTheme.copyWith(
      displayLarge: baseTextTheme.displayLarge?.copyWith(
        color: AppThemeColors.textPrimary,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.8,
      ),
      displayMedium: baseTextTheme.displayMedium?.copyWith(
        color: AppThemeColors.textPrimary,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
      ),
      titleLarge: baseTextTheme.titleLarge?.copyWith(
        color: AppThemeColors.textPrimary,
        fontWeight: FontWeight.w700,
        fontSize: 18,
      ),
      titleMedium: baseTextTheme.titleMedium?.copyWith(
        color: AppThemeColors.textPrimary,
        fontWeight: FontWeight.w600,
        fontSize: 15,
      ),
      bodyLarge: baseTextTheme.bodyLarge?.copyWith(
        color: AppThemeColors.textPrimary,
        fontSize: 14,
      ),
      bodyMedium: baseTextTheme.bodyMedium?.copyWith(
        color: AppThemeColors.textSecondary,
        fontSize: 13,
      ),
      bodySmall: baseTextTheme.bodySmall?.copyWith(
        color: AppThemeColors.textMuted,
        fontSize: 11,
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppThemeColors.surface,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      iconTheme: IconThemeData(color: AppThemeColors.textPrimary),
      titleTextStyle: TextStyle(
        color: AppThemeColors.textPrimary,
        fontSize: 17,
        fontWeight: FontWeight.w700,
      ),
    ),
    cardTheme: CardThemeData(
      color: AppThemeColors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppThemeColors.border),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppThemeColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppThemeColors.textPrimary,
        side: const BorderSide(color: AppThemeColors.border),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppThemeColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppThemeColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppThemeColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppThemeColors.primary, width: 1.5),
      ),
      hintStyle: const TextStyle(
        color: AppThemeColors.textDim,
        fontSize: 14,
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppThemeColors.surface,
      selectedItemColor: AppThemeColors.primary,
      unselectedItemColor: AppThemeColors.textMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
  );
}
