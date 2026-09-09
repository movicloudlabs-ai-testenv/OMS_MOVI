class SprintItem {
  final String id;
  final String name;
  final String goal;
  final String startDate;
  final String endDate;
  final String status;
  final int plannedPoints;
  final int completedPoints;
  final int velocity;
  final int rolledOverCount;
  final int taskCount;
  final int doneTaskCount;
  final int totalPoints;
  final int donePoints;
  final int progressPercent;
  final String? createdByName;

  SprintItem({
    required this.id,
    required this.name,
    this.goal = '',
    required this.startDate,
    required this.endDate,
    required this.status,
    this.plannedPoints = 0,
    this.completedPoints = 0,
    this.velocity = 0,
    this.rolledOverCount = 0,
    this.taskCount = 0,
    this.doneTaskCount = 0,
    this.totalPoints = 0,
    this.donePoints = 0,
    this.progressPercent = 0,
    this.createdByName,
  });

  factory SprintItem.fromJson(Map<String, dynamic> json) {
    String? cName;
    if (json['createdBy'] is Map) {
      cName = json['createdBy']['name']?.toString();
    }

    return SprintItem(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Sprint',
      goal: json['goal']?.toString() ?? '',
      startDate: json['startDate']?.toString() ?? '',
      endDate: json['endDate']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Planning',
      plannedPoints: (json['plannedPoints'] as num?)?.toInt() ?? 0,
      completedPoints: (json['completedPoints'] as num?)?.toInt() ?? 0,
      velocity: (json['velocity'] as num?)?.toInt() ?? 0,
      rolledOverCount: (json['rolledOverCount'] as num?)?.toInt() ?? 0,
      taskCount: (json['taskCount'] as num?)?.toInt() ?? 0,
      doneTaskCount: (json['doneTaskCount'] as num?)?.toInt() ?? 0,
      totalPoints: (json['totalPoints'] as num?)?.toInt() ?? 0,
      donePoints: (json['donePoints'] as num?)?.toInt() ?? 0,
      progressPercent: (json['progressPercent'] as num?)?.toInt() ?? 0,
      createdByName: cName,
    );
  }
}

class KanbanTaskItem {
  final String id;
  final String key;
  final String title;
  final String description;
  final String status;
  final String priority;
  final int storyPoints;
  final String? assigneeName;
  final String? assigneeAvatar;
  final String? assigneeDesignation;
  final String? dueDate;
  final bool isBlocked;
  final String? blockedReason;
  final int subtasksCount;
  final int completedSubtasksCount;
  final bool rolledOver;

  KanbanTaskItem({
    required this.id,
    required this.key,
    required this.title,
    this.description = '',
    required this.status,
    this.priority = 'Medium',
    this.storyPoints = 1,
    this.assigneeName,
    this.assigneeAvatar,
    this.assigneeDesignation,
    this.dueDate,
    this.isBlocked = false,
    this.blockedReason,
    this.subtasksCount = 0,
    this.completedSubtasksCount = 0,
    this.rolledOver = false,
  });

  factory KanbanTaskItem.fromJson(Map<String, dynamic> json) {
    String? aName, aAvatar, aDesig;
    if (json['assignedTo'] is Map) {
      aName = json['assignedTo']['name']?.toString();
      aAvatar = json['assignedTo']['avatar']?.toString();
      aDesig = json['assignedTo']['designation']?.toString();
    }

    return KanbanTaskItem(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      key: json['taskCode']?.toString() ?? json['key']?.toString() ?? 'TSK',
      title: json['title']?.toString() ?? 'Untitled Task',
      description: json['description']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Todo',
      priority: json['priority']?.toString() ?? 'Medium',
      storyPoints: (json['storyPoints'] as num?)?.toInt() ?? 1,
      assigneeName: aName,
      assigneeAvatar: aAvatar,
      assigneeDesignation: aDesig,
      dueDate: json['dueDate']?.toString(),
      isBlocked: json['isBlocked'] == true,
      blockedReason: json['blockedReason']?.toString(),
      subtasksCount: (json['subtasksCount'] as num?)?.toInt() ?? 0,
      completedSubtasksCount: (json['completedSubtasksCount'] as num?)?.toInt() ?? 0,
      rolledOver: json['rolledOver'] == true,
    );
  }
}

class KanbanColumnData {
  final String id;
  final String title;
  final int wipLimit;
  final bool isBreached;
  final int totalPoints;
  final List<KanbanTaskItem> tasks;

  KanbanColumnData({
    required this.id,
    required this.title,
    required this.wipLimit,
    required this.isBreached,
    required this.totalPoints,
    required this.tasks,
  });

  factory KanbanColumnData.fromJson(Map<String, dynamic> json) {
    final rawTasks = json['tasks'] as List? ?? [];
    return KanbanColumnData(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      wipLimit: (json['wipLimit'] as num?)?.toInt() ?? 10,
      isBreached: json['isBreached'] == true,
      totalPoints: (json['totalPoints'] as num?)?.toInt() ?? 0,
      tasks: rawTasks.map((t) => KanbanTaskItem.fromJson(t as Map<String, dynamic>)).toList(),
    );
  }
}

class KanbanBoardData {
  final SprintItem? activeSprint;
  final KanbanColumnData todo;
  final KanbanColumnData inProgress;
  final KanbanColumnData inReview;
  final KanbanColumnData done;
  final int totalTasks;
  final int totalPoints;
  final int completedPoints;
  final int blockedCount;

  KanbanBoardData({
    this.activeSprint,
    required this.todo,
    required this.inProgress,
    required this.inReview,
    required this.done,
    this.totalTasks = 0,
    this.totalPoints = 0,
    this.completedPoints = 0,
    this.blockedCount = 0,
  });

  factory KanbanBoardData.fromJson(Map<String, dynamic> json) {
    final cols = json['columns'] as Map<String, dynamic>? ?? {};
    final stats = json['stats'] as Map<String, dynamic>? ?? {};

    return KanbanBoardData(
      activeSprint: json['activeSprint'] != null && json['activeSprint'] is Map
          ? SprintItem.fromJson(json['activeSprint'] as Map<String, dynamic>)
          : null,
      todo: cols['todo'] != null
          ? KanbanColumnData.fromJson(cols['todo'] as Map<String, dynamic>)
          : KanbanColumnData(id: 'todo', title: 'Todo', wipLimit: 20, isBreached: false, totalPoints: 0, tasks: []),
      inProgress: cols['inProgress'] != null
          ? KanbanColumnData.fromJson(cols['inProgress'] as Map<String, dynamic>)
          : KanbanColumnData(id: 'inProgress', title: 'In Progress', wipLimit: 6, isBreached: false, totalPoints: 0, tasks: []),
      inReview: cols['inReview'] != null
          ? KanbanColumnData.fromJson(cols['inReview'] as Map<String, dynamic>)
          : KanbanColumnData(id: 'inReview', title: 'Review / QA', wipLimit: 4, isBreached: false, totalPoints: 0, tasks: []),
      done: cols['done'] != null
          ? KanbanColumnData.fromJson(cols['done'] as Map<String, dynamic>)
          : KanbanColumnData(id: 'done', title: 'Completed', wipLimit: 999, isBreached: false, totalPoints: 0, tasks: []),
      totalTasks: (stats['totalTasks'] as num?)?.toInt() ?? 0,
      totalPoints: (stats['totalPoints'] as num?)?.toInt() ?? 0,
      completedPoints: (stats['completedPoints'] as num?)?.toInt() ?? 0,
      blockedCount: (stats['blockedCount'] as num?)?.toInt() ?? 0,
    );
  }
}
