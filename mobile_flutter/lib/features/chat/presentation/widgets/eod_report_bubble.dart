import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

/// ─── ENTERPRISE EOD REPORT BUBBLE ──────────────────────────────────────────
/// Renders an executive End-of-Day report card directly in chat conversations.
class EodReportBubble extends StatelessWidget {
  final bool isMe;
  final String senderName;
  final String? roleName;
  final String message;
  final Map<String, dynamic>? eodRef;
  final String timeStr;
  final VoidCallback? onOpenDetails;

  const EodReportBubble({
    super.key,
    required this.isMe,
    required this.senderName,
    required this.roleName,
    required this.message,
    this.eodRef,
    required this.timeStr,
    this.onOpenDetails,
  });

  Map<String, String> _parseMessageFields(String raw) {
    final result = <String, String>{};
    final lines = raw.split('\n');

    String currentSection = 'summary';
    final currentBuffer = StringBuffer();

    for (final line in lines) {
      final trimmed = line.trim();
      if (trimmed.startsWith('📋') || trimmed.contains('EOD Report')) {
        result['title'] = trimmed;
      } else if (trimmed.startsWith('⏱') || trimmed.contains('Hours:')) {
        result['hours'] = trimmed.replaceAll('*', '');
      } else if (trimmed.startsWith('✅') || trimmed.contains('Accomplished:')) {
        if (currentBuffer.isNotEmpty) {
          result[currentSection] = currentBuffer.toString().trim();
          currentBuffer.clear();
        }
        currentSection = 'accomplished';
        final rest = trimmed.replaceAll('✅', '').replaceAll('*Accomplished:*', '').replaceAll('Accomplished:', '').trim();
        if (rest.isNotEmpty) currentBuffer.writeln(rest);
      } else if (trimmed.startsWith('🔴') || trimmed.startsWith('🟢') || trimmed.contains('Blockers:')) {
        if (currentBuffer.isNotEmpty) {
          result[currentSection] = currentBuffer.toString().trim();
          currentBuffer.clear();
        }
        currentSection = 'blockers';
        final rest = trimmed.replaceAll('🔴', '').replaceAll('🟢', '').replaceAll('*Blockers:*', '').replaceAll('Blockers:', '').trim();
        if (rest.isNotEmpty) currentBuffer.writeln(rest);
      } else if (trimmed.startsWith('📅') || trimmed.contains('Tomorrow:')) {
        if (currentBuffer.isNotEmpty) {
          result[currentSection] = currentBuffer.toString().trim();
          currentBuffer.clear();
        }
        currentSection = 'tomorrow';
        final rest = trimmed.replaceAll('📅', '').replaceAll('*Tomorrow:*', '').replaceAll('Tomorrow:', '').trim();
        if (rest.isNotEmpty) currentBuffer.writeln(rest);
      } else if (trimmed.startsWith('💡') || trimmed.contains('Learnings:')) {
        if (currentBuffer.isNotEmpty) {
          result[currentSection] = currentBuffer.toString().trim();
          currentBuffer.clear();
        }
        currentSection = 'learnings';
        final rest = trimmed.replaceAll('💡', '').replaceAll('*Learnings:*', '').replaceAll('Learnings:', '').trim();
        if (rest.isNotEmpty) currentBuffer.writeln(rest);
      } else if (trimmed.startsWith('🌟') || trimmed.contains('Energy:')) {
        result['mood'] = trimmed.replaceAll('*', '');
      } else {
        if (trimmed.isNotEmpty) {
          currentBuffer.writeln(trimmed);
        }
      }
    }

    if (currentBuffer.isNotEmpty) {
      result[currentSection] = currentBuffer.toString().trim();
    }

    return result;
  }

