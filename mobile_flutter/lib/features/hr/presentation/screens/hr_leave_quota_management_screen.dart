import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../models/leave_item.dart';
import '../../../../core/widgets/shimmer_skeleton.dart';
import '../../data/hr_api.dart';

/// ══════════════════════════════════════════════════════════════════════════════
/// ENTERPRISE LEAVE QUOTA & POLICY ALLOCATION HUB
/// Enterprise HR management standard (Workday / Darwinbox / Linear aesthetic)
/// Allows HR managers to review, allocate, customize, and audit leave quotas
/// per employee/intern with instant database synchronization.
/// ══════════════════════════════════════════════════════════════════════════════
class HrLeaveQuotaManagementScreen extends StatefulWidget {
  final bool showBackButton;

  const HrLeaveQuotaManagementScreen({super.key, this.showBackButton = true});

  @override
  State<HrLeaveQuotaManagementScreen> createState() => _HrLeaveQuotaManagementScreenState();
}

class _HrLeaveQuotaManagementScreenState extends State<HrLeaveQuotaManagementScreen> {
  final HrApi _api = HrApi();

  bool _isLoading = true;
  List<StaffLeaveQuotaItem> _staffList = [];
  String _searchQuery = '';
  String _selectedRoleFilter = 'All'; // 'All', 'Intern', 'Full-time'
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadStaffBalances();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadStaffBalances() async {
    setState(() => _isLoading = true);
    try {
      final list = await _api.getStaffLeaveBalances();
      if (mounted) {
        setState(() {
          _staffList = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // Telemetry aggregates
  int get _totalStaff => _staffList.length;
  double get _avgCasual => _staffList.isEmpty
      ? 2.0
      : _staffList.map((s) => s.leaveBalance.casualLeave.total).reduce((a, b) => a + b) / _staffList.length;
  double get _avgSick => _staffList.isEmpty
      ? 2.0
      : _staffList.map((s) => s.leaveBalance.sickLeave.total).reduce((a, b) => a + b) / _staffList.length;
  double get _avgEarned => _staffList.isEmpty
      ? 0.0
      : _staffList.map((s) => s.leaveBalance.earnedLeave.total).reduce((a, b) => a + b) / _staffList.length;

  List<StaffLeaveQuotaItem> get _filteredList {
    return _staffList.where((item) {
      if (_selectedRoleFilter == 'Intern' && item.employmentType != 'Intern') return false;
      if (_selectedRoleFilter == 'Full-time' && item.employmentType == 'Intern') return false;

      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final match = item.name.toLowerCase().contains(q) ||
            item.employeeId.toLowerCase().contains(q) ||
            item.department.toLowerCase().contains(q) ||
            item.email.toLowerCase().contains(q);
        if (!match) return false;
      }
      return true;
    }).toList();
  }

  // ── ALLOCATION MODAL ─────────────────────────────────────────────────────────
  void _openQuotaAllocationModal(StaffLeaveQuotaItem staff) {
    HapticFeedback.mediumImpact();

    final bal = staff.leaveBalance;
    final isIntern = staff.employmentType == 'Intern';
    int casual = bal.casualLeave.total > 0 ? bal.casualLeave.total : 2;
    int sick = bal.sickLeave.total > 0 ? bal.sickLeave.total : 2;
    int earned = isIntern ? 0 : bal.earnedLeave.total;
    String mode = 'set'; // 'set' vs 'adjust'
    final reasonCtrl = TextEditingController(
      text: isIntern ? 'Internship Policy Allotment (2 CL, 2 SL)' : 'Annual Policy Allocation 2026',
    );
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final totalEntitlement = casual + sick + earned;

          return Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              top: 16,
              left: 20,
              right: 20,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              boxShadow: [
                BoxShadow(
                  color: Color(0x33000000),
                  blurRadius: 24,
                  offset: Offset(0, -4),
                ),
              ],
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle
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

                  // Header with Employee Info
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(
                        radius: 22,
                        backgroundColor: staff.employmentType == 'Intern'
                            ? const Color(0xFFF3E8FF)
                            : const Color(0xFFEFF6FF),
                        child: Text(
                          staff.name.isNotEmpty ? staff.name[0].toUpperCase() : 'U',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: staff.employmentType == 'Intern'
                                ? const Color(0xFF7C3AED)
                                : const Color(0xFF2563EB),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    staff.name,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF0F172A),
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: staff.employmentType == 'Intern'
                                        ? const Color(0xFFF3E8FF)
                                        : const Color(0xFFEFF6FF),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    staff.employmentType.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w800,
                                      color: staff.employmentType == 'Intern'
                                          ? const Color(0xFF7C3AED)
                                          : const Color(0xFF2563EB),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${staff.employeeId} • ${staff.department} • ${staff.role}',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFFF1F5F9), height: 1),
                  const SizedBox(height: 14),

                  // Allocation Mode Segment
                  Row(
                    children: [
                      const Text(
                        'Allocation Mode:',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                      ),
                      const Spacer(),
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            _buildModeTab('Set Total Quota', mode == 'set', () {
                              setModalState(() => mode = 'set');
                            }),
                            _buildModeTab('Credit Adjustment', mode == 'adjust', () {
                              setModalState(() => mode = 'adjust');
                            }),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Casual Leave Stepper
                  _buildQuotaStepperRow(
                    title: 'Casual Leave (CL)',
                    description: mode == 'set'
                        ? 'Total allocated annual days (${bal.casualLeave.used} currently used)'
                        : 'Days to add (+) or deduct (-)',
                    value: casual,
                    color: const Color(0xFF2563EB),
                    icon: LucideIcons.calendar,
                    onMinus: () {
                      if (casual > 0) setModalState(() => casual--);
                    },
                    onPlus: () => setModalState(() => casual++),
                  ),
                  const SizedBox(height: 12),

                  // Sick Leave Stepper
                  _buildQuotaStepperRow(
                    title: 'Sick Leave (SL)',
                    description: mode == 'set'
                        ? 'Medical / convalescence days (${bal.sickLeave.used} currently used)'
                        : 'Days to add (+) or deduct (-)',
                    value: sick,
                    color: const Color(0xFFD97706),
                    icon: LucideIcons.stethoscope,
                    onMinus: () {
                      if (sick > 0) setModalState(() => sick--);
                    },
                    onPlus: () => setModalState(() => sick++),
                  ),
                  if (!isIntern) ...[
                    const SizedBox(height: 12),
                    // Earned / Annual Leave Stepper
                    _buildQuotaStepperRow(
                      title: 'Earned / Annual Leave (EL)',
                      description: mode == 'set'
                          ? 'Paid annual vacation days (${bal.earnedLeave.used} currently used)'
                          : 'Days to add (+) or deduct (-)',
                      value: earned,
                      color: const Color(0xFF059669),
                      icon: LucideIcons.palmtree,
                      onMinus: () {
                        if (earned > 0) setModalState(() => earned--);
                      },
                      onPlus: () => setModalState(() => earned++),
                    ),
                  ],
                  const SizedBox(height: 14),

                  // Total Entitlement Summary Chip
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(LucideIcons.checkCheck, size: 16, color: Color(0xFF059669)),
                            SizedBox(width: 8),
                            Text(
                              'Combined Annual Allowance',
                              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                            ),
                          ],
                        ),
                        Text(
                          '$totalEntitlement Days',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Reason / Audit Justification Input
                  const Text(
                    'Audit Justification / Policy Note',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: reasonCtrl,
                    decoration: InputDecoration(
                      hintText: 'e.g. Annual Quota 2026, Performance Bonus Leave...',
                      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                      prefixIcon: const Icon(LucideIcons.fileText, size: 16, color: Color(0xFF64748B)),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: const BorderSide(color: Color(0xFFCBD5E1)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            foregroundColor: const Color(0xFF475569),
                          ),
                          onPressed: isSaving ? null : () => Navigator.pop(modalCtx),
                          child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            elevation: 2,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: isSaving
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Icon(LucideIcons.save, size: 16),
                          label: Text(
                            isSaving ? 'Updating...' : 'Save & Allocate Quota',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
                          ),
                          onPressed: isSaving
                              ? null
                              : () async {
                                  setModalState(() => isSaving = true);
                                  final ok = await _api.allocateLeaveQuota(
                                    userId: staff.userId,
                                    casual: casual,
                                    sick: sick,
                                    annual: earned,
                                    mode: mode,
                                    reason: reasonCtrl.text.trim(),
                                  );

                                  setModalState(() => isSaving = false);

                                  if (ok) {
                                    if (modalCtx.mounted) Navigator.pop(modalCtx);
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Row(
                                            children: [
                                              const Icon(LucideIcons.checkCircle2, color: Colors.white, size: 18),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Text(
                                                  'Updated leave quota for ${staff.name} (CL: $casual, SL: $sick, EL: $earned)',
                                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5),
                                                ),
                                              ),
                                            ],
                                          ),
                                          backgroundColor: const Color(0xFF10B981),
                                          behavior: SnackBarBehavior.floating,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        ),
                                      );
                                      _loadStaffBalances();
                                    }
                                  } else {
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Failed to update leave quota. Please retry.'),
                                          backgroundColor: Color(0xFFEF4444),
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                    }
                                  }
                                },
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildModeTab(String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildQuotaStepperRow({
    required String title,
    required String description,
    required int value,
    required Color color,
    required IconData icon,
    required VoidCallback onMinus,
    required VoidCallback onPlus,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 16, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
          // Stepper
          Row(
            children: [
              IconButton(
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFFF1F5F9),
                  padding: const EdgeInsets.all(6),
                  minimumSize: const Size(32, 32),
                ),
                icon: const Icon(LucideIcons.minus, size: 14, color: Color(0xFF475569)),
                onPressed: onMinus,
              ),
              SizedBox(
                width: 42,
                height: 32,
                child: Center(
                  child: Text(
                    '$value',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: color),
                  ),
                ),
              ),
              IconButton(
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFFF1F5F9),
                  padding: const EdgeInsets.all(6),
                  minimumSize: const Size(32, 32),
                ),
                icon: const Icon(LucideIcons.plus, size: 14, color: Color(0xFF475569)),
                onPressed: onPlus,
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── SCREEN BUILD ─────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        leading: widget.showBackButton
            ? IconButton(
                icon: const Icon(LucideIcons.arrowLeft, color: Color(0xFF0F172A)),
                onPressed: () => Navigator.pop(context),
              )
            : null,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Leave Quota & Policy Allocation',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            Text(
              'Workforce Entitlement Governance (2026)',
              style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18, color: Color(0xFF64748B)),
            onPressed: _loadStaffBalances,
          ),
        ],
      ),
      body: _isLoading
          ? const ShimmerLoading(
              isLoading: true,
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  children: [
                    SkeletonUserCard(),
                    SkeletonUserCard(),
                    SkeletonUserCard(),
                  ],
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadStaffBalances,
              color: const Color(0xFF2563EB),
              child: ListView(
                padding: const EdgeInsets.all(16),
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  // 1. Telemetry Ribbon
                  _buildTelemetryHeader(),
                  const SizedBox(height: 16),

                  // 2. Search & Filter Section
                  _buildSearchAndFilters(),
                  const SizedBox(height: 14),

                  // 3. Staff Roster Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Personnel Directory (${_filteredList.length})',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        'Current Year: ${DateTime.now().year}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // 4. Staff Cards
                  if (_filteredList.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: const Column(
                        children: [
                          Icon(LucideIcons.users, size: 32, color: Color(0xFF94A3B8)),
                          SizedBox(height: 10),
                          Text('No personnel matching filter', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                          SizedBox(height: 4),
                          Text('Try adjusting your search or role selection.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        ],
                      ),
                    )
                  else
                    ..._filteredList.map((staff) => _buildStaffQuotaCard(staff)),
                ],
              ),
            ),
    );
  }

