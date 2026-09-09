import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/widgets/screen_container.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/custom_input.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../models/project_item.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../pmo/data/pmo_api.dart';

/// Enterprise Daily Activity & Timesheet Tracker
/// Modeled after Linear Timesheets, Toggl, and Rippling Early Talent Suite.
class DailyTrackerScreen extends ConsumerStatefulWidget {
  const DailyTrackerScreen({super.key});

  @override
  ConsumerState<DailyTrackerScreen> createState() => _DailyTrackerScreenState();
}

class _DailyTrackerScreenState extends ConsumerState<DailyTrackerScreen> {
  final TextEditingController _hoursController = TextEditingController(text: '3.0');
  final TextEditingController _tasksController = TextEditingController();
  final TextEditingController _learningsController = TextEditingController();
  final TextEditingController _blockersController = TextEditingController();

  String _selectedProject = 'Enterprise Mobile Cloud Hub';
  final List<String> _projectOptions = [
    'Enterprise Mobile Cloud Hub',
    'Authentication & Biometrics',
    'Real-Time Chat & Sockets',
    'Candidate Assessment Engine',
  ];

  // Live work stopwatch
  Timer? _stopwatchTimer;
  int _stopwatchSeconds = 0;
  bool _isStopwatchRunning = false;

  bool _isSubmitting = false;
  bool _submittedSuccess = false;

  // Mock historical timesheets for rich enterprise ledger
  final List<Map<String, dynamic>> _timesheetHistory = [
    {
      'date': 'Yesterday, Sep 7',
      'hours': 3.0,
      'project': 'Enterprise Mobile Cloud Hub',
      'tasks': 'Configured Riverpod role shell and verified biometric prompt tokens.',
      'status': 'Approved',
      'mentor': 'Sarah Jenkins',
    },
    {
      'date': 'Fri, Sep 5',
      'hours': 3.0,
      'project': 'Authentication & Biometrics',
      'tasks': 'Added single-border input decorators and halo focus rings to login screen.',
      'status': 'Approved',
      'mentor': 'Sarah Jenkins',
    },
    {
      'date': 'Thu, Sep 4',
      'hours': 3.0,
      'project': 'Candidate Assessment Engine',
      'tasks': 'Created candidate test runner session models and automated countdown timers.',
      'status': 'Approved',
      'mentor': 'Sarah Jenkins',
    },
    {
      'date': 'Wed, Sep 3',
      'hours': 3.0,
      'project': 'Enterprise Mobile Cloud Hub',
      'tasks': 'Integrated geofenced GPS location providers with 100m office perimeter validation.',
      'status': 'Approved',
      'mentor': 'Sarah Jenkins',
    },
  ];

  // Pomodoro & mood telemetry
  final PmoApi _pmoApi = PmoApi();
  List<ProjectItem> _projects = [];
  bool _isPomodoroMode = false;
  int _pomodoroSecondsRemaining = 25 * 60;
  int _pomodoroCompletedSessions = 3;

  String _selectedMood = '⚡ High Energy';
  final List<String> _moodOptions = [
    '⚡ High Energy',
    '🎯 Focused',
    '🧘 Balanced',
    '☕ Need Coffee',
    '🛑 Blocked',
  ];

  @override
  void initState() {
    super.initState();
    _fetchProjects();
  }

  Future<void> _fetchProjects() async {
    try {
      final p = await _pmoApi.getProjects();
      if (mounted) setState(() => _projects = p);
    } catch (_) {}
  }

  @override
  void dispose() {
    _stopwatchTimer?.cancel();
    _hoursController.dispose();
    _tasksController.dispose();
    _learningsController.dispose();
    _blockersController.dispose();
    super.dispose();
  }

