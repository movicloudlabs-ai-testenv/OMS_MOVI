import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// ─── CHAT WALLPAPER SYSTEM ────────────────────────────────────────────────────
/// Defines all background presets and provides per-channel persistence via
/// SharedPreferences.  No new dependencies required — shared_preferences is
/// already declared in pubspec.yaml.

enum ChatWallpaper {
  defaultWhite,
  ambientLuxury,
  midnightObsidian,
  softGrey,
  warmCream,
  mintFresh,
  softBlue,
  softPurple,
  patternDots,
  patternLines,
  gradientSunrise,
  gradientCool,
}

extension ChatWallpaperX on ChatWallpaper {
  /// Whether this preset is a dark-theme background.
  bool get isDark =>
      this == ChatWallpaper.ambientLuxury ||
      this == ChatWallpaper.midnightObsidian;

  /// Human-readable label shown in the picker sheet.
  String get label {
    switch (this) {
      case ChatWallpaper.defaultWhite:
        return 'Default';
      case ChatWallpaper.ambientLuxury:
        return 'Luxury Ambient';
      case ChatWallpaper.midnightObsidian:
        return 'Obsidian';
      case ChatWallpaper.softGrey:
        return 'Soft Grey';
      case ChatWallpaper.warmCream:
        return 'Warm Cream';
      case ChatWallpaper.mintFresh:
        return 'Mint Fresh';
      case ChatWallpaper.softBlue:
        return 'Sky Blue';
      case ChatWallpaper.softPurple:
        return 'Lavender';
      case ChatWallpaper.patternDots:
        return 'Dot Grid';
      case ChatWallpaper.patternLines:
        return 'Line Grid';
      case ChatWallpaper.gradientSunrise:
        return 'Sunrise';
      case ChatWallpaper.gradientCool:
        return 'Cool Mist';
    }
  }

  /// Solid preview color used in the picker thumbnail.
  Color get previewColor {
    switch (this) {
      case ChatWallpaper.defaultWhite:
        return const Color(0xFFFFFFFF);
      case ChatWallpaper.ambientLuxury:
        return const Color(0xFF281F1B);
      case ChatWallpaper.midnightObsidian:
        return const Color(0xFF0F172A);
      case ChatWallpaper.softGrey:
        return const Color(0xFFF1F5F9);
      case ChatWallpaper.warmCream:
        return const Color(0xFFFFF8F0);
      case ChatWallpaper.mintFresh:
        return const Color(0xFFECFDF5);
      case ChatWallpaper.softBlue:
        return const Color(0xFFEFF6FF);
      case ChatWallpaper.softPurple:
        return const Color(0xFFF5F3FF);
      case ChatWallpaper.patternDots:
        return const Color(0xFFF8FAFC);
      case ChatWallpaper.patternLines:
        return const Color(0xFFF8FAFC);
      case ChatWallpaper.gradientSunrise:
        return const Color(0xFFFEF3C7);
      case ChatWallpaper.gradientCool:
        return const Color(0xFFDBEAFE);
    }
  }

  /// Whether this preset uses a custom painter (patterns).
  bool get usesCustomPaint =>
      this == ChatWallpaper.patternDots ||
      this == ChatWallpaper.patternLines;

  /// Returns a plain `BoxDecoration` for non-pattern presets.
  BoxDecoration get decoration {
    switch (this) {
      case ChatWallpaper.ambientLuxury:
        return const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0.4, -0.2),
            radius: 1.35,
            colors: [
              Color(0xFF3E2D24), // warm ambient amber-caramel studio light
              Color(0xFF241C18), // warm dark espresso
              Color(0xFF14100E), // deep vignette borders
            ],
            stops: [0.0, 0.52, 1.0],
          ),
        );
      case ChatWallpaper.midnightObsidian:
        return const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF1E293B),
              Color(0xFF0F172A),
              Color(0xFF090D16),
            ],
            stops: [0.0, 0.6, 1.0],
          ),
        );
      case ChatWallpaper.gradientSunrise:
        return const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFFEF9C3), Color(0xFFFFF7F0), Color(0xFFFFFFFF)],
            stops: [0.0, 0.5, 1.0],
          ),
        );
      case ChatWallpaper.gradientCool:
        return const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFDBEAFE), Color(0xFFEEF2FF), Color(0xFFFFFFFF)],
            stops: [0.0, 0.5, 1.0],
          ),
        );
      default:
        return BoxDecoration(color: previewColor);
    }
  }
}

// ─── WALLPAPER PAINTER ────────────────────────────────────────────────────────

/// CustomPainter for dot-grid and line-grid patterns.
class WallpaperPatternPainter extends CustomPainter {
  final ChatWallpaper wallpaper;

  const WallpaperPatternPainter(this.wallpaper);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFCBD5E1).withOpacity(0.4)
      ..strokeWidth = 1;

    if (wallpaper == ChatWallpaper.patternDots) {
      const spacing = 20.0;
      for (double x = 0; x < size.width; x += spacing) {
        for (double y = 0; y < size.height; y += spacing) {
          canvas.drawCircle(Offset(x, y), 1.5, paint);
        }
      }
    } else if (wallpaper == ChatWallpaper.patternLines) {
      const spacing = 24.0;
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
      }
      for (double x = 0; x < size.width; x += spacing) {
        canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
      }
    }
  }

  @override
  bool shouldRepaint(WallpaperPatternPainter oldDelegate) =>
      oldDelegate.wallpaper != wallpaper;
}

/// Builds the full-screen wallpaper widget to sit behind the chat list.
Widget buildWallpaperBackground(ChatWallpaper wallpaper) {
  if (wallpaper == ChatWallpaper.patternDots ||
      wallpaper == ChatWallpaper.patternLines) {
    return Container(
      decoration: BoxDecoration(color: wallpaper.previewColor),
      child: CustomPaint(
        painter: WallpaperPatternPainter(wallpaper),
        child: const SizedBox.expand(),
      ),
    );
  }

  return Container(
    decoration: wallpaper.decoration,
    child: const SizedBox.expand(),
  );
}

// ─── PERSISTENCE SERVICE ──────────────────────────────────────────────────────

class ChatWallpaperService {
  static const String _prefix = 'chat_wallpaper_';

  static Future<ChatWallpaper> get(String channelId) async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString('$_prefix$channelId');
    if (stored == null) return ChatWallpaper.defaultWhite;
    try {
      return ChatWallpaper.values.firstWhere(
        (e) => e.name == stored,
        orElse: () => ChatWallpaper.defaultWhite,
      );
    } catch (_) {
      return ChatWallpaper.defaultWhite;
    }
  }

  static Future<void> set(String channelId, ChatWallpaper wallpaper) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_prefix$channelId', wallpaper.name);
  }
}
