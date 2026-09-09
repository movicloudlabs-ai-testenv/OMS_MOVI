import 'package:flutter/material.dart';
import '../utils/chat_wallpaper.dart';

/// ─── CHAT WALLPAPER PICKER SHEET ─────────────────────────────────────────────
/// A bottom sheet that displays all wallpaper presets as interactive thumbnails.
/// The selected wallpaper gets a highlighted indigo border + checkmark overlay.
/// On "Apply", persists the choice and fires [onChanged].

void showChatWallpaperSheet({
  required BuildContext context,
  required String channelId,
  required ChatWallpaper current,
  required ValueChanged<ChatWallpaper> onChanged,
}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _WallpaperSheetContent(
      channelId: channelId,
      current: current,
      onChanged: onChanged,
    ),
  );
}

class _WallpaperSheetContent extends StatefulWidget {
  final String channelId;
  final ChatWallpaper current;
  final ValueChanged<ChatWallpaper> onChanged;

  const _WallpaperSheetContent({
    required this.channelId,
    required this.current,
    required this.onChanged,
  });

  @override
  State<_WallpaperSheetContent> createState() => _WallpaperSheetContentState();
}

class _WallpaperSheetContentState extends State<_WallpaperSheetContent> {
  late ChatWallpaper _selected;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selected = widget.current;
  }

  Future<void> _apply() async {
    setState(() => _saving = true);
    await ChatWallpaperService.set(widget.channelId, _selected);
    if (mounted) {
      Navigator.pop(context);
      widget.onChanged(_selected);
    }
  }

  @override
  Widget build(BuildContext context) {
    final presets = ChatWallpaper.values;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Title
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF2FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.wallpaper_rounded, size: 18, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(width: 10),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Chat Background',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        'Choose a wallpaper for this conversation',
                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Grid of wallpaper presets
              SizedBox(
                height: 100,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: presets.length,
                  separatorBuilder: (context, index) => const SizedBox(width: 12),
                  itemBuilder: (ctx, i) {
                    final preset = presets[i];
                    final isSelected = _selected == preset;
                    return GestureDetector(
                      onTap: () => setState(() => _selected = preset),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0),
                                width: isSelected ? 2.5 : 1,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: isSelected
                                      ? const Color(0xFF0F172A).withOpacity(0.18)
                                      : Colors.black.withOpacity(0.04),
                                  blurRadius: isSelected ? 10 : 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  _buildPreviewWidget(preset),
                                  if (isSelected)
                                    Container(
                                      color: const Color(0xFF0F172A).withOpacity(0.15),
                                      child: const Center(
                                        child: Icon(
                                          Icons.check_circle_rounded,
                                          color: Colors.white,
                                          size: 22,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          SizedBox(
                            width: 64,
                            child: Text(
                              preset.label,
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 20),

              // Apply button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _saving ? null : _apply,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F172A),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                    shadowColor: Colors.transparent,
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          'Apply Wallpaper',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPreviewWidget(ChatWallpaper preset) {
    if (preset == ChatWallpaper.patternDots || preset == ChatWallpaper.patternLines) {
      return CustomPaint(
        painter: WallpaperPatternPainter(preset),
        child: Container(color: preset.previewColor),
      );
    }
    return Container(decoration: preset.decoration);
  }
}
