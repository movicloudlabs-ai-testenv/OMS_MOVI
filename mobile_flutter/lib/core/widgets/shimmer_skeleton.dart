import 'package:flutter/material.dart';

/// ── SHIMMER CONTROLLER & GRADIENT ENGINE ───────────────────────────────────────
/// High-performance 60fps shimmer effect across placeholder bones.
class ShimmerLoading extends StatefulWidget {
  final Widget child;
  final bool isLoading;

  const ShimmerLoading({
    super.key,
    required this.child,
    this.isLoading = true,
  });

  @override
  State<ShimmerLoading> createState() => _ShimmerLoadingState();
}

class _ShimmerLoadingState extends State<ShimmerLoading>
    with SingleTickerProviderStateMixin {
  late AnimationController _shimmerController;

  @override
  void initState() {
    super.initState();
    _shimmerController = AnimationController.unbounded(vsync: this)
      ..repeat(min: -1.0, max: 2.0, period: const Duration(milliseconds: 1400));
  }

  @override
  void dispose() {
    _shimmerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isLoading) return widget.child;

    return AnimatedBuilder(
      animation: _shimmerController,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            return LinearGradient(
              colors: const [
                Color(0xFFE2E8F0),
                Color(0xFFF8FAFC),
                Color(0xFFE2E8F0),
              ],
              stops: const [0.1, 0.5, 0.9],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              transform: _SlidingGradientTransform(slidePercent: _shimmerController.value),
            ).createShader(bounds);
          },
          child: widget.child,
        );
      },
    );
  }
}

class _SlidingGradientTransform extends GradientTransform {
  final double slidePercent;
  const _SlidingGradientTransform({required this.slidePercent});

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(bounds.width * slidePercent, 0.0, 0.0);
  }
}

/// ── BASIC SKELETON BONE ──────────────────────────────────────────────────────
class SkeletonBox extends StatelessWidget {
  final double? width;
  final double? height;
  final double borderRadius;

  const SkeletonBox({
    super.key,
    this.width,
    this.height,
    this.borderRadius = 8,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// ── SKELETON USER CARD ───────────────────────────────────────────────────────
class SkeletonUserCard extends StatelessWidget {
  const SkeletonUserCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SkeletonBox(width: 44, height: 44, borderRadius: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Expanded(child: SkeletonBox(height: 15, borderRadius: 4)),
                    SizedBox(width: 12),
                    SkeletonBox(width: 60, height: 18, borderRadius: 9),
                  ],
                ),
                const SizedBox(height: 8),
                const SkeletonBox(width: 120, height: 11, borderRadius: 4),
                const SizedBox(height: 10),
                Row(
                  children: const [
                    SkeletonBox(width: 70, height: 16, borderRadius: 4),
                    SizedBox(width: 6),
                    SkeletonBox(width: 80, height: 16, borderRadius: 4),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// ── SKELETON CHAT BUBBLE ─────────────────────────────────────────────────────
class SkeletonChatBubble extends StatelessWidget {
  final bool isMe;

  const SkeletonChatBubble({super.key, this.isMe = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isMe) ...[
            const SkeletonBox(width: 32, height: 32, borderRadius: 16),
            const SizedBox(width: 8),
          ],
          Container(
            width: 200,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isMe ? const Color(0xFFEFF6FF) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                SkeletonBox(width: 90, height: 10, borderRadius: 4),
                SizedBox(height: 6),
                SkeletonBox(height: 12, borderRadius: 4),
                SizedBox(height: 4),
                SkeletonBox(width: 140, height: 12, borderRadius: 4),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// ── SKELETON DOSSIER PROFILE ────────────────────────────────────────────────
class SkeletonDossierScreen extends StatelessWidget {
  const SkeletonDossierScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      isLoading: true,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  const SkeletonBox(width: 52, height: 52, borderRadius: 26),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        SkeletonBox(width: 140, height: 16, borderRadius: 4),
                        SizedBox(height: 8),
                        SkeletonBox(width: 90, height: 12, borderRadius: 4),
                        SizedBox(height: 8),
                        SkeletonBox(width: 180, height: 14, borderRadius: 4),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            // KPI Ribbon
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: const [
                  SkeletonBox(width: 60, height: 36, borderRadius: 6),
                  SkeletonBox(width: 60, height: 36, borderRadius: 6),
                  SkeletonBox(width: 60, height: 36, borderRadius: 6),
                  SkeletonBox(width: 60, height: 36, borderRadius: 6),
                ],
              ),
            ),
            const SizedBox(height: 16),
            // Content cards
            const SkeletonUserCard(),
            const SkeletonUserCard(),
            const SkeletonUserCard(),
          ],
        ),
      ),
    );
  }
}

/// ── SKELETON PROJECT CARD ───────────────────────────────────────────────────
class SkeletonProjectCard extends StatelessWidget {
  const SkeletonProjectCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              SkeletonBox(width: 80, height: 20, borderRadius: 6),
              SkeletonBox(width: 65, height: 18, borderRadius: 10),
            ],
          ),
          const SizedBox(height: 12),
          const SkeletonBox(width: 180, height: 16, borderRadius: 4),
          const SizedBox(height: 6),
          const SkeletonBox(width: 100, height: 12, borderRadius: 4),
          const SizedBox(height: 14),
          const SkeletonBox(width: double.infinity, height: 6, borderRadius: 3),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              SkeletonBox(width: 80, height: 24, borderRadius: 12),
              SkeletonBox(width: 70, height: 14, borderRadius: 4),
            ],
          ),
        ],
      ),
    );
  }
}

