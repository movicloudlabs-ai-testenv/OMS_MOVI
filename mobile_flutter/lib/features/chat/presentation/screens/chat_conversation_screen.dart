import 'dart:async';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import 'package:go_router/go_router.dart';
import '../../../../config/env.dart';
import '../../../../routing/app_routes.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../data/chat_api.dart';
import '../utils/chat_wallpaper.dart';
import '../widgets/chat_wallpaper_sheet.dart';
import '../widgets/eod_report_bubble.dart';
import '../widgets/mention_autocomplete_overlay.dart';
import '../widgets/message_info_sheet.dart';
import '../widgets/system_log_bubble.dart';
import '../widgets/task_card_bubble.dart';
import 'project_group_info_screen.dart';
import '../../../pmo/presentation/screens/project_dossier_screen.dart';

/// ─── ENTERPRISE CONVERSATION ROOM SCREEN ─────────────────────────────────────
/// Full-screen WhatsApp-style conversation with:
///   • Dynamic per-channel background / wallpaper (10 presets, persisted)
///   • Premium gradient sent-bubbles + white received-bubbles with tail nubs
///   • Date separator pills (Today / Yesterday / formatted date)
///   • +N images overlay chip on multi-attachment messages
///   • Floating emoji reaction pills
///   • Frosted-glass style AppBar + 3-dot popup menu
///   • Animated send / mic button with indigo glow
class ChatConversationScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> conversation;

  const ChatConversationScreen({
    super.key,
    required this.conversation,
  });

  @override
  ConsumerState<ChatConversationScreen> createState() =>
      _ChatConversationScreenState();
}

/// Curated executive color palette for chat participants.
/// Provides consistent, high-contrast, luxury identity across light & dark themes.
class ParticipantPalette {
  final String label;
  final Color primary;
  final Color darkName;
  final List<Color> avatarGradient;
  final Color lightBadgeBg;
  final Color lightBadgeText;
  final Color darkBadgeBg;
  final Color darkBadgeText;

  const ParticipantPalette({
    required this.label,
    required this.primary,
    required this.darkName,
    required this.avatarGradient,
    required this.lightBadgeBg,
    required this.lightBadgeText,
    required this.darkBadgeBg,
    required this.darkBadgeText,
  });

  Color nameColor(bool isDark) => isDark ? darkName : primary;
  Color badgeBg(bool isDark) => isDark ? darkBadgeBg : lightBadgeBg;
  Color badgeText(bool isDark) => isDark ? darkBadgeText : lightBadgeText;
}

