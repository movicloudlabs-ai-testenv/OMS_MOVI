import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../models/project_item.dart';
import '../../../../models/sprint_item.dart';
import '../../../../core/widgets/shimmer_skeleton.dart';
import '../../../../core/widgets/enterprise_pull_to_refresh.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../chat/presentation/screens/chat_conversation_screen.dart';
import '../../../intern/presentation/screens/intern_team_screen.dart';
import '../../data/pmo_api.dart';
import '../widgets/project_kanban_tab.dart';
import '../widgets/project_sprints_tab.dart';
import '../widgets/project_gantt_tab.dart';
import '../widgets/project_roadmap_tab.dart';
import '../widgets/project_deployments_tab.dart';
import '../widgets/project_bugs_tab.dart';
import '../widgets/project_team_tab.dart';
import '../widgets/project_secrets_vault_tab.dart';

/// ── ENTERPRISE PROJECT 360° DOSSIER HUB ──────────────────────────────────────
/// A-to-Z Project Management System with Roadmap Milestones & Dependencies,
/// Append-only Deployment History, Bug Resolution Matrix with Solver Forensics,
/// Team Capacity % Roster & Lead Designation, and Encrypted Secrets Vault.
///
/// Refactored into clean, modular, reusable enterprise widget components.
class ProjectDossierScreen extends ConsumerStatefulWidget {
  final String projectId;
  final ProjectItem? initialProject;

  const ProjectDossierScreen({
    super.key,
    required this.projectId,
    this.initialProject,
  });

  @override
  ConsumerState<ProjectDossierScreen> createState() => _ProjectDossierScreenState();
}

