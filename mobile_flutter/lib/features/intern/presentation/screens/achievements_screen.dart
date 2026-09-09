import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

/// ── ENTERPRISE INTERN ACHIEVEMENTS & XP LEADERBOARD ─────────────────────────
/// Gamified talent development hub showcasing skill progression, lead milestones,
/// attendance streaks, and technical excellence badges.
class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({super.key});

  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen> {
  final int _currentXp = 2480;
  final int _nextLevelXp = 3000;
  final int _streakDays = 12;

  final List<Map<String, dynamic>> _badges = [
    {
      'title': 'Project Lead Pioneer',
      'category': 'Leadership',
      'desc': 'Designated as project lead and successfully coordinated sprint deliverables.',
      'icon': LucideIcons.crown,
      'color': const Color(0xFFF59E0B),
      'unlocked': true,
      'date': 'Aug 28, 2026',
      'xp': '+500 XP',
    },
    {
      'title': 'Zero-Bug Sprint',
      'category': 'Quality',
      'desc': 'Delivered 5 consecutive sprint tasks without a single P0/P1 defect.',
      'icon': LucideIcons.shieldCheck,
      'color': const Color(0xFF10B981),
      'unlocked': true,
      'date': 'Sep 02, 2026',
      'xp': '+350 XP',
    },
    {
      'title': 'Deep Focus Master',
      'category': 'Productivity',
      'desc': 'Completed 25 Pomodoro focus blocks in the Daily Tracker.',
      'icon': LucideIcons.timer,
      'color': const Color(0xFF2563EB),
      'unlocked': true,
      'date': 'Sep 05, 2026',
      'xp': '+250 XP',
    },
    {
      'title': 'Knowledge Hunter',
      'category': 'Learning',
      'desc': 'Completed 6 LMS technical skill modules with 100% quiz accuracy.',
      'icon': LucideIcons.bookOpen,
      'color': const Color(0xFF8B5CF6),
      'unlocked': true,
      'date': 'Sep 07, 2026',
      'xp': '+400 XP',
    },
    {
      'title': 'Lightning Reviewer',
      'category': 'Collaboration',
      'desc': 'Completed 10 peer pull request code reviews within 4 hours.',
      'icon': LucideIcons.zap,
      'color': const Color(0xFFEC4899),
      'unlocked': false,
      'date': 'In Progress (7/10)',
      'xp': '+300 XP',
    },
    {
      'title': 'Full-Time Conversion Ready',
      'category': 'Milestone',
      'desc': 'Earn 3,500 XP and receive mentor recommendation for senior engineer conversion.',
      'icon': LucideIcons.award,
      'color': const Color(0xFF6366F1),
      'unlocked': false,
      'date': 'Locked (2480/3500 XP)',
      'xp': '+1000 XP',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final progress = (_currentXp / _nextLevelXp).clamp(0.0, 1.0);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, size: 20, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Achievements & Honors',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0F172A),
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE2E8F0), height: 1),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero XP & Level Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F172A).withOpacity(0.20),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.5)),
                        ),
                        child: Row(
                          children: const [
                            Icon(LucideIcons.sparkles, size: 13, color: Color(0xFFF59E0B)),
                            SizedBox(width: 5),
                            Text(
                              'LEVEL 4 • SENIOR INTERN',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFFFBBF24),
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(LucideIcons.flame, size: 16, color: Color(0xFFEF4444)),
                          const SizedBox(width: 4),
                          Text(
                            '$_streakDays-Day Streak',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        '$_currentXp',
                        style: const TextStyle(
                          fontSize: 34,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -1,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '/ $_nextLevelXp XP',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '${(_nextLevelXp - _currentXp)} XP to Level 5',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF38BDF8),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: Colors.white.withOpacity(0.12),
                      color: const Color(0xFF38BDF8),
                      minHeight: 8,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Milestone Honors & Badges',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                Text(
                  '${_badges.where((b) => b['unlocked'] == true).length}/${_badges.length} Unlocked',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF2563EB),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Badges Grid
            ..._badges.map((badge) => _buildBadgeCard(badge)),
          ],
        ),
      ),
    );
  }

  Widget _buildBadgeCard(Map<String, dynamic> badge) {
    final bool unlocked = badge['unlocked'] as bool;
    final Color color = badge['color'] as Color;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: unlocked ? color.withOpacity(0.3) : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Badge Icon Container
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: unlocked ? color.withOpacity(0.12) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: unlocked ? color.withOpacity(0.25) : const Color(0xFFE2E8F0),
                ),
              ),
              child: Icon(
                badge['icon'] as IconData,
                size: 22,
                color: unlocked ? color : const Color(0xFF94A3B8),
              ),
            ),
            const SizedBox(width: 12),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Text(
                          badge['title'] as String,
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: unlocked ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: unlocked ? color.withOpacity(0.1) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          badge['xp'] as String,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: unlocked ? color : const Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    badge['desc'] as String,
                    style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B), height: 1.3),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(
                        unlocked ? LucideIcons.checkCircle2 : LucideIcons.lock,
                        size: 11,
                        color: unlocked ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        badge['date'] as String,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: unlocked ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
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
    );
  }
}
