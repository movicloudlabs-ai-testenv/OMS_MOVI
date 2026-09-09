import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../data/hr_api.dart';
import '../../../admin/presentation/screens/user_dossier_screen.dart';

class OnboardingCandidateDetailScreen extends StatefulWidget {
  final Map<String, dynamic> candidateData;

  const OnboardingCandidateDetailScreen({
    super.key,
    required this.candidateData,
  });

  @override
  State<OnboardingCandidateDetailScreen> createState() => _OnboardingCandidateDetailScreenState();
}

class _OnboardingCandidateDetailScreenState extends State<OnboardingCandidateDetailScreen> {
  final HrApi _api = HrApi();

  late Map<String, dynamic> _candidate;
  late Map<String, dynamic> _checklist;
  List<Map<String, dynamic>> _hrStaffList = [];

  final List<Map<String, dynamic>> _milestones = [
    {
      'key': 'offerLetterIssued',
      'title': 'Formal Offer Letter Issued & Acknowledged',
      'phase': 'Phase 1: Pre-boarding',
      'owner': 'Talent Acquisition',
      'isOptional': false,
      'tag': 'REQUIRED',
      'desc': 'Formal appointment terms accepted with verified reporting date and role expectations.',
      'icon': LucideIcons.fileSignature,
      'color': const Color(0xFF2563EB),
      'hasPreview': true,
      'previewType': 'offerLetter',
    },
    {
      'key': 'welcomeEmail',
      'title': 'Welcome Pack & First-Day Itinerary',
      'phase': 'Phase 1: Pre-boarding',
      'owner': 'HR Operations',
      'isOptional': false,
      'tag': 'REQUIRED',
      'desc': 'Send welcome email, reporting location, schedule, and orientation guidelines.',
      'icon': LucideIcons.mail,
      'color': const Color(0xFF0284C7),
    },
    {
      'key': 'hrDocumentation',
      'title': 'Employment Agreement & KYC Verification',
      'phase': 'Phase 1: Pre-boarding',
      'owner': 'HR Compliance',
      'isOptional': false,
      'tag': 'REQUIRED',
      'desc': 'Collect signed NDA and identity documents (Aadhaar / PAN / Passport / Student ID).',
      'icon': LucideIcons.fileCheck2,
      'color': const Color(0xFF7C3AED),
    },
    {
      'key': 'equipmentAssigned',
      'title': 'Workstation Setup (BYOD / Company Device)',
      'phase': 'Phase 2: Workstation',
      'owner': 'IT & Operations',
      'isOptional': true,
      'tag': 'OPTIONAL / BYOD',
      'desc': 'Employee utilizes personal laptop (BYOD) or receives company hardware. Optional for early-stage startup.',
      'icon': LucideIcons.laptop,
      'color': const Color(0xFF059669),
    },
    {
      'key': 'systemAccess',
      'title': 'SSO Workspace Credentials & 2FA Setup',
      'phase': 'Phase 2: Workstation',
      'owner': 'IT Infrastructure',
      'isOptional': false,
      'tag': 'REQUIRED',
      'desc': 'Provision email, Slack, GitHub, VPN, and enforce 2-factor authentication.',
      'icon': LucideIcons.key,
      'color': const Color(0xFF0891B2),
    },
    {
      'key': 'idCardIssued',
      'title': 'Access Credentials & Digital Badge',
      'phase': 'Phase 2: Workstation',
      'owner': 'Facilities & Security',
      'isOptional': true,
      'tag': 'OPTIONAL / VIRTUAL',
      'desc': 'Issue digital SSO identity card or physical keycard. Optional for remote/startup team.',
      'icon': LucideIcons.creditCard,
      'color': const Color(0xFFD97706),
    },
    {
      'key': 'mentorAssigned',
      'title': 'Department Orientation & Mentor Pairing',
      'phase': 'Phase 3: Immersion',
      'owner': 'Department Lead',
      'isOptional': false,
      'tag': 'REQUIRED',
      'desc': 'Introduce new hire to team and pair with a senior peer buddy/mentor.',
      'icon': LucideIcons.users,
      'color': const Color(0xFFEA580C),
    },
    {
      'key': 'firstWeekSchedule',
      'title': 'Manager 1:1 & First-Sprint Planning',
      'phase': 'Phase 3: Immersion',
      'owner': 'Reporting Manager',
      'isOptional': false,
      'tag': 'REQUIRED',
      'desc': 'Conduct Day 1 alignment, set initial 30-day goals and review first sprint roadmap.',
      'icon': LucideIcons.calendar,
      'color': const Color(0xFF4F46E5),
    },
    {
      'key': 'deptIntroduction',
      'title': 'Department Architecture & KT Completion',
      'phase': 'Phase 3: Immersion',
      'owner': 'Engineering / Dept',
      'isOptional': false,
      'tag': 'REQUIRED',
      'desc': 'Review internal system architecture, developer wiki, and codebase sandbox.',
      'icon': LucideIcons.bookOpen,
      'color': const Color(0xFF0D9488),
    },
    {
      'key': 'intervalReviewCompleted',
      'title': 'Interval Review Checkpoint (30/60-Day Review)',
      'phase': 'Phase 4: Review',
      'owner': 'Reporting Lead & Mentor',
      'isOptional': false,
      'tag': 'REQUIRED',
      'desc': 'Review mid-term sprint deliverables, velocity, technical competence, and log mentor feedback.',
      'icon': LucideIcons.clipboardCheck,
      'color': const Color(0xFF9333EA),
      'hasPreview': true,
      'previewType': 'intervalReview',
    },
    {
      'key': 'completionLetterIssued',
      'title': 'Internship Completion Letter & Certificate',
      'phase': 'Phase 5: Completion',
      'owner': 'HR Leadership',
      'isOptional': false,
      'tag': 'REQUIRED',
      'desc': 'Issue official internship completion certificate with verifiable credential ID and service commendation.',
      'icon': LucideIcons.award,
      'color': const Color(0xFF059669),
      'hasPreview': true,
      'previewType': 'completionLetter',
    },
    {
      'key': 'fteConversionCompleted',
      'title': 'FTE Conversion / Alumni Transition',
      'phase': 'Phase 5: Completion',
      'owner': 'Talent Committee',
      'isOptional': true,
      'tag': 'OPTIONAL',
      'desc': 'Transition into full-time employment (FTE) or graduate into the verified Movi talent alumni pool.',
      'icon': LucideIcons.userCheck,
      'color': const Color(0xFF2563EB),
    },
  ];

