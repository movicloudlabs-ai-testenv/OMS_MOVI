import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../models/user_profile.dart';
import '../../../../core/widgets/shimmer_skeleton.dart';
import '../../../../core/widgets/enterprise_pull_to_refresh.dart';
import '../../data/admin_api.dart';
import '../../../pmo/presentation/screens/project_dossier_screen.dart';

class UserDossierScreen extends StatefulWidget {
  final String userId;
  final UserProfile? initialUser;

  const UserDossierScreen({
    super.key,
    required this.userId,
    this.initialUser,
  });

  @override
  State<UserDossierScreen> createState() => _UserDossierScreenState();
}

class _UserDossierScreenState extends State<UserDossierScreen> with TickerProviderStateMixin {
  final AdminApi _api = AdminApi();

  bool _isLoading = true;
  String? _errorMessage;

  Map<String, dynamic>? _userData;
  List<Map<String, dynamic>> _allProjects = [];

  // Categorized projects (Real Data)
  List<Map<String, dynamic>> _currentProjects = [];
  List<Map<String, dynamic>> _pastProjects = [];
  List<Map<String, dynamic>> _nextProjects = [];

  late TabController _mainTabController;
  int _selectedProjectHorizon = 0; // 0: Active, 1: Past, 2: Pipeline
  bool _showDailyHistory = false;

  @override
  void initState() {
    super.initState();
    _mainTabController = TabController(length: 4, vsync: this);
    _loadDossierData();
  }

  @override
  void dispose() {
    _mainTabController.dispose();
    super.dispose();
  }

