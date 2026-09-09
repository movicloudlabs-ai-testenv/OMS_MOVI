import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/screen_container.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../core/widgets/status_badge.dart';
import 'achievements_screen.dart';

/// Enterprise Internship Curriculum & Learning Management Hub
/// Modeled after Google Early Career, Workday Learning, and Coursera Enterprise.
class LearningResourcesScreen extends StatefulWidget {
  final bool showBackButton;

  const LearningResourcesScreen({super.key, this.showBackButton = true});

  @override
  State<LearningResourcesScreen> createState() => _LearningResourcesScreenState();
}

class _LearningResourcesScreenState extends State<LearningResourcesScreen> {
  String _selectedTrack = 'All';
  final List<String> _tracks = ['All', 'Architecture', 'Security', 'Networking', 'DevOps & Cloud'];

  final List<Map<String, dynamic>> _modules = [
    {
      'id': 'mod-01',
      'title': 'Flutter & Riverpod Enterprise State Management',
      'track': 'Architecture',
      'duration': '45m read • 1h lab',
      'difficulty': 'Intermediate',
      'skills': ['Riverpod 2.6', 'AsyncNotifier', 'Provider Scopes'],
      'completed': true,
      'summary': 'Architecting robust offline-first state pipelines with automatic listeners and dependency injection.',
      'quizPassed': true,
    },
    {
      'id': 'mod-02',
      'title': 'Hardware-Backed Keystore & Biometric Auth in Mobile',
      'track': 'Security',
      'duration': '35m read • 45m lab',
      'difficulty': 'Advanced',
      'skills': ['LocalAuth', 'Biometrics', 'SecureStorage'],
      'completed': true,
      'summary': 'Implementing FaceID/Fingerprint biometric gateways and hardware enclave cryptographic storage.',
      'quizPassed': true,
    },
    {
      'id': 'mod-03',
      'title': 'GPS Geofencing with Anti-Spoof Telemetry & Radar',
      'track': 'Architecture',
      'duration': '50m read • 1.5h lab',
      'difficulty': 'Advanced',
      'skills': ['Geolocator', 'Haversine Metric', 'Mock Location Check'],
      'completed': true,
      'summary': 'Validating employee location within strict office perimeters and detecting mock GPS simulation.',
      'quizPassed': false,
    },
    {
      'id': 'mod-04',
      'title': 'Dio Network Interceptors & Automatic JWT Refresh Flows',
      'track': 'Networking',
      'duration': '40m read • 1h lab',
      'difficulty': 'Intermediate',
      'skills': ['Dio Interceptors', 'JWT Refresh', 'Bearer Tokens'],
      'completed': false,
      'summary': 'Handling 401 Unauthorized responses with silent token renewals and request retry queuing.',
      'quizPassed': false,
    },
    {
      'id': 'mod-05',
      'title': 'Role-Based Dynamic Navigation Shells with GoRouter',
      'track': 'Architecture',
      'duration': '30m read • 45m lab',
      'difficulty': 'Beginner',
      'skills': ['GoRouter', 'Role Routing', 'State Notifiers'],
      'completed': true,
      'summary': 'Configuring responsive floating bottom navigation shells dynamically tailored to user roles.',
      'quizPassed': true,
    },
    {
      'id': 'mod-06',
      'title': 'Docker Containerization & Multi-Stage Production Builds',
      'track': 'DevOps & Cloud',
      'duration': '1h read • 2h lab',
      'difficulty': 'Advanced',
      'skills': ['Docker', 'Alpine Linux', 'Nginx Reverse Proxy'],
      'completed': false,
      'summary': 'Creating minimal production container images and running automated microservice clusters.',
      'quizPassed': false,
    },
    {
      'id': 'mod-07',
      'title': 'Database Indexing & Aggregation Pipelines in MongoDB',
      'track': 'Networking',
      'duration': '45m read • 1h lab',
      'difficulty': 'Intermediate',
      'skills': ['MongoDB', 'Compound Indexes', 'Explain Plans'],
      'completed': false,
      'summary': 'Optimizing high-throughput query latency using compound indexes and pipeline facets.',
      'quizPassed': false,
    },
    {
      'id': 'mod-08',
      'title': 'Continuous Integration & GitHub Actions Mobile Pipelines',
      'track': 'DevOps & Cloud',
      'duration': '50m read • 1h lab',
      'difficulty': 'Intermediate',
      'skills': ['GitHub Actions', 'Fastlane', 'APK Signing'],
      'completed': false,
      'summary': 'Setting up automated static analysis, unit test suites, and staging artifact compilation.',
      'quizPassed': false,
    },
  ];