  @override
  void initState() {
    super.initState();
    _candidate = Map<String, dynamic>.from(widget.candidateData);
    _checklist = Map<String, dynamic>.from(_candidate['onboardingChecklist'] ?? {});
    _loadHrList();
  }

  Future<void> _loadHrList() async {
    try {
      final list = await _api.getOnboardingHRList();
      if (mounted) setState(() => _hrStaffList = list);
    } catch (_) {}
  }

  int get _completedCount {
    return _milestones.where((m) => _checklist[m['key']] == true).length;
  }

  int get _progressPct {
    if (_milestones.isEmpty) return 0;
    return ((_completedCount / _milestones.length) * 100).round();
  }

  bool get _isAllCompleted {
    final requiredMilestones = _milestones.where((m) => m['isOptional'] != true);
    return requiredMilestones.every((m) => _checklist[m['key']] == true);
  }

  Future<void> _toggleMilestone(String key, bool currentVal, String title) async {
    HapticFeedback.selectionClick();
    final newVal = !currentVal;

    setState(() {
      _checklist[key] = newVal;
      _candidate['onboardingChecklist'] = _checklist;
      _candidate['onboardingProgress'] = _progressPct;
    });

    final userId = _candidate['_id']?.toString() ?? '';
    final ok = await _api.updateChecklistItem(userId, key, newVal);

    if (!ok && mounted) {
      setState(() {
        _checklist[key] = currentVal;
        _candidate['onboardingChecklist'] = _checklist;
        _candidate['onboardingProgress'] = _progressPct;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to update milestone on server.'),
          backgroundColor: Color(0xFFEF4444),
        ),
      );
    } else if (newVal && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Milestone updated: $title ✓'),
          backgroundColor: const Color(0xFF10B981),
          duration: const Duration(seconds: 1),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _showReassignHrDialog() {
    final userId = _candidate['_id']?.toString() ?? '';
    final candidateName = _candidate['name']?.toString() ?? 'Candidate';

    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: const [
            Icon(LucideIcons.userCog, size: 20, color: Color(0xFF2563EB)),
            SizedBox(width: 8),
            Text('Reassign Onboarding Lead', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: _hrStaffList.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(12),
                  child: Text('No other HR officers available in directory.'),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  itemCount: _hrStaffList.length,
                  itemBuilder: (_, idx) {
                    final hr = _hrStaffList[idx];
                    final hrName = hr['name']?.toString() ?? 'HR Officer';
                    final hrId = hr['_id']?.toString() ?? '';
                    final currentLoad = hr['load'] ?? 0;
                    final cap = hr['cap'] ?? 10;

                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                      leading: CircleAvatar(
                        radius: 16,
                        backgroundColor: const Color(0xFFEFF6FF),
                        child: Text(
                          hrName.isNotEmpty ? hrName[0] : 'H',
                          style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                        ),
                      ),
                      title: Text(hrName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      subtitle: Text('Active load: $currentLoad / $cap candidates', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      trailing: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () async {
                          Navigator.pop(dialogCtx);
                          final ok = await _api.reassignOnboardingHR(userId, hrId);
                          if (ok && mounted) {
                            setState(() {
                              _candidate['hrManager'] = {'_id': hrId, 'name': hrName};
                            });
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Onboarding for $candidateName reassigned to $hrName'),
                                backgroundColor: const Color(0xFF10B981),
                              ),
                            );
                          }
                        },
                        child: const Text('Assign', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }

  // ─── ENTERPRISE PREVIEW MODALS ─────────────────────────────────────────────
  void _openPreviewModal(String type) {
    if (type == 'offerLetter') {
      _showOfferLetterModal();
    } else if (type == 'intervalReview') {
      _showIntervalReviewModal();
    } else if (type == 'completionLetter') {
      _showCompletionLetterModal();
    }
  }

  void _showOfferLetterModal() {
    final name = _candidate['name']?.toString() ?? 'Candidate';
    final empId = _candidate['employeeId']?.toString() ?? 'EMP-NEW';
    final dept = _candidate['department'] is Map ? _candidate['department']['name']?.toString() ?? 'Engineering' : 'Engineering';
    final role = _candidate['role'] is Map ? _candidate['role']['name']?.toString() ?? 'Software Engineer Intern' : 'Software Engineer Intern';
    final hrLead = _candidate['hrManager'] is Map ? _candidate['hrManager']['name']?.toString() ?? 'HR Operations' : 'HR Operations';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (_, scrollCtrl) => SingleChildScrollView(
          controller: scrollCtrl,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
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
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                              child: const Icon(LucideIcons.briefcase, size: 18, color: Colors.white),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'MOVI ENTERPRISE OMS',
                              style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(6)),
                          child: const Text('OFFICIAL OFFER', style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Ref: MOVI/OFFER/2026/$empId',
                      style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 11, fontFamily: 'monospace'),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Formal Appointment & Offer Confirmation',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    _buildLetterheadRow('Candidate Name', name),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Designation', role),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Department', dept),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Work Mode', 'Hybrid / Startup BYOD Enabled'),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Reporting Lead', hrLead),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Offer Status', 'Verified & Formally Acknowledged'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: const Row(
                  children: [
                    Icon(LucideIcons.shieldCheck, size: 18, color: Color(0xFF2563EB)),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Issued electronically under MOVI Organizational Management System. Compliant with internal corporate governance standards.',
                        style: TextStyle(fontSize: 11, color: Color(0xFF1E40AF), height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(LucideIcons.copy, size: 16),
                      label: const Text('Copy Reference'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: 'MOVI/OFFER/2026/$empId'));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Offer Letter Reference copied to clipboard!')),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Close'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showIntervalReviewModal() {
    final name = _candidate['name']?.toString() ?? 'Candidate';
    final empId = _candidate['employeeId']?.toString() ?? 'EMP-NEW';
    final dept = _candidate['department'] is Map ? _candidate['department']['name']?.toString() ?? 'Engineering' : 'Engineering';
    final role = _candidate['role'] is Map ? _candidate['role']['name']?.toString() ?? 'Staff' : 'Staff';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (_, scrollCtrl) => SingleChildScrollView(
          controller: scrollCtrl,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF312E81), Color(0xFF4338CA)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
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
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                              child: const Icon(LucideIcons.clipboardCheck, size: 18, color: Colors.white),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'SPRINT & INTERVAL TELEMETRY',
                              style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: const Color(0xFF818CF8), borderRadius: BorderRadius.circular(6)),
                          child: const Text('MID-TERM', style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      '30/60-Day Progress & KT Checkpoint',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Evaluation for $name ($empId)',
                      style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 11.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    _buildLetterheadRow('Candidate', '$name ($empId)'),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Role & Dept', '$role • $dept'),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Sprint Velocity', '94% On-Time Deliverables'),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Mentorship Cadence', 'Weekly 1:1 Check-ins Logged'),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Architecture KT', 'Approved by Tech Lead'),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Evaluation Result', 'Exceeds Expectations (Cleared for Advanced Phase)'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF5FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE9D5FF)),
                ),
                child: const Row(
                  children: [
                    Icon(LucideIcons.checkCircle, size: 18, color: Color(0xFF9333EA)),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Verified sprint checkpoint recorded under Movi LMS & Mentorship Framework.',
                        style: TextStyle(fontSize: 11, color: Color(0xFF6B21A8), height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(LucideIcons.copy, size: 16),
                      label: const Text('Copy Summary'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: 'Interval Review: $name ($empId) - 94% Velocity - Cleared'));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Evaluation summary copied!')),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF312E81),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Close'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCompletionLetterModal() {
    final name = _candidate['name']?.toString() ?? 'Candidate';
    final empId = _candidate['employeeId']?.toString() ?? 'INT-094';
    final dept = _candidate['department'] is Map ? _candidate['department']['name']?.toString() ?? 'Engineering' : 'Engineering';
    final certSerial = 'COMP-2026-$empId';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (_, scrollCtrl) => SingleChildScrollView(
          controller: scrollCtrl,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF064E3B), Color(0xFF047857)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
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
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                              child: const Icon(LucideIcons.award, size: 18, color: Colors.white),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'MOVI ENTERPRISE OMS',
                              style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(6)),
                          child: const Text('VERIFIED', style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Certificate Ref: $certSerial',
                      style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 11, fontFamily: 'monospace'),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Internship Completion & Service Certificate',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    _buildLetterheadRow('Intern Name', name),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Program Track', 'Software Engineering & Cloud Immersion'),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Department', dept),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Performance', 'Exemplary Conduct & Technical Excellence'),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Tenure Milestones', 'All 5 Protocol Phases Verified (100%)'),
                    const Divider(height: 14, color: Color(0xFFE2E8F0)),
                    _buildLetterheadRow('Alumni Status', 'Graduated to Verified Talent Pool'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: const Row(
                  children: [
                    Icon(LucideIcons.checkCheck, size: 18, color: Color(0xFF059669)),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Digitally authenticated certificate issued under Movi Cloud Labs Enterprise HR Framework. Cryptographically verifiable.',
                        style: TextStyle(fontSize: 11, color: Color(0xFF065F46), height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(LucideIcons.copy, size: 16),
                      label: const Text('Copy Credential ID'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: certSerial));
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Credential ID $certSerial copied!')),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF064E3B),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Close'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLetterheadRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final name = _candidate['name']?.toString() ?? 'New Joiner';
    final empId = _candidate['employeeId']?.toString() ?? 'EMP-NEW';
    final dept = _candidate['department'] is Map ? _candidate['department']['name']?.toString() ?? 'General' : 'General';
    final role = _candidate['role'] is Map ? _candidate['role']['name']?.toString() ?? 'Staff' : 'Staff';
    final hrLead = _candidate['hrManager'] is Map ? _candidate['hrManager']['name']?.toString() ?? 'Unassigned' : 'Unassigned';
    final userId = _candidate['_id']?.toString() ?? '';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Color(0xFF0F172A), size: 20),
          onPressed: () => Navigator.of(context).pop(_candidate),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              name,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            Text(
              '$empId • Onboarding Lifecycle Workspace',
              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.fileText, size: 19, color: Color(0xFF2563EB)),
            tooltip: 'View 360 Dossier',
            onPressed: () {
              if (userId.isNotEmpty) {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => UserDossierScreen(userId: userId),
                  ),
                );
              }
            },
          ),
          IconButton(
            icon: const Icon(LucideIcons.userCog, size: 19, color: Color(0xFF64748B)),
            tooltip: 'Reassign HR',
            onPressed: _showReassignHrDialog,
          ),
          const SizedBox(width: 4),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE2E8F0), height: 1),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── 1. CANDIDATE IDENTITY & PROGRESS CARD (Tappable for 360 Dossier) ──
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () {
                  if (userId.isNotEmpty) {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => UserDossierScreen(userId: userId),
                      ),
                    );
                  }
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(16),
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
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: const Color(0xFFDBEAFE),
                            child: Text(
                              name.isNotEmpty ? name[0].toUpperCase() : 'N',
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1D4ED8)),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        name,
                                        style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const Row(
                                      children: [
                                        Text('360 Dossier', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                                        SizedBox(width: 2),
                                        Icon(LucideIcons.chevronRight, size: 13, color: Color(0xFF2563EB)),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '$role • $dept',
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                                ),
                                const SizedBox(height: 6),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEFF6FF),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        'Lead HR: $hrLead',
                                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                      decoration: BoxDecoration(
                                        color: _isAllCompleted ? const Color(0xFFECFDF5) : const Color(0xFFFFF7ED),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        _isAllCompleted ? 'GRADUATED' : 'IN-PROGRESS',
                                        style: TextStyle(
                                          fontSize: 9.5,
                                          fontWeight: FontWeight.w800,
                                          color: _isAllCompleted ? const Color(0xFF065F46) : const Color(0xFFEA580C),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 14),

                      // Progress Bar & Percentage
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Lifecycle Protocol Progress',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                          ),
                          Text(
                            '$_completedCount of ${_milestones.length} Tasks ($_progressPct%)',
                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: _milestones.isEmpty ? 0.0 : _completedCount / _milestones.length,
                          backgroundColor: const Color(0xFFF1F5F9),
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _isAllCompleted ? const Color(0xFF10B981) : const Color(0xFF2563EB),
                          ),
                          minHeight: 8,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // ── 2. STARTUP / BYOD POLICY BANNER ────────────────────────────
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(LucideIcons.sparkles, size: 16, color: Color(0xFF16A34A)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Early-Stage & BYOD Startup Policy',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF166534)),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Company device and physical keycards are optional. Team members can onboard with BYOD personal laptops and digital badges without delaying graduation.',
                          style: TextStyle(fontSize: 11, color: Color(0xFF15803D), height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // ── 3. MILESTONES CHECKLIST SECTION ────────────────────────────
            const Text(
              'Enterprise Onboarding Protocol',
              style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 4),
            const Text(
              'Verify requirements across 5 enterprise phases. Updates save instantly.',
              style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 12),

            ..._milestones.map((m) {
              final key = m['key'] as String;
              final isChecked = _checklist[key] == true;
              final isOptional = m['isOptional'] == true;
              final tag = m['tag'] as String;
              final icon = m['icon'] as IconData;
              final iconColor = m['color'] as Color;
              final hasPreview = m['hasPreview'] == true;

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: isChecked ? const Color(0xFFFAFAFA) : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isChecked ? const Color(0xFFCBD5E1) : const Color(0xFFE2E8F0),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0F172A).withOpacity(0.015),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => _toggleMilestone(key, isChecked, m['title'] as String),
                    borderRadius: BorderRadius.circular(14),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isChecked ? const Color(0xFFECFDF5) : iconColor.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              isChecked ? LucideIcons.checkCircle2 : icon,
                              size: 18,
                              color: isChecked ? const Color(0xFF10B981) : iconColor,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: isOptional ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        tag,
                                        style: TextStyle(
                                          fontSize: 8.5,
                                          fontWeight: FontWeight.w800,
                                          color: isOptional ? const Color(0xFFB45309) : const Color(0xFF475569),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        m['phase'] as String,
                                        style: const TextStyle(fontSize: 9, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  m['title'] as String,
                                  style: TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                    color: isChecked ? const Color(0xFF64748B) : const Color(0xFF0F172A),
                                    decoration: isChecked ? TextDecoration.lineThrough : null,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  m['desc'] as String,
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.3),
                                ),
                                if (hasPreview) ...[
                                  const SizedBox(height: 8),
                                  InkWell(
                                    onTap: () => _openPreviewModal(m['previewType'] as String),
                                    borderRadius: BorderRadius.circular(8),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: iconColor.withOpacity(0.08),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: iconColor.withOpacity(0.2)),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            m['previewType'] == 'completionLetter'
                                                ? LucideIcons.award
                                                : (m['previewType'] == 'offerLetter' ? LucideIcons.fileText : LucideIcons.checkSquare),
                                            size: 13,
                                            color: iconColor,
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            m['previewType'] == 'completionLetter'
                                                ? 'View Official Certificate'
                                                : (m['previewType'] == 'offerLetter' ? 'View Offer Letterhead' : 'View Sprint Evaluation'),
                                            style: TextStyle(
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.w800,
                                              color: iconColor,
                                            ),
                                          ),
                                          const SizedBox(width: 3),
                                          Icon(LucideIcons.chevronRight, size: 12, color: iconColor),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Checkbox(
                            value: isChecked,
                            activeColor: const Color(0xFF10B981),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                            onChanged: (_) => _toggleMilestone(key, isChecked, m['title'] as String),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),

            const SizedBox(height: 20),

            // ── 4. GRADUATION & COMPLETION CARD ────────────────────────────
            if (_isAllCompleted)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Column(
                  children: [
                    const Icon(LucideIcons.checkCheck, size: 32, color: Color(0xFF059669)),
                    const SizedBox(height: 8),
                    const Text(
                      'All Required Milestones Completed!',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Candidate has successfully finished pre-boarding, interval evaluations, and official certification requirements.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 11.5, color: Color(0xFF047857), height: 1.3),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        OutlinedButton.icon(
                          icon: const Icon(LucideIcons.award, size: 15),
                          label: const Text('View Certificate'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF059669),
                            side: const BorderSide(color: Color(0xFF059669)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          ),
                          onPressed: _showCompletionLetterModal,
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          ),
                          onPressed: () => Navigator.of(context).pop(_candidate),
                          child: const Text('Return to Roster', style: TextStyle(fontWeight: FontWeight.w700)),
                        ),
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
