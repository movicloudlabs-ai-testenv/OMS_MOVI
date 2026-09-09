class GanttTimelineItem {
  final String id;
  final String key;
  final String name;
  final String type; // 'milestone', 'sprint', 'task'
  final String startDate;
  final String endDate;
  final String baselineEndDate;
  final int varianceDays;
  final String status;
  final int progressPercent;
  final String deliverable;
  final List<String> blockedBy;
  final bool isCritical;
  final String? assigneeName;

  GanttTimelineItem({
    required this.id,
    required this.key,
    required this.name,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.baselineEndDate,
    this.varianceDays = 0,
    required this.status,
    this.progressPercent = 0,
    this.deliverable = '',
    this.blockedBy = const [],
    this.isCritical = false,
    this.assigneeName,
  });

  factory GanttTimelineItem.fromJson(Map<String, dynamic> json) {
    String? aName;
    if (json['assignee'] is Map) {
      aName = json['assignee']['name']?.toString();
    }

    return GanttTimelineItem(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      key: json['key']?.toString() ?? 'ITM',
      name: json['name']?.toString() ?? 'Timeline Item',
      type: json['type']?.toString() ?? 'milestone',
      startDate: json['startDate']?.toString() ?? '',
      endDate: json['endDate']?.toString() ?? '',
      baselineEndDate: json['baselineEndDate']?.toString() ?? json['endDate']?.toString() ?? '',
      varianceDays: (json['varianceDays'] as num?)?.toInt() ?? 0,
      status: json['status']?.toString() ?? 'upcoming',
      progressPercent: (json['progressPercent'] as num?)?.toInt() ?? 0,
      deliverable: json['deliverable']?.toString() ?? '',
      blockedBy: (json['blockedBy'] as List?)?.map((e) => e.toString()).toList() ?? [],
      isCritical: json['isCritical'] == true,
      assigneeName: aName,
    );
  }
}

class CriticalPathData {
  final int totalDeliverables;
  final String targetDeliveryDate;
  final List<String> criticalItemKeys;

  CriticalPathData({
    this.totalDeliverables = 0,
    required this.targetDeliveryDate,
    this.criticalItemKeys = const [],
  });

  factory CriticalPathData.fromJson(Map<String, dynamic> json) {
    return CriticalPathData(
      totalDeliverables: (json['totalDeliverables'] as num?)?.toInt() ?? 0,
      targetDeliveryDate: json['targetDeliveryDate']?.toString() ?? '',
      criticalItemKeys: (json['criticalItemKeys'] as List?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}

class GanttAnalysisData {
  final String projectName;
  final String projectCode;
  final String startDate;
  final String endDate;
  final String forecastEndDate;
  final int varianceDays;
  final String scheduleHealth;
  final CriticalPathData criticalPath;
  final List<GanttTimelineItem> items;

  GanttAnalysisData({
    required this.projectName,
    required this.projectCode,
    required this.startDate,
    required this.endDate,
    required this.forecastEndDate,
    this.varianceDays = 0,
    this.scheduleHealth = 'On Track',
    required this.criticalPath,
    required this.items,
  });

  factory GanttAnalysisData.fromJson(Map<String, dynamic> json) {
    final proj = json['project'] as Map<String, dynamic>? ?? {};
    final cp = json['criticalPath'] as Map<String, dynamic>? ?? {};
    final rawItems = json['items'] as List? ?? [];

    return GanttAnalysisData(
      projectName: proj['name']?.toString() ?? '',
      projectCode: proj['code']?.toString() ?? '',
      startDate: proj['startDate']?.toString() ?? '',
      endDate: proj['endDate']?.toString() ?? '',
      forecastEndDate: proj['forecastEndDate']?.toString() ?? proj['endDate']?.toString() ?? '',
      varianceDays: (proj['varianceDays'] as num?)?.toInt() ?? 0,
      scheduleHealth: proj['scheduleHealth']?.toString() ?? 'On Track',
      criticalPath: CriticalPathData.fromJson(cp),
      items: rawItems.map((e) => GanttTimelineItem.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}
