import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../../models/project_item.dart';
import '../../data/pmo_api.dart';

/// ─── ENTERPRISE PROJECT SECRETS VAULT TAB ──────────────────────────────────
/// Zero-plaintext AES-256-GCM authenticated secrets management.
/// Supports multi-format export (.env, Docker, JSON), bulk paste .env parser,
/// real-time environment filtering, and audited access controls.
class ProjectSecretsVaultTab extends StatefulWidget {
  final ProjectItem project;
  final VoidCallback? onDataChanged;

  const ProjectSecretsVaultTab({
    super.key,
    required this.project,
    this.onDataChanged,
  });

  @override
  State<ProjectSecretsVaultTab> createState() => _ProjectSecretsVaultTabState();
}

class _ProjectSecretsVaultTabState extends State<ProjectSecretsVaultTab> {
  final PmoApi _api = PmoApi();
  String _selectedEnv = 'All';
  String _searchQuery = '';
  final TextEditingController _searchCtrl = TextEditingController();

  final List<String> _environments = ['All', 'Production', 'Staging', 'QA', 'Development'];

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  // ─── FILTERED CREDENTIALS ──────────────────────────────────────────────────
  List<ProjectCredential> get _filteredCredentials {
    return widget.project.credentials.where((cred) {
      final matchesEnv = _selectedEnv == 'All' ||
          cred.env.toLowerCase() == _selectedEnv.toLowerCase();
      final matchesSearch = _searchQuery.isEmpty ||
          cred.key.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          cred.description.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesEnv && matchesSearch;
    }).toList();
  }

