import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../models/gantt_item.dart';
import '../../data/pmo_api.dart';

/// ─── INTERACTIVE GANTT ROADMAP & CRITICAL PATH ENGINE (OPTION D) ────────────
/// Interactive Gantt timeline visualization with topological DAG dependency links,
/// zero-slack Critical Path deliverable highlights, and baseline schedule variance tracking.
class ProjectGanttTab extends StatefulWidget {
  final String projectId;
  final VoidCallback? onDataChanged;

  const ProjectGanttTab({
    super.key,
    required this.projectId,
    this.onDataChanged,
  });

  @override
  State<ProjectGanttTab> createState() => _ProjectGanttTabState();
}

class _ProjectGanttTabState extends State<ProjectGanttTab> {
  final PmoApi _api = PmoApi();

  GanttAnalysisData? _ganttData;
  String _activeTypeFilter = 'all'; // 'all', 'milestone', 'sprint', 'critical'
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadGanttData();
  }

  Future<void> _loadGanttData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await _api.getProjectGantt(widget.projectId);
      if (mounted) {
        setState(() {
          _ganttData = data;
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

  List<GanttTimelineItem> _getFilteredItems(List<GanttTimelineItem> items) {
    if (_activeTypeFilter == 'milestone') {
      return items.where((i) => i.type == 'milestone').toList();
    }
    if (_activeTypeFilter == 'sprint') {
      return items.where((i) => i.type == 'sprint').toList();
    }
    if (_activeTypeFilter == 'critical') {
      return items.where((i) => i.isCritical).toList();
    }
    return items;
  }

  void _showItemDetailModal(GanttTimelineItem item) {
    String startStr = 'N/A';
    String endStr = 'N/A';
    String baselineStr = 'N/A';

    try {
      startStr = DateFormat('MMM dd, yyyy').format(DateTime.parse(item.startDate));
      endStr = DateFormat('MMM dd, yyyy').format(DateTime.parse(item.endDate));
      baselineStr = DateFormat('MMM dd, yyyy').format(DateTime.parse(item.baselineEndDate));
    } catch (_) {}

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
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

            // Key & Type pill
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    item.key,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: item.isCritical ? const Color(0xFFFEF2F2) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    item.isCritical ? '⚡ CRITICAL PATH' : item.type.toUpperCase(),
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: item.isCritical ? const Color(0xFFDC2626) : const Color(0xFF64748B),
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  '${item.progressPercent}% Done',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF16A34A)),
                ),
              ],
            ),
            const SizedBox(height: 10),

            Text(
              item.name,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),

            if (item.deliverable.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                item.deliverable,
                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.3),
              ),
            ],
            const SizedBox(height: 14),

            // Date Matrix
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  _buildDetailRow('Start Date', startStr),
                  const SizedBox(height: 6),
                  _buildDetailRow('Target End Date', endStr),
                  const SizedBox(height: 6),
                  _buildDetailRow('Original Baseline', baselineStr),
                  const SizedBox(height: 6),
                  _buildDetailRow(
                    'Schedule Slippage',
                    item.varianceDays == 0
                        ? '0 days (On Schedule)'
                        : '${item.varianceDays > 0 ? "+" : ""}${item.varianceDays} days',
                    valColor: item.varianceDays > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            if (item.blockedBy.isNotEmpty) ...[
              const Text('Predecessor Dependencies:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                children: item.blockedBy.map((b) => Chip(
                  label: Text('Blocked by $b', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
                  backgroundColor: const Color(0xFFFFFBEB),
                  side: const BorderSide(color: Color(0xFFFDE68A)),
                  padding: EdgeInsets.zero,
                  visualDensity: VisualDensity.compact,
                )).toList(),
              ),
              const SizedBox(height: 14),
            ],

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F172A), foregroundColor: Colors.white),
                child: const Text('Close'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String val, {Color? valColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
        Text(val, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: valColor ?? const Color(0xFF0F172A))),
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
                'Calculating Critical Path & DAG Timeline...',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ),
      );
    }

    if (_error != null || _ganttData == null) {
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
                    isNotFound ? LucideIcons.calendarDays : LucideIcons.alertCircle,
                    size: 28,
                    color: isNotFound ? const Color(0xFF2563EB) : const Color(0xFFEF4444),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  isNotFound ? 'Gantt Roadmap Initializing' : 'Unable to Load Gantt Roadmap',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 6),
                Text(
                  isNotFound
                      ? 'Milestone baselines and critical path analysis will compute automatically once project milestones or sprints are provisioned.'
                      : 'We encountered an issue computing the project critical path and timeline.',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: _loadGanttData,
                  icon: const Icon(LucideIcons.refreshCw, size: 14),
                  label: const Text('Compute Timeline'),
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

    final data = _ganttData!;
    final filteredItems = _getFilteredItems(data.items);

    return RefreshIndicator(
      onRefresh: _loadGanttData,
      color: const Color(0xFF2563EB),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 80),
        children: [
          // ── Critical Path & Baseline Slippage Hero Banner ──
          _buildCriticalPathHeroBanner(data),
          const SizedBox(height: 14),

          // ── Filter Pills: All / Milestones / Sprints / Critical ──
          _buildFilterChips(data),
          const SizedBox(height: 14),

          // ── Timeline List View ──
          if (filteredItems.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Center(
                child: Text('No timeline items matching current filter.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              ),
            )
          else
            ...filteredItems.map((item) => _buildGanttBarCard(item)),
        ],
      ),
    );
  }

  Widget _buildCriticalPathHeroBanner(GanttAnalysisData data) {
    String targetDate = 'Release Date';
    try {
      targetDate = DateFormat('MMM dd, yyyy').format(DateTime.parse(data.criticalPath.targetDeliveryDate));
    } catch (_) {}

    final bool isDelayed = data.varianceDays > 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E1B4B), Color(0xFF312E81)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E1B4B).withOpacity(0.30),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Badges Row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withOpacity(0.20),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.40)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(LucideIcons.zap, size: 10, color: Color(0xFFFBBF24)),
                    SizedBox(width: 4),
                    Text(
                      'CRITICAL PATH DAG',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                        color: Color(0xFFFBBF24),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              // Baseline Variance Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isDelayed ? const Color(0xFFEF4444).withOpacity(0.25) : const Color(0xFF10B981).withOpacity(0.25),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: isDelayed ? const Color(0xFFEF4444).withOpacity(0.50) : const Color(0xFF10B981).withOpacity(0.50),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isDelayed ? LucideIcons.alertTriangle : LucideIcons.checkCircle2,
                      size: 11,
                      color: isDelayed ? const Color(0xFFFCA5A5) : const Color(0xFF6EE7B7),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isDelayed ? '+${data.varianceDays}d Slippage' : 'On Baseline Schedule',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: isDelayed ? const Color(0xFFFCA5A5) : const Color(0xFF6EE7B7),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Text(
            '${data.criticalPath.totalDeliverables} Deliverables on Critical Path',
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Colors.white),
          ),
          const SizedBox(height: 4),
          Text(
            'Target Project Delivery Date: $targetDate (Forecast status: ${data.scheduleHealth})',
            style: const TextStyle(fontSize: 11, color: Color(0xFFCBD5E1)),
          ),
          const SizedBox(height: 12),

          // Key path pill list
          if (data.criticalPath.criticalItemKeys.isNotEmpty) ...[
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: [
                  const Text('Path Sequence: ', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600)),
                  ...data.criticalPath.criticalItemKeys.map((k) => Container(
                    margin: const EdgeInsets.only(right: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF3730A3),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      k,
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFFE0E7FF)),
                    ),
                  )),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFilterChips(GanttAnalysisData data) {
    final filters = [
      {'key': 'all', 'label': 'All Items', 'count': data.items.length},
      {'key': 'critical', 'label': 'Critical Path', 'count': data.criticalPath.totalDeliverables},
      {'key': 'sprint', 'label': 'Sprints', 'count': data.items.where((i) => i.type == 'sprint').length},
      {'key': 'milestone', 'label': 'Milestones', 'count': data.items.where((i) => i.type == 'milestone').length},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: filters.map((f) {
          final isSel = _activeTypeFilter == f['key'];
          final count = f['count'] as int;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: InkWell(
              onTap: () => setState(() => _activeTypeFilter = f['key'] as String),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isSel ? const Color(0xFF0F172A) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isSel ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0)),
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
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildGanttBarCard(GanttTimelineItem item) {
    Color typeColor = const Color(0xFF2563EB);
    IconData typeIcon = LucideIcons.flag;

    if (item.type == 'sprint') {
      typeColor = const Color(0xFF8B5CF6);
      typeIcon = LucideIcons.rotateCcw;
    } else if (item.type == 'milestone') {
      typeColor = const Color(0xFF059669);
      typeIcon = LucideIcons.milestone;
    }

    String startFmt = 'N/A';
    String endFmt = 'N/A';
    try {
      startFmt = DateFormat('MMM d').format(DateTime.parse(item.startDate));
      endFmt = DateFormat('MMM d').format(DateTime.parse(item.endDate));
    } catch (_) {}

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: item.isCritical ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0),
          width: item.isCritical ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: () => _showItemDetailModal(item),
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Key, Type, Dates, Critical Badge
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: typeColor.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        item.key,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'monospace',
                          color: typeColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Icon(typeIcon, size: 12, color: typeColor),
                    const SizedBox(width: 4),
                    Text(
                      item.type.toUpperCase(),
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: typeColor),
                    ),
                    const Spacer(),
                    if (item.isCritical) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: const Color(0xFFFECACA)),
                        ),
                        child: const Text(
                          '⚡ CRITICAL PATH',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFFDC2626),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                    ],
                    Text(
                      '$startFmt – $endFmt',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Name
                Text(
                  item.name,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),

                if (item.deliverable.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    item.deliverable,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 10),

                // Gantt Progress Bar
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: (item.progressPercent / 100.0).clamp(0.0, 1.0),
                          backgroundColor: const Color(0xFFF1F5F9),
                          color: item.isCritical ? const Color(0xFFDC2626) : typeColor,
                          minHeight: 8,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      '${item.progressPercent}%',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Bottom Meta: Predecessors / Slippage
                Row(
                  children: [
                    if (item.blockedBy.isNotEmpty) ...[
                      const Icon(LucideIcons.link, size: 11, color: Color(0xFFD97706)),
                      const SizedBox(width: 4),
                      Text(
                        'Blocked by ${item.blockedBy.length} predecessor',
                        style: const TextStyle(fontSize: 10, color: Color(0xFFD97706), fontWeight: FontWeight.w600),
                      ),
                    ] else ...[
                      const Icon(LucideIcons.check, size: 11, color: Color(0xFF16A34A)),
                      const SizedBox(width: 4),
                      const Text(
                        'No blocking dependencies',
                        style: TextStyle(fontSize: 10, color: Color(0xFF16A34A), fontWeight: FontWeight.w600),
                      ),
                    ],

                    const Spacer(),

                    if (item.varianceDays > 0)
                      Text(
                        '+${item.varianceDays}d slippage',
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFFDC2626)),
                      )
                    else
                      const Text(
                        'On schedule',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
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
