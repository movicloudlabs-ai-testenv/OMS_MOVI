import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';

/// ── ENTERPRISE SWIPE-DOWN REFRESH CONTROLLER ─────────────────────────────────
/// Premium pull-to-refresh animation with spring capsule, rotating Lucide sync
/// icon, micro-haptics, and live status copy.
class EnterprisePullToRefresh extends StatefulWidget {
  final Future<void> Function() onRefresh;
  final Widget child;

  const EnterprisePullToRefresh({
    super.key,
    required this.onRefresh,
    required this.child,
  });

  @override
  State<EnterprisePullToRefresh> createState() => _EnterprisePullToRefreshState();
}

class _EnterprisePullToRefreshState extends State<EnterprisePullToRefresh>
    with SingleTickerProviderStateMixin {
  static const double _triggerDistance = 75.0;

  double _dragOffset = 0.0;
  bool _isRefreshing = false;
  bool _hasTriggeredHaptic = false;

  late AnimationController _spinController;

  @override
  void initState() {
    super.initState();
    _spinController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
  }

  @override
  void dispose() {
    _spinController.dispose();
    super.dispose();
  }

  Future<void> _triggerRefresh() async {
    if (_isRefreshing) return;
    setState(() {
      _isRefreshing = true;
      _dragOffset = _triggerDistance;
    });
    _spinController.repeat();

    try {
      await widget.onRefresh();
    } finally {
      if (mounted) {
        _spinController.stop();
        setState(() {
          _isRefreshing = false;
          _dragOffset = 0.0;
          _hasTriggeredHaptic = false;
        });
      }
    }
  }

  bool _handleScrollNotification(ScrollNotification notification) {
    if (_isRefreshing) return false;

    if (notification is ScrollUpdateNotification) {
      if (notification.metrics.extentBefore == 0 && (notification.scrollDelta ?? 0) < 0) {
        // Dragging down at the top of the scroll view
        final newOffset = _dragOffset - (notification.scrollDelta ?? 0) * 0.55;
        setState(() {
          _dragOffset = newOffset.clamp(0.0, 110.0);
        });

        if (_dragOffset >= _triggerDistance && !_hasTriggeredHaptic) {
          HapticFeedback.mediumImpact();
          _hasTriggeredHaptic = true;
        } else if (_dragOffset < _triggerDistance && _hasTriggeredHaptic) {
          _hasTriggeredHaptic = false;
        }
      } else if (_dragOffset > 0 && (notification.scrollDelta ?? 0) > 0) {
        // Scrolling back up
        setState(() {
          _dragOffset = math.max(0.0, _dragOffset - (notification.scrollDelta ?? 0));
        });
      }
    } else if (notification is OverscrollNotification) {
      if (notification.overscroll < 0) {
        final newOffset = _dragOffset - notification.overscroll * 0.45;
        setState(() {
          _dragOffset = newOffset.clamp(0.0, 110.0);
        });

        if (_dragOffset >= _triggerDistance && !_hasTriggeredHaptic) {
          HapticFeedback.mediumImpact();
          _hasTriggeredHaptic = true;
        }
      }
    } else if (notification is ScrollEndNotification) {
      if (_dragOffset >= _triggerDistance) {
        _triggerRefresh();
      } else if (_dragOffset > 0) {
        setState(() {
          _dragOffset = 0.0;
          _hasTriggeredHaptic = false;
        });
      }
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final double pillProgress = (_dragOffset / _triggerDistance).clamp(0.0, 1.0);
    final bool isReady = _dragOffset >= _triggerDistance;

    String statusText = 'Pull to sync workspace';
    if (_isRefreshing) {
      statusText = 'Synchronizing workspace...';
    } else if (isReady) {
      statusText = 'Release to update';
    }

    return NotificationListener<ScrollNotification>(
      onNotification: _handleScrollNotification,
      child: Stack(
        children: [
          // Content translated slightly downwards when pulled
          Transform.translate(
            offset: Offset(0, _isRefreshing ? 48.0 : _dragOffset * 0.40),
            child: widget.child,
          ),

          // Animated Enterprise Pill
          if (_dragOffset > 8.0 || _isRefreshing)
            Positioned(
              top: _isRefreshing ? 12.0 : math.max(6.0, _dragOffset * 0.55 - 18.0),
              left: 0,
              right: 0,
              child: Center(
                child: Opacity(
                  opacity: _isRefreshing ? 1.0 : pillProgress,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: _isRefreshing || isReady
                            ? const Color(0xFF2563EB).withOpacity(0.5)
                            : const Color(0xFFCBD5E1),
                        width: 1.2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withOpacity(0.14),
                          blurRadius: 14,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Rotating Sync Icon
                        AnimatedBuilder(
                          animation: _spinController,
                          builder: (context, child) {
                            final angle = _isRefreshing
                                ? _spinController.value * 2 * math.pi
                                : pillProgress * math.pi;
                            return Transform.rotate(
                              angle: angle,
                              child: Icon(
                                LucideIcons.refreshCw,
                                size: 14,
                                color: isReady || _isRefreshing
                                    ? const Color(0xFF2563EB)
                                    : const Color(0xFF64748B),
                              ),
                            );
                          },
                        ),
                        const SizedBox(width: 8),
                        Text(
                          statusText,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: isReady || _isRefreshing
                                ? const Color(0xFF1E293B)
                                : const Color(0xFF64748B),
                            letterSpacing: -0.2,
                          ),
                        ),
                        if (_isRefreshing) ...[
                          const SizedBox(width: 6),
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Color(0xFF10B981),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
