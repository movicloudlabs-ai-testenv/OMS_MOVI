import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../theme/app_colors.dart';
import '../../../../theme/app_typography.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../models/task_item.dart';
import '../../../../features/auth/presentation/controllers/auth_controller.dart';
import '../../data/employee_api.dart';
import 'task_detail_screen.dart';
import '../widgets/assign_task_sheet.dart';

class TaskBoardScreen extends ConsumerStatefulWidget {
  const TaskBoardScreen({super.key});

  @override
  ConsumerState<TaskBoardScreen> createState() => _TaskBoardScreenState();
}

class _TaskBoardScreenState extends ConsumerState<TaskBoardScreen>
    with TickerProviderStateMixin {
  final EmployeeApi _api = EmployeeApi();
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  final ScrollController _scrollController = ScrollController();

  List<TaskItem> _tasks = [];
  List<ProjectMiniInfo> _projects = [];
  String _selectedFilter = 'All';
  String? _selectedProjectId;
  String _viewMode = 'team'; // 'team' (Lead oversight) or 'my' (Personal tasks)
  bool _loading = true;
  bool _loadingMore = false;
  bool _searchFocused = false;
  bool _hasMore = false;

  late AnimationController _fadeController;
  late Animation<double> _fadeAnim;
  late AnimationController _shimmerController;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _fadeAnim = CurvedAnimation(parent: _fadeController, curve: Curves.easeOut);

    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _searchFocus.addListener(() {
      setState(() => _searchFocused = _searchFocus.hasFocus);
    });

    _scrollController.addListener(_onScroll);

    _loadInitialData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    _scrollController.dispose();
    _fadeController.dispose();
    _shimmerController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_loading &&
        !_loadingMore &&
        _hasMore) {
      _loadMoreTasks();
    }
  }

  Future<void> _loadInitialData() async {
    setState(() => _loading = true);
    try {
      final projects = await _api.getMyProjects();
      if (mounted) {
        setState(() {
          _projects = projects;
          if (_projects.isNotEmpty && _selectedProjectId == null) {
            // Default to first project where user is leader, if any, else first project
            final leadProj = _projects.firstWhere(
              (p) => p.isLeader,
              orElse: () => _projects.first,
            );
            _selectedProjectId = leadProj.id;
            _viewMode = leadProj.isLeader ? 'team' : 'my';
          }
        });
      }
      await _fetchTasks(resetPage: true);
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fetchTasks({bool resetPage = false}) async {
    try {
      final tasks = await _api.getMyTasks(
        projectId: _selectedProjectId,
        scope: _viewMode,
        view: _viewMode,
      );
      if (mounted) {
        setState(() {
          _tasks = tasks;
          _loading = false;
          _hasMore = tasks.length >= 20; // Pagination threshold
        });
        _fadeController.forward(from: 0);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMoreTasks() async {
    if (_loadingMore || !_hasMore) return;
    setState(() => _loadingMore = true);
    try {
      final moreTasks = await _api.getMyTasks(
        projectId: _selectedProjectId,
        scope: _viewMode,
        view: _viewMode,
      );
      if (mounted) {
        setState(() {
          _tasks.addAll(moreTasks);
          _loadingMore = false;
          _hasMore = moreTasks.length >= 20;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _sendTaskToTesting(TaskItem task) async {
    HapticFeedback.mediumImpact();
    final ok = await _api.sendToTesting(task.id);
    if (ok) {
      _showToast('Deliverable "${task.title}" routed to QA Testing 🧪', success: true);
      _fetchTasks();
    } else {
      _showToast('Failed to route deliverable to QA', success: false);
    }
  }

  void _showToast(String msg, {required bool success}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              success ? LucideIcons.checkCircle : LucideIcons.alertCircle,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                msg,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
          ],
        ),
        backgroundColor: success ? AppThemeColors.success : AppThemeColors.danger,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _openAssignSheet() {
    HapticFeedback.lightImpact();
    ProjectMiniInfo? initialProj;
    if (_selectedProjectId != null) {
      initialProj = _projects.firstWhere(
        (p) => p.id == _selectedProjectId,
        orElse: () => _projects.isNotEmpty ? _projects.first : ProjectMiniInfo(id: '', name: '', isLeader: true),
      );
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AssignTaskSheet(
        projects: _projects,
        initialProject: initialProj,
        onTaskCreated: (newTask) {
          _showToast('Deliverable "${newTask.title}" assigned successfully', success: true);
          _fetchTasks(resetPage: true);
        },
      ),
    );
  }

  ProjectMiniInfo? get _currentProject {
    if (_selectedProjectId == null) return null;
    try {
      return _projects.firstWhere((p) => p.id == _selectedProjectId);
    } catch (_) {
      return null;
    }
  }

  /// Whether the user is the leader in the currently selected project
  bool get _isCurrentProjectLeader {
    if (_currentProject != null) return _currentProject!.isLeader;
    // In "All Projects", true if user is leader in at least one project
    return _projects.any((p) => p.isLeader);
  }

  /// Whether the user has permission to create tasks (leads at least one project)
  bool get _canCreateTask {
    return _projects.any((p) => p.isLeader) || _isCurrentProjectLeader;
  }

  String get _headerSubtitle {
    if (_selectedProjectId == null) {
      return 'Portfolio overview • ${_tasks.length} deliverables in ${_projects.length} projects';
    }
    final p = _currentProject;
    if (p == null) return 'Active deliverables view';
    return p.isLeader
        ? '${p.name} • Project Lead Mode (${_tasks.length} tasks)'
        : '${p.name} • Contributor Mode (${_tasks.length} tasks)';
  }

  List<TaskItem> get _filteredTasks {
    final query = _searchController.text.toLowerCase().trim();
    return _tasks.where((t) {
      // 1. Search Query Filter
      if (query.isNotEmpty) {
        final inTitle = t.title.toLowerCase().contains(query);
        final inDesc = (t.description ?? '').toLowerCase().contains(query);
        final inAssignee = (t.assignedToName ?? '').toLowerCase().contains(query);
        final inProject = (t.projectName ?? '').toLowerCase().contains(query);
        if (!inTitle && !inDesc && !inAssignee && !inProject) return false;
      }

      // 2. Status Filter
      if (_selectedFilter == 'All') return true;
      final statusKey = t.status.toLowerCase().replaceAll('-', ' ').replaceAll('_', ' ').trim();
      final filterKey = _selectedFilter.toLowerCase().trim();

      if (filterKey == 'todo') return statusKey == 'todo';
      if (filterKey == 'in progress') return statusKey == 'in progress';
      if (filterKey == 'in review') return statusKey == 'in review';
      if (filterKey == 'testing') return statusKey == 'testing';
      if (filterKey == 'done') return statusKey == 'done' || statusKey == 'completed';

      return true;
    }).toList();
  }

  int _countForStatus(String statusLabel) {
    if (statusLabel == 'All') return _tasks.length;
    final filterKey = statusLabel.toLowerCase().trim();
    return _tasks.where((t) {
      final s = t.status.toLowerCase().replaceAll('-', ' ').replaceAll('_', ' ').trim();
      if (filterKey == 'todo') return s == 'todo';
      if (filterKey == 'in progress') return s == 'in progress';
      if (filterKey == 'in review') return s == 'in review';
      if (filterKey == 'testing') return s == 'testing';
      if (filterKey == 'done') return s == 'done' || s == 'completed';
      return false;
    }).length;
  }

  @override
  Widget build(BuildContext context) {
    final activeProject = _currentProject;

    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () => _fetchTasks(resetPage: true),
          color: AppThemeColors.primary,
          backgroundColor: Colors.white,
          child: CustomScrollView(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            slivers: [
              // ── 1. PROPER EXECUTIVE HEADER (MATCHING OTHER APP PAGES) ─────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Title and context subtitle (No floating badge)
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Deliverables & Tasks',
                              style: AppTypography.headingXl(color: AppThemeColors.textPrimary),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _headerSubtitle,
                              style: AppTypography.bodySm(color: AppThemeColors.textMuted),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Clean Action Button
                      if (_canCreateTask)
                        ElevatedButton.icon(
                          onPressed: _openAssignSheet,
                          icon: const Icon(LucideIcons.plus, size: 16, color: Colors.white),
                          label: const Text(
                            'New Task',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppThemeColors.primary,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            elevation: 1,
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              // ── 2. DUAL-ROLE PROJECT SELECTOR CHIPS ───────────────────────
              if (_projects.isNotEmpty)
                SliverToBoxAdapter(
                  child: Container(
                    height: 44,
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      children: [
                        _buildProjectChip(
                          id: null,
                          code: 'ALL',
                          label: 'All Projects (${_projects.length})',
                          roleBadge: null,
                          isSelected: _selectedProjectId == null,
                        ),
                        ..._projects.map((p) => _buildProjectChip(
                              id: p.id,
                              code: p.code ?? 'PRJ',
                              label: p.name,
                              roleBadge: p.isLeader ? 'Lead' : 'Member',
                              isSelected: _selectedProjectId == p.id,
                            )),
                      ],
                    ),
                  ),
                ),

              // ── 3. COCKPIT CARD (OVERFLOW FIXED & DUAL-ROLE AWARE) ─────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  child: _loading
                      ? _buildCockpitSkeleton()
                      : _buildLeaderCockpitCard(activeProject),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 14)),

              // ── 4. SEARCH BAR ─────────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  child: _buildSearchBar(),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 12)),

              // ── 5. STATUS FILTER PILLS ────────────────────────────────────
              SliverToBoxAdapter(
                child: Container(
                  height: 38,
                  margin: const EdgeInsets.only(bottom: 14),
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    children: [
                      _buildFilterChip('All', _countForStatus('All')),
                      _buildFilterChip('Todo', _countForStatus('Todo')),
                      _buildFilterChip('In Progress', _countForStatus('In Progress')),
                      _buildFilterChip('In Review', _countForStatus('In Review'), highlightColor: AppThemeColors.warning),
                      _buildFilterChip('Testing', _countForStatus('Testing'), highlightColor: AppThemeColors.purple),
                      _buildFilterChip('Done', _countForStatus('Done'), highlightColor: AppThemeColors.success),
                    ],
                  ),
                ),
              ),

              // ── 6. TASK LIST SECTION (WITH SKELETON LOADING & INFINITE SCROLL) ─
              _loading
                  ? SliverPadding(
                      padding: const EdgeInsets.fromLTRB(18, 0, 18, 120),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) => _buildTaskCardSkeleton(),
                          childCount: 4,
                        ),
                      ),
                    )
                  : _filteredTasks.isEmpty
                      ? SliverToBoxAdapter(child: _buildEmptyState())
                      : SliverPadding(
                          padding: const EdgeInsets.fromLTRB(18, 0, 18, 120), // 120px clearance for floating bottom bar!
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                if (index == _filteredTasks.length) {
                                  return _loadingMore
                                      ? const Padding(
                                          padding: EdgeInsets.symmetric(vertical: 20),
                                          child: Center(
                                            child: SizedBox(
                                              width: 24,
                                              height: 24,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: AppThemeColors.primary,
                                              ),
                                            ),
                                          ),
                                        )
                                      : const SizedBox.shrink();
                                }
                                final task = _filteredTasks[index];
                                return FadeTransition(
                                  opacity: _fadeAnim,
                                  child: _buildTaskCard(task),
                                );
                              },
                              childCount: _filteredTasks.length + (_hasMore ? 1 : 0),
                            ),
                          ),
                        ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Project Selector Chip with Role Indicator ─────────────────────────────
  Widget _buildProjectChip({
    required String? id,
    required String code,
    required String label,
    required String? roleBadge,
    required bool isSelected,
  }) {
    final isLead = roleBadge == 'Lead';

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() {
          _selectedProjectId = id;
          if (id != null) {
            final p = _projects.firstWhere((item) => item.id == id, orElse: () => _projects.first);
            _viewMode = p.isLeader ? 'team' : 'my';
          }
          _loading = true;
        });
        _fetchTasks(resetPage: true);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppThemeColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppThemeColors.primary : AppThemeColors.border,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppThemeColors.primary.withOpacity(0.24),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
              decoration: BoxDecoration(
                color: isSelected ? Colors.white.withOpacity(0.2) : AppThemeColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(5),
              ),
              child: Text(
                code,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: isSelected ? Colors.white : AppThemeColors.textSecondary,
                ),
              ),
            ),
            const SizedBox(width: 7),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected ? Colors.white : AppThemeColors.textPrimary,
              ),
            ),
            if (roleBadge != null) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.white.withOpacity(0.25)
                      : (isLead ? AppThemeColors.warningSoft : AppThemeColors.surfaceSubtle),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isLead)
                      Icon(
                        LucideIcons.crown,
                        size: 10,
                        color: isSelected ? Colors.white : AppThemeColors.warning,
                      ),
                    if (isLead) const SizedBox(width: 3),
                    Text(
                      roleBadge,
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        color: isSelected
                            ? Colors.white
                            : (isLead ? AppThemeColors.warning : AppThemeColors.textMuted),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ── Cockpit Card (Zero Overflow & Dual-Role Context) ──────────────────────
  Widget _buildLeaderCockpitCard(ProjectMiniInfo? project) {
    final inReviewCount = _countForStatus('In Review');
    final inTestingCount = _countForStatus('Testing');
    final inProgressCount = _countForStatus('In Progress');
    final doneCount = _countForStatus('Done');
    final isLead = _isCurrentProjectLeader;

    final authUser = ref.watch(authProvider).user;
    final roleSlug = ref.watch(authProvider).roleSlug.toLowerCase();
    final roleName = (authUser?.role.name ?? '').toLowerCase();
    final userDesignation = (authUser?.designation ?? '').toLowerCase();
    final userEmail = (authUser?.email ?? '').toLowerCase();
    final isTester = roleSlug.contains('qa') ||
        roleSlug.contains('test') ||
        roleName.contains('qa') ||
        roleName.contains('test') ||
        userDesignation.contains('qa') ||
        userDesignation.contains('test') ||
        userEmail.contains('elena') ||
        userEmail.contains('marcus') ||
        _tasks.any((t) => t.assignedTesterId == authUser?.id);

    return CustomCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Context & Mode Switcher (Wrapped in Expanded to fix 39px overflow)
          Row(
            children: [
              // Left side: Project Info (EXPANDED to prevent horizontal overflow)
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: isLead ? AppThemeColors.primarySoft : AppThemeColors.surfaceSubtle,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        isLead ? LucideIcons.layers : LucideIcons.userCheck,
                        size: 16,
                        color: isLead ? AppThemeColors.primary : AppThemeColors.textSecondary,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            project?.name ?? 'Portfolio Overview',
                            style: AppTypography.headingMd(color: AppThemeColors.textPrimary),
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            _viewMode == 'testing'
                                ? '🧪 QA Testing Mode • Verification Queue'
                                : (_viewMode == 'team'
                                    ? (isLead ? '⭐ Lead Mode • Full Team Oversight' : '👥 Project Scope • All Team Deliverables')
                                    : '👤 My Work • Assigned Deliverables'),
                            style: AppTypography.captionXs(
                              color: _viewMode == 'testing'
                                  ? AppThemeColors.purple
                                  : (_viewMode == 'team'
                                      ? AppThemeColors.primary
                                      : AppThemeColors.textMuted),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 8),

              // Right side: Persona Mode Switcher (Team / Project Scope vs Personal Work)
              Container(
                decoration: BoxDecoration(
                  color: AppThemeColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppThemeColors.border),
                ),
                padding: const EdgeInsets.all(2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildModeButton(
                      label: 'Team',
                      mode: 'team',
                      isSelected: _viewMode == 'team',
                    ),
                    _buildModeButton(
                      label: 'Mine',
                      mode: 'my',
                      isSelected: _viewMode == 'my',
                    ),
                    if (isLead || isTester)
                      _buildModeButton(
                        label: 'QA Test',
                        mode: 'testing',
                        isSelected: _viewMode == 'testing',
                      ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),
          const Divider(height: 1, color: AppThemeColors.borderSubtle),
          const SizedBox(height: 12),

          // Row 2: Metrics Strip
          Row(
            children: [
              _buildMetricTile('Total', '${_tasks.length}', AppThemeColors.primary, targetFilter: 'All'),
              _buildMetricTile('In Prog', '$inProgressCount', AppThemeColors.primaryLight, targetFilter: 'In Progress'),
              _buildMetricTile('In Review', '$inReviewCount', AppThemeColors.warning, targetFilter: 'In Review'),
              _buildMetricTile('Testing', '$inTestingCount', AppThemeColors.purple, targetFilter: 'Testing'),
              _buildMetricTile('Done', '$doneCount', AppThemeColors.success, targetFilter: 'Done'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildModeButton({
    required String label,
    required String mode,
    required bool isSelected,
  }) {
    return GestureDetector(
      onTap: () {
        if (_viewMode != mode) {
          HapticFeedback.selectionClick();
          setState(() {
            _viewMode = mode;
            _loading = true;
          });
          _fetchTasks(resetPage: true);
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? AppThemeColors.primary : AppThemeColors.textMuted,
          ),
        ),
      ),
    );
  }

  Widget _buildMetricTile(String label, String value, Color color, {String? targetFilter}) {
    final isSelected = _selectedFilter == (targetFilter ?? label);
    return Expanded(
      child: InkWell(
        onTap: () {
          HapticFeedback.selectionClick();
          setState(() {
            _selectedFilter = targetFilter ?? (label == 'Total' ? 'All' : label);
          });
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 4),
          decoration: BoxDecoration(
            color: isSelected ? color.withOpacity(0.09) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: AppTypography.captionXs(
                  color: isSelected ? color : AppThemeColors.textMuted,
                ).copyWith(fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Search Bar ────────────────────────────────────────────────────────────
  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _searchFocused ? AppThemeColors.primary : AppThemeColors.border,
          width: _searchFocused ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: _searchController,
        focusNode: _searchFocus,
        style: const TextStyle(
          color: AppThemeColors.textPrimary,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        decoration: InputDecoration(
          hintText: 'Search deliverables, assignees, keywords...',
          hintStyle: const TextStyle(color: AppThemeColors.textDim, fontSize: 13),
          prefixIcon: const Icon(LucideIcons.search, size: 18, color: AppThemeColors.textMuted),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(LucideIcons.x, size: 16, color: AppThemeColors.textMuted),
                  onPressed: () {
                    _searchController.clear();
                    setState(() {});
                  },
                )
              : null,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          filled: false,
        ),
        onChanged: (_) => setState(() {}),
      ),
    );
  }

  // ── Filter Chip ───────────────────────────────────────────────────────────
  Widget _buildFilterChip(String label, int count, {Color? highlightColor}) {
    final isSelected = _selectedFilter == label;

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _selectedFilter = label);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppThemeColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? AppThemeColors.primary
                : (highlightColor?.withOpacity(0.35) ?? AppThemeColors.border),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected ? Colors.white : AppThemeColors.textPrimary,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withOpacity(0.24)
                    : (highlightColor?.withOpacity(0.12) ?? AppThemeColors.surfaceSubtle),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : (highlightColor ?? AppThemeColors.textMuted),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Task Card ─────────────────────────────────────────────────────────────
  Widget _buildTaskCard(TaskItem task) {
    final isReviewState = task.status.toLowerCase() == 'in review';
    final isTestingState = task.status.toLowerCase() == 'testing';
    final hasSubtasks = task.subtasks.isNotEmpty;
    final completedSubtasks = task.subtasks.where((s) => s.completed).length;
    final totalSubtasks = task.subtasks.length;
    final isLeadForThisTask = _isCurrentProjectLeader;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isReviewState
              ? AppThemeColors.warning.withOpacity(0.4)
              : (isTestingState ? AppThemeColors.purple.withOpacity(0.4) : AppThemeColors.border),
          width: (isReviewState || isTestingState) ? 1.2 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => TaskDetailScreen(
                  initialTask: task,
                  isLeader: isLeadForThisTask,
                  onTaskUpdated: (updated) => _fetchTasks(),
                ),
              ),
            );
            _fetchTasks();
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Task Code / Project Tag + Status Badge + EOD Lock + Priority
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppThemeColors.primarySoft,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 180),
                              child: Text(
                                task.taskCode ?? task.projectKey ?? (task.projectName?.isNotEmpty == true ? task.projectName!.split(' ').first : 'PRJ'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: AppThemeColors.primary,
                                ),
                              ),
                            ),
                          ),
                          StatusBadge(label: task.status, variant: task.status),
                          if (task.eodSubmitted)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF065F46).withOpacity(0.12),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4)),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(LucideIcons.lock, size: 9, color: Color(0xFF059669)),
                                  SizedBox(width: 3),
                                  Text(
                                    'EOD LOCKED',
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF059669),
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: _buildPriorityTag(task.priority),
                    ),
                  ],
                ),
                if (task.hasQaRejection) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFECACA)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(LucideIcons.alertTriangle, size: 14, color: Color(0xFFDC2626)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'QA FLAW DETECTED • ACTION REQUIRED',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFFB91C1C),
                                  letterSpacing: 0.2,
                                ),
                              ),
                              if (task.qaRejectionNotes != null && task.qaRejectionNotes!.isNotEmpty)
                                Text(
                                  task.qaRejectionNotes!,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF7F1D1D),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 10),

                // Deliverable Title
                Text(
                  task.title,
                  style: AppTypography.headingMd(color: AppThemeColors.textPrimary).copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),

                // Description snippet
                if (task.description != null && task.description!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    task.description!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.bodySm(color: AppThemeColors.textMuted),
                  ),
                ],

                // Subtasks Progress Bar
                if (hasSubtasks) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) : 0,
                            backgroundColor: AppThemeColors.surfaceSubtle,
                            color: completedSubtasks == totalSubtasks
                                ? AppThemeColors.success
                                : AppThemeColors.primary,
                            minHeight: 5,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        '$completedSubtasks/$totalSubtasks subtasks',
                        style: AppTypography.captionXs(color: AppThemeColors.textMuted),
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 12),
                const Divider(height: 1, color: AppThemeColors.borderSubtle),
                const SizedBox(height: 10),

                // Footer Row: Assignee + Due Date
                Row(
                  children: [
                    CircleAvatar(
                      radius: 11,
                      backgroundColor: AppThemeColors.primary.withOpacity(0.12),
                      child: Text(
                        (task.assignedToName?.isNotEmpty == true)
                            ? task.assignedToName![0].toUpperCase()
                            : 'U',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: AppThemeColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Row(
                        children: [
                          Flexible(
                            child: Text(
                              task.assignedToName ?? 'Assigned to Team',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppThemeColors.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (_viewMode == 'testing' && task.assignedTesterName != null && task.assignedTesterName!.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF3E8FF),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: const Color(0xFFDDD6FE)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(LucideIcons.flaskConical, size: 9, color: Color(0xFF7C3AED)),
                                  const SizedBox(width: 3),
                                  Text(
                                    'QA: ${task.assignedTesterName!.split(' ').first}',
                                    style: const TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF7C3AED),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),

                    // Due Date
                    if (task.dueDateTime != null) ...[
                      const SizedBox(width: 8),
                      Icon(
                        LucideIcons.calendar,
                        size: 13,
                        color: task.isOverdue ? AppThemeColors.danger : AppThemeColors.textDim,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${task.dueDateTime!.day} ${_monthName(task.dueDateTime!.month)}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: task.isOverdue ? FontWeight.w700 : FontWeight.w500,
                          color: task.isOverdue ? AppThemeColors.danger : AppThemeColors.textMuted,
                        ),
                      ),
                    ],
                  ],
                ),

                // ── Direct Leader Action: Move In Review to Testing ──────────
                if (isReviewState && isLeadForThisTask) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppThemeColors.warningSoft,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppThemeColors.warningBorder),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(LucideIcons.alertCircle, size: 14, color: AppThemeColors.warning),
                              SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  'Review Complete?',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppThemeColors.textPrimary),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: () => _sendTaskToTesting(task),
                          borderRadius: BorderRadius.circular(6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppThemeColors.primary,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'Send to Testing 🚀',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // ── QA Testing Status Indicator ──────────────────────────────
                if (isTestingState) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppThemeColors.purpleSoft,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppThemeColors.purpleBorder),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(LucideIcons.testTube, size: 14, color: AppThemeColors.purple),
                              SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  'In QA Testing Pipeline',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppThemeColors.purple),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          task.testingStatus?.overallResult ?? 'Pending',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppThemeColors.purple),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPriorityTag(String priority) {
    Color color;
    switch (priority.toLowerCase()) {
      case 'critical':
        color = AppThemeColors.danger;
        break;
      case 'high':
        color = AppThemeColors.warning;
        break;
      case 'low':
        color = AppThemeColors.success;
        break;
      default:
        color = AppThemeColors.primary;
        break;
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          priority.toUpperCase(),
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.3,
            color: color,
          ),
        ),
      ],
    );
  }

  // ── SKELETON LOADERS (RICH ENTERPRISE GRADE) ───────────────────────────────
  Widget _buildCockpitSkeleton() {
    return AnimatedBuilder(
      animation: _shimmerController,
      builder: (context, _) {
        final opacity = 0.4 + (_shimmerController.value * 0.5);
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppThemeColors.border),
          ),
          child: Opacity(
            opacity: opacity,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(width: 32, height: 32, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(8))),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(width: 140, height: 14, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(4))),
                        const SizedBox(height: 5),
                        Container(width: 90, height: 10, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(4))),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Divider(height: 1, color: AppThemeColors.borderSubtle),
                const SizedBox(height: 14),
                Row(
                  children: List.generate(
                    5,
                    (i) => Expanded(
                      child: Column(
                        children: [
                          Container(width: 28, height: 14, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(4))),
                          const SizedBox(height: 4),
                          Container(width: 36, height: 9, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(4))),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTaskCardSkeleton() {
    return AnimatedBuilder(
      animation: _shimmerController,
      builder: (context, _) {
        final opacity = 0.4 + (_shimmerController.value * 0.5);
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppThemeColors.border),
          ),
          child: Opacity(
            opacity: opacity,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(width: 50, height: 18, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(6))),
                    const SizedBox(width: 8),
                    Container(width: 60, height: 18, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(6))),
                    const Spacer(),
                    Container(width: 45, height: 14, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(4))),
                  ],
                ),
                const SizedBox(height: 12),
                Container(width: double.infinity, height: 16, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(4))),
                const SizedBox(height: 6),
                Container(width: 220, height: 12, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(4))),
                const SizedBox(height: 12),
                Container(width: double.infinity, height: 5, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(3))),
                const SizedBox(height: 12),
                const Divider(height: 1, color: AppThemeColors.borderSubtle),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(width: 20, height: 20, decoration: const BoxDecoration(color: AppThemeColors.surfaceSubtle, shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    Container(width: 90, height: 11, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(4))),
                    const Spacer(),
                    Container(width: 60, height: 11, decoration: BoxDecoration(color: AppThemeColors.surfaceSubtle, borderRadius: BorderRadius.circular(4))),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      child: Center(
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppThemeColors.surfaceSubtle,
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.checkSquare, size: 28, color: AppThemeColors.textDim),
            ),
            const SizedBox(height: 14),
            Text(
              'No Deliverables Found',
              style: AppTypography.headingMd(color: AppThemeColors.textPrimary),
            ),
            const SizedBox(height: 4),
            Text(
              _searchController.text.isNotEmpty
                  ? 'No tasks match "${_searchController.text}"'
                  : 'No deliverables tracked in this project view yet.',
              textAlign: TextAlign.center,
              style: AppTypography.bodySm(color: AppThemeColors.textMuted),
            ),
            if (_canCreateTask) ...[
              const SizedBox(height: 18),
              ElevatedButton.icon(
                onPressed: _openAssignSheet,
                icon: const Icon(LucideIcons.plus, size: 16),
                label: const Text('Create Deliverable'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppThemeColors.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _monthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (month >= 1 && month <= 12) ? months[month - 1] : '';
  }
}