  // ── TELEMETRY HEADER ─────────────────────────────────────────────────────────
  Widget _buildTelemetryHeader() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: [
          _buildStatCard(
            title: 'Active Personnel',
            value: '$_totalStaff',
            subtitle: 'Enrolled in policy',
            color: const Color(0xFF2563EB),
            bg: const Color(0xFFEFF6FF),
            icon: LucideIcons.users,
          ),
          const SizedBox(width: 10),
          _buildStatCard(
            title: 'Avg Casual Quota',
            value: '${_avgCasual.toStringAsFixed(1)}d',
            subtitle: 'Target: 10-12 days',
            color: const Color(0xFF3B82F6),
            bg: const Color(0xFFEFF6FF),
            icon: LucideIcons.calendar,
          ),
          const SizedBox(width: 10),
          _buildStatCard(
            title: 'Avg Sick Quota',
            value: '${_avgSick.toStringAsFixed(1)}d',
            subtitle: 'Target: 7-8 days',
            color: const Color(0xFFD97706),
            bg: const Color(0xFFFEF3C7),
            icon: LucideIcons.stethoscope,
          ),
          const SizedBox(width: 10),
          _buildStatCard(
            title: 'Avg Earned Quota',
            value: '${_avgEarned.toStringAsFixed(1)}d',
            subtitle: 'Target: 15-18 days',
            color: const Color(0xFF059669),
            bg: const Color(0xFFECFDF5),
            icon: LucideIcons.palmtree,
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required String subtitle,
    required Color color,
    required Color bg,
    required IconData icon,
  }) {
    return Container(
      width: 140,
      padding: const EdgeInsets.all(12),
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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
                child: Icon(icon, size: 12, color: color),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8))),
        ],
      ),
    );
  }

  // ── SEARCH & FILTERS ─────────────────────────────────────────────────────────
  Widget _buildSearchAndFilters() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: TextField(
            controller: _searchCtrl,
            onChanged: (val) => setState(() => _searchQuery = val.trim()),
            decoration: InputDecoration(
              hintText: 'Search staff by name, ID, or department...',
              hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
              prefixIcon: const Icon(LucideIcons.search, size: 18, color: Color(0xFF64748B)),
              suffixIcon: _searchCtrl.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(LucideIcons.x, size: 16, color: Color(0xFF94A3B8)),
                      onPressed: () {
                        _searchCtrl.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: ['All', 'Intern', 'Full-time'].map((role) {
              final isSel = _selectedRoleFilter == role;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text(role == 'All' ? 'All Roles' : (role == 'Intern' ? 'Interns' : 'Full-time Staff')),
                  selected: isSel,
                  selectedColor: const Color(0xFF2563EB),
                  backgroundColor: Colors.white,
                  labelStyle: TextStyle(
                    fontSize: 11.5,
                    fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                    color: isSel ? Colors.white : const Color(0xFF475569),
                  ),
                  side: BorderSide(color: isSel ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  onSelected: (_) => setState(() => _selectedRoleFilter = role),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  // ── STAFF QUOTA CARD ─────────────────────────────────────────────────────────
  Widget _buildStaffQuotaCard(StaffLeaveQuotaItem staff) {
    final bal = staff.leaveBalance;
    final isIntern = staff.employmentType == 'Intern';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Profile & Action Button
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: isIntern ? const Color(0xFFF3E8FF) : const Color(0xFFEFF6FF),
                child: Text(
                  staff.name.isNotEmpty ? staff.name[0].toUpperCase() : 'U',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: isIntern ? const Color(0xFF7C3AED) : const Color(0xFF2563EB),
                    fontSize: 14,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            staff.name,
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isIntern ? const Color(0xFFF3E8FF) : const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            staff.employmentType.toUpperCase(),
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: isIntern ? const Color(0xFF7C3AED) : const Color(0xFF2563EB),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${staff.employeeId} • ${staff.department}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  minimumSize: const Size(0, 32),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
                icon: const Icon(LucideIcons.sliders, size: 12),
                label: const Text('Assign Quota', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                onPressed: () => _openQuotaAllocationModal(staff),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Row 2: 3 Quota Breakdown Pills (CL, SL, EL)
          Row(
            children: [
              Expanded(
                child: _buildQuotaMetricBox(
                  title: 'Casual Leave',
                  remaining: bal.casualLeave.remaining,
                  used: bal.casualLeave.used,
                  total: bal.casualLeave.total,
                  color: const Color(0xFF2563EB),
                  bg: const Color(0xFFEFF6FF),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildQuotaMetricBox(
                  title: 'Sick Leave',
                  remaining: bal.sickLeave.remaining,
                  used: bal.sickLeave.used,
                  total: bal.sickLeave.total,
                  color: const Color(0xFFD97706),
                  bg: const Color(0xFFFEF3C7),
                ),
              ),
              if (!isIntern && bal.earnedLeave.total > 0) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: _buildQuotaMetricBox(
                    title: 'Earned Leave',
                    remaining: bal.earnedLeave.remaining,
                    used: bal.earnedLeave.used,
                    total: bal.earnedLeave.total,
                    color: const Color(0xFF059669),
                    bg: const Color(0xFFECFDF5),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuotaMetricBox({
    required String title,
    required int remaining,
    required int used,
    required int total,
    required Color color,
    required Color bg,
  }) {
    final double pct = total > 0 ? (used / total).clamp(0.0, 1.0) : 0.0;

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
          const SizedBox(height: 3),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '$remaining',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: color),
              ),
              const SizedBox(width: 3),
              Text(
                '/$total d',
                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF94A3B8)),
              ),
            ],
          ),
          const SizedBox(height: 5),
          // Micro Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 3,
              backgroundColor: const Color(0xFFE2E8F0),
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
          const SizedBox(height: 3),
          Text(
            '$used used',
            style: const TextStyle(fontSize: 9, color: Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }
}
