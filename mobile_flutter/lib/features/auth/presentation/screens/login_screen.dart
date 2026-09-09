import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../theme/app_colors.dart';
import '../../../../theme/app_typography.dart';
import 'package:flutter/services.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/custom_input.dart';
import '../../../../core/services/storage_service.dart';
import '../controllers/auth_controller.dart';
import '../../../hr/data/hr_api.dart';
import '../../../hr/presentation/screens/candidate_test_runner_screen.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final TextEditingController _identifierController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _showPassword = false;
  bool _rememberMe = true;
  String? _localError;
  bool _hasActiveAssessmentDrive = false;

  @override
  void initState() {
    super.initState();
    _restoreSavedAccount();
    _checkActiveAssessmentDrives();
  }

  Future<void> _checkActiveAssessmentDrives() async {
    try {
      final client = ApiClient();
      final res = await client.dio.get(ApiEndpoints.candidateSessionActiveStatus);
      final data = res.data['data'] ?? res.data;
      if (mounted && data is Map) {
        setState(() {
          _hasActiveAssessmentDrive = data['hasActiveDrives'] == true;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _hasActiveAssessmentDrive = false;
        });
      }
    }
  }

  Future<void> _restoreSavedAccount() async {
    final savedEmail = await StorageService.get(StorageKeys.rememberedEmail);
    if (savedEmail != null && savedEmail.isNotEmpty) {
      if (mounted) {
        setState(() {
          _identifierController.text = savedEmail;
        });
      }
    }
  }

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _fillRole(String email, String pass) {
    setState(() {
      _identifierController.text = email;
      _passwordController.text = pass;
      _localError = null;
    });
  }

  Future<void> _handleLogin() async {
    final identifier = _identifierController.text.trim();
    final password = _passwordController.text.trim();

    if (identifier.isEmpty || password.isEmpty) {
      setState(() {
        _localError = 'Please enter your email or Employee ID and password';
      });
      return;
    }

    setState(() {
      _localError = null;
    });

    if (_rememberMe) {
      await StorageService.set(StorageKeys.rememberedEmail, identifier);
    } else {
      await StorageService.delete(StorageKeys.rememberedEmail);
    }

    final success = await ref.read(authProvider.notifier).login(identifier, password);
    if (!success && mounted) {
      final err = ref.read(authProvider).errorMessage;
      setState(() {
        _localError = err ?? 'Login failed. Please verify your credentials.';
      });
    }
  }

  // ignore: unused_element
  Future<void> _handleBiometricAuth() async {
    final success = await ref.read(authProvider.notifier).biometricLogin();
    if (!success && mounted) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.darkSurface,
          title: const Text('Biometric Login', style: TextStyle(color: AppColors.darkText)),
          content: const Text(
            'No saved session found or authentication cancelled. Please sign in once with your corporate credentials to enable biometrics.',
            style: TextStyle(color: AppColors.darkTextMuted),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Understood', style: TextStyle(color: AppColors.primaryLight)),
            ),
          ],
        ),
      );
    }
  }

  void _handleForgotPassword() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.darkSurface,
        title: const Text('Reset Corporate Password', style: TextStyle(color: AppColors.darkText)),
        content: const Text(
          'For enterprise security, password resets must be initiated through your corporate IT portal or by contacting your HR administrator.',
          style: TextStyle(color: AppColors.darkTextMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Understood', style: TextStyle(color: AppColors.primaryLight)),
          ),
        ],
      ),
    );
  }

  void _showCandidateSessionModal() {
    HapticFeedback.lightImpact();
    final sessionCodeCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    bool isStarting = false;
    String? modalError;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.fromLTRB(20, 18, 20, MediaQuery.of(modalCtx).viewInsets.bottom + 24),
          child: SingleChildScrollView(
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
                const SizedBox(height: 16),
                const Row(
                  children: [
                    Icon(LucideIcons.keyRound, size: 20, color: Color(0xFF2563EB)),
                    SizedBox(width: 8),
                    Text(
                      'Candidate Assessment Access',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Enter your 8-digit test drive code provided by HR or campus drive coordinator.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 16),

                if (modalError != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.alertCircle, size: 14, color: Color(0xFFDC2626)),
                        const SizedBox(width: 6),
                        Expanded(child: Text(modalError!, style: const TextStyle(fontSize: 11.5, color: Color(0xFFDC2626), fontWeight: FontWeight.w600))),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Session Code Input
                TextField(
                  controller: sessionCodeCtrl,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(
                    labelText: 'Test Session Code *',
                    hintText: 'e.g. MOVI-FL-8931',
                    prefixIcon: const Icon(LucideIcons.hash, size: 16, color: Color(0xFF64748B)),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
                const SizedBox(height: 12),

                // Candidate Full Name
                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(
                    labelText: 'Full Legal Name *',
                    hintText: 'e.g. Maya Lin',
                    prefixIcon: const Icon(LucideIcons.user, size: 16, color: Color(0xFF64748B)),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
                const SizedBox(height: 12),

                // Candidate Email
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    labelText: 'Email Address *',
                    hintText: 'e.g. maya.lin@example.com',
                    prefixIcon: const Icon(LucideIcons.mail, size: 16, color: Color(0xFF64748B)),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
                const SizedBox(height: 12),

                // Optional Phone
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: 'Phone Number (Optional)',
                    prefixIcon: const Icon(LucideIcons.phone, size: 16, color: Color(0xFF64748B)),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
                const SizedBox(height: 20),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: isStarting
                        ? null
                        : () async {
                            final code = sessionCodeCtrl.text.trim();
                            final name = nameCtrl.text.trim();
                            final email = emailCtrl.text.trim();

                            if (code.isEmpty || name.isEmpty || email.isEmpty) {
                              setModalState(() => modalError = 'Please fill in Session Code, Full Name, and Email.');
                              return;
                            }

                            setModalState(() {
                              isStarting = true;
                              modalError = null;
                            });

                            final modalNav = Navigator.of(modalCtx);
                            final parentNav = Navigator.of(context);
                            final hrApi = HrApi();
                            final sessionResult = await hrApi.startCandidateAssessmentSession(
                              sessionCode: code,
                              candidateName: name,
                              candidateEmail: email,
                              candidatePhone: phoneCtrl.text.trim().isNotEmpty ? phoneCtrl.text.trim() : null,
                            );

                            setModalState(() => isStarting = false);

                            if (sessionResult != null) {
                              if (modalCtx.mounted) modalNav.pop();
                              parentNav.push(
                                MaterialPageRoute(
                                  builder: (_) => CandidateTestRunnerScreen(sessionData: sessionResult),
                                ),
                              );
                            } else {
                              setModalState(() => modalError = 'Invalid or expired session code, or test has no active questions.');
                            }
                          },
                    child: isStarting
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Initialize Exam Room', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF4F8FC),
      body: Container(
        decoration: const BoxDecoration(
          image: DecorationImage(
            image: AssetImage('assets/images/login_bg.jpg'),
            fit: BoxFit.cover,
            onError: null,
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            physics: const BouncingScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Navigation / Brand Bar
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(18),
                          child: Image.asset(
                            'assets/images/logo.png',
                            width: 36,
                            height: 36,
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) => Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(18),
                              ),
                              child: const Icon(LucideIcons.shield, color: Colors.white, size: 20),
                            ),
                          ),
                        ),
                        const SizedBox(width: 9),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'MOVI',
                              style: AppTypography.headingLg(color: const Color(0xFF0F172A))
                                  .copyWith(fontWeight: FontWeight.w900, letterSpacing: 0.5),
                            ),
                            Text(
                              'CLOUD LABS',
                              style: AppTypography.captionXs(color: AppColors.primary)
                                  .copyWith(fontWeight: FontWeight.w800, letterSpacing: 1.2),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Work Smarter.',
                          style: AppTypography.captionXs(color: const Color(0xFF0F172A))
                              .copyWith(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          'Go Further.',
                          style: AppTypography.captionXs(color: AppColors.primary)
                              .copyWith(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Hero Section
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 28,
                            height: 3.5,
                            decoration: BoxDecoration(
                              color: const Color(0xFF2563EB),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'ENTERPRISE WORKSPACE PLATFORM',
                            style: AppTypography.captionXs(color: const Color(0xFF2563EB)).copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Secure Access',
                            style: AppTypography.headingXl(color: const Color(0xFF0F172A))
                                .copyWith(fontWeight: FontWeight.w800),
                          ),
                          Text(
                            'to What Moves You',
                            style: AppTypography.headingLg(color: const Color(0xFF475569))
                                .copyWith(fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'People  •  Process  •  Progress',
                            style: AppTypography.captionXs(color: const Color(0xFF64748B)).copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Glassmorphic floating pill badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.8),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withOpacity(0.9)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: AppColors.success,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'BUILD',
                                style: AppTypography.captionXs(color: const Color(0xFF1E293B))
                                    .copyWith(fontWeight: FontWeight.w800, letterSpacing: 0.8),
                              ),
                              Text(
                                'CONNECT',
                                style: AppTypography.captionXs(color: const Color(0xFF1E293B))
                                    .copyWith(fontWeight: FontWeight.w800, letterSpacing: 0.8),
                              ),
                              Text(
                                'EMPOWER',
                                style: AppTypography.captionXs(color: const Color(0xFF1E293B))
                                    .copyWith(fontWeight: FontWeight.w800, letterSpacing: 0.8),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Elevated Sign-In Card
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0F172A).withOpacity(0.06),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sign In',
                        style: AppTypography.headingXl(color: const Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Enter your corporate credentials',
                        style: AppTypography.bodySm(color: const Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 20),

                      // Email / Employee ID
                      CustomInput(
                        label: 'Email or Employee ID',
                        hintText: 'you@company.com',
                        controller: _identifierController,
                        isLightMode: true,
                        prefixIcon: const Icon(LucideIcons.mail, size: 18, color: Color(0xFF94A3B8)),
                      ),

                      const SizedBox(height: 14),

                      // Password
                      CustomInput(
                        label: 'Password',
                        hintText: 'Enter your password',
                        controller: _passwordController,
                        obscureText: !_showPassword,
                        isLightMode: true,
                        prefixIcon: const Icon(LucideIcons.lock, size: 18, color: Color(0xFF94A3B8)),
                        suffixIcon: IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                          icon: Icon(
                            _showPassword ? LucideIcons.eyeOff : LucideIcons.eye,
                            size: 18,
                            color: const Color(0xFF94A3B8),
                          ),
                          onPressed: () {
                            setState(() {
                              _showPassword = !_showPassword;
                            });
                          },
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Remember Me & Forgot Password
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          InkWell(
                            onTap: () {
                              setState(() {
                                _rememberMe = !_rememberMe;
                              });
                            },
                            child: Row(
                              children: [
                                Container(
                                  width: 18,
                                  height: 18,
                                  decoration: BoxDecoration(
                                    color: _rememberMe ? AppColors.primary : Colors.transparent,
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(
                                      color: _rememberMe ? AppColors.primary : const Color(0xFFCBD5E1),
                                      width: 1.5,
                                    ),
                                  ),
                                  child: _rememberMe
                                      ? const Icon(LucideIcons.check, size: 12, color: Colors.white)
                                      : null,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Remember me',
                                  style: AppTypography.bodySm(color: const Color(0xFF475569)),
                                ),
                              ],
                            ),
                          ),
                          InkWell(
                            onTap: _handleForgotPassword,
                            child: Text(
                              'Forgot password?',
                              style: AppTypography.bodySm(color: AppColors.primary)
                                  .copyWith(fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),

                      if (_localError != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppColors.danger.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.danger.withOpacity(0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(LucideIcons.alertCircle, size: 16, color: AppColors.danger),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _localError!,
                                  style: AppTypography.captionXs(color: AppColors.danger)
                                      .copyWith(fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      const SizedBox(height: 20),

                      // Primary Sign In Button
                      CustomButton(
                        text: 'Sign In to Workspace',
                        onPressed: _handleLogin,
                        isLoading: authState.isLoading,
                        icon: const Icon(LucideIcons.arrowRight, size: 18, color: Colors.white),
                        iconAfterText: true,
                        height: 50,
                      ),

                      /*
                      const SizedBox(height: 16),

                      // Divider
                      Row(
                        children: [
                          const Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text(
                              'OR CONTINUE WITH',
                              style: AppTypography.captionXs(color: const Color(0xFF94A3B8))
                                  .copyWith(fontWeight: FontWeight.w700, letterSpacing: 0.6),
                            ),
                          ),
                          const Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Biometric Button
                      InkWell(
                        onTap: _handleBiometricAuth,
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(LucideIcons.fingerprint,
                                    size: 20, color: Color(0xFF2563EB)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Use FaceID / Biometrics',
                                  style: AppTypography.bodyMd(color: const Color(0xFF1E293B))
                                      .copyWith(fontWeight: FontWeight.w600),
                                ),
                              ),
                              const Icon(LucideIcons.chevronRight, size: 18, color: Color(0xFF94A3B8)),
                            ],
                          ),
                        ),
                      ),
                      */
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Demo Quick-Login Chips
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'DEMO QUICK-LOGIN',
                        style: AppTypography.captionXs(color: const Color(0xFF64748B)).copyWith(
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.0,
                        ),
                      ),
                      const SizedBox(height: 10),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        child: Row(
                          children: [
                            _buildRoleChip(
                              label: 'Admin',
                              icon: LucideIcons.user,
                              email: 'aswanthksv@gmail.com',
                              pass: 'Admin@123',
                            ),
                            _buildRoleChip(
                              label: 'HR',
                              icon: LucideIcons.users,
                              email: 'sarah.hr@owms.com',
                              pass: 'HR@123456',
                            ),
                            _buildRoleChip(
                              label: 'PMO',
                              icon: LucideIcons.clock,
                              email: 'pmo@owms.com',
                              pass: 'PMO@12345',
                            ),
                            /*
                            _buildRoleChip(
                              label: 'Employee',
                              icon: LucideIcons.briefcase,
                              email: 'alex.emp@owms.com',
                              pass: 'Emp@12345',
                            ),
                            */
                            _buildRoleChip(
                              label: 'Intern',
                              icon: LucideIcons.graduationCap,
                              email: 'rahul.intern@owms.com',
                              pass: 'Int@12345',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                if (_hasActiveAssessmentDrive) ...[
                  const SizedBox(height: 16),

                  // ─── CANDIDATE ASSESSMENT PORTAL GATEWAY CARD ────────────────
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F172A).withOpacity(0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: _showCandidateSessionModal,
                        borderRadius: BorderRadius.circular(16),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFDBEAFE)),
                                ),
                                child: const Icon(LucideIcons.fileCheck2, size: 20, color: Color(0xFF2563EB)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        const Text(
                                          'Candidate Assessment',
                                          style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                        ),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF2563EB),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: const Text(
                                            'TEST DRIVE',
                                            style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, color: Colors.white),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    const Text(
                                      'Enter session code to launch your examination room',
                                      style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(LucideIcons.chevronRight, size: 16, color: Color(0xFF2563EB)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],

                const SizedBox(height: 24),

                // Footer
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '© 2026 Movi Cloud Labs',
                      style: AppTypography.captionXs(color: const Color(0xFF94A3B8)),
                    ),
                    Row(
                      children: [
                        Text('Privacy', style: AppTypography.captionXs(color: const Color(0xFF64748B))),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 6),
                          child: Text('|', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10)),
                        ),
                        Text('Terms', style: AppTypography.captionXs(color: const Color(0xFF64748B))),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 6),
                          child: Text('|', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10)),
                        ),
                        Text('Support', style: AppTypography.captionXs(color: const Color(0xFF64748B))),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ignore: unused_element
  Widget _buildRoleChip({
    required String label,
    required IconData icon,
    required String email,
    required String pass,
  }) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: () => _fillRole(email, pass),
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 13, color: const Color(0xFF475569)),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: AppTypography.captionXs(color: const Color(0xFF334155))
                      .copyWith(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