  void _toggleModuleCompletion(String id) {
    HapticFeedback.lightImpact();
    setState(() {
      final index = _modules.indexWhere((m) => m['id'] == id);
      if (index != -1) {
        _modules[index]['completed'] = !(_modules[index]['completed'] as bool);
      }
    });
  }

  void _showQuizModal(Map<String, dynamic> module) {
    HapticFeedback.selectionClick();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
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
            const SizedBox(height: 18),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(LucideIcons.fileCheck2, color: Color(0xFF2563EB), size: 20),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Skill Check & Quiz Assessment',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              module['title'] as String,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
            ),
            const SizedBox(height: 6),
            Text(
              module['summary'] as String,
              style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B), height: 1.4),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Row(
                children: [
                  Icon(LucideIcons.clock, size: 16, color: Color(0xFF64748B)),
                  SizedBox(width: 8),
                  Text(
                    '5 Multiple Choice Questions • 10 Minutes Time Limit',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Starting assessment session... All the best!'),
                      backgroundColor: Color(0xFF2563EB),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
                child: const Text('Start Knowledge Check', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final completedCount = _modules.where((m) => m['completed'] == true).length;
    final totalCount = _modules.length;
    final progressPct = ((completedCount / totalCount) * 100).toInt();

    final filteredList = _selectedTrack == 'All'
        ? _modules
        : _modules.where((m) => m['track'] == _selectedTrack).toList();

    return ScreenContainer(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── 1. TOP HEADER ────────────────────────────────────────────────
          Row(
            children: [
              if (widget.showBackButton && Navigator.canPop(context)) ...[
                IconButton(
                  icon: const Icon(LucideIcons.arrowLeft, color: Color(0xFF0F172A), size: 20),
                  onPressed: () => context.pop(),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
                const SizedBox(width: 12),
              ],
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Internship Curriculum Hub',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.3,
                      ),
                    ),
                    Text(
                      'Full-Stack Mobile & Cloud Pathway • 12-Week Syllabus',
                      style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Text(
                  '$completedCount / $totalCount Done',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF1D4ED8)),
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),

          // ─── 2. CERTIFICATION READINESS PROGRESS CARD ───────────────────────
          _buildCertificationCard(completedCount, totalCount, progressPct),

          const SizedBox(height: 18),

          // ─── SKILL COMPETENCY RADAR ───────────────────────────────────────
          _buildSkillCompetencyRadar(),

          const SizedBox(height: 16),

          // ─── RECOMMENDED NEXT LAB BANNER ──────────────────────────────────
          _buildRecommendedNextBanner(),

          const SizedBox(height: 18),

          // ─── 3. CURRICULUM TRACK TABS ─────────────────────────────────────
          _buildTrackTabs(),

          const SizedBox(height: 14),

          // ─── 4. MODULE CARDS LIST ─────────────────────────────────────────
          ...filteredList.map((m) => _buildModuleCard(m)),

          const SizedBox(height: 16),

          // ─── 5. TIMESHEET BANNER ──────────────────────────────────────────
          _buildDailyTimesheetShortcutBanner(),

          const SizedBox(height: 30),
        ],
      ),
    );
  }

  // ─── WIDGET BUILDERS ───────────────────────────────────────────────────────

  Widget _buildCertificationCard(int completed, int total, int pct) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.12),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB).withOpacity(0.25),
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: const Icon(LucideIcons.award, size: 16, color: Color(0xFF60A5FA)),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'CERTIFICATION READINESS',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF93C5FD),
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$pct%',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Verified OWMS Completion Certificate',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.2),
          ),
          const SizedBox(height: 4),
          const Text(
            'Complete all core engineering tracks and pass module quizzes to qualify for the final graduation review with lead architect Sarah.',
            style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8), height: 1.4),
          ),
          const SizedBox(height: 14),

          // Progress Track
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: pct / 100,
              backgroundColor: Colors.white.withOpacity(0.15),
              color: const Color(0xFF38BDF8),
              minHeight: 7,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$completed of $total Tracks Completed',
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFFCBD5E1)),
              ),
              const Row(
                children: [
                  Icon(LucideIcons.shieldCheck, size: 14, color: Color(0xFF38BDF8)),
                  SizedBox(width: 4),
                  Text(
                    'Mentored Credential',
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF38BDF8)),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSkillCompetencyRadar() {
    final skills = [
      {'label': 'Architecture & Sockets', 'pct': 0.85, 'color': const Color(0xFF2563EB)},
      {'label': 'Security & Biometrics', 'pct': 0.90, 'color': const Color(0xFF10B981)},
      {'label': 'Cloud & DevOps CI/CD', 'pct': 0.50, 'color': const Color(0xFFF59E0B)},
      {'label': 'Networking & JWT Auth', 'pct': 0.65, 'color': const Color(0xFF8B5CF6)},
      {'label': 'Lead Delegation & PMO', 'pct': 0.95, 'color': const Color(0xFFD97706)},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Icon(LucideIcons.sparkles, size: 16, color: Color(0xFF2563EB)),
                  SizedBox(width: 8),
                  Text(
                    'Skill Competency Matrix',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
              InkWell(
                onTap: () {
                  HapticFeedback.lightImpact();
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const AchievementsScreen()),
                  );
                },
                child: const Row(
                  children: [
                    Text(
                      'Honors & Badges',
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                    ),
                    SizedBox(width: 3),
                    Icon(LucideIcons.arrowRight, size: 12, color: Color(0xFF2563EB)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...skills.map((s) {
            final pct = s['pct'] as double;
            final color = s['color'] as Color;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        s['label'] as String,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                      ),
                      Text(
                        '${(pct * 100).toInt()}%',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: color),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: pct,
                      backgroundColor: const Color(0xFFF1F5F9),
                      color: color,
                      minHeight: 6,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildRecommendedNextBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFEFF6FF), Color(0xFFDBEAFE)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(LucideIcons.zap, size: 16, color: Colors.white),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Recommended Next Lab',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF1E3A8A)),
                ),
                Text(
                  'Docker & Microservice Clusters (+300 XP)',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF1D4ED8)),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Text(
              'Start Lab',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackTabs() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: _tracks.map((t) {
          final isSelected = _selectedTrack == t;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _selectedTrack = t);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF2563EB) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1),
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: const Color(0xFF2563EB).withOpacity(0.22),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  t,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : const Color(0xFF475569),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildModuleCard(Map<String, dynamic> item) {
    final isCompleted = item['completed'] as bool;
    final skills = (item['skills'] as List).cast<String>();

    return CustomCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Checkbox Toggle
              GestureDetector(
                onTap: () => _toggleModuleCompletion(item['id'] as String),
                child: Container(
                  padding: const EdgeInsets.all(2),
                  child: Icon(
                    isCompleted ? LucideIcons.checkCircle2 : LucideIcons.circle,
                    color: isCompleted ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                    size: 22,
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Title and Meta
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                item['track'] as String,
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFAF5FF),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFE9D5FF)),
                              ),
                              child: Text(
                                '+${item['xp'] ?? 250} XP',
                                style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF7E22CE)),
                              ),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            const Icon(LucideIcons.clock, size: 12, color: Color(0xFF94A3B8)),
                            const SizedBox(width: 4),
                            Text(
                              item['duration'] as String,
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item['title'] as String,
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF0F172A),
                        decoration: isCompleted ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item['summary'] as String,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.35),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Skill tags
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: skills.map((s) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFDBEAFE)),
                ),
                child: Text(
                  s,
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 12),
          const Divider(color: Color(0xFFF1F5F9), height: 1),
          const SizedBox(height: 10),

          // Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              StatusBadge(
                label: item['difficulty'] as String,
                variant: item['difficulty'] == 'Advanced' ? 'danger' : 'info',
              ),
              Row(
                children: [
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: const Icon(LucideIcons.fileText, size: 13, color: Color(0xFF475569)),
                    label: const Text('Guide', style: TextStyle(fontSize: 11.5, color: Color(0xFF334155), fontWeight: FontWeight.w600)),
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Opening module documentation for "${item['title']}"'),
                          backgroundColor: const Color(0xFF334155),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: const Icon(LucideIcons.checkSquare, size: 13, color: Colors.white),
                    label: const Text('Quiz', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                    onPressed: () => _showQuizModal(item),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDailyTimesheetShortcutBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(LucideIcons.clock, color: Color(0xFFD97706), size: 20),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Finished Lab or Self-Study?',
                  style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                SizedBox(height: 2),
                Text(
                  'Record hours spent on curriculum into your verified daily timesheet ledger.',
                  style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(LucideIcons.arrowRight, size: 18, color: Color(0xFF2563EB)),
            onPressed: () => context.push('/daily-tracker'),
          ),
        ],
      ),
    );
  }
}
