import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../models/notification_item.dart';
import '../../data/notifications_api.dart';

class NotificationsState {
  final List<NotificationItem> notifications;
  final int unreadCount;
  final bool isLoading;

  const NotificationsState({
    this.notifications = const [],
    this.unreadCount = 0,
    this.isLoading = false,
  });

  NotificationsState copyWith({
    List<NotificationItem>? notifications,
    int? unreadCount,
    bool? isLoading,
  }) {
    return NotificationsState(
      notifications: notifications ?? this.notifications,
      unreadCount: unreadCount ?? this.unreadCount,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class NotificationsNotifier extends StateNotifier<NotificationsState> {
  final NotificationsApi _api = NotificationsApi();

  NotificationsNotifier() : super(const NotificationsState()) {
    loadNotifications();
  }

  Future<void> loadNotifications() async {
    state = state.copyWith(isLoading: true);
    try {
      final res = await _api.getNotifications();
      state = state.copyWith(
        notifications: res.items,
        unreadCount: res.unreadCount,
        isLoading: false,
      );
    } catch (_) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> markAsRead(String id) async {
    await _api.markAsRead(id);
    final updated = state.notifications.map((item) {
      if (item.id == id) {
        return NotificationItem(
          id: item.id,
          title: item.title,
          message: item.message,
          type: item.type,
          isRead: true,
          link: item.link,
          createdAt: item.createdAt,
        );
      }
      return item;
    }).toList();

    final unread = updated.where((i) => !i.isRead).length;
    state = state.copyWith(notifications: updated, unreadCount: unread);
  }

  Future<void> markAllAsRead() async {
    await _api.markAllAsRead();
    final updated = state.notifications.map((item) {
      return NotificationItem(
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type,
        isRead: true,
        link: item.link,
        createdAt: item.createdAt,
      );
    }).toList();

    state = state.copyWith(notifications: updated, unreadCount: 0);
  }
}

final notificationsProvider =
    StateNotifierProvider<NotificationsNotifier, NotificationsState>((ref) {
  return NotificationsNotifier();
});
