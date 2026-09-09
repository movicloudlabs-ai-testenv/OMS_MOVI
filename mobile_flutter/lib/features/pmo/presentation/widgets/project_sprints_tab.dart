import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../models/sprint_item.dart';
import '../../data/pmo_api.dart';

/// ─── AGILE SPRINTS & CYCLES MANAGER (OPTION A) ──────────────────────────────
/// Sprints tracking, sprint goals, velocity analytics, Fibonacci story points,
/// and automated scope rollover upon sprint closure.
class ProjectSprintsTab extends StatefulWidget {
  final String projectId;
  final VoidCallback? onDataChanged;

  const ProjectSprintsTab({
    super.key,
    required this.projectId,
    this.onDataChanged,
  });

  @override
  State<ProjectSprintsTab> createState() => _ProjectSprintsTabState();
}

class _ProjectSprintsTabState extends State<ProjectSprintsTab> {
  final PmoApi _api = PmoApi();

  List<SprintItem> _sprints = [];
  SprintItem? _activeSprint;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSprints();
  }

  Future<void> _loadSprints() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final res = await _api.getProjectSprints(widget.projectId);
      if (mounted) {
        setState(() {
          _sprints = (res['sprints'] as List<SprintItem>?) ?? [];
          _activeSprint = res['activeSprint'] as SprintItem?;
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

  void _showCreateSprintModal() {
    final nameCtrl = TextEditingController(text: 'Sprint ${_sprints.length + 1}');
    final goalCtrl = TextEditingController();
    DateTime startDate = DateTime.now();
    DateTime endDate = DateTime.now().add(const Duration(days: 14));
    bool isSubmitting = false;

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
              const Text(
                'Plan Agile Sprint Cycle',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              const Text(
                'Define time-boxed iteration, sprint commitment goal, and cycle dates.',
                style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 16),

              TextField(
                controller: nameCtrl,
                decoration: InputDecoration(
                  labelText: 'Sprint Name *',
                  hintText: 'e.g. Sprint 14: Core Engine Delivery',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: goalCtrl,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: 'Sprint Goal / Commitment',
                  hintText: 'e.g. Complete authentication SSO and initial audit logger',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 14),

              // Date Selection Row
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: startDate,
                          firstDate: DateTime(2025),
                          lastDate: DateTime(2030),
                        );
                        if (picked != null) {
                          setMState(() {
                            startDate = picked;
                            if (endDate.isBefore(startDate)) {
                              endDate = startDate.add(const Duration(days: 14));
                            }
                          });
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Start Date', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                            const SizedBox(height: 2),
                            Text(
                              DateFormat('MMM d, yyyy').format(startDate),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: endDate,
                          firstDate: startDate,
                          lastDate: DateTime(2030),
                        );
                        if (picked != null) {
                          setMState(() => endDate = picked);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('End Date', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                            const SizedBox(height: 2),
                            Text(
                              DateFormat('MMM d, yyyy').format(endDate),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final name = nameCtrl.text.trim();
                          if (name.isEmpty) return;

                          setMState(() => isSubmitting = true);
                          final nav = Navigator.of(ctx);
                          final messenger = ScaffoldMessenger.of(context);

                          try {
                            await _api.createSprint(widget.projectId, {
                              'name': name,
                              'goal': goalCtrl.text.trim(),
                              'startDate': startDate.toIso8601String(),
                              'endDate': endDate.toIso8601String(),
                            });
                            nav.pop();
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text('Created sprint "$name" successfully.'),
                                backgroundColor: const Color(0xFF16A34A),
                              ),
                            );
                            _loadSprints();
                            widget.onDataChanged?.call();
                          } catch (e) {
                            setMState(() => isSubmitting = false);
                            messenger.showSnackBar(
                              SnackBar(content: Text('Failed: $e'), backgroundColor: const Color(0xFFEF4444)),
                            );
                          }
                        },
                  child: Text(
                    isSubmitting ? 'Creating Sprint...' : 'Create Agile Sprint',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmCompleteSprint(SprintItem sprint) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: const [
            Icon(LucideIcons.checkCheck, color: Color(0xFF16A34A), size: 22),
            SizedBox(width: 8),
            Text('Complete Sprint?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Finalize ${sprint.name} and calculate final velocity metrics.',
              style: const TextStyle(fontSize: 13, color: Color(0xFF334155)),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  _buildDialogRow('Planned Commitment', '${sprint.plannedPoints} pts'),
                  const SizedBox(height: 6),
                  _buildDialogRow('Done Story Points', '${sprint.donePoints} pts'),
                  const SizedBox(height: 6),
                  _buildDialogRow('Unfinished Tasks', '${sprint.taskCount - sprint.doneTaskCount} items'),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: const [
                  Icon(LucideIcons.rotateCcw, size: 14, color: Color(0xFF2563EB)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Unfinished tasks will automatically roll over to the next scheduled sprint (or Backlog) with an audit trail note.',
                      style: TextStyle(fontSize: 11, color: Color(0xFF1E40AF), fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF16A34A),
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final res = await _api.completeSprint(widget.projectId, sprint.id);
                final vel = res['velocity'] ?? 100;
                final rolled = res['rolledOverCount'] ?? 0;
                final next = res['nextSprintName'] ?? 'Backlog';

                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Sprint closed with $vel% velocity! $rolled tasks rolled over to $next.'),
                    backgroundColor: const Color(0xFF16A34A),
                    duration: const Duration(seconds: 4),
                  ),
                );
                _loadSprints();
                widget.onDataChanged?.call();
              } catch (e) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to complete: $e'), backgroundColor: const Color(0xFFEF4444)),
                );
              }
            },
            child: const Text('Complete & Rollover'),
          ),
        ],
      ),
    );
  }

  Widget _buildDialogRow(String label, String val) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
        Text(val, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
      ],
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
                'Loading Sprints & Cycles...',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ),
      );
    }

    if (_error != null) {
      final isNotFound = _error!.contains('404');
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
                    isNotFound ? LucideIcons.repeat : LucideIcons.alertCircle,
                    size: 28,
                    color: isNotFound ? const Color(0xFF2563EB) : const Color(0xFFEF4444),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  isNotFound ? 'Agile Sprints Uninitialized' : 'Unable to Load Sprints',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 6),
                Text(
                  isNotFound
                      ? 'No sprint cycle has been initialized for this project yet. Provision Sprint 1 to begin story tracking and burndown analytics.'
                      : 'We encountered a connection issue while communicating with the PMO sprint service.',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  alignment: WrapAlignment.center,
                  children: [
                    ElevatedButton.icon(
                      onPressed: _showCreateSprintModal,
                      icon: const Icon(LucideIcons.plus, size: 15),
                      label: const Text('Provision Sprint 1'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: _loadSprints,
                      icon: const Icon(LucideIcons.refreshCw, size: 14),
                      label: const Text('Retry Connection'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF475569),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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

    return RefreshIndicator(
      onRefresh: _loadSprints,
      color: const Color(0xFF2563EB),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 80),
        children: [
          // Active Sprint Hero Card
          if (_activeSprint != null) ...[
            _buildActiveSprintHeroCard(_activeSprint!),
            const SizedBox(height: 16),
          ] else ...[
            _buildNoActiveSprintBanner(),
            const SizedBox(height: 16),
          ],

          // Section Title + Create Sprint Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Sprint Delivery Cycles',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              ElevatedButton.icon(
                onPressed: _showCreateSprintModal,
                icon: const Icon(LucideIcons.plus, size: 14),
                label: const Text('New Sprint', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (_sprints.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Center(
                child: Text(
                  'No sprints planned yet. Tap "New Sprint" to begin your first agile cycle.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  textAlign: TextAlign.center,
                ),
              ),
            )
          else
            ..._sprints.map((s) => _buildSprintListItem(s)),
        ],
      ),
    );
  }

  Widget _buildActiveSprintHeroCard(SprintItem s) {
    String dateRange = 'Current Cycle';
    if (s.startDate.isNotEmpty && s.endDate.isNotEmpty) {
      try {
        final start = DateTime.parse(s.startDate);
        final end = DateTime.parse(s.endDate);
        dateRange = '${DateFormat('MMM d').format(start)} – ${DateFormat('MMM d, yyyy').format(end)}';
      } catch (_) {}
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.20),
            blurRadius: 14,
            offset: const Offset(0, 4),
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
                  color: const Color(0xFF10B981).withOpacity(0.20),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFF10B981).withOpacity(0.40)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(LucideIcons.play, size: 10, color: Color(0xFF34D399)),
                    SizedBox(width: 4),
                    Text(
                      'ACTIVE SPRINT',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                        color: Color(0xFF34D399),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                dateRange,
                style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 10),

          Text(
            s.name,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
          ),

          if (s.goal.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              s.goal,
              style: const TextStyle(fontSize: 12, color: Color(0xFFCBD5E1), height: 1.3),
            ),
          ],
          const SizedBox(height: 14),

          // Progress Bar with Points
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${s.donePoints} / ${s.totalPoints} pts completed (${s.progressPercent}%)',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF93C5FD)),
              ),
              Text(
                '${s.doneTaskCount}/${s.taskCount} tasks',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF94A3B8)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: (s.progressPercent / 100.0).clamp(0.0, 1.0),
              backgroundColor: const Color(0xFF334155),
              color: const Color(0xFF3B82F6),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 14),

          // Complete sprint CTA button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(LucideIcons.checkCheck, size: 15),
              label: const Text('Complete Sprint & Rollover Scope', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => _confirmCompleteSprint(s),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoActiveSprintBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(LucideIcons.calendar, size: 22, color: Color(0xFF2563EB)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'No Active Sprint in Progress',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                Text(
                  'Start a planned sprint below or create a new cycle to commence execution.',
                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSprintListItem(SprintItem s) {
    Color statusColor = const Color(0xFF64748B);
    if (s.status == 'Active') statusColor = const Color(0xFF16A34A);
    if (s.status == 'Completed') statusColor = const Color(0xFF2563EB);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: s.status == 'Active' ? const Color(0xFFBFDBFE) : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Name & Status
          Row(
            children: [
              Expanded(
                child: Text(
                  s.name,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.10),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  s.status.toUpperCase(),
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: statusColor),
                ),
              ),
            ],
          ),

          if (s.goal.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              s.goal,
              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 10),

          // Metrics row: Velocity, Points, Tasks, Rolled over
          Row(
            children: [
              _buildPill(
                label: s.status == 'Completed' ? '${s.velocity}% Velocity' : '${s.progressPercent}% Progress',
                color: s.status == 'Completed' ? const Color(0xFF16A34A) : const Color(0xFF2563EB),
                icon: LucideIcons.trendingUp,
              ),
              const SizedBox(width: 6),
              _buildPill(
                label: '${s.totalPoints} pts',
                color: const Color(0xFF475569),
                icon: LucideIcons.layers,
              ),
              const SizedBox(width: 6),
              _buildPill(
                label: '${s.taskCount} tasks',
                color: const Color(0xFF64748B),
                icon: LucideIcons.checkSquare,
              ),
              if (s.rolledOverCount > 0) ...[
                const SizedBox(width: 6),
                _buildPill(
                  label: '${s.rolledOverCount} Rolled',
                  color: const Color(0xFFD97706),
                  icon: LucideIcons.rotateCcw,
                ),
              ],
            ],
          ),

          if (s.status == 'Planning') ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 36,
              child: OutlinedButton.icon(
                icon: const Icon(LucideIcons.play, size: 13),
                label: const Text('Start Sprint Cycle', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF2563EB),
                  side: const BorderSide(color: Color(0xFFBFDBFE)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () async {
                  final messenger = ScaffoldMessenger.of(context);
                  try {
                    await _api.startSprint(widget.projectId, s.id);
                    messenger.showSnackBar(
                      SnackBar(content: Text('${s.name} is now active'), backgroundColor: const Color(0xFF16A34A)),
                    );
                    _loadSprints();
                    widget.onDataChanged?.call();
                  } catch (e) {
                    messenger.showSnackBar(
                      SnackBar(content: Text('Failed: $e'), backgroundColor: const Color(0xFFEF4444)),
                    );
                  }
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPill({
    required String label,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
