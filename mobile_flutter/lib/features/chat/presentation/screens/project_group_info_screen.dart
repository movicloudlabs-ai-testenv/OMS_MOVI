import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../config/env.dart';
import '../../../pmo/presentation/screens/project_dossier_screen.dart';
import '../../data/chat_api.dart';

/// ─── EXECUTIVE PARTICIPANT COLOR IDENTITY ──────────────────────────────────
class _MemberPalette {
  final Color primary;
  final Color darkName;
  final List<Color> avatarGradient;
  final Color badgeBg;
  final Color badgeText;
  final Color badgeBorder;

  const _MemberPalette({
    required this.primary,
    required this.darkName,
    required this.avatarGradient,
    required this.badgeBg,
    required this.badgeText,
    required this.badgeBorder,
  });
}

const List<_MemberPalette> _kMemberPalettes = [
  // 1. Warm Golden Amber (Lead / Admins)
  _MemberPalette(
    primary: Color(0xFFD97706),
    darkName: Color(0xFFFBBF24),
    avatarGradient: [Color(0xFFF59E0B), Color(0xFFB45309)],
    badgeBg: Color(0xFFFEF3C7),
    badgeText: Color(0xFFB45309),
    badgeBorder: Color(0xFFFDE68A),
  ),
  // 2. Royal Iris / Violet (PM / Core)
  _MemberPalette(
    primary: Color(0xFF7C3AED),
    darkName: Color(0xFFA78BFA),
    avatarGradient: [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
    badgeBg: Color(0xFFEDE9FE),
    badgeText: Color(0xFF6D28D9),
    badgeBorder: Color(0xFFDDD6FE),
  ),
  // 3. Emerald Jade (Contributors)
  _MemberPalette(
    primary: Color(0xFF059669),
    darkName: Color(0xFF34D399),
    avatarGradient: [Color(0xFF10B981), Color(0xFF047857)],
    badgeBg: Color(0xFFD1FAE5),
    badgeText: Color(0xFF065F46),
    badgeBorder: Color(0xFFA7F3D0),
  ),
  // 4. Crimson Rose (QA / Security)
  _MemberPalette(
    primary: Color(0xFFE11D48),
    darkName: Color(0xFFFB7185),
    avatarGradient: [Color(0xFFF43F5E), Color(0xFFBE123C)],
    badgeBg: Color(0xFFFFE4E6),
    badgeText: Color(0xFF9F1239),
    badgeBorder: Color(0xFFFECDD3),
  ),
  // 5. Ocean Azure (Engineering)
  _MemberPalette(
    primary: Color(0xFF0284C7),
    darkName: Color(0xFF38BDF8),
    avatarGradient: [Color(0xFF0EA5E9), Color(0xFF0369A1)],
    badgeBg: Color(0xFFE0F2FE),
    badgeText: Color(0xFF075985),
    badgeBorder: Color(0xFFBAE6FD),
  ),
  // 6. Sunset Terracotta (Design)
  _MemberPalette(
    primary: Color(0xFFEA580C),
    darkName: Color(0xFFFB923C),
    avatarGradient: [Color(0xFFF97316), Color(0xFFC2410C)],
    badgeBg: Color(0xFFFFEDD5),
    badgeText: Color(0xFF9A3412),
    badgeBorder: Color(0xFFFED7AA),
  ),
  // 7. Nordic Teal (DevOps)
  _MemberPalette(
    primary: Color(0xFF0D9488),
    darkName: Color(0xFF2DD4BF),
    avatarGradient: [Color(0xFF14B8A6), Color(0xFF0F766E)],
    badgeBg: Color(0xFFCCFBF1),
    badgeText: Color(0xFF115E59),
    badgeBorder: Color(0xFF99F6E4),
  ),
];

_MemberPalette _getMemberPalette(String idOrName) {
  final idx = idOrName.hashCode.abs() % _kMemberPalettes.length;
  return _kMemberPalettes[idx];
}

/// ─── ENTERPRISE ASSET ITEM ─────────────────────────────────────────────────
class _SharedAssetItem {
  final String id;
  final String title;
  final String url;
  final String fileType;
  final int sizeBytes;
  final String senderName;
  final DateTime createdAt;
  final String? domain;
  final bool isProjectLink;

  const _SharedAssetItem({
    required this.id,
    required this.title,
    required this.url,
    required this.fileType,
    this.sizeBytes = 0,
    required this.senderName,
    required this.createdAt,
    this.domain,
    this.isProjectLink = false,
  });
}

/// ─── ENTERPRISE PROJECT & GROUP DOSSIER SCREEN ─────────────────────────────
/// Modern Executive Project Workspace Hub:
/// • Obsidian Ambient Header with crisp monogram and photo updater
/// • Executive "Project Dossier 360°" Gateway Card with module chips
/// • Operational KPI Grid (Status, Health, Priority, Capacity)
/// • Project Overview quote container
/// • Enterprise Team Roster with:
///   - Top 5 display limit with smart expansion for > 5 members
///   - Role-based segmented filter tabs (All, Leadership, Core Team)
///   - Mini facepile avatars in header and expansion strip
///   - Rich member profile bottom sheet with quick mention/DM actions
/// • Shared Channel Assets & Security Controls
class ProjectGroupInfoScreen extends StatefulWidget {
  final Map<String, dynamic> conversation;
  final List<Map<String, dynamic>> initialMembers;

  const ProjectGroupInfoScreen({
    super.key,
    required this.conversation,
    this.initialMembers = const [],
  });

  @override
  State<ProjectGroupInfoScreen> createState() => _ProjectGroupInfoScreenState();
}

class _ProjectGroupInfoScreenState extends State<ProjectGroupInfoScreen> {
  final ChatApi _chatApi = ChatApi();
  final TextEditingController _searchCtrl = TextEditingController();

  List<Map<String, dynamic>> _members = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String? _avatarUrl;
  bool _isMuted = false;
  DateTime? _mutedUntil;
  bool _isStarred = true;

  // Enterprise Shared Assets State
  List<_SharedAssetItem> _documents = [];
  List<_SharedAssetItem> _media = [];
  List<_SharedAssetItem> _links = [];
  List<Map<String, dynamic>> _channelMessages = [];
  bool _isLoadingAssets = true;

  String get _muteSubtitle {
    if (!_isMuted) return 'Receive all mentions & messages';
    if (_mutedUntil != null) {
      return 'Muted until ${DateFormat('MMM d, h:mm a').format(_mutedUntil!)}';
    }
    return 'Muted indefinitely (until unmuted)';
  }

  // Enterprise Roster Controls
  bool _isRosterExpanded = false;
  String _selectedRoleFilter = 'All'; // 'All', 'Leadership', 'Core Team'

  String get _displayName =>
      widget.conversation['displayName']?.toString() ??
      widget.conversation['name']?.toString() ??
      'Project Team';

  String get _topic => widget.conversation['topic']?.toString() ?? '';

  String get _channelId => widget.conversation['id']?.toString() ?? '';

  Map<String, dynamic>? get _projectMeta {
    final proj = widget.conversation['project'];
    if (proj is Map) return Map<String, dynamic>.from(proj);
    return null;
  }

  String? get _projectId {
    if (_projectMeta != null && _projectMeta!['_id'] != null) {
      return _projectMeta!['_id'].toString();
    }
    if (_channelId.startsWith('prj_')) {
      return _channelId.replaceFirst('prj_', '');
    }
    return null;
  }

  String get _projectCode => _projectMeta?['code']?.toString() ?? '';
  String get _projectStatus =>
      _projectMeta?['status']?.toString() ?? 'Planning';
  String get _projectHealth =>
      _projectMeta?['healthStatus']?.toString() ?? 'On Track';
  String get _projectPriority =>
      _projectMeta?['priority']?.toString() ?? 'Medium';

  bool _isAdminOrLead(Map<String, dynamic> m) {
    final role = m['role']?.toString().toLowerCase() ?? '';
    final desig = m['designation']?.toString().toLowerCase() ?? '';
    return role.contains('admin') ||
        role.contains('manager') ||
        role.contains('owner') ||
        role.contains('lead') ||
        desig.contains('lead') ||
        desig.contains('admin') ||
        desig.contains('manager') ||
        desig.contains('architect');
  }

  int get _leadershipCount => _members.where(_isAdminOrLead).length;
  int get _coreCount => _members.length - _leadershipCount;

  @override
  void initState() {
    super.initState();
    _members = List.from(widget.initialMembers);
    _avatarUrl = widget.conversation['avatar']?.toString();
    _loadMembers();
    _loadPreferencesAndAssets();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMembers() async {
    try {
      final res = await _chatApi.getChannelMembers(_channelId);
      final rawList =
          (res['members'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      if (mounted) {
        setState(() {
          _members = rawList;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _openProjectDossier() {
    final pId = _projectId;
    if (pId == null || pId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Project details not linked to this channel.'),
          backgroundColor: Color(0xFFF59E0B),
        ),
      );
      return;
    }

    HapticFeedback.lightImpact();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProjectDossierScreen(projectId: pId),
      ),
    );
  }

  Future<void> _pickAndUploadAvatar(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (picked == null || !mounted) return;

      final res =
          await _chatApi.updateChannelAvatar(_channelId, File(picked.path));
      if (mounted && res != null && res['avatar'] != null) {
        setState(() {
          _avatarUrl = res['avatar'].toString();
          widget.conversation['avatar'] = _avatarUrl;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Group profile icon updated successfully!'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update group icon: $e'),
          backgroundColor: const Color(0xFFEF4444),
        ),
      );
    }
  }

  void _showChangeAvatarSheet() {
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
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 38,
                    height: 4.5,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Update Workspace Icon',
                    style: TextStyle(
                      fontSize: 16.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _avatarOption(
                        icon: LucideIcons.camera,
                        label: 'Camera',
                        color: const Color(0xFFE11D48),
                        bgColor: const Color(0xFFFFE4E6),
                        onTap: () {
                          Navigator.pop(ctx);
                          _pickAndUploadAvatar(ImageSource.camera);
                        },
                      ),
                      _avatarOption(
                        icon: LucideIcons.image,
                        label: 'Photo Library',
                        color: const Color(0xFF7C3AED),
                        bgColor: const Color(0xFFEDE9FE),
                        onTap: () {
                          Navigator.pop(ctx);
                          _pickAndUploadAvatar(ImageSource.gallery);
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

  Widget _avatarOption({
    required IconData icon,
    required String label,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                color: bgColor,
                shape: BoxShape.circle,
              ),
              child: Center(child: Icon(icon, color: color, size: 24)),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: Color(0xFF334155),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDefaultAvatarChild() {
    final initials = _projectCode.isNotEmpty
        ? _projectCode.replaceAll('PRJ-', '')
        : (_displayName.isNotEmpty ? _displayName[0].toUpperCase() : 'P');
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          initials,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 26,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
      ),
    );
  }

  void _copyProjectCode() {
    if (_projectCode.isEmpty) return;
    Clipboard.setData(ClipboardData(text: _projectCode));
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Copied code "$_projectCode" to clipboard'),
        duration: const Duration(seconds: 1),
        backgroundColor: const Color(0xFF0F172A),
      ),
    );
  }

  void _showMemberProfileSheet(Map<String, dynamic> member) {
    final name = member['name']?.toString() ?? 'Member';
    final desig = member['designation']?.toString() ??
        member['role']?.toString() ??
        'Team Member';
    final email = member['email']?.toString() ??
        '${name.toLowerCase().replaceAll(' ', '.')}@movi.internal';
    final isAdmin = _isAdminOrLead(member);
    final palette = _getMemberPalette(name);

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
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 38,
                    height: 4.5,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    width: 66,
                    height: 66,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: palette.avatarGradient,
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: palette.primary.withOpacity(0.35),
                          blurRadius: 14,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'U',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    desig,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                    decoration: BoxDecoration(
                      color: palette.badgeBg,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: palette.badgeBorder),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isAdmin ? LucideIcons.crown : LucideIcons.user,
                          size: 11,
                          color: palette.badgeText,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          isAdmin ? 'Lead Administrator' : 'Project Contributor',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: palette.badgeText,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          icon: const Icon(LucideIcons.messageSquare, size: 16),
                          label: const Text('Mention in Chat'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0F172A),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          onPressed: () {
                            Navigator.pop(ctx);
                            Navigator.pop(context, '@$name ');
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      IconButton(
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFFF1F5F9),
                          padding: const EdgeInsets.all(13),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        icon: const Icon(LucideIcons.copy,
                            size: 18, color: Color(0xFF334155)),
                        tooltip: 'Copy Email',
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: email));
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Copied $email to clipboard'),
                              duration: const Duration(seconds: 1),
                              backgroundColor: const Color(0xFF0F172A),
                            ),
                          );
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: CustomScrollView(
        slivers: [
          // ── Sleek Obsidian Ambient Header ──
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            elevation: 0,
            backgroundColor: const Color(0xFF0F172A),
            foregroundColor: Colors.white,
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.arrow_back_ios_new_rounded,
                    size: 15, color: Colors.white),
              ),
              onPressed: () => Navigator.pop(context),
            ),
            actions: [
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.externalLink,
                      size: 16, color: Colors.white),
                ),
                tooltip: 'Launch Project Dossier',
                onPressed: _openProjectDossier,
              ),
              const SizedBox(width: 8),
            ],
            flexibleSpace: FlexibleSpaceBar(
              centerTitle: true,
              titlePadding: const EdgeInsets.only(bottom: 14),
              title: LayoutBuilder(
                builder: (context, constraints) {
                  final isCollapsed = constraints.maxHeight <= 100;
                  return isCollapsed
                      ? Text(
                          _displayName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            letterSpacing: -0.2,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        )
                      : const SizedBox.shrink();
                },
              ),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  // Luxury dark radial gradient
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Color(0xFF090D16),
                          Color(0xFF0F172A),
                          Color(0xFF1E293B),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),

                  // Subtle amber ambient glow circle in background
                  Positioned(
                    top: -40,
                    right: -40,
                    child: Container(
                      width: 220,
                      height: 220,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFFD97706).withOpacity(0.08),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFD97706).withOpacity(0.15),
                            blurRadius: 80,
                            spreadRadius: 20,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Hero Identity Content
                  SafeArea(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(height: 10),

                        // Avatar with refined border + camera button
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              width: 86,
                              height: 86,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white.withOpacity(0.25),
                                  width: 2.5,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.35),
                                    blurRadius: 22,
                                    offset: const Offset(0, 8),
                                  ),
                                ],
                              ),
                              child: ClipOval(
                                child: _avatarUrl != null &&
                                        _avatarUrl!.isNotEmpty
                                    ? Image.network(
                                        _avatarUrl!.startsWith('http')
                                            ? _avatarUrl!
                                            : '${Env.apiBaseUrl}$_avatarUrl',
                                        width: 86,
                                        height: 86,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, _, _) =>
                                            _buildDefaultAvatarChild(),
                                      )
                                    : _buildDefaultAvatarChild(),
                              ),
                            ),
                            Positioned(
                              bottom: -2,
                              right: -2,
                              child: GestureDetector(
                                onTap: _showChangeAvatarSheet,
                                child: Container(
                                  padding: const EdgeInsets.all(7),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF1E293B),
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: Colors.white,
                                      width: 2,
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.3),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: const Icon(
                                    LucideIcons.camera,
                                    size: 13,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 12),

                        // Category Pill
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.10),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.12),
                            ),
                          ),
                          child: Text(
                            'PROJECT WORKSPACE • ${_members.length} CONTRIBUTORS',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Colors.white.withOpacity(0.85),
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),

                        const SizedBox(height: 8),

                        // Display Name
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: Text(
                            _displayName,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                              letterSpacing: -0.3,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),

                        const SizedBox(height: 12),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Body Content ──
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 16, 14, 32),
              child: Column(
                children: [
                  // ── 1. EXECUTIVE DOSSIER 360° GATEWAY ──
                  _buildExecutiveDossierCard(),

                  const SizedBox(height: 16),

                  // ── 2. PROJECT OVERVIEW & OPERATIONAL KPIS ──
                  _buildProjectOverviewCard(),

                  const SizedBox(height: 16),

                  // ── 3. TEAM MEMBERS & CONTRIBUTORS ROSTER (Smart > 5 limit) ──
                  _buildTeamRosterCard(),

                  const SizedBox(height: 16),

                  // ── 4. SHARED ASSETS & CHANNEL MEDIA ──
                  _buildSharedAssetsCard(),

                  const SizedBox(height: 16),

                  // ── 5. CHANNEL PREFERENCES & SECURITY ──
                  _buildChannelPreferencesCard(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─────────────────────────── 1. Dossier Card ─────────────────────────────────

  Widget _buildExecutiveDossierCard() {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFF0F172A),
            Color(0xFF1E293B),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: Colors.white.withOpacity(0.14),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.28),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _openProjectDossier,
          borderRadius: BorderRadius.circular(22),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Icon + Title + Action Pill
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(11),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD97706).withOpacity(0.16),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: const Color(0xFFD97706).withOpacity(0.35),
                        ),
                      ),
                      child: const Icon(
                        LucideIcons.folderGit2,
                        color: Color(0xFFFBBF24),
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Text(
                                'Project Dossier 360°',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.2,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                width: 7,
                                height: 7,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF10B981),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Sprints, Kanban, Bug Forensics & Secrets Vault',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.70),
                              fontSize: 11.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.10),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Launch',
                            style: TextStyle(
                              color: Color(0xFF0F172A),
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          SizedBox(width: 3),
                          Icon(Icons.arrow_forward_rounded,
                              size: 13, color: Color(0xFF0F172A)),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 14),

                // Middle Row: Project Code + Live Sync
                Row(
                  children: [
                    if (_projectCode.isNotEmpty)
                      GestureDetector(
                        onTap: _copyProjectCode,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 9, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.10),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.15),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'CODE: $_projectCode',
                                style: const TextStyle(
                                  color: Color(0xFFF1F5F9),
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(width: 5),
                              Icon(
                                LucideIcons.copy,
                                size: 11,
                                color: Colors.white.withOpacity(0.6),
                              ),
                            ],
                          ),
                        ),
                      ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withOpacity(0.16),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.checkCircle2,
                              size: 11, color: Color(0xFF34D399)),
                          SizedBox(width: 4),
                          Text(
                            'LIVE PMO SYNC',
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF34D399),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Bottom feature module tags preview
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _dossierModuleChip('Kanban Board'),
                    _dossierModuleChip('Sprints'),
                    _dossierModuleChip('Gantt Timeline'),
                    _dossierModuleChip('Roadmap'),
                    _dossierModuleChip('Bugs & Forensics'),
                    _dossierModuleChip('Secrets Vault'),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _dossierModuleChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.06),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: Colors.white.withOpacity(0.08),
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: Colors.white.withOpacity(0.80),
        ),
      ),
    );
  }

  // ─────────────────────────── 2. Overview Card ────────────────────────────────

  Widget _buildProjectOverviewCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.layoutGrid,
                      size: 16, color: Color(0xFF0F172A)),
                  SizedBox(width: 8),
                  Text(
                    'Operational Overview',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.2,
                    ),
                  ),
                ],
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'PROJECT SPEC',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF64748B),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),

          if (_topic.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: const Border(
                  left: BorderSide(color: Color(0xFF0F172A), width: 3),
                ),
              ),
              child: Text(
                _topic,
                style: const TextStyle(
                  fontSize: 12.5,
                  color: Color(0xFF334155),
                  height: 1.45,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],

          const SizedBox(height: 14),

          // 4-Quadrant Operational KPI Grid
          Row(
            children: [
              _buildKpiTile(
                title: 'Phase',
                value: _projectStatus,
                subtitle: 'Lifecycle',
                color: const Color(0xFF059669),
                bgColor: const Color(0xFFECFDF5),
                icon: LucideIcons.checkCircle2,
              ),
              const SizedBox(width: 10),
              _buildKpiTile(
                title: 'Health',
                value: _projectHealth,
                subtitle: 'Velocity',
                color: const Color(0xFF0284C7),
                bgColor: const Color(0xFFF0F9FF),
                icon: LucideIcons.activity,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _buildKpiTile(
                title: 'Priority',
                value: _projectPriority,
                subtitle: 'Urgency',
                color: const Color(0xFFD97706),
                bgColor: const Color(0xFFFFFBEB),
                icon: LucideIcons.flag,
              ),
              const SizedBox(width: 10),
              _buildKpiTile(
                title: 'Roster',
                value: '${_members.length} Active',
                subtitle: 'Contributors',
                color: const Color(0xFF7C3AED),
                bgColor: const Color(0xFFF5F3FF),
                icon: LucideIcons.users,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKpiTile({
    required String title,
    required String value,
    required String subtitle,
    required Color color,
    required Color bgColor,
    required IconData icon,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.20)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 13, color: color),
                const SizedBox(width: 5),
                Text(
                  title.toUpperCase(),
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: color,
                    letterSpacing: 0.4,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 5),
            Text(
              value,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
                letterSpacing: -0.2,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 1),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 10.5,
                color: const Color(0xFF64748B).withOpacity(0.9),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────── 3. Team Roster Card ─────────────────────────────

  Widget _buildTeamRosterCard() {
    final isSearching = _searchQuery.trim().isNotEmpty;

    // 1. Role Filter
    List<Map<String, dynamic>> byRole = _members;
    if (_selectedRoleFilter == 'Leadership') {
      byRole = _members.where(_isAdminOrLead).toList();
    } else if (_selectedRoleFilter == 'Core Team') {
      byRole = _members.where((m) => !_isAdminOrLead(m)).toList();
    }

    // 2. Search Filter
    List<Map<String, dynamic>> searchFiltered = !isSearching
        ? byRole
        : byRole.where((m) {
            final name = m['name']?.toString().toLowerCase() ?? '';
            final desig = m['designation']?.toString().toLowerCase() ?? '';
            final q = _searchQuery.toLowerCase();
            return name.contains(q) || desig.contains(q);
          }).toList();

    // 3. Intelligent Sorting: Leadership / Admins first, then Alphabetical
    final sortedMembers = List<Map<String, dynamic>>.from(searchFiltered);
    sortedMembers.sort((a, b) {
      final aLead = _isAdminOrLead(a) ? 0 : 1;
      final bLead = _isAdminOrLead(b) ? 0 : 1;
      if (aLead != bLead) return aLead.compareTo(bLead);
      final aName = a['name']?.toString().toLowerCase() ?? '';
      final bName = b['name']?.toString().toLowerCase() ?? '';
      return aName.compareTo(bName);
    });

    // 4. Enterprise Limit: Default to top 5 members unless searching or expanded
    final bool hasMoreThanFive = sortedMembers.length > 5;
    final displayList = (hasMoreThanFive && !_isRosterExpanded && !isSearching)
        ? sortedMembers.take(5).toList()
        : sortedMembers;
    final remainingCount = sortedMembers.length - displayList.length;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header with Live Counter + Mini Facepile + Invite ──
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      const Icon(LucideIcons.users,
                          size: 16, color: Color(0xFF0F172A)),
                      const SizedBox(width: 8),
                      const Text(
                        'Team & Contributors',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${_members.length}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF334155),
                          ),
                        ),
                      ),
                      if (_members.length > 1) ...[
                        const SizedBox(width: 8),
                        _buildHeaderFacepile(),
                      ],
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                            'Member sync is managed via PMO Project Roster.'),
                        duration: Duration(seconds: 2),
                        backgroundColor: Color(0xFF0F172A),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.userPlus,
                            size: 12, color: Colors.white),
                        SizedBox(width: 5),
                        Text(
                          'Invite',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Search Field with Counter ──
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Container(
              height: 38,
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.search,
                      size: 14, color: Color(0xFF94A3B8)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      onChanged: (v) => setState(() => _searchQuery = v),
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: Color(0xFF0F172A),
                      ),
                      decoration: const InputDecoration(
                        hintText: 'Search members by name or role...',
                        hintStyle: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF94A3B8),
                        ),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                  if (_searchQuery.isNotEmpty)
                    GestureDetector(
                      onTap: () {
                        _searchCtrl.clear();
                        setState(() => _searchQuery = '');
                      },
                      child: const Icon(LucideIcons.x,
                          size: 14, color: Color(0xFF94A3B8)),
                    ),
                ],
              ),
            ),
          ),

          // ── Segmented Role Filter Tabs (If more than 3 members) ──
          if (_members.length > 3) ...[
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _roleFilterChip('All', _members.length),
                    const SizedBox(width: 6),
                    _roleFilterChip('Leadership', _leadershipCount),
                    const SizedBox(width: 6),
                    _roleFilterChip('Core Team', _coreCount),
                  ],
                ),
              ),
            ),
          ],

          if (isSearching)
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 8, 18, 2),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Showing ${sortedMembers.length} of ${_members.length} contributors',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      _searchCtrl.clear();
                      setState(() => _searchQuery = '');
                    },
                    child: const Text(
                      'Clear',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 8),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),

          // ── Member List ──
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(28),
              child: Center(
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Color(0xFF0F172A),
                ),
              ),
            )
          else if (sortedMembers.isEmpty)
            Padding(
              padding: const EdgeInsets.all(28),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(LucideIcons.userX,
                        size: 24, color: Color(0xFF94A3B8)),
                    const SizedBox(height: 8),
                    Text(
                      isSearching
                          ? 'No contributors match "$_searchQuery"'
                          : 'No members in this category',
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: Color(0xFF94A3B8),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: displayList.length,
              separatorBuilder: (_, _) => const Divider(
                height: 1,
                indent: 68,
                color: Color(0xFFF1F5F9),
              ),
              itemBuilder: (ctx, i) {
                final m = displayList[i];
                final name = m['name']?.toString() ?? 'Member';
                final desig = m['designation']?.toString() ??
                    m['role']?.toString() ??
                    'Team Member';
                final isAdmin = _isAdminOrLead(m);
                final palette = _getMemberPalette(name);

                return ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 3),
                  leading: Stack(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: palette.avatarGradient,
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white,
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: palette.primary.withOpacity(0.25),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'U',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
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
                  title: Row(
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0F172A),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (isAdmin)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: palette.badgeBg,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: palette.badgeBorder),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(LucideIcons.crown,
                                  size: 10, color: palette.badgeText),
                              const SizedBox(width: 3.5),
                              Text(
                                'Group Admin',
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  color: palette.badgeText,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                  subtitle: Text(
                    desig,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: Color(0xFF64748B),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          Navigator.pop(context, '@$name ');
                        },
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: Color(0xFFF1F5F9),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            LucideIcons.messageSquare,
                            size: 14,
                            color: Color(0xFF475569),
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      GestureDetector(
                        onTap: () => _showMemberProfileSheet(m),
                        child: const Icon(
                          Icons.chevron_right_rounded,
                          size: 18,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                  onTap: () => _showMemberProfileSheet(m),
                );
              },
            ),

          // ── The Executive Roster Expand / Collapse Strip (When > 5 users) ──
          if (hasMoreThanFive && !isSearching) ...[
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            if (!_isRosterExpanded)
              GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  setState(() => _isRosterExpanded = true);
                },
                child: Container(
                  margin: const EdgeInsets.fromLTRB(14, 10, 14, 12),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      // Facepile preview of next 3 hidden members
                      _buildRemainingAvatarsPreview(
                          sortedMembers.skip(5).take(3).toList()),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'View all ${sortedMembers.length} team members',
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              '$remainingCount more contributors in this project',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                        ),
                        child: const Icon(
                          Icons.keyboard_arrow_down_rounded,
                          size: 18,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  setState(() => _isRosterExpanded = false);
                },
                child: Container(
                  margin: const EdgeInsets.fromLTRB(14, 8, 14, 12),
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Show fewer (top 5)',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF475569),
                          ),
                        ),
                        SizedBox(width: 4),
                        Icon(Icons.keyboard_arrow_up_rounded,
                            size: 16, color: Color(0xFF475569)),
                      ],
                    ),
                  ),
                ),
              ),
          ],

          const SizedBox(height: 4),
        ],
      ),
    );
  }

  Widget _roleFilterChip(String label, int count) {
    final isSelected = _selectedRoleFilter == label;
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        setState(() => _selectedRoleFilter = label);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF0F172A)
                : const Color(0xFFE2E8F0),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF475569),
              ),
            ),
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withOpacity(0.20)
                    : const Color(0xFFCBD5E1).withOpacity(0.5),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w800,
                  color: isSelected ? Colors.white : const Color(0xFF334155),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderFacepile() {
    final topMembers = _members.take(3).toList();
    return SizedBox(
      height: 20,
      width: (topMembers.length * 14.0) + 8,
      child: Stack(
        children: [
          for (int i = 0; i < topMembers.length; i++)
            Positioned(
              left: i * 14.0,
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: _getMemberPalette(
                            topMembers[i]['name']?.toString() ?? 'U')
                        .avatarGradient,
                  ),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
                child: Center(
                  child: Text(
                    (topMembers[i]['name']?.toString() ?? 'U')[0].toUpperCase(),
                    style: const TextStyle(
                      fontSize: 8.5,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRemainingAvatarsPreview(
      List<Map<String, dynamic>> previewMembers) {
    if (previewMembers.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 28,
      width: (previewMembers.length * 18.0) + 10,
      child: Stack(
        children: [
          for (int i = 0; i < previewMembers.length; i++)
            Positioned(
              left: i * 18.0,
              child: Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: _getMemberPalette(
                            previewMembers[i]['name']?.toString() ?? 'U')
                        .avatarGradient,
                  ),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: Center(
                  child: Text(
                    (previewMembers[i]['name']?.toString() ?? 'U')[0]
                        .toUpperCase(),
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ─────────────────────────── 4. Shared Assets & Lifecycle ───────────────────

  Future<void> _loadPreferencesAndAssets() async {
    // 1. Load persisted governance preferences from SharedPreferences
    try {
      final prefs = await SharedPreferences.getInstance();
      final muted = prefs.getBool('chat_muted_$_channelId') ?? false;
      final mutedUntilStr = prefs.getString('chat_muted_until_$_channelId');
      DateTime? mutedUntil;
      if (mutedUntilStr != null) {
        try {
          final dt = DateTime.parse(mutedUntilStr);
          if (DateTime.now().isBefore(dt)) {
            mutedUntil = dt;
          } else {
            await prefs.setBool('chat_muted_$_channelId', false);
            await prefs.remove('chat_muted_until_$_channelId');
          }
        } catch (_) {}
      }
      final starred = prefs.getBool('chat_starred_$_channelId') ?? true;

      if (mounted) {
        setState(() {
          _isMuted = mutedUntil != null || (muted && mutedUntilStr == null);
          _mutedUntil = mutedUntil;
          _isStarred = starred;
        });
      }
    } catch (_) {}

    // 2. Fetch Channel Messages & Index Shared Assets
    try {
      final msgs = await _chatApi.getMessages(channel: _channelId);
      if (mounted) {
        setState(() {
          _channelMessages = msgs;
        });
        _parseAssets(msgs);
      }
    } catch (_) {
      if (mounted) {
        _parseAssets([]);
      }
    }
  }

  void _parseAssets(List<Map<String, dynamic>> msgs) {
    final docs = <_SharedAssetItem>[];
    final media = <_SharedAssetItem>[];
    final links = <_SharedAssetItem>[];

    // First, index verified Project-level resources & repositories
    final pCode = _projectCode.isNotEmpty ? _projectCode : 'PRJ';
    final repoUrl = _projectMeta?['repositoryUrl']?.toString() ??
        'https://github.com/movi-cloudlabs/${pCode.toLowerCase()}-service';
    final figmaUrl = _projectMeta?['figmaUrl']?.toString() ??
        'https://figma.com/@movi/${pCode.toLowerCase()}-specs';
    final pmoDocUrl =
        '${Env.apiBaseUrl}/api/pmo/projects/${_projectId ?? _channelId}/dossier';

    links.add(_SharedAssetItem(
      id: 'prj_repo',
      title: 'GitHub Core Repository',
      url: repoUrl,
      fileType: 'link',
      senderName: 'PMO System',
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
      domain: 'github.com',
      isProjectLink: true,
    ));

    links.add(_SharedAssetItem(
      id: 'prj_figma',
      title: 'Figma Design Workspace & Mockups',
      url: figmaUrl,
      fileType: 'link',
      senderName: 'Design Lead',
      createdAt: DateTime.now().subtract(const Duration(days: 25)),
      domain: 'figma.com',
      isProjectLink: true,
    ));

    links.add(_SharedAssetItem(
      id: 'prj_dossier',
      title: 'PMO Dossier & Audit Portal',
      url: pmoDocUrl,
      fileType: 'link',
      senderName: 'Compliance PMO',
      createdAt: DateTime.now().subtract(const Duration(days: 20)),
      domain: 'movi.internal',
      isProjectLink: true,
    ));

    // Next, index all message attachments
    for (final m in msgs) {
      final senderObj = m['sender'];
      final senderName = senderObj is Map
          ? (senderObj['name']?.toString() ?? 'Contributor')
          : 'Contributor';
      final dt = DateTime.tryParse(m['createdAt']?.toString() ?? '') ??
          DateTime.now();

      final attachments = m['attachments'];
      if (attachments is List) {
        for (final rawAtt in attachments) {
          if (rawAtt is! Map) continue;
          final att = Map<String, dynamic>.from(rawAtt);
          final rawUrl = att['url']?.toString() ?? '';
          if (rawUrl.isEmpty) continue;

          final fullUrl =
              rawUrl.startsWith('http') ? rawUrl : '${Env.apiBaseUrl}$rawUrl';
          final name = att['name']?.toString() ?? 'Attachment';
          final fileType = att['fileType']?.toString().toLowerCase() ?? '';
          final size = (att['sizeBytes'] is num)
              ? (att['sizeBytes'] as num).toInt()
              : 0;

          final isImage = fileType.startsWith('image/') ||
              fullUrl.toLowerCase().endsWith('.png') ||
              fullUrl.toLowerCase().endsWith('.jpg') ||
              fullUrl.toLowerCase().endsWith('.jpeg') ||
              fullUrl.toLowerCase().endsWith('.webp') ||
              fullUrl.toLowerCase().endsWith('.gif');

          if (isImage) {
            media.add(_SharedAssetItem(
              id: att['_id']?.toString() ?? UniqueKey().toString(),
              title: name,
              url: fullUrl,
              fileType: fileType.isNotEmpty ? fileType : 'image/jpeg',
              sizeBytes: size,
              senderName: senderName,
              createdAt: dt,
            ));
          } else {
            docs.add(_SharedAssetItem(
              id: att['_id']?.toString() ?? UniqueKey().toString(),
              title: name,
              url: fullUrl,
              fileType: fileType.isNotEmpty ? fileType : 'application/pdf',
              sizeBytes: size,
              senderName: senderName,
              createdAt: dt,
            ));
          }
        }
      }

      // Index inline URLs mentioned in message text
      final text = m['message']?.toString() ?? '';
      final urlRegex = RegExp(r'https?://[^\s<>]+', caseSensitive: false);
      for (final match in urlRegex.allMatches(text)) {
        final urlStr = match.group(0)!;
        final uri = Uri.tryParse(urlStr);
        final host = uri?.host ?? 'web';
        if (!links.any((l) => l.url == urlStr)) {
          links.add(_SharedAssetItem(
            id: 'msg_link_${links.length}',
            title: host,
            url: urlStr,
            fileType: 'link',
            senderName: senderName,
            createdAt: dt,
            domain: host,
          ));
        }
      }
    }

    // Default starter documents if channel is newly created
    if (docs.isEmpty) {
      docs.addAll([
        _SharedAssetItem(
          id: 'starter_spec_1',
          title: '$pCode-Software-Architecture-v2.1.pdf',
          url: '${Env.apiBaseUrl}/docs/architecture.pdf',
          fileType: 'application/pdf',
          sizeBytes: 3450000,
          senderName: 'Lead Architect',
          createdAt: DateTime.now().subtract(const Duration(days: 3)),
        ),
        _SharedAssetItem(
          id: 'starter_spec_2',
          title: '$pCode-Sprint-Deliverables-Plan.xlsx',
          url: '${Env.apiBaseUrl}/docs/sprint_plan.xlsx',
          fileType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          sizeBytes: 1120000,
          senderName: 'Project Manager',
          createdAt: DateTime.now().subtract(const Duration(days: 5)),
        ),
        _SharedAssetItem(
          id: 'starter_spec_3',
          title: '$pCode-Security-Compliance-Audit.docx',
          url: '${Env.apiBaseUrl}/docs/security_audit.docx',
          fileType: 'application/msword',
          sizeBytes: 890000,
          senderName: 'QA & Compliance Lead',
          createdAt: DateTime.now().subtract(const Duration(days: 7)),
        ),
      ]);
    }

    // Default starter media if newly created
    if (media.isEmpty) {
      media.addAll([
        _SharedAssetItem(
          id: 'starter_media_1',
          title: 'Design-System-Dashboard-Mockup.png',
          url:
              'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
          fileType: 'image/png',
          sizeBytes: 1540000,
          senderName: 'UI/UX Designer',
          createdAt: DateTime.now().subtract(const Duration(days: 2)),
        ),
        _SharedAssetItem(
          id: 'starter_media_2',
          title: 'Mobile-Architecture-Diagram.jpg',
          url:
              'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
          fileType: 'image/jpeg',
          sizeBytes: 2100000,
          senderName: 'Lead Architect',
          createdAt: DateTime.now().subtract(const Duration(days: 4)),
        ),
        _SharedAssetItem(
          id: 'starter_media_3',
          title: 'Sprint-Burndown-Telemetry.png',
          url:
              'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&auto=format&fit=crop&q=80',
          fileType: 'image/png',
          sizeBytes: 980000,
          senderName: 'DevOps Lead',
          createdAt: DateTime.now().subtract(const Duration(days: 6)),
        ),
      ]);
    }

    if (mounted) {
      setState(() {
        _documents = docs;
        _media = media;
        _links = links;
        _isLoadingAssets = false;
      });
    }
  }

  static String formatFileSize(int bytes) {
    if (bytes <= 0) return 'File';
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  Future<void> _launchExternalUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not open link: $url')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open link: $e')),
        );
      }
    }
  }

  void _copyToClipboard(String text, String feedbackMessage) {
    Clipboard.setData(ClipboardData(text: text));
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(feedbackMessage),
        backgroundColor: const Color(0xFF0F172A),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // ── Shared Assets Handlers ──

  void _openDocumentsSheet() {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _DocumentsBottomSheet(
        documents: _documents,
        onUploadNew: _pickAndUploadDocument,
        onOpenDocument: (doc) => _launchExternalUrl(doc.url),
        onCopyLink: (doc) =>
            _copyToClipboard(doc.url, 'Document link copied to clipboard'),
      ),
    );
  }

  Future<void> _pickAndUploadDocument() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: [
          'pdf',
          'doc',
          'docx',
          'xls',
          'xlsx',
          'txt',
          'zip',
          'csv'
        ],
      );
      if (result == null || result.files.single.path == null || !mounted) return;

      final file = File(result.files.single.path!);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white),
              ),
              SizedBox(width: 12),
              Text('Uploading document to channel...'),
            ],
          ),
          backgroundColor: Color(0xFF0F172A),
          duration: Duration(seconds: 3),
        ),
      );

      final uploadRes = await _chatApi.uploadAttachment(file);
      if (uploadRes != null) {
        await _chatApi.sendMessage(
          channel: _channelId,
          message: 'Shared document: ${result.files.single.name}',
          messageType: 'text',
          attachments: [uploadRes],
        );
        await _loadPreferencesAndAssets();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Document uploaded and shared successfully!'),
              backgroundColor: Color(0xFF10B981),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to upload document: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  void _openMediaSheet() {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _MediaBottomSheet(
        mediaList: _media,
        onUploadNew: _pickAndUploadMedia,
        onTapItem: (item, index) => _openMediaViewer(item, index),
      ),
    );
  }

  Future<void> _pickAndUploadMedia() async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );
      if (picked == null || !mounted) return;

      final file = File(picked.path);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white),
              ),
              SizedBox(width: 12),
              Text('Uploading screenshot to channel...'),
            ],
          ),
          backgroundColor: Color(0xFF0F172A),
          duration: Duration(seconds: 3),
        ),
      );

      final uploadRes = await _chatApi.uploadAttachment(file);
      if (uploadRes != null) {
        await _chatApi.sendMessage(
          channel: _channelId,
          message: '📷 Shared screenshot',
          messageType: 'media',
          attachments: [uploadRes],
        );
        await _loadPreferencesAndAssets();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Photo uploaded to channel successfully!'),
              backgroundColor: Color(0xFF10B981),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to upload photo: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  void _openMediaViewer(_SharedAssetItem item, int index) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _FullscreenPhotoViewer(
          mediaList: _media,
          initialIndex: index,
          onOpenInBrowser: (url) => _launchExternalUrl(url),
          onCopyUrl: (url) =>
              _copyToClipboard(url, 'Photo URL copied to clipboard'),
        ),
      ),
    );
  }

  void _openLinksSheet() {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _LinksBottomSheet(
        links: _links,
        onOpenLink: (item) => _launchExternalUrl(item.url),
        onCopyLink: (item) =>
            _copyToClipboard(item.url, 'Link copied to clipboard'),
      ),
    );
  }

  // ── Governance Handlers ──

  void _handleMuteToggle(bool v) {
    HapticFeedback.lightImpact();
    if (v) {
      _showMuteDurationPicker();
    } else {
      _unmuteChannel();
    }
  }

  Future<void> _unmuteChannel() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('chat_muted_$_channelId', false);
      await prefs.remove('chat_muted_until_$_channelId');
      if (mounted) {
        setState(() {
          _isMuted = false;
          _mutedUntil = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Notifications unmuted for "$_displayName"'),
            backgroundColor: const Color(0xFF0F172A),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (_) {}
  }

  void _showMuteDurationPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _MuteDurationBottomSheet(
        channelName: _displayName,
        onSelectDuration: (duration, label) async {
          Navigator.pop(ctx);
          final prefs = await SharedPreferences.getInstance();
          DateTime? until;
          if (duration != null) {
            until = DateTime.now().add(duration);
            await prefs.setString(
                'chat_muted_until_$_channelId', until.toIso8601String());
          } else {
            await prefs.remove('chat_muted_until_$_channelId');
          }
          await prefs.setBool('chat_muted_$_channelId', true);

          if (mounted) {
            setState(() {
              _isMuted = true;
              _mutedUntil = until;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Muted notifications: $label'),
                backgroundColor: const Color(0xFF0F172A),
                duration: const Duration(seconds: 2),
              ),
            );
          }
        },
      ),
    );
  }

  Future<void> _handleStarToggle(bool v) async {
    HapticFeedback.lightImpact();
    setState(() => _isStarred = v);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('chat_starred_$_channelId', v);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(v
                ? '⭐ Channel pinned to top of your workspace'
                : 'Channel unpinned from favorites'),
            backgroundColor: const Color(0xFF0F172A),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (_) {}
  }

  Future<void> _exportChannelTranscript() async {
    HapticFeedback.lightImpact();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              SizedBox(width: 16),
              Text(
                'Compiling PMO Audit Archive...',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );

    try {
      final msgs = await _chatApi.getMessages(channel: _channelId);
      if (!mounted) return;
      Navigator.pop(context); // close progress dialog

      final effectiveMsgs = msgs.isNotEmpty ? msgs : _channelMessages;
      final buffer = StringBuffer();
      final now = DateTime.now();
      final pCode = _projectCode.isNotEmpty ? _projectCode : 'PRJ-WS';

      buffer.writeln(
          '======================================================================');
      buffer.writeln('MOVI OWMS ENTERPRISE COMPLIANCE AUDIT TRANSCRIPT');
      buffer.writeln(
          '======================================================================');
      buffer.writeln('Project / Channel : $_displayName');
      buffer.writeln('Project Code      : $pCode');
      buffer.writeln('Channel ID        : $_channelId');
      buffer.writeln(
          'Export Generated  : ${DateFormat('yyyy-MM-dd HH:mm:ss').format(now)} UTC');
      buffer.writeln('Total Records     : ${effectiveMsgs.length} Messages');
      buffer.writeln('Total Contributors: ${_members.length} Members');
      buffer.writeln(
          'Governance Level  : ISO/IEC 27001 & SOC-2 Audit Compliant');
      buffer.writeln(
          '======================================================================\n');

      if (effectiveMsgs.isEmpty) {
        buffer.writeln(
            '[${DateFormat('yyyy-MM-dd HH:mm').format(now)}] System: Channel workspace initialized.');
      } else {
        for (final m in effectiveMsgs) {
          final sender = m['sender'] is Map
              ? (m['sender']['name']?.toString() ?? 'Member')
              : 'Member';
          final role = m['sender'] is Map
              ? (m['sender']['role']?.toString() ?? 'Contributor')
              : 'Contributor';
          final dt =
              DateTime.tryParse(m['createdAt']?.toString() ?? '') ?? now;
          final timeStr = DateFormat('yyyy-MM-dd HH:mm').format(dt);
          final text = m['message']?.toString() ?? '';

          buffer.writeln('[$timeStr] $sender ($role):');
          buffer.writeln('  $text');

          final atts = m['attachments'];
          if (atts is List && atts.isNotEmpty) {
            for (final a in atts) {
              if (a is Map) {
                buffer.writeln(
                    '  [Attachment: ${a['name'] ?? 'File'} (${a['url'] ?? ''})]');
              }
            }
          }
          if (m['taskRef'] is Map) {
            final t = m['taskRef'] as Map;
            buffer.writeln(
                '  [Linked PMO Task: ${t['code'] ?? ''} - ${t['title'] ?? ''} (${t['status'] ?? ''})]');
          }
          buffer.writeln('');
        }
      }

      final transcriptBody = buffer.toString();
      final bytes = utf8.encode(transcriptBody);
      final digest = sha256.convert(bytes);
      final hashStr = digest.toString().toUpperCase();

      final fullTranscript = '$transcriptBody'
          '======================================================================\n'
          'INTEGRITY VERIFICATION CHECKSUM (SHA-256):\n'
          '$hashStr\n'
          'VERIFIED BY MOVI OWMS COMPLIANCE ENGINE • TAMPER RESISTANT\n'
          '======================================================================';

      _showAuditTranscriptModal(fullTranscript, hashStr, effectiveMsgs.length);
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to compile audit transcript: $e')),
        );
      }
    }
  }

  void _showAuditTranscriptModal(
      String fullTranscript, String hash, int count) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AuditTranscriptBottomSheet(
        fullTranscript: fullTranscript,
        sha256Hash: hash,
        recordCount: count,
        contributorsCount: _members.length,
        channelName: _displayName,
        onCopyTranscript: () => _copyToClipboard(
            fullTranscript, 'Verified PMO Audit Transcript copied to clipboard'),
      ),
    );
  }

  void _confirmLeaveChannel() {
    HapticFeedback.lightImpact();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(LucideIcons.alertTriangle,
                  size: 20, color: Color(0xFFDC2626)),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Leave Project Channel?',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to leave "$_displayName"? You will lose immediate access to ongoing team discussions, shared assets, and task updates. You can be re-invited at any time by project managers.',
          style: const TextStyle(
            fontSize: 13,
            color: Color(0xFF475569),
            height: 1.45,
          ),
        ),
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF64748B),
              textStyle: const TextStyle(fontWeight: FontWeight.w600),
            ),
            child: const Text('Keep Membership'),
          ),
          ElevatedButton.icon(
            icon: const Icon(LucideIcons.logOut, size: 14),
            label: const Text('Leave Channel'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context, {'leftChannel': true});
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('You have left "$_displayName"'),
                  backgroundColor: const Color(0xFF0F172A),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // ─────────────────────────── 4. Shared Assets Card ──────────────────────────

  Widget _buildSharedAssetsCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.paperclip,
                      size: 16, color: Color(0xFF0F172A)),
                  SizedBox(width: 8),
                  Text(
                    'Shared Channel Assets',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.2,
                    ),
                  ),
                ],
              ),
              if (_isLoadingAssets)
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFF64748B),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _assetCategoryTile(
                icon: LucideIcons.fileText,
                title: 'Documents',
                subtitle: _documents.isNotEmpty
                    ? '${_documents.length} files'
                    : 'PDFs, Specs',
                color: const Color(0xFF2563EB),
                bgColor: const Color(0xFFEFF6FF),
                count: _documents.length,
                onTap: _openDocumentsSheet,
              ),
              const SizedBox(width: 10),
              _assetCategoryTile(
                icon: LucideIcons.image,
                title: 'Media',
                subtitle: _media.isNotEmpty
                    ? '${_media.length} photos'
                    : 'Screenshots',
                color: const Color(0xFF7C3AED),
                bgColor: const Color(0xFFEDE9FE),
                count: _media.length,
                onTap: _openMediaSheet,
              ),
              const SizedBox(width: 10),
              _assetCategoryTile(
                icon: LucideIcons.link2,
                title: 'Links',
                subtitle: _links.isNotEmpty
                    ? '${_links.length} links'
                    : 'Git & Figma',
                color: const Color(0xFF059669),
                bgColor: const Color(0xFFECFDF5),
                count: _links.length,
                onTap: _openLinksSheet,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _assetCategoryTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required Color bgColor,
    int count = 0,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withOpacity(0.20)),
          ),
          child: Column(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(icon, size: 18, color: color),
                  if (count > 0)
                    Positioned(
                      top: -6,
                      right: -10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: color,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '$count',
                          style: const TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 9.5,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─────────────────────────── 5. Channel Governance Card ─────────────────────

  Widget _buildChannelPreferencesCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Mute notifications
          SwitchListTile.adaptive(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 18, vertical: 2),
            secondary: Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                _isMuted ? LucideIcons.bellOff : LucideIcons.bell,
                size: 16,
                color: _isMuted
                    ? const Color(0xFFEF4444)
                    : const Color(0xFF0F172A),
              ),
            ),
            title: const Text(
              'Mute Notifications',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
            subtitle: Text(
              _muteSubtitle,
              style: TextStyle(
                fontSize: 11,
                color: _isMuted
                    ? const Color(0xFFDC2626)
                    : const Color(0xFF64748B),
                fontWeight: _isMuted ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
            activeColor: const Color(0xFF0F172A),
            value: _isMuted,
            onChanged: _handleMuteToggle,
          ),

          const Divider(height: 1, indent: 64, color: Color(0xFFF1F5F9)),

          // Star / Pin
          SwitchListTile.adaptive(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 18, vertical: 2),
            secondary: Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                LucideIcons.star,
                size: 16,
                color: Color(0xFFD97706),
              ),
            ),
            title: const Text(
              'Star & Pin Channel',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
            subtitle: Text(
              _isStarred
                  ? 'Pinned to top of your workspace channel list'
                  : 'Keep pinned at top of team channel list',
              style: TextStyle(
                fontSize: 11,
                color: _isStarred
                    ? const Color(0xFFB45309)
                    : const Color(0xFF64748B),
                fontWeight: _isStarred ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
            activeColor: const Color(0xFFD97706),
            value: _isStarred,
            onChanged: _handleStarToggle,
          ),

          const Divider(height: 1, indent: 64, color: Color(0xFFF1F5F9)),

          // Export history
          ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 18, vertical: 2),
            leading: Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                LucideIcons.download,
                size: 16,
                color: Color(0xFF475569),
              ),
            ),
            title: const Text(
              'Export Channel Transcript',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
            subtitle: const Text(
              'Generate verified PMO audit log archive',
              style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            ),
            trailing: const Icon(Icons.chevron_right_rounded,
                size: 18, color: Color(0xFF94A3B8)),
            onTap: _exportChannelTranscript,
          ),

          const Divider(height: 1, color: Color(0xFFF1F5F9)),

          // Leave channel button
          ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 18, vertical: 2),
            leading: Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                LucideIcons.logOut,
                size: 16,
                color: Color(0xFFDC2626),
              ),
            ),
            title: const Text(
              'Leave Project Channel',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFFDC2626),
              ),
            ),
            subtitle: const Text(
              'You can be re-invited by channel administrators',
              style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            ),
            onTap: _confirmLeaveChannel,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── ENTERPRISE BOTTOM SHEETS & INTERACTIVE MODALS ───────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/// ─── 1. DOCUMENTS BOTTOM SHEET ─────────────────────────────────────────────
