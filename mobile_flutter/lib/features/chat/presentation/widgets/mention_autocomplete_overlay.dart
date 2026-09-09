import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

/// ─── ENTERPRISE MENTION AUTOCOMPLETE OVERLAY ─────────────────────────────────
/// Renders an interactive floating popup when '@' is typed in the composer.
class MentionAutocompleteOverlay extends StatelessWidget {
  final String query;
  final List<Map<String, dynamic>> members;
  final List<Map<String, dynamic>> aliases;
  final ValueChanged<String> onSelectMention;

  const MentionAutocompleteOverlay({
    super.key,
    required this.query,
    required this.members,
    required this.aliases,
    required this.onSelectMention,
  });

  @override
  Widget build(BuildContext context) {
    final cleanQuery = query.toLowerCase().trim();

    final filteredAliases = aliases.where((a) {
      final name = (a['name']?.toString() ?? '').toLowerCase();
      return name.contains(cleanQuery);
    }).toList();

    final filteredMembers = members.where((m) {
      final name = (m['name']?.toString() ?? '').toLowerCase();
      final desig = (m['designation']?.toString() ?? '').toLowerCase();
      return name.contains(cleanQuery) || desig.contains(cleanQuery);
    }).toList();

    if (filteredAliases.isEmpty && filteredMembers.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      constraints: const BoxConstraints(maxHeight: 220),
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              color: const Color(0xFFF8FAFC),
              child: Row(
                children: [
                  const Icon(LucideIcons.atSign, size: 14, color: Color(0xFF2563EB)),
                  const SizedBox(width: 6),
                  const Text(
                    'Mention Teammate or Role',
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                  ),
                  const Spacer(),
                  Text(
                    '${filteredMembers.length + filteredAliases.length} matches',
                    style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: Color(0xFFE2E8F0)),

            // Options List
            Flexible(
              child: ListView(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(vertical: 4),
                children: [
                  // Broadcast aliases
                  ...filteredAliases.map((a) {
                    final name = a['name']?.toString() ?? '';
                    final desig = a['designation']?.toString() ?? '';
                    return ListTile(
                      dense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 0),
                      leading: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3E8FF),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(LucideIcons.megaphone, size: 14, color: Color(0xFF7C3AED)),
                      ),
                      title: Text(
                        '@$name',
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF7C3AED)),
                      ),
                      subtitle: Text(
                        desig,
                        style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                      ),
                      onTap: () => onSelectMention(name),
                    );
                  }),

                  if (filteredAliases.isNotEmpty && filteredMembers.isNotEmpty)
                    const Divider(height: 1, color: Color(0xFFF1F5F9)),

                  // Team Members
                  ...filteredMembers.map((m) {
                    final name = m['name']?.toString() ?? 'Colleague';
                    final desig = m['designation']?.toString() ?? 'Member';
                    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';

                    return ListTile(
                      dense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 0),
                      leading: CircleAvatar(
                        radius: 14,
                        backgroundColor: const Color(0xFFEFF6FF),
                        child: Text(
                          initial,
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                        ),
                      ),
                      title: Text(
                        name,
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                      ),
                      subtitle: Text(
                        desig,
                        style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Tag',
                          style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: Color(0xFF2563EB)),
                        ),
                      ),
                      onTap: () => onSelectMention(name),
                    );
                  }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
