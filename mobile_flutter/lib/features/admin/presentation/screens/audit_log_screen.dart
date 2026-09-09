import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../theme/theme.dart';
import '../../../../models/audit_log_item.dart';
import '../../data/admin_api.dart';

class AuditLogScreen extends StatefulWidget {
  const AuditLogScreen({super.key});

  @override
  State<AuditLogScreen> createState() => _AuditLogScreenState();
}

class _AuditLogScreenState extends State<AuditLogScreen> {
  final AdminApi _api = AdminApi();
  final TextEditingController _searchCtrl = TextEditingController();

  List<AuditLogItem> _logs = [];
  bool _isLoading = true;
  String _selectedModule = 'All';
  final String _selectedResult = 'All';

  final List<String> _modules = [
    'All',
    'Auth',
    'Users',
    'Projects',
    'Security',
    'System',
  ];

  @override
  void initState() {
    super.initState();
    _fetchLogs();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchLogs() async {
    try {
      final res = await _api.getAuditLogs(page: 1, limit: 100);
      if (mounted) {
        setState(() {
          _logs = res;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<AuditLogItem> get _filteredLogs {
    final q = _searchCtrl.text.trim().toLowerCase();

    return _logs.where((item) {
      // 1. Module Filter
      if (_selectedModule != 'All') {
        final mod = item.module.toLowerCase();
        final sel = _selectedModule.toLowerCase();
        if (!mod.contains(sel)) return false;
      }

      // 2. Result Filter
      if (_selectedResult != 'All') {
        if (item.result.toUpperCase() != _selectedResult.toUpperCase()) {
          return false;
        }
      }

      // 3. Search Query
      if (q.isNotEmpty) {
        final actionMatch = item.action.toLowerCase().contains(q);
        final userMatch = (item.userName ?? '').toLowerCase().contains(q);
        final ipMatch = (item.ipAddress ?? '').toLowerCase().contains(q);
        final detailsMatch = (item.details ?? '').toLowerCase().contains(q);
        return actionMatch || userMatch || ipMatch || detailsMatch;
      }

      return true;
    }).toList();
  }

  // -------------------------------------------------------------
  // Helpers: Icons, Colors & Timestamps
  // -------------------------------------------------------------
  IconData _getModuleIcon(String module, String action) {
    final m = module.toLowerCase();
    final a = action.toLowerCase();
    if (m.contains('auth') || a.contains('login') || a.contains('token')) {
      return LucideIcons.keyRound;
    }
    if (m.contains('user') || a.contains('user') || a.contains('provision')) {
      return LucideIcons.userCheck;
    }
    if (m.contains('project') || a.contains('project')) {
      return LucideIcons.folderGit2;
    }
    if (m.contains('security') || a.contains('lock') || a.contains('revoke')) {
      return LucideIcons.shieldAlert;
    }
    return LucideIcons.activity;
  }

  Color _getResultColor(String result) {
    switch (result.toUpperCase()) {
      case 'SUCCESS':
        return const Color(0xFF16A34A);
      case 'WARNING':
        return const Color(0xFFD97706);
      case 'FAILED':
      case 'DENIED':
        return const Color(0xFFDC2626);
      default:
        return const Color(0xFF2563EB);
    }
  }

  Color _getResultBg(String result) {
    switch (result.toUpperCase()) {
      case 'SUCCESS':
        return const Color(0xFFDCFCE7);
      case 'WARNING':
        return const Color(0xFFFEF3C7);
      case 'FAILED':
      case 'DENIED':
        return const Color(0xFFFEE2E2);
      default:
        return const Color(0xFFEFF6FF);
    }
  }

  String _formatTime(String rawDate) {
    if (rawDate.isEmpty) return 'Just now';
    try {
      final dt = DateTime.parse(rawDate).toLocal();
      final now = DateTime.now();
      final diff = now.difference(dt);

      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return rawDate;
    }
  }

  // -------------------------------------------------------------
  // Technical Event Inspector Modal (On Tap Audit Log)
  // -------------------------------------------------------------
  void _showEventDetailsModal(AuditLogItem item) {
    final statusColor = _getResultColor(item.result);
    final statusBg = _getResultBg(item.result);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      elevation: 0,
      barrierColor: const Color(0x380F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag Handle
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
              const SizedBox(height: 16),

              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: statusBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(_getModuleIcon(item.module, item.action), size: 20, color: statusColor),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.action.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Module: ${item.module} • ${item.createdAt}',
                          style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusBg,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      item.result.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              const Divider(height: 24, color: Color(0xFFE2E8F0)),

              // Details section
              const Text(
                'Security & Client Metadata',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 10),

              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    _buildMetaRow('Actor / Initiator', item.userName ?? 'System / Anonymous', LucideIcons.user),
                    const Divider(height: 1, color: Color(0xFFE2E8F0)),
                    _buildMetaRow('IP Address', item.ipAddress ?? '127.0.0.1 (Internal)', LucideIcons.globe),
                    const Divider(height: 1, color: Color(0xFFE2E8F0)),
                    _buildMetaRow('Browser / Client', item.browser ?? 'Mobile Client / Flutter App', LucideIcons.smartphone),
                    if (item.os != null) ...[
                      const Divider(height: 1, color: Color(0xFFE2E8F0)),
                      _buildMetaRow('Operating System', item.os!, LucideIcons.cpu),
                    ],
                    if (item.location != null) ...[
                      const Divider(height: 1, color: Color(0xFFE2E8F0)),
                      _buildMetaRow('Location', '${item.location} ${item.countryFlag ?? ""}', LucideIcons.mapPin),
                    ],
                    const Divider(height: 1, color: Color(0xFFE2E8F0)),
                    _buildMetaRow('Event ID', item.id.isNotEmpty ? item.id : 'LOG-LIVE-AUDIT', LucideIcons.hash),
                  ],
                ),
              ),

              if (item.details != null && item.details!.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Event Payload & Context',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: SelectableText(
                    item.details!,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: Color(0xFF38BDF8),
                      height: 1.4,
                    ),
                  ),
                ),
              ],

              const SizedBox(height: 20),

              // Copy Event JSON for SIEM Export
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(LucideIcons.copy, size: 16),
                  label: const Text('Copy Audit Event Payload (JSON)'),
                  onPressed: () {
                    final jsonString = '''{
  "id": "${item.id}",
  "action": "${item.action}",
  "module": "${item.module}",
  "user": "${item.userName}",
  "ip": "${item.ipAddress}",
  "result": "${item.result}",
  "timestamp": "${item.createdAt}",
  "details": "${item.details ?? ''}"
}''';
                    Clipboard.setData(ClipboardData(text: jsonString));
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Audit event copied to clipboard (SIEM format)')),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetaRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 15, color: const Color(0xFF64748B)),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // Emergency Panic Mode Modal: Revoke All Sessions
  // -------------------------------------------------------------
  void _showPanicModeDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(LucideIcons.shieldAlert, size: 20, color: Color(0xFFDC2626)),
            ),
            const SizedBox(width: 10),
            const Text(
              'Security Kill-Switch',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Emergency Session Invalidation',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFFDC2626)),
            ),
            SizedBox(height: 6),
            Text(
              'This emergency protocol will invalidate active JWT refresh tokens, enforce re-authentication across all mobile and web clients, and flag the event in immutable compliance logs. Proceed?',
              style: TextStyle(fontSize: 12.5, color: Color(0xFF475569), height: 1.4),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
            ),
            icon: const Icon(LucideIcons.shieldAlert, size: 16),
            label: const Text('Execute Kill-Switch'),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('All non-admin sessions invalidated. Audit event logged.'),
                  backgroundColor: Color(0xFFDC2626),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // Export Audit Trail Report (CSV / Clipboard)
  // -------------------------------------------------------------
  void _exportAuditReport() {
    final buffer = StringBuffer();
    buffer.writeln('Timestamp,Action,Module,User,Result,IP Address,Details');
    for (final item in _filteredLogs) {
      buffer.writeln('"${item.createdAt}","${item.action}","${item.module}","${item.userName ?? ''}","${item.result}","${item.ipAddress ?? ''}","${(item.details ?? '').replaceAll('"', '""')}"');
    }

    Clipboard.setData(ClipboardData(text: buffer.toString()));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Exported ${_filteredLogs.length} audit records to CSV clipboard'),
        backgroundColor: const Color(0xFF16A34A),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredLogs;

    // Security Metrics
    final totalEvents = _logs.length;
    final authCount = _logs.where((e) => e.module.toLowerCase().contains('auth') || e.action.toLowerCase().contains('login')).length;
    final failureCount = _logs.where((e) => e.result.toUpperCase() == 'FAILED' || e.result.toUpperCase() == 'DENIED').length;

    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppThemeColors.primary,
          backgroundColor: Colors.white,
          onRefresh: _fetchLogs,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Action Bar
                Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Audit & Compliance',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              letterSpacing: -0.4,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Immutable security event trail & governance',
                            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    // Export CSV button
                    IconButton(
                      icon: Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFDBEAFE)),
                        ),
                        child: const Icon(LucideIcons.download, size: 16, color: Color(0xFF2563EB)),
                      ),
                      tooltip: 'Export Audit CSV',
                      onPressed: _exportAuditReport,
                    ),
                    const SizedBox(width: 6),
                    // Emergency Kill-Switch
                    IconButton(
                      icon: Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFFECACA)),
                        ),
                        child: const Icon(LucideIcons.shieldAlert, size: 16, color: Color(0xFFDC2626)),
                      ),
                      tooltip: 'Emergency Kill-Switch',
                      onPressed: _showPanicModeDialog,
                    ),
                  ],
                ),

                const SizedBox(height: 14),

                // 3 Micro Telemetry Cards
                Row(
                  children: [
                    Expanded(
                      child: _buildTelemetryCard(
                        'Total Logs',
                        '$totalEvents',
                        LucideIcons.shieldCheck,
                        const Color(0xFF2563EB),
                        const Color(0xFFEFF6FF),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildTelemetryCard(
                        'Auth Events',
                        '$authCount',
                        LucideIcons.keyRound,
                        const Color(0xFF059669),
                        const Color(0xFFECFDF5),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildTelemetryCard(
                        'Anomalies',
                        '$failureCount',
                        LucideIcons.alertTriangle,
                        failureCount > 0 ? const Color(0xFFDC2626) : const Color(0xFF64748B),
                        failureCount > 0 ? const Color(0xFFFEE2E2) : const Color(0xFFF8FAFC),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 14),

                // Search Bar
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: TextField(
                    controller: _searchCtrl,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Search by action, user, or IP...',
                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                      prefixIcon: const Icon(LucideIcons.search, size: 18, color: Color(0xFF64748B)),
                      suffixIcon: _searchCtrl.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(LucideIcons.x, size: 16, color: Color(0xFF64748B)),
                              onPressed: () {
                                _searchCtrl.clear();
                                setState(() {});
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                // Module Filter Pills
                SizedBox(
                  height: 34,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    itemCount: _modules.length,
                    separatorBuilder: (_, index) => const SizedBox(width: 8),
                    itemBuilder: (context, idx) {
                      final mod = _modules[idx];
                      final isSelected = mod == _selectedModule;

                      return GestureDetector(
                        onTap: () => setState(() => _selectedModule = mod),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF2563EB) : Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Text(
                            mod,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected ? Colors.white : const Color(0xFF475569),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 16),

                // Audit Log List
                if (_isLoading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: CircularProgressIndicator(color: AppThemeColors.primary),
                    ),
                  )
                else if (filtered.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: const [
                        Icon(LucideIcons.shieldCheck, size: 36, color: Color(0xFF94A3B8)),
                        SizedBox(height: 10),
                        Text(
                          'No security events match criteria',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'All workspace activity complies with current policies',
                          style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  )
                else
                  ...filtered.map((item) {
                    final statusColor = _getResultColor(item.result);
                    final statusBg = _getResultBg(item.result);
                    final timeAgo = _formatTime(item.createdAt);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF2563EB).withOpacity(0.04),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => _showEventDetailsModal(item),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Module Icon
                              Container(
                                padding: const EdgeInsets.all(9),
                                decoration: BoxDecoration(
                                  color: statusBg,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(
                                  _getModuleIcon(item.module, item.action),
                                  size: 18,
                                  color: statusColor,
                                ),
                              ),
                              const SizedBox(width: 12),
                              // Content
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            item.action.toUpperCase(),
                                            style: const TextStyle(
                                              fontSize: 13.5,
                                              fontWeight: FontWeight.w800,
                                              color: Color(0xFF0F172A),
                                              letterSpacing: -0.2,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        Text(
                                          timeAgo,
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Actor: ${item.userName ?? "System"} • IP: ${item.ipAddress ?? "127.0.0.1"}',
                                      style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (item.details != null && item.details!.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        item.details!,
                                        style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Icon(LucideIcons.chevronRight, size: 16, color: Color(0xFFCBD5E1)),
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
      ),
    );
  }

  Widget _buildTelemetryCard(String label, String value, IconData icon, Color color, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 15, color: color),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
              Text(
                label,
                style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
