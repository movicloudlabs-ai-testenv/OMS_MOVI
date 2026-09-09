import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../theme/app_colors.dart';
import '../../../../theme/app_typography.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../models/intern_item.dart';
import '../../data/hr_api.dart';

class HrInternLmsHubScreen extends StatefulWidget {
  const HrInternLmsHubScreen({super.key});

  @override
  State<HrInternLmsHubScreen> createState() => _HrInternLmsHubScreenState();
}

class _HrInternLmsHubScreenState extends State<HrInternLmsHubScreen> with SingleTickerProviderStateMixin {
  final HrApi _api = HrApi();
  late TabController _tabController;

  bool _loading = false;
  List<InternItem> _interns = [];
  List<EligibleMentorItem> _mentors = [];

  // Active filters
  String _selectedDomain = 'All';
  String _mentorFilter = 'All'; // 'All', 'Assigned', 'Unassigned'
  String _searchQuery = '';

  // Tab 2 & 3: Selected Intern for detail/rating/LMS
  InternItem? _selectedInternForDetail;
  List<InternLearningResource> _selectedInternLearning = [];
  bool _loadingLearning = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging && mounted) {
        setState(() {});
      }
    });
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final internList = await _api.getInterns();
      final mentorList = await _api.getEligibleMentors();

      if (mounted) {
        setState(() {
          _interns = internList;
          _mentors = mentorList;
          if (_selectedInternForDetail == null && internList.isNotEmpty) {
            _selectedInternForDetail = internList.first;
            _loadLearningForSelected();
          }
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadLearningForSelected() async {
    if (_selectedInternForDetail == null) return;
    setState(() => _loadingLearning = true);
    try {
      final resources = await _api.getInternLearningResources(_selectedInternForDetail!.id);
      if (mounted) {
        setState(() => _selectedInternLearning = resources);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingLearning = false);
    }
  }

  void _openAssignMentorModal(InternItem intern) {
    HapticFeedback.selectionClick();
    String? chosenMentorId = intern.mentorId;
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Container(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
          ),
          decoration: const BoxDecoration(
            color: AppColors.darkSurface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: AppColors.darkBorder, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.purple.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(LucideIcons.userCheck, size: 20, color: Colors.purpleAccent),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Assign Senior Mentor', style: AppTypography.headingLg(color: AppColors.darkText)),
                        Text('Mentee: ${intern.name} (${intern.domain})', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text('SELECT ELIGIBLE MENTOR', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
              const SizedBox(height: 8),

              if (_mentors.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('No eligible mentors found in engineering/product roster', style: TextStyle(color: AppColors.darkTextMuted)),
                )
              else
                Container(
                  constraints: const BoxConstraints(maxHeight: 280),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _mentors.length,
                    separatorBuilder: (context, index) => const Divider(height: 1, color: AppColors.darkBorder),
                    itemBuilder: (_, idx) {
                      final m = _mentors[idx];
                      final isSelected = chosenMentorId == m.id;
                      return ListTile(
                        dense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        leading: CircleAvatar(
                          radius: 16,
                          backgroundColor: AppColors.primaryLight.withOpacity(0.15),
                          child: Text(
                            m.name.isNotEmpty ? m.name[0].toUpperCase() : '?',
                            style: const TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),
                        title: Text(m.name, style: AppTypography.bodyMd(color: AppColors.darkText).copyWith(fontWeight: FontWeight.w600)),
                        subtitle: Text('${m.designation} • ${m.department}', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                        trailing: isSelected
                            ? const Icon(LucideIcons.checkCircle2, color: AppColors.success, size: 20)
                            : null,
                        onTap: () => setModalState(() => chosenMentorId = m.id),
                      );
                    },
                  ),
                ),

              const SizedBox(height: 20),
              CustomButton(
                text: 'Confirm Mentor Assignment',
                isLoading: isSaving,
                icon: const Icon(LucideIcons.check, size: 18, color: Colors.white),
                onPressed: chosenMentorId == null
                    ? null
                    : () async {
                        setModalState(() => isSaving = true);
                        final ok = await _api.assignMentor(intern.id, chosenMentorId!);
                        setModalState(() => isSaving = false);

                        if (ok) {
                          if (modalCtx.mounted) Navigator.pop(modalCtx);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Mentor assigned successfully')),
                            );
                            _loadData();
                          }
                        }
                      },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openConvertInternModal(InternItem intern) {
    HapticFeedback.mediumImpact();
    final roleCtrl = TextEditingController(text: 'Junior Software Engineer');
    final deptCtrl = TextEditingController(text: intern.departmentName ?? 'Engineering');
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Container(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
          ),
          decoration: const BoxDecoration(
            color: AppColors.darkSurface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: AppColors.darkBorder, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.success.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(LucideIcons.award, size: 20, color: AppColors.success),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Convert to Full-Time Employee', style: AppTypography.headingLg(color: AppColors.darkText)),
                        Text('Candidate: ${intern.name}', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Converting an intern permanently transitions their account to regular full-time staff, enabling employee workflows and perks.',
                style: AppTypography.bodySm(color: AppColors.darkTextMuted),
              ),
              const SizedBox(height: 16),

              Text('APPOINTMENT DESIGNATION', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
              const SizedBox(height: 6),
              TextField(
                controller: roleCtrl,
                style: AppTypography.bodyMd(color: AppColors.darkText),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: AppColors.darkBg,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                ),
              ),
              const SizedBox(height: 14),

              Text('DEPARTMENT', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
              const SizedBox(height: 6),
              TextField(
                controller: deptCtrl,
                style: AppTypography.bodyMd(color: AppColors.darkText),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: AppColors.darkBg,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                ),
              ),
              const SizedBox(height: 20),

              CustomButton(
                text: 'Confirm & Issue Full-Time Appointment',
                isLoading: isSaving,
                icon: const Icon(LucideIcons.checkCheck, size: 18, color: Colors.white),
                onPressed: () async {
                  setModalState(() => isSaving = true);
                  final ok = await _api.convertInternToFullTime(
                    intern.id,
                    designation: roleCtrl.text.trim(),
                    department: deptCtrl.text.trim(),
                  );
                  setModalState(() => isSaving = false);

                  if (ok) {
                    if (modalCtx.mounted) Navigator.pop(modalCtx);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('${intern.name} successfully converted to Full-time!')),
                      );
                      _loadData();
                    }
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openAddWeeklyRatingModal(InternItem intern) {
    HapticFeedback.selectionClick();
    int selectedWeek = intern.performanceRatings.length + 1;
    if (selectedWeek > 12) selectedWeek = 12;
    int selectedRating = 5;
    final noteCtrl = TextEditingController();
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Container(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
          ),
          decoration: const BoxDecoration(
            color: AppColors.darkSurface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
                    decoration: BoxDecoration(color: AppColors.darkBorder, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.amber.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(LucideIcons.star, size: 20, color: Colors.amber),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Weekly Performance Rating', style: AppTypography.headingLg(color: AppColors.darkText)),
                          Text('Intern: ${intern.name} (${intern.domain})', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                Text('EVALUATION WEEK', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: List.generate(12, (i) {
                    final w = i + 1;
                    final isSel = selectedWeek == w;
                    return ChoiceChip(
                      label: Text('W$w'),
                      selected: isSel,
                      selectedColor: AppColors.primaryLight,
                      backgroundColor: AppColors.darkBg,
                      labelStyle: TextStyle(
                        color: isSel ? Colors.white : AppColors.darkTextMuted,
                        fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                      onSelected: (_) => setModalState(() => selectedWeek = w),
                    );
                  }),
                ),
                const SizedBox(height: 16),

                Text('SCORE (1 - 5 STARS)', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (i) {
                    final star = i + 1;
                    return IconButton(
                      icon: Icon(
                        star <= selectedRating ? LucideIcons.star : LucideIcons.star,
                        color: star <= selectedRating ? Colors.amber : AppColors.darkTextDim,
                        size: 32,
                      ),
                      onPressed: () => setModalState(() => selectedRating = star),
                    );
                  }),
                ),
                Center(
                  child: Text(
                    selectedRating == 5
                        ? '5/5 • Exceptional Performance'
                        : selectedRating == 4
                            ? '4/5 • Exceeds Expectations'
                            : selectedRating == 3
                                ? '3/5 • Meets Expectations'
                                : selectedRating == 2
                                    ? '2/5 • Needs Improvement'
                                    : '1/5 • Critical Performance Gap',
                    style: AppTypography.captionXs(color: Colors.amber).copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 16),

                Text('MENTOR / HR FEEDBACK & NOTES', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                const SizedBox(height: 6),
                TextField(
                  controller: noteCtrl,
                  maxLines: 3,
                  style: AppTypography.bodyMd(color: AppColors.darkText),
                  decoration: InputDecoration(
                    hintText: 'e.g. Completed sprint tickets ahead of schedule, strong understanding of Flutter Riverpod architecture...',
                    hintStyle: AppTypography.bodySm(color: AppColors.darkTextDim),
                    filled: true,
                    fillColor: AppColors.darkBg,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                  ),
                ),
                const SizedBox(height: 20),

                CustomButton(
                  text: 'Submit Week $selectedWeek Rating',
                  isLoading: isSaving,
                  icon: const Icon(LucideIcons.check, size: 18, color: Colors.white),
                  onPressed: () async {
                    setModalState(() => isSaving = true);
                    final ok = await _api.addInternPerformanceRating(
                      intern.id,
                      week: selectedWeek,
                      rating: selectedRating,
                      note: noteCtrl.text.trim().isNotEmpty ? noteCtrl.text.trim() : 'Weekly rating logged.',
                    );
                    setModalState(() => isSaving = false);

                    if (ok) {
                      if (modalCtx.mounted) Navigator.pop(modalCtx);
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Week $selectedWeek rating saved for ${intern.name}')),
                        );
                        _loadData();
                      }
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openAssignLearningModal(InternItem intern) {
    HapticFeedback.selectionClick();
    final titleCtrl = TextEditingController();
    final urlCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String type = 'Course';
    int minutes = 60;
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Container(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
          ),
          decoration: const BoxDecoration(
            color: AppColors.darkSurface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
                    decoration: BoxDecoration(color: AppColors.darkBorder, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.info.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(LucideIcons.bookOpen, size: 20, color: AppColors.info),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Assign Learning & KT Resource', style: AppTypography.headingLg(color: AppColors.darkText)),
                          Text('Assignee: ${intern.name}', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                Text('RESOURCE TITLE *', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                const SizedBox(height: 6),
                TextField(
                  controller: titleCtrl,
                  style: AppTypography.bodyMd(color: AppColors.darkText),
                  decoration: InputDecoration(
                    hintText: 'e.g. Microservices Architecture Deep Dive',
                    hintStyle: AppTypography.bodySm(color: AppColors.darkTextDim),
                    filled: true,
                    fillColor: AppColors.darkBg,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                  ),
                ),
                const SizedBox(height: 14),

                Text('RESOURCE TYPE', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  children: ['Course', 'Video', 'Document', 'Link'].map((t) {
                    final isSel = type == t;
                    return ChoiceChip(
                      label: Text(t),
                      selected: isSel,
                      selectedColor: AppColors.primaryLight,
                      backgroundColor: AppColors.darkBg,
                      labelStyle: TextStyle(
                        color: isSel ? Colors.white : AppColors.darkTextMuted,
                        fontSize: 12,
                      ),
                      onSelected: (_) => setModalState(() => type = t),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),

                Text('RESOURCE URL / DOCUMENT LINK', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                const SizedBox(height: 6),
                TextField(
                  controller: urlCtrl,
                  style: AppTypography.bodyMd(color: AppColors.darkText),
                  decoration: InputDecoration(
                    hintText: 'https://learning.internal.company/course/101',
                    hintStyle: AppTypography.bodySm(color: AppColors.darkTextDim),
                    filled: true,
                    fillColor: AppColors.darkBg,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                  ),
                ),
                const SizedBox(height: 14),

                Text('ESTIMATED DURATION (MINUTES)', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                const SizedBox(height: 6),
                Row(
                  children: [30, 60, 90, 120, 180].map((m) {
                    final isSel = minutes == m;
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: Text('${m}m'),
                        selected: isSel,
                        selectedColor: AppColors.primaryLight,
                        backgroundColor: AppColors.darkBg,
                        labelStyle: TextStyle(
                          color: isSel ? Colors.white : AppColors.darkTextMuted,
                          fontSize: 12,
                        ),
                        onSelected: (_) => setModalState(() => minutes = m),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),

                Text('DESCRIPTION & OBJECTIVES', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                const SizedBox(height: 6),
                TextField(
                  controller: descCtrl,
                  maxLines: 2,
                  style: AppTypography.bodyMd(color: AppColors.darkText),
                  decoration: InputDecoration(
                    hintText: 'Key concepts to master and expected takeaways...',
                    hintStyle: AppTypography.bodySm(color: AppColors.darkTextDim),
                    filled: true,
                    fillColor: AppColors.darkBg,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.darkBorder)),
                  ),
                ),
                const SizedBox(height: 20),

                CustomButton(
                  text: 'Assign Learning Module',
                  isLoading: isSaving,
                  icon: const Icon(LucideIcons.send, size: 18, color: Colors.white),
                  onPressed: () async {
                    final title = titleCtrl.text.trim();
                    if (title.isEmpty) {
                      ScaffoldMessenger.of(modalCtx).showSnackBar(
                        const SnackBar(content: Text('Please provide a resource title')),
                      );
                      return;
                    }

                    setModalState(() => isSaving = true);
                    final ok = await _api.assignLearningResource(intern.id, {
                      'title': title,
                      'type': type,
                      'url': urlCtrl.text.trim(),
                      'description': descCtrl.text.trim(),
                      'estimatedMinutes': minutes,
                      'dueDate': DateTime.now().add(const Duration(days: 7)).toIso8601String(),
                    });
                    setModalState(() => isSaving = false);

                    if (ok) {
                      if (modalCtx.mounted) Navigator.pop(modalCtx);
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Module "$title" assigned to ${intern.name}')),
                        );
                        _loadLearningForSelected();
                      }
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        backgroundColor: AppColors.darkSurface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: AppColors.darkText),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Intern Mentorship & LMS Studio', style: AppTypography.headingLg(color: AppColors.darkText)),
            Text('Talent Incubation, Ratings & KT Curriculum', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18, color: AppColors.darkTextMuted),
            tooltip: 'Refresh',
            onPressed: _loadData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.purpleAccent,
          indicatorWeight: 3,
          labelColor: Colors.purpleAccent,
          unselectedLabelColor: AppColors.darkTextMuted,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: [
            Tab(icon: const Icon(LucideIcons.users, size: 16), text: 'Cohort (${_interns.length})'),
            const Tab(icon: Icon(LucideIcons.star, size: 16), text: 'Weekly Ratings'),
            const Tab(icon: Icon(LucideIcons.bookOpen, size: 16), text: 'LMS & KT'),
          ],
        ),
      ),
      body: _loading && _interns.isEmpty
          ? const Center(child: CircularProgressIndicator(color: Colors.purpleAccent))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildCohortTab(),
                _buildRatingsTab(),
                _buildLmsTab(),
              ],
            ),
    );
  }

  // ─── TAB 1: COHORT & MENTORSHIP ROSTER ─────────────────────────────────────

  Widget _buildCohortTab() {
    final assignedCount = _interns.where((i) => i.mentorId != null).length;
    final coveragePct = _interns.isNotEmpty ? ((assignedCount / _interns.length) * 100).round() : 0;

    final filtered = _interns.where((item) {
      if (_selectedDomain != 'All' && item.domain.toLowerCase() != _selectedDomain.toLowerCase()) {
        return false;
      }
      if (_mentorFilter == 'Assigned' && item.mentorId == null) return false;
      if (_mentorFilter == 'Unassigned' && item.mentorId != null) return false;
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final match = item.name.toLowerCase().contains(q) ||
            item.college.toLowerCase().contains(q) ||
            item.batch.toLowerCase().contains(q) ||
            item.domain.toLowerCase().contains(q);
        if (!match) return false;
      }
      return true;
    }).toList();

    return RefreshIndicator(
      onRefresh: _loadData,
      color: Colors.purpleAccent,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Cohort Metric Banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.purple.withOpacity(0.3),
                  AppColors.darkSurface,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.purpleAccent.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildCohortMetric('Total Interns', '${_interns.length}', Colors.purpleAccent),
                _buildCohortMetric('Mentored', '$assignedCount', AppColors.success),
                _buildCohortMetric('Coverage', '$coveragePct%', AppColors.info),
                _buildCohortMetric('Unassigned', '${_interns.length - assignedCount}', AppColors.warning),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Search Field
          TextField(
            style: AppTypography.bodyMd(color: AppColors.darkText),
            decoration: InputDecoration(
              hintText: 'Search intern name, university, domain...',
              hintStyle: AppTypography.bodySm(color: AppColors.darkTextDim),
              prefixIcon: const Icon(LucideIcons.search, size: 18, color: AppColors.darkTextDim),
              filled: true,
              fillColor: AppColors.darkSurface,
              contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.darkBorder)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.darkBorder)),
            ),
            onChanged: (v) => setState(() => _searchQuery = v.trim()),
          ),
          const SizedBox(height: 12),

          // Domain Filter Pills
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: ['All', 'Frontend', 'Backend', 'Mobile', 'UI/UX', 'Fullstack'].map((d) {
                final isSel = _selectedDomain == d;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(d),
                    selected: isSel,
                    selectedColor: Colors.purpleAccent,
                    backgroundColor: AppColors.darkSurface,
                    labelStyle: TextStyle(
                      color: isSel ? Colors.white : AppColors.darkTextMuted,
                      fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                    ),
                    onSelected: (_) => setState(() => _selectedDomain = d),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),

          // Mentorship Status Filter
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: ['All', 'Assigned', 'Unassigned'].map((st) {
                final isSel = _mentorFilter == st;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(st == 'All' ? 'All Mentorship' : st),
                    selected: isSel,
                    selectedColor: AppColors.primaryDark,
                    backgroundColor: AppColors.darkSurface,
                    labelStyle: TextStyle(
                      color: isSel ? Colors.white : AppColors.darkTextMuted,
                      fontSize: 11,
                    ),
                    onSelected: (_) => setState(() => _mentorFilter = st),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),

          // Cards list
          if (filtered.isEmpty)
            const CustomCard(
              padding: EdgeInsets.all(32),
              child: Center(
                child: Text('No intern students match the active criteria', style: TextStyle(color: AppColors.darkTextMuted)),
              ),
            )
          else
            ...filtered.map((intern) => _buildInternCard(intern)),
        ],
      ),
    );
  }

  Widget _buildCohortMetric(String label, String val, Color color) {
    return Column(
      children: [
        Text(val, style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.w900)),
        const SizedBox(height: 2),
        Text(label, style: AppTypography.captionXs(color: AppColors.darkTextDim)),
      ],
    );
  }

  Widget _buildInternCard(InternItem intern) {
    final hasMentor = intern.mentorId != null;

    return CustomCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: Colors.purple.withOpacity(0.18),
                child: Text(
                  intern.name.isNotEmpty ? intern.name[0].toUpperCase() : '?',
                  style: const TextStyle(color: Colors.purpleAccent, fontWeight: FontWeight.bold),
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
                            intern.name,
                            style: AppTypography.bodyMd(color: AppColors.darkText).copyWith(fontWeight: FontWeight.bold),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(color: Colors.purple.withOpacity(0.15), borderRadius: BorderRadius.circular(4)),
                          child: Text(intern.batch, style: const TextStyle(color: Colors.purpleAccent, fontSize: 9, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${intern.college} • ${intern.domain}',
                      style: AppTypography.captionXs(color: AppColors.darkTextDim),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              StatusBadge(label: intern.status, variant: intern.status.toLowerCase()),
            ],
          ),
          const SizedBox(height: 12),

          // Mentor & Stats strip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.darkBg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      hasMentor ? LucideIcons.userCheck : LucideIcons.alertTriangle,
                      size: 13,
                      color: hasMentor ? AppColors.success : AppColors.warning,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      hasMentor ? 'Mentor: ${intern.mentorName}' : 'Mentor: Unassigned',
                      style: AppTypography.captionXs(color: hasMentor ? AppColors.darkTextMuted : AppColors.warning),
                    ),
                  ],
                ),
                Row(
                  children: [
                    const Icon(LucideIcons.star, size: 12, color: Colors.amber),
                    const SizedBox(width: 4),
                    Text(
                      '${intern.averageRating} ★ (${intern.performanceRatings.length})',
                      style: AppTypography.captionXs(color: AppColors.darkText).copyWith(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.purpleAccent,
                    side: const BorderSide(color: Colors.purpleAccent),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(LucideIcons.userPlus, size: 14),
                  label: Text(hasMentor ? 'Reassign' : 'Assign Mentor', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  onPressed: () => _openAssignMentorModal(intern),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.amber,
                    side: const BorderSide(color: Colors.amber),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(LucideIcons.star, size: 14),
                  label: const Text('Rate Week', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  onPressed: () {
                    setState(() => _selectedInternForDetail = intern);
                    _openAddWeeklyRatingModal(intern);
                  },
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.success.withOpacity(0.12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(LucideIcons.award, size: 16, color: AppColors.success),
                tooltip: 'Convert to Full-Time',
                onPressed: () => _openConvertInternModal(intern),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── TAB 2: WEEKLY PERFORMANCE SCORECARDS ─────────────────────────────────

  Widget _buildRatingsTab() {
    if (_interns.isEmpty) {
      return const Center(child: Text('No intern records found', style: TextStyle(color: AppColors.darkTextMuted)));
    }

    final selected = _selectedInternForDetail ?? _interns.first;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Intern Picker Strip
        Text('SELECT INTERN', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: _interns.map((intern) {
              final isSel = intern.id == selected.id;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(intern.name),
                  selected: isSel,
                  selectedColor: Colors.purpleAccent,
                  backgroundColor: AppColors.darkSurface,
                  labelStyle: TextStyle(
                    color: isSel ? Colors.white : AppColors.darkTextMuted,
                    fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                    fontSize: 12,
                  ),
                  onSelected: (_) {
                    setState(() => _selectedInternForDetail = intern);
                    _loadLearningForSelected();
                  },
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),

        // Selected Intern Summary Card
        CustomCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(selected.name, style: AppTypography.headingLg(color: AppColors.darkText)),
                      Text('${selected.domain} • ${selected.college}', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
                    ],
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.amber,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                    icon: const Icon(LucideIcons.plus, size: 14),
                    label: const Text('Add Rating', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    onPressed: () => _openAddWeeklyRatingModal(selected),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildCohortMetric('Average', '${selected.averageRating} ★', Colors.amber),
                  _buildCohortMetric('Evaluations', '${selected.performanceRatings.length}/12', Colors.purpleAccent),
                  _buildCohortMetric('Mentor', selected.mentorName ?? 'None', AppColors.primaryLight),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        Text('Weekly Scorecards Log', style: AppTypography.headingLg(color: AppColors.darkText)),
        const SizedBox(height: 10),

        if (selected.performanceRatings.isEmpty)
          CustomCard(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: Column(
                children: [
                  const Icon(LucideIcons.star, size: 32, color: AppColors.darkTextDim),
                  const SizedBox(height: 8),
                  Text('No weekly ratings logged yet', style: AppTypography.bodyMd(color: AppColors.darkTextMuted)),
                  const SizedBox(height: 4),
                  Text('Tap "Add Rating" above to submit this week\'s evaluation.', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                ],
              ),
            ),
          )
        else
          ...selected.performanceRatings.map((r) => _buildRatingCard(r)),
      ],
    );
  }

  Widget _buildRatingCard(InternPerformanceRating rating) {
    return CustomCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.purple.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'WEEK ${rating.week}',
                  style: const TextStyle(color: Colors.purpleAccent, fontWeight: FontWeight.bold, fontSize: 11),
                ),
              ),
              Row(
                children: List.generate(5, (i) {
                  return Icon(
                    LucideIcons.star,
                    size: 14,
                    color: i < rating.rating ? Colors.amber : AppColors.darkTextDim,
                  );
                }),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '"${rating.note}"',
            style: AppTypography.bodySm(color: AppColors.darkText).copyWith(fontStyle: FontStyle.italic),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Source: ${rating.source.toUpperCase()}',
                style: AppTypography.captionXs(color: AppColors.darkTextDim),
              ),
              if (rating.createdAt != null)
                Text(
                  rating.createdAt!.toIso8601String().split('T')[0],
                  style: AppTypography.captionXs(color: AppColors.darkTextDim),
                ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── TAB 3: LEARNING (LMS) STUDIO ─────────────────────────────────────────

  Widget _buildLmsTab() {
    if (_interns.isEmpty) {
      return const Center(child: Text('No intern records found', style: TextStyle(color: AppColors.darkTextMuted)));
    }

    final selected = _selectedInternForDetail ?? _interns.first;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Intern Picker Strip
        Text('SELECT INTERN LEARNER', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: _interns.map((intern) {
              final isSel = intern.id == selected.id;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(intern.name),
                  selected: isSel,
                  selectedColor: Colors.purpleAccent,
                  backgroundColor: AppColors.darkSurface,
                  labelStyle: TextStyle(
                    color: isSel ? Colors.white : AppColors.darkTextMuted,
                    fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                    fontSize: 12,
                  ),
                  onSelected: (_) {
                    setState(() => _selectedInternForDetail = intern);
                    _loadLearningForSelected();
                  },
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),

        // Assign Module Action Card
        CustomCard(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.info.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
                child: const Icon(LucideIcons.bookOpen, size: 22, color: AppColors.info),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Curriculum & KT Modules', style: AppTypography.headingLg(color: AppColors.darkText)),
                    Text('${_selectedInternLearning.length} modules assigned to ${selected.name}', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
                  ],
                ),
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.info,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                ),
                icon: const Icon(LucideIcons.plus, size: 14),
                label: const Text('Assign', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                onPressed: () => _openAssignLearningModal(selected),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        Text('Assigned Curriculum Tracks', style: AppTypography.headingLg(color: AppColors.darkText)),
        const SizedBox(height: 10),

        if (_loadingLearning)
          const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator(color: AppColors.info)))
        else if (_selectedInternLearning.isEmpty)
          CustomCard(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: Column(
                children: [
                  const Icon(LucideIcons.bookMarked, size: 36, color: AppColors.darkTextDim),
                  const SizedBox(height: 8),
                  Text('No learning resources assigned yet', style: AppTypography.bodyMd(color: AppColors.darkTextMuted)),
                  const SizedBox(height: 4),
                  Text('Tap "Assign" above to distribute videos, documents, or course roadmaps.', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                ],
              ),
            ),
          )
        else
          ..._selectedInternLearning.map((res) => _buildLearningResourceCard(selected, res)),
      ],
    );
  }

  Widget _buildLearningResourceCard(InternItem intern, InternLearningResource res) {
    IconData icon;
    Color color;

    switch (res.type.toLowerCase()) {
      case 'video':
        icon = LucideIcons.video;
        color = Colors.redAccent;
        break;
      case 'document':
        icon = LucideIcons.fileText;
        color = Colors.blueAccent;
        break;
      case 'course':
        icon = LucideIcons.graduationCap;
        color = Colors.purpleAccent;
        break;
      default:
        icon = LucideIcons.link;
        color = Colors.greenAccent;
        break;
    }

    return CustomCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, size: 16, color: color),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(res.title, style: AppTypography.bodyMd(color: AppColors.darkText).copyWith(fontWeight: FontWeight.bold)),
                    Row(
                      children: [
                        Text(res.type, style: AppTypography.captionXs(color: color)),
                        if (res.estimatedMinutes > 0) ...[
                          const Text(' • ', style: TextStyle(color: AppColors.darkTextDim)),
                          Text('${res.estimatedMinutes} mins', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              StatusBadge(label: res.status, variant: res.status.toLowerCase()),
              const SizedBox(width: 6),
              IconButton(
                icon: const Icon(LucideIcons.trash2, size: 16, color: AppColors.darkTextDim),
                onPressed: () async {
                  final ok = await _api.deleteLearningResource(intern.id, res.id);
                  if (ok && mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Learning resource removed')),
                    );
                    _loadLearningForSelected();
                  }
                },
              ),
            ],
          ),
          if (res.description.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(res.description, style: AppTypography.bodySm(color: AppColors.darkTextMuted)),
          ],
          if (res.url.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: AppColors.darkBg, borderRadius: BorderRadius.circular(6)),
              child: Row(
                children: [
                  const Icon(LucideIcons.externalLink, size: 12, color: AppColors.primaryLight),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      res.url,
                      style: const TextStyle(color: AppColors.primaryLight, fontSize: 11),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
