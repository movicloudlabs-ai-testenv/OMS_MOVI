import 'package:flutter/material.dart';
import 'theme.dart';

export 'theme.dart';

class AppTheme {
  /// Unified enterprise light theme matching the recent design system
  static ThemeData get lightTheme => buildEnterpriseTheme();

  /// Legacy dark theme fallback
  static ThemeData get darkTheme => buildEnterpriseTheme();

  /// Default application theme
  static ThemeData get theme => lightTheme;
}