  void _showFullEodModal(BuildContext context, Map<String, String> parsed) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.fromLTRB(
            20,
            16,
            20,
            MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF059669), Color(0xFF10B981)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(LucideIcons.fileCheck2, size: 20, color: Colors.white),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$senderName\'s Daily EOD Report',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          timeStr.isNotEmpty ? 'Dispatched at $timeStr' : 'Synchronized with Project Tracker',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              const SizedBox(height: 16),
              if (parsed['hours'] != null)
                _buildModalRow(
                  LucideIcons.clock,
                  'Shift Duration & Net Hours',
                  parsed['hours']!,
                  const Color(0xFF2563EB),
                ),
              if (parsed['accomplished'] != null && parsed['accomplished']!.isNotEmpty)
                _buildModalRow(
                  LucideIcons.checkCircle2,
                  'Accomplished Deliverables',
                  parsed['accomplished']!,
                  const Color(0xFF059669),
                ),
              if (parsed['blockers'] != null && parsed['blockers']!.isNotEmpty)
                _buildModalRow(
                  LucideIcons.alertCircle,
                  'Blockers & Impediments',
                  parsed['blockers']!,
                  parsed['blockers']!.toLowerCase().contains('none')
                      ? const Color(0xFF10B981)
                      : const Color(0xFFEF4444),
                ),
              if (parsed['tomorrow'] != null && parsed['tomorrow']!.isNotEmpty)
                _buildModalRow(
                  LucideIcons.calendar,
                  'Planned for Next Workday',
                  parsed['tomorrow']!,
                  const Color(0xFF8B5CF6),
                ),
              if (parsed['learnings'] != null && parsed['learnings']!.isNotEmpty)
                _buildModalRow(
                  LucideIcons.lightbulb,
                  'Key Insights & Learnings',
                  parsed['learnings']!,
                  const Color(0xFFD97706),
                ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F172A),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Close Summary', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildModalRow(IconData icon, String title, String content, Color iconColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 3),
                Text(
                  content,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF1E293B), height: 1.35),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final parsed = _parseMessageFields(message);

    final tasksAccomplished = eodRef?['tasksCompleted']?.toString() ?? parsed['accomplished'] ?? '';
    final blockers = eodRef?['blockers']?.toString() ?? parsed['blockers'] ?? 'None';
    final hasActiveBlockers = blockers.isNotEmpty && !blockers.toLowerCase().contains('none');
    final mood = eodRef?['mood']?.toString() ?? parsed['mood'] ?? '🚀 Energized';
    final hours = parsed['hours'] ?? '⏱ Hours Logged: 8h 00m';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isMe) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: const Color(0xFFECFDF5),
              child: Text(
                senderName.isNotEmpty ? senderName[0].toUpperCase() : 'E',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isMe)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        senderName,
                        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                      ),
                      if (roleName != null) ...[
                        const SizedBox(width: 5),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4)),
                          child: Text(
                            roleName!,
                            style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                          ),
                        ),
                      ],
                      const SizedBox(width: 6),
                      Text(timeStr, style: const TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8))),
                    ],
                  ),
                const SizedBox(height: 4),

                // ── Executive EOD Report Card ──────────────────────────────
                Container(
                  width: 300,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0F172A).withOpacity(0.06),
                        blurRadius: 14,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Card Header: Executive Emerald Gradient
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Color(0xFF0F766E), Color(0xFF059669)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.vertical(top: Radius.circular(17)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(5),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(LucideIcons.fileSpreadsheet, size: 14, color: Colors.white),
                            ),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text(
                                'DAILY EOD REPORT',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                  letterSpacing: 0.6,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                mood.contains(' ') ? mood.split(' ').first : '🚀',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Card Body: Accomplished & Shift Hours
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Shift hours badge
                            Row(
                              children: [
                                const Icon(LucideIcons.clock, size: 12, color: Color(0xFF2563EB)),
                                const SizedBox(width: 5),
                                Expanded(
                                  child: Text(
                                    hours,
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),

                            // Accomplished deliverables
                            if (tasksAccomplished.isNotEmpty) ...[
                              const Text(
                                'ACCOMPLISHED DELIVERABLES',
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF64748B),
                                  letterSpacing: 0.3,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFF1F5F9)),
                                ),
                                child: Text(
                                  tasksAccomplished,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF0F172A),
                                    height: 1.35,
                                  ),
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(height: 8),
                            ],

                            // Blocker status pill
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: hasActiveBlockers
                                        ? const Color(0xFFFEF2F2)
                                        : const Color(0xFFF0FDF4),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                      color: hasActiveBlockers
                                          ? const Color(0xFFFCA5A5)
                                          : const Color(0xFF86EFAC),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        hasActiveBlockers ? LucideIcons.alertTriangle : LucideIcons.checkCircle,
                                        size: 11,
                                        color: hasActiveBlockers ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        hasActiveBlockers ? 'Blockers Reported' : 'Zero Blockers',
                                        style: TextStyle(
                                          fontSize: 9.5,
                                          fontWeight: FontWeight.w700,
                                          color: hasActiveBlockers ? const Color(0xFFB91C1C) : const Color(0xFF15803D),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Card Footer Action Button: "View Full EOD Report"
                      GestureDetector(
                        onTap: () {
                          if (onOpenDetails != null) {
                            onOpenDetails!();
                          } else {
                            _showFullEodModal(context, parsed);
                          }
                        },
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
                          decoration: const BoxDecoration(
                            color: Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.vertical(bottom: Radius.circular(17)),
                            border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'View Full EOD Report',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF059669),
                                ),
                              ),
                              SizedBox(width: 6),
                              Icon(LucideIcons.arrowRight, size: 13, color: Color(0xFF059669)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                if (isMe)
                  Padding(
                    padding: const EdgeInsets.only(top: 3, right: 4),
                    child: Text(timeStr, style: const TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8))),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
