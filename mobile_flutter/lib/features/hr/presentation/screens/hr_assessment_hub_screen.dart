import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../theme/theme.dart';
import '../../../../models/assessment_item.dart';
import '../../data/hr_api.dart';

class HrAssessmentHubScreen extends StatefulWidget {
  const HrAssessmentHubScreen({super.key});

  @override
  State<HrAssessmentHubScreen> createState() => _HrAssessmentHubScreenState();
}

class _HrAssessmentHubScreenState extends State<HrAssessmentHubScreen>
    with SingleTickerProviderStateMixin {
  final HrApi _api = HrApi();
  late TabController _tabController;

  List<AssessmentDrive> _drives = [];
  bool _isLoadingDrives = true;
  AssessmentDrive? _selectedDriveForQuestions;
  AssessmentDrive? _selectedDriveForSubmissions;
  List<CandidateSession> _submissions = [];
  bool _isLoadingSubmissions = false;

  String _selectedCategory = 'All';
  final List<String> _categories = [
    'All',
    'Technical',
    'Aptitude',
    'Behavioral',
    'System Design'
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    _loadDrives();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadDrives() async {
    setState(() => _isLoadingDrives = true);
    try {
      final list = await _api.getAssessmentDrives();
      if (mounted) {
        setState(() {
          _drives = list;
          _isLoadingDrives = false;
          if (_drives.isNotEmpty) {
            _selectedDriveForQuestions ??= _drives.first;
            _selectedDriveForSubmissions ??= _drives.first;
            if (_selectedDriveForSubmissions != null) {
              _loadSubmissions(_selectedDriveForSubmissions!.id);
            }
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingDrives = false);
    }
  }

  Future<void> _loadSubmissions(String driveId) async {
    setState(() => _isLoadingSubmissions = true);
    try {
      final subs = await _api.getDriveSubmissions(driveId);
      if (mounted) {
        setState(() {
          _submissions = subs;
          _isLoadingSubmissions = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingSubmissions = false);
    }
  }

  void _copySessionCode(String code) {
    Clipboard.setData(ClipboardData(text: code));
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(LucideIcons.checkCheck, color: Colors.white, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Session key "$code" copied to clipboard.',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF0F172A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  // ─── CREATE DRIVE MODAL ───────────────────────────────────────────────────

  void _showCreateDriveModal({
    String? defaultTitle,
    String? defaultRole,
    String? defaultDept,
    String? defaultDuration,
    String? defaultPassing,
  }) {
    final titleCtrl = TextEditingController(text: defaultTitle ?? '');
    final roleCtrl = TextEditingController(text: defaultRole ?? '');
    final deptCtrl = TextEditingController(text: defaultDept ?? 'Engineering');
    final durationCtrl = TextEditingController(text: defaultDuration ?? '30');
    final passingCtrl = TextEditingController(text: defaultPassing ?? '70');
    final codeCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: EdgeInsets.fromLTRB(
          20,
          14,
          20,
          MediaQuery.of(modalCtx).viewInsets.bottom + 20,
        ),
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Drag Handle
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Modal Header with Icon, Overflow-Safe Title & Close Button
              Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(11),
                      border: Border.all(color: const Color(0xFFDBEAFE)),
                    ),
                    child: const Center(
                      child: Icon(LucideIcons.filePlus2,
                          size: 19, color: Color(0xFF2563EB)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Create Assessment Drive',
                          style: TextStyle(
                            fontSize: 16.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                            letterSpacing: -0.3,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Configure room parameters & session keys',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFF64748B),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => Navigator.pop(modalCtx),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(LucideIcons.x,
                            size: 16, color: Color(0xFF64748B)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Field 1: Assessment Title
              TextField(
                controller: titleCtrl,
                decoration: InputDecoration(
                  labelText: 'Assessment Title *',
                  hintText: 'e.g. Flutter Specialist Screening',
                  prefixIcon: const Icon(LucideIcons.briefcase,
                      size: 16, color: Color(0xFF64748B)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                  ),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                ),
              ),
              const SizedBox(height: 12),

              // Row 2: Target Role & Department
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: roleCtrl,
                      decoration: InputDecoration(
                        labelText: 'Target Role *',
                        hintText: 'e.g. Mobile Developer',
                        prefixIcon: const Icon(LucideIcons.userCheck,
                            size: 16, color: Color(0xFF64748B)),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                              color: Color(0xFF2563EB), width: 1.5),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 13),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: deptCtrl,
                      decoration: InputDecoration(
                        labelText: 'Department',
                        prefixIcon: const Icon(LucideIcons.building2,
                            size: 16, color: Color(0xFF64748B)),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                              color: Color(0xFF2563EB), width: 1.5),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 13),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Row 3: Evaluation Rules (Duration & Passing Score)
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: durationCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Duration (Minutes)',
                        prefixIcon: const Icon(LucideIcons.clock,
                            size: 16, color: Color(0xFF64748B)),
                        suffixText: 'mins',
                        suffixStyle: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF64748B)),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                              color: Color(0xFF2563EB), width: 1.5),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 13),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: passingCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Pass Cutoff (%)',
                        prefixIcon: const Icon(LucideIcons.target,
                            size: 16, color: Color(0xFF64748B)),
                        suffixText: '%',
                        suffixStyle: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF64748B)),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                              color: Color(0xFF2563EB), width: 1.5),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 13),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Field 4: Custom Session Key
              TextField(
                controller: codeCtrl,
                textCapitalization: TextCapitalization.characters,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
                decoration: InputDecoration(
                  labelText: 'Custom Session Key (Optional)',
                  hintText: 'e.g. MOVI-FL-8931 (Leave blank to auto-generate)',
                  hintStyle: const TextStyle(
                      fontFamily: 'normal',
                      fontSize: 12,
                      letterSpacing: 0),
                  prefixIcon: const Icon(LucideIcons.keyRound,
                      size: 16, color: Color(0xFF64748B)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                  ),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                ),
              ),
              const SizedBox(height: 6),
              const Padding(
                padding: EdgeInsets.only(left: 4),
                child: Text(
                  'Candidates use this key to enter the test portal without an account.',
                  style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
              ),
              const SizedBox(height: 18),

              // Primary CTA Button
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withOpacity(0.28),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    foregroundColor: Colors.white,
                    shadowColor: Colors.transparent,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    if (titleCtrl.text.trim().isEmpty ||
                        roleCtrl.text.trim().isEmpty) {
                      ScaffoldMessenger.of(modalCtx).showSnackBar(
                        const SnackBar(
                          content: Text('Please enter Title and Role.'),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                      return;
                    }

                    final messenger = ScaffoldMessenger.of(context);
                    final drive = await _api.createAssessmentDrive(
                      title: titleCtrl.text.trim(),
                      role: roleCtrl.text.trim(),
                      department: deptCtrl.text.trim(),
                      durationMinutes:
                          int.tryParse(durationCtrl.text.trim()) ?? 30,
                      passingScore: int.tryParse(passingCtrl.text.trim()) ?? 70,
                      sessionCode: codeCtrl.text.trim().isNotEmpty
                          ? codeCtrl.text.trim()
                          : null,
                    );

                    if (modalCtx.mounted) Navigator.pop(modalCtx);
                    if (drive != null) {
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text(
                              'Drive created! Session key: ${drive.sessionCode}'),
                          backgroundColor: const Color(0xFF10B981),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                      _loadDrives();
                    } else {
                      messenger.showSnackBar(
                        const SnackBar(
                          content: Text('Failed to create assessment drive.'),
                          backgroundColor: Color(0xFFEF4444),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  },
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.rocket, size: 16),
                      SizedBox(width: 8),
                      Text(
                        'Launch Assessment Drive',
                        style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── ADD QUESTION VISUAL MODAL ───────────────────────────────────────────

  void _showAddQuestionModal() {
    if (_drives.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please create an assessment drive first.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final targetDrive = _selectedDriveForQuestions ?? _drives.first;
    final questionCtrl = TextEditingController();
    final codeSnippetCtrl = TextEditingController();
    final opt0Ctrl = TextEditingController();
    final opt1Ctrl = TextEditingController();
    final opt2Ctrl = TextEditingController();
    final opt3Ctrl = TextEditingController();
    int correctIndex = 0;
    String category = 'Technical';
    String difficulty = 'Mid';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.fromLTRB(
            20,
            16,
            20,
            MediaQuery.of(modalCtx).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFDBEAFE)),
                      ),
                      child: const Icon(LucideIcons.helpCircle,
                          size: 20, color: Color(0xFF2563EB)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Add Question to Repository',
                            style: TextStyle(
                              fontSize: 16.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              letterSpacing: -0.3,
                            ),
                          ),
                          Text(
                            'Target Drive: ${targetDrive.title}',
                            style: const TextStyle(
                              fontSize: 11.5,
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

                TextField(
                  controller: questionCtrl,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: 'Question Prompt *',
                    hintText:
                        'e.g. Which lifecycle method executes first in a Flutter StatefulWidget?',
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.all(14),
                  ),
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: category,
                        decoration: InputDecoration(
                          labelText: 'Domain Category',
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide:
                                const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                        ),
                        items: [
                          'Technical',
                          'Aptitude',
                          'Behavioral',
                          'System Design'
                        ].map((c) {
                          return DropdownMenuItem(
                              value: c,
                              child: Text(c,
                                  style: const TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600)));
                        }).toList(),
                        onChanged: (v) => setModalState(() => category = v!),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: difficulty,
                        decoration: InputDecoration(
                          labelText: 'Difficulty Level',
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide:
                                const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                        ),
                        items: ['Junior', 'Mid', 'Senior'].map((d) {
                          return DropdownMenuItem(
                              value: d,
                              child: Text(d,
                                  style: const TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600)));
                        }).toList(),
                        onChanged: (v) => setModalState(() => difficulty = v!),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: codeSnippetCtrl,
                  maxLines: 2,
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                  decoration: InputDecoration(
                    labelText: 'Code Snippet (Optional)',
                    hintText: 'final data = const <String, dynamic>{};',
                    filled: true,
                    fillColor: const Color(0xFF0F172A).withOpacity(0.03),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
                const SizedBox(height: 16),

                const Text(
                  'Answer Options (Select correct option radio):',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF475569)),
                ),
                const SizedBox(height: 8),

                _buildOptionInputRow(0, opt0Ctrl, correctIndex,
                    (idx) => setModalState(() => correctIndex = idx)),
                const SizedBox(height: 8),
                _buildOptionInputRow(1, opt1Ctrl, correctIndex,
                    (idx) => setModalState(() => correctIndex = idx)),
                const SizedBox(height: 8),
                _buildOptionInputRow(2, opt2Ctrl, correctIndex,
                    (idx) => setModalState(() => correctIndex = idx)),
                const SizedBox(height: 8),
                _buildOptionInputRow(3, opt3Ctrl, correctIndex,
                    (idx) => setModalState(() => correctIndex = idx)),
                const SizedBox(height: 20),

                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF2563EB).withOpacity(0.25),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      foregroundColor: Colors.white,
                      shadowColor: Colors.transparent,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () async {
                      if (questionCtrl.text.trim().isEmpty ||
                          opt0Ctrl.text.trim().isEmpty ||
                          opt1Ctrl.text.trim().isEmpty) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(
                            content: Text(
                                'Please enter question and at least 2 options.'),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                        return;
                      }

                      final options = [
                        opt0Ctrl.text.trim(),
                        opt1Ctrl.text.trim(),
                        if (opt2Ctrl.text.trim().isNotEmpty)
                          opt2Ctrl.text.trim(),
                        if (opt3Ctrl.text.trim().isNotEmpty)
                          opt3Ctrl.text.trim(),
                      ];

                      final messenger = ScaffoldMessenger.of(context);
                      final ok = await _api.addQuestionsToDrive(targetDrive.id, [
                        {
                          'questionText': questionCtrl.text.trim(),
                          'category': category,
                          'difficulty': difficulty,
                          'options': options,
                          'correctOptionIndex': correctIndex,
                          'points': 10,
                          if (codeSnippetCtrl.text.trim().isNotEmpty)
                            'codeSnippet': codeSnippetCtrl.text.trim(),
                        }
                      ]);

                      if (modalCtx.mounted) Navigator.pop(modalCtx);
                      if (ok) {
                        messenger.showSnackBar(
                          const SnackBar(
                            content:
                                Text('Question successfully added to bank!'),
                            backgroundColor: Color(0xFF10B981),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                        _loadDrives();
                      } else {
                        messenger.showSnackBar(
                          const SnackBar(
                            content: Text('Failed to add question.'),
                            backgroundColor: Color(0xFFEF4444),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      }
                    },
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.check, size: 16),
                        SizedBox(width: 8),
                        Text(
                          'Save Question to Drive',
                          style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.2),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOptionInputRow(int index, TextEditingController ctrl,
      int selectedIndex, Function(int) onSelect) {
    final isCorrect = selectedIndex == index;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isCorrect
            ? const Color(0xFF10B981).withOpacity(0.06)
            : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isCorrect ? const Color(0xFF10B981) : const Color(0xFFE2E8F0),
          width: isCorrect ? 1.5 : 1.0,
        ),
      ),
      child: Row(
        children: [
          Radio<int>(
            value: index,
            groupValue: selectedIndex,
            activeColor: const Color(0xFF10B981),
            onChanged: (v) {
              if (v != null) onSelect(v);
            },
          ),
          Expanded(
            child: TextField(
              controller: ctrl,
              style: const TextStyle(fontSize: 12.5),
              decoration: InputDecoration(
                hintText:
                    'Option ${index + 1} ${isCorrect ? "(Correct Answer Key)" : ""}',
                hintStyle: TextStyle(
                  fontSize: 12,
                  color: isCorrect
                      ? const Color(0xFF059669)
                      : const Color(0xFF94A3B8),
                  fontWeight:
                      isCorrect ? FontWeight.w600 : FontWeight.normal,
                ),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── BULK JSON QUESTION UPLOADER ──────────────────────────────────────────

  void _showBulkUploadModal() {
    if (_drives.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please create an assessment drive first.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final targetDrive = _selectedDriveForQuestions ?? _drives.first;
    final jsonCtrl = TextEditingController(
      text: '''[
  {
    "questionText": "What is the primary difference between StatelessWidget and StatefulWidget in Flutter?",
    "category": "Technical",
    "difficulty": "Junior",
    "options": [
      "StatelessWidget does not hold mutable state across builds",
      "StatefulWidget cannot re-render after creation",
      "StatelessWidget is only for web development",
      "StatefulWidget consumes zero memory"
    ],
    "correctOptionIndex": 0,
    "points": 10
  },
  {
    "questionText": "Which Git command is used to combine changes from one branch into the active branch?",
    "category": "Technical",
    "difficulty": "Junior",
    "options": ["git fetch", "git pull --rebase", "git merge", "git push"],
    "correctOptionIndex": 2,
    "points": 10
  }
]''',
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: EdgeInsets.fromLTRB(
          20,
          16,
          20,
          MediaQuery.of(modalCtx).viewInsets.bottom + 24,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFDBEAFE)),
                    ),
                    child: const Icon(LucideIcons.uploadCloud,
                        size: 20, color: Color(0xFF2563EB)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Bulk Import Questions',
                          style: TextStyle(
                            fontSize: 16.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                            letterSpacing: -0.3,
                          ),
                        ),
                        Text(
                          'Target: ${targetDrive.title}',
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFF64748B),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'Paste a structured JSON array of questions with categories, difficulty ratings, and option sets.',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.3),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: jsonCtrl,
                maxLines: 10,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 11),
                decoration: InputDecoration(
                  hintText: 'Paste JSON array here...',
                  filled: true,
                  fillColor: const Color(0xFF0F172A).withOpacity(0.03),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  contentPadding: const EdgeInsets.all(12),
                ),
              ),
              const SizedBox(height: 16),

              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                  ),
                ),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    foregroundColor: Colors.white,
                    shadowColor: Colors.transparent,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    try {
                      final parsed = jsonDecode(jsonCtrl.text.trim());
                      if (parsed is! List || parsed.isEmpty) {
                        ScaffoldMessenger.of(modalCtx).showSnackBar(
                          const SnackBar(
                            content: Text(
                                'Invalid JSON: Must be a non-empty array of questions.'),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                        return;
                      }

                      final questions = List<Map<String, dynamic>>.from(parsed);
                      final messenger = ScaffoldMessenger.of(context);
                      final ok = await _api.addQuestionsToDrive(
                          targetDrive.id, questions);

                      if (modalCtx.mounted) Navigator.pop(modalCtx);
                      if (ok) {
                        messenger.showSnackBar(
                          SnackBar(
                            content: Text(
                                'Successfully imported ${questions.length} questions into drive!'),
                            backgroundColor: const Color(0xFF10B981),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                        _loadDrives();
                      } else {
                        messenger.showSnackBar(
                          const SnackBar(
                            content: Text(
                                'Failed to import questions. Verify JSON format.'),
                            backgroundColor: Color(0xFFEF4444),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      }
                    } catch (e) {
                      if (modalCtx.mounted) {
                        ScaffoldMessenger.of(modalCtx).showSnackBar(
                          SnackBar(
                            content: Text('JSON Syntax Error: $e'),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      }
                    }
                  },
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.fileCheck, size: 16),
                      SizedBox(width: 8),
                      Text('Validate & Import Repository',
                          style: TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── MAIN BUILD ───────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      body: SafeArea(
        bottom: false,
        child: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Executive Top Navigation Bar
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: Row(
                      children: [
                        // Polished Circular Back Button
                        Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => context.pop(),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                    color: const Color(0xFFE2E8F0), width: 1.2),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.02),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                LucideIcons.arrowLeft,
                                size: 18,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),

                        // Executive Title & Subtitle Hierarchy
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Assessment Studio',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF0F172A),
                                  letterSpacing: -0.4,
                                ),
                              ),
                              Text(
                                'Pre-employment candidate evaluation engine',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),

                        // Gradient "+ New Drive" Primary Action Button
                        Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: _showCreateDriveModal,
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [
                                    Color(0xFF2563EB),
                                    Color(0xFF1D4ED8)
                                  ],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                borderRadius: BorderRadius.circular(12),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF2563EB).withOpacity(0.28),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(LucideIcons.plus,
                                      size: 15, color: Colors.white),
                                  SizedBox(width: 5),
                                  Text(
                                    'New Drive',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white,
                                      letterSpacing: 0.1,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // 2. Executive Telemetry & KPI Strip (Replacing static banner)
                  _buildExecutiveKpiStrip(),

                  // 3. High-Precision Segmented Navigation Tabs (Modern iOS / Linear Style)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 6, 16, 10),
                    child: Container(
                      height: 46,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                            color: const Color(0xFFE2E8F0), width: 1.0),
                      ),
                      padding: const EdgeInsets.all(3.5),
                      child: TabBar(
                        controller: _tabController,
                        indicatorSize: TabBarIndicatorSize.tab,
                        indicator: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10.5),
                          border: Border.all(
                              color: const Color(0xFFE2E8F0), width: 1.0),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF0F172A).withOpacity(0.06),
                              blurRadius: 5,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        dividerColor: Colors.transparent,
                        labelPadding: EdgeInsets.zero,
                        tabs: [
                          _buildSegmentedTabItem(
                            index: 0,
                            label: 'Drives',
                            count: _drives.length,
                            icon: LucideIcons.layers,
                          ),
                          _buildSegmentedTabItem(
                            index: 1,
                            label: 'Questions',
                            count: _selectedDriveForQuestions?.questions.length ??
                                (_drives.isNotEmpty
                                    ? _drives.first.questions.length
                                    : 0),
                            icon: LucideIcons.helpCircle,
                          ),
                          _buildSegmentedTabItem(
                            index: 2,
                            label: 'Results',
                            count: _submissions.length,
                            icon: LucideIcons.award,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildDrivesTab(),
              _buildQuestionStudioTab(),
              _buildScorecardsTab(),
            ],
          ),
        ),
      ),
    );
  }

  // ─── EXECUTIVE KPI OVERVIEW STRIP ─────────────────────────────────────────

  Widget _buildExecutiveKpiStrip() {
    final activeDrives = _drives.where((d) => d.status == 'Active').length;
    final totalCompleted = _drives.fold<int>(
        0, (sum, d) => sum + (d.stats?.completed ?? 0));
    final avgScore = _drives.isEmpty
        ? 0
        : (_drives.fold<int>(0, (sum, d) => sum + (d.stats?.avgScore ?? 0)) ~/
            _drives.length);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withOpacity(0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            _buildKpiItem(
              label: 'Active Rooms',
              value: '$activeDrives',
              icon: LucideIcons.radio,
              iconColor: const Color(0xFF10B981),
              isLive: activeDrives > 0,
            ),
            _buildKpiDivider(),
            _buildKpiItem(
              label: 'Total Drives',
              value: '${_drives.length}',
              icon: LucideIcons.layers,
              iconColor: const Color(0xFF2563EB),
            ),
            _buildKpiDivider(),
            _buildKpiItem(
              label: 'Evaluated',
              value: '$totalCompleted',
              icon: LucideIcons.userCheck,
              iconColor: const Color(0xFF8B5CF6),
            ),
            _buildKpiDivider(),
            _buildKpiItem(
              label: 'Avg Pass Score',
              value: totalCompleted > 0 ? '$avgScore%' : '--',
              icon: LucideIcons.award,
              iconColor: const Color(0xFFF59E0B),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiItem({
    required String label,
    required String value,
    required IconData icon,
    required Color iconColor,
    bool isLive = false,
  }) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              if (isLive) ...[
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
              ],
              Icon(icon, size: 12, color: iconColor),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14.5,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
              letterSpacing: -0.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiDivider() {
    return Container(
      width: 1,
      height: 28,
      margin: const EdgeInsets.symmetric(horizontal: 8),
      color: const Color(0xFFF1F5F9),
    );
  }

  Widget _buildSegmentedTabItem({
    required int index,
    required String label,
    required int count,
    required IconData icon,
  }) {
    final isSelected = _tabController.index == index;
    return Tab(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 13,
            color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF94A3B8),
          ),
          const SizedBox(width: 5),
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
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
            decoration: BoxDecoration(
              color: isSelected
                  ? const Color(0xFFEFF6FF)
                  : const Color(0xFFE2E8F0).withOpacity(0.7),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isSelected ? const Color(0xFFDBEAFE) : Colors.transparent,
                width: 0.8,
              ),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w800,
                color: isSelected
                    ? const Color(0xFF2563EB)
                    : const Color(0xFF64748B),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── TAB 1: DRIVES & SESSION CODES ────────────────────────────────────────

  Widget _buildDrivesTab() {
    return RefreshIndicator(
      color: const Color(0xFF2563EB),
      onRefresh: _loadDrives,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Section Header: Executive Title, Live Status & Sort Action
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Row(
                  children: [
                    const Text(
                      'Assessment Drives',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: _drives.any((d) => d.status == 'Active')
                            ? const Color(0xFFECFDF5)
                            : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: _drives.any((d) => d.status == 'Active')
                              ? const Color(0xFFA7F3D0)
                              : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: _drives.any((d) => d.status == 'Active')
                                  ? const Color(0xFF10B981)
                                  : const Color(0xFF94A3B8),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            '${_drives.where((d) => d.status == 'Active').length} Active',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: _drives.any((d) => d.status == 'Active')
                                  ? const Color(0xFF065F46)
                                  : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.015),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.arrowUpDown, size: 11, color: Color(0xFF64748B)),
                      SizedBox(width: 4),
                      Text(
                        'Recent',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            if (_isLoadingDrives)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 50),
                child: Center(
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Color(0xFF2563EB),
                  ),
                ),
              )
            else if (_drives.isEmpty)
              _buildRedesignedEmptyState()
            else
              ..._drives.map((drive) => _buildDriveCard(drive)),
          ],
        ),
      ),
    );
  }

  // ─── REDESIGNED ENTERPRISE EMPTY STATE ────────────────────────────────────

  Widget _buildRedesignedEmptyState() {
    return Column(
      children: [
        // Main Onboarding Container
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0F172A).withOpacity(0.03),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              // Ambient Glow Icon Container
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFDBEAFE), width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withOpacity(0.12),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(LucideIcons.fileCheck2,
                      size: 30, color: Color(0xFF2563EB)),
                ),
              ),
              const SizedBox(height: 16),

              const Text(
                'No Assessment Drives Configured',
                style: TextStyle(
                  fontSize: 16.5,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.3,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 10),
                child: Text(
                  'Launch candidate test sessions with automated grading, passing score cutoffs, and proctored testing rooms.',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                    height: 1.45,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 20),

              // Connected 3-Step Setup Stepper
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    _buildWorkflowStep(
                      step: '01',
                      title: 'Configure Drive Parameters',
                      desc: 'Define target role, passing cutoff %, and test duration.',
                      isLast: false,
                    ),
                    _buildWorkflowStep(
                      step: '02',
                      title: 'Attach Question Bank',
                      desc: 'Add technical MCQs, system design, or coding questions.',
                      isLast: false,
                    ),
                    _buildWorkflowStep(
                      step: '03',
                      title: 'Issue Session Keys',
                      desc: 'Share private test keys with candidates for automated evaluation.',
                      isLast: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Prominent Primary CTA Button
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withOpacity(0.28),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    foregroundColor: Colors.white,
                    shadowColor: Colors.transparent,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () => _showCreateDriveModal(),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.plus, size: 16),
                      SizedBox(width: 8),
                      Text(
                        'Create First Drive',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Quick-Start Templates Section
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(5),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Icon(LucideIcons.sparkles,
                  size: 13, color: Color(0xFF2563EB)),
            ),
            const SizedBox(width: 8),
            const Text(
              'QUICK-START DRIVE TEMPLATES',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: Color(0xFF64748B),
                letterSpacing: 0.8,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        _buildPresetTemplateTile(
          title: 'Full-Stack Software Engineer',
          role: 'Full-Stack Developer',
          dept: 'Engineering',
          duration: '45',
          passing: '75',
          category: 'Technical',
          icon: LucideIcons.code2,
          accentColor: const Color(0xFF2563EB),
        ),
        const SizedBox(height: 8),
        _buildPresetTemplateTile(
          title: 'Frontend Specialist (Flutter / React)',
          role: 'Mobile Specialist',
          dept: 'Engineering',
          duration: '30',
          passing: '70',
          category: 'Mobile Dev',
          icon: LucideIcons.smartphone,
          accentColor: const Color(0xFF0D9488),
        ),
        const SizedBox(height: 8),
        _buildPresetTemplateTile(
          title: 'Product Designer (UI / UX)',
          role: 'Product Designer',
          dept: 'Design',
          duration: '30',
          passing: '65',
          category: 'Design Systems',
          icon: LucideIcons.palette,
          accentColor: const Color(0xFF8B5CF6),
        ),
      ],
    );
  }

  // ─── WORKFLOW STEP ITEM ───────────────────────────────────────────────────

  Widget _buildWorkflowStep({
    required String step,
    required String title,
    required String desc,
    required bool isLast,
  }) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withOpacity(0.25),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    step,
                    style: const TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 1.5,
                    color: const Color(0xFFDBEAFE),
                    margin: const EdgeInsets.symmetric(vertical: 4),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    desc,
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF64748B),
                      height: 1.3,
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

  // ─── PRESET TEMPLATE TILE ─────────────────────────────────────────────────

  Widget _buildPresetTemplateTile({
    required String title,
    required String role,
    required String dept,
    required String duration,
    required String passing,
    required String category,
    required IconData icon,
    required Color accentColor,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          _showCreateDriveModal(
            defaultTitle: title,
            defaultRole: role,
            defaultDept: dept,
            defaultDuration: duration,
            defaultPassing: passing,
          );
        },
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.015),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: accentColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Text(
                          '$duration mins • $passing% cutoff',
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            category,
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF475569),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFDBEAFE)),
                ),
                child: const Row(
                  children: [
                    Text(
                      'Use',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF2563EB),
                      ),
                    ),
                    SizedBox(width: 3),
                    Icon(LucideIcons.chevronRight,
                        size: 12, color: Color(0xFF2563EB)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── DRIVE CARD (ENTERPRISE GRADE) ────────────────────────────────────────

  Widget _buildDriveCard(AssessmentDrive drive) {
    final stats = drive.stats ?? AssessmentDriveStats();
    final isActive = drive.status == 'Active';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.025),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Role, Department, Live Status
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(LucideIcons.fileCheck2,
                    size: 18, color: Color(0xFF2563EB)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      drive.title,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${drive.role} • ${drive.department}',
                      style: const TextStyle(
                        fontSize: 11.5,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isActive
                      ? const Color(0xFFECFDF5)
                      : const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isActive
                        ? const Color(0xFFA7F3D0)
                        : const Color(0xFFFDE68A),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: isActive
                            ? const Color(0xFF10B981)
                            : const Color(0xFFD97706),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      drive.status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: isActive
                            ? const Color(0xFF065F46)
                            : const Color(0xFF92400E),
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Session Key Pill with Copy Action
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.keyRound,
                    size: 13, color: Color(0xFF64748B)),
                const SizedBox(width: 8),
                const Text(
                  'Key: ',
                  style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                ),
                Text(
                  drive.sessionCode,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: 0.5,
                  ),
                ),
                const Spacer(),
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => _copySessionCode(drive.sessionCode),
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3.5),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.copy,
                              size: 11, color: Color(0xFF2563EB)),
                          SizedBox(width: 4),
                          Text(
                            'Copy',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF2563EB),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Telemetry Row: 5 Clean Metrics
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildDriveMetric('Questions', '${drive.questions.length} Qs'),
                _buildMetricDivider(),
                _buildDriveMetric('Duration', '${drive.durationMinutes}m'),
                _buildMetricDivider(),
                _buildDriveMetric('Passing', '${drive.passingScore}%'),
                _buildMetricDivider(),
                _buildDriveMetric('Evaluated', '${stats.completed}'),
                _buildMetricDivider(),
                _buildDriveMetric('Avg Score', '${stats.avgScore}%'),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Action Shortcuts
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF334155),
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    setState(() => _selectedDriveForQuestions = drive);
                    _tabController.animateTo(1);
                  },
                  icon: const Icon(LucideIcons.listPlus, size: 14),
                  label: const Text(
                    'Questions',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    setState(() => _selectedDriveForSubmissions = drive);
                    _loadSubmissions(drive.id);
                    _tabController.animateTo(2);
                  },
                  icon: const Icon(LucideIcons.award, size: 14),
                  label: const Text(
                    'Submissions',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
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

  Widget _buildDriveMetric(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 9.5,
            color: Color(0xFF64748B),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  Widget _buildMetricDivider() {
    return Container(
      width: 1,
      height: 18,
      color: const Color(0xFFE2E8F0),
    );
  }

  // ─── TAB 2: QUESTION STUDIO ───────────────────────────────────────────────

  Widget _buildQuestionStudioTab() {
    final activeDrive = _selectedDriveForQuestions ??
        (_drives.isNotEmpty ? _drives.first : null);

    if (activeDrive == null) {
      return SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
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
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFDBEAFE), width: 2),
                ),
                child: const Center(
                  child: Icon(LucideIcons.helpCircle,
                      size: 26, color: Color(0xFF2563EB)),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'No Test Drive Selected',
                style: TextStyle(
                  fontSize: 16.5,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Question banks belong to a specific assessment drive. Create or choose a drive to author challenges.',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 18),
              ElevatedButton.icon(
                onPressed: () => _showCreateDriveModal(),
                icon: const Icon(LucideIcons.plus, size: 16),
                label: const Text(
                  'Create Assessment Drive',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 18, vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final filteredQuestions = activeDrive.questions.where((q) {
      if (_selectedCategory != 'All' && q.category != _selectedCategory) {
        return false;
      }
      return true;
    }).toList();

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drive Selector Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.folder,
                    size: 16, color: Color(0xFF2563EB)),
                const SizedBox(width: 8),
                const Text(
                  'Active Test: ',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                  ),
                ),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: activeDrive.id,
                      isExpanded: true,
                      items: _drives.map((d) {
                        return DropdownMenuItem(
                          value: d.id,
                          child: Text(
                            d.title,
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        );
                      }).toList(),
                      onChanged: (v) {
                        if (v != null) {
                          setState(() {
                            _selectedDriveForQuestions =
                                _drives.firstWhere((d) => d.id == v);
                          });
                        }
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Action Buttons: Visual Builder + Bulk Uploader
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _showAddQuestionModal,
                  icon: const Icon(LucideIcons.plus, size: 14),
                  label: const Text(
                    'Add Question',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.1),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF2563EB)),
                    foregroundColor: const Color(0xFF2563EB),
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _showBulkUploadModal,
                  icon: const Icon(LucideIcons.uploadCloud, size: 14),
                  label: const Text(
                    'Bulk JSON Import',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.1),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Category Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: _categories.map((c) {
                final isSelected = _selectedCategory == c;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => setState(() => _selectedCategory = c),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? const Color(0xFF2563EB)
                              : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected
                                ? const Color(0xFF2563EB)
                                : const Color(0xFFE2E8F0),
                          ),
                        ),
                        child: Text(
                          c,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: isSelected
                                ? FontWeight.w700
                                : FontWeight.w500,
                            color: isSelected
                                ? Colors.white
                                : const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 14),

          // Question Count Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${filteredQuestions.length} Questions in Repository',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.2,
                ),
              ),
              Text(
                'Target: ${activeDrive.questions.length} Total',
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          if (filteredQuestions.isEmpty)
            Container(
              width: double.infinity,
              padding:
                  const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
              ),
              child: const Column(
                children: [
                  Icon(LucideIcons.helpCircle,
                      size: 32, color: Color(0xFF94A3B8)),
                  SizedBox(height: 10),
                  Text(
                    'No Questions Found',
                    style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A)),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Use "Add Question" or "Bulk JSON Import" above to add items.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            )
          else
            ...filteredQuestions.asMap().entries.map((entry) {
              final idx = entry.key;
              final q = entry.value;
              return _buildQuestionCard(activeDrive.id, idx + 1, q);
            }),
        ],
      ),
    );
  }

  Widget _buildQuestionCard(
      String driveId, int number, AssessmentQuestion q) {
    Color diffColor = const Color(0xFF10B981);
    if (q.difficulty.toLowerCase().contains('senior') ||
        q.difficulty.toLowerCase().contains('hard')) {
      diffColor = const Color(0xFFEF4444);
    } else if (q.difficulty.toLowerCase().contains('mid') ||
        q.difficulty.toLowerCase().contains('medium')) {
      diffColor = const Color(0xFFF59E0B);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.015),
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
                padding:
                    const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Q$number',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF2563EB),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  q.category.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF475569),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                decoration: BoxDecoration(
                  color: diffColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  q.difficulty.toUpperCase(),
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: diffColor,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${q.points} PTS',
                  style: const TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF64748B),
                  ),
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(LucideIcons.trash2,
                    size: 15, color: Color(0xFFEF4444)),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () async {
                  final messenger = ScaffoldMessenger.of(context);
                  final ok =
                      await _api.deleteQuestionFromDrive(driveId, q.id);
                  if (ok) {
                    messenger.showSnackBar(
                      const SnackBar(
                        content: Text('Question removed from repository.'),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                    _loadDrives();
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Question Text
          Text(
            q.questionText,
            style: const TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
              height: 1.35,
            ),
          ),

          // Code Snippet if present
          if (q.codeSnippet != null && q.codeSnippet!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                q.codeSnippet!,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: Color(0xFF38BDF8),
                ),
              ),
            ),
          ],
          const SizedBox(height: 10),

          // Options List
          ...q.options.asMap().entries.map((optEntry) {
            final optIdx = optEntry.key;
            final optText = optEntry.value;
            final isCorrect = q.correctOptionIndex == optIdx;

            return Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 7.5),
              decoration: BoxDecoration(
                color: isCorrect
                    ? const Color(0xFFECFDF5)
                    : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isCorrect
                      ? const Color(0xFF6EE7B7)
                      : const Color(0xFFF1F5F9),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    isCorrect
                        ? LucideIcons.checkCircle2
                        : LucideIcons.circle,
                    size: 14,
                    color: isCorrect
                        ? const Color(0xFF059669)
                        : const Color(0xFF94A3B8),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      optText,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight:
                            isCorrect ? FontWeight.w700 : FontWeight.w500,
                        color: isCorrect
                            ? const Color(0xFF065F46)
                            : const Color(0xFF334155),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  // ─── TAB 3: SCORECARDS & TELEMETRY ────────────────────────────────────────

  Widget _buildScorecardsTab() {
    final activeDrive = _selectedDriveForSubmissions ??
        (_drives.isNotEmpty ? _drives.first : null);

    final totalSubmissions = _submissions.length;
    final passedSubmissions = _submissions.where((s) => s.passed).length;
    final passRate = totalSubmissions > 0
        ? ((passedSubmissions / totalSubmissions) * 100).toInt()
        : 0;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drive Dropdown Bar
          if (_drives.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.fileCheck2,
                      size: 16, color: Color(0xFF2563EB)),
                  const SizedBox(width: 8),
                  const Text(
                    'Drive Filter: ',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  Expanded(
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: activeDrive?.id,
                        isExpanded: true,
                        items: _drives.map((d) {
                          return DropdownMenuItem(
                            value: d.id,
                            child: Text(
                              d.title,
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          );
                        }).toList(),
                        onChanged: (v) {
                          if (v != null) {
                            setState(() {
                              _selectedDriveForSubmissions =
                                  _drives.firstWhere((d) => d.id == v);
                            });
                            _loadSubmissions(v);
                          }
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 10),

          // Executive Results Overview Strip
          if (totalSubmissions > 0)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Cohort Pass Rate',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        '$passRate% ($passedSubmissions of $totalSubmissions Passed)',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: passRate >= (activeDrive?.passingScore ?? 70)
                              ? const Color(0xFF10B981)
                              : const Color(0xFFF59E0B),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: totalSubmissions > 0
                          ? passedSubmissions / totalSubmissions
                          : 0,
                      minHeight: 6,
                      backgroundColor: const Color(0xFFF1F5F9),
                      valueColor: AlwaysStoppedAnimation<Color>(
                        passRate >= (activeDrive?.passingScore ?? 70)
                            ? const Color(0xFF10B981)
                            : const Color(0xFFF59E0B),
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Count & Cutoff Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${_submissions.length} Candidate Submissions',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.2,
                ),
              ),
              if (activeDrive != null)
                Text(
                  'Cutoff: ${activeDrive.passingScore}%',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF2563EB),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),

          if (_isLoadingSubmissions)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 50),
              child: Center(
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: Color(0xFF2563EB),
                ),
              ),
            )
          else if (_submissions.isEmpty)
            Container(
              width: double.infinity,
              padding:
                  const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
              ),
              child: Column(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      shape: BoxShape.circle,
                      border:
                          Border.all(color: const Color(0xFFDBEAFE), width: 2),
                    ),
                    child: const Center(
                      child: Icon(LucideIcons.award,
                          size: 26, color: Color(0xFF2563EB)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'No Evaluation Submissions Yet',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'When candidates complete assessments with their session key, their automated scorecards and proctoring logs will appear here.',
                    style: TextStyle(
                        fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            )
          else
            ..._submissions.map((sub) => _buildScorecardItem(sub)),
        ],
      ),
    );
  }

  Widget _buildScorecardItem(CandidateSession sub) {
    final isPassed = sub.passed;
    final initials = sub.candidateName
        .split(' ')
        .map((s) => s.isNotEmpty ? s[0] : '')
        .take(2)
        .join()
        .toUpperCase();
    final mins = sub.timeSpentSeconds ~/ 60;
    final secs = sub.timeSpentSeconds % 60;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.015),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: isPassed
                ? const Color(0xFFECFDF5)
                : const Color(0xFFFEE2E2),
            child: Text(
              initials,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                color: isPassed
                    ? const Color(0xFF065F46)
                    : const Color(0xFFDC2626),
                fontSize: 12.5,
              ),
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
                      sub.candidateName,
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2.5),
                      decoration: BoxDecoration(
                        color: isPassed
                            ? const Color(0xFFECFDF5)
                            : const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        isPassed ? 'PASSED' : 'NOT PASSED',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: isPassed
                              ? const Color(0xFF065F46)
                              : const Color(0xFFDC2626),
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  sub.candidateEmail,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(
                      'Score: ${sub.percentage}% (${sub.score}/${sub.totalPoints} pts)',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: isPassed
                            ? const Color(0xFF10B981)
                            : const Color(0xFFEF4444),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Time: ${mins}m ${secs}s',
                      style: const TextStyle(
                          fontSize: 11, color: Color(0xFF94A3B8)),
                    ),
                    const Spacer(),
                    if (sub.tabSwitchCount > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          children: [
                            const Icon(LucideIcons.alertTriangle,
                                size: 10, color: Color(0xFFB45309)),
                            const SizedBox(width: 3),
                            Text(
                              '${sub.tabSwitchCount} switches',
                              style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFFB45309),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      const Row(
                        children: [
                          Icon(LucideIcons.shieldCheck,
                              size: 11, color: Color(0xFF10B981)),
                          SizedBox(width: 3),
                          Text(
                            'Proctored',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF10B981),
                            ),
                          ),
                        ],
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
}
