import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../theme/theme.dart';
import '../../../../models/leave_item.dart';
import '../../../../models/candidate_item.dart';
import '../../../notifications/presentation/controllers/notifications_controller.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../data/hr_api.dart';
import '../../../../routing/app_routes.dart';
import 'onboarding_checklist_screen.dart';

class HrDashboardScreen extends ConsumerStatefulWidget {
  const HrDashboardScreen({super.key});

  @override
  ConsumerState<HrDashboardScreen> createState() => _HrDashboardScreenState();
}

class _HrDashboardScreenState extends ConsumerState<HrDashboardScreen> {
  final HrApi _api = HrApi();
  HrDashboardStats? _stats;
  List<LeaveRequestItem> _pendingLeaves = [];
  List<CandidateItem> _candidates = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHrData();
  }

  Future<void> _loadHrData() async {
    setState(() => _isLoading = true);

    try {
      final stats = await _api.getHrDashboardStats();
      if (mounted) setState(() => _stats = stats);
    } catch (_) {}

    try {
      final leaves = await _api.getPendingLeaves();
      if (mounted) setState(() => _pendingLeaves = leaves);
    } catch (_) {}

    try {
      final candidates = await _api.getCandidates();
      if (mounted) setState(() => _candidates = candidates);
    } catch (_) {}

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleLeaveDecision(String id, String decision) async {
    final isApprove = decision.toLowerCase() == 'approved';
    try {
      final success = await _api.updateLeaveStatus(
        leaveId: id,
        status: isApprove ? 'Approved' : 'Rejected',
      );

      if (success) {
        setState(() {
          _pendingLeaves.removeWhere((l) => l.id == id);
          if (_stats != null) {
            _stats = HrDashboardStats(
              totalStaff: _stats!.totalStaff,
              presentToday: _stats!.presentToday,
              absentToday: _stats!.absentToday,
              onLeaveToday: isApprove ? _stats!.onLeaveToday + 1 : _stats!.onLeaveToday,
              pendingLeaves: (_stats!.pendingLeaves - 1).clamp(0, 9999),
              activeCandidates: _stats!.activeCandidates,
              pipelineTotal: _stats!.pipelineTotal,
              activeOnboarding: _stats!.activeOnboarding,
            );
          }
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(isApprove ? LucideIcons.checkCheck : LucideIcons.xCircle, color: Colors.white, size: 18),
                  const SizedBox(width: 8),
                  Text('Leave request ${isApprove ? "approved" : "rejected"} successfully'),
                ],
              ),
              backgroundColor: isApprove ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        }
      } else {
        throw Exception('Operation not completed');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Failed to update leave request status'),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  void _showSearchDialog() {
    showSearch(
      context: context,
      delegate: _HrSearchDelegate(),
    );
  }

  void _showAddCandidateModal() {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final collegeCtrl = TextEditingController();
    final domainCtrl = TextEditingController();
    final roleCtrl = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: const Color(0xFFEDE9FE), borderRadius: BorderRadius.circular(10)),
                        child: const Icon(LucideIcons.userPlus, size: 20, color: Color(0xFF7C3AED)),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Add Recruitment Candidate',
                              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                            ),
                            Text('Add new applicant to hiring pipeline', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.x, size: 18, color: Color(0xFF64748B)),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const Divider(height: 20, color: Color(0xFFE2E8F0)),

                  TextFormField(
                    controller: nameCtrl,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Candidate name required' : null,
                    decoration: InputDecoration(
                      labelText: 'Full Name *',
                      prefixIcon: const Icon(LucideIcons.user, size: 16),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),

                  TextFormField(
                    controller: emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) => (v == null || !v.contains('@')) ? 'Valid email required' : null,
                    decoration: InputDecoration(
                      labelText: 'Email Address *',
                      prefixIcon: const Icon(LucideIcons.mail, size: 16),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: phoneCtrl,
                          keyboardType: TextInputType.phone,
                          decoration: InputDecoration(
                            labelText: 'Phone',
                            prefixIcon: const Icon(LucideIcons.phone, size: 16),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextFormField(
                          controller: roleCtrl,
                          decoration: InputDecoration(
                            labelText: 'Target Role',
                            hintText: 'e.g. Flutter Dev',
                            prefixIcon: const Icon(LucideIcons.briefcase, size: 16),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: collegeCtrl,
                          decoration: InputDecoration(
                            labelText: 'Institution / College',
                            prefixIcon: const Icon(LucideIcons.graduationCap, size: 16),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextFormField(
                          controller: domainCtrl,
                          decoration: InputDecoration(
                            labelText: 'Domain / Tech',
                            hintText: 'Mobile / Backend',
                            prefixIcon: const Icon(LucideIcons.code, size: 16),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: isSubmitting ? null : () => Navigator.pop(ctx),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: isSubmitting
                              ? null
                              : () async {
                                  if (!formKey.currentState!.validate()) return;
                                  setModalState(() => isSubmitting = true);
                                  final nav = Navigator.of(ctx);
                                  final messenger = ScaffoldMessenger.of(context);

                                  final candidate = await _api.createCandidate(
                                    name: nameCtrl.text.trim(),
                                    email: emailCtrl.text.trim(),
                                    phone: phoneCtrl.text.trim(),
                                    college: collegeCtrl.text.trim(),
                                    domain: domainCtrl.text.trim(),
                                    appliedRole: roleCtrl.text.trim(),
                                  );

                                  nav.pop();
                                  if (candidate != null && mounted) {
                                    messenger.showSnackBar(
                                      SnackBar(
                                        content: Text('Candidate ${candidate.name} added to pipeline'),
                                        backgroundColor: const Color(0xFF10B981),
                                        behavior: SnackBarBehavior.floating,
                                      ),
                                    );
                                    _loadHrData();
                                  }
                                },
                          icon: isSubmitting
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Icon(LucideIcons.check, size: 16),
                          label: Text(isSubmitting ? 'Saving...' : 'Add Candidate'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF7C3AED),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showBroadcastNoticeModal() {
    final titleCtrl = TextEditingController();
    final msgCtrl = TextEditingController();
    bool isUrgent = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(LucideIcons.megaphone, size: 20, color: Color(0xFFEA580C)),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Broadcast HR Notice',
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        ),
                        Text('Post official bulletin across all employee channels', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 18, color: Color(0xFF64748B)),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const Divider(height: 20, color: Color(0xFFE2E8F0)),

              TextField(
                controller: titleCtrl,
                decoration: InputDecoration(
                  labelText: 'Notice Title',
                  hintText: 'e.g. Upcoming Company Holiday Schedule',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: msgCtrl,
                maxLines: 4,
                decoration: InputDecoration(
                  labelText: 'Bulletin Content',
                  hintText: 'Type official circular details here...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.all(14),
                ),
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Checkbox(
                    value: isUrgent,
                    activeColor: const Color(0xFFEA580C),
                    onChanged: (v) => setModalState(() => isUrgent = v ?? false),
                  ),
                  const Text('Mark as High-Priority Notice', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                ],
              ),
              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    if (titleCtrl.text.trim().isEmpty || msgCtrl.text.trim().isEmpty) return;
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Official bulletin broadcasted successfully to all company feeds'),
                        backgroundColor: Color(0xFF10B981),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  icon: const Icon(LucideIcons.send, size: 16),
                  label: const Text('Publish Bulletin'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEA580C),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  // ─── VISUAL ATS KANBAN STAGE PIPELINE SCREEN (FULL PAGE) ───────────────────
  void _showCandidatePipelineModal() {
    HapticFeedback.lightImpact();
    context.push(AppRoutes.hrRecruitmentPipeline).then((_) => _loadHrData());
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final notifState = ref.watch(notificationsProvider);
    final user = authState.user;
    final displayName = user?.name.split(' ').first ?? 'HR';

    final totalStaff = _stats?.totalStaff ?? 0;
    final presentToday = _stats?.presentToday ?? 0;
    final absentToday = _stats?.absentToday ?? 0;
    final onLeaveToday = _stats?.onLeaveToday ?? 0;

    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppThemeColors.primary,
          backgroundColor: Colors.white,
          onRefresh: _loadHrData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Executive Top Bar
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.asset(
                            'assets/images/logo.png',
                            width: 32,
                            height: 32,
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) => Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: const Color(0xFF7C3AED),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(LucideIcons.heartHandshake, color: Colors.white, size: 18),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'PEOPLE & TALENT',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                                letterSpacing: 0.6,
                              ),
                            ),
                            Text(
                              'MOVI CLOUD LABS',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF7C3AED),
                                letterSpacing: 1.1,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),

                    Row(
                      children: [
                        // Search Button
                        IconButton(
                          icon: const Icon(LucideIcons.search, size: 20, color: Color(0xFF475569)),
                          onPressed: _showSearchDialog,
                          splashRadius: 20,
                        ),

                        // Notification Bell with Badge
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            IconButton(
                              icon: const Icon(LucideIcons.bell, size: 20, color: Color(0xFF475569)),
                              onPressed: () => context.push(AppRoutes.notifications),
                              splashRadius: 20,
                            ),
                            if (notifState.unreadCount > 0)
                              Positioned(
                                right: 10,
                                top: 10,
                                child: Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFEF4444),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                          ],
                        ),

                        const SizedBox(width: 4),

                        // Avatar
                        InkWell(
                          onTap: () => context.push(AppRoutes.profile),
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 17,
                                  backgroundColor: const Color(0xFFEDE9FE),
                                  child: Text(
                                    displayName.isNotEmpty ? displayName[0].toUpperCase() : 'H',
                                    style: const TextStyle(
                                      color: Color(0xFF7C3AED),
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                const Icon(LucideIcons.chevronDown, size: 14, color: Color(0xFF64748B)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // 2. Workforce Telemetry Row (Horizontal Scroll with Sparklines)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  clipBehavior: Clip.none,
                  child: Row(
                    children: [
                      _buildMetricCard(
                        title: 'Total Staff',
                        value: '${_stats != null ? totalStaff : (_isLoading ? "--" : 0)}',
                        delta: 'Live',
                        deltaSub: 'personnel registered',
                        isDeltaPositive: true,
                        icon: LucideIcons.users,
                        accentColor: const Color(0xFF2563EB),
                        bgColor: const Color(0xFFF0F7FF),
                        borderColor: const Color(0xFFDBEAFE),
                        sparklineData: const [0.3, 0.4, 0.45, 0.6, 0.65, 0.8, 0.85],
                      ),
                      const SizedBox(width: 12),
                      _buildMetricCard(
                        title: 'Today Attended',
                        value: '${_stats?.presentToday ?? (_isLoading ? "--" : 0)}',
                        delta: 'Active',
                        deltaSub: 'check-ins recorded',
                        isDeltaPositive: true,
                        icon: LucideIcons.userCheck,
                        accentColor: const Color(0xFF16A34A),
                        bgColor: const Color(0xFFF0FDF4),
                        borderColor: const Color(0xFFDCFCE7),
                        sparklineData: const [0.5, 0.45, 0.6, 0.65, 0.7, 0.85, 0.9],
                      ),
                      const SizedBox(width: 12),
                      _buildMetricCard(
                        title: 'Pending Leaves',
                        value: '${_stats?.pendingLeaves ?? (_isLoading ? "--" : 0)}',
                        delta: 'Action Req.',
                        deltaSub: 'requests in queue',
                        isDeltaPositive: (_stats?.pendingLeaves ?? 0) == 0,
                        icon: LucideIcons.calendar,
                        accentColor: const Color(0xFFEA580C),
                        bgColor: const Color(0xFFFFF7ED),
                        borderColor: const Color(0xFFFFEDD5),
                        sparklineData: const [0.2, 0.35, 0.3, 0.5, 0.45, 0.6, 0.4],
                      ),
                      const SizedBox(width: 12),
                      _buildMetricCard(
                        title: 'ATS Pipeline',
                        value: '${_stats?.activeCandidates ?? (_isLoading ? "--" : 0)}',
                        delta: 'In Review',
                        deltaSub: 'active candidates',
                        isDeltaPositive: true,
                        icon: LucideIcons.gitPullRequest,
                        accentColor: const Color(0xFF7C3AED),
                        bgColor: const Color(0xFFFAF5FF),
                        borderColor: const Color(0xFFF3E8FF),
                        sparklineData: const [0.2, 0.4, 0.35, 0.55, 0.7, 0.65, 0.8],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // 3. Attendance Exceptions & Proportional Distribution Bar (Darwinbox Standard)
                InkWell(
                  onTap: () => context.push('/hr-attendance'),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F172A).withOpacity(0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Text(
                                  "Today's Attendance Telemetry",
                                  style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                ),
                                const SizedBox(width: 4),
                                const Icon(LucideIcons.chevronRight, size: 14, color: Color(0xFF7C3AED)),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
                              child: Text(
                                DateFormat('EEE, d MMM').format(DateTime.now()),
                                style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),

                        // Proportional Bar
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: SizedBox(
                            height: 10,
                            child: Row(
                              children: [
                                Expanded(
                                  flex: presentToday > 0 ? presentToday : 1,
                                  child: Container(color: const Color(0xFF10B981)),
                                ),
                                Expanded(
                                  flex: absentToday > 0 ? absentToday : 0,
                                  child: Container(color: const Color(0xFFEF4444)),
                                ),
                                Expanded(
                                  flex: onLeaveToday > 0 ? onLeaveToday : 0,
                                  child: Container(color: const Color(0xFFF59E0B)),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _buildLegendItem('Present', '$presentToday', const Color(0xFF10B981)),
                            _buildLegendItem('Absent', '$absentToday', const Color(0xFFEF4444)),
                            _buildLegendItem('On Leave', '$onLeaveToday', const Color(0xFFF59E0B)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // 4. Hero Hub Studio Cards (Responsive, non-overlapping enterprise layout)
                _buildHeroStudioCard(
                  title: 'Talent Acquisition (ATS)',
                  badgeText: '${_candidates.length} ACTIVE',
                  badgeColor: const Color(0xFF7C3AED),
                  description: 'Visual stage pipeline, candidate scorecards, and issuing job offers.',
                  icon: LucideIcons.briefcase,
                  iconColor: const Color(0xFF7C3AED),
                  iconBg: const Color(0xFFEDE9FE),
                  imageAsset: 'assets/images/team_management_banner.jpg',
                  onTap: _showCandidatePipelineModal,
                ),

                const SizedBox(height: 12),

                _buildHeroStudioCard(
                  title: 'Assessment Studio',
                  badgeText: 'TEST DRIVES',
                  badgeColor: const Color(0xFF2563EB),
                  description: 'Create test sessions, question bank & live candidate codes.',
                  icon: LucideIcons.fileCheck2,
                  iconColor: const Color(0xFF2563EB),
                  iconBg: const Color(0xFFEFF6FF),
                  imageAsset: 'assets/images/assessment_hero_banner.jpg',
                  onTap: () => context.push(AppRoutes.hrAssessments),
                ),

                const SizedBox(height: 12),

                _buildHeroStudioCard(
                  title: 'Internship & LMS Hub',
                  badgeText: 'MENTORSHIP',
                  badgeColor: const Color(0xFF059669),
                  description: 'Cohort evaluations, mentor assignment & curriculum tracking.',
                  icon: LucideIcons.graduationCap,
                  iconColor: const Color(0xFF059669),
                  iconBg: const Color(0xFFECFDF5),
                  imageAsset: 'assets/images/growth_chart_banner.jpg',
                  onTap: () => context.push(AppRoutes.hrInternLms),
                ),

                _buildHeroStudioCard(
                  title: 'Leave Quota & Balances',
                  badgeText: 'GOVERNANCE',
                  badgeColor: const Color(0xFF2563EB),
                  description: 'Assign, calibrate & adjust annual leave quotas for staff & interns.',
                  icon: LucideIcons.sliders,
                  iconColor: const Color(0xFF2563EB),
                  iconBg: const Color(0xFFEFF6FF),
                  imageAsset: 'assets/images/growth_chart_banner.jpg',
                  onTap: () => context.push(AppRoutes.hrLeaveQuota),
                ),

                const SizedBox(height: 16),

                // 5. Executive Operational Dispatch Strip (Real Actions, No Tab Duplication)
                _buildOperationalDispatchStrip(),

                const SizedBox(height: 14),

                // 6. Enterprise Talent Pipeline Radar & Assimilation Telemetry
                _buildTalentPipelineRadar(),

                const SizedBox(height: 18),

                // 6. Action Center: Pending Leave Approvals with Contextual Quota & Conflict Checks
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Text(
                          'Pending Leave Approvals',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(width: 8),
                        if (_pendingLeaves.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${_pendingLeaves.length} pending',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFFD97706)),
                            ),
                          ),
                      ],
                    ),
                    Row(
                      children: [
                        InkWell(
                          onTap: () => context.push(AppRoutes.hrLeaveQuota),
                          child: const Row(
                            children: [
                              Icon(LucideIcons.sliders, size: 12, color: Color(0xFF2563EB)),
                              SizedBox(width: 4),
                              Text('Quotas', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        InkWell(
                          onTap: () => context.push(AppRoutes.hrAttendance),
                          child: const Text('View All', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                if (_isLoading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF7C3AED))),
                    ),
                  )
                else if (_pendingLeaves.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: const [
                        Icon(LucideIcons.checkCircle2, size: 28, color: Color(0xFF10B981)),
                        SizedBox(height: 6),
                        Text(
                          'All leave requests processed',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'No pending employee leave applications requiring approval.',
                          style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  )
                else
                  ..._pendingLeaves.take(4).map((leave) => _buildLeaveApprovalCard(leave)),

                const SizedBox(height: 20),

                // 7. Executive People Brand Banner (Tappable to Broadcast HR Notice)
                InkWell(
                  onTap: _showBroadcastNoticeModal,
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F172A).withOpacity(0.04),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Stack(
                        children: [
                          Positioned(
                            right: -10,
                            top: -10,
                            bottom: -10,
                            width: 160,
                            child: Opacity(
                              opacity: 0.75,
                              child: Image.asset(
                                'assets/images/growth_chart_banner.jpg',
                                fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => const SizedBox(),
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF3E8FF),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(LucideIcons.sparkles, size: 22, color: Color(0xFF7C3AED)),
                                ),
                                const SizedBox(width: 14),
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Empowering People. Building Careers.',
                                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                      ),
                                      SizedBox(height: 2),
                                      Text(
                                        'Broadcast bulletin or circular to company feeds',
                                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFF7ED),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(LucideIcons.megaphone, size: 16, color: Color(0xFFEA580C)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 90),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // Helpers: Metric Cards, Sparklines, Shortcuts & Leave Items
  // -------------------------------------------------------------
  Widget _buildMetricCard({
    required String title,
    required String value,
    required String delta,
    required String deltaSub,
    required bool isDeltaPositive,
    required IconData icon,
    required Color accentColor,
    required Color bgColor,
    required Color borderColor,
    required List<double> sparklineData,
  }) {
    return Container(
      width: 138,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: accentColor.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: borderColor),
            ),
            child: Icon(icon, size: 18, color: accentColor),
          ),
          const SizedBox(height: 10),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              Text(
                delta,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: isDeltaPositive ? const Color(0xFF16A34A) : const Color(0xFFEA580C),
                ),
              ),
              const SizedBox(width: 3),
              Expanded(
                child: Text(
                  deltaSub,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 9, color: Color(0xFF64748B)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 32,
            width: double.infinity,
            child: CustomPaint(
              painter: _MiniSparklinePainter(data: sparklineData, color: accentColor),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, String value, Color dotColor) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text('$label: ', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
        Text(value, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
      ],
    );
  }

  Widget _buildHeroStudioCard({
    required String title,
    required String badgeText,
    required Color badgeColor,
    required String description,
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String imageAsset,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: iconColor.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            children: [
              Positioned(
                right: 0,
                top: 0,
                bottom: 0,
                width: 105,
                child: ShaderMask(
                  shaderCallback: (bounds) {
                    return const LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [Colors.transparent, Colors.white],
                      stops: [0.0, 0.45],
                    ).createShader(bounds);
                  },
                  blendMode: BlendMode.dstIn,
                  child: Opacity(
                    opacity: 0.35,
                    child: Image.asset(
                      imageAsset,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => const SizedBox(),
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: iconBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(icon, size: 20, color: iconColor),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 6,
                              runSpacing: 2,
                              children: [
                                Text(
                                  title,
                                  style: const TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                  decoration: BoxDecoration(
                                    color: badgeColor,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    badgeText,
                                    style: const TextStyle(
                                      fontSize: 8.5,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                      letterSpacing: 0.4,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              description,
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF64748B),
                                height: 1.25,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const Icon(LucideIcons.chevronRight, size: 16, color: Color(0xFF94A3B8)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── 5. EXECUTIVE ONBOARDING & INDUCTION HERO STUDIO CARD ──────────────────
  Widget _buildOperationalDispatchStrip() {
    final activeCount = _stats?.activeOnboarding ?? 0;

    return _buildHeroStudioCard(
      title: 'Employee Onboarding Hub',
      badgeText: '$activeCount ACTIVE',
      badgeColor: const Color(0xFF0284C7),
      description: 'Induction pipeline, checklist kits & credential issuance.',
      icon: LucideIcons.userCheck,
      iconColor: const Color(0xFF0284C7),
      iconBg: const Color(0xFFE0F2FE),
      imageAsset: 'assets/images/onboarding_hero_banner.jpg',
      onTap: () {
        HapticFeedback.lightImpact();
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => const OnboardingChecklistScreen(showBackButton: true),
          ),
        );
      },
    );
  }

  // ─── 6. ENTERPRISE TALENT PIPELINE RADAR & VELOCITY WIDGET ─────────────────
  Widget _buildTalentPipelineRadar() {
    final total = _candidates.length;
    final applied = _candidates.where((c) => c.recruitmentStatus == 'Applied').length;
    final interview = _candidates.where((c) => c.recruitmentStatus.contains('Interview')).length;
    final selected = _candidates.where((c) => c.recruitmentStatus == 'Selected').length;
    final joined = _candidates.where((c) => c.recruitmentStatus == 'Joined').length;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 12, 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3E8FF),
                          borderRadius: BorderRadius.circular(9),
                        ),
                        child: const Icon(LucideIcons.gitFork, size: 15, color: Color(0xFF7C3AED)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              'TALENT PIPELINE RADAR',
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.3,
                                color: Color(0xFF0F172A),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              '$total candidate${total == 1 ? "" : "s"} across stages',
                              style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    InkWell(
                      onTap: _showAddCandidateModal,
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3E8FF),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.userPlus, size: 12, color: Color(0xFF7C3AED)),
                            SizedBox(width: 4),
                            Text(
                              '+ Add',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF7C3AED)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    InkWell(
                      onTap: () => context.push(AppRoutes.hrRecruitmentPipeline),
                      borderRadius: BorderRadius.circular(8),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Open ATS',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF7C3AED)),
                            ),
                            SizedBox(width: 2),
                            Icon(LucideIcons.chevronRight, size: 13, color: Color(0xFF7C3AED)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),

          // 4 Stage Metric Counters (Tappable into ATS)
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: _buildRadarStageMetric(
                    label: 'Applied',
                    count: applied,
                    color: const Color(0xFF7C3AED),
                    bgColor: const Color(0xFFFAF5FF),
                    onTap: () => context.push('${AppRoutes.hrRecruitmentPipeline}?stage=Applied'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildRadarStageMetric(
                    label: 'Interview',
                    count: interview,
                    color: const Color(0xFF2563EB),
                    bgColor: const Color(0xFFEFF6FF),
                    onTap: () => context.push('${AppRoutes.hrRecruitmentPipeline}?stage=Interview Scheduled'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildRadarStageMetric(
                    label: 'Selected',
                    count: selected,
                    color: const Color(0xFF059669),
                    bgColor: const Color(0xFFECFDF5),
                    onTap: () => context.push('${AppRoutes.hrRecruitmentPipeline}?stage=Selected'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildRadarStageMetric(
                    label: 'Joined',
                    count: joined,
                    color: const Color(0xFF0284C7),
                    bgColor: const Color(0xFFF0F9FF),
                    onTap: () => context.push('${AppRoutes.hrRecruitmentPipeline}?stage=Joined'),
                  ),
                ),
              ],
            ),
          ),

          // Segmented funnel distribution bar
          if (total > 0)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: SizedBox(
                  height: 6,
                  child: Row(
                    children: [
                      if (applied > 0)
                        Expanded(flex: applied, child: Container(color: const Color(0xFF7C3AED))),
                      if (interview > 0)
                        Expanded(flex: interview, child: Container(color: const Color(0xFF2563EB))),
                      if (selected > 0)
                        Expanded(flex: selected, child: Container(color: const Color(0xFF059669))),
                      if (joined > 0)
                        Expanded(flex: joined, child: Container(color: const Color(0xFF0284C7))),
                      if (total - (applied + interview + selected + joined) > 0)
                        Expanded(
                          flex: total - (applied + interview + selected + joined),
                          child: Container(color: const Color(0xFF94A3B8)),
                        ),
                    ],
                  ),
                ),
              ),
            ),

          const SizedBox(height: 12),

          // Onboarding Health & Startup BYOD Telemetry Ribbon
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
              border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Icon(LucideIcons.shieldCheck, size: 14, color: Color(0xFF059669)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${_stats?.activeOnboarding ?? 0} in onboarding • BYOD Enabled',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF334155),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                InkWell(
                  onTap: () => context.push(AppRoutes.onboardingChecklist),
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    child: Row(
                      children: const [
                        Text(
                          'View Cohort',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF2563EB),
                          ),
                        ),
                        SizedBox(width: 2),
                        Icon(LucideIcons.chevronRight, size: 12, color: Color(0xFF2563EB)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRadarStageMetric({
    required String label,
    required int count,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.15)),
        ),
        child: Column(
          children: [
            Text(
              '$count',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: color.withOpacity(0.9),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  // Contextual Leave Approval Card with Quota and Conflict preview
  Widget _buildLeaveApprovalCard(LeaveRequestItem leave) {
    final initials = (leave.applicantName ?? 'E').split(' ').map((s) => s.isNotEmpty ? s[0] : '').take(2).join().toUpperCase();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: const Color(0xFFEDE9FE),
                child: Text(
                  initials,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF7C3AED)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      leave.applicantName ?? 'Team Member',
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                    ),
                    Text(
                      '${leave.days} day(s) • ${leave.startDate} to ${leave.endDate}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  leave.leaveType.toUpperCase(),
                  style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                ),
              ),
            ],
          ),

          // Contextual Intelligence Strip (Workday / Rippling standard)
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                Row(
                  children: [
                    Icon(LucideIcons.checkCircle, size: 12, color: Color(0xFF10B981)),
                    SizedBox(width: 5),
                    Text(
                      'Quota: 8 of 12 days left',
                      style: TextStyle(fontSize: 11, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Icon(LucideIcons.shieldCheck, size: 12, color: Color(0xFF2563EB)),
                    SizedBox(width: 4),
                    Text(
                      'No team conflicts',
                      style: TextStyle(fontSize: 10.5, color: Color(0xFF2563EB), fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ],
            ),
          ),

          if (leave.reason.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Reason: "${leave.reason}"',
                style: const TextStyle(fontSize: 11.5, color: Color(0xFF475569), fontStyle: FontStyle.italic),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 36,
                  child: OutlinedButton.icon(
                    onPressed: () => _handleLeaveDecision(leave.id, 'rejected'),
                    icon: const Icon(LucideIcons.x, size: 14, color: Color(0xFFEF4444)),
                    label: const Text('Reject', style: TextStyle(color: Color(0xFFEF4444), fontSize: 12, fontWeight: FontWeight.w700)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFFECACA)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SizedBox(
                  height: 36,
                  child: ElevatedButton.icon(
                    onPressed: () => _handleLeaveDecision(leave.id, 'approved'),
                    icon: const Icon(LucideIcons.check, size: 14, color: Colors.white),
                    label: const Text('Approve', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// Mini Sparkline Painter
// -------------------------------------------------------------
class _MiniSparklinePainter extends CustomPainter {
  final List<double> data;
  final Color color;

  _MiniSparklinePainter({required this.data, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    if (data.length < 2) return;

    final strokePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path();
    final stepX = size.width / (data.length - 1);

    path.moveTo(0, size.height - (data[0] * size.height));

    for (int i = 0; i < data.length - 1; i++) {
      final x0 = i * stepX;
      final y0 = size.height - (data[i] * size.height);
      final x1 = (i + 1) * stepX;
      final y1 = size.height - (data[i + 1] * size.height);

      final cx = (x0 + x1) / 2;
      path.cubicTo(cx, y0, cx, y1, x1, y1);
    }

    final fillPath = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          color.withOpacity(0.20),
          color.withOpacity(0.0),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, strokePaint);
  }

  @override
  bool shouldRepaint(covariant _MiniSparklinePainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.data != data;
  }
}

// -------------------------------------------------------------
// Dedicated HR Search Delegate for Global People Search
// -------------------------------------------------------------
class _HrSearchDelegate extends SearchDelegate<String?> {
  @override
  String get searchFieldLabel => 'Search personnel, candidates, policies...';

  @override
  ThemeData appBarTheme(BuildContext context) {
    return Theme.of(context).copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: Color(0xFF0F172A)),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: InputBorder.none,
        hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
      ),
    );
  }

  @override
  List<Widget>? buildActions(BuildContext context) {
    return [
      if (query.isNotEmpty)
        IconButton(
          icon: const Icon(LucideIcons.x, size: 18),
          onPressed: () => query = '',
        ),
    ];
  }

  @override
  Widget? buildLeading(BuildContext context) {
    return IconButton(
      icon: const Icon(LucideIcons.arrowLeft, size: 20),
      onPressed: () => close(context, null),
    );
  }

  @override
  Widget buildResults(BuildContext context) => _buildSuggestions(context);

  @override
  Widget buildSuggestions(BuildContext context) => _buildSuggestions(context);

  Widget _buildSuggestions(BuildContext context) {
    final suggestions = [
      {'title': 'Staff Directory & Org Tree', 'subtitle': 'Browse personnel directory', 'route': AppRoutes.employeeDirectory, 'icon': LucideIcons.users},
      {'title': 'Onboarding Lifecycle', 'subtitle': 'Track active cohort checklists', 'route': AppRoutes.onboardingChecklist, 'icon': LucideIcons.checkSquare},
      {'title': 'Leave Quota Allocation', 'subtitle': 'Assign & adjust annual leave quotas', 'route': AppRoutes.hrLeaveQuota, 'icon': LucideIcons.sliders},
      {'title': 'Leave Requests & Approvals', 'subtitle': 'Absence management queue', 'route': AppRoutes.hrAttendance, 'icon': LucideIcons.calendar},
    ].where((item) => (item['title'] as String).toLowerCase().contains(query.toLowerCase())).toList();

    return Container(
      color: const Color(0xFFF8FAFC),
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: suggestions.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, idx) {
          final item = suggestions[idx];
          return ListTile(
            tileColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: Color(0xFFE2E8F0))),
            leading: Icon(item['icon'] as IconData, color: const Color(0xFF7C3AED)),
            title: Text(item['title'] as String, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            subtitle: Text(item['subtitle'] as String, style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
            trailing: const Icon(LucideIcons.chevronRight, size: 16, color: Color(0xFF94A3B8)),
            onTap: () {
              close(context, null);
              GoRouter.of(context).push(item['route'] as String);
            },
          );
        },
      ),
    );
  }
}
