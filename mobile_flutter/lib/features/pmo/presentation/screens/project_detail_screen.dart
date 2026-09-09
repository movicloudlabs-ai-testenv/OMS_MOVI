import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../theme/app_colors.dart';
import '../../../../theme/app_typography.dart';
import '../../../../core/widgets/screen_container.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../models/project_item.dart';
import '../../../../models/task_item.dart';
import '../../data/pmo_api.dart';

class ProjectDetailScreen extends StatefulWidget {
  final ProjectItem? initialProject;

  const ProjectDetailScreen({super.key, this.initialProject});

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen> {
  final PmoApi _api = PmoApi();
  late ProjectItem _project;
  List<TaskItem> _tasks = [];

  @override
  void initState() {
    super.initState();
    _project = widget.initialProject ??
        ProjectItem(
          id: 'p1',
          name: 'Movi Mobile Launch',
          key: 'MVI-202',
          description: 'Enterprise React Native to Flutter migration and deployment.',
          status: 'active',
          health: 'On Track',
          leadName: 'Alex Lead',
          taskCount: 5,
        );
    _loadProjectTasks();
  }

  Future<void> _loadProjectTasks() async {
    try {
      final tasks = await _api.getProjectTasks(_project.id);
      if (mounted) setState(() => _tasks = tasks);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return ScreenContainer(
      onRefresh: _loadProjectTasks,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(LucideIcons.arrowLeft, color: AppColors.darkText, size: 20),
                onPressed: () => context.pop(),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              const SizedBox(width: 12),
              Text(_project.key ?? 'Project', style: AppTypography.headingXl(color: AppColors.primaryLight)),
              const Spacer(),
              StatusBadge(label: _project.health, variant: _project.health),
            ],
          ),
          const SizedBox(height: 16),

          CustomCard(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_project.name, style: AppTypography.headingXl(color: AppColors.darkText)),
                if (_project.description != null) ...[
                  const SizedBox(height: 6),
                  Text(_project.description!, style: AppTypography.bodyMd(color: AppColors.darkTextMuted)),
                ],
                const SizedBox(height: 14),
                Row(
                  children: [
                    const Icon(LucideIcons.user, size: 14, color: AppColors.darkTextDim),
                    const SizedBox(width: 6),
                    Text('Lead: ${_project.leadName ?? "Unassigned"}', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
                    const SizedBox(width: 16),
                    const Icon(LucideIcons.checkSquare, size: 14, color: AppColors.darkTextDim),
                    const SizedBox(width: 6),
                    Text('${_tasks.length} tasks', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          Text('Project Deliverables', style: AppTypography.headingLg(color: AppColors.darkText)),
          const SizedBox(height: 10),

          if (_tasks.isEmpty)
            const CustomCard(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Center(
                  child: Text('No project deliverables tracked yet', style: TextStyle(color: AppColors.darkTextMuted)),
                ),
              ),
            )
          else
            ..._tasks.map(
              (task) => CustomCard(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(task.title, style: AppTypography.headingLg(color: AppColors.darkText)),
                          const SizedBox(height: 4),
                          Text('Priority: ${task.priority.toUpperCase()}', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
                        ],
                      ),
                    ),
                    StatusBadge(label: task.status, variant: task.status),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
