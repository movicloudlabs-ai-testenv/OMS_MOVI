import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

/// ─── ENTERPRISE TASK CARD BUBBLE (JIRA / PMO CHATOPS) ──────────────────────
/// Renders an interactive work item card directly in chat conversations.
class TaskCardBubble extends StatelessWidget {
  final bool isMe;
  final String senderName;
  final String? roleName;
  final String message;
  final Map<String, dynamic> taskRef;
  final String timeStr;
  final VoidCallback? onOpenTask;

  const TaskCardBubble({
    super.key,
    required this.isMe,
    required this.senderName,
    required this.roleName,
    required this.message,
    required this.taskRef,
    required this.timeStr,
    this.onOpenTask,
  });

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        return const Color(0xFF10B981);
      case 'in progress':
        return const Color(0xFF2563EB);
      case 'blocked':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFFF59E0B);
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'critical':
        return const Color(0xFFDC2626);
      case 'high':
        return const Color(0xFFEA580C);
      case 'medium':
        return const Color(0xFFD97706);
      default:
        return const Color(0xFF64748B);
    }
  }

  @override
  Widget build(BuildContext context) {
    final code = taskRef['code']?.toString() ?? 'TASK';
    final title = taskRef['title']?.toString() ?? 'Project Task';
    final status = taskRef['status']?.toString() ?? 'Todo';
    final priority = taskRef['priority']?.toString() ?? 'Medium';

    final statusColor = _getStatusColor(status);
    final priorityColor = _getPriorityColor(priority);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isMe) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: const Color(0xFFEFF6FF),
              child: Text(
                senderName.isNotEmpty ? senderName[0].toUpperCase() : 'U',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isMe)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        senderName,
                        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                      ),
                      if (roleName != null) ...[
                        const SizedBox(width: 5),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4)),
                          child: Text(
                            roleName!,
                            style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                          ),
                        ),
                      ],
                      const SizedBox(width: 6),
                      Text(timeStr, style: const TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8))),
                    ],
                  ),
                const SizedBox(height: 4),

                // Interactive Task Card Container
                Container(
                  width: 280,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0F172A).withOpacity(0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header with Ticket tag & status
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: const BoxDecoration(
                          color: Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.vertical(top: Radius.circular(15)),
                          border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
                        ),
                        child: Row(
                          children: [
                            const Icon(LucideIcons.checkSquare, size: 14, color: Color(0xFF2563EB)),
                            const SizedBox(width: 6),
                            Text(
                              code,
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: statusColor.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                status,
                                style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: statusColor),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Task Title & Priority
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A), height: 1.3),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: priorityColor.withOpacity(0.10),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(LucideIcons.alertCircle, size: 10, color: priorityColor),
                                      const SizedBox(width: 4),
                                      Text(
                                        priority,
                                        style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: priorityColor),
                                      ),
                                    ],
                                  ),
                                ),
                                const Spacer(),
                                if (onOpenTask != null)
                                  InkWell(
                                    onTap: onOpenTask,
                                    borderRadius: BorderRadius.circular(6),
                                    child: const Padding(
                                      padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            'View Details',
                                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                                          ),
                                          SizedBox(width: 2),
                                          Icon(LucideIcons.chevronRight, size: 12, color: Color(0xFF2563EB)),
                                        ],
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                if (isMe && timeStr.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(timeStr, style: const TextStyle(fontSize: 9, color: Color(0xFF94A3B8))),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
