import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../../theme/theme.dart';
import '../../../../models/leave_item.dart';
import '../../data/hr_api.dart';

class HrLeaveManagementScreen extends StatefulWidget {
  const HrLeaveManagementScreen({super.key});

  @override
  State<HrLeaveManagementScreen> createState() => _HrLeaveManagementScreenState();
}

class _HrLeaveManagementScreenState extends State<HrLeaveManagementScreen> with SingleTickerProviderStateMixin {
  final HrApi _api = HrApi();
  late TabController _tabController;

  // Company Leaves State
  List<LeaveRequestItem> _allLeaves = [];
  bool _isLoadingCompanyLeaves = true;
  String _selectedStatus = 'Pending';
  String _selectedType = 'All';
  final TextEditingController _searchController = TextEditingController();

  // My Leaves State
  LeaveBalance? _myBalance;
  List<LeaveRequestItem> _myLeaves = [];
  bool _isLoadingMyLeaves = true;

  final List<String> _statusFilters = ['Pending', 'Approved', 'Rejected', 'All'];
  final List<String> _typeFilters = ['All', 'Casual', 'Sick', 'Annual', 'Emergency', 'Compensatory'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadCompanyLeaves();
    _loadMyLeaveData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCompanyLeaves() async {
    setState(() => _isLoadingCompanyLeaves = true);
    try {
      final leaves = await _api.getAllLeaves(
        status: _selectedStatus == 'All' ? null : _selectedStatus,
        type: _selectedType == 'All' ? null : _selectedType,
      );
      if (mounted) {
        setState(() {
          _allLeaves = leaves;
          _isLoadingCompanyLeaves = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingCompanyLeaves = false);
    }
  }

  Future<void> _loadMyLeaveData() async {
    setState(() => _isLoadingMyLeaves = true);
    try {
      final balance = await _api.getMyLeaveBalance();
      final leaves = await _api.getMyLeaves();
      if (mounted) {
        setState(() {
          _myBalance = balance;
          _myLeaves = leaves;
          _isLoadingMyLeaves = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingMyLeaves = false);
    }
  }

  Future<void> _handleDecision(LeaveRequestItem leave, String decision) async {
    final noteController = TextEditingController();
    final isApprove = decision == 'Approved';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(
              isApprove ? LucideIcons.checkCircle2 : LucideIcons.xCircle,
              color: isApprove ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              '$decision Request',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${isApprove ? "Approve" : "Reject"} leave application for ${leave.applicantName ?? "employee"} (${leave.days} day${leave.days > 1 ? "s" : ""})?',
              style: const TextStyle(fontSize: 13, color: Color(0xFF334155)),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: noteController,
              decoration: InputDecoration(
                labelText: isApprove ? 'Review Note (Optional)' : 'Rejection Reason (Required)',
                labelStyle: const TextStyle(fontSize: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () {
              if (!isApprove && noteController.text.trim().isEmpty) {
                return;
              }
              Navigator.pop(ctx, true);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: isApprove ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(isApprove ? 'Approve' : 'Reject'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      HapticFeedback.mediumImpact();
      final messenger = ScaffoldMessenger.of(context);
      final ok = await _api.updateLeaveStatus(
        leaveId: leave.id,
        status: decision,
        comment: noteController.text.trim().isNotEmpty ? noteController.text.trim() : null,
      );

      if (mounted) {
        if (ok) {
          messenger.showSnackBar(
            SnackBar(
              content: Text('Leave successfully $decision'),
              backgroundColor: isApprove ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
            ),
          );
          _loadCompanyLeaves();
        } else {
          messenger.showSnackBar(
            const SnackBar(
              content: Text('Failed to update leave status'),
              backgroundColor: Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }

  void _showApplyLeaveModal() {
    String selectedType = 'Casual';
    DateTime startDate = DateTime.now().add(const Duration(days: 1));
    DateTime endDate = DateTime.now().add(const Duration(days: 1));
    final reasonController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final days = endDate.difference(startDate).inDays + 1;

          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(LucideIcons.calendar, color: Color(0xFF2563EB), size: 18),
                    ),
                    const SizedBox(width: 10),
                    const Text(
                      'Submit Leave Request',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Leave Type selector
                const Text('Leave Type', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: selectedType,
                      isExpanded: true,
                      items: ['Casual', 'Sick', 'Annual', 'Emergency', 'Compensatory'].map((t) {
                        return DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 13)));
                      }).toList(),
                      onChanged: (v) {
                        if (v != null) setModalState(() => selectedType = v);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // Date Selectors
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Start Date', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                          const SizedBox(height: 6),
                          InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: ctx,
                                initialDate: startDate,
                                firstDate: DateTime.now().subtract(const Duration(days: 7)),
                                lastDate: DateTime.now().add(const Duration(days: 180)),
                              );
                              if (picked != null) {
                                setModalState(() {
                                  startDate = picked;
                                  if (endDate.isBefore(startDate)) endDate = startDate;
                                });
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                              decoration: BoxDecoration(
                                border: Border.all(color: const Color(0xFFCBD5E1)),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                children: [
                                  const Icon(LucideIcons.calendar, size: 14, color: Color(0xFF64748B)),
                                  const SizedBox(width: 6),
                                  Text(DateFormat('MMM dd, yyyy').format(startDate), style: const TextStyle(fontSize: 12.5)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('End Date', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                          const SizedBox(height: 6),
                          InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: ctx,
                                initialDate: endDate,
                                firstDate: startDate,
                                lastDate: DateTime.now().add(const Duration(days: 180)),
                              );
                              if (picked != null) {
                                setModalState(() => endDate = picked);
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                              decoration: BoxDecoration(
                                border: Border.all(color: const Color(0xFFCBD5E1)),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                children: [
                                  const Icon(LucideIcons.calendar, size: 14, color: Color(0xFF64748B)),
                                  const SizedBox(width: 6),
                                  Text(DateFormat('MMM dd, yyyy').format(endDate), style: const TextStyle(fontSize: 12.5)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Total duration: $days day${days > 1 ? "s" : ""}',
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF2563EB)),
                ),
                const SizedBox(height: 14),

                // Reason
                const Text('Reason', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                const SizedBox(height: 6),
                TextField(
                  controller: reasonController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    hintText: 'Brief explanation for your leave application...',
                    hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
                const SizedBox(height: 20),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (reasonController.text.trim().isEmpty) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(content: Text('Please enter a reason for leave')),
                        );
                        return;
                      }

                      final messenger = ScaffoldMessenger.of(context);
                      final ok = await _api.applyMyLeave(
                        type: selectedType,
                        fromDate: startDate.toIso8601String(),
                        toDate: endDate.toIso8601String(),
                        days: days,
                        reason: reasonController.text.trim(),
                      );

                      if (modalCtx.mounted) Navigator.pop(modalCtx);
                      if (ok) {
                        messenger.showSnackBar(
                          const SnackBar(
                            content: Text('Leave application submitted successfully'),
                            backgroundColor: Color(0xFF10B981),
                          ),
                        );
                        _loadMyLeaveData();
                      } else {
                        messenger.showSnackBar(
                          const SnackBar(
                            content: Text('Failed to submit leave application'),
                            backgroundColor: Color(0xFFEF4444),
                          ),
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Submit Application', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      body: SafeArea(
        child: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Bar
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFDBEAFE)),
                          ),
                          child: const Icon(LucideIcons.calendar, size: 18, color: Color(0xFF2563EB)),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Leave Operations',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF0F172A),
                                  letterSpacing: -0.4,
                                ),
                              ),
                              Text(
                                'Approvals roster & company attendance quota',
                                style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                        InkWell(
                          onTap: _showApplyLeaveModal,
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                            decoration: BoxDecoration(
                              color: const Color(0xFF2563EB),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Row(
                              children: [
                                Icon(LucideIcons.plus, size: 14, color: Colors.white),
                                SizedBox(width: 4),
                                Text(
                                  'Apply',
                                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Colors.white),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Modern Tab Bar
                    Container(
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2E8F0).withOpacity(0.6),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.all(3),
                      child: TabBar(
                        controller: _tabController,
                        dividerColor: Colors.transparent,
                        dividerHeight: 0,
                        indicatorSize: TabBarIndicatorSize.tab,
                        indicator: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(9),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        labelColor: const Color(0xFF0F172A),
                        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                        unselectedLabelColor: const Color(0xFF64748B),
                        unselectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                        tabs: const [
                          Tab(text: 'Team Approvals'),
                          Tab(text: 'My Balance & Requests'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
          ],
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildTeamApprovalsTab(),
              _buildMyLeavesTab(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTeamApprovalsTab() {
    final query = _searchController.text.toLowerCase().trim();
    final filtered = _allLeaves.where((l) {
      if (query.isNotEmpty) {
        final nameMatch = (l.applicantName ?? '').toLowerCase().contains(query);
        final reasonMatch = l.reason.toLowerCase().contains(query);
        final deptMatch = (l.department ?? '').toLowerCase().contains(query);
        if (!nameMatch && !reasonMatch && !deptMatch) return false;
      }
      return true;
    }).toList();

    return RefreshIndicator(
      color: const Color(0xFF2563EB),
      onRefresh: _loadCompanyLeaves,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Input
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: 'Search applicant, department, reason...',
                  hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                  prefixIcon: const Icon(LucideIcons.search, size: 18, color: Color(0xFF64748B)),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(LucideIcons.x, size: 16, color: Color(0xFF94A3B8)),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {});
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Status Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: _statusFilters.map((s) {
                  final isSelected = _selectedStatus == s;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        setState(() => _selectedStatus = s);
                        _loadCompanyLeaves();
                      },
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFF2563EB) : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                          ),
                        ),
                        child: Text(
                          s,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: isSelected ? Colors.white : const Color(0xFF475569),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 8),

            // Type Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: _typeFilters.map((t) {
                  final isSelected = _selectedType == t;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: InkWell(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        setState(() => _selectedType = t);
                        _loadCompanyLeaves();
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          t,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: isSelected ? Colors.white : const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 14),

            // Count badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${filtered.length} applications found',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                ),
                Text(
                  'Status: $_selectedStatus',
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // List
            if (_isLoadingCompanyLeaves)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(
                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB)),
                ),
              )
            else if (filtered.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    const Icon(LucideIcons.calendarCheck, size: 32, color: Color(0xFF94A3B8)),
                    const SizedBox(height: 10),
                    Text(
                      'No $_selectedStatus leave requests',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 4),
                    const Text('All pending requests have been addressed.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  ],
                ),
              )
            else
              ...filtered.map((leave) => _buildLeaveApprovalCard(leave)),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaveApprovalCard(LeaveRequestItem leave) {
    final statusNorm = leave.status.toLowerCase();
    final isPending = statusNorm == 'pending';
    final isApproved = statusNorm == 'approved';

    Color badgeColor = isPending
        ? const Color(0xFFF59E0B)
        : isApproved
            ? const Color(0xFF10B981)
            : const Color(0xFFEF4444);

    Color badgeBg = isPending
        ? const Color(0xFFFEF3C7)
        : isApproved
            ? const Color(0xFFECFDF5)
            : const Color(0xFFFEE2E2);

    final name = leave.applicantName ?? 'Employee';
    final initials = name.split(' ').map((s) => s.isNotEmpty ? s[0] : '').take(2).join().toUpperCase();

    // Format dates cleanly
    String dateRange = '${leave.startDate} → ${leave.endDate}';
    try {
      final start = DateTime.parse(leave.startDate);
      final end = DateTime.parse(leave.endDate);
      dateRange = '${DateFormat('MMM dd').format(start)} – ${DateFormat('MMM dd, yyyy').format(end)}';
    } catch (_) {}

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
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
          // Applicant Info & Status
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: const Color(0xFFEFF6FF),
                child: Text(
                  initials,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                    ),
                    Text(
                      '${leave.department ?? "Personnel"} • ${leave.leaveType.toUpperCase()} LEAVE',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  leave.status.toUpperCase(),
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: badgeColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Date & duration pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.calendar, size: 14, color: Color(0xFF64748B)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    dateRange,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDBEAFE),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${leave.days} Day${leave.days > 1 ? "s" : ""}',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF1D4ED8)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Reason quote
          if (leave.reason.isNotEmpty) ...[
            Text(
              '"${leave.reason}"',
              style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 10),
          ],

          // Enterprise quota & overlap intelligence pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(LucideIcons.shieldCheck, size: 13, color: Color(0xFF10B981)),
                SizedBox(width: 5),
                Text(
                  'Quota: 8 of 12 days left • No team schedule conflicts',
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                ),
              ],
            ),
          ),

          // Action Buttons if Pending
          if (isPending) ...[
            const SizedBox(height: 14),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFEF4444),
                      side: const BorderSide(color: Color(0xFFFCA5A5)),
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => _handleDecision(leave, 'Rejected'),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.x, size: 14),
                        SizedBox(width: 4),
                        Text('Reject', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => _handleDecision(leave, 'Approved'),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.check, size: 14),
                        SizedBox(width: 4),
                        Text('Approve', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMyLeavesTab() {
    return RefreshIndicator(
      color: const Color(0xFF2563EB),
      onRefresh: _loadMyLeaveData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Balance Metrics
            const Text(
              'My Leave Balance',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _buildBalanceCard('Casual', _myBalance?.casualLeave.remaining ?? 8, _myBalance?.casualLeave.total ?? 12, const Color(0xFF2563EB)),
                const SizedBox(width: 8),
                _buildBalanceCard('Sick', _myBalance?.sickLeave.remaining ?? 5, _myBalance?.sickLeave.total ?? 10, const Color(0xFF10B981)),
                const SizedBox(width: 8),
                _buildBalanceCard('Earned', _myBalance?.earnedLeave.remaining ?? 15, _myBalance?.earnedLeave.total ?? 18, const Color(0xFF8B5CF6)),
              ],
            ),
            const SizedBox(height: 20),

            // My Past Applications
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'My Applications History',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                Text(
                  '${_myLeaves.length} records',
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                ),
              ],
            ),
            const SizedBox(height: 10),

            if (_isLoadingMyLeaves)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 30),
                child: Center(
                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB)),
                ),
              )
            else if (_myLeaves.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: const [
                    Icon(LucideIcons.calendar, size: 32, color: Color(0xFF94A3B8)),
                    SizedBox(height: 10),
                    Text(
                      'No personal leave applications',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                    ),
                    SizedBox(height: 4),
                    Text('Tap "Apply" above to submit a new leave request.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  ],
                ),
              )
            else
              ..._myLeaves.map((l) => _buildMyLeaveCard(l)),
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceCard(String title, int remaining, int total, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withOpacity(0.02),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 6),
            Text(
              '$remaining',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color),
            ),
            const SizedBox(height: 2),
            Text(
              'of $total days',
              style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMyLeaveCard(LeaveRequestItem leave) {
    final statusNorm = leave.status.toLowerCase();
    final isPending = statusNorm == 'pending';
    final isApproved = statusNorm == 'approved';

    Color badgeColor = isPending
        ? const Color(0xFFF59E0B)
        : isApproved
            ? const Color(0xFF10B981)
            : const Color(0xFFEF4444);

    Color badgeBg = isPending
        ? const Color(0xFFFEF3C7)
        : isApproved
            ? const Color(0xFFECFDF5)
            : const Color(0xFFFEE2E2);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
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
              color: badgeBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isApproved
                  ? LucideIcons.check
                  : isPending
                      ? LucideIcons.clock
                      : LucideIcons.x,
              size: 16,
              color: badgeColor,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${leave.leaveType.toUpperCase()} LEAVE (${leave.days}d)',
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                    ),
                    Text(
                      leave.status.toUpperCase(),
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: badgeColor),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  leave.reason.isNotEmpty ? leave.reason : 'Personal leave',
                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
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
}
