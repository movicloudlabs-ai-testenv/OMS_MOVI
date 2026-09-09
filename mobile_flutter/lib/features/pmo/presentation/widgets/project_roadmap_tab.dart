import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../models/project_item.dart';
import '../../data/pmo_api.dart';

/// Reusable, enterprise-grade Roadmap, Milestones & Live Activity Stream tab widget.
class ProjectRoadmapTab extends StatefulWidget {
  final ProjectItem project;
  final List<ProjectActivityItem> activities;
  final VoidCallback onDataChanged;

  const ProjectRoadmapTab({
    super.key,
    required this.project,
    required this.activities,
    required this.onDataChanged,
  });

  @override
  State<ProjectRoadmapTab> createState() => _ProjectRoadmapTabState();
}

class _ProjectRoadmapTabState extends State<ProjectRoadmapTab> {
  final PmoApi _api = PmoApi();

  void _showAddMilestoneModal() {
    final nameCtrl = TextEditingController();
    final delivCtrl = TextEditingController();
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
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Add Roadmap Milestone',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 14),

              TextField(
                controller: nameCtrl,
                decoration: InputDecoration(
                  labelText: 'Milestone Objective *',
                  hintText: 'e.g. Core Auth API & SSO Integration',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 10),

              TextField(
                controller: delivCtrl,
                decoration: InputDecoration(
                  labelText: 'Key Deliverables Summary',
                  hintText: 'Complete endpoints, swagger doc, 95% unit coverage',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                  ),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (nameCtrl.text.trim().isEmpty) return;
                          setMState(() => isSubmitting = true);
                          final nav = Navigator.of(ctx);
                          final messenger = ScaffoldMessenger.of(context);

                          try {
                            await _api.addMilestone(widget.project.id, {
                              'name': nameCtrl.text.trim(),
                              'deliverable': delivCtrl.text.trim(),
                              'date': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
                            });
                            nav.pop();
                            widget.onDataChanged();
                          } catch (e) {
                            setMState(() => isSubmitting = false);
                            messenger.showSnackBar(
                              SnackBar(content: Text('Failed: $e'), backgroundColor: const Color(0xFFEF4444)),
                            );
                          }
                        },
                  child: Text(isSubmitting ? 'Saving...' : 'Add to Delivery Roadmap'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.project;
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(14),
      children: [
        // Tech Stack & Repositories Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Engineering Infrastructure & Stack',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 10),
              if (p.techStack.isNotEmpty)
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: p.techStack
                      .map((tech) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFCBD5E1)),
                            ),
                            child: Text(
                              tech,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF334155),
                              ),
                            ),
                          ))
                      .toList(),
                )
              else
                const Text('No specific tech stack defined.', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Milestones Delivery Roadmap Header
        Row(
          children: [
            Expanded(
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(LucideIcons.milestone, size: 15, color: Color(0xFF2563EB)),
                  ),
                  const SizedBox(width: 8),
                  const Flexible(
                    child: Text(
                      'Delivery Roadmap',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.2,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (p.milestones.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${p.milestones.where((m) => m.status == "completed").length}/${p.milestones.length}',
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF475569)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: _showAddMilestoneModal,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.plus, size: 13, color: Color(0xFF2563EB)),
                      SizedBox(width: 4),
                      Text(
                        'Add Milestone',
                        style: TextStyle(
                          fontSize: 11,
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
        const SizedBox(height: 10),
        if (p.milestones.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 20),
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
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFDBEAFE)),
                  ),
                  child: const Icon(LucideIcons.milestone, size: 18, color: Color(0xFF2563EB)),
                ),
                const SizedBox(height: 10),
                const Text(
                  'No milestones defined yet',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Set key delivery checkpoints, release dates, and sprint targets.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: _showAddMilestoneModal,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB),
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withOpacity(0.25),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.plus, size: 13, color: Colors.white),
                        SizedBox(width: 5),
                        Text(
                          'Add First Milestone',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          )
        else
          ...p.milestones.map((m) => _buildMilestoneCard(m)),

        const SizedBox(height: 20),

        // Live Project Activity Feed Header
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(LucideIcons.activity, size: 15, color: Color(0xFF2563EB)),
            ),
            const SizedBox(width: 8),
            const Text(
              'Live Project Activity Stream',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A), letterSpacing: -0.2),
            ),
            const Spacer(),
            if (widget.activities.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${widget.activities.length}',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF475569)),
                ),
              ),
          ],
        ),
        const SizedBox(height: 10),
        if (widget.activities.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Column(
              children: [
                Icon(LucideIcons.activity, size: 24, color: Color(0xFF94A3B8)),
                SizedBox(height: 8),
                Text('No recent activity recorded yet.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
              ],
            ),
          )
        else
          ...widget.activities.map((act) => _buildActivityRow(act)),

        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildMilestoneCard(ProjectMilestone m) {
    final isCompleted = m.status == 'completed';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isCompleted ? const Color(0xFF86EFAC) : const Color(0xFFE2E8F0)),
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
            children: [
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: isCompleted ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isCompleted ? LucideIcons.check : LucideIcons.circle,
                  size: 13,
                  color: isCompleted ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  m.name,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    decoration: isCompleted ? TextDecoration.lineThrough : null,
                    color: isCompleted ? const Color(0xFF64748B) : const Color(0xFF0F172A),
                  ),
                ),
              ),
              if (m.blockedBy.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(6)),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.alertCircle, size: 10, color: Color(0xFFEF4444)),
                      SizedBox(width: 3),
                      Text('Blocked', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFFEF4444))),
                    ],
                  ),
                ),
            ],
          ),
          if (m.deliverable != null && m.deliverable!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFF1F5F9)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.fileText, size: 12, color: Color(0xFF64748B)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      m.deliverable!,
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
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

  Widget _buildActivityRow(ProjectActivityItem act) {
    IconData actIcon = LucideIcons.zap;
    Color actColor = const Color(0xFF2563EB);
    Color actBg = const Color(0xFFEFF6FF);

    final titleLower = act.title.toLowerCase();
    if (titleLower.contains('team') || titleLower.contains('added') || titleLower.contains('assigned')) {
      actIcon = LucideIcons.userPlus;
      actColor = const Color(0xFF7C3AED);
      actBg = const Color(0xFFF5F3FF);
    } else if (titleLower.contains('provisioned') || titleLower.contains('created') || titleLower.contains('launch')) {
      actIcon = LucideIcons.sparkles;
      actColor = const Color(0xFF2563EB);
      actBg = const Color(0xFFEFF6FF);
    } else if (titleLower.contains('milestone')) {
      actIcon = LucideIcons.milestone;
      actColor = const Color(0xFFD97706);
      actBg = const Color(0xFFFFFBEB);
    } else if (titleLower.contains('bug') || titleLower.contains('ticket')) {
      actIcon = LucideIcons.bug;
      actColor = const Color(0xFFEF4444);
      actBg = const Color(0xFFFEF2F2);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(color: actBg, borderRadius: BorderRadius.circular(8)),
            child: Icon(actIcon, size: 14, color: actColor),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  act.title,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A), height: 1.3),
                ),
                if (act.details.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    act.details,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.3),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
