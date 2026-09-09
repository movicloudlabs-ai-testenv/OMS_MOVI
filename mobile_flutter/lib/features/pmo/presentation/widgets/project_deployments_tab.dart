import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../models/project_item.dart';
import '../../data/pmo_api.dart';

/// Reusable, enterprise-grade Version Releases & Deployments tab widget.
class ProjectDeploymentsTab extends StatefulWidget {
  final ProjectItem project;
  final VoidCallback onDataChanged;

  const ProjectDeploymentsTab({
    super.key,
    required this.project,
    required this.onDataChanged,
  });

  @override
  State<ProjectDeploymentsTab> createState() => _ProjectDeploymentsTabState();
}

class _ProjectDeploymentsTabState extends State<ProjectDeploymentsTab> {
  final PmoApi _api = PmoApi();

  void _showRecordDeploymentModal() {
    final currentVer = widget.project.currentVersion;
    String nextVersion = 'v1.0.1';
    final match = RegExp(r'^v?(\d+)\.(\d+)\.(\d+)').firstMatch(currentVer);
    if (match != null) {
      final major = int.parse(match.group(1)!);
      final minor = int.parse(match.group(2)!);
      final patch = int.parse(match.group(3)!);
      nextVersion = 'v$major.$minor.${patch + 1}';
    }

    final verCtrl = TextEditingController(text: nextVersion);
    final urlCtrl = TextEditingController(text: widget.project.repositoryUrl ?? '');
    final durCtrl = TextEditingController(text: '45');
    final pipeCtrl = TextEditingController();
    String env = widget.project.targetChannel.isNotEmpty ? widget.project.targetChannel : 'Production';
    String status = 'Live';
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
                'Record Version Release',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              Text(
                'Current baseline: $currentVer • Appends release record to immutable audit history.',
                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 14),

              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: ['Production', 'Staging', 'QA', 'Development'].contains(env) ? env : 'Production',
                      items: ['Production', 'Staging', 'QA', 'Development']
                          .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                          .toList(),
                      onChanged: (v) => setMState(() => env = v!),
                      decoration: InputDecoration(
                        labelText: 'Environment',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: status,
                      items: ['Live', 'Building', 'Degraded', 'Offline']
                          .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                          .toList(),
                      onChanged: (v) => setMState(() => status = v!),
                      decoration: InputDecoration(
                        labelText: 'Status',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: verCtrl,
                      decoration: InputDecoration(
                        labelText: 'Release Version',
                        hintText: 'v2.4.0',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: durCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Duration (sec)',
                        hintText: '120',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              TextField(
                controller: urlCtrl,
                decoration: InputDecoration(
                  labelText: 'Live URL',
                  hintText: 'https://app.movi.cloud',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 10),

              TextField(
                controller: pipeCtrl,
                decoration: InputDecoration(
                  labelText: 'CI Pipeline URL',
                  hintText: 'https://github.com/actions/runs/12345',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  icon: isSubmitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Icon(LucideIcons.uploadCloud, size: 16),
                  label: Text(isSubmitting ? 'Recording...' : 'Record Deployment'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                  ),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          setMState(() => isSubmitting = true);
                          final nav = Navigator.of(ctx);
                          final messenger = ScaffoldMessenger.of(context);

                          try {
                            await _api.recordDeployment(widget.project.id, {
                              'environment': env,
                              'status': status,
                              'version': verCtrl.text.trim(),
                              'previousVersion': currentVer,
                              'url': urlCtrl.text.trim(),
                              'durationSeconds': int.tryParse(durCtrl.text.trim()) ?? 0,
                              'pipelineRunUrl': pipeCtrl.text.trim(),
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
        // Enterprise Version Release Hub Header Card
        Container(
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
                color: const Color(0xFF0F172A).withOpacity(0.12),
                blurRadius: 10,
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
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(LucideIcons.tag, size: 18, color: Color(0xFF60A5FA)),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Release Management Hub',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          'Continuous Delivery & Deployment Lineage',
                          style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: _showRecordDeploymentModal,
                    icon: const Icon(LucideIcons.plus, size: 14),
                    label: const Text('New Release', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(height: 1, color: Color(0xFF334155)),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildReleaseStatBox('ACTIVE VERSION', p.currentVersion, const Color(0xFF60A5FA), true),
                  _buildReleaseStatBox('TARGET CHANNEL', p.targetChannel, const Color(0xFF34D399), false),
                  _buildReleaseStatBox('RELEASE CADENCE', p.releaseCadence, const Color(0xFFFBBF24), false),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Deployment Lineage & History',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '${p.deployments.length} Builds Logged',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        if (p.deployments.isEmpty)
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Center(
              child: Column(
                children: [
                  Icon(LucideIcons.packageCheck, size: 36, color: Color(0xFF94A3B8)),
                  SizedBox(height: 8),
                  Text(
                    'No deployments recorded yet.',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Tap "New Release" above to log the first version build.',
                    style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
          )
        else
          ...p.deployments.map((d) => _buildDeploymentCard(d, p.currentVersion)),

        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildReleaseStatBox(String label, String value, Color accentColor, bool isMonospace) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.w700,
            color: Color(0xFF94A3B8),
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: accentColor,
            fontFamily: isMonospace ? 'monospace' : null,
          ),
        ),
      ],
    );
  }

  Widget _buildDeploymentCard(ProjectDeployment d, String activeVersion) {
    final isCurrent = d.version == activeVersion;

    Color statusColor = const Color(0xFF10B981);
    if (d.status == 'Building') statusColor = const Color(0xFF2563EB);
    if (d.status == 'Degraded') statusColor = const Color(0xFFF59E0B);
    if (d.status == 'Offline') statusColor = const Color(0xFFEF4444);

    Color envColor = const Color(0xFF2563EB);
    if (d.environment.toLowerCase() == 'production') envColor = const Color(0xFF10B981);
    if (d.environment.toLowerCase() == 'qa') envColor = const Color(0xFF8B5CF6);

    String deployTime = 'Recent';
    if (d.deployedAt != null) {
      try {
        final dt = DateTime.parse(d.deployedAt!);
        deployTime = DateFormat('MMM dd, yyyy • HH:mm').format(dt);
      } catch (_) {}
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isCurrent ? const Color(0xFFBFDBFE) : const Color(0xFFE2E8F0),
          width: isCurrent ? 1.5 : 1.0,
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
          // Row 1: Version Pill, Current Tag, Environment, Status
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFDBEAFE)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(LucideIcons.tag, size: 11, color: Color(0xFF2563EB)),
                    const SizedBox(width: 4),
                    Text(
                      d.version,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        fontFamily: 'monospace',
                        color: Color(0xFF2563EB),
                      ),
                    ),
                  ],
                ),
              ),
              if (isCurrent) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: const Text(
                    'CURRENT',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF16A34A),
                    ),
                  ),
                ),
              ],
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: envColor.withOpacity(0.10),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  d.environment.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: envColor,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  d.status,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),

          // Upgrade path if available
          if (d.previousVersion != null && d.previousVersion!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(LucideIcons.gitCommit, size: 13, color: Color(0xFF64748B)),
                const SizedBox(width: 4),
                Text(
                  'Upgraded from: ${d.previousVersion}',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontFamily: 'monospace'),
                ),
              ],
            ),
          ],

          // Live URL
          if (d.url.isNotEmpty) ...[
            const SizedBox(height: 8),
            InkWell(
              onTap: () {
                Clipboard.setData(ClipboardData(text: d.url));
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('URL copied to clipboard')));
              },
              child: Row(
                children: [
                  const Icon(LucideIcons.globe, size: 12, color: Color(0xFF2563EB)),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      d.url,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF2563EB),
                        decoration: TextDecoration.underline,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 8),

          // Bottom Deployer & Timestamp Row
          Row(
            children: [
              const Icon(LucideIcons.user, size: 12, color: Color(0xFF94A3B8)),
              const SizedBox(width: 4),
              Text(
                'By ${d.deployedByName ?? "Engineer"} • $deployTime',
                style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
              ),
              const Spacer(),
              if (d.durationSeconds > 0) ...[
                const Icon(LucideIcons.clock, size: 12, color: Color(0xFF94A3B8)),
                const SizedBox(width: 4),
                Text('${d.durationSeconds}s duration', style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
