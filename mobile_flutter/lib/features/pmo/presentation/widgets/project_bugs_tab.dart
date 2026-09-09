import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../config/env.dart';
import '../../../../models/project_item.dart';
import '../../data/pmo_api.dart';

/// ─── ENTERPRISE BUG REPORTING & RESOLUTION MATRIX ───────────────────────────
/// Linear & Jira inspired high-density defect tracking suite featuring:
///   • Visual defect attachments (Camera & Gallery picker with instant upload)
///   • Full-screen interactive screenshot & attachment viewer
///   • Severity & Priority matrix (Blocker, Critical, Major, Minor, Trivial / P0-P3)
///   • Environment & Subsystem classification
///   • Reproduction steps and Expected vs Actual forensics
///   • Solver attribution with commit hash, branch, and pull request links
///   • Real-time search & SLA status filters
class ProjectBugsTab extends StatefulWidget {
  final String projectId;
  final List<ProjectBug> bugs;
  final VoidCallback? onDataChanged;

  const ProjectBugsTab({
    super.key,
    required this.projectId,
    required this.bugs,
    this.onDataChanged,
  });

  @override
  State<ProjectBugsTab> createState() => _ProjectBugsTabState();
}

class _ProjectBugsTabState extends State<ProjectBugsTab> {
  final PmoApi _api = PmoApi();
  final ImagePicker _picker = ImagePicker();
  final TextEditingController _searchCtrl = TextEditingController();

