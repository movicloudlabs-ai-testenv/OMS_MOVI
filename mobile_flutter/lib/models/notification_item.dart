class NotificationItem {
  final String id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final String? link;
  final String createdAt;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    this.type = 'general',
    required this.isRead,
    this.link,
    required this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      type: json['type']?.toString() ?? 'general',
      isRead: json['isRead'] ?? false,
      link: json['link']?.toString(),
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }
}
