import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

/// ─── COMPACT SYSTEM LOG BUBBLE ───────────────────────────────────────────────
/// A single-line, centered pill-style system notification. Keeps the same
/// width as the message text — does NOT span the full screen width.
class SystemLogBubble extends StatelessWidget {
  final String message;
  final String timeStr;

  const SystemLogBubble({
    super.key,
    required this.message,
    required this.timeStr,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Center(
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.82,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE2E8F0), width: 0.8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(LucideIcons.bot, size: 11, color: Color(0xFF6366F1)),
              const SizedBox(width: 5),
              Flexible(
                child: Text(
                  message,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF64748B),
                    height: 1.3,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              if (timeStr.isNotEmpty) ...[
                const SizedBox(width: 6),
                Text(
                  timeStr,
                  style: const TextStyle(
                    fontSize: 9,
                    color: Color(0xFFB0BEC5),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
