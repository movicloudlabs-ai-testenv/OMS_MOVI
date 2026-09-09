import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';

import '../../../../theme/theme.dart';
import '../../../../models/attendance_record.dart';
import '../../../../models/leave_item.dart';
import '../../../../core/widgets/shimmer_skeleton.dart';
import '../../../../core/widgets/enterprise_pull_to_refresh.dart';
import '../../../../routing/app_routes.dart';
import 'package:go_router/go_router.dart';
import '../../data/hr_api.dart';

/// ── UNIFIED ATTENDANCE & LEAVES COMMAND HUB ─────────────────────────────────
/// Combines real-time biometric/mobile workforce attendance with company-wide
/// leave management, regularization review, and manual override capabilities.
class HrAttendanceHubScreen extends StatefulWidget {
  final bool showBackButton;

  const HrAttendanceHubScreen({super.key, this.showBackButton = false});

  @override
  State<HrAttendanceHubScreen> createState() => _HrAttendanceHubScreenState();
}

class _HrAttendanceHubScreenState extends State<HrAttendanceHubScreen> {
  final HrApi _api = HrApi();

  // 0: Attendance Hub, 1: Leaves Management
  int _mainToggleIndex = 0;

  // ── ATTENDANCE STATE ──
  bool _loadingAttendance = false;
  TodayRosterSummary? _summary;
  List<TodayRosterItem> _roster = [];
  List<AttendanceRegularizationItem> _regularizations = [];

  int _attendanceSubTab = 0; // 0: Live Roster, 1: Regularizations
  String _rosterStatusFilter = 'All'; // 'All', 'Present', 'Late', 'Absent', 'WFH', 'Leave'
  String _rosterTypeFilter = 'All'; // 'All', 'Intern', 'Full-time'
  final TextEditingController _attendanceSearchCtrl = TextEditingController();
  String _regularizationFilter = 'Pending'; // 'Pending', 'Approved', 'Rejected', 'All'

  // ── LEAVES STATE ──
  bool _loadingLeaves = false;
  int _leaveSubTab = 0; // 0: Company Leaves, 1: My Leaves & Balance
  List<LeaveRequestItem> _allLeaves = [];
  String _leaveStatusFilter = 'Pending';
  String _leaveTypeFilter = 'All';
  final TextEditingController _leaveSearchCtrl = TextEditingController();

  LeaveBalance? _myBalance;
  List<LeaveRequestItem> _myLeaves = [];

  final List<String> _leaveStatusOptions = ['Pending', 'Approved', 'Rejected', 'All'];
  final List<String> _leaveTypeOptions = ['All', 'Casual', 'Sick', 'Annual', 'Emergency', 'Compensatory'];

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  @override
  void dispose() {
    _attendanceSearchCtrl.dispose();
    _leaveSearchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    await Future.wait([
      _loadAttendanceData(),
      _loadLeavesData(),
    ]);
  }

