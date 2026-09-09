import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';

import '../../../../theme/theme.dart';
import '../../../../models/candidate_item.dart';
import '../../data/hr_api.dart';

class HrRecruitmentPipelineScreen extends StatefulWidget {
  final String initialStage;

  const HrRecruitmentPipelineScreen({
    super.key,
    this.initialStage = 'All',
  });

  @override
  State<HrRecruitmentPipelineScreen> createState() => _HrRecruitmentPipelineScreenState();
}

class _HrRecruitmentPipelineScreenState extends State<HrRecruitmentPipelineScreen> {
  final HrApi _api = HrApi();
  List<CandidateItem> _candidates = [];
  bool _isLoading = true;
  late String _selectedStage;
  String _searchQuery = '';

  final List<String> _stages = [
    'All',
    'Applied',
    'Interview Scheduled',
    'Interviewed',
    'Selected',
    'Joined',
    'Rejected',
  ];

  @override
  void initState() {
    super.initState();
    _selectedStage = widget.initialStage;
    _loadCandidates();
  }

  Future<void> _loadCandidates() async {
    setState(() => _isLoading = true);
    try {
      final list = await _api.getCandidates();
      if (mounted) {
        setState(() {
          _candidates = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<CandidateItem> get _filteredCandidates {
    return _candidates.where((c) {
      final matchesStage = _selectedStage == 'All' ||
          c.recruitmentStatus.trim().toLowerCase() == _selectedStage.trim().toLowerCase();
      final q = _searchQuery.trim().toLowerCase();
      final matchesQuery = q.isEmpty ||
          c.name.toLowerCase().contains(q) ||
          c.email.toLowerCase().contains(q) ||
          (c.appliedRole ?? '').toLowerCase().contains(q) ||
          (c.college ?? '').toLowerCase().contains(q);
      return matchesStage && matchesQuery;
    }).toList();
  }

  Color _getStageColor(String status) {
    final s = status.toLowerCase();
    if (s.contains('selected') || s.contains('join')) return const Color(0xFF059669);
    if (s.contains('interview')) return const Color(0xFF7C3AED);
    if (s.contains('reject')) return const Color(0xFFEF4444);
    return const Color(0xFF2563EB);
  }

  Color _getStageBg(String status) {
    final s = status.toLowerCase();
    if (s.contains('selected') || s.contains('join')) return const Color(0xFFECFDF5);
    if (s.contains('interview')) return const Color(0xFFFAF5FF);
    if (s.contains('reject')) return const Color(0xFFFEF2F2);
    return const Color(0xFFEFF6FF);
  }

  // ─── ADD APPLICANT MODAL ──────────────────────────────────────────────────
  void _showAddApplicantModal() {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final collegeCtrl = TextEditingController();
    final roleCtrl = TextEditingController(text: 'Software Engineer');
    String domain = 'Engineering';
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
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
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFAF5FF),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(LucideIcons.userPlus, size: 20, color: Color(0xFF7C3AED)),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Register Candidate Profile',
                          style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        ),
                        Text(
                          'Add applicant to ATS recruitment pipeline',
                          style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 22, color: Color(0xFFE2E8F0)),

                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(
                    labelText: 'Full Name *',
                    hintText: 'e.g. Alex Morgan',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    labelText: 'Corporate / Personal Email *',
                    hintText: 'alex.morgan@example.com',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: phoneCtrl,
                        keyboardType: TextInputType.phone,
                        decoration: InputDecoration(
                          labelText: 'Contact Phone',
                          hintText: '+91 9876543210',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: collegeCtrl,
                        decoration: InputDecoration(
                          labelText: 'College / Institute',
                          hintText: 'IIT Madras / BITS',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: roleCtrl,
                  decoration: InputDecoration(
                    labelText: 'Target Job Title / Applied Role',
                    hintText: 'Associate Backend Engineer',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 12),

                DropdownButtonFormField<String>(
                  value: domain,
                  decoration: InputDecoration(
                    labelText: 'Domain Track',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  items: ['Engineering', 'Product & Design', 'Marketing', 'Human Resources', 'Operations']
                      .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                      .toList(),
                  onChanged: (v) => setModalState(() => domain = v ?? 'Engineering'),
                ),
                const SizedBox(height: 18),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: isSaving ? null : () async {
                      if (nameCtrl.text.trim().isEmpty || emailCtrl.text.trim().isEmpty) return;
                      setModalState(() => isSaving = true);

                      final newCand = await _api.createCandidate(
                        name: nameCtrl.text.trim(),
                        email: emailCtrl.text.trim(),
                        phone: phoneCtrl.text.trim().isNotEmpty ? phoneCtrl.text.trim() : null,
                        college: collegeCtrl.text.trim().isNotEmpty ? collegeCtrl.text.trim() : null,
                        domain: domain,
                        appliedRole: roleCtrl.text.trim().isNotEmpty ? roleCtrl.text.trim() : null,
                      );

                      if (modalCtx.mounted) Navigator.pop(modalCtx);
                      if (newCand != null) {
                        _loadCandidates();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Candidate ${nameCtrl.text.trim()} added to Applied stage'),
                              backgroundColor: const Color(0xFF10B981),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7C3AED),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: isSaving
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Add Candidate to Pipeline', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─── SCORECARD MODAL ───────────────────────────────────────────────────────
  void _showScorecardModal(CandidateItem candidate) {
    int techRating = candidate.scorecard?.technical ?? 4;
    int probRating = candidate.scorecard?.problemSolving ?? 4;
    int cultRating = candidate.scorecard?.cultureFit ?? 4;
    int commRating = candidate.scorecard?.communication ?? 4;
    String recommendation = candidate.scorecard?.recommendation ?? 'Hire';
    final notesCtrl = TextEditingController(text: candidate.scorecard?.notes ?? '');
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) {
          final avgScore = (techRating + probRating + cultRating + commRating) / 4.0;

          Widget buildStarSelector(String title, String subtitle, int currentVal, Function(int) onSelected) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                        Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(5, (i) {
                      final starNum = i + 1;
                      final isFilled = starNum <= currentVal;
                      return InkWell(
                        onTap: () => onSelected(starNum),
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 2),
                          child: Icon(
                            isFilled ? LucideIcons.star : LucideIcons.star,
                            size: 20,
                            color: isFilled ? const Color(0xFFEAB308) : const Color(0xFFCBD5E1),
                          ),
                        ),
                      );
                    }),
                  ),
                ],
              ),
            );
          }

          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 14,
              bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
            ),
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
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: const Color(0xFFEDE9FE), borderRadius: BorderRadius.circular(10)),
                            child: const Icon(LucideIcons.clipboardCheck, size: 20, color: Color(0xFF7C3AED)),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Interview Scorecard',
                                style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                              ),
                              Text(
                                candidate.name,
                                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFAF5FF),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFDDD6FE)),
                        ),
                        child: Text(
                          '${avgScore.toStringAsFixed(1)} ★',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF7C3AED)),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 22, color: Color(0xFFE2E8F0)),

                  buildStarSelector('Technical Competency', 'Architecture, code depth & system design', techRating, (v) => setModalState(() => techRating = v)),
                  buildStarSelector('Problem Solving', 'Algorithmic reasoning & analytic clarity', probRating, (v) => setModalState(() => probRating = v)),
                  buildStarSelector('Culture & Collaboration', 'Team mindset, alignment & maturity', cultRating, (v) => setModalState(() => cultRating = v)),
                  buildStarSelector('Communication & Articulation', 'Clarity, listening & expressing ideas', commRating, (v) => setModalState(() => commRating = v)),

                  const SizedBox(height: 10),
                  const Text('Hiring Verdict & Recommendation *', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      'Strong Hire',
                      'Hire',
                      'Weak Hire',
                      'No Hire',
                    ].map((rec) {
                      final isSel = recommendation == rec;
                      Color cColor = const Color(0xFF10B981);
                      if (rec == 'Strong Hire') cColor = const Color(0xFF059669);
                      if (rec == 'Weak Hire') cColor = const Color(0xFFF59E0B);
                      if (rec == 'No Hire') cColor = const Color(0xFFEF4444);

                      return ChoiceChip(
                        label: Text(rec),
                        selected: isSel,
                        selectedColor: cColor,
                        backgroundColor: const Color(0xFFF8FAFC),
                        labelStyle: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: isSel ? Colors.white : const Color(0xFF334155),
                        ),
                        onSelected: (_) => setModalState(() => recommendation = rec),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 12),
                  TextField(
                    controller: notesCtrl,
                    maxLines: 3,
                    decoration: InputDecoration(
                      labelText: 'Evaluation Notes & Observations',
                      hintText: 'Discuss key strengths, code review feedback, or concerns...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),

                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isSaving ? null : () async {
                        setModalState(() => isSaving = true);
                        final success = await _api.submitCandidateScorecard(candidate.id, {
                          'technical': techRating,
                          'problemSolving': probRating,
                          'cultureFit': cultRating,
                          'communication': commRating,
                          'recommendation': recommendation,
                          'notes': notesCtrl.text.trim(),
                        });
                        if (modalCtx.mounted) Navigator.pop(modalCtx);
                        if (success) {
                          _loadCandidates();
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Evaluation scorecard recorded successfully'),
                                backgroundColor: Color(0xFF10B981),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF7C3AED),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: isSaving
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Save Scorecard & Update Stage', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ─── OFFER LETTER MODAL ────────────────────────────────────────────────────
  void _showOfferLetterModal(CandidateItem candidate) {
    if (candidate.offerDetails != null) {
      final od = candidate.offerDetails!;
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
                const SizedBox(height: 14),
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
                        'Ref: ${od.serialNumber}',
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
                      _buildLetterheadRow('Candidate Name', candidate.name),
                      const Divider(height: 14, color: Color(0xFFE2E8F0)),
                      _buildLetterheadRow('Designation', od.designation),
                      const Divider(height: 14, color: Color(0xFFE2E8F0)),
                      _buildLetterheadRow('Department', od.department),
                      const Divider(height: 14, color: Color(0xFFE2E8F0)),
                      _buildLetterheadRow('Work Mode', od.workMode),
                      const Divider(height: 14, color: Color(0xFFE2E8F0)),
                      _buildLetterheadRow('Probation Term', od.probationPeriod),
                      const Divider(height: 14, color: Color(0xFFE2E8F0)),
                      _buildLetterheadRow(
                        'Joining Date',
                        od.joiningDate != null ? DateFormat('MMMM d, yyyy').format(od.joiningDate!) : 'Scheduled in 14 days',
                      ),
                      if (od.reportingManager != null) ...[
                        const Divider(height: 14, color: Color(0xFFE2E8F0)),
                        _buildLetterheadRow('Reporting Lead', od.reportingManager!),
                      ],
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
                          'Issued electronically under MOVI Organizational Management System. Compliant with internal HR governance.',
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
                        label: const Text('Copy Details'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () {
                          final buffer = StringBuffer();
                          buffer.writeln('APPOINTMENT OFFER LETTER - MOVI OMS');
                          buffer.writeln('Ref: ${od.serialNumber}');
                          buffer.writeln('Candidate: ${candidate.name}');
                          buffer.writeln('Designation: ${od.designation}');
                          buffer.writeln('Department: ${od.department}');
                          buffer.writeln('Work Mode: ${od.workMode}');
                          buffer.writeln('Probation: ${od.probationPeriod}');
                          buffer.writeln('Joining Date: ${od.joiningDate != null ? DateFormat("d MMM yyyy").format(od.joiningDate!) : "TBD"}');
                          Clipboard.setData(ClipboardData(text: buffer.toString()));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Offer Letter summary copied to clipboard'),
                              backgroundColor: Color(0xFF10B981),
                              behavior: SnackBarBehavior.floating,
                            ),
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
                        child: const Text('Close Preview'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
      return;
    }

    final desigCtrl = TextEditingController(text: candidate.appliedRole ?? 'Software Engineer');
    final deptCtrl = TextEditingController(text: candidate.domain ?? 'Engineering');
    final managerCtrl = TextEditingController(text: 'Engineering Lead');
    String probationPeriod = '3 Months';
    String workMode = 'Office';
    DateTime joiningDate = DateTime.now().add(const Duration(days: 14));
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
          ),
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
                      decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(10)),
                      child: const Icon(LucideIcons.award, size: 20, color: Color(0xFF059669)),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Generate Offer Letter',
                          style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        ),
                        Text(
                          'For ${candidate.name}',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 22, color: Color(0xFFE2E8F0)),

                TextField(
                  controller: desigCtrl,
                  decoration: InputDecoration(
                    labelText: 'Appointment Designation *',
                    hintText: 'e.g. Associate Software Engineer',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: deptCtrl,
                  decoration: InputDecoration(
                    labelText: 'Department',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: workMode,
                        decoration: InputDecoration(
                          labelText: 'Work Mode',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                        items: ['Office', 'Hybrid', 'Remote']
                            .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                            .toList(),
                        onChanged: (v) => setModalState(() => workMode = v ?? 'Office'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: probationPeriod,
                        decoration: InputDecoration(
                          labelText: 'Probation Term',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                        items: ['None', '1 Month', '3 Months', '6 Months']
                            .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                            .toList(),
                        onChanged: (v) => setModalState(() => probationPeriod = v ?? '3 Months'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: managerCtrl,
                  decoration: InputDecoration(
                    labelText: 'Reporting Manager / Lead',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 18),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: isSubmitting ? null : () async {
                      if (desigCtrl.text.trim().isEmpty) return;
                      setModalState(() => isSubmitting = true);
                      final success = await _api.generateCandidateOffer(candidate.id, {
                        'designation': desigCtrl.text.trim(),
                        'department': deptCtrl.text.trim(),
                        'reportingManager': managerCtrl.text.trim(),
                        'workMode': workMode,
                        'probationPeriod': probationPeriod,
                        'joiningDate': joiningDate.toIso8601String(),
                      });
                      if (modalCtx.mounted) Navigator.pop(modalCtx);
                      if (success) {
                        _loadCandidates();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Official Offer Letter generated and dispatched successfully!'),
                              backgroundColor: Color(0xFF10B981),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: isSubmitting
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Issue Official Offer Letter', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLetterheadRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
        Text(value, style: const TextStyle(fontSize: 12.5, color: Color(0xFF0F172A), fontWeight: FontWeight.w700)),
      ],
    );
  }

  // ─── RESUME MODAL ──────────────────────────────────────────────────────────
  void _showResumeModal(CandidateItem candidate) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
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
                  decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(LucideIcons.fileText, size: 20, color: Color(0xFF2563EB)),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Candidate Dossier & Resume', style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                    Text(candidate.name, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  ],
                ),
              ],
            ),
            const Divider(height: 22, color: Color(0xFFE2E8F0)),

            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(LucideIcons.fileCode, size: 22, color: Color(0xFF2563EB)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              candidate.resumeFileName ?? '${candidate.name.replaceAll(' ', '_')}_Resume.pdf',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                            ),
                            const Text('Verified PDF Document • Cloud Encrypted', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(6)),
                        child: Text(candidate.appliedRole ?? 'Applicant', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
                        child: Text(candidate.domain ?? 'Core', style: const TextStyle(fontSize: 11, color: Color(0xFF475569))),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(LucideIcons.check, size: 18),
                label: const Text('Acknowledge & Close Dossier', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F172A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () => Navigator.pop(ctx),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── STAGE ADVANCE / CHANGE HELPER ─────────────────────────────────────────
  Future<void> _advanceCandidateStage(CandidateItem c) async {
    HapticFeedback.selectionClick();
    String nextStage;
    switch (c.recruitmentStatus.trim()) {
      case 'Applied':
        nextStage = 'Interview Scheduled';
        break;
      case 'Interview Scheduled':
        nextStage = 'Interviewed';
        break;
      case 'Interviewed':
        nextStage = 'Selected';
        break;
      case 'Selected':
        nextStage = 'Joined';
        break;
      default:
        nextStage = 'Joined';
    }

    final ok = await _api.updateCandidateStage(c.id, status: nextStage);
    if (ok) {
      _loadCandidates();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${c.name} promoted to "$nextStage"'),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showChangeStageDialog(CandidateItem c) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: const [
            Icon(LucideIcons.gitFork, size: 20, color: Color(0xFF7C3AED)),
            SizedBox(width: 8),
            Text('Update Recruitment Stage', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Move ${c.name} to target milestone:', style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B))),
            const SizedBox(height: 12),
            ...['Applied', 'Interview Scheduled', 'Interviewed', 'Selected', 'Joined', 'Rejected'].map((st) {
              final isCur = c.recruitmentStatus.toLowerCase() == st.toLowerCase();
              return ListTile(
                dense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 6),
                title: Text(st, style: TextStyle(fontWeight: isCur ? FontWeight.w800 : FontWeight.w500, color: isCur ? const Color(0xFF7C3AED) : const Color(0xFF0F172A))),
                trailing: isCur ? const Icon(LucideIcons.check, size: 16, color: Color(0xFF7C3AED)) : null,
                onTap: () async {
                  Navigator.pop(ctx);
                  await _api.updateCandidateStage(c.id, status: st);
                  _loadCandidates();
                },
              );
            }),
          ],
        ),
      ),
    );
  }

  // ─── BUILD PIPELINE SCREEN ────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final filtered = _filteredCandidates;

    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, size: 20, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Talent Acquisition (ATS)',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            Text(
              '${_candidates.length} total applicants in hiring pipeline',
              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ElevatedButton.icon(
              onPressed: _showAddApplicantModal,
              icon: const Icon(LucideIcons.plus, size: 15),
              label: const Text('Add Candidate', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: const Color(0xFF7C3AED),
        onRefresh: _loadCandidates,
        child: Column(
          children: [
            // Stage Pipeline Horizontal Filter Tabs
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: _stages.map((stage) {
                    final isSel = _selectedStage == stage;
                    final count = stage == 'All'
                        ? _candidates.length
                        : _candidates.where((c) => c.recruitmentStatus.toLowerCase() == stage.toLowerCase()).length;

                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: InkWell(
                        onTap: () => setState(() => _selectedStage = stage),
                        borderRadius: BorderRadius.circular(12),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                          decoration: BoxDecoration(
                            color: isSel ? const Color(0xFF7C3AED) : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSel ? const Color(0xFF7C3AED) : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Row(
                            children: [
                              Text(
                                stage,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                                  color: isSel ? Colors.white : const Color(0xFF475569),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: isSel ? Colors.white.withOpacity(0.25) : const Color(0xFFE2E8F0),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '$count',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: isSel ? Colors.white : const Color(0xFF64748B),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),

            // Live Search Bar
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Container(
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: TextField(
                  onChanged: (v) => setState(() => _searchQuery = v),
                  decoration: const InputDecoration(
                    hintText: 'Search applicant by name, role, college, email...',
                    hintStyle: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                    prefixIcon: Icon(LucideIcons.search, size: 16, color: Color(0xFF64748B)),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ),
            const Divider(height: 1, color: Color(0xFFE2E8F0)),

            // Candidates List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C3AED)))
                  : filtered.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFAF5FF),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(LucideIcons.search, size: 36, color: Color(0xFF7C3AED)),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'No candidates found in "$_selectedStage"',
                                style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF0F172A), fontSize: 14.5),
                              ),
                              const SizedBox(height: 4),
                              const Text('Try selecting another stage or register a new applicant.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 12),
                          itemBuilder: (context, idx) {
                            final c = filtered[idx];
                            final badgeColor = _getStageColor(c.recruitmentStatus);
                            final badgeBg = _getStageBg(c.recruitmentStatus);

                            return Container(
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
                                  // Header with Avatar, Name, and Stage Dropdown
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      CircleAvatar(
                                        radius: 20,
                                        backgroundColor: const Color(0xFFEDE9FE),
                                        child: Text(
                                          c.name.isNotEmpty ? c.name[0].toUpperCase() : 'C',
                                          style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF7C3AED), fontSize: 14),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              c.name,
                                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '${c.appliedRole ?? "General Applicant"} • ${c.email}',
                                              style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                                            ),
                                            if (c.college != null && c.college!.isNotEmpty) ...[
                                              const SizedBox(height: 2),
                                              Text(
                                                '${c.college!} • ${c.domain ?? "Core"}',
                                                style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                      InkWell(
                                        onTap: () => _showChangeStageDialog(c),
                                        borderRadius: BorderRadius.circular(8),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(8)),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                c.recruitmentStatus.toUpperCase(),
                                                style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: badgeColor),
                                              ),
                                              const SizedBox(width: 3),
                                              Icon(LucideIcons.chevronDown, size: 11, color: badgeColor),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),

                                  // Scorecard badge if present
                                  if (c.scorecard != null) ...[
                                    Container(
                                      margin: const EdgeInsets.only(top: 10),
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFAF5FF),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: const Color(0xFFF3E8FF)),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(LucideIcons.star, size: 12, color: Color(0xFFEAB308)),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Scorecard: ${c.scorecard!.overall.toStringAsFixed(1)} ★ (${c.scorecard!.recommendation})',
                                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF7C3AED)),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],

                                  // Offer badge if present
                                  if (c.offerDetails != null) ...[
                                    Container(
                                      margin: const EdgeInsets.only(top: 6),
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFECFDF5),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: const Color(0xFFA7F3D0)),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(LucideIcons.fileCheck2, size: 12, color: Color(0xFF059669)),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              'Offer: ${c.offerDetails!.designation} • Ref: ${c.offerDetails!.serialNumber}',
                                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF065F46)),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],

                                  const SizedBox(height: 12),
                                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                                  const SizedBox(height: 10),

                                  // Action Buttons
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          icon: const Icon(LucideIcons.clipboardCheck, size: 12, color: Color(0xFF7C3AED)),
                                          label: Text(
                                            c.scorecard != null ? 'Scorecard' : 'Rate',
                                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF7C3AED)),
                                          ),
                                          style: OutlinedButton.styleFrom(
                                            side: const BorderSide(color: Color(0xFFDDD6FE)),
                                            backgroundColor: const Color(0xFFFAF5FF),
                                            padding: const EdgeInsets.symmetric(vertical: 8),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                          onPressed: () => _showScorecardModal(c),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          icon: const Icon(LucideIcons.award, size: 12, color: Color(0xFF059669)),
                                          label: Text(
                                            c.offerDetails != null ? 'View Offer' : 'Offer',
                                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                                          ),
                                          style: OutlinedButton.styleFrom(
                                            side: const BorderSide(color: Color(0xFFA7F3D0)),
                                            backgroundColor: const Color(0xFFECFDF5),
                                            padding: const EdgeInsets.symmetric(vertical: 8),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                          onPressed: () => _showOfferLetterModal(c),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          icon: const Icon(LucideIcons.fileText, size: 12, color: Color(0xFF2563EB)),
                                          label: const Text('Resume', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                                          style: OutlinedButton.styleFrom(
                                            side: const BorderSide(color: Color(0xFFBFDBFE)),
                                            backgroundColor: const Color(0xFFEFF6FF),
                                            padding: const EdgeInsets.symmetric(vertical: 8),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                          onPressed: () => _showResumeModal(c),
                                        ),
                                      ),
                                      if (c.recruitmentStatus.toLowerCase() != 'joined' && c.recruitmentStatus.toLowerCase() != 'rejected') ...[
                                        const SizedBox(width: 8),
                                        ElevatedButton(
                                          onPressed: () => _advanceCandidateStage(c),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFF0F172A),
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                            minimumSize: Size.zero,
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: const [
                                              Text('Advance', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                              SizedBox(width: 2),
                                              Icon(LucideIcons.chevronRight, size: 12),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
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