/// ── SKELETON PROJECT DOSSIER SCREEN ─────────────────────────────────────────
class SkeletonProjectDossier extends StatelessWidget {
  const SkeletonProjectDossier({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      isLoading: true,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  SkeletonBox(width: 90, height: 22, borderRadius: 6),
                  SizedBox(height: 10),
                  SkeletonBox(width: 220, height: 18, borderRadius: 4),
                  SizedBox(height: 8),
                  SkeletonBox(width: double.infinity, height: 12, borderRadius: 4),
                  SizedBox(height: 14),
                  SkeletonBox(width: 140, height: 28, borderRadius: 14),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: const [
                Expanded(child: SkeletonBox(height: 70, borderRadius: 12)),
                SizedBox(width: 10),
                Expanded(child: SkeletonBox(height: 70, borderRadius: 12)),
                SizedBox(width: 10),
                Expanded(child: SkeletonBox(height: 70, borderRadius: 12)),
              ],
            ),
            const SizedBox(height: 16),
            const SkeletonProjectCard(),
            const SkeletonProjectCard(),
          ],
        ),
      ),
    );
  }
}

/// ── SKELETON DASHBOARD SCREEN ────────────────────────────────────────────────
class SkeletonDashboardScreen extends StatelessWidget {
  const SkeletonDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      isLoading: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Executive Header Bone
          Row(
            children: [
              const SkeletonBox(width: 46, height: 46, borderRadius: 14),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    SkeletonBox(width: 110, height: 11, borderRadius: 4),
                    SizedBox(height: 6),
                    SkeletonBox(width: 160, height: 18, borderRadius: 4),
                  ],
                ),
              ),
              const SkeletonBox(width: 38, height: 38, borderRadius: 12),
              const SizedBox(width: 8),
              const SkeletonBox(width: 38, height: 38, borderRadius: 12),
            ],
          ),
          const SizedBox(height: 16),

          // Attendance Quick Action Card Bone
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    const SkeletonBox(width: 44, height: 44, borderRadius: 12),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          SkeletonBox(width: 130, height: 11, borderRadius: 4),
                          SizedBox(height: 6),
                          SkeletonBox(width: 180, height: 16, borderRadius: 4),
                          SizedBox(height: 6),
                          SkeletonBox(width: 140, height: 11, borderRadius: 4),
                        ],
                      ),
                    ),
                    const SkeletonBox(width: 20, height: 20, borderRadius: 10),
                  ],
                ),
                const SizedBox(height: 14),
                const SkeletonBox(width: double.infinity, height: 42, borderRadius: 10),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Metric HUD Grid (2 Columns)
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      SkeletonBox(width: 28, height: 28, borderRadius: 8),
                      SizedBox(height: 12),
                      SkeletonBox(width: 45, height: 22, borderRadius: 4),
                      SizedBox(height: 6),
                      SkeletonBox(width: 80, height: 12, borderRadius: 4),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      SkeletonBox(width: 28, height: 28, borderRadius: 8),
                      SizedBox(height: 12),
                      SkeletonBox(width: 60, height: 22, borderRadius: 4),
                      SizedBox(height: 6),
                      SkeletonBox(width: 85, height: 12, borderRadius: 4),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Project Initiative Card Bone
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    SkeletonBox(width: 140, height: 16, borderRadius: 4),
                    SkeletonBox(width: 60, height: 18, borderRadius: 8),
                  ],
                ),
                SizedBox(height: 12),
                SkeletonBox(width: 180, height: 20, borderRadius: 4),
                SizedBox(height: 6),
                SkeletonBox(width: 130, height: 12, borderRadius: 4),
                SizedBox(height: 14),
                SkeletonBox(width: double.infinity, height: 6, borderRadius: 3),
                SizedBox(height: 14),
                Row(
                  children: [
                    SkeletonBox(width: 60, height: 22, borderRadius: 6),
                    SizedBox(width: 6),
                    SkeletonBox(width: 65, height: 22, borderRadius: 6),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Quick Action Dock Bones
          Row(
            children: const [
              SkeletonBox(width: 88, height: 64, borderRadius: 14),
              SizedBox(width: 10),
              SkeletonBox(width: 88, height: 64, borderRadius: 14),
              SizedBox(width: 10),
              SkeletonBox(width: 88, height: 64, borderRadius: 14),
              SizedBox(width: 10),
              SkeletonBox(width: 88, height: 64, borderRadius: 14),
            ],
          ),
          const SizedBox(height: 22),

          // Sprint Deliverables Header Bone
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              SkeletonBox(width: 150, height: 18, borderRadius: 4),
              SkeletonBox(width: 80, height: 16, borderRadius: 4),
            ],
          ),
          const SizedBox(height: 14),

          // 3 Deliverable Bones
          const SkeletonUserCard(),
          const SkeletonUserCard(),
          const SkeletonUserCard(),
        ],
      ),
    );
  }
}

