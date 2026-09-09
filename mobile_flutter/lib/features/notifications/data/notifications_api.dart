import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../models/notification_item.dart';

class NotificationListResponse {
  final List<NotificationItem> items;
  final int unreadCount;

  NotificationListResponse({required this.items, required this.unreadCount});
}

class NotificationsApi {
  final ApiClient _client = ApiClient();

  Future<NotificationListResponse> getNotifications() async {
    final res = await _client.dio.get(ApiEndpoints.notifications);
    final data = res.data;
    final list = (data['data'] ?? data) as List;
    final items = list.map((e) => NotificationItem.fromJson(e)).toList();
    final unread = (data['unreadCount'] as num?)?.toInt() ??
        items.where((i) => !i.isRead).length;

    return NotificationListResponse(items: items, unreadCount: unread);
  }

  Future<bool> markAsRead(String notificationId) async {
    final res = await _client.dio.patch(
      ApiEndpoints.markNotificationRead(notificationId),
    );
    return res.data?['success'] ?? true;
  }

  Future<bool> markAllAsRead() async {
    final res = await _client.dio.post(ApiEndpoints.markAllNotificationsRead);
    return res.data?['success'] ?? true;
  }
}
