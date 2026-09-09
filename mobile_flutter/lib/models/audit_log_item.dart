class AuditLogItem {
  final String id;
  final String action;
  final String module;
  final String? userName;
  final String? ipAddress;
  final String? details;
  final String result;
  final String createdAt;
  final String? browser;
  final String? os;
  final String? location;
  final String? countryFlag;
  final String? errorMessage;
  final String? resource;
  final String? userAgent;

  AuditLogItem({
    required this.id,
    required this.action,
    required this.module,
    this.userName,
    this.ipAddress,
    this.details,
    this.result = 'SUCCESS',
    required this.createdAt,
    this.browser,
    this.os,
    this.location,
    this.countryFlag,
    this.errorMessage,
    this.resource,
    this.userAgent,
  });

  factory AuditLogItem.fromJson(Map<String, dynamic> json) {
    String? user;
    if (json['user'] is Map) {
      user = json['user']['name']?.toString();
    } else if (json['user'] is String) {
      user = json['user'];
    }

    return AuditLogItem(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      action: json['action']?.toString() ?? '',
      module: json['module']?.toString() ?? 'System',
      userName: user ?? json['userName']?.toString(),
      ipAddress: json['ipAddress']?.toString(),
      details: json['details']?.toString(),
      result: json['result']?.toString() ?? 'SUCCESS',
      createdAt: json['createdAt']?.toString() ?? '',
      browser: json['browser']?.toString(),
      os: json['os']?.toString(),
      location: json['location']?.toString(),
      countryFlag: json['countryFlag']?.toString(),
      errorMessage: json['errorMessage']?.toString(),
      resource: json['resource']?.toString(),
      userAgent: json['userAgent']?.toString(),
    );
  }
}