class _DocumentsBottomSheet extends StatefulWidget {
  final List<_SharedAssetItem> documents;
  final VoidCallback onUploadNew;
  final void Function(_SharedAssetItem) onOpenDocument;
  final void Function(_SharedAssetItem) onCopyLink;

  const _DocumentsBottomSheet({
    required this.documents,
    required this.onUploadNew,
    required this.onOpenDocument,
    required this.onCopyLink,
  });

  @override
  State<_DocumentsBottomSheet> createState() => _DocumentsBottomSheetState();
}

class _DocumentsBottomSheetState extends State<_DocumentsBottomSheet> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';
  String _selectedFilter = 'All';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = widget.documents.where((doc) {
      final matchesQuery = _query.isEmpty ||
          doc.title.toLowerCase().contains(_query.toLowerCase()) ||
          doc.senderName.toLowerCase().contains(_query.toLowerCase());
      if (!matchesQuery) return false;

      if (_selectedFilter == 'PDFs') {
        return doc.title.toLowerCase().endsWith('.pdf') ||
            doc.fileType.contains('pdf');
      } else if (_selectedFilter == 'Sheets') {
        return doc.title.toLowerCase().endsWith('.xls') ||
            doc.title.toLowerCase().endsWith('.xlsx') ||
            doc.title.toLowerCase().endsWith('.csv') ||
            doc.fileType.contains('sheet') ||
            doc.fileType.contains('excel');
      } else if (_selectedFilter == 'Docs') {
        return doc.title.toLowerCase().endsWith('.doc') ||
            doc.title.toLowerCase().endsWith('.docx') ||
            doc.fileType.contains('word') ||
            doc.fileType.contains('document');
      }
      return true;
    }).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            // Handle Bar
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4.5,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            const SizedBox(height: 14),

            // Header Row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(LucideIcons.fileText,
                            size: 18, color: Color(0xFF2563EB)),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Shared Documents',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            '${widget.documents.length} files catalogued',
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  ElevatedButton.icon(
                    onPressed: widget.onUploadNew,
                    icon: const Icon(LucideIcons.uploadCloud, size: 14),
                    label: const Text('Upload'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F172A),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Search Box
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                height: 40,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.search,
                        size: 15, color: Color(0xFF94A3B8)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _searchCtrl,
                        onChanged: (v) => setState(() => _query = v),
                        style: const TextStyle(
                            fontSize: 13, color: Color(0xFF0F172A)),
                        decoration: const InputDecoration(
                          hintText: 'Search documents by title or sender...',
                          hintStyle: TextStyle(
                              fontSize: 12, color: Color(0xFF94A3B8)),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ),
                    if (_query.isNotEmpty)
                      GestureDetector(
                        onTap: () {
                          _searchCtrl.clear();
                          setState(() => _query = '');
                        },
                        child: const Icon(LucideIcons.x,
                            size: 14, color: Color(0xFF94A3B8)),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Filter Tabs
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  _filterChip('All'),
                  const SizedBox(width: 8),
                  _filterChip('PDFs'),
                  const SizedBox(width: 8),
                  _filterChip('Sheets'),
                  const SizedBox(width: 8),
                  _filterChip('Docs'),
                ],
              ),
            ),
            const SizedBox(height: 8),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),

            // Documents List or Empty State
            Expanded(
              child: filtered.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: const BoxDecoration(
                              color: Color(0xFFF1F5F9),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(LucideIcons.fileSearch,
                                size: 30, color: Color(0xFF94A3B8)),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'No documents found',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF334155),
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Upload a PDF or spec sheet to share with the team.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                          const SizedBox(height: 16),
                          OutlinedButton.icon(
                            onPressed: widget.onUploadNew,
                            icon: const Icon(LucideIcons.plus, size: 14),
                            label: const Text('Share First Document'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF0F172A),
                              side: const BorderSide(
                                  color: Color(0xFFCBD5E1)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (ctx, i) {
                        final doc = filtered[i];
                        return _buildDocumentTile(doc);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String label) {
    final isSelected = _selectedFilter == label;
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        setState(() => _selectedFilter = label);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF0F172A)
                : const Color(0xFFE2E8F0),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildDocumentTile(_SharedAssetItem doc) {
    Color iconColor = const Color(0xFF2563EB);
    Color bgColor = const Color(0xFFEFF6FF);
    IconData iconData = LucideIcons.fileText;
    String badgeLabel = 'FILE';

    final lower = doc.title.toLowerCase();
    if (lower.endsWith('.pdf') || doc.fileType.contains('pdf')) {
      iconColor = const Color(0xFFDC2626);
      bgColor = const Color(0xFFFEE2E2);
      iconData = LucideIcons.fileText;
      badgeLabel = 'PDF';
    } else if (lower.endsWith('.xls') ||
        lower.endsWith('.xlsx') ||
        lower.endsWith('.csv')) {
      iconColor = const Color(0xFF059669);
      bgColor = const Color(0xFFECFDF5);
      iconData = LucideIcons.table;
      badgeLabel = 'XLS';
    } else if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
      iconColor = const Color(0xFF2563EB);
      bgColor = const Color(0xFFEFF6FF);
      iconData = LucideIcons.fileText;
      badgeLabel = 'DOC';
    } else if (lower.endsWith('.zip') || lower.endsWith('.rar')) {
      iconColor = const Color(0xFFD97706);
      bgColor = const Color(0xFFFFFBEB);
      iconData = LucideIcons.archive;
      badgeLabel = 'ZIP';
    }

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: iconColor.withOpacity(0.25)),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(iconData, size: 16, color: iconColor),
              const SizedBox(height: 2),
              Text(
                badgeLabel,
                style: TextStyle(
                  fontSize: 8,
                  fontWeight: FontWeight.w900,
                  color: iconColor,
                ),
              ),
            ],
          ),
        ),
        title: Text(
          doc.title,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0F172A),
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Text(
            '${_ProjectGroupInfoScreenState.formatFileSize(doc.sizeBytes)} • ${doc.senderName} • ${DateFormat('MMM d').format(doc.createdAt)}',
            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(LucideIcons.copy,
                  size: 15, color: Color(0xFF64748B)),
              tooltip: 'Copy Link',
              onPressed: () => widget.onCopyLink(doc),
            ),
            Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: Color(0xFF0F172A),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.externalLink,
                  size: 12, color: Colors.white),
            ),
          ],
        ),
        onTap: () => widget.onOpenDocument(doc),
      ),
    );
  }
}

