import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

/// Enterprise-grade, high-density text input field.
/// Modeled after modern executive design systems (Linear, Stripe, Tailwind UI).
/// Features:
///   - Single-border architecture (zero double-border artifacts from theme inheritance)
///   - Smooth 180ms cubic focus transitions with ambient halo ring
///   - Perfect vertical centering & icon geometry
///   - Dedicated error micro-state with warning indicator
class CustomInput extends StatefulWidget {
  final String? label;
  final String hintText;
  final TextEditingController? controller;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final bool obscureText;
  final TextInputType keyboardType;
  final ValueChanged<String>? onChanged;
  final String? errorText;
  final bool isLightMode;
  final int maxLines;
  final bool readOnly;
  final VoidCallback? onTap;
  final FocusNode? focusNode;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final bool enabled;

  const CustomInput({
    super.key,
    this.label,
    required this.hintText,
    this.controller,
    this.prefixIcon,
    this.suffixIcon,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
    this.onChanged,
    this.errorText,
    this.isLightMode = false,
    this.maxLines = 1,
    this.readOnly = false,
    this.onTap,
    this.focusNode,
    this.textInputAction,
    this.onSubmitted,
    this.enabled = true,
  });

  @override
  State<CustomInput> createState() => _CustomInputState();
}

class _CustomInputState extends State<CustomInput> {
  FocusNode? _internalFocusNode;
  FocusNode get _effectiveFocusNode => widget.focusNode ?? (_internalFocusNode ??= FocusNode());

  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _effectiveFocusNode.addListener(_handleFocusChanged);
    _isFocused = _effectiveFocusNode.hasFocus;
  }

  @override
  void didUpdateWidget(covariant CustomInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.focusNode != oldWidget.focusNode) {
      oldWidget.focusNode?.removeListener(_handleFocusChanged);
      _effectiveFocusNode.addListener(_handleFocusChanged);
      _isFocused = _effectiveFocusNode.hasFocus;
    }
  }

  @override
  void dispose() {
    _effectiveFocusNode.removeListener(_handleFocusChanged);
    _internalFocusNode?.dispose();
    super.dispose();
  }

  void _handleFocusChanged() {
    if (mounted) {
      setState(() {
        _isFocused = _effectiveFocusNode.hasFocus;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;
    final isLight = widget.isLightMode;

    // ── Palette Determination ───────────────────────────────────────────────
    final Color bgColor;
    if (isLight) {
      bgColor = _isFocused ? Colors.white : const Color(0xFFF8FAFC);
    } else {
      bgColor = _isFocused ? const Color(0xFF1E293B) : const Color(0xFF0F172A);
    }

    final Color borderColor;
    if (hasError) {
      borderColor = const Color(0xFFEF4444);
    } else if (_isFocused) {
      borderColor = const Color(0xFF2563EB); // Royal Blue
    } else {
      borderColor = isLight ? const Color(0xFFCBD5E1) : const Color(0xFF334155);
    }

    final Color textColor = isLight ? const Color(0xFF0F172A) : Colors.white;
    final Color hintColor = isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
    final Color labelColor = isLight ? const Color(0xFF334155) : const Color(0xFF94A3B8);

    // ── Enterprise Focus Halo Shadow ─────────────────────────────────────────
    List<BoxShadow>? shadows;
    if (hasError) {
      shadows = [
        BoxShadow(
          color: const Color(0xFFEF4444).withOpacity(0.16),
          blurRadius: 6,
          spreadRadius: 2,
          offset: const Offset(0, 0),
        ),
      ];
    } else if (_isFocused) {
      shadows = [
        BoxShadow(
          color: const Color(0xFF2563EB).withOpacity(0.16),
          blurRadius: 6,
          spreadRadius: 2,
          offset: const Offset(0, 0),
        ),
        BoxShadow(
          color: const Color(0xFF0F172A).withOpacity(0.04),
          blurRadius: 2,
          offset: const Offset(0, 1),
        ),
      ];
    } else if (isLight) {
      shadows = [
        BoxShadow(
          color: const Color(0xFF0F172A).withOpacity(0.02),
          blurRadius: 2,
          offset: const Offset(0, 1),
        ),
      ];
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[
          Padding(
            padding: const EdgeInsets.only(left: 1, bottom: 6),
            child: Text(
              widget.label!,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: labelColor,
                letterSpacing: 0.1,
              ),
            ),
          ),
        ],

        // ── Single Container with Smooth Halo ─────────────────────────────────
        AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOutCubic,
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: borderColor,
              width: _isFocused || hasError ? 1.5 : 1.0,
            ),
            boxShadow: shadows,
          ),
          child: TextField(
            controller: widget.controller,
            focusNode: _effectiveFocusNode,
            obscureText: widget.obscureText,
            keyboardType: widget.keyboardType,
            textInputAction: widget.textInputAction,
            onSubmitted: widget.onSubmitted,
            onChanged: widget.onChanged,
            readOnly: widget.readOnly,
            enabled: widget.enabled,
            onTap: widget.onTap,
            maxLines: widget.maxLines,
            textAlignVertical: TextAlignVertical.center,
            cursorColor: const Color(0xFF2563EB),
            cursorWidth: 1.8,
            cursorRadius: const Radius.circular(1),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: textColor,
              letterSpacing: -0.1,
            ),
            decoration: InputDecoration(
              isDense: true,
              filled: false,
              fillColor: Colors.transparent,
              hintText: widget.hintText,
              hintStyle: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: hintColor,
              ),
              prefixIcon: widget.prefixIcon != null
                  ? IconTheme(
                      data: IconThemeData(
                        color: _isFocused
                            ? const Color(0xFF2563EB)
                            : (isLight ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                        size: 18,
                      ),
                      child: widget.prefixIcon!,
                    )
                  : null,
              prefixIconConstraints: const BoxConstraints(minWidth: 44, minHeight: 46),
              suffixIcon: widget.suffixIcon != null
                  ? IconTheme(
                      data: IconThemeData(
                        color: isLight ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        size: 18,
                      ),
                      child: widget.suffixIcon!,
                    )
                  : null,
              suffixIconConstraints: const BoxConstraints(minWidth: 44, minHeight: 46),
              contentPadding: EdgeInsets.symmetric(
                horizontal: widget.prefixIcon == null ? 14 : 4,
                vertical: widget.maxLines > 1 ? 12 : 14,
              ),
              // Explicitly eliminate all inner decoration borders from theme inheritance
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              focusedErrorBorder: InputBorder.none,
              disabledBorder: InputBorder.none,
            ),
          ),
        ),

        // ── Micro Error State ────────────────────────────────────────────────
        if (hasError) ...[
          Padding(
            padding: const EdgeInsets.only(top: 5, left: 2),
            child: Row(
              children: [
                const Icon(
                  LucideIcons.alertCircle,
                  size: 12,
                  color: Color(0xFFEF4444),
                ),
                const SizedBox(width: 5),
                Expanded(
                  child: Text(
                    widget.errorText!,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFFEF4444),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