  // ─── MODAL: REVEAL ENCRYPTED SECRET (AUDITED) ──────────────────────────────
  Future<void> _revealSecret(ProjectCredential cred) async {
    try {
      final plaintext = await _api.revealCredential(widget.project.id, cred.id);
      if (!mounted) return;

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          titlePadding: const EdgeInsets.fromLTRB(20, 18, 20, 10),
          contentPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(LucideIcons.keyRound, size: 18, color: Color(0xFF16A34A)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cred.key,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, fontFamily: 'monospace'),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '${cred.env.toUpperCase()} • AES-256-GCM',
                      style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Decrypted Plaintext Value (Access Audited):',
                style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: SelectableText(
                  plaintext,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF38BDF8),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: const Row(
                  children: [
                    Icon(LucideIcons.shieldCheck, size: 13, color: Color(0xFF16A34A)),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Decryption logged in immutable project compliance audit stream.',
                        style: TextStyle(fontSize: 10, color: Color(0xFF15803D), fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton.icon(
              icon: const Icon(LucideIcons.copy, size: 14),
              label: const Text('Copy .env Line', style: TextStyle(fontSize: 12)),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: '${cred.key}="$plaintext"'));
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Copied ${cred.key}="$plaintext" to clipboard'),
                    backgroundColor: const Color(0xFF16A34A),
                  ),
                );
              },
            ),
            ElevatedButton.icon(
              icon: const Icon(LucideIcons.clipboardCheck, size: 14),
              label: const Text('Copy Secret', style: TextStyle(fontSize: 12)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: plaintext));
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Plaintext secret copied to clipboard'),
                    backgroundColor: Color(0xFF16A34A),
                    duration: Duration(seconds: 2),
                  ),
                );
              },
            ),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Access Denied: $e'), backgroundColor: const Color(0xFFEF4444)),
      );
    }
  }

  // ─── MODAL: ADD SINGLE CREDENTIAL ──────────────────────────────────────────
  void _showAddCredentialModal() {
    final keyCtrl = TextEditingController();
    final valCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String env = _selectedEnv == 'All' ? 'Production' : _selectedEnv;
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
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 12),
              const Text('Store Encrypted Vault Secret', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
              const Text('Secured with field-level AES-256-GCM authenticated encryption at rest.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              const SizedBox(height: 14),

              TextField(
                controller: keyCtrl,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(
                  labelText: 'Secret Key Identifier *',
                  hintText: 'e.g. AWS_SECRET_ACCESS_KEY',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 10),

              TextField(
                controller: valCtrl,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Secret Plaintext Value *',
                  hintText: 'Enter value to encrypt...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  suffixIcon: IconButton(
                    icon: const Icon(LucideIcons.clipboard, size: 16),
                    tooltip: 'Paste from Clipboard',
                    onPressed: () async {
                      final data = await Clipboard.getData('text/plain');
                      if (data?.text != null) {
                        setMState(() => valCtrl.text = data!.text!);
                      }
                    },
                  ),
                ),
              ),
              const SizedBox(height: 10),

              DropdownButtonFormField<String>(
                value: ['Production', 'Staging', 'QA', 'Development'].contains(env) ? env : 'Production',
                items: ['Production', 'Staging', 'QA', 'Development']
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (v) => setMState(() => env = v!),
                decoration: InputDecoration(
                  labelText: 'Target Environment',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 10),

              TextField(
                controller: descCtrl,
                decoration: InputDecoration(
                  labelText: 'Description / Purpose',
                  hintText: 'Service auth credential for S3 integration',
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
                      : const Icon(LucideIcons.lock, size: 16),
                  label: Text(isSubmitting ? 'Encrypting & Storing...' : 'Encrypt & Store in Vault'),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (keyCtrl.text.trim().isEmpty || valCtrl.text.trim().isEmpty) return;
                          setMState(() => isSubmitting = true);
                          final nav = Navigator.of(ctx);
                          final messenger = ScaffoldMessenger.of(context);

                          try {
                            await _api.addCredential(widget.project.id, {
                              'key': keyCtrl.text.trim(),
                              'value': valCtrl.text.trim(),
                              'env': env,
                              'description': descCtrl.text.trim(),
                            });
                            nav.pop();
                            widget.onDataChanged?.call();
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

  // ─── MODAL: BULK IMPORT FROM .ENV (PASTE FORMAT) ────────────────────────────
  void _showBulkImportModal() {
    final rawEnvCtrl = TextEditingController();
    String targetEnv = _selectedEnv == 'All' ? 'Production' : _selectedEnv;
    List<Map<String, String>> parsedSecrets = [];
    bool isSubmitting = false;

    void parseInput(String text, void Function(void Function()) setMState) {
      final lines = text.split('\n');
      final List<Map<String, String>> list = [];
      for (final line in lines) {
        final trimmed = line.trim();
        if (trimmed.isEmpty || trimmed.startsWith('#')) continue;
        final eqIdx = trimmed.indexOf('=');
        if (eqIdx <= 0) continue;

        final k = trimmed.substring(0, eqIdx).trim().toUpperCase();
        var v = trimmed.substring(eqIdx + 1).trim();
        // Strip quotes if wrapped
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          if (v.length >= 2) v = v.substring(1, v.length - 1);
        }

        if (k.isNotEmpty) {
          list.add({'key': k, 'value': v});
        }
      }
      setMState(() => parsedSecrets = list);
    }

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
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(LucideIcons.fileText, size: 16, color: Color(0xFF2563EB)),
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Bulk Import .env Format', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        Text('Paste multi-line KEY=VALUE pairs to encrypt and import in batch.', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: ['Production', 'Staging', 'QA', 'Development'].contains(targetEnv) ? targetEnv : 'Production',
                      items: ['Production', 'Staging', 'QA', 'Development']
                          .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                          .toList(),
                      onChanged: (v) => setMState(() => targetEnv = v!),
                      decoration: InputDecoration(
                        labelText: 'Target Environment',
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    icon: const Icon(LucideIcons.clipboard, size: 14),
                    label: const Text('Paste .env', style: TextStyle(fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () async {
                      final data = await Clipboard.getData('text/plain');
                      if (data?.text != null) {
                        rawEnvCtrl.text = data!.text!;
                        parseInput(data.text!, setMState);
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 10),

              TextField(
                controller: rawEnvCtrl,
                maxLines: 5,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 11),
                decoration: InputDecoration(
                  labelText: 'Paste .env Raw Text',
                  hintText: 'DATABASE_URL="postgres://..."\nJWT_SECRET="xyz..."\nSTRIPE_KEY="pk_..."',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  alignLabelWithHint: true,
                ),
                onChanged: (val) => parseInput(val, setMState),
              ),
              const SizedBox(height: 8),

              // Parsed summary & chips
              if (parsedSecrets.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.checkCircle2, size: 14, color: Color(0xFF16A34A)),
                      const SizedBox(width: 6),
                      Text(
                        '${parsedSecrets.length} secrets parsed successfully',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF15803D)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  children: parsedSecrets.take(6).map((s) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      s['key']!,
                      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, fontFamily: 'monospace', color: Color(0xFF334155)),
                    ),
                  )).toList()
                    ..addAll(parsedSecrets.length > 6
                        ? [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              child: Text('+${parsedSecrets.length - 6} more', style: const TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                            )
                          ]
                        : []),
                ),
                const SizedBox(height: 12),
              ],

              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  icon: isSubmitting
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(LucideIcons.uploadCloud, size: 16),
                  label: Text(isSubmitting ? 'Encrypting & Importing...' : 'Import ${parsedSecrets.length} Secrets to $targetEnv'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                  ),
                  onPressed: (parsedSecrets.isEmpty || isSubmitting)
                      ? null
                      : () async {
                          setMState(() => isSubmitting = true);
                          final nav = Navigator.of(ctx);
                          final messenger = ScaffoldMessenger.of(context);

                          try {
                            final batchPayload = parsedSecrets.map((s) => {
                              'key': s['key'],
                              'value': s['value'],
                              'env': targetEnv,
                              'description': 'Bulk imported from .env format',
                            }).toList();

                            await _api.addCredentialsBatch(widget.project.id, batchPayload);
                            nav.pop();
                            widget.onDataChanged?.call();
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text('Successfully imported ${parsedSecrets.length} secrets to $targetEnv'),
                                backgroundColor: const Color(0xFF16A34A),
                              ),
                            );
                          } catch (e) {
                            setMState(() => isSubmitting = false);
                            messenger.showSnackBar(
                              SnackBar(content: Text('Import Failed: $e'), backgroundColor: const Color(0xFFEF4444)),
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

  // ─── MODAL: EXPORT VAULT (MULTIPLE ENTERPRISE FORMATS) ──────────────────────
  void _showExportModal() {
    String format = '.env';
    final creds = _filteredCredentials;

    String generateExportText(String fmt) {
      if (creds.isEmpty) return '# No secrets stored in vault.';
      final buf = StringBuffer();

      if (fmt == '.env') {
        buf.writeln('# -------------------------------------------------------------');
        buf.writeln('# Movi PMO Secrets Vault Export: ${widget.project.name} (${widget.project.code})');
        buf.writeln('# Environment: $_selectedEnv | Count: ${creds.length} secrets');
        buf.writeln('# Note: Values are masked at rest. Decrypt individually as needed.');
        buf.writeln('# -------------------------------------------------------------');
        for (final c in creds) {
          buf.writeln('${c.key}="${c.maskedValue}"');
        }
      } else if (fmt == '.env.example') {
        buf.writeln('# Template .env.example (Safe to commit to Git)');
        buf.writeln('# Project: ${widget.project.name}');
        for (final c in creds) {
          buf.writeln('${c.key}=');
        }
      } else if (fmt == 'Docker/Bash') {
        buf.writeln('# Docker / Shell Export Script');
        for (final c in creds) {
          buf.writeln('export ${c.key}="${c.maskedValue}"');
        }
      } else if (fmt == 'JSON') {
        buf.writeln('{');
        for (int i = 0; i < creds.length; i++) {
          final c = creds[i];
          final comma = (i < creds.length - 1) ? ',' : '';
          buf.writeln('  "${c.key}": "${c.maskedValue}"$comma');
        }
        buf.writeln('}');
      }
      return buf.toString();
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setMState) {
          final exportContent = generateExportText(format);
          return Padding(
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
                    decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(LucideIcons.share2, size: 16, color: Color(0xFF2563EB)),
                    ),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Export Vault Secrets', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                          Text('Generate and copy configuration in standard industry formats.', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Format selector chips
                Wrap(
                  spacing: 6,
                  children: ['.env', '.env.example', 'Docker/Bash', 'JSON'].map((fmt) {
                    final isSelected = format == fmt;
                    return ChoiceChip(
                      label: Text(fmt, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isSelected ? Colors.white : const Color(0xFF334155))),
                      selected: isSelected,
                      selectedColor: const Color(0xFF2563EB),
                      backgroundColor: const Color(0xFFF1F5F9),
                      onSelected: (_) => setMState(() => format = fmt),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),

                Container(
                  width: double.infinity,
                  constraints: const BoxConstraints(maxHeight: 180),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: SingleChildScrollView(
                    child: SelectableText(
                      exportContent,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: Color(0xFF38BDF8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton.icon(
                    icon: const Icon(LucideIcons.clipboardCopy, size: 16),
                    label: Text('Copy $format to Clipboard'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: exportContent));
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Vault exported as $format and copied to clipboard!'),
                          backgroundColor: const Color(0xFF16A34A),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ─── CREDENTIAL CARD WIDGET ─────────────────────────────────────────────────
  Widget _buildCredentialCard(ProjectCredential cred) {
    Color envColor = const Color(0xFF2563EB);
    Color envBg = const Color(0xFFEFF6FF);
    final envLower = cred.env.toLowerCase();
    if (envLower == 'production') {
      envColor = const Color(0xFF16A34A);
      envBg = const Color(0xFFDCFCE7);
    } else if (envLower == 'staging') {
      envColor = const Color(0xFFD97706);
      envBg = const Color(0xFFFEF3C7);
    } else if (envLower == 'qa') {
      envColor = const Color(0xFF7C3AED);
      envBg = const Color(0xFFF3E8FF);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
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
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                child: const Icon(LucideIcons.key, size: 15, color: Color(0xFF475569)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: InkWell(
                            onTap: () {
                              Clipboard.setData(ClipboardData(text: cred.key));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Key copied: ${cred.key}'),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            },
                            child: Text(
                              cred.key,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                fontFamily: 'monospace',
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: envBg,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            cred.env.toUpperCase(),
                            style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, color: envColor),
                          ),
                        ),
                      ],
                    ),
                    if (cred.description.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        cred.description,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                      ),
                    ],
                  ],
                ),
              ),
              PopupMenuButton<String>(
                icon: const Icon(LucideIcons.moreVertical, size: 16, color: Color(0xFF64748B)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                onSelected: (val) async {
                  if (val == 'reveal') {
                    _revealSecret(cred);
                  } else if (val == 'copy_key') {
                    Clipboard.setData(ClipboardData(text: cred.key));
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Copied key ${cred.key}')));
                  } else if (val == 'copy_env') {
                    Clipboard.setData(ClipboardData(text: '${cred.key}="${cred.maskedValue}"'));
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Copied ${cred.key} .env line')));
                  } else if (val == 'delete') {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (c) => AlertDialog(
                        title: const Text('Delete Secret?'),
                        content: Text('Are you sure you want to permanently delete "${cred.key}" from the project vault?'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
                            onPressed: () => Navigator.pop(c, true),
                            child: const Text('Delete', style: TextStyle(color: Colors.white)),
                          ),
                        ],
                      ),
                    );
                    if (confirm == true) {
                      await _api.deleteCredential(widget.project.id, cred.id);
                      widget.onDataChanged?.call();
                    }
                  }
                },
                itemBuilder: (ctx) => [
                  const PopupMenuItem(
                    value: 'reveal',
                    child: Row(
                      children: [
                        Icon(LucideIcons.eye, size: 14, color: Color(0xFF2563EB)),
                        SizedBox(width: 8),
                        Text('Reveal Plaintext (Audited)', style: TextStyle(fontSize: 12)),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'copy_key',
                    child: Row(
                      children: [
                        Icon(LucideIcons.copy, size: 14, color: Color(0xFF475569)),
                        SizedBox(width: 8),
                        Text('Copy Key Name', style: TextStyle(fontSize: 12)),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'copy_env',
                    child: Row(
                      children: [
                        Icon(LucideIcons.fileCode, size: 14, color: Color(0xFF475569)),
                        SizedBox(width: 8),
                        Text('Copy as .env line', style: TextStyle(fontSize: 12)),
                      ],
                    ),
                  ),
                  const PopupMenuDivider(),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(LucideIcons.trash2, size: 14, color: Color(0xFFEF4444)),
                        SizedBox(width: 8),
                        Text('Delete Secret', style: TextStyle(fontSize: 12, color: Color(0xFFEF4444))),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Masked value strip with quick reveal
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.lock, size: 12, color: Color(0xFF94A3B8)),
                const SizedBox(width: 6),
                const Expanded(
                  child: Text(
                    '••••••••••••••••',
                    style: TextStyle(fontSize: 11, letterSpacing: 2.5, color: Color(0xFF94A3B8), fontFamily: 'monospace'),
                  ),
                ),
                InkWell(
                  onTap: () => _revealSecret(cred),
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(LucideIcons.eye, size: 12, color: Color(0xFF2563EB)),
                        SizedBox(width: 4),
                        Text('Reveal', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final creds = widget.project.credentials;
    final filtered = _filteredCredentials;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 80),
      children: [
        // 1. Enterprise Security Notice Banner
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB).withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.shieldCheck, size: 16, color: Color(0xFF2563EB)),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Zero Plaintext Policy (AES-256-GCM)',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF1E40AF)),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Secrets are encrypted at rest. Every reveal and copy action is logged to immutable compliance audit trails.',
                      style: TextStyle(fontSize: 10.5, color: Color(0xFF3B82F6), height: 1.3),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 2. Responsive Header & Action Buttons (Zero Overflow)
        Row(
          children: [
            const Expanded(
              child: Text(
                'Environment Secrets',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 6),
            // Import .env button
            OutlinedButton.icon(
              onPressed: _showBulkImportModal,
              icon: const Icon(LucideIcons.fileInput, size: 12),
              label: const Text('Import', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF2563EB),
                side: const BorderSide(color: Color(0xFFBFDBFE)),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(width: 6),
            // Export .env button
            OutlinedButton.icon(
              onPressed: _showExportModal,
              icon: const Icon(LucideIcons.share2, size: 12),
              label: const Text('Export', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF0F172A),
                side: const BorderSide(color: Color(0xFFCBD5E1)),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(width: 6),
            // Store Secret primary button
            ElevatedButton.icon(
              onPressed: _showAddCredentialModal,
              icon: const Icon(LucideIcons.plus, size: 12),
              label: const Text('New', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F172A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // 3. Search Field & Environment Filtering Chips
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
              hintText: 'Filter secrets by key or description...',
              hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
              prefixIcon: const Icon(LucideIcons.search, size: 15, color: Color(0xFF94A3B8)),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(LucideIcons.x, size: 14),
                      onPressed: () {
                        _searchCtrl.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            ),
            onChanged: (val) => setState(() => _searchQuery = val.trim()),
          ),
        ),
        const SizedBox(height: 8),

        // Environment Filter Chips Horizontal Row
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: _environments.map((env) {
              final isSelected = _selectedEnv == env;
              final count = env == 'All'
                  ? creds.length
                  : creds.where((c) => c.env.toLowerCase() == env.toLowerCase()).length;

              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(env),
                      const SizedBox(width: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: isSelected ? Colors.white.withOpacity(0.25) : const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$count',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: isSelected ? Colors.white : const Color(0xFF475569),
                          ),
                        ),
                      ),
                    ],
                  ),
                  selected: isSelected,
                  selectedColor: const Color(0xFF2563EB),
                  backgroundColor: const Color(0xFFF1F5F9),
                  labelStyle: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : const Color(0xFF475569),
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  side: BorderSide.none,
                  onSelected: (_) => setState(() => _selectedEnv = env),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 12),

        // 4. Secret Cards or Rich Empty State
        if (filtered.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
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
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFDBEAFE)),
                  ),
                  child: const Icon(LucideIcons.lock, size: 22, color: Color(0xFF2563EB)),
                ),
                const SizedBox(height: 12),
                Text(
                  _searchQuery.isNotEmpty
                      ? 'No secrets matched "$_searchQuery"'
                      : (_selectedEnv != 'All'
                          ? 'No secrets stored in $_selectedEnv'
                          : 'No credentials in project vault'),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Add API keys, JWT tokens, database URLs, and infrastructure credentials.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  alignment: WrapAlignment.center,
                  children: [
                    ElevatedButton.icon(
                      icon: const Icon(LucideIcons.plus, size: 14),
                      label: const Text('Add Secret', style: TextStyle(fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      ),
                      onPressed: _showAddCredentialModal,
                    ),
                    OutlinedButton.icon(
                      icon: const Icon(LucideIcons.fileInput, size: 14),
                      label: const Text('Import .env File', style: TextStyle(fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF0F172A),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      ),
                      onPressed: _showBulkImportModal,
                    ),
                  ],
                ),
              ],
            ),
          )
        else
          ...filtered.map((cred) => _buildCredentialCard(cred)),

        const SizedBox(height: 80),
      ],
    );
  }
}