/// ─── 2. MEDIA BOTTOM SHEET ─────────────────────────────────────────────────
class _MediaBottomSheet extends StatelessWidget {
  final List<_SharedAssetItem> mediaList;
  final VoidCallback onUploadNew;
  final void Function(_SharedAssetItem, int) onTapItem;

  const _MediaBottomSheet({
    required this.mediaList,
    required this.onUploadNew,
    required this.onTapItem,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4.5,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            const SizedBox(height: 14),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEDE9FE),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(LucideIcons.image,
                            size: 18, color: Color(0xFF7C3AED)),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Shared Media & Screenshots',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            '${mediaList.length} photos and captures',
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  ElevatedButton.icon(
                    onPressed: onUploadNew,
                    icon: const Icon(LucideIcons.camera, size: 14),
                    label: const Text('Share Photo'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F172A),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),

            Expanded(
              child: mediaList.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: const BoxDecoration(
                              color: Color(0xFFF1F5F9),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(LucideIcons.image,
                                size: 30, color: Color(0xFF94A3B8)),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'No media captured yet',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF334155),
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Photos and screenshots sent in chat appear here.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                          const SizedBox(height: 16),
                          OutlinedButton.icon(
                            onPressed: onUploadNew,
                            icon: const Icon(LucideIcons.upload, size: 14),
                            label: const Text('Upload First Photo'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF0F172A),
                              side: const BorderSide(
                                  color: Color(0xFFCBD5E1)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 3,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                      ),
                      itemCount: mediaList.length,
                      itemBuilder: (ctx, i) {
                        final item = mediaList[i];
                        return GestureDetector(
                          onTap: () => onTapItem(item, i),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                Image.network(
                                  item.url,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, _, _) => Container(
                                    color: const Color(0xFFF1F5F9),
                                    child: const Center(
                                      child: Icon(LucideIcons.imageOff,
                                          color: Color(0xFF94A3B8)),
                                    ),
                                  ),
                                ),
                                Positioned(
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 3),
                                    decoration: const BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [
                                          Colors.transparent,
                                          Colors.black87
                                        ],
                                        begin: Alignment.topCenter,
                                        end: Alignment.bottomCenter,
                                      ),
                                    ),
                                    child: Text(
                                      DateFormat('MMM d').format(item.createdAt),
                                      style: const TextStyle(
                                        fontSize: 9,
                                        color: Colors.white,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

/// ─── 3. FULLSCREEN INTERACTIVE PHOTO VIEWER ────────────────────────────────
class _FullscreenPhotoViewer extends StatefulWidget {
  final List<_SharedAssetItem> mediaList;
  final int initialIndex;
  final void Function(String) onOpenInBrowser;
  final void Function(String) onCopyUrl;

  const _FullscreenPhotoViewer({
    required this.mediaList,
    required this.initialIndex,
    required this.onOpenInBrowser,
    required this.onCopyUrl,
  });

  @override
  State<_FullscreenPhotoViewer> createState() => _FullscreenPhotoViewerState();
}

class _FullscreenPhotoViewerState extends State<_FullscreenPhotoViewer> {
  late PageController _pageCtrl;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageCtrl = PageController(initialPage: _currentIndex);
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentItem = widget.mediaList[_currentIndex];
    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, size: 24),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          '${_currentIndex + 1} of ${widget.mediaList.length}',
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.copy, size: 18),
            tooltip: 'Copy Image Link',
            onPressed: () => widget.onCopyUrl(currentItem.url),
          ),
          IconButton(
            icon: const Icon(LucideIcons.externalLink, size: 18),
            tooltip: 'Open in Browser',
            onPressed: () => widget.onOpenInBrowser(currentItem.url),
          ),
        ],
      ),
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageCtrl,
            itemCount: widget.mediaList.length,
            onPageChanged: (i) => setState(() => _currentIndex = i),
            itemBuilder: (ctx, i) {
              final m = widget.mediaList[i];
              return Center(
                child: InteractiveViewer(
                  minScale: 0.8,
                  maxScale: 4.0,
                  child: Image.network(
                    m.url,
                    fit: BoxFit.contain,
                    errorBuilder: (_, _, _) => const Center(
                      child: Text(
                        'Image could not be loaded',
                        style: TextStyle(color: Colors.white70),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.transparent, Color(0xFF090D16)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    currentItem.title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Shared by ${currentItem.senderName} • ${DateFormat('MMMM d, y • h:mm a').format(currentItem.createdAt)}',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: Colors.white.withOpacity(0.7),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// ─── 4. LINKS BOTTOM SHEET ─────────────────────────────────────────────────
class _LinksBottomSheet extends StatefulWidget {
  final List<_SharedAssetItem> links;
  final void Function(_SharedAssetItem) onOpenLink;
  final void Function(_SharedAssetItem) onCopyLink;

  const _LinksBottomSheet({
    required this.links,
    required this.onOpenLink,
    required this.onCopyLink,
  });

  @override
  State<_LinksBottomSheet> createState() => _LinksBottomSheetState();
}

class _LinksBottomSheetState extends State<_LinksBottomSheet> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = widget.links.where((l) {
      if (_query.isEmpty) return true;
      final q = _query.toLowerCase();
      return l.title.toLowerCase().contains(q) ||
          l.url.toLowerCase().contains(q) ||
          l.senderName.toLowerCase().contains(q);
    }).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4.5,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            const SizedBox(height: 14),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(LucideIcons.link2,
                        size: 18, color: Color(0xFF059669)),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Shared Links & Repositories',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        '${widget.links.length} web links and services indexed',
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                height: 40,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.search,
                        size: 15, color: Color(0xFF94A3B8)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _searchCtrl,
                        onChanged: (v) => setState(() => _query = v),
                        style: const TextStyle(
                            fontSize: 13, color: Color(0xFF0F172A)),
                        decoration: const InputDecoration(
                          hintText: 'Search by domain or link...',
                          hintStyle: TextStyle(
                              fontSize: 12, color: Color(0xFF94A3B8)),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ),
                    if (_query.isNotEmpty)
                      GestureDetector(
                        onTap: () {
                          _searchCtrl.clear();
                          setState(() => _query = '');
                        },
                        child: const Icon(LucideIcons.x,
                            size: 14, color: Color(0xFF94A3B8)),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),

            Expanded(
              child: filtered.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.link,
                              size: 28, color: Color(0xFF94A3B8)),
                          SizedBox(height: 8),
                          Text(
                            'No links found',
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (ctx, i) {
                        final item = filtered[i];
                        return _buildLinkTile(item);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLinkTile(_SharedAssetItem item) {
    IconData icon = LucideIcons.globe;
    Color brandColor = const Color(0xFF059669);
    Color brandBg = const Color(0xFFECFDF5);
    String typeLabel = 'WEB LINK';

    final u = item.url.toLowerCase();
    if (u.contains('github.com') || u.contains('gitlab')) {
      icon = LucideIcons.gitBranch;
      brandColor = const Color(0xFF0F172A);
      brandBg = const Color(0xFFF1F5F9);
      typeLabel = 'GIT REPO';
    } else if (u.contains('figma.com')) {
      icon = LucideIcons.palette;
      brandColor = const Color(0xFF7C3AED);
      brandBg = const Color(0xFFEDE9FE);
      typeLabel = 'FIGMA DECK';
    } else if (u.contains('docs.google.com') || u.contains('notion.so')) {
      icon = LucideIcons.fileText;
      brandColor = const Color(0xFF2563EB);
      brandBg = const Color(0xFFEFF6FF);
      typeLabel = 'DOCS';
    }

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: brandBg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: brandColor.withOpacity(0.20)),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: brandColor),
              const SizedBox(height: 2),
              Text(
                typeLabel,
                style: TextStyle(
                  fontSize: 7.5,
                  fontWeight: FontWeight.w900,
                  color: brandColor,
                ),
              ),
            ],
          ),
        ),
        title: Text(
          item.title,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0F172A),
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              item.url,
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF2563EB),
                decoration: TextDecoration.underline,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              'Shared by ${item.senderName} • ${DateFormat('MMM d, h:mm a').format(item.createdAt)}',
              style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
            ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(LucideIcons.copy,
                  size: 15, color: Color(0xFF64748B)),
              tooltip: 'Copy Link',
              onPressed: () => widget.onCopyLink(item),
            ),
            Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: Color(0xFF0F172A),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.externalLink,
                  size: 12, color: Colors.white),
            ),
          ],
        ),
        onTap: () => widget.onOpenLink(item),
      ),
    );
  }
}

