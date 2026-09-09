import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../data/chat_api.dart';

/// ─── WHATSAPP-STYLE MESSAGE INFO BOTTOM SHEET ──────────────────────────────
/// Displays read receipts and delivery analytics ("Read by" & "Delivered to")
/// with member avatars, roles, and exact timestamps.
class MessageInfoSheet extends StatefulWidget {
  final Map<String, dynamic> message;

  const MessageInfoSheet({
    super.key,
    required this.message,
  });

  static Future<void> show(BuildContext context, Map<String, dynamic> message) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => MessageInfoSheet(message: message),
    );
  }

  @override
  State<MessageInfoSheet> createState() => _MessageInfoSheetState();
}

class _MessageInfoSheetState extends State<MessageInfoSheet> {
  final ChatApi _chatApi = ChatApi();

  bool _isLoading = true;
  List<Map<String, dynamic>> _readBy = [];
  List<Map<String, dynamic>> _deliveredTo = [];

  String get _messageId => widget.message['_id']?.toString() ?? '';
  String get _messageText => widget.message['message']?.toString() ?? '';
  String get _timeStr {
    final raw = widget.message['createdAt'];
    if (raw == null) return '';
    try {
      final dt = DateTime.parse(raw.toString()).toLocal();
      return DateFormat('h:mm a').format(dt);
    } catch (_) {
      return '';
    }
  }

  @override
  void initState() {
    super.initState();
    _fetchMessageInfo();
  }

  Future<void> _fetchMessageInfo() async {
    if (_messageId.isEmpty) {
      setState(() => _isLoading = false);
      return;
    }

    try {
      final res = await _chatApi.getMessageInfo(_messageId);
      if (mounted && res != null) {
        setState(() {
          _readBy = (res['readBy'] as List?)?.cast<Map<String, dynamic>>() ?? [];
          _deliveredTo = (res['deliveredTo'] as List?)?.cast<Map<String, dynamic>>() ?? [];
          _isLoading = false;
        });
        return;
      }
    } catch (_) {}

    // Fallback to embedded readBy if API fails or offline
    if (mounted) {
      final rawRead = widget.message['readBy'];
      if (rawRead is List) {
        _readBy = rawRead.whereType<Map<String, dynamic>>().toList();
      }
      setState(() => _isLoading = false);
    }
  }

  String _formatTimestamp(dynamic ts) {
    if (ts == null) return 'Just now';
    try {
      final dt = DateTime.parse(ts.toString()).toLocal();
      final now = DateTime.now();
      if (now.difference(dt).inDays == 0) {
        return 'Today at ${DateFormat('h:mm a').format(dt)}';
      } else if (now.difference(dt).inDays == 1) {
        return 'Yesterday at ${DateFormat('h:mm a').format(dt)}';
      }
      return DateFormat('MMM d, h:mm a').format(dt);
    } catch (_) {
      return 'Recently';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.82,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFFF8FAFC),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag Handle
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 38,
              height: 4.5,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Title Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(LucideIcons.info, size: 18, color: Color(0xFF2563EB)),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Message Info',
                  style: TextStyle(
                    fontSize: 16.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(LucideIcons.x, size: 18, color: Color(0xFF64748B)),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Scrollable Body
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                // ── Preview of the outgoing bubble ──
                Align(
                  alignment: Alignment.centerRight,
                  child: Container(
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.82,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withOpacity(0.20),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          _messageText,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13.5,
                            height: 1.35,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _timeStr,
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.8),
                                fontSize: 10,
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Icon(
                              Icons.done_all,
                              size: 13,
                              color: Color(0xFF93C5FD),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 22),

                // ── WhatsApp-style "Read by" Section ──
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                        child: Row(
                          children: [
                            const Icon(Icons.done_all, size: 18, color: Color(0xFF2563EB)),
                            const SizedBox(width: 8),
                            const Text(
                              'Read by',
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '${_readBy.length} ${_readBy.length == 1 ? 'member' : 'members'}',
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF2563EB),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),

                      if (_isLoading)
                        const Padding(
                          padding: EdgeInsets.all(20),
                          child: Center(
                            child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB)),
                          ),
                        )
                      else if (_readBy.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(18),
                          child: Center(
                            child: Text(
                              'Not read yet by any recipient',
                              style: TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
                            ),
                          ),
                        )
                      else
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _readBy.length,
                          separatorBuilder: (_, _) => const Divider(
                            height: 1,
                            indent: 64,
                            color: Color(0xFFF1F5F9),
                          ),
                          itemBuilder: (ctx, i) {
                            final item = _readBy[i];
                            final u = item['user'] is Map ? item['user'] as Map<String, dynamic> : null;
                            final name = u != null ? (u['name']?.toString() ?? 'Teammate') : 'Teammate';
                            final desig = u != null ? (u['designation']?.toString() ?? 'Member') : 'Member';
                            final readAt = item['readAt'];

                            return ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
                              leading: CircleAvatar(
                                radius: 18,
                                backgroundColor: const Color(0xFFEFF6FF),
                                child: Text(
                                  name.isNotEmpty ? name[0].toUpperCase() : 'U',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF2563EB),
                                  ),
                                ),
                              ),
                              title: Text(
                                name,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              subtitle: Text(
                                desig,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    _formatTimestamp(readAt),
                                    style: const TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF2563EB),
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  const Icon(Icons.done_all, size: 14, color: Color(0xFF2563EB)),
                                ],
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // ── WhatsApp-style "Delivered to" Section ──
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                        child: Row(
                          children: [
                            const Icon(Icons.done_all, size: 18, color: Color(0xFF94A3B8)),
                            const SizedBox(width: 8),
                            const Text(
                              'Delivered to',
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '${_deliveredTo.length} ${_deliveredTo.length == 1 ? 'member' : 'members'}',
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),

                      if (_isLoading)
                        const SizedBox.shrink()
                      else if (_deliveredTo.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(18),
                          child: Center(
                            child: Text(
                              'Delivered to cloud server and ready for retrieval',
                              style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                            ),
                          ),
                        )
                      else
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _deliveredTo.length,
                          separatorBuilder: (_, _) => const Divider(
                            height: 1,
                            indent: 64,
                            color: Color(0xFFF1F5F9),
                          ),
                          itemBuilder: (ctx, i) {
                            final item = _deliveredTo[i];
                            final u = item['user'] is Map ? item['user'] as Map<String, dynamic> : null;
                            final name = u != null ? (u['name']?.toString() ?? 'Teammate') : 'Teammate';
                            final deliveredAt = item['deliveredAt'];

                            return ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
                              leading: CircleAvatar(
                                radius: 18,
                                backgroundColor: const Color(0xFFF1F5F9),
                                child: Text(
                                  name.isNotEmpty ? name[0].toUpperCase() : 'U',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ),
                              title: Text(
                                name,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              trailing: Text(
                                _formatTimestamp(deliveredAt),
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