class _ProjectDossierScreenState extends ConsumerState<ProjectDossierScreen>
    with SingleTickerProviderStateMixin {
  final PmoApi _api = PmoApi();

  late TabController _tabController;
  ProjectItem? _project;
  List<ProjectBug> _bugs = [];
  List<ProjectActivityItem> _activities = [];
  KanbanBoardData? _kanbanData;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 8, vsync: this);
    _project = widget.initialProject;
    _loadAllProjectData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllProjectData() async {
    try {
      final p = await _api.getProjectById(widget.projectId);
      final bugsFuture = _api.getProjectBugs(widget.projectId).catchError((_) => <ProjectBug>[]);
      final actFuture = _api.getProjectActivity(widget.projectId).catchError((_) => <ProjectActivityItem>[]);
      final kanbanFuture = _api.getProjectKanban(widget.projectId).catchError((_) => KanbanBoardData(
        todo: KanbanColumnData(id: 'todo', title: 'Todo', wipLimit: 20, isBreached: false, totalPoints: 0, tasks: []),
        inProgress: KanbanColumnData(id: 'inProgress', title: 'In Progress', wipLimit: 6, isBreached: false, totalPoints: 0, tasks: []),
        inReview: KanbanColumnData(id: 'inReview', title: 'In Review', wipLimit: 4, isBreached: false, totalPoints: 0, tasks: []),
        done: KanbanColumnData(id: 'done', title: 'Done', wipLimit: 999, isBreached: false, totalPoints: 0, tasks: []),
      ));

      final results = await Future.wait([bugsFuture, actFuture, kanbanFuture]);

      if (mounted) {
        setState(() {
          _project = p;
          _bugs = results[0] as List<ProjectBug>;
          _activities = results[1] as List<ProjectActivityItem>;
          _kanbanData = results[2] as KanbanBoardData;
          _isLoading = false;
          _errorMessage = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  void _openProjectChat() {
    if (_project == null) return;
    final p = _project!;
    HapticFeedback.lightImpact();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatConversationScreen(
          conversation: {
            'id': 'prj_${p.id}',
            'name': p.name,
            'displayName': '[${p.code}] ${p.name}',
            'topic': p.description ?? 'Official team channel for ${p.name}',
            'channelType': 'project',
            'isPrivate': true,
            'project': {
              '_id': p.id,
              'name': p.name,
              'code': p.code,
              'status': p.status,
              'priority': p.priority,
              'healthStatus': p.healthStatus,
            },
          },
        ),
      ),
    );
  }

  void _exportDossierCsv() {
    if (_project == null) return;
    final p = _project!;
    final buffer = StringBuffer();
    buffer.writeln('=== PROJECT 360 DOSSIER: ${p.name} (${p.code}) ===');
    buffer.writeln('Status: ${p.status} | Health: ${p.healthStatus} | Priority: ${p.priority}');
    buffer.writeln('Manager: ${p.managerName ?? "Unassigned"} | Dept: ${p.departmentName ?? ""}');
    buffer.writeln('Version: ${p.currentVersion} (${p.targetChannel}) | Cadence: ${p.releaseCadence}');
    buffer.writeln('\n--- TEAM ROSTER (${p.team.length}) ---');
    for (final m in p.team) {
      buffer.writeln('"${m.name}","${m.role}","${m.allocationPercentage}% allocation"');
    }
    buffer.writeln('\n--- BUGS & RESOLUTIONS (${_bugs.length}) ---');
    for (final b in _bugs) {
      buffer.writeln('"${b.ticketId}","${b.title}","${b.severity}","${b.status}","Solved by: ${b.resolvedByName ?? "Unresolved"}","Commit: ${b.fixCommitHash ?? "N/A"}"');
    }
    Clipboard.setData(ClipboardData(text: buffer.toString()));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Forensic Project Dossier exported to CSV clipboard'), backgroundColor: Color(0xFF16A34A)),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          title: const Text('Project 360° Dossier', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          backgroundColor: Colors.white,
          elevation: 0,
        ),
        body: const SkeletonProjectDossier(),
      );
    }

    if (_errorMessage != null && _project == null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(backgroundColor: Colors.white, elevation: 0),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(LucideIcons.alertOctagon, size: 40, color: Color(0xFFEF4444)),
                const SizedBox(height: 12),
                Text(_errorMessage ?? 'Failed to load project dossier', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _loadAllProjectData,
                  icon: const Icon(LucideIcons.refreshCw, size: 14),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final p = _project!;
    final currentUserId = ref.watch(authProvider).user?.id ?? '';
    final isLead = p.isUserLead(currentUserId);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, size: 20, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(p.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)), maxLines: 1, overflow: TextOverflow.ellipsis),
            Text(p.code, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B), fontFamily: 'monospace')),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.messageSquare, size: 18, color: Color(0xFF2563EB)),
            tooltip: 'Project Team Chat',
            onPressed: _openProjectChat,
          ),
          IconButton(
            icon: const Icon(LucideIcons.download, size: 18, color: Color(0xFF2563EB)),
            tooltip: 'Export Forensic CSV',
            onPressed: _exportDossierCsv,
          ),
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18, color: Color(0xFF2563EB)),
            onPressed: _loadAllProjectData,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE2E8F0), height: 1),
        ),
      ),
      body: EnterprisePullToRefresh(
        onRefresh: _loadAllProjectData,
        child: NestedScrollView(
          headerSliverBuilder: (ctx, innerScrolled) => [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isLead) ...[
                      _buildLeadDossierBanner(p),
                      const SizedBox(height: 12),
                    ],
                    _buildExecutiveProjectHeader(p),
                    const SizedBox(height: 12),
                    _buildProjectKpiRibbon(p),
                  ],
                ),
              ),
            ),
            SliverPersistentHeader(
              pinned: true,
              delegate: _SliverTabHeaderDelegate(
                TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  labelColor: const Color(0xFF2563EB),
                  unselectedLabelColor: const Color(0xFF64748B),
                  indicatorColor: const Color(0xFF2563EB),
                  indicatorWeight: 3,
                  labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                  tabs: [
                    Tab(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(LucideIcons.layoutGrid, size: 14),
                          SizedBox(width: 6),
                          Text('Kanban Board'),
                        ],
                      ),
                    ),
                    Tab(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(LucideIcons.rotateCcw, size: 14),
                          SizedBox(width: 6),
                          Text('Sprints & Cycles'),
                        ],
                      ),
                    ),
                    Tab(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(LucideIcons.milestone, size: 14),
                          SizedBox(width: 6),
                          Text('Gantt Roadmap'),
                        ],
                      ),
                    ),
                    Tab(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(LucideIcons.activity, size: 14),
                          SizedBox(width: 6),
                          Text('Stack & Activity'),
                        ],
                      ),
                    ),
                    Tab(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(LucideIcons.rocket, size: 14),
                          SizedBox(width: 6),
                          Text('Version Releases'),
                        ],
                      ),
                    ),
                    Tab(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(LucideIcons.bug, size: 14),
                          const SizedBox(width: 6),
                          const Text('Bugs'),
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: _bugs.any((b) => b.isOverdue) ? const Color(0xFFEF4444) : const Color(0xFF2563EB),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${_bugs.length}',
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Tab(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(LucideIcons.users, size: 14),
                          const SizedBox(width: 6),
                          const Text('Team Roster'),
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: const Color(0xFF64748B),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${p.team.length}',
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Tab(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(LucideIcons.shieldCheck, size: 14),
                          SizedBox(width: 6),
                          Text('Secrets Vault'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          body: TabBarView(
            controller: _tabController,
            children: [
              ProjectKanbanTab(projectId: widget.projectId, onDataChanged: _loadAllProjectData),
              ProjectSprintsTab(projectId: widget.projectId, onDataChanged: _loadAllProjectData),
              ProjectGanttTab(projectId: widget.projectId, onDataChanged: _loadAllProjectData),
              ProjectRoadmapTab(
                project: p,
                activities: _activities,
                onDataChanged: _loadAllProjectData,
              ),
              ProjectDeploymentsTab(
                project: p,
                onDataChanged: _loadAllProjectData,
              ),
              ProjectBugsTab(
                projectId: widget.projectId,
                bugs: _bugs,
                onDataChanged: _loadAllProjectData,
              ),
              ProjectTeamTab(
                project: p,
                onDataChanged: _loadAllProjectData,
              ),
              ProjectSecretsVaultTab(
                project: p,
                onDataChanged: _loadAllProjectData,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLeadDossierBanner(ProjectItem p) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFEF3C7), Color(0xFFFDE68A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF59E0B)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF59E0B).withOpacity(0.12),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: const Color(0xFFD97706),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(LucideIcons.crown, size: 16, color: Colors.white),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'PROJECT LEAD OPERATIONAL CONSOLE',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF78350F),
                        letterSpacing: 0.5,
                      ),
                    ),
                    Text(
                      'You hold administrative delegation rights for ${p.name}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF92400E),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => InternTeamScreen(project: p),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.4)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(LucideIcons.users, size: 13, color: Color(0xFF92400E)),
                        SizedBox(width: 6),
                        Text(
                          'Manage Team',
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF78350F)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: InkWell(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    _showLeadControlPanel(p);
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD97706),
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFD97706).withOpacity(0.3),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(LucideIcons.sliders, size: 13, color: Colors.white),
                        SizedBox(width: 6),
                        Text(
                          'Lead Controls',
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                      ],
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

  void _showLeadControlPanel(ProjectItem p) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(20),
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
            const SizedBox(height: 16),
            Row(
              children: [
                const Icon(LucideIcons.crown, size: 20, color: Color(0xFFD97706)),
                const SizedBox(width: 8),
                Text(
                  '${p.code} Lead Control Panel',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(LucideIcons.checkSquare, size: 18, color: Color(0xFF2563EB)),
              ),
              title: const Text('Deliverable Approval Queue', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              subtitle: const Text('Review PRs and milestones ready for sprint sign-off', style: TextStyle(fontSize: 11)),
              trailing: const Icon(LucideIcons.chevronRight, size: 16),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('All sprint deliverables are currently up to date')),
                );
              },
            ),
            const Divider(height: 1),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(LucideIcons.users, size: 18, color: Color(0xFF059669)),
              ),
              title: const Text('Team Allocation & Capacity', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              subtitle: Text('${p.team.length} members currently allocated', style: const TextStyle(fontSize: 11)),
              trailing: const Icon(LucideIcons.chevronRight, size: 16),
              onTap: () {
                Navigator.pop(ctx);
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => InternTeamScreen(project: p)),
                );
              },
            ),
            const Divider(height: 1),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(LucideIcons.bell, size: 18, color: Color(0xFFD97706)),
              ),
              title: const Text('Broadcast Sprint Update', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              subtitle: const Text('Notify all team contributors in project channel', style: TextStyle(fontSize: 11)),
              trailing: const Icon(LucideIcons.chevronRight, size: 16),
              onTap: () {
                Navigator.pop(ctx);
                _openProjectChat();
              },
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  // ─── EXECUTIVE HEADER ───────────────────────────────────────────────────────
  Widget _buildExecutiveProjectHeader(ProjectItem p) {
    Color healthColor = const Color(0xFF10B981);
    if (p.healthStatus == 'At Risk') healthColor = const Color(0xFFF59E0B);
    if (p.healthStatus == 'Delayed') healthColor = const Color(0xFFEF4444);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Text(p.code, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, fontFamily: 'monospace')),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: healthColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(p.healthStatus, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: healthColor)),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(p.status.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(p.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          if (p.description != null && p.description!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(p.description!, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.3)),
          ],
          const SizedBox(height: 12),

          // ── ENTERPRISE WORK BREAKDOWN & BALANCE TRACKER ─────────────────────
          _buildWorkBalanceTracker(p),
        ],
      ),
    );
  }

  // ─── WORK BREAKDOWN & BALANCE TRACKER ───────────────────────────────────────
  Widget _buildWorkBalanceTracker(ProjectItem p) {
    final doneTasks = _kanbanData != null && _kanbanData!.done.tasks.isNotEmpty
        ? _kanbanData!.done.tasks.length
        : p.doneTaskCount;

    final inProgressTasks = _kanbanData?.inProgress.tasks.length ?? 0;
    final allReviewCards = _kanbanData?.inReview.tasks ?? [];
    final inReviewTasks = allReviewCards.where((t) => t.status.toLowerCase() != 'testing').length;
    final testingTasks = allReviewCards.where((t) => t.status.toLowerCase() == 'testing').length;
    final todoTasks = _kanbanData?.todo.tasks.length ?? 0;
    final blockedTasks = _kanbanData?.blockedCount ?? 0;

    final totalTasks = _kanbanData != null && _kanbanData!.totalTasks > 0
        ? _kanbanData!.totalTasks
        : (p.taskCount > 0 ? p.taskCount : (doneTasks + inProgressTasks + inReviewTasks + testingTasks + todoTasks));

    final balanceTasks = totalTasks > doneTasks ? (totalTasks - doneTasks) : 0;
    final completionPct = totalTasks > 0 ? ((doneTasks / totalTasks) * 100).round() : p.completionPercent;
    final balancePct = totalTasks > 0 ? (100 - completionPct) : 0;

    // Segmented flex fractions
    final doneFlex = totalTasks > 0 ? doneTasks : 0;
    final inProgFlex = totalTasks > 0 ? inProgressTasks : 0;
    final reviewFlex = totalTasks > 0 ? inReviewTasks : 0;
    final testingFlex = totalTasks > 0 ? testingTasks : 0;
    final backlogFlex = totalTasks > 0
        ? (totalTasks - (doneTasks + inProgressTasks + inReviewTasks + testingTasks)).clamp(0, totalTasks)
        : 1;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(LucideIcons.barChart2, size: 14, color: Color(0xFF2563EB)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Work Breakdown & Balance Tracker',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                    Text(
                      'Total Scope: $totalTasks Deliverables',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                decoration: BoxDecoration(
                  color: completionPct == 100
                      ? const Color(0xFFDCFCE7)
                      : const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  completionPct == 100 ? '100% COMPLETE' : '$completionPct% PROGRESS',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: completionPct == 100 ? const Color(0xFF16A34A) : const Color(0xFF2563EB),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── Segmented Progress Bar ──────────────────────────────────────────
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: SizedBox(
              height: 9,
              child: Row(
                children: [
                  if (doneFlex > 0)
                    Expanded(
                      flex: doneFlex,
                      child: Container(color: const Color(0xFF10B981)), // Emerald Done
                    ),
                  if (inProgFlex > 0)
                    Expanded(
                      flex: inProgFlex,
                      child: Container(color: const Color(0xFF2563EB)), // Blue In Progress
                    ),
                  if (reviewFlex > 0)
                    Expanded(
                      flex: reviewFlex,
                      child: Container(color: const Color(0xFF8B5CF6)), // Purple Review
                    ),
                  if (testingFlex > 0)
                    Expanded(
                      flex: testingFlex,
                      child: Container(color: const Color(0xFF9333EA)), // Violet Testing
                    ),
                  if (backlogFlex > 0)
                    Expanded(
                      flex: backlogFlex,
                      child: Container(color: const Color(0xFFCBD5E1)), // Slate Balance/Backlog
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // ── Dual Executive Completed vs Balance KPI Cards ────────────────────
          Row(
            children: [
              // Completed Work Card
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF16A34A).withOpacity(0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(LucideIcons.checkCircle2, size: 14, color: Color(0xFF16A34A)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Completed Work',
                              style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF15803D)),
                            ),
                            const SizedBox(height: 1),
                            Text(
                              '$doneTasks Tasks',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF166534)),
                            ),
                            Text(
                              '$completionPct% Closed',
                              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: Color(0xFF15803D)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // Balance Work Card
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2).withOpacity(0.7),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: balanceTasks > 0 ? const Color(0xFFFED7AA) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEA580C).withOpacity(0.12),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(LucideIcons.clock, size: 14, color: Color(0xFFEA580C)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Balance Work',
                              style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF9A3412)),
                            ),
                            const SizedBox(height: 1),
                            Text(
                              '$balanceTasks Tasks',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF7C2D12)),
                            ),
                            Text(
                              '$balancePct% Remaining',
                              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: Color(0xFF9A3412)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // ── Status Stream Breakdown Pills ──────────────────────────────────
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildStatusChip('Done', '$doneTasks', const Color(0xFF10B981)),
                const SizedBox(width: 6),
                _buildStatusChip('In Progress', '$inProgressTasks', const Color(0xFF2563EB)),
                const SizedBox(width: 6),
                _buildStatusChip('In Review', '$inReviewTasks', const Color(0xFF8B5CF6)),
                if (testingTasks > 0) ...[
                  const SizedBox(width: 6),
                  _buildStatusChip('Testing', '$testingTasks', const Color(0xFF9333EA)),
                ],
                const SizedBox(width: 6),
                _buildStatusChip('Todo / Backlog', '$todoTasks', const Color(0xFF64748B)),
                if (blockedTasks > 0) ...[
                  const SizedBox(width: 6),
                  _buildStatusChip('Blocked', '$blockedTasks', const Color(0xFFEF4444)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String label, String count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
          ),
          const SizedBox(width: 3),
          Text(
            count,
            style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: color),
          ),
        ],
      ),
    );
  }

  // ─── KPI RIBBON ─────────────────────────────────────────────────────────────
  Widget _buildProjectKpiRibbon(ProjectItem p) {
    final doneTasks = _kanbanData != null && _kanbanData!.done.tasks.isNotEmpty
        ? _kanbanData!.done.tasks.length
        : p.doneTaskCount;
    final totalTasks = _kanbanData != null && _kanbanData!.totalTasks > 0
        ? _kanbanData!.totalTasks
        : (p.taskCount > 0 ? p.taskCount : doneTasks);
    final compPct = totalTasks > 0 ? ((doneTasks / totalTasks) * 100).round() : p.completionPercent;

    return Row(
      children: [
        Expanded(child: _buildKpiBox('Delivery', '$compPct%', const Color(0xFF2563EB), LucideIcons.checkCircle2)),
        const SizedBox(width: 8),
        Expanded(child: _buildKpiBox('Bugs', '${_bugs.where((b) => b.status != "Resolved").length} Open', _bugs.any((b) => b.isOverdue) ? const Color(0xFFEF4444) : const Color(0xFF10B981), LucideIcons.bug)),
        const SizedBox(width: 8),
        Expanded(child: _buildKpiBox('Release', p.currentVersion, const Color(0xFF0F172A), LucideIcons.tag)),
        const SizedBox(width: 8),
        Expanded(child: _buildKpiBox('Roster', '${p.totalRosterCount}', const Color(0xFF8B5CF6), LucideIcons.users)),
      ],
    );
  }

  Widget _buildKpiBox(String title, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 12, color: color),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: color),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _SliverTabHeaderDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _SliverTabHeaderDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.white,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverTabHeaderDelegate oldDelegate) => false;
}
