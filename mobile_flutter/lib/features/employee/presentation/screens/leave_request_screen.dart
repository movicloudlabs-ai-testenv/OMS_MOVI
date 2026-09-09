import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../../theme/app_colors.dart';
import '../../../../theme/app_typography.dart';
import '../../../../core/widgets/screen_container.dart';
import '../../../../core/widgets/custom_card.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/custom_input.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../models/leave_item.dart';
import '../../data/employee_api.dart';

class LeaveRequestScreen extends StatefulWidget {
  const LeaveRequestScreen({super.key});

  @override
  State<LeaveRequestScreen> createState() => _LeaveRequestScreenState();
}

class _LeaveRequestScreenState extends State<LeaveRequestScreen> {
  final EmployeeApi _api = EmployeeApi();
  LeaveBalance? _balance;
  List<LeaveRequestItem> _requests = [];
  bool _showForm = false;

  String _leaveType = 'casual';
  final TextEditingController _startController = TextEditingController();
  final TextEditingController _endController = TextEditingController();
  final TextEditingController _reasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _startController.dispose();
    _endController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final bal = await _api.getLeaveBalance();
      final reqs = await _api.getMyLeaveRequests();
      if (mounted) {
        setState(() {
          _balance = bal;
          _requests = reqs;
        });
      }
    } catch (_) {}
  }

  Future<void> _pickDate(TextEditingController controller) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              surface: AppColors.darkSurface,
              onSurface: AppColors.darkText,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      controller.text = DateFormat('yyyy-MM-dd').format(picked);
    }
  }

  Future<void> _applyLeave() async {
    if (_startController.text.isEmpty ||
        _endController.text.isEmpty ||
        _reasonController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select start date, end date, and provide a reason.'),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    try {
      await _api.applyLeave(
        leaveType: _leaveType,
        startDate: _startController.text,
        endDate: _endController.text,
        reason: _reasonController.text.trim(),
      );
      setState(() {
        _showForm = false;
        _startController.clear();
        _endController.clear();
        _reasonController.clear();
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Leave request submitted successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
      _loadData();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to submit leave request'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ScreenContainer(
      onRefresh: _loadData,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Leave Management', style: AppTypography.headingXl(color: AppColors.darkText)),
                  const SizedBox(height: 2),
                  Text('Quota balances & time-off requests', style: AppTypography.bodySm(color: AppColors.darkTextMuted)),
                ],
              ),
              IconButton(
                icon: Icon(
                  _showForm ? LucideIcons.x : LucideIcons.plus,
                  color: AppColors.primaryLight,
                ),
                onPressed: () => setState(() => _showForm = !_showForm),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Leave Balance Row
          Row(
            children: [
              Expanded(
                child: _buildBalanceCard(
                  'Casual',
                  _balance?.casualLeave.remaining ?? 8,
                  _balance?.casualLeave.total ?? 12,
                  AppColors.primaryLight,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildBalanceCard(
                  'Sick',
                  _balance?.sickLeave.remaining ?? 5,
                  _balance?.sickLeave.total ?? 8,
                  AppColors.warning,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildBalanceCard(
                  'Earned',
                  _balance?.earnedLeave.remaining ?? 12,
                  _balance?.earnedLeave.total ?? 15,
                  AppColors.success,
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Apply Form
          if (_showForm)
            CustomCard(
              padding: const EdgeInsets.all(16),
              borderColor: AppColors.primary,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Apply for Time Off', style: AppTypography.headingLg(color: AppColors.darkText)),
                  const SizedBox(height: 12),
                  Text('LEAVE TYPE', style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _buildTypeChip('Casual', 'casual'),
                      const SizedBox(width: 8),
                      _buildTypeChip('Sick', 'sick'),
                      const SizedBox(width: 8),
                      _buildTypeChip('Earned', 'earned'),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => _pickDate(_startController),
                          child: IgnorePointer(
                            child: CustomInput(
                              label: 'Start Date',
                              hintText: 'YYYY-MM-DD',
                              controller: _startController,
                              prefixIcon: const Icon(LucideIcons.calendar, size: 16, color: AppColors.darkTextDim),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: InkWell(
                          onTap: () => _pickDate(_endController),
                          child: IgnorePointer(
                            child: CustomInput(
                              label: 'End Date',
                              hintText: 'YYYY-MM-DD',
                              controller: _endController,
                              prefixIcon: const Icon(LucideIcons.calendar, size: 16, color: AppColors.darkTextDim),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  CustomInput(
                    label: 'Reason',
                    hintText: 'Reason for leave application...',
                    controller: _reasonController,
                    maxLines: 2,
                  ),
                  const SizedBox(height: 16),
                  CustomButton(
                    text: 'Submit Application',
                    onPressed: _applyLeave,
                    icon: const Icon(LucideIcons.send, size: 16, color: Colors.white),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 14),

          // Request History
          Text('Leave History', style: AppTypography.headingLg(color: AppColors.darkText)),
          const SizedBox(height: 10),
          if (_requests.isEmpty)
            const CustomCard(
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('No leave applications recorded', style: TextStyle(color: AppColors.darkTextMuted)),
                ),
              ),
            )
          else
            ..._requests.map(
              (r) => CustomCard(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${r.leaveType.toUpperCase()} LEAVE • ${r.days} DAY(S)',
                          style: AppTypography.captionXs(color: AppColors.primaryLight).copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        StatusBadge(label: r.status, variant: r.status),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${r.startDate} to ${r.endDate}',
                      style: AppTypography.bodyMd(color: AppColors.darkText).copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(r.reason, style: AppTypography.bodySm(color: AppColors.darkTextMuted)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBalanceCard(String title, int remaining, int total, Color accent) {
    return CustomCard(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTypography.captionXs(color: AppColors.darkTextMuted)),
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '$remaining',
                style: AppTypography.headingXl(color: accent),
              ),
              Text(
                ' / $total',
                style: AppTypography.captionXs(color: AppColors.darkTextDim),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text('days left', style: AppTypography.captionXs(color: AppColors.darkTextDim)),
        ],
      ),
    );
  }

  Widget _buildTypeChip(String label, String value) {
    final active = _leaveType == value;
    return InkWell(
      onTap: () => setState(() => _leaveType = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : AppColors.darkBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: active ? AppColors.primary : AppColors.darkBorder),
        ),
        child: Text(
          label,
          style: AppTypography.captionXs(color: active ? Colors.white : AppColors.darkTextMuted),
        ),
      ),
    );
  }
}