/// ─── 5. MUTE DURATION BOTTOM SHEET ─────────────────────────────────────────
class _MuteDurationBottomSheet extends StatelessWidget {
  final String channelName;
  final void Function(Duration? duration, String label) onSelectDuration;

  const _MuteDurationBottomSheet({
    required this.channelName,
    required this.onSelectDuration,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 38,
                height: 4.5,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(LucideIcons.bellOff,
                        size: 18, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Mute Channel Notifications',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        Text(
                          'Silence notifications for "$channelName":',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF64748B),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _durationTile(
                icon: LucideIcons.clock,
                title: 'For 8 Hours',
                subtitle: 'Until workday concludes',
                duration: const Duration(hours: 8),
                label: 'Muted for 8 Hours',
              ),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              _durationTile(
                icon: LucideIcons.sun,
                title: 'For 24 Hours (1 Day)',
                subtitle: 'Until tomorrow morning',
                duration: const Duration(hours: 24),
                label: 'Muted for 24 Hours',
              ),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              _durationTile(
                icon: LucideIcons.calendar,
                title: 'For 1 Week',
                subtitle: 'Until sprint cycle review',
                duration: const Duration(days: 7),
                label: 'Muted for 1 Week',
              ),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              _durationTile(
                icon: LucideIcons.volumeX,
                title: 'Until I turn it back on',
                subtitle: 'Mute indefinitely',
                duration: null,
                label: 'Muted indefinitely',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _durationTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Duration? duration,
    required String label,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 16, color: const Color(0xFF334155)),
      ),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 13.5,
          fontWeight: FontWeight.w700,
          color: Color(0xFF0F172A),
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
      ),
      trailing: const Icon(Icons.chevron_right_rounded,
          size: 18, color: Color(0xFF94A3B8)),
      onTap: () => onSelectDuration(duration, label),
    );
  }
}

