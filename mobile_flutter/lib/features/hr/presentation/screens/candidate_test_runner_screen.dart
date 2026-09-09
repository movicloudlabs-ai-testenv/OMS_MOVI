import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../theme/theme.dart';
import '../../../../models/assessment_item.dart';
import '../../data/hr_api.dart';

class CandidateTestRunnerScreen extends StatefulWidget {
  final CandidateSessionInitResult sessionData;

  const CandidateTestRunnerScreen({
    super.key,
    required this.sessionData,
  });

  @override
  State<CandidateTestRunnerScreen> createState() => _CandidateTestRunnerScreenState();
}

class _CandidateTestRunnerScreenState extends State<CandidateTestRunnerScreen> with WidgetsBindingObserver {
  final HrApi _api = HrApi();
  late int _remainingSeconds;
  Timer? _timer;
  int _currentQuestionIndex = 0;
  final Map<String, int> _selectedAnswers = {}; // questionId -> optionIndex
  int _tabSwitchCount = 0;
  bool _isSubmitting = false;
  Map<String, dynamic>? _submissionResult;
  late DateTime _startedAt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startedAt = DateTime.now();
    _remainingSeconds = widget.sessionData.drive.durationMinutes * 60;
    _startTimer();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused) {
      if (_submissionResult == null && !_isSubmitting) {
        setState(() => _tabSwitchCount++);
        HapticFeedback.heavyImpact();
        _api.recordCandidateTabSwitch(widget.sessionData.sessionId);
      }
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds <= 1) {
        timer.cancel();
        _submitTest(isAutoSubmit: true);
      } else {
        setState(() => _remainingSeconds--);
      }
    });
  }

  String _formatTimer(int totalSeconds) {
    final mins = totalSeconds ~/ 60;
    final secs = totalSeconds % 60;
    return '${mins.toString().padLeft(2, "0")}:${secs.toString().padLeft(2, "0")}';
  }

  Future<void> _submitTest({bool isAutoSubmit = false}) async {
    if (_isSubmitting || _submissionResult != null) return;

    if (!isAutoSubmit) {
      final total = widget.sessionData.questions.length;
      final answered = _selectedAnswers.length;
      final unanswered = total - answered;

      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(LucideIcons.send, color: Color(0xFF2563EB), size: 20),
              SizedBox(width: 8),
              Text('Submit Assessment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('You have answered $answered of $total questions.', style: const TextStyle(fontSize: 13)),
              if (unanswered > 0) ...[
                const SizedBox(height: 8),
                Text(
                  '⚠️ $unanswered question${unanswered > 1 ? "s remain" : " remains"} unanswered.',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFB45309)),
                ),
              ],
              const SizedBox(height: 12),
              const Text('Are you sure you want to finish and submit your test?', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Continue Test', style: TextStyle(color: Color(0xFF64748B))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Confirm & Submit'),
            ),
          ],
        ),
      );

      if (confirmed != true) return;
    }

    setState(() => _isSubmitting = true);
    _timer?.cancel();

    final timeSpent = DateTime.now().difference(_startedAt).inSeconds;

    try {
      final res = await _api.submitCandidateAssessmentSession(
        sessionId: widget.sessionData.sessionId,
        answers: _selectedAnswers,
        timeSpentSeconds: timeSpent,
        tabSwitchCount: _tabSwitchCount,
      );

      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _submissionResult = res;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showQuestionMatrix() {
    final questions = widget.sessionData.questions;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
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
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Question Navigator', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                Text(
                  '${_selectedAnswers.length}/${questions.length} Answered',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
                ),
              ],
            ),
            const SizedBox(height: 16),

            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: questions.asMap().entries.map((entry) {
                final idx = entry.key;
                final q = entry.value;
                final isAnswered = _selectedAnswers.containsKey(q.id);
                final isCurrent = _currentQuestionIndex == idx;

                return InkWell(
                  onTap: () {
                    Navigator.pop(ctx);
                    setState(() => _currentQuestionIndex = idx);
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: isCurrent
                          ? const Color(0xFF2563EB)
                          : isAnswered
                              ? const Color(0xFFECFDF5)
                              : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isCurrent
                            ? const Color(0xFF2563EB)
                            : isAnswered
                                ? const Color(0xFF10B981)
                                : const Color(0xFFCBD5E1),
                        width: isCurrent ? 2 : 1,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '${idx + 1}',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: isCurrent
                            ? Colors.white
                            : isAnswered
                                ? const Color(0xFF065F46)
                                : const Color(0xFF475569),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_submissionResult != null) {
      return _buildCompletionView();
    }

    final questions = widget.sessionData.questions;
    if (questions.isEmpty) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('No questions found in this assessment drive.'),
              const SizedBox(height: 12),
              ElevatedButton(onPressed: () => context.go('/login'), child: const Text('Back to Login')),
            ],
          ),
        ),
      );
    }

    final currentQuestion = questions[_currentQuestionIndex];
    final selectedOption = _selectedAnswers[currentQuestion.id];

    // Timer color states
    final isAmber = _remainingSeconds < 300 && _remainingSeconds >= 60;
    final isRed = _remainingSeconds < 60;
    final timerBg = isRed
        ? const Color(0xFFFEE2E2)
        : isAmber
            ? const Color(0xFFFEF3C7)
            : const Color(0xFFEFF6FF);
    final timerColor = isRed
        ? const Color(0xFFDC2626)
        : isAmber
            ? const Color(0xFFB45309)
            : const Color(0xFF2563EB);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          _submitTest();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(LucideIcons.layoutGrid, size: 18, color: Color(0xFF0F172A)),
            onPressed: _showQuestionMatrix,
            tooltip: 'Question Matrix',
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.sessionData.drive.title,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                'Question ${_currentQuestionIndex + 1} of ${questions.length}',
                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              ),
            ],
          ),
          actions: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: timerBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: timerColor.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Icon(LucideIcons.clock, size: 13, color: timerColor),
                  const SizedBox(width: 5),
                  Text(
                    _formatTimer(_remainingSeconds),
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: timerColor),
                  ),
                ],
              ),
            ),
          ],
        ),
        body: SafeArea(
          child: Column(
            children: [
              // Proctor Tab Switch Alert Banner
              if (_tabSwitchCount > 0)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  color: const Color(0xFFFEF3C7),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.alertTriangle, size: 14, color: Color(0xFFB45309)),
                      const SizedBox(width: 6),
                      Text(
                        'Integrity Notice: $_tabSwitchCount window switch(es) detected and logged.',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF92400E)),
                      ),
                    ],
                  ),
                ),

              // Question Body
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Meta Chips
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(6)),
                            child: Text(
                              currentQuestion.category.toUpperCase(),
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF2563EB)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
                            child: Text(
                              '${currentQuestion.points} POINTS',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Question Prompt
                      Text(
                        currentQuestion.questionText,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A), height: 1.35),
                      ),

                      // Code Snippet Card if applicable
                      if (currentQuestion.codeSnippet != null && currentQuestion.codeSnippet!.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            currentQuestion.codeSnippet!,
                            style: const TextStyle(fontFamily: 'monospace', fontSize: 12, color: Color(0xFF38BDF8), height: 1.4),
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),

                      // Options
                      ...currentQuestion.options.asMap().entries.map((entry) {
                        final idx = entry.key;
                        final opt = entry.value;
                        final isSelected = selectedOption == idx;
                        final letter = String.fromCharCode(65 + idx); // A, B, C, D

                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: InkWell(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() {
                                _selectedAnswers[currentQuestion.id] = idx;
                              });
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFFEFF6FF) : Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                                  width: isSelected ? 1.5 : 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 28,
                                    height: 28,
                                    decoration: BoxDecoration(
                                      color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
                                      shape: BoxShape.circle,
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      letter,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w800,
                                        color: isSelected ? Colors.white : const Color(0xFF475569),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      opt,
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                        color: isSelected ? const Color(0xFF1E3A8A) : const Color(0xFF334155),
                                      ),
                                    ),
                                  ),
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

              // Bottom Control Bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: const Color(0xFFE2E8F0))),
                ),
                child: Row(
                  children: [
                    if (_currentQuestionIndex > 0)
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                        onPressed: () {
                          setState(() => _currentQuestionIndex--);
                        },
                        child: const Text('Previous', style: TextStyle(color: Color(0xFF475569), fontWeight: FontWeight.w700)),
                      ),
                    const Spacer(),
                    if (_currentQuestionIndex < questions.length - 1)
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        ),
                        onPressed: () {
                          setState(() => _currentQuestionIndex++);
                        },
                        child: const Row(
                          children: [
                            Text('Next', style: TextStyle(fontWeight: FontWeight.w700)),
                            SizedBox(width: 4),
                            Icon(LucideIcons.arrowRight, size: 14),
                          ],
                        ),
                      )
                    else
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        ),
                        onPressed: _isSubmitting ? null : () => _submitTest(),
                        child: _isSubmitting
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Submit Test', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── COMPLETION VIEW ──────────────────────────────────────────────────────

  Widget _buildCompletionView() {
    final data = _submissionResult ?? {};
    final score = (data['score'] as num?)?.toInt() ?? 0;
    final totalPoints = (data['totalPoints'] as num?)?.toInt() ?? 0;
    final percentage = (data['percentage'] as num?)?.toInt() ?? 0;
    final passed = data['passed'] == true;

    return Scaffold(
      backgroundColor: AppThemeColors.bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
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
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: passed ? const Color(0xFFECFDF5) : const Color(0xFFEFF6FF),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      passed ? LucideIcons.award : LucideIcons.checkCircle2,
                      size: 32,
                      color: passed ? const Color(0xFF10B981) : const Color(0xFF2563EB),
                    ),
                  ),
                  const SizedBox(height: 16),

                  const Text(
                    'Assessment Completed!',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.sessionData.drive.title,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 20),

                  // Score Box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: [
                        Text('$percentage%', style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: passed ? const Color(0xFF10B981) : const Color(0xFF2563EB))),
                        const SizedBox(height: 2),
                        Text('$score of $totalPoints Points Earned', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: passed ? const Color(0xFFECFDF5) : const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            passed ? 'PASSED CUTOFF CRITERIA ✓' : 'UNDER COMMITTEE REVIEW',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: passed ? const Color(0xFF065F46) : const Color(0xFFB45309),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  const Text(
                    'Your responses and integrity log have been securely transmitted to the HR Recruitment team. You will be notified via email for the next interview round.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                  ),
                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () => context.go('/login'),
                      child: const Text('Return to Portal', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