  void _toggleStopwatch() {
    HapticFeedback.selectionClick();
    if (_isStopwatchRunning) {
      _stopwatchTimer?.cancel();
      setState(() => _isStopwatchRunning = false);
    } else {
      _stopwatchTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        if (_isPomodoroMode) {
          if (_pomodoroSecondsRemaining > 0) {
            setState(() => _pomodoroSecondsRemaining--);
          } else {
            _stopwatchTimer?.cancel();
            HapticFeedback.heavyImpact();
            setState(() {
              _isStopwatchRunning = false;
              _pomodoroCompletedSessions++;
              _pomodoroSecondsRemaining = 25 * 60;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('🎉 Pomodoro block completed! Total sessions today: $_pomodoroCompletedSessions'),
                backgroundColor: const Color(0xFF10B981),
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        } else {
          setState(() => _stopwatchSeconds++);
        }
      });
      setState(() => _isStopwatchRunning = true);
    }
  }

  void _resetStopwatch() {
    HapticFeedback.selectionClick();
    _stopwatchTimer?.cancel();
    setState(() {
      if (_isPomodoroMode) {
        _pomodoroSecondsRemaining = 25 * 60;
      } else {
        _stopwatchSeconds = 0;
      }
      _isStopwatchRunning = false;
    });
  }

  void _applyStopwatchToInput() {
    HapticFeedback.lightImpact();
    final double secs = _isPomodoroMode
        ? (_pomodoroCompletedSessions * 25 * 60).toDouble()
        : _stopwatchSeconds.toDouble();
    final hours = (secs / 3600).toStringAsFixed(1);
    setState(() {
      _hoursController.text = (double.tryParse(hours) ?? 0) <= 0 ? '1.0' : hours;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Applied $hours hrs to timesheet form.'),
        backgroundColor: const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String _formatDuration(int totalSeconds) {
    final h = totalSeconds ~/ 3600;
    final m = (totalSeconds % 3600) ~/ 60;
    final s = totalSeconds % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Future<void> _handleSubmit() async {
    final tasks = _tasksController.text.trim();
    final learnings = _learningsController.text.trim();
    final hours = double.tryParse(_hoursController.text.trim()) ?? 0.0;

    if (tasks.isEmpty || learnings.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please document both your completed tasks and key learnings.'),
          backgroundColor: Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    HapticFeedback.mediumImpact();

    await Future.delayed(const Duration(milliseconds: 600));

    if (mounted) {
      setState(() {
        _isSubmitting = false;
        _submittedSuccess = true;
        _timesheetHistory.insert(0, {
          'date': 'Today, ${DateFormat("MMM d").format(DateTime.now())}',
          'hours': hours > 0 ? hours : 8.0,
          'project': _selectedProject,
          'tasks': tasks,
          'status': 'In Review',
          'mentor': 'Sarah Jenkins',
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return ScreenContainer(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── 1. TOP HEADER ────────────────────────────────────────────────
          Row(
            children: [
              IconButton(
                icon: const Icon(LucideIcons.arrowLeft, color: Color(0xFF0F172A), size: 20),
                onPressed: () => context.pop(),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Daily Timesheet Tracker',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.3,
                      ),
                    ),
                    Text(
                      'Log deliverables, learnings & hours for mentor review',
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
                child: const Text(
                  '12.0 / 15h',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF1D4ED8)),
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),

          // ─── 2. WEEKLY HOURS DISTRIBUTION CHART ───────────────────────────
          _buildWeeklyHoursCard(),

          const SizedBox(height: 16),

          // Lead Project Timesheet Radar (if user leads any initiative)
          Builder(builder: (context) {
            final currentUserId = ref.watch(authProvider).user?.id ?? '';
            final leadProjects = _projects.where((p) => p.isUserLead(currentUserId)).toList();
            if (leadProjects.isNotEmpty) {
              return Column(
                children: [
                  _buildLeadTimesheetRadar(leadProjects),
                  const SizedBox(height: 16),
                ],
              );
            }
            return const SizedBox();
          }),

          // ─── 3. LIVE SHIFT STOPWATCH ───────────────────────────────────────
          _buildLiveStopwatchCard(),

          const SizedBox(height: 16),

          // ─── 4. LOG ENTRY FORM OR SUCCESS STATE ───────────────────────────
          if (_submittedSuccess)
            _buildSuccessStateCard()
          else
            _buildTimesheetEntryForm(),

          const SizedBox(height: 24),

          // ─── 5. HISTORICAL TIMESHEET LEDGER ───────────────────────────────
          const Row(
            children: [
              Icon(LucideIcons.history, size: 16, color: Color(0xFF475569)),
              SizedBox(width: 8),
              Text(
                'Recent Timesheet History',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          ..._timesheetHistory.map((item) => _buildHistoryCard(item)),

          const SizedBox(height: 30),
        ],
      ),
    );
  }

  // ─── WIDGET BUILDERS ───────────────────────────────────────────────────────

  Widget _buildWeeklyHoursCard() {
    final days = [
      {'day': 'Mon', 'hours': 3.0, 'done': true},
      {'day': 'Tue', 'hours': 3.0, 'done': true},
      {'day': 'Wed', 'hours': 3.0, 'done': true},
      {'day': 'Thu', 'hours': 3.0, 'done': true},
      {'day': 'Fri', 'hours': 0.0, 'done': false},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
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
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Week 3 Hours Progress',
                style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
              Text(
                '80% of 15h Goal',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Day by Day Bar chart
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: days.map((d) {
              final hours = d['hours'] as double;
              final isDone = d['done'] as bool;
              final heightPct = (hours / 3.0).clamp(0.08, 1.0);

              return Column(
                children: [
                  Text(
                    hours > 0 ? '${hours}h' : '-',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: isDone ? const Color(0xFF1E293B) : const Color(0xFF94A3B8),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: 24,
                    height: 54,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    alignment: Alignment.bottomCenter,
                    child: Container(
                      width: 24,
                      height: 54 * heightPct,
                      decoration: BoxDecoration(
                        gradient: isDone
                            ? const LinearGradient(
                                colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              )
                            : null,
                        color: isDone ? null : const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    d['day'] as String,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                  ),
                ],
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveStopwatchCard() {
    final displayTime = _isPomodoroMode
        ? _formatDuration(_pomodoroSecondsRemaining)
        : _formatDuration(_stopwatchSeconds);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _isPomodoroMode ? const Color(0xFFFED7AA) : const Color(0xFFE2E8F0),
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
          // Mode Switcher Tabs
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildTimerModeChip('Stopwatch', !_isPomodoroMode, () {
                      if (_isStopwatchRunning) _stopwatchTimer?.cancel();
                      setState(() {
                        _isPomodoroMode = false;
                        _isStopwatchRunning = false;
                      });
                    }),
                    _buildTimerModeChip('25m Pomodoro', _isPomodoroMode, () {
                      if (_isStopwatchRunning) _stopwatchTimer?.cancel();
                      setState(() {
                        _isPomodoroMode = true;
                        _isStopwatchRunning = false;
                      });
                    }),
                  ],
                ),
              ),
              if (_isPomodoroMode)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7ED),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFFFEDD5)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(LucideIcons.flame, size: 12, color: Color(0xFFEA580C)),
                      const SizedBox(width: 4),
                      Text(
                        '$_pomodoroCompletedSessions Done',
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFFC2410C)),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),

          // Timer display and controls
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _isStopwatchRunning
                      ? (_isPomodoroMode ? const Color(0xFFFFF7ED) : const Color(0xFFECFDF5))
                      : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _isStopwatchRunning
                        ? (_isPomodoroMode ? const Color(0xFFFDBA74) : const Color(0xFFA7F3D0))
                        : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Icon(
                  _isStopwatchRunning ? LucideIcons.timerReset : LucideIcons.play,
                  size: 20,
                  color: _isStopwatchRunning
                      ? (_isPomodoroMode ? const Color(0xFFEA580C) : const Color(0xFF10B981))
                      : const Color(0xFF2563EB),
                ),
              ),
              const SizedBox(width: 14),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isPomodoroMode ? 'Deep Work Focus Block' : 'Continuous Work Session',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      displayTime,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),

              // Controls
              Row(
                children: [
                  IconButton(
                    icon: const Icon(LucideIcons.rotateCcw, size: 16, color: Color(0xFF94A3B8)),
                    onPressed: _resetStopwatch,
                    tooltip: 'Reset',
                  ),
                  TextButton(
                    onPressed: _applyStopwatchToInput,
                    child: const Text('Apply', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                  ),
                  IconButton(
                    style: IconButton.styleFrom(
                      backgroundColor: _isStopwatchRunning
                          ? const Color(0xFFEF4444)
                          : (_isPomodoroMode ? const Color(0xFFEA580C) : const Color(0xFF2563EB)),
                      foregroundColor: Colors.white,
                    ),
                    icon: Icon(_isStopwatchRunning ? LucideIcons.pause : LucideIcons.play, size: 16),
                    onPressed: _toggleStopwatch,
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimerModeChip(String title, bool isSelected, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF0F172A).withOpacity(0.06),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Text(
          title,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildTimesheetEntryForm() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(LucideIcons.fileEdit, size: 17, color: Color(0xFF2563EB)),
              SizedBox(width: 8),
              Text(
                'Submit Today\'s Activity Report',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Project Selection
          const Text(
            'Target Project',
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedProject,
                isExpanded: true,
                icon: const Icon(LucideIcons.chevronDown, size: 16, color: Color(0xFF64748B)),
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                items: _projectOptions.map((p) {
                  return DropdownMenuItem(value: p, child: Text(p));
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedProject = val);
                },
              ),
            ),
          ),

          const SizedBox(height: 14),

          // Hours Worked
          CustomInput(
            label: 'Total Hours Worked',
            hintText: 'e.g. 3.0',
            controller: _hoursController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            isLightMode: true,
            prefixIcon: const Icon(LucideIcons.clock, size: 16, color: Color(0xFF94A3B8)),
          ),

          const SizedBox(height: 14),

          // Tasks Completed
          CustomInput(
            label: 'Sprint Deliverables Completed *',
            hintText: 'Document features built, bug fixes, or commits created today...',
            controller: _tasksController,
            isLightMode: true,
            maxLines: 3,
          ),

          const SizedBox(height: 14),

          // Concepts Learned
          CustomInput(
            label: 'Key Concepts & Architectural Learnings *',
            hintText: 'What design patterns, frameworks, or best practices did you apply?',
            controller: _learningsController,
            isLightMode: true,
            maxLines: 3,
          ),

          const SizedBox(height: 14),

          // Blockers / Support
          CustomInput(
            label: 'Blockers / Questions for Mentor Sarah (Optional)',
            hintText: 'Any PR reviews needed, blockers, or questions for standup...',
            controller: _blockersController,
            isLightMode: true,
            maxLines: 2,
          ),

          // Mood & Energy Check-in
          const Text(
            'Daily Sprint Energy & Mood Check-in',
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: _moodOptions.map((mood) {
                final isSelected = _selectedMood == mood;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: InkWell(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      setState(() => _selectedMood = mood);
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFFEFF6FF) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                          width: isSelected ? 1.5 : 1.0,
                        ),
                      ),
                      child: Text(
                        mood,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                          color: isSelected ? const Color(0xFF1D4ED8) : const Color(0xFF475569),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 20),

          CustomButton(
            text: 'Submit Timesheet to Mentor',
            onPressed: _handleSubmit,
            isLoading: _isSubmitting,
            icon: const Icon(LucideIcons.send, size: 16, color: Colors.white),
            height: 48,
          ),
        ],
      ),
    );
  }

  Widget _buildLeadTimesheetRadar(List<ProjectItem> leadProjects) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFFBEB), Color(0xFFFEF3C7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE68A)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF59E0B).withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: const BoxDecoration(
              color: Color(0xFFD97706),
              shape: BoxShape.circle,
            ),
            child: const Icon(LucideIcons.crown, size: 16, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Lead Timesheet Radar',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF78350F),
                  ),
                ),
                Text(
                  'All team contributor hours for ${leadProjects.first.code} are verified.',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF92400E),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessStateCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFA7F3D0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF10B981).withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: Color(0xFFECFDF5),
              shape: BoxShape.circle,
            ),
            child: const Icon(LucideIcons.checkCircle2, color: Color(0xFF10B981), size: 36),
          ),
          const SizedBox(height: 12),
          const Text(
            'Daily Timesheet Submitted!',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 4),
          const Text(
            'Your mentor Sarah Jenkins and PMO lead have received your activity logs for review and verification.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () {
              setState(() {
                _submittedSuccess = false;
                _tasksController.clear();
                _learningsController.clear();
                _blockersController.clear();
              });
            },
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFFCBD5E1)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Log Another Entry', style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryCard(Map<String, dynamic> item) {
    final status = item['status'] as String;
    final hours = item['hours'] as double;
    final isApproved = status == 'Approved';

    return CustomCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${hours}h Logged',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF1D4ED8)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    item['date'] as String,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                  ),
                ],
              ),
              StatusBadge(label: status, variant: isApproved ? 'success' : 'warning'),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            item['project'] as String,
            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
          ),
          const SizedBox(height: 3),
          Text(
            item['tasks'] as String,
            style: const TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.35),
          ),
        ],
      ),
    );
  }
}
