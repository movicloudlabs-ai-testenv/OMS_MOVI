import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTypography {
  static TextStyle get font => GoogleFonts.inter();

  static TextStyle headingXxl({Color color = AppColors.darkText}) => GoogleFonts.inter(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        color: color,
        letterSpacing: -0.5,
      );

  static TextStyle headingXl({Color color = AppColors.darkText}) => GoogleFonts.inter(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: color,
        letterSpacing: -0.3,
      );

  static TextStyle headingLg({Color color = AppColors.darkText}) => GoogleFonts.inter(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: color,
      );

  static TextStyle headingMd({Color color = AppColors.darkText}) => GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: color,
      );

  static TextStyle bodyMd({Color color = AppColors.darkText}) => GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: color,
      );

  static TextStyle bodySm({Color color = AppColors.darkTextMuted}) => GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        color: color,
      );

  static TextStyle captionXs({Color color = AppColors.darkTextDim}) => GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: color,
        letterSpacing: 0.2,
      );

  static TextStyle buttonText({Color color = Colors.white}) => GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: color,
        letterSpacing: 0.2,
      );
}