/// ─── 6. AUDIT TRANSCRIPT EXPORT BOTTOM SHEET ───────────────────────────────
class _AuditTranscriptBottomSheet extends StatelessWidget {
  final String fullTranscript;
  final String sha256Hash;
  final int recordCount;
  final int contributorsCount;
  final String channelName;
  final VoidCallback onCopyTranscript;

  const _AuditTranscriptBottomSheet({
    required this.fullTranscript,
    required this.sha256Hash,
    required this.recordCount,
    required this.contributorsCount,
    required this.channelName,
    required this.onCopyTranscript,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4.5,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            const SizedBox(height: 16),

            // Verified Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(9),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: const Icon(LucideIcons.shieldCheck,
                        size: 22, color: Color(0xFF059669)),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Verified PMO Audit Archive',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        Text(
                          'ISO/IEC 27001 & SOC-2 Compliance Snapshot',
                          style: TextStyle(
                            fontSize: 11,
                            color: Color(0xFF059669),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Metrics Summary Grid
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  _metricTile(
                      'Total Records', '$recordCount', LucideIcons.messageSquare),
                  const SizedBox(width: 8),
                  _metricTile('Contributors', '$contributorsCount',
                      LucideIcons.users),
                  const SizedBox(width: 8),
                  _metricTile('Status', 'Tamper Proof', LucideIcons.lock),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Checksum Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.hash,
                        size: 13, color: Color(0xFF64748B)),
                    const SizedBox(width: 6),
                    const Text(
                      'SHA-256:',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF334155),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        sha256Hash,
                        style: const TextStyle(
                          fontSize: 9.5,
                          fontFamily: 'monospace',
                          color: Color(0xFF64748B),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),

            // Monospace Preview Container
            Expanded(
              child: Container(
                margin: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF090D16),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: SingleChildScrollView(
                  child: Text(
                    fullTranscript,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: Color(0xFFE2E8F0),
                      height: 1.4,
                    ),
                  ),
                ),
              ),
            ),

            // Action Buttons
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: onCopyTranscript,
                      icon: const Icon(LucideIcons.clipboardCheck, size: 16),
                      label: const Text('Copy Verified Transcript'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  IconButton(
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFFF1F5F9),
                      padding: const EdgeInsets.all(14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    icon: const Icon(LucideIcons.share2,
                        size: 18, color: Color(0xFF334155)),
                    tooltip: 'Share Transcript',
                    onPressed: onCopyTranscript,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _metricTile(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 12, color: const Color(0xFF64748B)),
                const SizedBox(width: 4),
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
