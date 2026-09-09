import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../theme/app_colors.dart';
import '../../../../theme/app_typography.dart';
import '../../../../core/widgets/screen_container.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/custom_input.dart';
import '../../data/employee_api.dart';

class EodReportScreen extends StatefulWidget {
  const EodReportScreen({super.key});

  @override
  State<EodReportScreen> createState() => _EodReportScreenState();
}

class _EodReportScreenState extends State<EodReportScreen> {
  final EmployeeApi _api = EmployeeApi();
  final TextEditingController _hoursController = TextEditingController(text: '8.0');
  final TextEditingController _completedController = TextEditingController();
  final TextEditingController _blockersController = TextEditingController();
  final TextEditingController _tomorrowController = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _hoursController.dispose();
    _completedController.dispose();
    _blockersController.dispose();
    _tomorrowController.dispose();
    super.dispose();
  }

  Future<void> _submitEod() async {
    final completed = _completedController.text.trim();
    final tomorrow = _tomorrowController.text.trim();
    final hours = double.tryParse(_hoursController.text) ?? 8.0;

    if (completed.isEmpty || tomorrow.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please list completed tasks and plans for tomorrow.'),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await _api.submitEodReport(
        tasksCompleted: completed,
        blockers: _blockersController.text.trim(),
        plansTomorrow: tomorrow,
        hoursWorked: hours,
      );

      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: AppColors.darkSurface,
            title: const Text('EOD Report Submitted', style: TextStyle(color: AppColors.darkText)),
            content: const Text(
              'Your daily work summary has been recorded and submitted to your project manager.',
              style: TextStyle(color: AppColors.darkTextMuted),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _completedController.clear();
                  _blockersController.clear();
                  _tomorrowController.clear();
                },
                child: const Text('Done', style: TextStyle(color: AppColors.primaryLight)),
              ),
            ],
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to submit EOD report'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ScreenContainer(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Daily EOD Report', style: AppTypography.headingXl(color: AppColors.darkText)),
          const SizedBox(height: 2),
          Text('End-of-day progress, blockers & sync', style: AppTypography.bodySm(color: AppColors.darkTextMuted)),
          const SizedBox(height: 16),

          CustomCard(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CustomInput(
                  label: 'Hours Logged Today',
                  hintText: '8.0',
                  controller: _hoursController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  prefixIcon: const Icon(LucideIcons.clock, size: 16, color: AppColors.darkTextDim),
                ),
                const SizedBox(height: 14),

                CustomInput(
                  label: 'Tasks Accomplished Today',
                  hintText: 'Summary of completed tickets, deliverables, PRs merged...',
                  controller: _completedController,
                  maxLines: 4,
                ),
                const SizedBox(height: 14),

                CustomInput(
                  label: 'Blockers / Bottlenecks (Optional)',
                  hintText: 'Any dependencies, pending reviews, or blockers encountered...',
                  controller: _blockersController,
                  maxLines: 2,
                ),
                const SizedBox(height: 14),

                CustomInput(
                  label: 'Priorities for Tomorrow',
                  hintText: 'Key deliverables scheduled for the next workday...',
                  controller: _tomorrowController,
                  maxLines: 3,
                ),
                const SizedBox(height: 20),

                CustomButton(
                  text: 'Submit EOD Report',
                  onPressed: _submitEod,
                  isLoading: _submitting,
                  icon: const Icon(LucideIcons.send, size: 18, color: Colors.white),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
