import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../config/env.dart';
import '../../data/chat_api.dart';
import 'chat_conversation_screen.dart';

enum InboxFilter { all, unread, projects, channels, direct }

/// ─── ULTRA-PREMIUM ENTERPRISE CHAT INBOX (WHATSAPP BUSINESS GRADE) ──────────
/// Clean, high-density conversation list with real unread message tracking,
/// persistent search bar, multi-action creation hub, and dynamic project groups.
class CompanyChatScreen extends ConsumerStatefulWidget {
  const CompanyChatScreen({super.key});

  @override
  ConsumerState<CompanyChatScreen> createState() => _CompanyChatScreenState();
}

class _CompanyChatScreenState extends ConsumerState<CompanyChatScreen> {
  final ChatApi _chatApi = ChatApi();
  final TextEditingController _searchCtrl = TextEditingController();

  List<Map<String, dynamic>> _conversations = [];
  bool _isLoading = true;
  InboxFilter _activeFilter = InboxFilter.all;
  String _searchQuery = '';
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() {
      setState(() => _searchQuery = _searchCtrl.text.toLowerCase().trim());
    });
    _loadConversations();
    _refreshTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (mounted && !_isLoading) {
        _refreshSilently();
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _refreshSilently() async {
    try {
      final items = await _chatApi.getChannels();
      if (mounted) {
        setState(() => _conversations = items);
      }
    } catch (_) {}
  }

  Future<void> _loadConversations() async {
    try {
      final items = await _chatApi.getChannels();
      if (mounted) {
        setState(() {
          _conversations = items;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatTimestamp(dynamic rawDate) {
    if (rawDate == null) return '';
    try {
      final dt = DateTime.parse(rawDate.toString()).toLocal();
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final msgDate = DateTime(dt.year, dt.month, dt.day);

      final diffDays = today.difference(msgDate).inDays;
      if (diffDays == 0) {
        return DateFormat('h:mm a').format(dt).toLowerCase();
      } else if (diffDays == 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return DateFormat('EEEE').format(dt);
      } else {
        return DateFormat('M/d/yy').format(dt);
      }
    } catch (_) {
      return '';
    }
  }

  Future<void> _openConversation(Map<String, dynamic> conversation) async {
    // Immediately clear unread count locally for instant UI feedback
    setState(() {
      final idx = _conversations.indexWhere((c) => c['id'] == conversation['id']);
      if (idx != -1) {
        _conversations[idx]['unreadCount'] = 0;
      }
    });

    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatConversationScreen(conversation: conversation),
      ),
    );

    // Refresh inbox upon returning to display latest snippets and read states
    _loadConversations();
  }

  // ─── MULTI-ACTION CREATION HUB (WHATSAPP/SLACK STYLE '+') ──────────────────
  void _openActionMenu() {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'New Message or Broadcast',
                style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 4),
              const Text(
                'Select an action to communicate across the enterprise workspace.',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 18),

              // 1. Direct Message
              _buildActionTile(
                icon: LucideIcons.messageSquare,
                iconColor: const Color(0xFF2563EB),
                bgColor: const Color(0xFFEFF6FF),
                title: 'Direct Message',
                subtitle: 'Start a private 1:1 chat with any colleague',
                onTap: () {
                  Navigator.pop(ctx);
                  _openDirectColleaguePicker();
                },
              ),
              const SizedBox(height: 10),

              // 2. Broadcast Announcement
              _buildActionTile(
                icon: LucideIcons.megaphone,
                iconColor: const Color(0xFFEA580C),
                bgColor: const Color(0xFFFFF7ED),
                title: 'Broadcast Announcement',
                subtitle: 'Send official executive notices to the workspace',
                onTap: () {
                  Navigator.pop(ctx);
                  _openAnnouncementModal();
                },
              ),
              const SizedBox(height: 10),

              // 3. Create Custom Channel
              _buildActionTile(
                icon: LucideIcons.hash,
                iconColor: const Color(0xFF7C3AED),
                bgColor: const Color(0xFFF3E8FF),
                title: 'Create Team Channel',
                subtitle: 'Set up a custom group for a team, guild, or topic',
                onTap: () {
                  Navigator.pop(ctx);
                  _openCreateChannelModal();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 20, color: iconColor),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
            const Icon(LucideIcons.chevronRight, size: 16, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }

  // ─── MODAL: BROADCAST ANNOUNCEMENT ─────────────────────────────────────────
  void _openAnnouncementModal() {
    final titleCtrl = TextEditingController();
    final msgCtrl = TextEditingController();
    String priority = 'Normal';
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 38,
                      height: 4,
                      decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(10)),
                        child: const Icon(LucideIcons.megaphone, size: 18, color: Color(0xFFEA580C)),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'Broadcast Announcement',
                        style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Text('Title', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                  const SizedBox(height: 6),
                  TextField(
                    controller: titleCtrl,
                    decoration: InputDecoration(
                      hintText: 'e.g. Townhall Meeting Q3 Schedule...',
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text('Priority Bulletin', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                  const SizedBox(height: 6),
                  Row(
                    children: ['Normal', 'Urgent', 'Executive'].map((p) {
                      final isSelected = priority == p;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(p, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isSelected ? Colors.white : const Color(0xFF475569))),
                          selected: isSelected,
                          selectedColor: const Color(0xFFEA580C),
                          onSelected: (val) {
                            if (val) setModalState(() => priority = p);
                          },
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 12),
                  const Text('Announcement Message', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                  const SizedBox(height: 6),
                  TextField(
                    controller: msgCtrl,
                    minLines: 3,
                    maxLines: 5,
                    decoration: InputDecoration(
                      hintText: 'Type your official announcement message...',
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEA580C),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final title = titleCtrl.text.trim();
                              final body = msgCtrl.text.trim();
                              if (title.isEmpty || body.isEmpty) return;

                              setModalState(() => isSubmitting = true);
                              final messenger = ScaffoldMessenger.of(context);
                              try {
                                await _chatApi.createAnnouncement(
                                  title: title,
                                  message: body,
                                  priority: priority,
                                );
                                if (ctx.mounted) Navigator.pop(ctx);
                                _loadConversations();
                                messenger.showSnackBar(
                                  const SnackBar(content: Text('Announcement broadcasted to workspace!'), backgroundColor: Color(0xFF10B981)),
                                );
                              } catch (err) {
                                setModalState(() => isSubmitting = false);
                                messenger.showSnackBar(
                                  SnackBar(content: Text('Failed to broadcast: $err'), backgroundColor: const Color(0xFFEF4444)),
                                );
                              }
                            },
                      child: isSubmitting
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Broadcast Announcement', style: TextStyle(fontWeight: FontWeight.w800)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // ─── MODAL: CREATE CUSTOM CHANNEL ──────────────────────────────────────────
  void _openCreateChannelModal() {
    final nameCtrl = TextEditingController();
    final topicCtrl = TextEditingController();
    bool isPrivate = false;
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 38,
                      height: 4,
                      decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: const Color(0xFFF3E8FF), borderRadius: BorderRadius.circular(10)),
                        child: const Icon(LucideIcons.hash, size: 18, color: Color(0xFF7C3AED)),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'Create Team Channel',
                        style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Text('Channel Name', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                  const SizedBox(height: 6),
                  TextField(
                    controller: nameCtrl,
                    decoration: InputDecoration(
                      prefixText: '# ',
                      prefixStyle: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF7C3AED)),
                      hintText: 'mobile-dev, qa-guild, releases...',
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text('Topic / Purpose', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                  const SizedBox(height: 6),
                  TextField(
                    controller: topicCtrl,
                    decoration: InputDecoration(
                      hintText: 'What is this channel about?',
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Text('Private Channel', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                      const Spacer(),
                      Switch.adaptive(
                        value: isPrivate,
                        activeColor: const Color(0xFF7C3AED),
                        onChanged: (val) => setModalState(() => isPrivate = val),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF7C3AED),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final name = nameCtrl.text.trim();
                              if (name.isEmpty) return;

                              setModalState(() => isSubmitting = true);
                              final messenger = ScaffoldMessenger.of(context);
                              try {
                                await _chatApi.createCustomChannel(
                                  name: name,
                                  topic: topicCtrl.text.trim(),
                                  isPrivate: isPrivate,
                                );
                                if (ctx.mounted) Navigator.pop(ctx);
                                _loadConversations();
                                messenger.showSnackBar(
                                  SnackBar(content: Text('Channel #$name created successfully!'), backgroundColor: const Color(0xFF10B981)),
                                );
                              } catch (err) {
                                setModalState(() => isSubmitting = false);
                                messenger.showSnackBar(
                                  SnackBar(content: Text('Failed to create channel: $err'), backgroundColor: const Color(0xFFEF4444)),
                                );
                              }
                            },
                      child: isSubmitting
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Create Channel', style: TextStyle(fontWeight: FontWeight.w800)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // ─── MODAL: DIRECT COLLEAGUE PICKER ────────────────────────────────────────
  Future<void> _openDirectColleaguePicker() async {
    final colleagues = await _chatApi.getDirectChatUsers();
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        String filter = '';
        return StatefulBuilder(
          builder: (context, setColleagueState) {
            final filteredUsers = colleagues.where((u) {
              final name = (u['name']?.toString() ?? '').toLowerCase();
              final desig = (u['designation']?.toString() ?? '').toLowerCase();
              return name.contains(filter) || desig.contains(filter);
            }).toList();

            return Container(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.80,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 38,
                      height: 4,
                      decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(LucideIcons.userPlus, size: 18, color: Color(0xFF2563EB)),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'Direct Colleague Messaging',
                        style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(LucideIcons.x, size: 18, color: Color(0xFF64748B)),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Colleague in-modal search field
                  Container(
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: TextField(
                      onChanged: (val) => setColleagueState(() => filter = val.toLowerCase().trim()),
                      decoration: const InputDecoration(
                        hintText: 'Search by name or designation...',
                        hintStyle: TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
                        prefixIcon: Icon(LucideIcons.search, size: 15, color: Color(0xFF64748B)),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(vertical: 9),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Divider(height: 1, color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 8),

                  Expanded(
                    child: filteredUsers.isEmpty
                        ? const Center(
                            child: Text('No colleagues found matching search.', style: TextStyle(color: Color(0xFF94A3B8))),
                          )
                        : ListView.separated(
                            itemCount: filteredUsers.length,
                            separatorBuilder: (_, idx) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                            itemBuilder: (ctx, idx) {
                              final u = filteredUsers[idx];
                              final name = u['name']?.toString() ?? 'Colleague';
                              final empId = u['employeeId']?.toString() ?? 'EMP';
                              final designation = u['designation']?.toString() ?? 'Member';
                              final uId = u['_id']?.toString() ?? '';

                              return ListTile(
                                contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                                leading: Stack(
                                  children: [
                                    CircleAvatar(
                                      radius: 20,
                                      backgroundColor: const Color(0xFFEFF6FF),
                                      child: Text(
                                        name.isNotEmpty ? name[0].toUpperCase() : 'U',
                                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                                      ),
                                    ),
                                    Positioned(
                                      right: 0,
                                      bottom: 0,
                                      child: Container(
                                        width: 10,
                                        height: 10,
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF10B981),
                                          shape: BoxShape.circle,
                                          border: Border.all(color: Colors.white, width: 2),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                title: Text(
                                  name,
                                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                ),
                                subtitle: Text(
                                  '$designation • $empId',
                                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                                ),
                                trailing: const Icon(LucideIcons.chevronRight, size: 16, color: Color(0xFF94A3B8)),
                                onTap: () {
                                  Navigator.pop(ctx);
                                  _openConversation({
                                    'id': 'dm_$uId',
                                    'recipientId': uId,
                                    'name': name,
                                    'displayName': name,
                                    'channelType': 'direct',
                                    'topic': '$designation • Direct Message',
                                  });
                                },
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // Filter Conversations based on filter and search
    final filtered = _conversations.where((c) {
      final type = c['channelType']?.toString() ?? '';
      final unread = (c['unreadCount'] as num?)?.toInt() ?? 0;

      // Filter category
      if (_activeFilter == InboxFilter.unread && unread == 0) return false;
      if (_activeFilter == InboxFilter.projects && type != 'project') return false;
      if (_activeFilter == InboxFilter.channels && type != 'company') return false;
      if (_activeFilter == InboxFilter.direct && type != 'direct') return false;

      // Search query filtering
      if (_searchQuery.isNotEmpty) {
        final name = (c['displayName'] ?? c['name'] ?? '').toString().toLowerCase();
        final topic = (c['topic'] ?? '').toString().toLowerCase();
        final lastMsg = (c['lastMessage'] is Map ? c['lastMessage']['message'] : '').toString().toLowerCase();
        return name.contains(_searchQuery) || topic.contains(_searchQuery) || lastMsg.contains(_searchQuery);
      }
      return true;
    }).toList();

    final unreadTotal = _conversations.where((c) => ((c['unreadCount'] as num?)?.toInt() ?? 0) > 0).length;
    final projCount = _conversations.where((c) => c['channelType'] == 'project').length;
    final chanCount = _conversations.where((c) => c['channelType'] == 'company').length;
    final dmCount = _conversations.where((c) => c['channelType'] == 'direct').length;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Chats',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0F172A),
            letterSpacing: -0.4,
          ),
        ),
        actions: [
          // Plus / Creation Hub button
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(LucideIcons.plus, size: 18, color: Color(0xFF2563EB)),
            ),
            tooltip: 'New Message / Action',
            onPressed: _openActionMenu,
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(102),
          child: Column(
            children: [
              // 1. Permanent WhatsApp Business Search Bar
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Container(
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: 'Search chats, projects, colleagues...',
                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                      prefixIcon: const Icon(LucideIcons.search, size: 16, color: Color(0xFF64748B)),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(LucideIcons.x, size: 15, color: Color(0xFF94A3B8)),
                              onPressed: () => _searchCtrl.clear(),
                            )
                          : null,
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
              ),

              // 2. WhatsApp Filter Chips (All, Unread, Projects, Channels, Direct)
              Container(
                height: 46,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  children: [
                    _buildFilterChip('All', InboxFilter.all, 0),
                    const SizedBox(width: 6),
                    if (unreadTotal > 0) ...[
                      _buildFilterChip('Unread', InboxFilter.unread, unreadTotal, isAccent: true),
                      const SizedBox(width: 6),
                    ],
                    _buildFilterChip('Projects', InboxFilter.projects, projCount),
                    const SizedBox(width: 6),
                    _buildFilterChip('Channels', InboxFilter.channels, chanCount),
                    const SizedBox(width: 6),
                    _buildFilterChip('Direct', InboxFilter.direct, dmCount),
                  ],
                ),
              ),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
            ],
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
          : filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: const BoxDecoration(
                          color: Color(0xFFF8FAFC),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(LucideIcons.messagesSquare, size: 36, color: Color(0xFFCBD5E1)),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'No conversations found',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Tap + to start a direct message, channel, or broadcast.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  color: const Color(0xFF2563EB),
                  onRefresh: _loadConversations,
                  child: ListView.separated(
                    itemCount: filtered.length,
                    physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                    separatorBuilder: (_, idx) => const Divider(height: 1, indent: 76, color: Color(0xFFF1F5F9)),
                    itemBuilder: (ctx, idx) {
                      final item = filtered[idx];
                      return _buildWhatsAppConversationTile(item);
                    },
                  ),
                ),
    );
  }

  Widget _buildFilterChip(String label, InboxFilter filter, int count, {bool isAccent = false}) {
    final isSelected = _activeFilter == filter;
    return InkWell(
      onTap: () => setState(() => _activeFilter = filter),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected
              ? (isAccent ? const Color(0xFFDCFCE7) : const Color(0xFFEFF6FF))
              : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? (isAccent ? const Color(0xFF86EFAC) : const Color(0xFFBFDBFE))
                : const Color(0xFFE2E8F0),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected
                    ? (isAccent ? const Color(0xFF16A34A) : const Color(0xFF2563EB))
                    : const Color(0xFF475569),
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (isAccent ? const Color(0xFF16A34A) : const Color(0xFF2563EB))
                      : const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$count',
                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.white),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildWhatsAppConversationTile(Map<String, dynamic> item) {
    final type = item['channelType']?.toString() ?? 'company';
    final isProject = type == 'project';
    final isDirect = type == 'direct';

    final displayName = item['displayName']?.toString() ?? item['name']?.toString() ?? 'Chat';
    final unreadCount = (item['unreadCount'] as num?)?.toInt() ?? 0;
    final timeStr = _formatTimestamp(item['lastMessageAt']);

    // Parse latest message snippet
    String lastMessageSnippet = 'Tap to start conversation';
    String? lastSenderName;
    bool isMe = false;
    bool isMedia = false;

    if (item['lastMessage'] is Map) {
      final lm = item['lastMessage'] as Map<String, dynamic>;
      final mText = lm['message']?.toString() ?? '';
      lastSenderName = lm['senderName']?.toString();
      isMe = lm['isMe'] == true;
      final mType = lm['messageType']?.toString() ?? '';
      isMedia = mType == 'media' || mText.contains('📷 Photo');

      if (mText.isNotEmpty) {
        if (isMe) {
          lastMessageSnippet = mText;
        } else if (lastSenderName != null && lastSenderName.isNotEmpty && !isDirect) {
          lastMessageSnippet = '~$lastSenderName: $mText';
        } else {
          lastMessageSnippet = mText;
        }
      }
    } else if (item['topic'] != null && item['topic'].toString().isNotEmpty) {
      lastMessageSnippet = item['topic'].toString();
    }

    // Default avatars based on channel type
    Widget defaultAvatar;
    if (isProject) {
      final code = item['project'] is Map ? item['project']['code']?.toString() : null;
      defaultAvatar = Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF4F46E5), Color(0xFF6366F1)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF4F46E5).withOpacity(0.18),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(LucideIcons.layers, size: 18, color: Colors.white),
              if (code != null)
                Text(
                  code.length > 5 ? code.substring(0, 5) : code,
                  style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, color: Colors.white),
                ),
            ],
          ),
        ),
      );
    } else if (isDirect) {
      final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';
      defaultAvatar = CircleAvatar(
        radius: 24,
        backgroundColor: const Color(0xFFF3E8FF),
        child: Text(
          initial,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF7C3AED)),
        ),
      );
    } else {
      defaultAvatar = Container(
        width: 48,
        height: 48,
        decoration: const BoxDecoration(
          color: Color(0xFFEFF6FF),
          shape: BoxShape.circle,
        ),
        child: const Center(
          child: Icon(LucideIcons.hash, size: 22, color: Color(0xFF2563EB)),
        ),
      );
    }

    // Avatar configuration (supports custom channel avatar)
    final avatarUrl = item['avatar']?.toString();
    Widget leadingAvatar;
    if (avatarUrl != null && avatarUrl.isNotEmpty) {
      final fullUrl = avatarUrl.startsWith('http') ? avatarUrl : '${Env.apiBaseUrl}$avatarUrl';
      leadingAvatar = Stack(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
            ),
            child: ClipOval(
              child: Image.network(
                fullUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => defaultAvatar,
              ),
            ),
          ),
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: const Color(0xFF10B981),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
            ),
          ),
        ],
      );
    } else if (isDirect) {
      leadingAvatar = Stack(
        children: [
          defaultAvatar,
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: const Color(0xFF10B981),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
            ),
          ),
        ],
      );
    } else {
      leadingAvatar = defaultAvatar;
    }

    return InkWell(
      onTap: () => _openConversation(item),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            leadingAvatar,
            const SizedBox(width: 14),

            // Middle Column: Title & Last Message Snippet
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          displayName,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0F172A),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Timestamp (Right Top)
                      Text(
                        timeStr,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: unreadCount > 0 ? FontWeight.w700 : FontWeight.w500,
                          color: unreadCount > 0 ? const Color(0xFFEF4444) : const Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),

                  Row(
                    children: [
                      // Status checkmark if sent by current user (WhatsApp style)
                      if (isMe) ...[
                        const Icon(Icons.done_all, size: 14, color: Color(0xFF2563EB)),
                        const SizedBox(width: 4),
                      ],
                      if (isMedia) ...[
                        const Icon(LucideIcons.camera, size: 12, color: Color(0xFF64748B)),
                        const SizedBox(width: 3),
                      ],
                      Expanded(
                        child: Text(
                          lastMessageSnippet,
                          style: TextStyle(
                            fontSize: 13,
                            color: unreadCount > 0 ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                            fontWeight: unreadCount > 0 ? FontWeight.w700 : FontWeight.w400,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      // Red circle unread badge (Image 2 style)
                      if (unreadCount > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEF4444),
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFEF4444).withOpacity(0.3),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                          child: Text(
                            '$unreadCount',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
