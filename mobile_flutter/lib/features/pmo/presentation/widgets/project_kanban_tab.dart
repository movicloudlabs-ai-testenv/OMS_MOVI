import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../models/sprint_item.dart';
import '../../data/pmo_api.dart';

/// ─── ENTERPRISE KANBAN SWIMLANE BOARD (OPTION A) ───────────────────────────
/// Modern Agile Kanban Board with column WIP Limits, Story Point aggregation,
/// Task dependency badges, Fibonacci story points, fast-action status movement,
/// and instant filter pills.
class ProjectKanbanTab extends StatefulWidget {
  final String projectId;
  final VoidCallback? onDataChanged;

  const ProjectKanbanTab({
    super.key,
    required this.projectId,
    this.onDataChanged,
  });

  @override
  State<ProjectKanbanTab> createState() => _ProjectKanbanTabState();
}

class _ProjectKanbanTabState extends State<ProjectKanbanTab> {
  final PmoApi _api = PmoApi();

  KanbanBoardData? _boardData;
  List<SprintItem> _sprints = [];
  String _selectedSprintFilter = 'active'; // 'active', 'backlog', 'all', or sprintId
  String _activeFilter = 'all'; // 'all', 'my', 'blocked', 'critical'
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadKanbanBoard();
  }

  Future<void> _loadKanbanBoard() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final sprintsData = await _api.getProjectSprints(widget.projectId).catchError((_) => {'sprints': <SprintItem>[]});
      _sprints = (sprintsData['sprints'] as List<SprintItem>?) ?? [];

      String? querySprint;
      if (_selectedSprintFilter == 'backlog') {
        querySprint = 'backlog';
      } else if (_selectedSprintFilter == 'all') {
        querySprint = 'all';
      } else if (_selectedSprintFilter != 'active') {
        querySprint = _selectedSprintFilter;
      }

      final board = await _api.getProjectKanban(widget.projectId, sprintId: querySprint);
      if (mounted) {
        setState(() {
          _boardData = board;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString();
        });
      }
    }
  }

  List<KanbanTaskItem> _filterTasks(List<KanbanTaskItem> tasks) {
    switch (_activeFilter) {
      case 'blocked':
        return tasks.where((t) => t.isBlocked || t.status == 'Blocked').toList();
      case 'critical':
        return tasks.where((t) => t.priority.toLowerCase() == 'critical' || t.priority.toLowerCase() == 'high').toList();
      case 'my':
        // Show tasks assigned to current user
        return tasks.where((t) => t.assigneeName != null).toList();
      case 'all':
      default:
        return tasks;
    }
  }

  void _showMoveStatusModal(KanbanTaskItem task) {
    final allowedStatuses = [
      {'status': 'Todo', 'label': 'Todo / Backlog', 'icon': LucideIcons.circle, 'color': const Color(0xFF64748B)},
      {'status': 'In Progress', 'label': 'In Progress', 'icon': LucideIcons.playCircle, 'color': const Color(0xFF2563EB)},
      {'status': 'In Review', 'label': 'Review / QA', 'icon': LucideIcons.checkCircle2, 'color': const Color(0xFF8B5CF6)},
      {'status': 'Blocked', 'label': 'Blocked', 'icon': LucideIcons.alertTriangle, 'color': const Color(0xFFEF4444)},
      {'status': 'Done', 'label': 'Completed (Done)', 'icon': LucideIcons.award, 'color': const Color(0xFF16A34A)},
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setMState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 14,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 38,
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
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: Text(
                      task.key,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF2563EB),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      task.title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'Select new delivery status for this work item:',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 14),

              ...allowedStatuses.map((s) {
                final isCurrent = task.status.toLowerCase() == (s['status'] as String).toLowerCase();
                final color = s['color'] as Color;
                final statusVal = s['status'] as String;

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: InkWell(
                    onTap: isCurrent
                        ? null
                        : () async {
                            final messenger = ScaffoldMessenger.of(context);
                            Navigator.pop(ctx);
                            try {
                              await _api.moveTaskStatus(
                                widget.projectId,
                                task.id,
                                statusVal,
                                blockedReason: statusVal == 'Blocked' ? 'Work item impeded' : null,
                              );
                              messenger.showSnackBar(
                                SnackBar(
                                  content: Text('Moved ${task.key} to $statusVal'),
                                  backgroundColor: const Color(0xFF16A34A),
                                  duration: const Duration(seconds: 2),
                                ),
                              );
                              _loadKanbanBoard();
                              widget.onDataChanged?.call();
                            } catch (e) {
                              messenger.showSnackBar(
                                SnackBar(
                                  content: Text('Failed: $e'),
                                  backgroundColor: const Color(0xFFEF4444),
                                ),
                              );
                            }
                          },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isCurrent ? color.withOpacity(0.08) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isCurrent ? color : const Color(0xFFE2E8F0),
                          width: isCurrent ? 1.5 : 1.0,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(s['icon'] as IconData, size: 18, color: color),
                          const SizedBox(width: 12),
                          Text(
                            s['label'] as String,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: isCurrent ? color : const Color(0xFF1E293B),
                            ),
                          ),
                          const Spacer(),
                          if (isCurrent)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: color,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'CURRENT',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            )
                          else
                            const Icon(LucideIcons.arrowRight, size: 14, color: Color(0xFF94A3B8)),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(strokeWidth: 2.5, color: Color(0xFF2563EB)),
              SizedBox(height: 14),
              Text(
                'Loading Agile Kanban Board...',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ),
      );
    }

    if (_error != null || _boardData == null) {
      final isNotFound = _error != null && _error!.contains('404');
      return Center(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0F172A).withOpacity(0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isNotFound ? const Color(0xFFEFF6FF) : const Color(0xFFFEF2F2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isNotFound ? LucideIcons.layout : LucideIcons.alertCircle,
                    size: 28,
                    color: isNotFound ? const Color(0xFF2563EB) : const Color(0xFFEF4444),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  isNotFound ? 'Kanban Swimlanes Initializing' : 'Unable to Load Kanban',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 6),
                Text(
                  isNotFound
                      ? 'No tasks or sprint cycle have been initialized for this project yet. Tap refresh once sprint stories are allocated.'
                      : 'We encountered a connection issue while communicating with the PMO Kanban service.',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: _loadKanbanBoard,
                  icon: const Icon(LucideIcons.refreshCw, size: 14),
                  label: const Text('Refresh Kanban Board'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final board = _boardData!;

    return RefreshIndicator(
      onRefresh: _loadKanbanBoard,
      color: const Color(0xFF2563EB),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 80),
        children: [
          // ── Header Control Bar: Sprint Picker & Stats ──
          _buildControlRibbon(board),
          const SizedBox(height: 12),

          // ── Filter Pills: All / My Tasks / Blocked / High ──
          _buildFilterBar(board),
          const SizedBox(height: 14),

          // ── Horizontal Column Swimlanes ──
          _buildColumnSwimlanes(board),
        ],
      ),
    );
  }

  Widget _buildControlRibbon(KanbanBoardData board) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
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
          // Row 1: Sprint Scope Selector
          Row(
            children: [
              const Icon(LucideIcons.gitPullRequest, size: 15, color: Color(0xFF2563EB)),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: _selectedSprintFilter,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                    ),
                    items: [
                      const DropdownMenuItem(
                        value: 'active',
                        child: Text('Active Sprint Scope'),
                      ),
                      const DropdownMenuItem(
                        value: 'backlog',
                        child: Text('Project Backlog (Unassigned to Sprint)'),
                      ),
                      const DropdownMenuItem(
                        value: 'all',
                        child: Text('All Work Items (Entire Project)'),
                      ),
                      ..._sprints.map(
                        (s) => DropdownMenuItem(
                          value: s.id,
                          child: Text('${s.name} (${s.status})'),
                        ),
                      ),
                    ],
                    onChanged: (val) {
                      if (val == null) return;
                      setState(() => _selectedSprintFilter = val);
                      _loadKanbanBoard();
                    },
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(LucideIcons.refreshCw, size: 15, color: Color(0xFF64748B)),
                onPressed: _loadKanbanBoard,
                tooltip: 'Refresh Board',
              ),
            ],
          ),
          const Divider(height: 12, color: Color(0xFFF1F5F9)),

          // Row 2: Metrics Strip
          Row(
            children: [
              _buildMiniMetric(
                label: 'TOTAL POINTS',
                value: '${board.totalPoints}',
                color: const Color(0xFF2563EB),
                icon: LucideIcons.hash,
              ),
              const SizedBox(width: 8),
              _buildMiniMetric(
                label: 'COMPLETED',
                value: '${board.completedPoints} pts',
                color: const Color(0xFF16A34A),
                icon: LucideIcons.checkCircle2,
              ),
              const SizedBox(width: 8),
              _buildMiniMetric(
                label: 'BLOCKED',
                value: '${board.blockedCount}',
                color: board.blockedCount > 0 ? const Color(0xFFEF4444) : const Color(0xFF64748B),
                icon: LucideIcons.alertOctagon,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniMetric({
    required String label,
    required String value,
    required Color color,
    required IconData icon,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.06),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 6),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.w700,
                      color: color,
                    ),
                    maxLines: 1,
                  ),
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: color,
                      fontFamily: 'monospace',
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

  Widget _buildFilterBar(KanbanBoardData board) {
    final filters = [
      {'key': 'all', 'label': 'All Tasks', 'count': board.totalTasks},
      {'key': 'my', 'label': 'Assigned', 'count': null},
      {'key': 'blocked', 'label': 'Blocked Only', 'count': board.blockedCount},
      {'key': 'critical', 'label': 'Critical / High', 'count': null},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: filters.map((f) {
          final isSel = _activeFilter == f['key'];
          final count = f['count'] as int?;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: InkWell(
              onTap: () => setState(() => _activeFilter = f['key'] as String),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isSel ? const Color(0xFF0F172A) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSel ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      f['label'] as String,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: isSel ? Colors.white : const Color(0xFF475569),
                      ),
                    ),
                    if (count != null && count > 0) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: isSel ? Colors.white.withOpacity(0.20) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$count',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: isSel ? Colors.white : const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildColumnSwimlanes(KanbanBoardData board) {
    final columns = [
      {'data': board.todo, 'color': const Color(0xFF64748B), 'icon': LucideIcons.circle},
      {'data': board.inProgress, 'color': const Color(0xFF2563EB), 'icon': LucideIcons.playCircle},
      {'data': board.inReview, 'color': const Color(0xFF8B5CF6), 'icon': LucideIcons.checkCircle2},
      {'data': board.done, 'color': const Color(0xFF16A34A), 'icon': LucideIcons.award},
    ];

    return Column(
      children: columns.map((colConfig) {
        final col = colConfig['data'] as KanbanColumnData;
        final color = colConfig['color'] as Color;
        final icon = colConfig['icon'] as IconData;
        final filteredTasks = _filterTasks(col.tasks);

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: col.isBreached ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0),
              width: col.isBreached ? 1.5 : 1.0,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Column Header
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  border: Border(
                    bottom: BorderSide(
                      color: col.isBreached ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0),
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(icon, size: 16, color: color),
                    const SizedBox(width: 8),
                    Text(
                      col.title.toUpperCase(),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                        color: color,
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Counter pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${filteredTasks.length}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: color,
                        ),
                      ),
                    ),
                    const Spacer(),
                    // Story Points sum pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${col.totalPoints} PTS',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'monospace',
                          color: Color(0xFF475569),
                        ),
                      ),
                    ),
                    if (col.wipLimit < 100) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: col.isBreached ? const Color(0xFFFEE2E2) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: col.isBreached ? const Color(0xFFEF4444) : const Color(0xFFCBD5E1),
                          ),
                        ),
                        child: Text(
                          col.isBreached ? '⚠️ WIP LIMIT' : 'WIP: ${col.tasks.length}/${col.wipLimit}',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: col.isBreached ? const Color(0xFFDC2626) : const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // Tasks inside this column
              if (filteredTasks.isEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                  alignment: Alignment.center,
                  child: Text(
                    'No items in ${col.title}',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    children: filteredTasks.map((t) => _buildKanbanTaskCard(t)).toList(),
                  ),
                ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildKanbanTaskCard(KanbanTaskItem task) {
    Color priorityColor = const Color(0xFF3B82F6);
    IconData priorityIcon = LucideIcons.equal;
    if (task.priority.toLowerCase() == 'critical') {
      priorityColor = const Color(0xFFEF4444);
      priorityIcon = LucideIcons.flame;
    } else if (task.priority.toLowerCase() == 'high') {
      priorityColor = const Color(0xFFF97316);
      priorityIcon = LucideIcons.arrowUp;
    } else if (task.priority.toLowerCase() == 'low') {
      priorityColor = const Color(0xFF10B981);
      priorityIcon = LucideIcons.arrowDown;
    }

    String? dueFormatted;
    bool isOverdue = false;
    if (task.dueDate != null) {
      try {
        final dt = DateTime.parse(task.dueDate!);
        dueFormatted = DateFormat('MMM d').format(dt);
        isOverdue = dt.isBefore(DateTime.now()) && task.status != 'Done';
      } catch (_) {}
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: task.isBlocked ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0),
          width: task.isBlocked ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: () => _showMoveStatusModal(task),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Meta Row: Task Key, Story Points, Priority
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        task.key,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'monospace',
                          color: Color(0xFF475569),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    // Story Points Fibonacci Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: const Color(0xFFDBEAFE)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(LucideIcons.layers, size: 9, color: Color(0xFF2563EB)),
                          const SizedBox(width: 3),
                          Text(
                            '${task.storyPoints} pts',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF2563EB),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    // Priority Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: priorityColor.withOpacity(0.10),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(priorityIcon, size: 10, color: priorityColor),
                          const SizedBox(width: 3),
                          Text(
                            task.priority,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: priorityColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Task Title
                Text(
                  task.title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                    height: 1.3,
                  ),
                ),

                // Blocked or Rollover alerts
                if (task.isBlocked) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFFFECACA)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(LucideIcons.alertTriangle, size: 11, color: Color(0xFFEF4444)),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            task.blockedReason ?? 'Impending Blocker',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFEF4444),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                if (task.rolledOver) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.rotateCcw, size: 11, color: Color(0xFFD97706)),
                        SizedBox(width: 4),
                        Text(
                          'Rolled over cycle',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFD97706),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 10),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 8),

                // Bottom Meta: Assignee + Subtasks + Due Date + Shift Button
                Row(
                  children: [
                    // Assignee Avatar / Name
                    if (task.assigneeName != null) ...[
                      CircleAvatar(
                        radius: 10,
                        backgroundColor: const Color(0xFF2563EB),
                        child: Text(
                          task.assigneeName!.isNotEmpty ? task.assigneeName![0].toUpperCase() : '?',
                          style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.w800),
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        task.assigneeName!,
                        style: const TextStyle(fontSize: 11, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                      ),
                    ] else ...[
                      const Icon(LucideIcons.userX, size: 12, color: Color(0xFF94A3B8)),
                      const SizedBox(width: 4),
                      const Text(
                        'Unassigned',
                        style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                      ),
                    ],

                    const Spacer(),

                    if (task.subtasksCount > 0) ...[
                      const Icon(LucideIcons.checkSquare, size: 11, color: Color(0xFF64748B)),
                      const SizedBox(width: 3),
                      Text(
                        '${task.completedSubtasksCount}/${task.subtasksCount}',
                        style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(width: 8),
                    ],

                    if (dueFormatted != null) ...[
                      Icon(
                        LucideIcons.calendar,
                        size: 11,
                        color: isOverdue ? const Color(0xFFEF4444) : const Color(0xFF64748B),
                      ),
                      const SizedBox(width: 3),
                      Text(
                        dueFormatted,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: isOverdue ? FontWeight.w800 : FontWeight.w600,
                          color: isOverdue ? const Color(0xFFEF4444) : const Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],

                    // Quick Move Icon
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Icon(LucideIcons.arrowRightLeft, size: 12, color: Color(0xFF2563EB)),
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
