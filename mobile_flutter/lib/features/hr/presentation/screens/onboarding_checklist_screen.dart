import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../theme/theme.dart';
import '../../data/hr_api.dart';
import 'onboarding_candidate_detail_screen.dart';

class OnboardingChecklistScreen extends StatefulWidget {
  final bool showBackButton;

  const OnboardingChecklistScreen({
    super.key,
    this.showBackButton = false,
  });

  @override
  State<OnboardingChecklistScreen> createState() => _OnboardingChecklistScreenState();
}

class _OnboardingChecklistScreenState extends State<OnboardingChecklistScreen>
    with SingleTickerProviderStateMixin {
  final HrApi _api = HrApi();
  late TabController _tabController;

  List<Map<String, dynamic>> _pendingNewHires = [];
  List<Map<String, dynamic>> _completedNewHires = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _selectedDeptFilter = 'All';

  final List<String> _deptFilters = [
    'All',
    'Engineering',
    'Product & Design',
    'Human Resources',
    'Operations',
  ];

  // The official enterprise lifecycle milestone definitions (5 Phases)
  final List<Map<String, dynamic>> _masterMilestones = [
    {
      'key': 'offerLetterIssued',
      'title': 'Formal Offer Letter Issued & Acknowledged',
      'phase': 'Phase 1: Pre-boarding',
      'owner': 'Talent Acquisition',
      'desc': 'Formal appointment terms accepted with verified reporting date and role expectations.',
      'icon': LucideIcons.fileSignature,
      'color': Color(0xFF2563EB),
    },
    {
      'key': 'welcomeEmail',
      'title': 'Welcome Pack & First-Day Itinerary',
      'phase': 'Phase 1: Pre-boarding',
      'owner': 'HR Operations',
      'desc': 'Send welcome email, reporting location, schedule, and team intro.',
      'icon': LucideIcons.mail,
      'color': Color(0xFF0284C7),
    },
    {
      'key': 'hrDocumentation',
      'title': 'Employment Agreement & KYC Verification',
      'phase': 'Phase 1: Pre-boarding',
      'owner': 'HR Compliance',
      'desc': 'Collect signed NDA, identity documents (Aadhaar/PAN/Passport).',
      'icon': LucideIcons.fileCheck2,
      'color': Color(0xFF7C3AED),
    },
    {
      'key': 'equipmentAssigned',
      'title': 'Corporate Hardware & Security Allocation',
      'phase': 'Phase 2: Workstation',
      'owner': 'IT Support',
      'desc': 'Issue corporate laptop, monitor, or configure BYOD developer workstation.',
      'icon': LucideIcons.laptop,
      'color': Color(0xFF059669),
    },
    {
      'key': 'systemAccess',
      'title': 'SSO Workspace Credentials & 2FA Setup',
      'phase': 'Phase 2: Workstation',
      'owner': 'IT Infrastructure',
      'desc': 'Provision email, Slack, GitHub, VPN, and enforce 2-factor authentication.',
      'icon': LucideIcons.key,
      'color': Color(0xFF0891B2),
    },
    {
      'key': 'idCardIssued',
      'title': 'Smart Access Card & Office Keycard Badge',
      'phase': 'Phase 2: Workstation',
      'owner': 'Facilities & Security',
      'desc': 'Print biometric smart badge, or provision digital SSO entry credentials.',
      'icon': LucideIcons.creditCard,
      'color': Color(0xFFD97706),
    },
    {
      'key': 'mentorAssigned',
      'title': 'Department Orientation & Mentor Pairing',
      'phase': 'Phase 3: Immersion',
      'owner': 'Department Lead',
      'desc': 'Introduce new hire to team, pair with senior onboarding mentor/buddy.',
      'icon': LucideIcons.users,
      'color': Color(0xFFEA580C),
    },
    {
      'key': 'firstWeekSchedule',
      'title': 'Manager 1:1 & First-Sprint Planning',
      'phase': 'Phase 3: Immersion',
      'owner': 'Reporting Manager',
      'desc': 'Conduct Day 1 check-in, set 30-day goals and review first sprint backlog.',
      'icon': LucideIcons.calendar,
      'color': Color(0xFF4F46E5),
    },
    {
      'key': 'deptIntroduction',
      'title': 'Department Architecture & KT Completion',
      'phase': 'Phase 3: Immersion',
      'owner': 'Engineering / Dept',
      'desc': 'Review internal docs, developer handbook, and complete sandbox exercises.',
      'icon': LucideIcons.bookOpen,
      'color': Color(0xFF0D9488),
    },
    {
      'key': 'intervalReviewCompleted',
      'title': 'Interval Review Checkpoint (30/60-Day Review)',
      'phase': 'Phase 4: Review',
      'owner': 'Reporting Lead & Mentor',
      'desc': 'Review mid-term sprint deliverables, velocity, technical competence, and log mentor feedback.',
      'icon': LucideIcons.clipboardCheck,
      'color': Color(0xFF9333EA),
    },
    {
      'key': 'completionLetterIssued',
      'title': 'Internship Completion Letter & Certificate',
      'phase': 'Phase 5: Completion',
      'owner': 'HR Leadership',
      'desc': 'Issue official internship completion certificate with verifiable credential ID.',
      'icon': LucideIcons.award,
      'color': Color(0xFF059669),
    },
    {
      'key': 'fteConversionCompleted',
      'title': 'FTE Conversion / Alumni Transition',
      'phase': 'Phase 5: Completion',
      'owner': 'Talent Committee',
      'desc': 'Transition into full-time employment (FTE) or graduate into verified talent alumni pool.',
      'icon': LucideIcons.userCheck,
      'color': Color(0xFF2563EB),
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadOnboardingData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadOnboardingData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _api.getPendingOnboardingUsers(),
        _api.getCompletedOnboardingUsers(),
      ]);

      if (mounted) {
        setState(() {
          _pendingNewHires = results[0];
          _completedNewHires = results[1];
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<Map<String, dynamic>> get _filteredPendingHires {
    return _pendingNewHires.where((hire) {
      final name = (hire['name'] ?? '').toString().toLowerCase();
      final empId = (hire['employeeId'] ?? '').toString().toLowerCase();
      final dept = (hire['department'] is Map ? hire['department']['name'] : '').toString();

      final matchesQuery = _searchQuery.isEmpty ||
          name.contains(_searchQuery.toLowerCase()) ||
          empId.contains(_searchQuery.toLowerCase()) ||
          dept.toLowerCase().contains(_searchQuery.toLowerCase());

      final matchesDept = _selectedDeptFilter == 'All' ||
          dept.toLowerCase().contains(_selectedDeptFilter.toLowerCase());

      return matchesQuery && matchesDept;
    }).toList();
  }

  Color _getPhaseColor(int progressPct) {
    if (progressPct >= 100) return const Color(0xFF10B981);
    if (progressPct >= 75) return const Color(0xFF4F46E5);
    if (progressPct >= 35) return const Color(0xFF059669);
    return const Color(0xFF2563EB);
  }

  // ─── DEDICATED NEW-HIRE ONBOARDING & BYOD SETUP SCREEN ─────────────────────
  void _showNewHireOnboardingStudio(Map<String, dynamic> hire) async {
    HapticFeedback.lightImpact();
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => OnboardingCandidateDetailScreen(candidateData: hire),
      ),
    );
    _loadOnboardingData();
  }

  // ─── MAIN BUILD ───────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar: Parent Header Matching Leave Operations Standard
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
              child: Row(
                children: [
                  if (widget.showBackButton) ...[
                    IconButton(
                      icon: const Icon(LucideIcons.arrowLeft, size: 20, color: Color(0xFF0F172A)),
                      onPressed: () => context.pop(),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(width: 12),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFA7F3D0)),
                      ),
                      child: const Icon(LucideIcons.clipboardCheck, size: 18, color: Color(0xFF059669)),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Onboarding Lifecycle Hub',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                            letterSpacing: -0.4,
                          ),
                        ),
                        Text(
                          '${_pendingNewHires.length} active new hires • 90-day assimilation',
                          style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFDBEAFE)),
                    ),
                    child: Text(
                      '${_pendingNewHires.length} IN-PROGRESS',
                      style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                    ),
                  ),
                ],
              ),
            ),

            // Tab Bar
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                labelColor: const Color(0xFF2563EB),
                unselectedLabelColor: const Color(0xFF64748B),
                labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5),
                tabs: [
                  Tab(text: 'Active Cohort (${_pendingNewHires.length})'),
                  const Tab(text: 'Master Protocol'),
                  Tab(text: 'Graduated (${_completedNewHires.length})'),
                ],
              ),
            ),

            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // ── TAB 1: ACTIVE COHORT & WORKFLOWS ────────────────────────
                  RefreshIndicator(
                    onRefresh: _loadOnboardingData,
                    color: const Color(0xFF2563EB),
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(16, 10, 16, 30),
                      children: [
                        // Onboarding Roadmap Pipeline Banner
                        _buildOnboardingPipelineBanner(),
                        const SizedBox(height: 14),

                        // Search Bar
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: TextField(
                            onChanged: (v) => setState(() => _searchQuery = v),
                            decoration: const InputDecoration(
                              hintText: 'Search new hire by name, ID or department...',
                              hintStyle: TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
                              prefixIcon: Icon(LucideIcons.search, size: 18, color: Color(0xFF94A3B8)),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Department Filter Chips
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: _deptFilters.map((dept) {
                              final isSelected = _selectedDeptFilter == dept;
                              return Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: ChoiceChip(
                                  label: Text(dept),
                                  selected: isSelected,
                                  selectedColor: const Color(0xFF2563EB),
                                  backgroundColor: Colors.white,
                                  labelStyle: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                    color: isSelected ? Colors.white : const Color(0xFF475569),
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    side: BorderSide(
                                      color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                                    ),
                                  ),
                                  onSelected: (_) => setState(() => _selectedDeptFilter = dept),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                        const SizedBox(height: 14),

                        if (_isLoading)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 40),
                            child: Center(
                              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB)),
                            ),
                          )
                        else if (_filteredPendingHires.isEmpty)
                          Container(
                            padding: const EdgeInsets.all(32),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Column(
                              children: const [
                                Icon(LucideIcons.userCheck, size: 36, color: Color(0xFF10B981)),
                                SizedBox(height: 10),
                                Text(
                                  'All Cohort Members Fully Onboarded',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'No pending new joiners require active onboarding milestones right now.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                ),
                              ],
                            ),
                          )
                        else
                          ..._filteredPendingHires.map((hire) => _buildCohortCard(hire)),
                      ],
                    ),
                  ),

                  // ── TAB 2: MASTER PROTOCOL (Fixed Overflow) ────────────────
                  SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Progress Overview Card (Safe layout - never overflows)
                        Container(
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
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Expanded(
                                    child: Text(
                                      'Standard Onboarding Protocol',
                                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEFF6FF),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '${_masterMilestones.length} Protocol Milestones',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Company standard compliance checklist administered for all full-time employees and interns during their full lifecycle.',
                                style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B), height: 1.3),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        Text(
                          'Enterprise Lifecycle Protocol (${_masterMilestones.length} Steps)',
                          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 10),

                        ..._masterMilestones.asMap().entries.map((entry) {
                          final idx = entry.key + 1;
                          final m = entry.value;
                          final icon = m['icon'] as IconData;
                          final iconColor = m['color'] as Color;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 28,
                                  height: 28,
                                  decoration: BoxDecoration(
                                    color: iconColor.withOpacity(0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      '$idx',
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: iconColor),
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
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFF1F5F9),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              m['owner'] as String,
                                              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              m['phase'] as String,
                                              style: const TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        m['title'] as String,
                                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        m['desc'] as String,
                                        style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), height: 1.3),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(icon, size: 18, color: iconColor),
                              ],
                            ),
                          );
                        }),
                      ],
                    ),
                  ),

                  // ── TAB 3: GRADUATED ALUMNI ────────────────────────────────
                  RefreshIndicator(
                    onRefresh: _loadOnboardingData,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
                      children: [
                        if (_completedNewHires.isEmpty)
                          Container(
                            padding: const EdgeInsets.all(32),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Column(
                              children: const [
                                Icon(LucideIcons.award, size: 36, color: Color(0xFF94A3B8)),
                                SizedBox(height: 10),
                                Text(
                                  'No Graduated Cohorts Yet',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'New joiners who complete required milestones will appear here.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                ),
                              ],
                            ),
                          )
                        else
                          ..._completedNewHires.map((hire) {
                            final name = hire['name']?.toString() ?? 'Alumnus';
                            final empId = hire['employeeId']?.toString() ?? 'EMP';
                            final dept = hire['department'] is Map ? hire['department']['name'] : 'General';
                            final role = hire['role'] is Map ? hire['role']['name'] : 'Employee';

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
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: const Color(0xFFECFDF5),
                                    child: Text(
                                      name.isNotEmpty ? name[0] : 'A',
                                      style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          name,
                                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                        ),
                                        Text(
                                          '$empId • $role • $dept',
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFECFDF5),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: const Color(0xFFA7F3D0)),
                                    ),
                                    child: const Row(
                                      children: [
                                        Icon(LucideIcons.check, size: 12, color: Color(0xFF059669)),
                                        SizedBox(width: 3),
                                        Text(
                                          '100% Onboarded',
                                          style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Visual Pipeline Roadmap Header Banner
  Widget _buildOnboardingPipelineBanner() {
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text(
                'Onboarding Flow & 4-Stage Lifecycle',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
              Icon(LucideIcons.compass, size: 16, color: Color(0xFF2563EB)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _buildPipelineStep('1. Pre-boarding', 'Day 0', true),
              const Icon(LucideIcons.chevronRight, size: 14, color: Color(0xFFCBD5E1)),
              _buildPipelineStep('2. IT Setup', 'Day 1', true),
              const Icon(LucideIcons.chevronRight, size: 14, color: Color(0xFFCBD5E1)),
              _buildPipelineStep('3. Immersion', 'Week 1', true),
              const Icon(LucideIcons.chevronRight, size: 14, color: Color(0xFFCBD5E1)),
              _buildPipelineStep('4. Graduated', 'Day 90', false),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPipelineStep(String title, String timeline, bool isDone) {
    return Expanded(
      child: Column(
        children: [
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              color: isDone ? const Color(0xFF2563EB) : const Color(0xFF94A3B8),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            timeline,
            style: const TextStyle(fontSize: 8.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  // Cohort Card in Tab 1
  Widget _buildCohortCard(Map<String, dynamic> hire) {
    final name = hire['name']?.toString() ?? 'New Joiner';
    final empId = hire['employeeId']?.toString() ?? 'EMP-NEW';
    final dept = hire['department'] is Map ? hire['department']['name'] : 'General';
    final role = hire['role'] is Map ? hire['role']['name'] : 'Staff';
    final progressPct = (hire['onboardingProgress'] as num?)?.toInt() ?? 0;
    final hrManager = hire['hrManager'] is Map ? hire['hrManager']['name'] : 'Unassigned';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showNewHireOnboardingStudio(hire),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: const Color(0xFFDBEAFE),
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'N',
                        style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF1D4ED8), fontSize: 13),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$empId • $role • $dept',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: _getPhaseColor(progressPct).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '$progressPct%',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: _getPhaseColor(progressPct),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Linear Progress Bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: (progressPct / 100.0).clamp(0.0, 1.0),
                    backgroundColor: const Color(0xFFF1F5F9),
                    valueColor: AlwaysStoppedAnimation<Color>(_getPhaseColor(progressPct)),
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 10),

                // Footer with Phase pill and "Manage" button
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(LucideIcons.userCheck, size: 13, color: Color(0xFF64748B)),
                        const SizedBox(width: 4),
                        Text(
                          'Lead: $hrManager',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    Row(
                      children: const [
                        Text(
                          'Manage Checklist',
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                        ),
                        SizedBox(width: 2),
                        Icon(LucideIcons.chevronRight, size: 14, color: Color(0xFF2563EB)),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