  String _filterStatus = 'All'; // 'All', 'Open', 'In Progress', 'Resolved', 'SLA Overdue'
  String _searchQuery = '';
  final Set<String> _expandedBugs = {};

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() {
      setState(() => _searchQuery = _searchCtrl.text.toLowerCase().trim());
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  String _formatPriorityCode(String priority) {
    final p = priority.trim().toUpperCase();
    if (p == 'BLOCKER' || p == 'CRITICAL' || p == 'P0') return 'P0';
    if (p == 'HIGH' || p == 'MAJOR' || p == 'P1') return 'P1';
    if (p == 'MEDIUM' || p == 'NORMAL' || p == 'MINOR' || p == 'P2') return 'P2';
    if (p == 'LOW' || p == 'TRIVIAL' || p == 'P3') return 'P3';
    return priority;
  }

  String _formatImageUrl(String url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    final base = Env.apiBaseUrl.endsWith('/')
        ? Env.apiBaseUrl.substring(0, Env.apiBaseUrl.length - 1)
        : Env.apiBaseUrl;
    final path = url.startsWith('/') ? url : '/$url';
    return '$base$path';
  }

  void _showImageViewer(String imageUrl, String ticketId) {
    final fullUrl = _formatImageUrl(imageUrl);
    HapticFeedback.lightImpact();
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(12),
        child: Stack(
          alignment: Alignment.center,
          children: [
            InteractiveViewer(
              minScale: 0.5,
              maxScale: 4.0,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  fullUrl,
                  fit: BoxFit.contain,
                  loadingBuilder: (context, child, progress) {
                    if (progress == null) return child;
                    return Container(
                      width: 260,
                      height: 260,
                      color: const Color(0xFF0F172A),
                      child: const Center(
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      ),
                    );
                  },
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      padding: const EdgeInsets.all(24),
                      color: const Color(0xFF1E293B),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(LucideIcons.imageOff, size: 36, color: Color(0xFF94A3B8)),
                          SizedBox(height: 8),
                          Text('Failed to load screenshot preview', style: TextStyle(color: Colors.white, fontSize: 12)),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),
            PositionBar(ticketId: ticketId, onClose: () => Navigator.of(ctx).pop()),
          ],
        ),
      ),
    );
  }

  // ─── RESOLVE DEFECT FORENSICS MODAL ─────────────────────────────────────────
  void _showResolveBugModal(ProjectBug bug) {
    final notesCtrl = TextEditingController();
    final commitCtrl = TextEditingController();
    final branchCtrl = TextEditingController();
    final prCtrl = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
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
              Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 12),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(8)),
                    child: const Icon(LucideIcons.checkCheck, size: 16, color: Color(0xFF16A34A)),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Resolve Defect: ${bug.ticketId}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        Text(bug.title, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              TextField(
                controller: notesCtrl,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: 'Resolution Summary *',
                  hintText: 'Root cause identified and verified in QA environment.',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: commitCtrl,
                      decoration: InputDecoration(
                        labelText: 'Fix Commit Hash',
                        hintText: '8f4b1e2',
                        prefixIcon: const Icon(LucideIcons.gitCommit, size: 14),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: branchCtrl,
                      decoration: InputDecoration(
                        labelText: 'Fix Branch',
                        hintText: 'hotfix/token-leak',
                        prefixIcon: const Icon(LucideIcons.gitBranch, size: 14),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              TextField(
                controller: prCtrl,
                decoration: InputDecoration(
                  labelText: 'Pull Request URL',
                  hintText: 'https://github.com/org/repo/pull/142',
                  prefixIcon: const Icon(LucideIcons.gitPullRequest, size: 14),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  icon: isSubmitting
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(LucideIcons.award, size: 16),
                  label: Text(isSubmitting ? 'Recording Forensic Resolution...' : 'Mark Resolved & Assign as Solver'),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A), foregroundColor: Colors.white),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (notesCtrl.text.trim().isEmpty) return;
                          setMState(() => isSubmitting = true);
                          final nav = Navigator.of(ctx);
                          final messenger = ScaffoldMessenger.of(context);

                          try {
                            await _api.resolveProjectBug(widget.projectId, bug.id, {
                              'resolutionNotes': notesCtrl.text.trim(),
                              'fixCommitHash': commitCtrl.text.trim(),
                              'fixBranch': branchCtrl.text.trim(),
                              'fixPrUrl': prCtrl.text.trim(),
                            });
                            nav.pop();
                            widget.onDataChanged?.call();
                          } catch (e) {
                            setMState(() => isSubmitting = false);
                            messenger.showSnackBar(SnackBar(content: Text('Resolution failed: $e'), backgroundColor: const Color(0xFFEF4444)));
                          }
                        },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── REPORT ENTERPRISE BUG MODAL WITH IMAGE ATTACHMENTS ─────────────────────
  void _showReportBugModal() {
    final titleCtrl = TextEditingController();
    final stepsCtrl = TextEditingController();
    final expectedCtrl = TextEditingController();
    final actualCtrl = TextEditingController();

    String sev = 'Critical';
    String priority = 'P1';
    String env = 'Production';
    String module = 'Core UI';
    final List<String> uploadedImageUrls = [];
    bool isUploadingImage = false;
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setMState) {
          Future<void> pickAndUploadImage(ImageSource source) async {
            final messenger = ScaffoldMessenger.of(context);
            try {
              final picked = await _picker.pickImage(
                source: source,
                imageQuality: 85,
                maxWidth: 1600,
              );
              if (picked == null) return;

              setMState(() => isUploadingImage = true);
              final uploaded = await _api.uploadBugAttachment(File(picked.path));

              if (uploaded != null && uploaded['url'] != null) {
                uploadedImageUrls.add(uploaded['url'].toString());
              } else {
                messenger.showSnackBar(
                  const SnackBar(content: Text('Failed to upload attachment image'), backgroundColor: Color(0xFFEF4444)),
                );
              }
            } catch (e) {
              messenger.showSnackBar(
                SnackBar(content: Text('Attachment error: $e'), backgroundColor: const Color(0xFFEF4444)),
              );
            } finally {
              setMState(() => isUploadingImage = false);
            }
          }

          return DraggableScrollableSheet(
            initialChildSize: 0.88,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            expand: false,
            builder: (_, scrollCtrl) => Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
                left: 18,
                right: 18,
                top: 12,
              ),
              child: ListView(
                controller: scrollCtrl,
                children: [
                  Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)))),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(8)),
                        child: const Icon(LucideIcons.alertTriangle, size: 16, color: Color(0xFFEF4444)),
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Report Enterprise Defect', style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                            Text('Defect ticket with SLA forensics & visual evidence.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Defect Title
                  TextField(
                    controller: titleCtrl,
                    decoration: InputDecoration(
                      labelText: 'Defect Title *',
                      hintText: 'e.g. Memory leak during large dataset export',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Severity & Priority Row
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: sev,
                          items: const [
                            DropdownMenuItem(value: 'Blocker', child: Text('🔴 Blocker')),
                            DropdownMenuItem(value: 'Critical', child: Text('🟠 Critical')),
                            DropdownMenuItem(value: 'Major', child: Text('🟡 Major')),
                            DropdownMenuItem(value: 'Minor', child: Text('🔵 Minor')),
                            DropdownMenuItem(value: 'Trivial', child: Text('⚪ Trivial')),
                          ],
                          onChanged: (v) {
                            if (v != null) {
                              setMState(() {
                                sev = v;
                                if (v == 'Blocker' || v == 'Critical') {
                                  priority = 'P0';
                                } else if (v == 'Major') {
                                  priority = 'P1';
                                } else if (v == 'Minor') {
                                  priority = 'P2';
                                } else {
                                  priority = 'P3';
                                }
                              });
                            }
                          },
                          decoration: InputDecoration(labelText: 'Severity', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: priority,
                          items: const [
                            DropdownMenuItem(value: 'P0', child: Text('P0 - Urgent')),
                            DropdownMenuItem(value: 'P1', child: Text('P1 - High')),
                            DropdownMenuItem(value: 'P2', child: Text('P2 - Normal')),
                            DropdownMenuItem(value: 'P3', child: Text('P3 - Low')),
                          ],
                          onChanged: (v) => setMState(() => priority = v!),
                          decoration: InputDecoration(labelText: 'Priority', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Environment & Module Row
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: env,
                          items: ['Production', 'Staging', 'QA', 'UAT', 'Development'].map((e) => DropdownMenuItem(value: e, child: Text(e, style: const TextStyle(fontSize: 12)))).toList(),
                          onChanged: (v) => setMState(() => env = v!),
                          decoration: InputDecoration(labelText: 'Environment', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: module,
                          items: ['Core UI', 'Authentication', 'API & Services', 'Billing & Finance', 'Database', 'Notifications', 'PMO & Sprints'].map((m) => DropdownMenuItem(value: m, child: Text(m, style: const TextStyle(fontSize: 12)))).toList(),
                          onChanged: (v) => setMState(() => module = v!),
                          decoration: InputDecoration(labelText: 'Subsystem / Module', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Steps to Reproduce
                  TextField(
                    controller: stepsCtrl,
                    maxLines: 3,
                    decoration: InputDecoration(
                      labelText: 'Steps to Reproduce',
                      hintText: '1. Open Project Dossier...\n2. Click Export CSV...\n3. Observe NullPointer exception in logs...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Expected vs Actual
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: expectedCtrl,
                          maxLines: 2,
                          decoration: InputDecoration(
                            labelText: 'Expected Behavior',
                            hintText: 'CSV downloads instantly.',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: actualCtrl,
                          maxLines: 2,
                          decoration: InputDecoration(
                            labelText: 'Actual Behavior',
                            hintText: 'Spinner hangs indefinitely.',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // ── Visual Evidence / Screenshot Picker ────────────────────
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(LucideIcons.paperclip, size: 14, color: Color(0xFF2563EB)),
                            const SizedBox(width: 6),
                            const Text(
                              'Visual Evidence & Screenshots',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                            ),
                            const Spacer(),
                            if (isUploadingImage)
                              const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                          ],
                        ),
                        const SizedBox(height: 8),

                        // Image Thumbnails Row
                        if (uploadedImageUrls.isNotEmpty)
                          SizedBox(
                            height: 64,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: uploadedImageUrls.length,
                              separatorBuilder: (context, index) => const SizedBox(width: 8),
                              itemBuilder: (ctx, idx) {
                                final imgUrl = _formatImageUrl(uploadedImageUrls[idx]);
                                return Stack(
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.network(
                                        imgUrl,
                                        width: 64,
                                        height: 64,
                                        fit: BoxFit.cover,
                                        errorBuilder: (context, error, stackTrace) => Container(
                                          width: 64,
                                          height: 64,
                                          color: const Color(0xFFE2E8F0),
                                          child: const Icon(LucideIcons.image, size: 20, color: Color(0xFF94A3B8)),
                                        ),
                                      ),
                                    ),
                                    Positioned(
                                      top: 2,
                                      right: 2,
                                      child: GestureDetector(
                                        onTap: () => setMState(() => uploadedImageUrls.removeAt(idx)),
                                        child: Container(
                                          padding: const EdgeInsets.all(2),
                                          decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
                                          child: const Icon(Icons.close, size: 10, color: Colors.white),
                                        ),
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                          ),

                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                icon: const Icon(LucideIcons.image, size: 14),
                                label: const Text('Add from Gallery', style: TextStyle(fontSize: 11)),
                                onPressed: isUploadingImage ? null : () => pickAndUploadImage(ImageSource.gallery),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton.icon(
                                icon: const Icon(LucideIcons.camera, size: 14),
                                label: const Text('Capture Camera', style: TextStyle(fontSize: 11)),
                                onPressed: isUploadingImage ? null : () => pickAndUploadImage(ImageSource.camera),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      icon: isSubmitting
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(LucideIcons.shieldAlert, size: 16),
                      label: Text(isSubmitting ? 'Logging Defect Ticket...' : 'Log Enterprise Defect Ticket'),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444), foregroundColor: Colors.white),
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              if (titleCtrl.text.trim().isEmpty) return;
                              setMState(() => isSubmitting = true);
                              final nav = Navigator.of(ctx);
                              final messenger = ScaffoldMessenger.of(context);

                              try {
                                await _api.createProjectBug(widget.projectId, {
                                  'title': titleCtrl.text.trim(),
                                  'severity': sev,
                                  'priority': priority,
                                  'environment': env,
                                  'module': module,
                                  'stepsToReproduce': stepsCtrl.text.trim(),
                                  'expectedBehavior': expectedCtrl.text.trim(),
                                  'actualBehavior': actualCtrl.text.trim(),
                                  'attachments': uploadedImageUrls,
                                  'description': stepsCtrl.text.trim().isNotEmpty ? stepsCtrl.text.trim() : titleCtrl.text.trim(),
                                });
                                nav.pop();
                                widget.onDataChanged?.call();
                              } catch (e) {
                                setMState(() => isSubmitting = false);
                                messenger.showSnackBar(SnackBar(content: Text('Failed: $e'), backgroundColor: const Color(0xFFEF4444)));
                              }
                            },
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ─── BUG RESOLUTION MATRIX CARD ─────────────────────────────────────────────
  Widget _buildBugResolutionCard(ProjectBug bug) {
    final isResolved = bug.status == 'Resolved' || bug.status == 'Closed';
    final isExpanded = _expandedBugs.contains(bug.id);

    Color sevColor = const Color(0xFF64748B);
    if (bug.severity == 'Blocker') {
      sevColor = const Color(0xFFDC2626);
    } else if (bug.severity == 'Critical') {
      sevColor = const Color(0xFFEF4444);
    } else if (bug.severity == 'Major' || bug.severity == 'High') {
      sevColor = const Color(0xFFF97316);
    } else if (bug.severity == 'Minor' || bug.severity == 'Medium') {
      sevColor = const Color(0xFF2563EB);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: bug.isOverdue
              ? const Color(0xFFFCA5A5)
              : bug.severity == 'Blocker'
                  ? const Color(0xFFFECACA)
                  : const Color(0xFFE2E8F0),
          width: bug.severity == 'Blocker' ? 1.5 : 1.0,
        ),
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
          // Tag Line (TicketId, Severity, Priority, Environment, Module, Status)
          Wrap(
            spacing: 6,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              InkWell(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: bug.ticketId));
                  HapticFeedback.lightImpact();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Ticket ${bug.ticketId} copied to clipboard'),
                      duration: const Duration(seconds: 1),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(4),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        bug.ticketId,
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, fontFamily: 'monospace', color: Color(0xFF334155)),
                      ),
                      const SizedBox(width: 3),
                      const Icon(LucideIcons.copy, size: 9, color: Color(0xFF94A3B8)),
                    ],
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: sevColor.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(width: 5, height: 5, decoration: BoxDecoration(color: sevColor, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    Text(bug.severity, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: sevColor)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: const Color(0xFFC7D2FE)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(LucideIcons.arrowUpRight, size: 9.5, color: Color(0xFF4F46E5)),
                    const SizedBox(width: 2.5),
                    Text(
                      _formatPriorityCode(bug.priority),
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF4F46E5)),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(4), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: Text(bug.environment, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
              ),
              if (bug.module.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(LucideIcons.box, size: 9, color: Color(0xFF64748B)),
                      const SizedBox(width: 3),
                      Text(bug.module, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    ],
                  ),
                ),
              if (bug.isOverdue)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(4), border: Border.all(color: const Color(0xFFFCA5A5))),
                  child: Text('SLA Overdue (${bug.ageHours}h)', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFFEF4444))),
                ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isResolved ? const Color(0xFFDCFCE7) : const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  bug.status,
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: isResolved ? const Color(0xFF16A34A) : const Color(0xFF2563EB)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Title
          Text(
            bug.title,
            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A), letterSpacing: -0.2),
          ),

          if (bug.description.trim().isNotEmpty &&
              bug.description.trim().toLowerCase() != bug.title.trim().toLowerCase()) ...[
            const SizedBox(height: 4),
            Text(
              bug.description,
              style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), height: 1.35),
              maxLines: isExpanded ? 8 : 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],

          // ── Attached Images / Screenshots Strip ─────────────────────────────
          if (bug.attachments.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(LucideIcons.camera, size: 12, color: Color(0xFF2563EB)),
                const SizedBox(width: 4),
                Text('${bug.attachments.length} Visual Evidence Attached (Tap to inspect)', style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
              ],
            ),
            const SizedBox(height: 6),
            SizedBox(
              height: 60,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: bug.attachments.length,
                separatorBuilder: (context, index) => const SizedBox(width: 8),
                itemBuilder: (ctx, idx) {
                  final rawUrl = bug.attachments[idx];
                  final fullUrl = _formatImageUrl(rawUrl);
                  return GestureDetector(
                    onTap: () => _showImageViewer(rawUrl, bug.ticketId),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Image.network(
                            fullUrl,
                            width: 60,
                            height: 60,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Container(
                              width: 60,
                              height: 60,
                              color: const Color(0xFFE2E8F0),
                              child: const Icon(LucideIcons.image, size: 18, color: Color(0xFF94A3B8)),
                            ),
                          ),
                          Container(
                            width: 60,
                            height: 60,
                            color: Colors.black.withOpacity(0.15),
                            child: const Icon(LucideIcons.maximize2, size: 14, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],

          // ── Expandable Reproduction Forensics ───────────────────────────────
          if (isExpanded) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (bug.stepsToReproduce != null && bug.stepsToReproduce!.isNotEmpty) ...[
                    const Text('Steps to Reproduce:', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                    const SizedBox(height: 2),
                    Text(bug.stepsToReproduce!, style: const TextStyle(fontSize: 10.5, color: Color(0xFF475569), height: 1.3)),
                    const SizedBox(height: 8),
                  ],
                  if (bug.expectedBehavior != null && bug.expectedBehavior!.isNotEmpty) ...[
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Expected: ', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF16A34A))),
                        Expanded(child: Text(bug.expectedBehavior!, style: const TextStyle(fontSize: 10, color: Color(0xFF475569)))),
                      ],
                    ),
                    const SizedBox(height: 4),
                  ],
                  if (bug.actualBehavior != null && bug.actualBehavior!.isNotEmpty) ...[
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Actual: ', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFFEF4444))),
                        Expanded(child: Text(bug.actualBehavior!, style: const TextStyle(fontSize: 10, color: Color(0xFF475569)))),
                      ],
                    ),
                    const SizedBox(height: 8),
                  ],
                  if (isResolved && bug.resolutionNotes != null) ...[
                    const Divider(height: 12, color: Color(0xFFE2E8F0)),
                    Row(
                      children: [
                        const Icon(LucideIcons.checkCircle2, size: 12, color: Color(0xFF16A34A)),
                        const SizedBox(width: 4),
                        Text('Resolution: ${bug.resolutionNotes}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF15803D))),
                      ],
                    ),
                    if (bug.fixCommitHash != null && bug.fixCommitHash!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text('Commit: ${bug.fixCommitHash}', style: const TextStyle(fontSize: 9.5, fontFamily: 'monospace', color: Color(0xFF64748B))),
                      ),
                  ],
                ],
              ),
            ),
          ],

          const SizedBox(height: 10),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 8),

          // Footer: Age & Actions
          Row(
            children: [
              Expanded(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(LucideIcons.clock, size: 11, color: Color(0xFF94A3B8)),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        bug.ageHours == 0 ? 'Just now' : '${bug.ageHours}h ago',
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),

              // Forensics toggle
              InkWell(
                onTap: () {
                  setState(() {
                    if (isExpanded) {
                      _expandedBugs.remove(bug.id);
                    } else {
                      _expandedBugs.add(bug.id);
                    }
                  });
                },
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                  decoration: BoxDecoration(
                    color: isExpanded ? const Color(0xFFE2E8F0) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        isExpanded ? 'Hide' : 'Forensics',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: isExpanded ? const Color(0xFF0F172A) : const Color(0xFF475569),
                        ),
                      ),
                      const SizedBox(width: 2),
                      Icon(
                        isExpanded ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                        size: 11,
                        color: isExpanded ? const Color(0xFF0F172A) : const Color(0xFF475569),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),

              if (isResolved)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.checkCheck, size: 11, color: Color(0xFF16A34A)),
                      SizedBox(width: 3),
                      Text(
                        'Resolved',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF16A34A)),
                      ),
                    ],
                  ),
                )
              else
                ElevatedButton.icon(
                  onPressed: () => _showResolveBugModal(bug),
                  icon: const Icon(LucideIcons.check, size: 11),
                  label: const Text('Resolve', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF16A34A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                    elevation: 0,
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Filter bugs
    var filtered = widget.bugs.where((b) {
      if (_filterStatus == 'Open' && b.status != 'Open') {
        return false;
      }
      if (_filterStatus == 'In Progress' && b.status != 'In Progress') {
        return false;
      }
      if (_filterStatus == 'Resolved' && b.status != 'Resolved' && b.status != 'Closed') {
        return false;
      }
      if ((_filterStatus == 'Overdue' || _filterStatus == 'SLA Overdue') && !b.isOverdue) {
        return false;
      }

      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery;
        final match = b.ticketId.toLowerCase().contains(q) ||
            b.title.toLowerCase().contains(q) ||
            b.module.toLowerCase().contains(q) ||
            b.severity.toLowerCase().contains(q) ||
            b.environment.toLowerCase().contains(q);
        if (!match) return false;
      }
      return true;
    }).toList();

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(14),
      children: [
        // Header row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Bug Resolution Matrix', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                Text('${widget.bugs.length} Tracked Defect Tickets', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              ],
            ),
            ElevatedButton.icon(
              onPressed: _showReportBugModal,
              icon: const Icon(LucideIcons.alertTriangle, size: 13),
              label: const Text('Report Bug', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800)),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444), foregroundColor: Colors.white),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Search Bar
        Container(
          height: 38,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: TextField(
            controller: _searchCtrl,
            style: const TextStyle(fontSize: 12),
            decoration: InputDecoration(
              hintText: 'Search tickets, subsystems, or severity...',
              hintStyle: const TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
              prefixIcon: const Icon(LucideIcons.search, size: 14, color: Color(0xFF94A3B8)),
              suffixIcon: _searchQuery.isNotEmpty
                  ? GestureDetector(
                      onTap: () => _searchCtrl.clear(),
                      child: const Icon(Icons.close, size: 14, color: Color(0xFF94A3B8)),
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 9),
            ),
          ),
        ),
        const SizedBox(height: 10),

        // Filter Pills
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: [
              _buildFilterChip('All', widget.bugs.length),
              const SizedBox(width: 6),
              _buildFilterChip('Open', widget.bugs.where((b) => b.status == 'Open').length),
              const SizedBox(width: 6),
              _buildFilterChip('In Progress', widget.bugs.where((b) => b.status == 'In Progress').length),
              const SizedBox(width: 6),
              _buildFilterChip('Resolved', widget.bugs.where((b) => b.status == 'Resolved' || b.status == 'Closed').length),
              const SizedBox(width: 6),
              _buildFilterChip('Overdue', widget.bugs.where((b) => b.isOverdue).length, isAlert: true),
            ],
          ),
        ),
        const SizedBox(height: 14),

        if (filtered.isEmpty)
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                const Icon(LucideIcons.shieldCheck, size: 36, color: Color(0xFF10B981)),
                const SizedBox(height: 8),
                const Text('No Defects Found', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                const SizedBox(height: 4),
                Text(
                  _searchQuery.isNotEmpty || _filterStatus != 'All'
                      ? 'No tickets match the selected filter criteria.'
                      : 'Workspace is 100% defect free with zero open defects recorded.',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          )
        else
          ...filtered.map((bug) => _buildBugResolutionCard(bug)),

        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildFilterChip(String label, int count, {bool isAlert = false}) {
    final isSelected = _filterStatus == label;
    return InkWell(
      onTap: () => setState(() => _filterStatus = label),
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected
              ? (isAlert ? const Color(0xFFDC2626) : const Color(0xFF0F172A))
              : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected
                ? Colors.transparent
                : (isAlert && count > 0 ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0)),
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: (isAlert ? const Color(0xFFDC2626) : const Color(0xFF0F172A)).withOpacity(0.18),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected
                    ? Colors.white
                    : (isAlert && count > 0 ? const Color(0xFFDC2626) : const Color(0xFF475569)),
              ),
            ),
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withOpacity(0.22)
                    : (isAlert && count > 0 ? const Color(0xFFFEE2E2) : const Color(0xFFF1F5F9)),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w800,
                  color: isSelected
                      ? Colors.white
                      : (isAlert && count > 0 ? const Color(0xFFDC2626) : const Color(0xFF64748B)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PositionBar extends StatelessWidget {
  final String ticketId;
  final VoidCallback onClose;

  const PositionBar({super.key, required this.ticketId, required this.onClose});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 10,
      right: 10,
      child: IconButton(
        icon: Container(
          padding: const EdgeInsets.all(6),
          decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
          child: const Icon(Icons.close, color: Colors.white, size: 18),
        ),
        onPressed: onClose,
      ),
    );
  }
}