/// ── SKELETON ATTENDANCE SCREEN ──────────────────────────────────────────────
class SkeletonAttendanceScreen extends StatelessWidget {
  const SkeletonAttendanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      isLoading: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Bone
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(width: 160, height: 22, borderRadius: 4),
                  SizedBox(height: 6),
                  SkeletonBox(width: 190, height: 12, borderRadius: 4),
                ],
              ),
              SkeletonBox(width: 90, height: 32, borderRadius: 8),
            ],
          ),
          const SizedBox(height: 16),

          // Segmented Tabs Bone
          Container(
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: const [
                Expanded(child: Center(child: SkeletonBox(width: 70, height: 14, borderRadius: 4))),
                Expanded(child: Center(child: SkeletonBox(width: 70, height: 14, borderRadius: 4))),
                Expanded(child: Center(child: SkeletonBox(width: 70, height: 14, borderRadius: 4))),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Hero Punch Card Bone
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: const [
                    SkeletonBox(width: 140, height: 14, borderRadius: 4),
                    SkeletonBox(width: 65, height: 20, borderRadius: 8),
                  ],
                ),
                const SizedBox(height: 20),
                // Digital Stopwatch Box Bone
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: const [
                      SkeletonBox(width: 150, height: 12, borderRadius: 4),
                      SizedBox(height: 10),
                      SkeletonBox(width: 200, height: 32, borderRadius: 6),
                      SizedBox(height: 14),
                      SkeletonBox(width: double.infinity, height: 8, borderRadius: 4),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                // Timestamps Grid Bone
                Row(
                  children: const [
                    Expanded(child: SkeletonBox(height: 56, borderRadius: 10)),
                    SizedBox(width: 12),
                    Expanded(child: SkeletonBox(height: 56, borderRadius: 10)),
                  ],
                ),
                const SizedBox(height: 20),
                const SkeletonBox(width: double.infinity, height: 48, borderRadius: 10),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Policy card bone
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                SkeletonBox(width: 160, height: 16, borderRadius: 4),
                SizedBox(height: 12),
                SkeletonBox(width: double.infinity, height: 12, borderRadius: 4),
                SizedBox(height: 8),
                SkeletonBox(width: 220, height: 12, borderRadius: 4),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