  Future<void> _loadAttendanceData() async {
    setState(() => _loadingAttendance = true);
    try {
      final rosterData = await _api.getTodayAttendanceRoster();
      final regData = await _api.getAttendanceRegularizations(
        status: _regularizationFilter == 'All' ? null : _regularizationFilter,
      );

      if (mounted) {
        setState(() {
          _summary = rosterData['summary'] as TodayRosterSummary?;
          _roster = (rosterData['roster'] as List<TodayRosterItem>?) ?? [];
          _regularizations = regData;
          _loadingAttendance = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingAttendance = false);
    }
  }

  Future<void> _loadLeavesData() async {
    setState(() => _loadingLeaves = true);
    try {
      final leaves = await _api.getAllLeaves(
        status: _leaveStatusFilter == 'All' ? null : _leaveStatusFilter,
        type: _leaveTypeFilter == 'All' ? null : _leaveTypeFilter,
      );
      final balance = await _api.getMyLeaveBalance();
      final myLeaves = await _api.getMyLeaves();

      if (mounted) {
        setState(() {
          _allLeaves = leaves;
          _myBalance = balance;
          _myLeaves = myLeaves;
          _loadingLeaves = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingLeaves = false);
    }
  }

  // ── ATTENDANCE OVERRIDE MODAL (FIXED & IMPROVED) ───────────────────────────
  void _showAttendanceOverrideModal(TodayRosterItem item) {
    HapticFeedback.lightImpact();

    String selectedStatus = item.status.isNotEmpty ? item.status : 'Present';
    String selectedMode = item.workMode.isNotEmpty ? item.workMode : 'Office';

    // Parse checkIn and checkOut
    TimeOfDay checkInTime = const TimeOfDay(hour: 9, minute: 30);
    TimeOfDay checkOutTime = const TimeOfDay(hour: 18, minute: 30);

    if (item.checkIn != null && item.checkIn!.isNotEmpty) {
      final parts = item.checkIn!.split(RegExp(r'[:\s]'));
      if (parts.length >= 2) {
        int h = int.tryParse(parts[0]) ?? 9;
        int m = int.tryParse(parts[1]) ?? 30;
        if (item.checkIn!.toUpperCase().contains('PM') && h < 12) h += 12;
        if (item.checkIn!.toUpperCase().contains('AM') && h == 12) h = 0;
        checkInTime = TimeOfDay(hour: h, minute: m);
      }
    }

    if (item.checkOut != null && item.checkOut!.isNotEmpty) {
      final parts = item.checkOut!.split(RegExp(r'[:\s]'));
      if (parts.length >= 2) {
        int h = int.tryParse(parts[0]) ?? 18;
        int m = int.tryParse(parts[1]) ?? 30;
        if (item.checkOut!.toUpperCase().contains('PM') && h < 12) h += 12;
        if (item.checkOut!.toUpperCase().contains('AM') && h == 12) h = 0;
        checkOutTime = TimeOfDay(hour: h, minute: m);
      }
    }

    final noteCtrl = TextEditingController(text: item.note);
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) {
          String formatTime(TimeOfDay t) {
            final now = DateTime.now();
            final dt = DateTime(now.year, now.month, now.day, t.hour, t.minute);
            return DateFormat('hh:mm a').format(dt);
          }

          return Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.90,
            ),
            padding: EdgeInsets.only(
              top: 14,
              left: 20,
              right: 20,
              bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
            ),
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Drag Handle
                  Center(
                    child: Container(
                      width: 44,
                      height: 4.5,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Header Profile Card
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 22,
                        backgroundColor: const Color(0xFFEFF6FF),
                        child: Text(
                          item.name.isNotEmpty ? item.name[0].toUpperCase() : 'U',
                          style: const TextStyle(
                            color: Color(0xFF2563EB),
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Manual Override: ${item.name}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${item.designation} • ${item.employmentType}',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Color(0xFFF1F5F9),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(LucideIcons.x, size: 16, color: Color(0xFF64748B)),
                        ),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const Divider(height: 24, color: Color(0xFFE2E8F0)),

                  // ── 1. ATTENDANCE STATUS ──
                  const Text(
                    'ATTENDANCE STATUS',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: ['Present', 'Half-Day', 'Absent', 'Leave'].map((st) {
                      final isSel = selectedStatus.toLowerCase() == st.toLowerCase();
                      return InkWell(
                        onTap: () => setModalState(() => selectedStatus = st),
                        borderRadius: BorderRadius.circular(10),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSel ? const Color(0xFF2563EB) : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSel ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                              width: isSel ? 1.5 : 1.0,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (isSel) ...[
                                const Icon(LucideIcons.check, size: 13, color: Colors.white),
                                const SizedBox(width: 4),
                              ],
                              Text(
                                st,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                                  color: isSel ? Colors.white : const Color(0xFF334155),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  // ── 2. WORK MODE ──
                  const Text(
                    'WORK MODE',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      {'name': 'Office', 'icon': LucideIcons.building2},
                      {'name': 'WFH', 'icon': LucideIcons.home},
                      {'name': 'On-Duty', 'icon': LucideIcons.briefcase},
                    ].map((m) {
                      final name = m['name'] as String;
                      final icon = m['icon'] as IconData;
                      final isSel = selectedMode == name;
                      return InkWell(
                        onTap: () => setModalState(() => selectedMode = name),
                        borderRadius: BorderRadius.circular(10),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSel ? const Color(0xFFEFF6FF) : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSel ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                              width: isSel ? 1.5 : 1.0,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(icon, size: 13, color: isSel ? const Color(0xFF2563EB) : const Color(0xFF64748B)),
                              const SizedBox(width: 5),
                              Text(
                                name,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                                  color: isSel ? const Color(0xFF2563EB) : const Color(0xFF334155),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  // ── 3. INTERACTIVE TIME PICKERS ──
                  Row(
                    children: [
                      // Check In Picker
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'CHECK IN TIME',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5),
                            ),
                            const SizedBox(height: 6),
                            InkWell(
                              onTap: () async {
                                final picked = await showTimePicker(
                                  context: modalCtx,
                                  initialTime: checkInTime,
                                );
                                if (picked != null) {
                                  setModalState(() => checkInTime = picked);
                                }
                              },
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(LucideIcons.clock, size: 16, color: Color(0xFF2563EB)),
                                    const SizedBox(width: 8),
                                    Text(
                                      formatTime(checkInTime),
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Check Out Picker
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'CHECK OUT TIME',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5),
                            ),
                            const SizedBox(height: 6),
                            InkWell(
                              onTap: () async {
                                final picked = await showTimePicker(
                                  context: modalCtx,
                                  initialTime: checkOutTime,
                                );
                                if (picked != null) {
                                  setModalState(() => checkOutTime = picked);
                                }
                              },
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(LucideIcons.clock, size: 16, color: Color(0xFF2563EB)),
                                    const SizedBox(width: 8),
                                    Text(
                                      formatTime(checkOutTime),
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // ── 4. HR OVERRIDE NOTE ──
                  const Text(
                    'HR OVERRIDE NOTE',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: noteCtrl,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'e.g. Excused for on-campus presentation, medical half-day...',
                      hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                      fillColor: const Color(0xFFF8FAFC),
                      filled: true,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Quick Suggestion Chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: ['+ Client Meeting', '+ Biometric Glitch', '+ WFH Approved', '+ Excused Half-Day'].map((tag) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ActionChip(
                            label: Text(tag, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600)),
                            backgroundColor: const Color(0xFFF1F5F9),
                            onPressed: () {
                              setModalState(() {
                                final clean = tag.replaceAll('+', '').trim();
                                noteCtrl.text = noteCtrl.text.isEmpty ? clean : '${noteCtrl.text}, $clean';
                              });
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 22),

                  // ── 5. DUAL ACTION BAR ──
                  Row(
                    children: [
                      Expanded(
                        flex: 1,
                        child: SizedBox(
                          height: 48,
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFFCBD5E1)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              foregroundColor: const Color(0xFF475569),
                            ),
                            onPressed: isSaving ? null : () => Navigator.pop(ctx),
                            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: SizedBox(
                          height: 48,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppThemeColors.primary,
                              foregroundColor: Colors.white,
                              elevation: 2,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            icon: isSaving
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Icon(LucideIcons.check, size: 17),
                            label: Text(
                              isSaving ? 'Saving...' : 'Save Attendance Override',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
                            ),
                            onPressed: isSaving
                                ? null
                                : () async {
                                    setModalState(() => isSaving = true);
                                    final targetDateStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
                                    final inFormatted = formatTime(checkInTime);
                                    final outFormatted = formatTime(checkOutTime);

                                    final ok = await _api.overrideAttendance(
                                      userId: item.userId,
                                      date: targetDateStr,
                                      status: selectedStatus,
                                      checkIn: (selectedStatus == 'Absent' || selectedStatus == 'Leave') ? '' : inFormatted,
                                      checkOut: (selectedStatus == 'Absent' || selectedStatus == 'Leave') ? '' : outFormatted,
                                      workMode: selectedMode,
                                      note: noteCtrl.text.trim(),
                                    );

                                    setModalState(() => isSaving = false);

                                    if (ok) {
                                      if (modalCtx.mounted) Navigator.pop(modalCtx);
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Attendance override for ${item.name} saved successfully'),
                                            backgroundColor: const Color(0xFF10B981),
                                            behavior: SnackBarBehavior.floating,
                                          ),
                                        );
                                        _loadAttendanceData();
                                      }
                                    } else {
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Failed to save attendance override. Please try again.'),
                                            backgroundColor: Color(0xFFEF4444),
                                            behavior: SnackBarBehavior.floating,
                                          ),
                                        );
                                      }
                                    }
                                  },
                          ),
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

  // ── REGULARIZATION REVIEW ──────────────────────────────────────────────────
  Future<void> _handleReviewRegularization(String id, String status) async {
    HapticFeedback.mediumImpact();
    final noteCtrl = TextEditingController();
    final isApprove = status == 'Approved';

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(
              isApprove ? LucideIcons.checkCircle : LucideIcons.xCircle,
              color: isApprove ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              '$status Regularization',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: isApprove ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Add optional review feedback note for the applicant:',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: noteCtrl,
              decoration: InputDecoration(
                hintText: isApprove ? 'e.g. Approved per email confirmation' : 'e.g. Missing manager authorization',
                hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                fillColor: const Color(0xFFF8FAFC),
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: isApprove ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(status, style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final ok = await _api.reviewAttendanceRegularization(
      id: id,
      status: status,
      reviewNote: noteCtrl.text.trim(),
    );

    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Regularization $status successfully'),
          backgroundColor: isApprove ? const Color(0xFF10B981) : const Color(0xFFEF4444),
        ),
      );
      _loadAttendanceData();
    }
  }

  // ── LEAVE DECISION (APPROVE / REJECT) ───────────────────────────────────────
  Future<void> _handleLeaveDecision(LeaveRequestItem leave, String decision) async {
    final isApprove = decision == 'Approved';
    final noteCtrl = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
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
              '$decision Leave Request',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: isApprove ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you sure you want to $decision the leave request for ${leave.applicantName ?? "this employee"} (${leave.days} day${leave.days == 1 ? '' : 's'})?',
              style: const TextStyle(fontSize: 13, color: Color(0xFF334155)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: noteCtrl,
              decoration: InputDecoration(
                hintText: isApprove ? 'Approval remarks (optional)' : 'Reason for rejection *',
                hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                fillColor: const Color(0xFFF8FAFC),
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: isApprove ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Confirm $decision', style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final ok = await _api.updateLeaveStatus(
      leaveId: leave.id,
      status: decision,
      comment: noteCtrl.text.trim(),
    );
    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Leave request $decision successfully'),
          backgroundColor: isApprove ? const Color(0xFF10B981) : const Color(0xFFEF4444),
        ),
      );
      _loadLeavesData();
    }
  }

  // ── CSV EXPORT HELPERS ────────────────────────────────────────────────────
  void _exportCsv() {
    HapticFeedback.mediumImpact();
    final buffer = StringBuffer();

    if (_mainToggleIndex == 0) {
      // Export Attendance
      buffer.writeln('Date,Employee ID,Name,Type,Department,Status,Work Mode,Check In,Check Out,Hours');
      final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
      for (final item in _roster) {
        buffer.writeln('$todayStr,"${item.employeeId}","${item.name}","${item.employmentType}","${item.department}","${item.status}","${item.workMode}","${item.checkIn ?? ''}","${item.checkOut ?? ''}",${item.hoursWorked}');
      }
      Clipboard.setData(ClipboardData(text: buffer.toString()));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Attendance roster for ${_roster.length} members copied to CSV clipboard!'), backgroundColor: const Color(0xFF10B981)),
      );
    } else {
      // Export Leaves
      buffer.writeln('Applicant,Type,Days,From,To,Reason,Status');
      for (final l in _allLeaves) {
        buffer.writeln('"${l.applicantName ?? ""}","${l.leaveType}",${l.days},"${l.startDate}","${l.endDate}","${l.reason}","${l.status}"');
      }
      Clipboard.setData(ClipboardData(text: buffer.toString()));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Leaves export for ${_allLeaves.length} items copied to CSV clipboard!'), backgroundColor: const Color(0xFF10B981)),
      );
    }
  }

  // ── MAIN SCAFFOLD BUILD METHOD ─────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      body: SafeArea(
        child: EnterprisePullToRefresh(
          onRefresh: _loadAllData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── APP BAR / TOP HEADER ──
                Row(
                  children: [
                    if (widget.showBackButton || Navigator.of(context).canPop()) ...[
                      IconButton(
                        icon: const Icon(LucideIcons.arrowLeft, size: 20, color: Color(0xFF0F172A)),
                        onPressed: () => Navigator.of(context).pop(),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Time & Attendance Hub',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              letterSpacing: -0.4,
                            ),
                          ),
                          Text(
                            _mainToggleIndex == 0 ? 'Live Daily Roster & Regularization Queue' : 'Company Leave Approvals & Absence Tracking',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    // Export CSV
                    IconButton(
                      icon: Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFDBEAFE)),
                        ),
                        child: const Icon(LucideIcons.download, size: 16, color: Color(0xFF2563EB)),
                      ),
                      tooltip: 'Export CSV',
                      onPressed: _exportCsv,
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // ── TOGGLE ACTION IN HEADER (ATTENDANCE ⇄ LEAVES) ──
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      // Attendance Toggle Pill
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            HapticFeedback.selectionClick();
                            setState(() => _mainToggleIndex = 0);
                          },
                          borderRadius: BorderRadius.circular(11),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            decoration: BoxDecoration(
                              color: _mainToggleIndex == 0 ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(11),
                              boxShadow: _mainToggleIndex == 0
                                  ? [
                                      BoxShadow(
                                        color: const Color(0xFF0F172A).withOpacity(0.06),
                                        blurRadius: 6,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : [],
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  LucideIcons.calendarCheck,
                                  size: 15,
                                  color: _mainToggleIndex == 0 ? const Color(0xFF2563EB) : const Color(0xFF64748B),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Attendance Roster',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: _mainToggleIndex == 0 ? FontWeight.w800 : FontWeight.w600,
                                    color: _mainToggleIndex == 0 ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                      // Leaves Toggle Pill
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            HapticFeedback.selectionClick();
                            setState(() => _mainToggleIndex = 1);
                          },
                          borderRadius: BorderRadius.circular(11),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            decoration: BoxDecoration(
                              color: _mainToggleIndex == 1 ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(11),
                              boxShadow: _mainToggleIndex == 1
                                  ? [
                                      BoxShadow(
                                        color: const Color(0xFF0F172A).withOpacity(0.06),
                                        blurRadius: 6,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : [],
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  LucideIcons.palmtree,
                                  size: 15,
                                  color: _mainToggleIndex == 1 ? const Color(0xFF7C3AED) : const Color(0xFF64748B),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Leave Approvals',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: _mainToggleIndex == 1 ? FontWeight.w800 : FontWeight.w600,
                                    color: _mainToggleIndex == 1 ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                                  ),
                                ),
                                if (_allLeaves.where((l) => l.status == 'Pending').isNotEmpty) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEF4444),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '${_allLeaves.where((l) => l.status == 'Pending').length}',
                                      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.white),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // ── VIEW BODY ──
                if (_mainToggleIndex == 0)
                  _buildAttendanceSection()
                else
                  _buildLeavesSection(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: ATTENDANCE HUB
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildAttendanceSection() {
    if (_loadingAttendance && _summary == null) {
      return const ShimmerLoading(
        isLoading: true,
        child: Column(
          children: [
            SkeletonUserCard(),
            SkeletonUserCard(),
            SkeletonUserCard(),
          ],
        ),
      );
    }

    final pendingRegCount = _regularizations.where((r) => r.status == 'Pending').length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Live Date & Attendance KPI Strip
        _buildAttendanceKpiStrip(),
        const SizedBox(height: 14),

        // Sub-tabs: Daily Roster vs Regularizations
        Row(
          children: [
            _buildSubTabButton(
              title: 'Today\'s Roster (${_roster.length})',
              icon: LucideIcons.users,
              isSelected: _attendanceSubTab == 0,
              onTap: () => setState(() => _attendanceSubTab = 0),
            ),
            const SizedBox(width: 8),
            _buildSubTabButton(
              title: 'Regularizations',
              badgeCount: pendingRegCount > 0 ? pendingRegCount : null,
              icon: LucideIcons.clock,
              isSelected: _attendanceSubTab == 1,
              onTap: () => setState(() => _attendanceSubTab = 1),
            ),
          ],
        ),
        const SizedBox(height: 12),

        if (_attendanceSubTab == 0)
          _buildRosterView()
        else
          _buildRegularizationsView(),
      ],
    );
  }

  Widget _buildAttendanceKpiStrip() {
    final s = _summary;
    final total = s?.totalStaff ?? _roster.length;
    final present = s?.presentCount ?? 0;
    final lateCount = s?.lateCount ?? 0;
    final absent = s?.absentCount ?? 0;
    final wfh = s?.wfhCount ?? 0;
    final leave = s?.leaveCount ?? 0;

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Color(0xFF10B981),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    DateFormat('EEEE, MMM d, yyyy').format(DateTime.now()),
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
              Text(
                'Workforce: $total staff',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildKpiCard('Present', '$present', const Color(0xFF10B981), const Color(0xFFECFDF5)),
              const SizedBox(width: 8),
              _buildKpiCard('Late', '$lateCount', const Color(0xFFF59E0B), const Color(0xFFFFFBEB)),
              const SizedBox(width: 8),
              _buildKpiCard('Absent', '$absent', const Color(0xFFEF4444), const Color(0xFFFEF2F2)),
              const SizedBox(width: 8),
              _buildKpiCard('WFH', '$wfh', const Color(0xFF7C3AED), const Color(0xFFF5F3FF)),
              const SizedBox(width: 8),
              _buildKpiCard('Leave', '$leave', const Color(0xFF06B6D4), const Color(0xFFECFEFF)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard(String label, String value, Color color, Color bg) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.25)),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: color),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubTabButton({
    required String title,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
    int? badgeCount,
  }) {
    return InkWell(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isSelected ? Colors.white : const Color(0xFF64748B)),
            const SizedBox(width: 6),
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF475569),
              ),
            ),
            if (badgeCount != null) ...[
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white : const Color(0xFFEF4444),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$badgeCount',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: isSelected ? const Color(0xFF2563EB) : Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildRosterView() {
    final query = _attendanceSearchCtrl.text.trim().toLowerCase();

    final filtered = _roster.where((item) {
      if (_rosterStatusFilter != 'All') {
        if (_rosterStatusFilter == 'Late' && !item.isLate) return false;
        if (_rosterStatusFilter == 'WFH' && item.workMode != 'WFH') return false;
        if (_rosterStatusFilter != 'Late' && _rosterStatusFilter != 'WFH' && item.status.toLowerCase() != _rosterStatusFilter.toLowerCase()) {
          return false;
        }
      }
      if (_rosterTypeFilter != 'All') {
        if (_rosterTypeFilter == 'Intern' && item.employmentType != 'Intern') return false;
        if (_rosterTypeFilter == 'Full-time' && item.employmentType == 'Intern') return false;
      }
      if (query.isNotEmpty) {
        final match = item.name.toLowerCase().contains(query) ||
            item.employeeId.toLowerCase().contains(query) ||
            item.department.toLowerCase().contains(query);
        if (!match) return false;
      }
      return true;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Search Bar
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: TextField(
            controller: _attendanceSearchCtrl,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'Search roster by name, ID, or department...',
              hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
              prefixIcon: const Icon(LucideIcons.search, size: 18, color: Color(0xFF64748B)),
              suffixIcon: _attendanceSearchCtrl.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(LucideIcons.x, size: 16, color: Color(0xFF94A3B8)),
                      onPressed: () {
                        _attendanceSearchCtrl.clear();
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
            children: [
              ...['All', 'Present', 'Late', 'Absent', 'WFH', 'Leave'].map((st) {
                final isSel = _rosterStatusFilter == st;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text(st),
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
                    onSelected: (_) => setState(() => _rosterStatusFilter = st),
                  ),
                );
              }),
              Container(
                height: 20,
                width: 1,
                color: const Color(0xFFCBD5E1),
                margin: const EdgeInsets.symmetric(horizontal: 4),
              ),
              ...['All Roles', 'Full-time', 'Intern'].map((typ) {
                final normalized = typ == 'All Roles' ? 'All' : typ;
                final isSel = _rosterTypeFilter == normalized;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text(typ),
                    selected: isSel,
                    selectedColor: const Color(0xFF7C3AED),
                    backgroundColor: Colors.white,
                    labelStyle: TextStyle(
                      fontSize: 11.5,
                      fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                      color: isSel ? Colors.white : const Color(0xFF475569),
                    ),
                    side: BorderSide(color: isSel ? const Color(0xFF7C3AED) : const Color(0xFFE2E8F0)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    onSelected: (_) => setState(() => _rosterTypeFilter = normalized),
                  ),
                );
              }),
            ],
          ),
        ),
        const SizedBox(height: 10),

        Text(
          'Showing ${filtered.length} of ${_roster.length} personnel',
          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 8),

        if (filtered.isEmpty)
          Container(
            width: double.infinity,
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
                Text('No personnel matching this filter', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                SizedBox(height: 4),
                Text('Try clearing search or picking "All" filter.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              ],
            ),
          )
        else
          ...filtered.map((item) => _buildRosterCard(item)),
      ],
    );
  }

  Widget _buildRosterCard(TodayRosterItem item) {
    Color statusBg = const Color(0xFFECFDF5);
    Color statusColor = const Color(0xFF059669);

    if (item.status.toLowerCase() == 'absent') {
      statusBg = const Color(0xFFFEF2F2);
      statusColor = const Color(0xFFDC2626);
    } else if (item.isLate) {
      statusBg = const Color(0xFFFFFBEB);
      statusColor = const Color(0xFFD97706);
    } else if (item.status.toLowerCase().contains('leave')) {
      statusBg = const Color(0xFFECFEFF);
      statusColor = const Color(0xFF0891B2);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
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
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: const Color(0xFFEFF6FF),
                child: Text(
                  item.name.isNotEmpty ? item.name[0].toUpperCase() : 'U',
                  style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF2563EB), fontSize: 14),
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
                            item.name,
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: statusBg,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            item.isLate ? 'LATE' : item.status.toUpperCase(),
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: statusColor),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${item.designation} • ${item.department}',
                      style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              // Override Action Button
              InkWell(
                onTap: () => _showAttendanceOverrideModal(item),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFDBEAFE)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.edit3, size: 12, color: Color(0xFF2563EB)),
                      SizedBox(width: 4),
                      Text(
                        'Override',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.logIn, size: 12, color: Color(0xFF10B981)),
                    const SizedBox(width: 4),
                    Text(
                      item.checkIn != null && item.checkIn!.isNotEmpty ? item.checkIn! : '--:--',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(width: 12),
                    const Icon(LucideIcons.logOut, size: 12, color: Color(0xFFEF4444)),
                    const SizedBox(width: 4),
                    Text(
                      item.checkOut != null && item.checkOut!.isNotEmpty ? item.checkOut! : '--:--',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        item.workMode,
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${item.hoursWorked}h',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
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

  Widget _buildRegularizationsView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Status filters for regularizations
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: ['Pending', 'Approved', 'Rejected', 'All'].map((st) {
              final isSel = _regularizationFilter == st;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text(st),
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
                  onSelected: (_) {
                    setState(() => _regularizationFilter = st);
                    _loadAttendanceData();
                  },
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 10),

        if (_regularizations.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Column(
              children: [
                Icon(LucideIcons.checkCircle, size: 32, color: Color(0xFF10B981)),
                SizedBox(height: 10),
                Text('No regularization requests', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                SizedBox(height: 4),
                Text('All workforce punch adjustments have been resolved.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              ],
            ),
          )
        else
          ..._regularizations.map((reg) => _buildRegularizationCard(reg)),
      ],
    );
  }

  Widget _buildRegularizationCard(AttendanceRegularizationItem reg) {
    Color statusBg = const Color(0xFFFEF3C7);
    Color statusColor = const Color(0xFFD97706);

    if (reg.status == 'Approved') {
      statusBg = const Color(0xFFECFDF5);
      statusColor = const Color(0xFF059669);
    } else if (reg.status == 'Rejected') {
      statusBg = const Color(0xFFFEF2F2);
      statusColor = const Color(0xFFDC2626);
    }

    final parsedDate = DateTime.tryParse(reg.date);
    final dateDisplay = parsedDate != null ? DateFormat('EEE, MMM d, yyyy').format(parsedDate) : reg.date;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                reg.userName ?? 'Employee',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(6)),
                child: Text(
                  reg.status.toUpperCase(),
                  style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: statusColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Target Date: $dateDisplay',
            style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Requested In: ${reg.requestedCheckIn}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                    Text('Requested Out: ${reg.requestedCheckOut}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                  ],
                ),
                if (reg.reason.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text('Reason: "${reg.reason}"', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Color(0xFF475569))),
                ],
              ],
            ),
          ),
          if (reg.status == 'Pending') ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFEF4444),
                      side: const BorderSide(color: Color(0xFFFCA5A5)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => _handleReviewRegularization(reg.id, 'Rejected'),
                    child: const Text('Reject', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => _handleReviewRegularization(reg.id, 'Approved'),
                    child: const Text('Approve', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: LEAVES HUB
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildLeavesSection() {
    if (_loadingLeaves && _allLeaves.isEmpty) {
      return const ShimmerLoading(
        isLoading: true,
        child: Column(
          children: [
            SkeletonUserCard(),
            SkeletonUserCard(),
            SkeletonUserCard(),
          ],
        ),
      );
    }

    final query = _leaveSearchCtrl.text.trim().toLowerCase();
    final filtered = _allLeaves.where((l) {
      if (_leaveStatusFilter != 'All' && l.status.toLowerCase() != _leaveStatusFilter.toLowerCase()) {
        return false;
      }
      if (_leaveTypeFilter != 'All' && l.leaveType.toLowerCase() != _leaveTypeFilter.toLowerCase()) {
        return false;
      }
      if (query.isNotEmpty) {
        final applicant = (l.applicantName ?? '').toLowerCase();
        final reason = l.reason.toLowerCase();
        if (!applicant.contains(query) && !reason.contains(query)) return false;
      }
      return true;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Sub-tabs: Company Leaves vs Quota Allocation vs My Leaves
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: [
              _buildSubTabButton(
                title: 'Company Requests (${_allLeaves.length})',
                icon: LucideIcons.briefcase,
                isSelected: _leaveSubTab == 0,
                onTap: () => setState(() => _leaveSubTab = 0),
              ),
              const SizedBox(width: 8),
              _buildSubTabButton(
                title: 'Quota Allocation',
                icon: LucideIcons.sliders,
                isSelected: false,
                onTap: () => context.push(AppRoutes.hrLeaveQuota),
              ),
              const SizedBox(width: 8),
              _buildSubTabButton(
                title: 'My Leaves & Balance',
                icon: LucideIcons.user,
                isSelected: _leaveSubTab == 1,
                onTap: () => setState(() => _leaveSubTab = 1),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        if (_leaveSubTab == 0) ...[
          // Enterprise Leave Quota Action Banner
          InkWell(
            onTap: () => context.push(AppRoutes.hrLeaveQuota),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFEFF6FF), Color(0xFFFAF5FF)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFDBEAFE)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(LucideIcons.sliders, size: 14, color: Colors.white),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Workforce Leave Quotas & Balances',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                        ),
                        Text(
                          'Assign and calibrate annual allowances for employees and interns.',
                          style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  const Icon(LucideIcons.arrowRight, size: 14, color: Color(0xFF2563EB)),
                ],
              ),
            ),
          ),
          // Search Bar
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: TextField(
              controller: _leaveSearchCtrl,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Search leave by applicant or reason...',
                hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                prefixIcon: const Icon(LucideIcons.search, size: 18, color: Color(0xFF64748B)),
                suffixIcon: _leaveSearchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, size: 16, color: Color(0xFF94A3B8)),
                        onPressed: () {
                          _leaveSearchCtrl.clear();
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

          // Status & Type Filters
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: [
                ..._leaveStatusOptions.map((st) {
                  final isSel = _leaveStatusFilter == st;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text(st),
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
                      onSelected: (_) {
                        setState(() => _leaveStatusFilter = st);
                        _loadLeavesData();
                      },
                    ),
                  );
                }),
                Container(
                  height: 20,
                  width: 1,
                  color: const Color(0xFFCBD5E1),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                ),
                ..._leaveTypeOptions.map((typ) {
                  final isSel = _leaveTypeFilter == typ;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text(typ),
                      selected: isSel,
                      selectedColor: const Color(0xFF7C3AED),
                      backgroundColor: Colors.white,
                      labelStyle: TextStyle(
                        fontSize: 11.5,
                        fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                        color: isSel ? Colors.white : const Color(0xFF475569),
                      ),
                      side: BorderSide(color: isSel ? const Color(0xFF7C3AED) : const Color(0xFFE2E8F0)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      onSelected: (_) {
                        setState(() => _leaveTypeFilter = typ);
                        _loadLeavesData();
                      },
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 10),

          Text(
            'Showing ${filtered.length} leave requests',
            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 8),

          if (filtered.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Column(
                children: [
                  Icon(LucideIcons.calendarCheck, size: 32, color: Color(0xFF10B981)),
                  SizedBox(height: 10),
                  Text('No leave requests matching filter', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                  SizedBox(height: 4),
                  Text('All employee leave workflows are currently settled.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
            )
          else
            ...filtered.map((l) => _buildLeaveCard(l)),
        ] else ...[
          // My Leaves & Balance View
          _buildMyLeavesView(),
        ],
      ],
    );
  }

  Widget _buildLeaveCard(LeaveRequestItem leave) {
    Color statusBg = const Color(0xFFFEF3C7);
    Color statusColor = const Color(0xFFD97706);

    if (leave.status == 'Approved') {
      statusBg = const Color(0xFFECFDF5);
      statusColor = const Color(0xFF059669);
    } else if (leave.status == 'Rejected') {
      statusBg = const Color(0xFFFEF2F2);
      statusColor = const Color(0xFFDC2626);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  leave.applicantName ?? 'Employee',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(6)),
                child: Text(
                  leave.status.toUpperCase(),
                  style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: statusColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  leave.leaveType.toUpperCase(),
                  style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                '${leave.days} day${leave.days == 1 ? '' : 's'} (${leave.startDate} - ${leave.endDate})',
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '"${leave.reason}"',
              style: const TextStyle(fontSize: 11.5, fontStyle: FontStyle.italic, color: Color(0xFF334155)),
            ),
          ),
          if (leave.status == 'Pending') ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFEF4444),
                      side: const BorderSide(color: Color(0xFFFCA5A5)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => _handleLeaveDecision(leave, 'Rejected'),
                    child: const Text('Reject', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => _handleLeaveDecision(leave, 'Approved'),
                    child: const Text('Approve', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMyLeavesView() {
    final b = _myBalance;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Balance Card
        if (b != null)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('My Leave Allowance', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _buildBalanceCol('Casual', '${b.casualLeave.remaining}/${b.casualLeave.total}'),
                    _buildBalanceCol('Sick', '${b.sickLeave.remaining}/${b.sickLeave.total}'),
                    _buildBalanceCol('Annual', '${b.earnedLeave.remaining}/${b.earnedLeave.total}'),
                  ],
                ),
              ],
            ),
          ),
        const SizedBox(height: 12),

        const Text('My Recent Leave History', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
        const SizedBox(height: 8),

        if (_myLeaves.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Center(
              child: Text('No personal leave applications submitted yet.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            ),
          )
        else
          ..._myLeaves.map((l) => _buildLeaveCard(l)),
      ],
    );
  }

  Widget _buildBalanceCol(String label, String val) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Text(val, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }
}