  Future<void> _loadDossierData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        _api.getUserFullDossier(widget.userId),
        _api.getUserProjects(widget.userId),
      ]);

      if (!mounted) return;

      final userData = results[0] as Map<String, dynamic>;
      final projects = results[1] as List<Map<String, dynamic>>;

      final current = <Map<String, dynamic>>[];
      final past = <Map<String, dynamic>>[];
      final next = <Map<String, dynamic>>[];

      for (final p in projects) {
        final status = (p['status'] ?? '').toString().toLowerCase();
        if (status == 'completed' || status == 'finished' || status == 'closed') {
          past.add(p);
        } else if (status == 'planning' || status == 'on-hold' || status == 'upcoming' || status == 'scheduled') {
          next.add(p);
        } else {
          current.add(p);
        }
      }

      setState(() {
        _userData = userData;
        _allProjects = projects;
        _currentProjects = current;
        _pastProjects = past;
        _nextProjects = next;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Failed to load personnel dossier: $e';
        _isLoading = false;
      });
    }
  }

  // ── OWNER ACTIONS ──────────────────────────────────────────────────────────

  Future<void> _handleStatusChange(String newStatus) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            Icon(
              newStatus == 'Active' ? LucideIcons.userCheck : LucideIcons.shieldAlert,
              color: newStatus == 'Active' ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              size: 20,
            ),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'Confirm Status Change',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        content: Text(
          'Set account status to "$newStatus"?\n\n'
          '${newStatus == "Suspended" ? "The user will immediately be barred from signing in across mobile & web platforms." : "User credentials and permissions will be restored in real time."}',
          style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: newStatus == 'Suspended' ? const Color(0xFFEF4444) : const Color(0xFF2563EB),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirm', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final success = await _api.updateUserStatus(widget.userId, newStatus);
      if (success) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Account status updated to $newStatus'),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
          ),
        );
        _loadDossierData();
      } else {
        throw Exception('Server rejected status update');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: const Color(0xFFEF4444), behavior: SnackBarBehavior.floating),
      );
    }
  }

  Future<void> _handlePasswordReset() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Row(
          children: [
            Icon(LucideIcons.key, color: Color(0xFFF59E0B), size: 20),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Reset Credentials',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        content: const Text(
          'This will invalidate the current password and generate a fresh temporary password directly on your screen.',
          style: TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF59E0B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Generate Password', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final tempPassword = await _api.resetUserPassword(widget.userId);
      if (!mounted) return;

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: const Row(
            children: [
              Icon(LucideIcons.shieldCheck, color: Color(0xFF10B981), size: 20),
              SizedBox(width: 8),
              Expanded(
                child: Text('New Temporary Credential', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Share this temporary password securely with the user:',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: SelectableText(
                        tempPassword ?? 'Unavailable',
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          letterSpacing: 1.1,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.copy, size: 18, color: Color(0xFF2563EB)),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: tempPassword ?? ''));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Password copied to clipboard'),
                            behavior: SnackBarBehavior.floating,
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F172A),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Done', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to reset password: $e'), backgroundColor: const Color(0xFFEF4444)),
      );
    }
  }

  Future<void> _handleDeletionImpact() async {
    try {
      final impact = await _api.getUserDeletionImpact(widget.userId);
      if (!mounted) return;

      final managedProjects = (impact?['managedProjects'] as List?) ?? [];
      final memberProjects = (impact?['memberProjects'] as List?) ?? [];
      final openTaskCount = impact?['openTaskCount'] ?? 0;

      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (ctx) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 16,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 14),
              const Row(
                children: [
                  Icon(LucideIcons.shieldAlert, color: Color(0xFFEF4444), size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Offboarding Impact Forensics',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Live ledger analysis of assets and commitments assigned to this personnel:',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 14),
              _buildImpactRow(
                LucideIcons.crown,
                'Projects Under Direct Management',
                '${managedProjects.length}',
                managedProjects.isNotEmpty ? const Color(0xFFEF4444) : const Color(0xFF10B981),
              ),
              const SizedBox(height: 8),
              _buildImpactRow(
                LucideIcons.briefcase,
                'Active Member Projects',
                '${memberProjects.length}',
                const Color(0xFF2563EB),
              ),
              const SizedBox(height: 8),
              _buildImpactRow(
                LucideIcons.checkSquare,
                'Open Tasks Requiring Reassignment',
                '$openTaskCount',
                openTaskCount > 0 ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F172A),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Close Forensic Preview', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to calculate impact: $e'), backgroundColor: const Color(0xFFEF4444)),
      );
    }
  }

  Widget _buildImpactRow(IconData icon, String label, String value, Color accentColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: accentColor),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: accentColor.withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
            child: Text(
              value,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: accentColor),
            ),
          ),
        ],
      ),
    );
  }

  // ── UI BUILD ──────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Color(0xFF0F172A), size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Personnel 360° Profile',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            Text(
              _userData?['employeeId'] ?? widget.initialUser?.employeeId ?? 'Executive Ledger',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, color: Color(0xFF2563EB), size: 18),
            tooltip: 'Refresh Ledger',
            onPressed: _loadDossierData,
          ),
          PopupMenuButton<String>(
            icon: const Icon(LucideIcons.moreVertical, color: Color(0xFF475569), size: 20),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            onSelected: (action) {
              if (action == 'reset_pwd') _handlePasswordReset();
              if (action == 'status_active') _handleStatusChange('Active');
              if (action == 'status_suspended') _handleStatusChange('Suspended');
              if (action == 'deletion_impact') _handleDeletionImpact();
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(
                value: 'reset_pwd',
                child: Row(
                  children: [
                    Icon(LucideIcons.key, size: 15, color: Color(0xFFF59E0B)),
                    SizedBox(width: 8),
                    Text('Reset Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'status_active',
                child: Row(
                  children: [
                    Icon(LucideIcons.userCheck, size: 15, color: Color(0xFF10B981)),
                    SizedBox(width: 8),
                    Text('Set Active', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'status_suspended',
                child: Row(
                  children: [
                    Icon(LucideIcons.shieldAlert, size: 15, color: Color(0xFFEF4444)),
                    SizedBox(width: 8),
                    Text('Set Suspended', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFFEF4444))),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'deletion_impact',
                child: Row(
                  children: [
                    Icon(LucideIcons.alertTriangle, size: 15, color: Color(0xFF64748B)),
                    SizedBox(width: 8),
                    Text('Offboarding Forensics', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 4),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE2E8F0), height: 1),
        ),
      ),
      body: _isLoading
          ? const SkeletonDossierScreen()
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(LucideIcons.alertOctagon, size: 44, color: Color(0xFFEF4444)),
                        const SizedBox(height: 12),
                        Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 14),
                        ElevatedButton.icon(
                          onPressed: _loadDossierData,
                          icon: const Icon(LucideIcons.refreshCw, size: 15),
                          label: const Text('Retry'),
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
                        ),
                      ],
                    ),
                  ),
                )
              : EnterprisePullToRefresh(
                  onRefresh: _loadDossierData,
                  child: NestedScrollView(
                  headerSliverBuilder: (ctx, innerBoxIsScrolled) => [
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 1. Executive Identity Card
                            _buildIdentityBanner(),

                            const SizedBox(height: 12),

                            // 2. High-Density Executive KPI Strip (Never overflows)
                            _buildKpiRibbon(),
                          ],
                        ),
                      ),
                    ),
                    SliverPersistentHeader(
                      pinned: true,
                      delegate: _SliverAppBarDelegate(
                        TabBar(
                          controller: _mainTabController,
                          isScrollable: true,
                          tabAlignment: TabAlignment.start,
                          labelPadding: const EdgeInsets.symmetric(horizontal: 14),
                          labelColor: const Color(0xFF2563EB),
                          unselectedLabelColor: const Color(0xFF64748B),
                          indicatorColor: const Color(0xFF2563EB),
                          indicatorWeight: 3,
                          indicatorSize: TabBarIndicatorSize.tab,
                          labelStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800),
                          unselectedLabelStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                          tabs: [
                            Tab(
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Text('Projects'),
                                  const SizedBox(width: 4),
                                  _buildTabBadge('${_allProjects.length}', const Color(0xFF2563EB)),
                                ],
                              ),
                            ),
                            Tab(
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Text('Tasks'),
                                  const SizedBox(width: 4),
                                  _buildTabBadge(
                                    '${((_userData?['performance']?['recentTasks'] as List?) ?? []).length}',
                                    const Color(0xFF10B981),
                                  ),
                                ],
                              ),
                            ),
                            const Tab(text: 'Org & Team'),
                            const Tab(text: 'Security'),
                          ],
                        ),
                      ),
                    ),
                  ],
                  body: TabBarView(
                    controller: _mainTabController,
                    children: [
                      // Tab 1: Past, Current, Next Project Horizons
                      _buildProjectsTab(),

                      // Tab 2: Operational Tasks Ledger
                      _buildTasksTab(),

                      // Tab 3: Org Hierarchy & Skills
                      _buildOrgTab(),

                      // Tab 4: Master Security & Governance
                      _buildSecurityTab(),
                    ],
                  ),
                ),
              ),
    );
  }

  Widget _buildTabBadge(String count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        count,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: color),
      ),
    );
  }

  // ── HEADER: IDENTITY BANNER ───────────────────────────────────────────────

  Widget _buildIdentityBanner() {
    final user = _userData ?? {};
    final name = (user['name'] ?? widget.initialUser?.name ?? 'Personnel').toString();
    final email = (user['email'] ?? widget.initialUser?.email ?? 'No email').toString();
    final empId = (user['employeeId'] ?? widget.initialUser?.employeeId ?? 'EMP-N/A').toString();
    final designation = (user['designation'] ?? widget.initialUser?.designation ?? 'Team Member').toString();
    final department = ((user['department'] is Map
            ? user['department']['name']
            : user['department']) ??
        widget.initialUser?.department ??
        'General').toString();
    final rawStatus = (user['status'] ?? widget.initialUser?.status ?? 'Active').toString();
    final employmentType = (user['employmentType'] ?? widget.initialUser?.employmentType ?? 'Full-time').toString();
    final phone = user['phone']?.toString();

    Color statusColor;
    Color statusBg;
    if (rawStatus.toLowerCase() == 'active') {
      statusColor = const Color(0xFF10B981);
      statusBg = const Color(0xFFECFDF5);
    } else if (rawStatus.toLowerCase() == 'suspended') {
      statusColor = const Color(0xFFEF4444);
      statusBg = const Color(0xFFFEF2F2);
    } else {
      statusColor = const Color(0xFF64748B);
      statusBg = const Color(0xFFF1F5F9);
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar with live indicator
              Stack(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: const Color(0xFFEFF6FF),
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : 'U',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 13,
                      height: 13,
                      decoration: BoxDecoration(
                        color: statusColor,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),

              // Name, Title, Badges (Using Flexible/Expanded to eliminate overflow)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: statusBg,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: statusColor.withOpacity(0.3)),
                          ),
                          child: Text(
                            rawStatus.toUpperCase(),
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: statusColor, letterSpacing: 0.4),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      designation,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),

                    // Badges with Wrap (0 overflow guaranteed)
                    Wrap(
                      spacing: 5,
                      runSpacing: 4,
                      children: [
                        _buildHeroTag(LucideIcons.tag, empId, const Color(0xFF334155), const Color(0xFFF1F5F9)),
                        _buildHeroTag(LucideIcons.building, department, const Color(0xFF2563EB), const Color(0xFFEFF6FF)),
                        _buildHeroTag(LucideIcons.briefcase, employmentType, const Color(0xFF64748B), const Color(0xFFF8FAFC)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 10),

          // Contact Strip with copy / action buttons
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: email));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Email copied'), behavior: SnackBarBehavior.floating, duration: Duration(seconds: 1)),
                    );
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.mail, size: 12, color: Color(0xFF64748B)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            email,
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const Icon(LucideIcons.copy, size: 12, color: Color(0xFF94A3B8)),
                      ],
                    ),
                  ),
                ),
              ),
              if (phone != null && phone.isNotEmpty) ...[
                const SizedBox(width: 6),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: phone));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Phone copied'), behavior: SnackBarBehavior.floating, duration: Duration(seconds: 1)),
                    );
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: const Icon(LucideIcons.phone, size: 13, color: Color(0xFF475569)),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeroTag(IconData icon, String text, Color textColor, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(5)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 9, color: textColor),
          const SizedBox(width: 3),
          Text(
            text,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: textColor),
          ),
        ],
      ),
    );
  }

  // ── HEADER: EXECUTIVE KPI RIBBON ──────────────────────────────────────────

  Widget _buildKpiRibbon() {
    final performance = _userData?['performance'] as Map<String, dynamic>?;
    final taskMetrics = performance?['taskMetrics'] as Map<String, dynamic>?;
    final attendanceMetrics = performance?['attendanceMetrics'] as Map<String, dynamic>?;

    final totalProjects = _allProjects.length;
    final totalTasks = (taskMetrics?['total'] as num?)?.toInt() ?? 0;
    final completionRate = totalTasks > 0 ? '${taskMetrics?['completionRate'] ?? 0}%' : '—';
    final totalAttendance = (attendanceMetrics?['totalDaysLogged'] as num?)?.toInt() ?? 0;
    final attendanceRate = totalAttendance > 0 ? '${attendanceMetrics?['attendanceRate'] ?? 0}%' : '—';
    final openTasks = (taskMetrics?['inProgress'] ?? 0) + (taskMetrics?['todo'] ?? 0);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          _buildKpiItem('Initiatives', '$totalProjects', '${_currentProjects.length} Active', const Color(0xFF2563EB)),
          _buildKpiDivider(),
          _buildKpiItem('Delivery', completionRate, 'Task Rate', const Color(0xFF10B981)),
          _buildKpiDivider(),
          _buildKpiItem('Attendance', attendanceRate, 'Score', const Color(0xFF8B5CF6)),
          _buildKpiDivider(),
          _buildKpiItem('Workload', '$openTasks', 'Open Tasks', const Color(0xFFF59E0B)),
        ],
      ),
    );
  }

  Widget _buildKpiItem(String title, String value, String sub, Color color) {
    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: color, letterSpacing: -0.5),
          ),
          Text(
            sub,
            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w500, color: Color(0xFF94A3B8)),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildKpiDivider() {
    return Container(
      width: 1,
      height: 28,
      color: const Color(0xFFF1F5F9),
    );
  }

  // ── TAB 1: PROJECTS (PAST, CURRENT, PIPELINE) ─────────────────────────────

  Widget _buildProjectsTab() {
    return RefreshIndicator(
      onRefresh: _loadDossierData,
      color: const Color(0xFF2563EB),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 30),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Live Daily Work Execution & Bug Resolution Card (Real MongoDB Data)
            _buildTodayWorkAndBugResolutionCard(),

            const SizedBox(height: 16),

            // Section Header: Project Horizons
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Icon(LucideIcons.folderKanban, size: 14, color: Color(0xFF2563EB)),
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Initiative & Delivery Horizons',
                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Segmented Horizon Selector (Short, crisp labels that NEVER overflow)
            Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  _buildHorizonSegment(0, 'Active', _currentProjects.length, const Color(0xFF2563EB)),
                  _buildHorizonSegment(1, 'Past', _pastProjects.length, const Color(0xFF10B981)),
                  _buildHorizonSegment(2, 'Pipeline', _nextProjects.length, const Color(0xFF8B5CF6)),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Explanatory delivery horizon banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Icon(
                    _selectedProjectHorizon == 2
                        ? LucideIcons.calendarClock
                        : (_selectedProjectHorizon == 1
                            ? LucideIcons.archive
                            : LucideIcons.playCircle),
                    size: 13,
                    color: _selectedProjectHorizon == 2
                        ? const Color(0xFF8B5CF6)
                        : (_selectedProjectHorizon == 1
                            ? const Color(0xFF10B981)
                            : const Color(0xFF2563EB)),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      _selectedProjectHorizon == 2
                          ? 'Pipeline: Projects in Planning, Discovery, or Scheduled queues before sprint launch.'
                          : (_selectedProjectHorizon == 1
                              ? 'Past: Finished, launched, and archived project milestones.'
                              : 'Active: In-flight sprint initiatives with committed deliverables.'),
                      style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Active list or Enterprise WebP Empty State
            _buildSelectedHorizonList(),
          ],
        ),
      ),
    );
  }

  // ── TODAY'S WORK ACTIVITY & BUG RESOLUTIONS (REAL DATA) ─────────────────────

  Widget _buildTodayWorkAndBugResolutionCard() {
    final performance = _userData?['performance'] as Map<String, dynamic>?;
    final dailyTrackers = (performance?['dailyTrackers'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final eodReports = (performance?['eodReports'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
    Map<String, dynamic>? todayTracker;
    Map<String, dynamic>? latestTracker;

    if (dailyTrackers.isNotEmpty) {
      latestTracker = dailyTrackers.first;
      for (final t in dailyTrackers) {
        final d = t['date']?.toString();
        if (d != null && d.startsWith(todayStr)) {
          todayTracker = t;
          break;
        }
      }
    }

    final activeTracker = todayTracker ?? latestTracker;
    final isLoggedToday = todayTracker != null;

    Map<String, dynamic>? latestEod;
    if (eodReports.isNotEmpty) {
      latestEod = eodReports.first;
    }

    final project = activeTracker?['project'] is Map
        ? activeTracker!['project']
        : (_userData?['project'] is Map ? _userData!['project'] : null);
    final projectName = project?['name']?.toString() ?? 'General Assignment';
    final projectCode = project?['code']?.toString();

    final taskSummary = activeTracker?['todayTask']?.toString() ??
        latestEod?['message']?.toString();
    final module = activeTracker?['module']?.toString() ?? (latestEod != null ? 'EOD Update' : '—');
    final blockers = activeTracker?['blockers']?.toString();
    final yesterdayStatus = activeTracker?['yesterdayStatus']?.toString() ?? '—';
    final hours = activeTracker?['hours'] != null ? '${activeTracker!['hours']} hrs' : '—';
    final attendance = activeTracker?['attendance']?.toString() ?? '—';
    final productivity = activeTracker?['productivityMetrics'] != null
        ? '${activeTracker!['productivityMetrics']}/10'
        : '—';

    String logDateLabel = 'Today';
    if (activeTracker?['date'] != null) {
      try {
        final parsed = DateTime.parse(activeTracker!['date'].toString());
        logDateLabel = DateFormat('EEE, MMM d').format(parsed);
      } catch (_) {}
    }

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              borderRadius: BorderRadius.vertical(top: Radius.circular(15)),
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(LucideIcons.activity, size: 14, color: Color(0xFF2563EB)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Today's Work & Bug Resolutions",
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        logDateLabel,
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w500, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isLoggedToday ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isLoggedToday ? const Color(0xFFA7F3D0) : const Color(0xFFFDE68A),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: isLoggedToday ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        isLoggedToday ? 'LOGGED TODAY' : 'PENDING EOD',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          color: isLoggedToday ? const Color(0xFF047857) : const Color(0xFFB45309),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 2. Body Content
          Padding(
            padding: const EdgeInsets.all(14),
            child: activeTracker == null && latestEod == null
                ? _buildEmptyDailyTrackerNotice()
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Project & Module Tags
                      Row(
                        children: [
                          if (projectCode != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF2563EB).withOpacity(0.08),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Text(
                                projectCode,
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          Expanded(
                            child: Text(
                              projectName,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Text(
                              module,
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),

                      // What was done today
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(11),
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
                                const Icon(LucideIcons.checkSquare, size: 13, color: Color(0xFF2563EB)),
                                const SizedBox(width: 6),
                                const Text(
                                  'Work Done Today',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                ),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                  decoration: BoxDecoration(
                                    color: yesterdayStatus.toLowerCase().contains('completed')
                                        ? const Color(0xFFECFDF5)
                                        : const Color(0xFFEFF6FF),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    yesterdayStatus.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                      color: yesterdayStatus.toLowerCase().contains('completed')
                                          ? const Color(0xFF059669)
                                          : const Color(0xFF2563EB),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              taskSummary ?? 'No specific task notes recorded for this entry.',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF334155), height: 1.4),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 10),

                      // Bugs Solved & Impediments Handled
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(11),
                        decoration: BoxDecoration(
                          color: (blockers != null && blockers.trim().isNotEmpty && blockers.toLowerCase() != 'none')
                              ? const Color(0xFFFEF2F2)
                              : const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: (blockers != null && blockers.trim().isNotEmpty && blockers.toLowerCase() != 'none')
                                ? const Color(0xFFFECACA)
                                : const Color(0xFFBBF7D0),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              (blockers != null && blockers.trim().isNotEmpty && blockers.toLowerCase() != 'none')
                                  ? LucideIcons.alertCircle
                                  : LucideIcons.shieldCheck,
                              size: 15,
                              color: (blockers != null && blockers.trim().isNotEmpty && blockers.toLowerCase() != 'none')
                                  ? const Color(0xFFDC2626)
                                  : const Color(0xFF16A34A),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    (blockers != null && blockers.trim().isNotEmpty && blockers.toLowerCase() != 'none')
                                        ? 'Bugs & Blockers Under Investigation'
                                        : 'Bugs Resolved & Roadblocks Cleared',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: (blockers != null && blockers.trim().isNotEmpty && blockers.toLowerCase() != 'none')
                                          ? const Color(0xFF991B1B)
                                          : const Color(0xFF166534),
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    (blockers != null && blockers.trim().isNotEmpty && blockers.toLowerCase() != 'none')
                                        ? blockers
                                        : 'No roadblocks or blockers reported.',
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      color: (blockers != null && blockers.trim().isNotEmpty && blockers.toLowerCase() != 'none')
                                          ? const Color(0xFF7F1D1D)
                                          : const Color(0xFF14532D),
                                      height: 1.35,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 10),

                      // Metrics Strip: Hours Logged, Attendance, Rating
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            _buildDailyMetricItem(LucideIcons.clock, hours, 'Logged Hours'),
                            _buildVerticalMetricDivider(),
                            _buildDailyMetricItem(LucideIcons.calendarCheck, attendance, 'Attendance'),
                            _buildVerticalMetricDivider(),
                            _buildDailyMetricItem(LucideIcons.gauge, productivity, 'Productivity'),
                          ],
                        ),
                      ),

                      // 14-Day History Toggle
                      if (dailyTrackers.length > 1) ...[
                        const SizedBox(height: 10),
                        InkWell(
                          onTap: () => setState(() => _showDailyHistory = !_showDailyHistory),
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  _showDailyHistory ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                                  size: 14,
                                  color: const Color(0xFF2563EB),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  _showDailyHistory
                                      ? 'Hide Sprint History'
                                      : 'View Past ${dailyTrackers.length} Days Activity Logs',
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF2563EB),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        if (_showDailyHistory) ...[
                          const SizedBox(height: 8),
                          _buildDailyTrackerHistoryList(dailyTrackers),
                        ],
                      ],
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyDailyTrackerNotice() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(LucideIcons.info, size: 15, color: Color(0xFF3B82F6)),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'No timesheet or EOD report logged today',
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        const Text(
          'Personnel daily activities, solved bug tickets, and hour allocations will automatically stream here once the user submits their daily tracker or EOD report.',
          style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B), height: 1.4),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('EOD report submission reminder sent to personnel'),
                backgroundColor: Color(0xFF2563EB),
                behavior: SnackBarBehavior.floating,
              ),
            );
          },
          icon: const Icon(LucideIcons.bell, size: 13),
          label: const Text('Send EOD Standup Reminder'),
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFF2563EB),
            side: const BorderSide(color: Color(0xFF93C5FD)),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }

  Widget _buildDailyMetricItem(IconData icon, String value, String label) {
    return Expanded(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 13, color: const Color(0xFF64748B)),
          const SizedBox(width: 6),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  value,
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  label,
                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w500, color: Color(0xFF94A3B8)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerticalMetricDivider() {
    return Container(width: 1, height: 22, color: const Color(0xFFE2E8F0));
  }

  Widget _buildDailyTrackerHistoryList(List<Map<String, dynamic>> trackers) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: trackers.length.clamp(0, 7),
      separatorBuilder: (_, index) => const SizedBox(height: 6),
      itemBuilder: (ctx, idx) {
        final item = trackers[idx];
        String dLabel = 'Past Entry';
        if (item['date'] != null) {
          try {
            dLabel = DateFormat('MMM d, yyyy').format(DateTime.parse(item['date'].toString()));
          } catch (_) {}
        }
        final task = item['todayTask']?.toString() ?? 'No task details recorded';
        final mod = item['module']?.toString() ?? '—';
        final hrs = item['hours'] != null ? '${item['hours']} hrs' : '—';
        final blk = item['blockers']?.toString();

        return Container(
          padding: const EdgeInsets.all(9),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFF1F5F9)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(dLabel, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(4)),
                    child: Text(mod, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                  ),
                  const Spacer(),
                  Text(hrs, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                task,
                style: const TextStyle(fontSize: 11, color: Color(0xFF334155)),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (blk != null && blk.trim().isNotEmpty && blk.toLowerCase() != 'none') ...[
                const SizedBox(height: 2),
                Row(
                  children: [
                    const Icon(LucideIcons.checkCheck, size: 11, color: Color(0xFF10B981)),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        'Resolved: $blk',
                        style: const TextStyle(fontSize: 10, color: Color(0xFF059669)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildHorizonSegment(int index, String label, int count, Color color) {
    final isSelected = _selectedProjectHorizon == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedProjectHorizon = index),
        borderRadius: BorderRadius.circular(8),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(vertical: 7),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: const Color(0xFF0F172A).withOpacity(0.06),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                ),
              ),
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? color.withOpacity(0.12) : const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: isSelected ? color : const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSelectedHorizonList() {
    List<Map<String, dynamic>> targetList;
    String emptyTitle;
    String emptyDesc;

    if (_selectedProjectHorizon == 0) {
      targetList = _currentProjects;
      emptyTitle = 'Zero Active Sprint Initiatives';
      emptyDesc = 'Personnel currently has no active in-flight project initiatives registered in OMS.';
    } else if (_selectedProjectHorizon == 1) {
      targetList = _pastProjects;
      emptyTitle = 'No Past Delivered Initiatives';
      emptyDesc = 'Completed project deliverables and archived milestones will stream here.';
    } else {
      targetList = _nextProjects;
      emptyTitle = 'No Upcoming Pipeline Initiatives';
      emptyDesc = 'Future project allocations and planning queues will populate here.';
    }

    if (targetList.isEmpty) {
      return _buildEnterpriseEmptyState(
        horizonIndex: _selectedProjectHorizon,
        emptyTitle: emptyTitle,
        emptyDesc: emptyDesc,
      );
    }

    return Column(
      children: targetList.map((p) => _buildEnterpriseProjectCard(p)).toList(),
    );
  }

  // ── ENTERPRISE WEBP EMPTY STATE BANNER ─────────────────────────────────────

  Widget _buildEnterpriseEmptyState({
    required int horizonIndex,
    required String emptyTitle,
    required String emptyDesc,
  }) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Fast-loading WebP Hero Graphic Header (61 KB WebP)
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
            child: Stack(
              children: [
                Image.asset(
                  'assets/images/project_workspace_hero.webp',
                  height: 130,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (ctx, err, stack) {
                    return Container(
                      height: 130,
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: const Center(
                        child: Icon(LucideIcons.folderKanban, size: 36, color: Colors.white38),
                      ),
                    );
                  },
                ),
                // Gradient scrim overlay
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.black.withOpacity(0.15),
                          Colors.transparent,
                          Colors.black.withOpacity(0.65),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ),
                // Top Badge
                Positioned(
                  top: 10,
                  left: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.55),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.layers, size: 11, color: Colors.white),
                        SizedBox(width: 4),
                        Text(
                          'AGILE WORKSPACE',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 0.5),
                        ),
                      ],
                    ),
                  ),
                ),
                // Bottom Overlay Status
                Positioned(
                  bottom: 10,
                  left: 12,
                  right: 12,
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.9),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'CAPACITY AVAILABLE',
                          style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                      ),
                      const Spacer(),
                      const Text(
                        'OWMS Delivery Engine',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Information & Actions
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(LucideIcons.folderX, size: 16, color: Color(0xFF2563EB)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            emptyTitle,
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            emptyDesc,
                            style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), height: 1.35),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Action Row
                if (horizonIndex == 0) ...[
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _showAssignProjectSheet,
                          icon: const Icon(LucideIcons.folderPlus, size: 15),
                          label: const Text('Assign to Project Initiative'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            elevation: 0,
                            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                    ],
                  ),
                ] else ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(LucideIcons.info, size: 12, color: Color(0xFF64748B)),
                        const SizedBox(width: 6),
                        Text(
                          horizonIndex == 1
                              ? 'Historical delivery logs will appear as projects complete.'
                              : 'Future pipeline allocations will stream as projects are planned.',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── ASSIGN PROJECT BOTTOM SHEET ───────────────────────────────────────────

  Future<void> _showAssignProjectSheet() async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return FutureBuilder<List<Map<String, dynamic>>>(
          future: _api.getAllProjects(),
          builder: (ctx, snapshot) {
            return Container(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.65,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      const Icon(LucideIcons.folderPlus, size: 18, color: Color(0xFF2563EB)),
                      const SizedBox(width: 8),
                      const Text(
                        'Assign Project Initiative',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
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
                  const SizedBox(height: 4),
                  const Text(
                    'Select an active initiative to deploy this personnel into the project roster.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1, color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 12),
                  Expanded(
                    child: snapshot.connectionState == ConnectionState.waiting
                        ? const Center(child: CircularProgressIndicator(strokeWidth: 2.5))
                        : (snapshot.data == null || snapshot.data!.isEmpty)
                            ? const Center(
                                child: Text(
                                  'No active projects available in workspace',
                                  style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                                ),
                              )
                            : ListView.separated(
                                itemCount: snapshot.data!.length,
                                separatorBuilder: (_, index) => const SizedBox(height: 8),
                                itemBuilder: (ctx, idx) {
                                  final p = snapshot.data![idx];
                                  final pName = p['name']?.toString() ?? 'Project';
                                  final pCode = p['code']?.toString() ?? 'PRJ';
                                  final pStatus = p['status']?.toString() ?? 'Active';
                                  final pId = p['_id']?.toString() ?? '';

                                  return InkWell(
                                    onTap: () async {
                                      Navigator.pop(ctx);
                                      final success = await _api.assignUserToProject(widget.userId, pId);
                                      if (!mounted) return;
                                      if (success) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Personnel assigned to $pName'),
                                            backgroundColor: const Color(0xFF10B981),
                                            behavior: SnackBarBehavior.floating,
                                          ),
                                        );
                                        _loadDossierData();
                                      } else {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Failed to assign project. Check permissions.'),
                                            backgroundColor: Color(0xFFEF4444),
                                            behavior: SnackBarBehavior.floating,
                                          ),
                                        );
                                      }
                                    },
                                    borderRadius: BorderRadius.circular(10),
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF8FAFC),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: const Color(0xFFE2E8F0)),
                                      ),
                                      child: Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF2563EB).withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              pCode,
                                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Text(
                                              pName,
                                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFECFDF5),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              pStatus,
                                              style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
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
            );
          },
        );
      },
    );
  }

  Widget _buildEnterpriseProjectCard(Map<String, dynamic> proj) {
    final projectId = proj['_id']?.toString() ?? proj['id']?.toString() ?? '';
    final name = (proj['name'] ?? 'Project Initiative').toString();
    final code = (proj['code'] ?? 'PRJ-N/A').toString();
    final role = (proj['userRole'] ?? 'Member').toString();
    final allocation = proj['userAllocation'];
    final stats = proj['userStats'] as Map<String, dynamic>?;
    final totalTasks = stats?['totalTasks'] as int? ?? 0;
    final completedTasks = stats?['completedTasks'] as int? ?? 0;
    final solvedBugs = stats?['solvedBugs'] as int? ?? 0;
    final status = (proj['status'] ?? 'Active').toString();
    final health = (proj['healthStatus'] ?? 'good').toString().toLowerCase();
    final priority = (proj['priority'] ?? 'Medium').toString();
    final description = proj['description']?.toString();
    final manager = proj['manager'] is Map ? proj['manager']['name']?.toString() : null;

    final startDateStr = proj['startDate'] != null
        ? DateFormat('MMM yyyy').format(DateTime.tryParse(proj['startDate'].toString()) ?? DateTime.now())
        : null;
    final endDateStr = proj['endDate'] != null
        ? DateFormat('MMM yyyy').format(DateTime.tryParse(proj['endDate'].toString()) ?? DateTime.now())
        : null;

    Color healthColor = const Color(0xFF10B981);
    if (health == 'at-risk') healthColor = const Color(0xFFF59E0B);
    if (health == 'delayed' || health == 'critical') healthColor = const Color(0xFFEF4444);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            if (projectId.isNotEmpty) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ProjectDossierScreen(projectId: projectId),
                ),
              );
            }
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(LucideIcons.briefcase, size: 15, color: Color(0xFF2563EB)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Wrap(
                            spacing: 5,
                            runSpacing: 4,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                code,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                              ),
                              const Text('•', style: TextStyle(color: Color(0xFFCBD5E1))),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: role.toLowerCase().contains('lead') ? const Color(0xFFFEF3C7) : const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  role,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: role.toLowerCase().contains('lead') ? const Color(0xFFB45309) : const Color(0xFF2563EB),
                                  ),
                                ),
                              ),
                              const Text('•', style: TextStyle(color: Color(0xFFCBD5E1))),
                              Text(
                                priority,
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    // Health status badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: healthColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(5),
                        border: Border.all(color: healthColor.withOpacity(0.3)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(width: 5, height: 5, decoration: BoxDecoration(color: healthColor, shape: BoxShape.circle)),
                          const SizedBox(width: 4),
                          Text(
                            health.toUpperCase(),
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: healthColor),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(LucideIcons.chevronRight, size: 16, color: Color(0xFF94A3B8)),
                  ],
                ),
                if (description != null && description.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), height: 1.3),
                  ),
                ],

                // ── Personnel Contribution Metrics in this Project ──
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                  ),
                  child: Row(
                    children: [
                      // Dedicated Capacity
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('CAPACITY', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w700, color: Color(0xFF94A3B8))),
                            const SizedBox(height: 1),
                            Text(
                              '${allocation ?? 100}% FTE',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                            ),
                          ],
                        ),
                      ),
                      Container(width: 1, height: 20, color: const Color(0xFFE2E8F0)),
                      const SizedBox(width: 8),

                      // Tasks Contribution
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('TASKS DONE', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w700, color: Color(0xFF94A3B8))),
                            const SizedBox(height: 1),
                            Text(
                              '$completedTasks / $totalTasks',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                            ),
                          ],
                        ),
                      ),
                      Container(width: 1, height: 20, color: const Color(0xFFE2E8F0)),
                      const SizedBox(width: 8),

                      // Bugs Solved
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('BUGS SOLVED', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w700, color: Color(0xFF94A3B8))),
                            const SizedBox(height: 1),
                            Text(
                              '$solvedBugs tickets',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: solvedBugs > 0 ? const Color(0xFF16A34A) : const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 10),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 8),

                Row(
                  children: [
                    if (startDateStr != null) ...[
                      const Icon(LucideIcons.calendar, size: 11, color: Color(0xFF94A3B8)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '$startDateStr ${endDateStr != null ? "– $endDateStr" : ""}',
                          style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4)),
                      child: Text(
                        status.toUpperCase(),
                        style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                      ),
                    ),
                    if (manager != null) ...[
                      const SizedBox(width: 8),
                      const Icon(LucideIcons.user, size: 11, color: Color(0xFF94A3B8)),
                      const SizedBox(width: 3),
                      Text(
                        manager,
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── TAB 2: OPERATIONAL TASKS ──────────────────────────────────────────────

  Widget _buildTasksTab() {
    final performance = _userData?['performance'] as Map<String, dynamic>?;
    final recentTasks = (performance?['recentTasks'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    return RefreshIndicator(
      onRefresh: _loadDossierData,
      color: const Color(0xFF2563EB),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 30),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Operational Task Backlog',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
                  child: Text(
                    '${recentTasks.length} Assigned',
                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (recentTasks.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Column(
                  children: [
                    Icon(LucideIcons.listChecks, size: 28, color: Color(0xFF94A3B8)),
                    SizedBox(height: 8),
                    Text(
                      'No individual tasks assigned in ledger',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Assigned work packages from PMO projects will populate here.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: recentTasks.length,
                separatorBuilder: (_, index) => const SizedBox(height: 8),
                itemBuilder: (ctx, index) {
                  final task = recentTasks[index];
                  final title = task['title']?.toString() ?? 'Task item';
                  final status = task['status']?.toString() ?? 'Todo';
                  final priority = task['priority']?.toString() ?? 'Medium';
                  final projName = task['project'] is Map ? task['project']['name']?.toString() : null;

                  Color statusColor = const Color(0xFF64748B);
                  if (status == 'Done') statusColor = const Color(0xFF10B981);
                  if (status == 'In Progress' || status == 'In Review') statusColor = const Color(0xFF2563EB);
                  if (status == 'Blocked') statusColor = const Color(0xFFEF4444);

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        Container(width: 7, height: 7, decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                title,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${projName != null ? "$projName • " : ""}$priority Priority',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(5)),
                          child: Text(
                            status,
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: statusColor),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  // ── TAB 3: ORG HIERARCHY & SKILLS ─────────────────────────────────────────

  Widget _buildOrgTab() {
    final user = _userData ?? {};
    final manager = user['manager'] is Map ? user['manager'] as Map<String, dynamic> : null;
    final hrManager = user['hrManager'] is Map ? user['hrManager'] as Map<String, dynamic> : null;
    final mentor = user['mentor'] is Map ? user['mentor'] as Map<String, dynamic> : null;
    final pmoLead = user['pmoLead'] is Map ? user['pmoLead'] as Map<String, dynamic> : null;

    final skills = (user['skills'] as List?)?.map((e) => e.toString()).toList() ?? [];
    final college = user['college']?.toString();
    final domain = user['domain']?.toString();

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 30),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Reporting Lines & Advisory Network',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 10),

          // Manager
          _buildOrgTile(
            title: 'Reporting Manager',
            name: manager?['name']?.toString() ?? 'Unassigned',
            sub: manager?['designation']?.toString() ?? (manager?['employeeId']?.toString() ?? 'No supervisor mapped'),
            icon: LucideIcons.userCheck,
            color: const Color(0xFF2563EB),
          ),
          const SizedBox(height: 8),

          // HR Manager
          _buildOrgTile(
            title: 'HR Business Partner',
            name: hrManager?['name']?.toString() ?? 'Unassigned',
            sub: hrManager?['employeeId']?.toString() ?? '—',
            icon: LucideIcons.heartHandshake,
            color: const Color(0xFF10B981),
          ),

          if (mentor != null) ...[
            const SizedBox(height: 8),
            _buildOrgTile(
              title: 'Assigned Technical Mentor',
              name: mentor['name']?.toString() ?? 'Technical Mentor',
              sub: mentor['designation']?.toString() ?? 'Technical Lead',
              icon: LucideIcons.award,
              color: const Color(0xFF8B5CF6),
            ),
          ],

          if (pmoLead != null) ...[
            const SizedBox(height: 8),
            _buildOrgTile(
              title: 'PMO Governance Lead',
              name: pmoLead['name']?.toString() ?? 'PMO Officer',
              sub: pmoLead['designation']?.toString() ?? 'Governance Oversight',
              icon: LucideIcons.shield,
              color: const Color(0xFFF59E0B),
            ),
          ],

          const SizedBox(height: 14),

          // Leave & Absence Health Ledger (Real Data)
          _buildLeaveHealthRadar(),

          const SizedBox(height: 16),
          const Text(
            'Specializations & Background',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 10),

          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (skills.isNotEmpty) ...[
                  const Text('Core Competencies', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: skills.map((s) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: Text(s, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                    )).toList(),
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 10),
                ],
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Domain Track', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF94A3B8))),
                          Text(domain ?? '—', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Alma Mater', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF94A3B8))),
                          Text(
                            college ?? '—',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrgTile({
    required String title,
    required String name,
    required String sub,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 15, color: color),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF94A3B8))),
                Text(
                  name,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          Text(
            sub,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ── LEAVE & ABSENCE HEALTH RADAR (REAL DATA) ───────────────────────────────

  Widget _buildLeaveHealthRadar() {
    final performance = _userData?['performance'] as Map<String, dynamic>?;
    final leaveBalance = performance?['leaveBalance'] as Map<String, dynamic>? ?? {};

    final casual = leaveBalance['casual'] is Map ? leaveBalance['casual'] as Map<String, dynamic> : {'total': 0, 'used': 0};
    final sick = leaveBalance['sick'] is Map ? leaveBalance['sick'] as Map<String, dynamic> : {'total': 0, 'used': 0};
    final annual = leaveBalance['annual'] is Map ? leaveBalance['annual'] as Map<String, dynamic> : {'total': 0, 'used': 0};
    final emergency = leaveBalance['emergency'] is Map ? leaveBalance['emergency'] as Map<String, dynamic> : {'total': 0, 'used': 0};

    final annualTotal = (annual['total'] as num?)?.toInt() ?? 0;
    final annualUsed = (annual['used'] as num?)?.toInt() ?? 0;
    final annualRem = (annualTotal - annualUsed).clamp(0, 99);

    final sickTotal = (sick['total'] as num?)?.toInt() ?? 0;
    final sickUsed = (sick['used'] as num?)?.toInt() ?? 0;
    final sickRem = (sickTotal - sickUsed).clamp(0, 99);

    final casualTotal = (casual['total'] as num?)?.toInt() ?? 0;
    final casualUsed = (casual['used'] as num?)?.toInt() ?? 0;
    final casualRem = (casualTotal - casualUsed).clamp(0, 99);

    final emergencyTotal = (emergency['total'] as num?)?.toInt() ?? 0;
    final emergencyUsed = (emergency['used'] as num?)?.toInt() ?? 0;
    final emergencyRem = (emergencyTotal - emergencyUsed).clamp(0, 99);

    final totalRem = annualRem + sickRem + casualRem + emergencyRem;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(LucideIcons.calendar, size: 14, color: Color(0xFF10B981)),
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'PTO & Absence Health Ledger',
                  style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '$totalRem Days Quota',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 4 Leave Quota Cards
          Row(
            children: [
              _buildLeaveQuotaItem('Annual', '$annualRem', '$annualTotal', const Color(0xFF2563EB)),
              const SizedBox(width: 8),
              _buildLeaveQuotaItem('Sick', '$sickRem', '$sickTotal', const Color(0xFFEF4444)),
              const SizedBox(width: 8),
              _buildLeaveQuotaItem('Casual', '$casualRem', '$casualTotal', const Color(0xFF10B981)),
              const SizedBox(width: 8),
              _buildLeaveQuotaItem('Emergency', '$emergencyRem', '$emergencyTotal', const Color(0xFFF59E0B)),
            ],
          ),

          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Row(
              children: [
                Icon(
                  totalRem > 0 ? LucideIcons.checkCircle2 : LucideIcons.info,
                  size: 12,
                  color: totalRem > 0 ? const Color(0xFF10B981) : const Color(0xFF64748B),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    totalRem > 0
                        ? 'No scheduled absences in the next 14 calendar days.'
                        : 'No leave quota allocated for this personnel in HR records.',
                    style: const TextStyle(fontSize: 10.5, color: Color(0xFF475569), fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeaveQuotaItem(String title, String rem, String total, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              rem,
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: color),
            ),
            Text(
              'of $total days',
              style: const TextStyle(fontSize: 8.5, color: Color(0xFF94A3B8)),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  // ── TAB 4: MASTER SECURITY & GOVERNANCE ────────────────────────────────────

  Widget _buildSecurityTab() {
    final rawStatus = (_userData?['status'] ?? 'Active').toString();

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 30),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Security Action Card 1: Password Reset
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(LucideIcons.key, color: Color(0xFFD97706), size: 16),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Credential Recovery',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Instantly provision a cryptographically secure one-time temporary password for this employee.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.3),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _handlePasswordReset,
                  icon: const Icon(LucideIcons.keyRound, size: 14),
                  label: const Text('Issue New Temporary Password'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 42),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Security Action Card 2: Status Master Switch
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(LucideIcons.shield, color: Color(0xFF2563EB), size: 16),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Account Access State',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Currently in "$rawStatus" state. Suspended personnel are blocked immediately at API gateways.',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.3),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: rawStatus == 'Active' ? null : () => _handleStatusChange('Active'),
                        icon: const Icon(LucideIcons.userCheck, size: 14),
                        label: const Text('Activate'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFFE2E8F0),
                          disabledForegroundColor: const Color(0xFF94A3B8),
                          minimumSize: const Size(double.infinity, 42),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: rawStatus == 'Suspended' ? null : () => _handleStatusChange('Suspended'),
                        icon: const Icon(LucideIcons.shieldAlert, size: 14),
                        label: const Text('Suspend'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFFE2E8F0),
                          disabledForegroundColor: const Color(0xFF94A3B8),
                          minimumSize: const Size(double.infinity, 42),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Security Action Card 3: Forensic Impact
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(LucideIcons.search, color: Color(0xFF64748B), size: 16),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Offboarding Cascading Forensics',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Audit dependencies (managed projects, open tasks) prior to initiating archival or reassignment.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.3),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _handleDeletionImpact,
                  icon: const Icon(LucideIcons.alertTriangle, size: 14),
                  label: const Text('Run Dependency Impact Analysis'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF475569),
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                    minimumSize: const Size(double.infinity, 42),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
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

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar _tabBar;

  _SliverAppBarDelegate(this._tabBar);

  @override
  double get minExtent => _tabBar.preferredSize.height + 1;
  @override
  double get maxExtent => _tabBar.preferredSize.height + 1;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          _tabBar,
          Container(height: 1, color: const Color(0xFFE2E8F0)),
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return true;
  }
}