const List<ParticipantPalette> _kParticipantPalettes = [
  // 1. Warm Golden Amber / Sunstone (2nd person / Saran in mockup)
  ParticipantPalette(
    label: 'Warm Amber',
    primary: Color(0xFFD97706),
    darkName: Color(0xFFFBBF24),
    avatarGradient: [Color(0xFFF59E0B), Color(0xFFB45309)],
    lightBadgeBg: Color(0xFFFEF3C7),
    lightBadgeText: Color(0xFFB45309),
    darkBadgeBg: Color(0x5978350F),
    darkBadgeText: Color(0xFFFDE68A),
  ),
  // 2. Royal Lavender / Iris (3rd person / Adhi in mockup)
  ParticipantPalette(
    label: 'Royal Violet',
    primary: Color(0xFF7C3AED),
    darkName: Color(0xFFA78BFA),
    avatarGradient: [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
    lightBadgeBg: Color(0xFFEDE9FE),
    lightBadgeText: Color(0xFF6D28D9),
    darkBadgeBg: Color(0x594C1D95),
    darkBadgeText: Color(0xFFDDD6FE),
  ),
  // 3. Emerald Jade / Mint (4th person)
  ParticipantPalette(
    label: 'Emerald Jade',
    primary: Color(0xFF059669),
    darkName: Color(0xFF34D399),
    avatarGradient: [Color(0xFF10B981), Color(0xFF047857)],
    lightBadgeBg: Color(0xFFD1FAE5),
    lightBadgeText: Color(0xFF065F46),
    darkBadgeBg: Color(0x59064E3B),
    darkBadgeText: Color(0xFFA7F3D0),
  ),
  // 4. Crimson Rose / Coral Berry (5th person)
  ParticipantPalette(
    label: 'Crimson Rose',
    primary: Color(0xFFE11D48),
    darkName: Color(0xFFFB7185),
    avatarGradient: [Color(0xFFF43F5E), Color(0xFFBE123C)],
    lightBadgeBg: Color(0xFFFFE4E6),
    lightBadgeText: Color(0xFF9F1239),
    darkBadgeBg: Color(0x59881337),
    darkBadgeText: Color(0xFFFECDD3),
  ),
  // 5. Ocean Azure / Sky Cyan (6th person)
  ParticipantPalette(
    label: 'Ocean Azure',
    primary: Color(0xFF0284C7),
    darkName: Color(0xFF38BDF8),
    avatarGradient: [Color(0xFF0EA5E9), Color(0xFF0369A1)],
    lightBadgeBg: Color(0xFFE0F2FE),
    lightBadgeText: Color(0xFF075985),
    darkBadgeBg: Color(0x590C4A6E),
    darkBadgeText: Color(0xFFBAE6FD),
  ),
  // 6. Sunset Terracotta / Copper (7th person)
  ParticipantPalette(
    label: 'Sunset Terracotta',
    primary: Color(0xFFEA580C),
    darkName: Color(0xFFFB923C),
    avatarGradient: [Color(0xFFF97316), Color(0xFFC2410C)],
    lightBadgeBg: Color(0xFFFFEDD5),
    lightBadgeText: Color(0xFF9A3412),
    darkBadgeBg: Color(0x597C2D12),
    darkBadgeText: Color(0xFFFED7AA),
  ),
  // 7. Nordic Teal (8th person)
  ParticipantPalette(
    label: 'Nordic Teal',
    primary: Color(0xFF0D9488),
    darkName: Color(0xFF2DD4BF),
    avatarGradient: [Color(0xFF14B8A6), Color(0xFF0F766E)],
    lightBadgeBg: Color(0xFFCCFBF1),
    lightBadgeText: Color(0xFF115E59),
    darkBadgeBg: Color(0x59134E4A),
    darkBadgeText: Color(0xFF99F6E4),
  ),
  // 8. Electric Indigo / Plum (9th person)
  ParticipantPalette(
    label: 'Electric Indigo',
    primary: Color(0xFF4F46E5),
    darkName: Color(0xFF818CF8),
    avatarGradient: [Color(0xFF6366F1), Color(0xFF4338CA)],
    lightBadgeBg: Color(0xFFEEF2FF),
    lightBadgeText: Color(0xFF3730A3),
    darkBadgeBg: Color(0x59312E81),
    darkBadgeText: Color(0xFFC7D2FE),
  ),
];

class _ChatConversationScreenState
    extends ConsumerState<ChatConversationScreen> {
  final ChatApi _chatApi = ChatApi();
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  File? _selectedImage;
  Timer? _pollTimer;

  // @Mentions State
  List<Map<String, dynamic>> _channelMembers = [];
  List<Map<String, dynamic>> _channelAliases = [];
  bool _showMentionOverlay = false;
  String _mentionQuery = '';
  int _mentionStartIndex = -1;

  // Quoted Reply State
  Map<String, dynamic>? _replyingToMessage;

  // Wallpaper State
  ChatWallpaper _wallpaper = ChatWallpaper.defaultWhite;

  // ─────────────────────────── Computed getters ───────────────────────────────

  String get _channelId =>
      widget.conversation['id']?.toString() ?? '#general';
  String? get _recipientId =>
      widget.conversation['recipientId']?.toString();
  bool get _isDirect =>
      widget.conversation['channelType'] == 'direct' ||
      _recipientId != null;
  bool get _isProject =>
      widget.conversation['channelType'] == 'project' ||
      widget.conversation['project'] != null;

  String get _displayName =>
      widget.conversation['displayName']?.toString() ??
      widget.conversation['name']?.toString() ??
      _channelId;

  String get _topic =>
      widget.conversation['topic']?.toString() ?? '';

  Map<String, dynamic>? get _projectMeta =>
      widget.conversation['project'] is Map
          ? widget.conversation['project'] as Map<String, dynamic>
          : null;

  String? get _projectId {
    if (_projectMeta != null && _projectMeta!['_id'] != null) {
      return _projectMeta!['_id'].toString();
    }
    if (_channelId.startsWith('prj_')) {
      return _channelId.replaceFirst('prj_', '');
    }
    return null;
  }

  void _openProjectPage() {
    final pId = _projectId;
    if (pId != null && pId.isNotEmpty) {
      HapticFeedback.lightImpact();
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProjectDossierScreen(projectId: pId),
        ),
      );
    } else {
      _openGroupInfo();
    }
  }

  // ─────────────────────────── Lifecycle ──────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _msgController.addListener(_onTextChanged);
    _loadWallpaper();
    _loadConversation();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (mounted && !_isSending) {
        _pollMessagesSilently();
      }
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _msgController.removeListener(_onTextChanged);
    _msgController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  // ─────────────────────────── Wallpaper ──────────────────────────────────────

  Future<void> _loadWallpaper() async {
    final wp = await ChatWallpaperService.get(_channelId);
    if (mounted) setState(() => _wallpaper = wp);
  }

  void _showWallpaperPicker() {
    showChatWallpaperSheet(
      context: context,
      channelId: _channelId,
      current: _wallpaper,
      onChanged: (wp) => setState(() => _wallpaper = wp),
    );
  }

  // ─────────────────────────── Mention logic ───────────────────────────────────

  void _onTextChanged() {
    final text = _msgController.text;
    final selection = _msgController.selection;
    setState(() {});

    if (!selection.isValid || selection.baseOffset < 1) {
      if (_showMentionOverlay) setState(() => _showMentionOverlay = false);
      return;
    }

    final cursor = selection.baseOffset;
    final textBeforeCursor = text.substring(0, cursor);
    final lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt != -1 &&
        (lastAt == 0 ||
            textBeforeCursor[lastAt - 1] == ' ' ||
            textBeforeCursor[lastAt - 1] == '\n')) {
      final query = textBeforeCursor.substring(lastAt + 1);
      if (!query.contains(' ') && query.length < 25) {
        setState(() {
          _showMentionOverlay = true;
          _mentionQuery = query;
          _mentionStartIndex = lastAt;
        });
        return;
      }
    }

    if (_showMentionOverlay) setState(() => _showMentionOverlay = false);
  }

  void _insertMention(String name) {
    final text = _msgController.text;
    if (_mentionStartIndex < 0 || _mentionStartIndex > text.length) return;

    final cursor = _msgController.selection.baseOffset;
    final before = text.substring(0, _mentionStartIndex);
    final after = cursor <= text.length ? text.substring(cursor) : '';
    final replacement = '@$name ';
    final newText = '$before$replacement$after';

    _msgController.text = newText;
    _msgController.selection =
        TextSelection.collapsed(offset: before.length + replacement.length);

    setState(() {
      _showMentionOverlay = false;
      _mentionQuery = '';
      _mentionStartIndex = -1;
    });
  }

  // ─────────────────────────── Data loading ────────────────────────────────────

  Future<void> _loadConversation() async {
    if (!_isDirect) _chatApi.markChannelRead(_channelId);
    await Future.wait([_fetchMessages(), _fetchMembers()]);
  }

  Future<void> _fetchMessages() async {
    try {
      final msgs = await _chatApi.getMessages(
        channel: _isDirect ? null : _channelId,
        recipientId: _recipientId,
      );
      if (mounted) {
        setState(() {
          _messages = msgs;
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _pollMessagesSilently() async {
    try {
      final msgs = await _chatApi.getMessages(
        channel: _isDirect ? null : _channelId,
        recipientId: _recipientId,
      );
      if (mounted && msgs.length != _messages.length) {
        setState(() {
          _messages = msgs;
        });
        _scrollToBottom();
      }
    } catch (_) {}
  }

  Future<void> _fetchMembers() async {
    if (_isDirect) return;
    try {
      final res = await _chatApi.getChannelMembers(_channelId);
      if (mounted) {
        setState(() {
          _channelMembers =
              (res['members'] as List?)?.cast<Map<String, dynamic>>() ?? [];
          _channelAliases =
              (res['aliases'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        });
      }
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOutQuad,
        );
      }
    });
  }

  // ─────────────────────────── Image picking ───────────────────────────────────

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );
      if (picked != null && mounted) {
        setState(() => _selectedImage = File(picked.path));
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not access image: $e')),
      );
    }
  }

  // ─────────────────────────── Send message ────────────────────────────────────

  Future<void> _sendMessage() async {
    final text = _msgController.text.trim();
    final hasImage = _selectedImage != null;

    if ((text.isEmpty && !hasImage) || _isSending) return;

    setState(() => _isSending = true);
    final replyId = _replyingToMessage?['_id']?.toString();
    final imageToSend = _selectedImage;
    _msgController.clear();
    setState(() {
      _replyingToMessage = null;
      _selectedImage = null;
    });
    HapticFeedback.lightImpact();

    try {
      List<Map<String, dynamic>>? attachments;
      String messageType = 'text';

      if (imageToSend != null) {
        final uploadRes = await _chatApi.uploadAttachment(imageToSend);
        if (uploadRes != null) {
          attachments = [uploadRes];
          messageType = 'media';
        }
      }

      final newMsg = await _chatApi.sendMessage(
        channel: _isDirect ? null : _channelId,
        recipientId: _recipientId,
        message: text.isNotEmpty ? text : (hasImage ? '📷 Photo' : ''),
        messageType: messageType,
        replyToId: replyId,
        attachments: attachments,
      );

      if (mounted) {
        if (newMsg != null) {
          setState(() => _messages.add(newMsg));
          _scrollToBottom();
        } else {
          _fetchMessages();
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to send: $e'),
          backgroundColor: const Color(0xFFEF4444),
        ),
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  // ─────────────────────────── Group info ──────────────────────────────────────

  void _openGroupInfo() async {
    HapticFeedback.lightImpact();
    final mentionResult = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProjectGroupInfoScreen(
          conversation: widget.conversation,
          initialMembers: _channelMembers,
        ),
      ),
    );
    if (mentionResult is String && mounted) {
      _msgController.text = '${_msgController.text}$mentionResult';
      _msgController.selection =
          TextSelection.collapsed(offset: _msgController.text.length);
    }
  }

  // ─────────────────────────── PMO Task ────────────────────────────────────────

  void _showTurnIntoTaskModal(Map<String, dynamic> message) {
    final projectId =
        _projectMeta != null ? _projectMeta!['_id']?.toString() : null;

    if (projectId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Tasks can only be created from Project channels.'),
          backgroundColor: Color(0xFFF59E0B),
        ),
      );
      return;
    }

    final originalText = message['message']?.toString() ?? '';
    final titleCtrl = TextEditingController(
        text: originalText.length > 50
            ? '${originalText.substring(0, 47)}...'
            : originalText);
    String selectedPriority = 'Medium';
    bool isCreating = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.fromLTRB(
                  20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 24),
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
                          borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(12)),
                        child: const Icon(LucideIcons.checkSquare,
                            size: 18, color: Color(0xFF2563EB)),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Text(
                          'Convert Message to PMO Task',
                          style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text('Task Title',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF475569))),
                  const SizedBox(height: 6),
                  TextField(
                    controller: titleCtrl,
                    decoration: InputDecoration(
                      hintText: 'Enter task summary...',
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide:
                            const BorderSide(color: Color(0xFFCBD5E1)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide:
                            const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 11),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text('Priority',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF475569))),
                  const SizedBox(height: 8),
                  Row(
                    children:
                        ['Low', 'Medium', 'High', 'Critical'].map((p) {
                      final isSelected = selectedPriority == p;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(p,
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected
                                      ? Colors.white
                                      : const Color(0xFF475569))),
                          selected: isSelected,
                          selectedColor: const Color(0xFF0F172A),
                          onSelected: (val) {
                            if (val) {
                              setModalState(() => selectedPriority = p);
                            }
                          },
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                        elevation: 0,
                      ),
                      onPressed: isCreating
                          ? null
                          : () async {
                              setModalState(() => isCreating = true);
                              final sm = ScaffoldMessenger.of(context);
                              try {
                                await _chatApi.createTaskFromMessage(
                                  messageId:
                                      message['_id']?.toString() ?? '',
                                  projectId: projectId,
                                  title: titleCtrl.text.trim(),
                                  priority: selectedPriority,
                                );
                                if (ctx.mounted) Navigator.pop(ctx);
                                _fetchMessages();
                                sm.showSnackBar(const SnackBar(
                                  content: Text('PMO Task created!'),
                                  backgroundColor: Color(0xFF10B981),
                                ));
                              } catch (err) {
                                setModalState(() => isCreating = false);
                                sm.showSnackBar(SnackBar(
                                  content: Text('Failed: $err'),
                                  backgroundColor:
                                      const Color(0xFFEF4444),
                                ));
                              }
                            },
                      child: isCreating
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Create Task',
                              style:
                                  TextStyle(fontWeight: FontWeight.w800)),
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

  // ─────────────────────────── Message actions ─────────────────────────────────

  void _showMessageActionSheet(Map<String, dynamic> msg) {
    final body = msg['message']?.toString() ?? '';
    final senderName =
        (msg['sender'] is Map ? msg['sender']['name']?.toString() : null) ??
            'Colleague';
    final myId = ref.read(authProvider).user?.id;
    final senderId = msg['sender'] is Map
        ? msg['sender']['_id']?.toString()
        : msg['sender']?.toString();
    final isMe = myId != null && senderId == myId;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Handle
                Padding(
                  padding: const EdgeInsets.only(top: 12, bottom: 4),
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      isMe ? 'Your Message' : 'Message by $senderName',
                      style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF64748B)),
                    ),
                  ),
                ),

                // Emoji reaction row
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: ['👍', '❤️', '🚀', '👀', '💯', '🔥'].map((e) {
                      return GestureDetector(
                        onTap: () {
                          Navigator.pop(ctx);
                          _addReaction(msg, e);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 120),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Text(e,
                              style: const TextStyle(fontSize: 22)),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),

                // Actions
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(8)),
                    child: const Icon(LucideIcons.info,
                        size: 16, color: Color(0xFF2563EB)),
                  ),
                  title: const Text('Message Info',
                      style: TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w700)),
                  subtitle: const Text('See read & delivery status',
                      style: TextStyle(
                          fontSize: 11, color: Color(0xFF64748B))),
                  onTap: () {
                    Navigator.pop(ctx);
                    MessageInfoSheet.show(context, msg);
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8)),
                    child: const Icon(LucideIcons.reply,
                        size: 16, color: Color(0xFF0F172A)),
                  ),
                  title: const Text('Reply (Quote)',
                      style: TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w700)),
                  onTap: () {
                    Navigator.pop(ctx);
                    setState(() => _replyingToMessage = msg);
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8)),
                    child: const Icon(LucideIcons.copy,
                        size: 16, color: Color(0xFF475569)),
                  ),
                  title: const Text('Copy Message',
                      style: TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w700)),
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: body));
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Copied to clipboard'),
                          duration: Duration(seconds: 1)),
                    );
                  },
                ),
                if (_isProject)
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(8)),
                      child: const Icon(LucideIcons.checkSquare,
                          size: 16, color: Color(0xFF10B981)),
                    ),
                    title: const Text('Convert to PMO Task',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF10B981))),
                    subtitle: const Text('Create actionable ticket',
                        style: TextStyle(
                            fontSize: 11, color: Color(0xFF64748B))),
                    onTap: () {
                      Navigator.pop(ctx);
                      _showTurnIntoTaskModal(msg);
                    },
                  ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        );
      },
    );
  }

  // ─────────────────────────── Attachment picker ───────────────────────────────

  void _showAttachmentPickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(2)),
                  ),
                  const SizedBox(height: 18),
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Share Content',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A))),
                  ),
                  const SizedBox(height: 22),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildAttachmentAction(
                        icon: LucideIcons.camera,
                        label: 'Camera',
                        color: const Color(0xFFE11D48),
                        bgColor: const Color(0xFFFFE4E6),
                        onTap: () {
                          Navigator.pop(ctx);
                          _pickImage(ImageSource.camera);
                        },
                      ),
                      _buildAttachmentAction(
                        icon: LucideIcons.image,
                        label: 'Gallery',
                        color: const Color(0xFF8B5CF6),
                        bgColor: const Color(0xFFF3E8FF),
                        onTap: () {
                          Navigator.pop(ctx);
                          _pickImage(ImageSource.gallery);
                        },
                      ),
                      _buildAttachmentAction(
                        icon: LucideIcons.fileText,
                        label: 'Document',
                        color: const Color(0xFF2563EB),
                        bgColor: const Color(0xFFEFF6FF),
                        onTap: () {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text(
                                    'Document attachment (PDF, DOCX, XLSX)')),
                          );
                        },
                      ),
                      if (_isProject)
                        _buildAttachmentAction(
                          icon: LucideIcons.checkSquare,
                          label: 'PMO Task',
                          color: const Color(0xFF10B981),
                          bgColor: const Color(0xFFDCFCE7),
                          onTap: () {
                            Navigator.pop(ctx);
                            _showTurnIntoTaskModal(
                                {'message': 'Quick Task from Chat'});
                          },
                        ),
                      _buildAttachmentAction(
                        icon: LucideIcons.fileSpreadsheet,
                        label: 'EOD Report',
                        color: const Color(0xFF059669),
                        bgColor: const Color(0xFFECFDF5),
                        onTap: () {
                          Navigator.pop(ctx);
                          context.push(AppRoutes.eod);
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildAttachmentAction({
    required IconData icon,
    required String label,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(color: bgColor, shape: BoxShape.circle),
            child: Center(child: Icon(icon, color: color, size: 24)),
          ),
          const SizedBox(height: 8),
          Text(label,
              style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF334155))),
        ],
      ),
    );
  }

  // ─────────────────────────── Fullscreen image ────────────────────────────────

  void _openFullscreenImage(String fullUrl) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: EdgeInsets.zero,
        child: Stack(
          children: [
            Center(
              child: InteractiveViewer(
                child: Image.network(
                  fullUrl,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Center(
                    child: Text('Failed to load image',
                        style: TextStyle(color: Colors.white)),
                  ),
                ),
              ),
            ),
            Positioned(
              top: 48,
              right: 16,
              child: IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(7),
                  decoration: const BoxDecoration(
                      color: Colors.black54, shape: BoxShape.circle),
                  child: const Icon(LucideIcons.x,
                      color: Colors.white, size: 18),
                ),
                onPressed: () => Navigator.pop(ctx),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────── Reactions ───────────────────────────────────────

  void _addReaction(Map<String, dynamic> msg, String emoji) {
    HapticFeedback.lightImpact();
    setState(() {
      final reactions =
          (msg['reactions'] as List?)
                  ?.map((r) => Map<String, dynamic>.from(r as Map))
                  .toList() ??
              [];
      final myId = ref.read(authProvider).user?.id;
      final existingIndex = reactions.indexWhere((r) {
        final uId =
            (r['user'] is Map ? r['user']['_id'] : r['user'])?.toString();
        return uId == myId && r['emoji'] == emoji;
      });

      if (existingIndex >= 0) {
        reactions.removeAt(existingIndex);
      } else {
        reactions.add({'user': myId, 'emoji': emoji});
      }
      msg['reactions'] = reactions;
    });
  }

  // ─────────────────────────── Participant Palettes ───────────────────────────

  ParticipantPalette _getParticipantPalette(
      String? senderId, String senderName, String? myId) {
    int index = -1;
    if (_channelMembers.isNotEmpty) {
      final nonMe = _channelMembers.where((m) {
        final id = m['_id']?.toString() ?? m['id']?.toString();
        return id != null && id != myId;
      }).toList();

      index = nonMe.indexWhere((m) {
        final id = m['_id']?.toString() ?? m['id']?.toString();
        final name = m['name']?.toString();
        return (senderId != null && id == senderId) ||
            (name != null && name.toLowerCase() == senderName.toLowerCase());
      });
    }

    if (index < 0) {
      final key = (senderId != null && senderId.isNotEmpty) ? senderId : senderName;
      index = key.hashCode.abs();
    }

    return _kParticipantPalettes[index % _kParticipantPalettes.length];
  }

  /// Parses `createdAt` string to local DateTime; returns null on failure.
  DateTime? _parseTime(Map<String, dynamic> msg) {
    try {
      final raw = msg['createdAt']?.toString();
      if (raw == null) return null;
      return DateTime.parse(raw).toLocal();
    } catch (_) {
      return null;
    }
  }

  String _formatTime(DateTime dt) =>
      DateFormat('h:mm a').format(dt).toLowerCase();


  String _dateLabel(DateTime dt) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(dt.year, dt.month, dt.day);
    if (day == today) return 'Today';
    if (day == today.subtract(const Duration(days: 1))) return 'Yesterday';
    return DateFormat('d MMM yyyy').format(dt);
  }

  // ─────────────────────────── BUILD ───────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final myId = authState.user?.id;
    final isDark = _wallpaper.isDark;

    return Scaffold(
      backgroundColor: Colors.transparent,
      resizeToAvoidBottomInset: false,
      body: Stack(
        children: [
          // ── Wallpaper layer ──
          Positioned.fill(child: buildWallpaperBackground(_wallpaper)),

          // ── AppBar + topic + message list ──
          SafeArea(
            child: Column(
              children: [
                _buildAppBar(),
                if (_topic.isNotEmpty) _buildTopicBanner(),
                Expanded(
                  child: _isLoading
                      ? Center(
                          child: CircularProgressIndicator(
                              color: isDark
                                  ? Colors.white
                                  : const Color(0xFF0F172A)))
                      : _messages.isEmpty
                          ? _buildEmptyState()
                          : _buildMessageList(myId, composerInset: 80),
                ),
              ],
            ),
          ),

          // ── Floating overlays ──
          if (_showMentionOverlay)
            Positioned(
              left: 0, right: 0,
              bottom: MediaQuery.of(context).viewInsets.bottom + 90,
              child: MentionAutocompleteOverlay(
                query: _mentionQuery,
                members: _channelMembers,
                aliases: _channelAliases,
                onSelectMention: _insertMention,
              ),
            ),
          if (_replyingToMessage != null)
            Positioned(
              left: 0, right: 0,
              bottom: MediaQuery.of(context).viewInsets.bottom + 72,
              child: _buildQuotedReplyBar(),
            ),
          if (_selectedImage != null)
            Positioned(
              left: 0, right: 0,
              bottom: MediaQuery.of(context).viewInsets.bottom + 72,
              child: _buildImagePreviewTray(),
            ),

          // ── Floating composer ──
          Positioned(
            left: 10,
            right: 10,
            bottom: MediaQuery.of(context).viewInsets.bottom > 0
                ? MediaQuery.of(context).viewInsets.bottom + 4
                : MediaQuery.of(context).padding.bottom + 8,
            child: _buildMessageComposerBar(),
          ),
        ],
      ),
    );
  }

  // ─────────────────────────── AppBar ──────────────────────────────────────────

  Widget _buildAppBar() {
    final isDark = _wallpaper.isDark;
    return Container(
      height: 62,
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF14100E).withOpacity(0.92)
            : Colors.white.withOpacity(0.95),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.35 : 0.06),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Row(
          children: [
            // Back button
            IconButton(
              icon: Icon(Icons.arrow_back_ios_new_rounded,
                  size: 18, color: isDark ? Colors.white : const Color(0xFF0F172A)),
              onPressed: () => Navigator.pop(context),
            ),

            // Clickable title area (WhatsApp/Telegram style → open group info)
            Expanded(
              child: InkWell(
                onTap: _openGroupInfo,
                borderRadius: BorderRadius.circular(10),
                child: Row(
                  children: [
                    _buildAppBarAvatar(),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _displayName,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF0F172A),
                              letterSpacing: -0.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 1),
                          Row(
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF10B981),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  _isDirect
                                      ? 'Direct Message • Active'
                                      : (_isProject
                                          ? 'Project Team • ${_channelMembers.length} members'
                                          : 'Live Channel'),
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ⋮ three-dot popup menu
            PopupMenuButton<String>(
              icon: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF241C18) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isDark ? Colors.white.withOpacity(0.12) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Icon(Icons.more_vert_rounded,
                    size: 18, color: isDark ? Colors.white : const Color(0xFF475569)),
              ),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
              elevation: 4,
              color: isDark ? const Color(0xFF1F1815) : Colors.white,
              offset: const Offset(0, 40),
              onSelected: (value) {
                switch (value) {
                  case 'wallpaper':
                    _showWallpaperPicker();
                    break;
                  case 'group_info':
                    _openGroupInfo();
                    break;
                  case 'search':
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Search coming soon'),
                          duration: Duration(seconds: 1)),
                    );
                    break;
                  case 'mute':
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Notifications muted'),
                          duration: Duration(seconds: 1)),
                    );
                    break;
                }
              },
              itemBuilder: (_) => [
                _popupItem('wallpaper', Icons.wallpaper_rounded,
                    'Change Wallpaper', const Color(0xFF0F172A), isDark),
                _popupItem('group_info', LucideIcons.info,
                    'Group Info & Roster', const Color(0xFF0284C7), isDark),
                _popupItem('search', LucideIcons.search,
                    'Search in Chat', const Color(0xFF64748B), isDark),
                _popupItem('mute', LucideIcons.bellOff,
                    'Mute Notifications', const Color(0xFF64748B), isDark),
              ],
            ),
            const SizedBox(width: 4),
          ],
        ),
      ),
    );
  }

  PopupMenuItem<String> _popupItem(
      String value, IconData icon, String label, Color color, bool isDark) {
    return PopupMenuItem<String>(
      value: value,
      child: Row(
        children: [
          Icon(icon, size: 16, color: isDark ? const Color(0xFFCBD5E1) : color),
          const SizedBox(width: 10),
          Text(label,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A))),
        ],
      ),
    );
  }

  Widget _buildAppBarAvatar() {
    final avatar = widget.conversation['avatar']?.toString();
    if (avatar != null && avatar.isNotEmpty) {
      final fullUrl = avatar.startsWith('http')
          ? avatar
          : '${Env.apiBaseUrl}$avatar';
      return Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
              color: Colors.white.withOpacity(0.2), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.12),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipOval(
          child: Image.network(
            fullUrl,
            width: 40,
            height: 40,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => _buildDefaultAvatar(),
          ),
        ),
      );
    }
    return _buildDefaultAvatar();
  }

  Widget _buildDefaultAvatar() {
    final isDark = _wallpaper.isDark;
    if (_isProject) {
      return Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF28201B) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? Colors.white.withOpacity(0.12) : const Color(0xFFE2E8F0),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.25 : 0.05),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Center(
          child: Icon(
            LucideIcons.layers,
            size: 20,
            color: isDark ? Colors.white : const Color(0xFF1E293B),
          ),
        ),
      );
    }

    final Color bg = _isDirect ? const Color(0xFF8B5CF6) : const Color(0xFF0284C7);
    final initial = _displayName.isNotEmpty
        ? _displayName[0].toUpperCase()
        : '#';

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [bg, bg.withOpacity(0.75)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: bg.withOpacity(0.28),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: Colors.white),
        ),
      ),
    );
  }

  // ─────────────────────────── Topic banner ────────────────────────────────────

  Widget _buildTopicBanner() {
    final isDark = _wallpaper.isDark;
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF221C18).withOpacity(0.88)
            : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? Colors.white.withOpacity(0.10)
              : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.25 : 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _openProjectPage,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withOpacity(0.08)
                        : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: Icon(
                    _isProject
                        ? LucideIcons.building2
                        : LucideIcons.hash,
                    size: 14,
                    color: isDark ? const Color(0xFFFBBF24) : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Text(
                    _topic,
                    style: TextStyle(
                      fontSize: 12.0,
                      fontWeight: FontWeight.w600,
                      color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 16,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF94A3B8),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─────────────────────────── Empty state ─────────────────────────────────────

  Widget _buildEmptyState() {
    final isDark = _wallpaper.isDark;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F172A).withOpacity(0.28),
                    blurRadius: 20,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Center(
                child: Icon(
                  _isProject
                      ? LucideIcons.layers
                      : LucideIcons.messageCircle,
                  size: 36,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Welcome to $_displayName',
              style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF0F172A)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              _isProject
                  ? 'All assigned team members are synced.\nSend messages, photos or @mention colleagues.'
                  : 'No messages yet. Be the first to say something!',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 13,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  height: 1.5),
            ),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────── Message list ────────────────────────────────────

  Widget _buildMessageList(String? myId, {double composerInset = 0}) {
    // Build a list of items: date separators + message entries
    final items = <_ChatListItem>[];

    DateTime? prevDay;
    for (int i = 0; i < _messages.length; i++) {
      final msg = _messages[i];
      final dt = _parseTime(msg);
      if (dt != null) {
        final day = DateTime(dt.year, dt.month, dt.day);
        if (prevDay == null || day != prevDay) {
          items.add(_ChatListItem.separator(_dateLabel(dt)));
          prevDay = day;
        }
      }
      items.add(_ChatListItem.message(i));
    }

    return ListView.builder(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics()),
      padding: EdgeInsets.fromLTRB(12, 12, 12, composerInset + 16),
      itemCount: items.length,
      itemBuilder: (ctx, i) {
        final item = items[i];
        if (item.isSeparator) return _buildDateSeparator(item.label!);

        final msg = _messages[item.messageIndex!];
        final sender = msg['sender'] is Map
            ? msg['sender'] as Map<String, dynamic>
            : null;
        final senderId = sender != null
            ? sender['_id']?.toString()
            : msg['sender']?.toString();
        final isMe = myId != null && senderId == myId;
        final senderName =
            (sender != null ? sender['name']?.toString() : null) ??
                (isMe ? 'You' : 'Colleague');
        final role = sender != null && sender['role'] is Map
            ? sender['role'] as Map<String, dynamic>
            : null;
        final roleName = role != null ? role['name']?.toString() : null;
        final body = msg['message']?.toString() ?? '';
        final messageType = msg['messageType']?.toString() ?? 'text';
        final attachments =
            (msg['attachments'] as List?)?.cast<Map<String, dynamic>>() ??
                [];
        final dt = _parseTime(msg);
        final timeStr = dt != null ? _formatTime(dt) : '';

        if (messageType == 'system') {
          return SystemLogBubble(message: body, timeStr: timeStr);
        }

        if (messageType == 'eod_report' ||
            body.startsWith('📋 *EOD Report') ||
            body.startsWith('📋 *END-OF-DAY')) {
          final eodRef = msg['eodRef'] is Map
              ? Map<String, dynamic>.from(msg['eodRef'] as Map)
              : null;
          return EodReportBubble(
            isMe: isMe,
            senderName: senderName,
            roleName: roleName,
            message: body,
            eodRef: eodRef,
            timeStr: timeStr,
          );
        }

        if (messageType == 'task_card' && msg['taskRef'] is Map) {
          return TaskCardBubble(
            isMe: isMe,
            senderName: senderName,
            roleName: roleName,
            message: body,
            taskRef: Map<String, dynamic>.from(msg['taskRef'] as Map),
            timeStr: timeStr,
            onOpenTask: _isProject ? _openGroupInfo : null,
          );
        }

        // Determine whether this message starts a new sender cluster
        bool isFirstInGroup = true;
        final currentMsgIndex = item.messageIndex!;
        if (currentMsgIndex > 0) {
          final prevMsg = _messages[currentMsgIndex - 1];
          final prevSender = prevMsg['sender'] is Map
              ? prevMsg['sender'] as Map<String, dynamic>
              : null;
          final prevSenderId = prevSender != null
              ? prevSender['_id']?.toString()
              : prevMsg['sender']?.toString();
          if (prevSenderId == senderId &&
              (prevMsg['messageType'] ?? 'text') == 'text') {
            isFirstInGroup = false;
          }
        }

        return GestureDetector(
          onLongPress: () => _showMessageActionSheet(msg),
          child: _buildChatBubble(
            msg: msg,
            isMe: isMe,
            senderId: senderId,
            myId: myId,
            senderName: senderName,
            roleName: roleName,
            message: body,
            timeStr: timeStr,
            attachments: attachments,
            isFirstInGroup: isFirstInGroup,
          ),
        );
      },
    );
  }

  // ─────────────────────────── Date separator ──────────────────────────────────

  Widget _buildDateSeparator(String label) {
    final isDark = _wallpaper.isDark;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Center(
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
          decoration: BoxDecoration(
            color: isDark
                ? const Color(0xFF241D19).withOpacity(0.85)
                : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDark
                  ? Colors.white.withOpacity(0.10)
                  : const Color(0xFFE2E8F0),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(isDark ? 0.25 : 0.04),
                blurRadius: 6,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF64748B),
              letterSpacing: 0.2,
            ),
          ),
        ),
      ),
    );
  }

  // ─────────────────────────── Chat bubble ─────────────────────────────────────

  Widget _buildChatBubble({
    required Map<String, dynamic> msg,
    required bool isMe,
    required String? senderId,
    required String? myId,
    required String senderName,
    required String? roleName,
    required String message,
    required String timeStr,
    required List<Map<String, dynamic>> attachments,
    bool isFirstInGroup = true,
  }) {
    final palette = _getParticipantPalette(senderId, senderName, myId);
    final isDark = _wallpaper.isDark;
    final replyTo = msg['replyTo'];
    final maxWidth = MediaQuery.of(context).size.width * 0.76;

    return Padding(
      padding: EdgeInsets.only(
        top: isFirstInGroup ? 4 : 1.5,
        bottom: 1.5,
      ),
      child: Row(
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Received avatar — 33px circle, top-anchored (or spacer if clustered)
          if (!isMe) ...[
            if (isFirstInGroup)
              Container(
                width: 33,
                height: 33,
                margin: const EdgeInsets.only(top: 2),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: palette.avatarGradient,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isDark ? Colors.white.withOpacity(0.20) : Colors.white,
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: palette.primary.withOpacity(0.28),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    _getInitials(senderName),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ),
              )
            else
              const SizedBox(width: 33),
            const SizedBox(width: 8),
          ],

          // Bubble + Reactions Column
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  constraints: BoxConstraints(maxWidth: maxWidth),
                  decoration: BoxDecoration(
                    gradient: isMe
                        ? LinearGradient(
                            colors: isDark
                                ? const [Color(0xFF2C2420), Color(0xFF1C1715)]
                                : const [Color(0xFF1E293B), Color(0xFF0F172A)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          )
                        : LinearGradient(
                            colors: isDark
                                ? [
                                    Color.alphaBlend(
                                        palette.primary.withOpacity(0.06),
                                        const Color(0xFF231E1B)),
                                    Color.alphaBlend(
                                        palette.primary.withOpacity(0.03),
                                        const Color(0xFF1A1614)),
                                  ]
                                : [
                                    Colors.white,
                                    Color.alphaBlend(
                                        palette.primary.withOpacity(0.035),
                                        Colors.white),
                                  ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(18),
                      topRight: const Radius.circular(18),
                      bottomLeft: Radius.circular(
                          isMe ? 18 : (isFirstInGroup ? 4 : 14)),
                      bottomRight: Radius.circular(
                          isMe ? (isFirstInGroup ? 4 : 14) : 18),
                    ),
                    border: isMe
                        ? Border.all(
                            color: isDark
                                ? Colors.white.withOpacity(0.12)
                                : const Color(0xFF334155).withOpacity(0.35),
                            width: 1,
                          )
                        : Border.all(
                            color: palette.primary.withOpacity(isDark ? 0.25 : 0.20),
                            width: 1,
                          ),
                    boxShadow: [
                      BoxShadow(
                        color: isMe
                            ? (isDark
                                ? Colors.black.withOpacity(0.35)
                                : const Color(0xFF0F172A).withOpacity(0.18))
                            : palette.primary.withOpacity(isDark ? 0.12 : 0.08),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                      if (!isMe && !isDark)
                        BoxShadow(
                          color: Colors.black.withOpacity(0.03),
                          blurRadius: 3,
                          offset: const Offset(0, 1),
                        ),
                    ],
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 13,
                    vertical: 9,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Sender name + role badge (received only, first in cluster)
                      if (!isMe && isFirstInGroup)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                senderName,
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w800,
                                  color: palette.nameColor(isDark),
                                  letterSpacing: -0.1,
                                ),
                              ),
                              if (roleName != null) ...[
                                const SizedBox(width: 5),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 5.5, vertical: 1.5),
                                  decoration: BoxDecoration(
                                    color: palette.badgeBg(isDark),
                                    borderRadius: BorderRadius.circular(4.5),
                                  ),
                                  child: Text(
                                    roleName,
                                    style: TextStyle(
                                      fontSize: 8.5,
                                      fontWeight: FontWeight.w700,
                                      color: palette.badgeText(isDark),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),

                      // Quoted reply block
                      if (replyTo is Map) ...[
                        _buildQuoteBlock(
                            replyTo as Map<String, dynamic>, isMe, isDark, palette),
                        const SizedBox(height: 6),
                      ],

                      // Image attachments
                      if (attachments.isNotEmpty) ...[
                        _buildAttachmentGrid(attachments, isDark),
                        if (message.isNotEmpty && message != '📷 Photo')
                          const SizedBox(height: 6),
                      ],

                      // Message text with integrated timestamp (hugs content dynamically)
                      if (message.isNotEmpty && message != '📷 Photo')
                        _buildMessageContent(
                          message: message,
                          isMe: isMe,
                          timeStr: timeStr,
                          msg: msg,
                          isDark: isDark,
                          palette: palette,
                        )
                      else if (attachments.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Text(
                                timeStr,
                                style: TextStyle(
                                  fontSize: 8.5,
                                  letterSpacing: -0.2,
                                  color: isMe
                                      ? Colors.white.withOpacity(0.60)
                                      : const Color(0xFF94A3B8),
                                  fontWeight: FontWeight.w400,
                                ),
                              ),
                              if (isMe) ...[
                                const SizedBox(width: 2.5),
                                _buildStatusTicks(msg),
                              ],
                            ],
                          ),
                        ),
                    ],
                  ),
                ),

                // Reaction pills below bubble
                _buildReactionsRow(msg, isMe, isDark),
              ],
            ),
          ),
        ],
      ),
    );
  }


  // ─────────────────────────── Quote block ─────────────────────────────────────

  Widget _buildQuoteBlock(Map<String, dynamic> replyTo, bool isMe, bool isDark, ParticipantPalette palette) {
    final text = replyTo['message']?.toString() ?? '';
    final sName = replyTo['sender'] is Map
        ? replyTo['sender']['name']?.toString() ?? 'Colleague'
        : 'Colleague';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: isMe
            ? Colors.white.withOpacity(0.15)
            : (isDark ? Colors.white.withOpacity(0.07) : const Color(0xFFF1F5F9)),
        borderRadius: BorderRadius.circular(10),
        border: Border(
          left: BorderSide(
            color: isMe ? Colors.white : palette.primary,
            width: 3,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            sName,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              color: isMe ? Colors.white : palette.nameColor(isDark),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            text,
            style: TextStyle(
              fontSize: 11,
              color: isMe
                  ? Colors.white.withOpacity(0.8)
                  : (isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569)),
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ─────────────────────────── Attachment grid ─────────────────────────────────

  Widget _buildAttachmentGrid(List<Map<String, dynamic>> attachments, bool isDark) {
    if (attachments.isEmpty) return const SizedBox.shrink();

    final firstAtt = attachments.first;
    final rawUrl = firstAtt['url']?.toString() ?? '';
    final firstUrl = rawUrl.startsWith('http')
        ? rawUrl
        : '${Env.apiBaseUrl}$rawUrl';
    final extra = attachments.length - 1;

    return GestureDetector(
      onTap: () => _openFullscreenImage(firstUrl),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Stack(
          children: [
            Image.network(
              firstUrl,
              width: double.infinity,
              height: 180,
              fit: BoxFit.cover,
              loadingBuilder: (ctx, child, progress) {
                if (progress == null) return child;
                return Container(
                  height: 180,
                  color: isDark ? const Color(0xFF28201B) : const Color(0xFFF1F5F9),
                  child: Center(
                    child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: isDark ? Colors.white : const Color(0xFF0F172A)),
                  ),
                );
              },
              errorBuilder: (_, _, _) => Container(
                height: 120,
                color: isDark ? const Color(0xFF28201B) : const Color(0xFFF1F5F9),
                child: const Center(
                  child: Icon(LucideIcons.imageOff,
                      size: 32, color: Color(0xFFCBD5E1)),
                ),
              ),
            ),
            if (extra > 0)
              Positioned(
                bottom: 8,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.65),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: Colors.white.withOpacity(0.18),
                        width: 0.8,
                      ),
                    ),
                    child: Text(
                      '+$extra ${extra == 1 ? 'image' : 'images'}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────── Message content & Initials ──────────────────────

  String _getInitials(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return 'U';
    final parts = trimmed.split(RegExp(r'\s+'));
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return trimmed.length >= 2
        ? trimmed.substring(0, 2).toUpperCase()
        : trimmed[0].toUpperCase();
  }

  Widget _buildMessageContent({
    required String message,
    required bool isMe,
    required String timeStr,
    required Map<String, dynamic> msg,
    required bool isDark,
    required ParticipantPalette palette,
  }) {
    final tokens = message.split(' ');
    final spans = <InlineSpan>[];
    for (int i = 0; i < tokens.length; i++) {
      final token = tokens[i];
      if (token.startsWith('@') && token.length > 1) {
        spans.add(
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 1),
              padding:
                  const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: isMe
                    ? Colors.white.withOpacity(0.22)
                    : (isDark
                        ? palette.primary.withOpacity(0.20)
                        : palette.primary.withOpacity(0.12)),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                token,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: isMe
                      ? Colors.white
                      : (isDark ? palette.darkName : palette.primary),
                ),
              ),
            ),
          ),
        );
      } else {
        spans.add(
          TextSpan(
            text: token,
            style: TextStyle(
              fontSize: 14.0,
              color: isMe
                  ? Colors.white
                  : (isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A)),
              height: 1.35,
            ),
          ),
        );
      }
      if (i < tokens.length - 1) {
        spans.add(
          TextSpan(
            text: ' ',
            style: TextStyle(
              fontSize: 14.0,
              color: isMe
                  ? Colors.white
                  : (isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A)),
            ),
          ),
        );
      }
    }

    // Inline spacing + timestamp widget span (tiny, elegant, hugs content)
    spans.add(
      WidgetSpan(
        alignment: PlaceholderAlignment.bottom,
        child: Padding(
          padding: const EdgeInsets.only(left: 6, bottom: 0.5),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                timeStr,
                style: TextStyle(
                  fontSize: 8.5,
                  letterSpacing: -0.2,
                  color: isMe
                      ? Colors.white.withOpacity(0.60)
                      : const Color(0xFF94A3B8),
                  fontWeight: FontWeight.w400,
                ),
              ),
              if (isMe) ...[
                const SizedBox(width: 2.5),
                _buildStatusTicks(msg),
              ],
            ],
          ),
        ),
      ),
    );

    return Text.rich(
      TextSpan(children: spans),
    );
  }

  // ─────────────────────────── Status ticks ────────────────────────────────────

  Widget _buildStatusTicks(Map<String, dynamic> msg) {
    final readBy = msg['readBy'];
    final deliveredTo = msg['deliveredTo'];

    bool isRead = false;
    if (readBy is List && readBy.isNotEmpty) isRead = true;
    bool isDelivered = false;
    if (deliveredTo is List && deliveredTo.isNotEmpty) isDelivered = true;

    if (isRead) {
      return const Icon(Icons.done_all,
          size: 11, color: Color(0xFF38BDF8));
    } else if (isDelivered) {
      return Icon(Icons.done_all,
          size: 11, color: Colors.white.withOpacity(0.60));
    } else {
      return Icon(Icons.check,
          size: 10, color: Colors.white.withOpacity(0.60));
    }
  }

  // ─────────────────────────── Reactions row ───────────────────────────────────

  Widget _buildReactionsRow(Map<String, dynamic> msg, bool isMe, bool isDark) {
    final rawReactions = msg['reactions'];
    if (rawReactions is! List || rawReactions.isEmpty) {
      return const SizedBox.shrink();
    }

    final counts = <String, int>{};
    for (final r in rawReactions) {
      if (r is Map && r['emoji'] != null) {
        final e = r['emoji'].toString();
        counts[e] = (counts[e] ?? 0) + 1;
      }
    }
    if (counts.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Wrap(
        spacing: 5,
        runSpacing: 4,
        alignment: isMe ? WrapAlignment.end : WrapAlignment.start,
        children: counts.entries.map((entry) {
          return GestureDetector(
            onTap: () => _addReaction(msg, entry.key),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF241D19) : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withOpacity(0.12)
                      : const Color(0xFFE2E8F0),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDark ? 0.25 : 0.05),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(entry.key,
                      style: const TextStyle(fontSize: 13)),
                  const SizedBox(width: 4),
                  Text(
                    '${entry.value}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF475569),
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ─────────────────────────── Quoted reply bar ────────────────────────────────

  Widget _buildQuotedReplyBar() {
    final repMsg = _replyingToMessage!;
    final repSender = repMsg['sender'] is Map
        ? repMsg['sender']['name']?.toString() ?? 'Colleague'
        : 'Colleague';
    final repBody = repMsg['message']?.toString() ?? '';
    final senderId = repMsg['sender'] is Map
        ? (repMsg['sender']['_id']?.toString() ?? repMsg['sender']['id']?.toString())
        : null;
    final myId = ref.read(authProvider).user?.id;
    final isMe = (senderId != null && senderId == myId);
    final palette = _getParticipantPalette(senderId, repSender, myId);
    final isDark = _wallpaper.isDark;

    final accentColor = isMe
        ? (isDark ? const Color(0xFFF59E0B) : const Color(0xFF0F172A))
        : (isDark ? palette.darkName : palette.primary);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 14),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF1E1A17).withOpacity(0.94)
            : Colors.white.withOpacity(0.95),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withOpacity(0.12)
              : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.35 : 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 3.5,
            height: 32,
            decoration: BoxDecoration(
              color: accentColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  isMe ? 'Replying to Yourself' : 'Replying to $repSender',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: accentColor,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  repBody.isNotEmpty ? repBody : 'Attachment',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: isDark
                        ? const Color(0xFF94A3B8)
                        : const Color(0xFF475569),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () => setState(() => _replyingToMessage = null),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withOpacity(0.10)
                    : const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.close_rounded,
                size: 14,
                color: isDark ? Colors.white70 : const Color(0xFF64748B),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─────────────────────────── Image preview tray ──────────────────────────────

  Widget _buildImagePreviewTray() {
    if (_selectedImage == null) return const SizedBox.shrink();
    final isDark = _wallpaper.isDark;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 14),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF1E1A17).withOpacity(0.94)
            : Colors.white.withOpacity(0.95),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withOpacity(0.12)
              : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.35 : 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.file(_selectedImage!,
                width: 46, height: 46, fit: BoxFit.cover),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Photo attached',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: isDark
                        ? const Color(0xFFF8FAFC)
                        : const Color(0xFF0F172A),
                  ),
                ),
                Text(
                  _selectedImage!.path
                      .split(Platform.isWindows ? r'\' : '/')
                      .last,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark
                        ? const Color(0xFF94A3B8)
                        : const Color(0xFF64748B),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () => setState(() => _selectedImage = null),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withOpacity(0.10)
                    : const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.close_rounded,
                size: 14,
                color: isDark ? Colors.white70 : const Color(0xFF64748B),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─────────────────── Floating glass composer ─────────────────────────────────
  // Frosted-glass pill that floats above the wallpaper.
  // — No border, no label, no top rule
  // — BackdropFilter gives blur-through-wallpaper effect
  // — Secondary icons auto-hide while the user is typing to give more room
  // — Send button scales + glows when active (AnimatedScale + AnimatedContainer)

  Widget _buildMessageComposerBar() {
    final hasContent =
        _msgController.text.trim().isNotEmpty || _selectedImage != null;
    final isDark = _wallpaper.isDark;

    return ClipRRect(
      borderRadius: BorderRadius.circular(32),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
          decoration: BoxDecoration(
            color: isDark
                ? const Color(0xFF191412).withOpacity(0.90)
                : Colors.white.withOpacity(0.92),
            borderRadius: BorderRadius.circular(32),
            border: Border.all(
              color: isDark
                  ? Colors.white.withOpacity(0.12)
                  : Colors.white.withOpacity(0.60),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(isDark ? 0.40 : 0.12),
                blurRadius: 28,
                spreadRadius: 0,
                offset: const Offset(0, 8),
              ),
              BoxShadow(
                color: Colors.black.withOpacity(isDark ? 0.20 : 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Attachment circle
              _composerFab(
                Icons.add_rounded,
                _showAttachmentPickerSheet,
                color: isDark
                    ? const Color(0xFFF8FAFC)
                    : const Color(0xFF0F172A),
                bgColor: isDark
                    ? Colors.white.withOpacity(0.10)
                    : const Color(0xFFF1F5F9),
                size: 20,
              ),
              const SizedBox(width: 4),

              // Expandable text field — no border, no label
              Expanded(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 110),
                  child: TextField(
                    controller: _msgController,
                    minLines: 1,
                    maxLines: 5,
                    textCapitalization: TextCapitalization.sentences,
                    style: TextStyle(
                      fontSize: 14.5,
                      color: isDark
                          ? const Color(0xFFF8FAFC)
                          : const Color(0xFF0F172A),
                      height: 1.45,
                      fontWeight: FontWeight.w400,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Message\u2026',
                      hintStyle: TextStyle(
                        fontSize: 14.5,
                        color: isDark
                            ? const Color(0xFF78716C)
                            : const Color(0xFF94A3B8),
                        fontWeight: FontWeight.w400,
                      ),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding:
                          const EdgeInsets.symmetric(horizontal: 6, vertical: 9),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
              ),

              // Secondary icons — hidden while typing to maximise space
              AnimatedSize(
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOut,
                child: !hasContent
                    ? Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _composerFab(
                            LucideIcons.paperclip,
                            _showAttachmentPickerSheet,
                          ),
                          _composerFab(
                            LucideIcons.image,
                            () => _pickImage(ImageSource.gallery),
                          ),
                        ],
                      )
                    : const SizedBox.shrink(),
              ),

              // @mention — always visible
              _composerFab(
                LucideIcons.atSign,
                () {
                  final cur = _msgController.text;
                  _msgController.text = cur.isEmpty || cur.endsWith(' ')
                      ? '$cur@'
                      : '$cur @';
                  _msgController.selection = TextSelection.collapsed(
                      offset: _msgController.text.length);
                  setState(() {
                    _showMentionOverlay = true;
                    _mentionQuery = '';
                    _mentionStartIndex =
                        _msgController.text.lastIndexOf('@');
                  });
                },
              ),

              const SizedBox(width: 4),

              // Send button with spring scale + glow
              AnimatedScale(
                scale: hasContent ? 1.0 : 0.82,
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOutBack,
                child: GestureDetector(
                  onTap: _sendMessage,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: hasContent
                            ? (isDark
                                ? [
                                    const Color(0xFFEA580C),
                                    const Color(0xFFC2410C),
                                  ]
                                : [
                                    const Color(0xFF1E293B),
                                    const Color(0xFF0F172A),
                                  ])
                            : (isDark
                                ? [
                                    const Color(0xFF2B221E),
                                    const Color(0xFF201916),
                                  ]
                                : [
                                    const Color(0xFFE2E8F0),
                                    const Color(0xFFCBD5E1),
                                  ]),
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      boxShadow: hasContent
                          ? [
                              BoxShadow(
                                color: isDark
                                    ? const Color(0xFFEA580C).withOpacity(0.40)
                                    : const Color(0xFF0F172A).withOpacity(0.35),
                                blurRadius: 14,
                                spreadRadius: 0,
                                offset: const Offset(0, 4),
                              ),
                            ]
                          : [],
                    ),
                    child: Center(
                      child: _isSending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : Icon(
                              Icons.send_rounded,
                              size: 17,
                              color: hasContent
                                  ? Colors.white
                                  : (isDark
                                      ? const Color(0xFF78716C)
                                      : Colors.white),
                            ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Minimal circular icon button for the composer toolbar.
  Widget _composerFab(
    IconData icon,
    VoidCallback onTap, {
    Color? color,
    Color bgColor = Colors.transparent,
    double size = 17,
  }) {
    final isDark = _wallpaper.isDark;
    final defaultColor = isDark
        ? const Color(0xFF94A3B8)
        : const Color(0xFF64748B);
    final hasBg = bgColor != Colors.transparent;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        margin: const EdgeInsets.only(bottom: 1),
        decoration: BoxDecoration(
          color: bgColor,
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Icon(icon,
              size: hasBg ? size : 17,
              color: color ?? defaultColor),
        ),
      ),
    );
  }
}

// ─── LIST ITEM MODEL ──────────────────────────────────────────────────────────

class _ChatListItem {
  final bool isSeparator;
  final String? label;
  final int? messageIndex;

  const _ChatListItem._({
    required this.isSeparator,
    this.label,
    this.messageIndex,
  });

  factory _ChatListItem.separator(String label) =>
      _ChatListItem._(isSeparator: true, label: label);

  factory _ChatListItem.message(int index) =>
      _ChatListItem._(isSeparator: false, messageIndex: index);
}


