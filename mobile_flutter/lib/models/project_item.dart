// Enterprise Project Models
// Fully typed, null-safe models representing projects, team allocations,
// milestones, deployments, encrypted vault credentials, bugs, and activity feeds.

class ProjectItem {
  final String id;
  final String name;
  final String code;
  final String? description;
  final String status;
  final String priority;
  final String healthStatus;
  final String? departmentName;
  final String? managerName;
  final String? managerAvatar;
  final String? managerDesignation;
  final String? managerEmail;
  final int completionPercent;
  final int taskCount;
  final int doneTaskCount;
  final int activeBugsCount;
  final int teamCount;
  final double budget;
  final double budgetSpent;
  final String? startDate;
  final String? endDate;
  final int timelineDaysTotal;
  final int timelineDaysElapsed;
  final int timelineDaysRemaining;
  final List<String> tags;
  final List<String> techStack;
  final String? repositoryUrl;
  final String? cicdUrl;
  final String? documentationUrl;
  final String? architectureNotes;
  final List<ProjectTeamMember> team;
  final List<ProjectTeamMember> interns;
  final List<ProjectMilestone> milestones;
  final List<ProjectDeployment> deployments;
  final List<ProjectCredential> credentials;
  final String currentVersion;
  final String releaseCadence;
  final String targetChannel;
  final String? releaseNotes;

  // Backward compatibility getters
  String? get key => code;
  String get health => healthStatus;
  String? get leadName => managerName;
  String get latestVersion => currentVersion;
  int get totalRosterCount => teamCount > (team.length + interns.length) ? teamCount : (team.length + interns.length);

  /// Determine user's role in this project: 'lead', 'member', or 'viewer'
  String myRoleIn(String userId) {
    if (userId.isEmpty) return 'viewer';
    try {
      final me = team.firstWhere((m) => m.userId == userId);
      return me.isLead ? 'lead' : 'member';
    } catch (_) {
      return 'viewer';
    }
  }

  bool isUserLead(String userId) => myRoleIn(userId) == 'lead';
  bool isUserMember(String userId) => myRoleIn(userId) == 'member';
  bool isUserParticipant(String userId) => myRoleIn(userId) != 'viewer';

  ProjectItem({
    required this.id,
    required this.name,
    String? code,
    String? key,
    this.description,
    required this.status,
    this.priority = 'Medium',
    String? healthStatus,
    String? health,
    this.departmentName,
    String? managerName,
    String? leadName,
    this.managerAvatar,
    this.managerDesignation,
    this.managerEmail,
    this.completionPercent = 0,
    this.taskCount = 0,
    this.doneTaskCount = 0,
    this.activeBugsCount = 0,
    this.teamCount = 0,
    this.budget = 0,
    this.budgetSpent = 0,
    this.startDate,
    this.endDate,
    this.timelineDaysTotal = 0,
    this.timelineDaysElapsed = 0,
    this.timelineDaysRemaining = 0,
    this.tags = const [],
    this.techStack = const [],
    this.repositoryUrl,
    this.cicdUrl,
    this.documentationUrl,
    this.architectureNotes,
    this.team = const [],
    this.interns = const [],
    this.milestones = const [],
    this.deployments = const [],
    this.credentials = const [],
    this.currentVersion = 'v1.0.0',
    this.releaseCadence = 'Bi-weekly Sprint',
    this.targetChannel = 'Production',
    this.releaseNotes,
  })  : code = code ?? key ?? 'PRJ',
        healthStatus = healthStatus ?? health ?? 'On Track',
        managerName = managerName ?? leadName;

  factory ProjectItem.fromJson(Map<String, dynamic> json) {
    String? dept;
    if (json['department'] is Map) {
      dept = json['department']['name']?.toString();
    } else if (json['department'] is String) {
      dept = json['department'];
    }

    String? mName, mAvatar, mDesig, mEmail;
    if (json['manager'] is Map) {
      mName = json['manager']['name']?.toString();
      mAvatar = json['manager']['avatar']?.toString();
      mDesig = json['manager']['designation']?.toString();
      mEmail = json['manager']['email']?.toString();
    }

    final teamList = (json['team'] as List?)
            ?.whereType<Map>()
            .map((e) => ProjectTeamMember.fromJson(e.cast<String, dynamic>()))
            .toList() ??
        [];

    final internList = (json['interns'] as List?)
            ?.whereType<Map>()
            .map((e) {
              final map = Map<String, dynamic>.from(e);
              if (!map.containsKey('role')) {
                map['role'] = 'Intern';
              }
              return ProjectTeamMember.fromJson(map);
            })
            .toList() ??
        [];

    final milestonesList = (json['milestones'] as List?)
            ?.whereType<Map>()
            .map((e) => ProjectMilestone.fromJson(e.cast<String, dynamic>()))
            .toList() ??
        [];

    final depList = (json['deployments'] as List?)
            ?.whereType<Map>()
            .map((e) => ProjectDeployment.fromJson(e.cast<String, dynamic>()))
            .toList() ??
        [];

    final credList = (json['credentials'] as List?)
            ?.whereType<Map>()
            .map((e) => ProjectCredential.fromJson(e.cast<String, dynamic>()))
            .toList() ??
        [];

    final timelineObj = json['timeline'] is Map ? (json['timeline'] as Map).cast<String, dynamic>() : null;
    final budgetObj = json['budget'] is Map ? (json['budget'] as Map).cast<String, dynamic>() : null;

    return ProjectItem(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString() ?? json['projectCode']?.toString() ?? 'PRJ',
      description: json['description']?.toString(),
      status: json['status']?.toString() ?? 'Planning',
      priority: json['priority']?.toString() ?? 'Medium',
      healthStatus: json['healthStatus']?.toString() ?? json['health']?.toString() ?? 'On Track',
      departmentName: dept,
      managerName: mName,
      managerAvatar: mAvatar,
      managerDesignation: mDesig,
      managerEmail: mEmail,
      completionPercent: (json['completionPercent'] as num?)?.toInt() ?? 0,
      taskCount: (json['taskCount'] as num?)?.toInt() ??
          (json['tasks'] is Map ? (json['tasks']['total'] as num?)?.toInt() : null) ??
          0,
      doneTaskCount: (json['doneTaskCount'] as num?)?.toInt() ??
          (json['tasks'] is Map ? (json['tasks']['done'] as num?)?.toInt() : null) ??
          0,
      activeBugsCount: (json['activeBugsCount'] as num?)?.toInt() ??
          (json['bugs'] is Map ? (json['bugs']['open'] as num?)?.toInt() : null) ??
          0,
      teamCount: (json['teamCount'] as num?)?.toInt() ?? (teamList.length + internList.length),
      budget: budgetObj != null
          ? (budgetObj['allocated'] as num?)?.toDouble() ?? 0
          : (json['budget'] as num?)?.toDouble() ?? 0,
      budgetSpent: budgetObj != null
          ? (budgetObj['spent'] as num?)?.toDouble() ?? 0
          : (json['budgetSpent'] as num?)?.toDouble() ?? 0,
      startDate: json['startDate']?.toString(),
      endDate: json['endDate']?.toString(),
      timelineDaysTotal: (timelineObj?['totalDays'] as num?)?.toInt() ?? 0,
      timelineDaysElapsed: (timelineObj?['elapsed'] as num?)?.toInt() ?? 0,
      timelineDaysRemaining: (timelineObj?['remaining'] as num?)?.toInt() ?? 0,
      tags: (json['tags'] as List?)?.map((e) => e.toString()).toList() ?? [],
      techStack: (json['techStack'] as List?)?.map((e) => e.toString()).toList() ?? [],
      repositoryUrl: json['repositoryUrl']?.toString(),
      cicdUrl: json['cicdUrl']?.toString(),
      documentationUrl: json['documentationUrl']?.toString(),
      architectureNotes: json['architectureNotes']?.toString(),
      team: teamList,
      interns: internList,
      milestones: milestonesList,
      deployments: depList,
      credentials: credList,
      currentVersion: json['currentVersion']?.toString() ??
          json['latestVersion']?.toString() ??
          (depList.isNotEmpty ? depList.first.version : 'v1.0.0'),
      releaseCadence: json['releaseCadence']?.toString() ?? 'Bi-weekly Sprint',
      targetChannel: json['targetChannel']?.toString() ?? 'Production',
      releaseNotes: json['releaseNotes']?.toString(),
    );
  }
}

class ProjectTeamMember {
  final String userId;
  final String name;
  final String? avatar;
  final String? designation;
  final String? department;
  final String role;
  final int allocationPercentage;
  final String? joinedAt;

  ProjectTeamMember({
    required this.userId,
    required this.name,
    this.avatar,
    this.designation,
    this.department,
    required this.role,
    this.allocationPercentage = 100,
    this.joinedAt,
  });

  factory ProjectTeamMember.fromJson(Map<String, dynamic> json) {
    String uId = '';
    String uName = 'Team Member';
    String? uAvatar, uDesig, uDept;

    if (json['user'] is Map) {
      final u = json['user'] as Map<String, dynamic>;
      uId = u['_id']?.toString() ?? u['id']?.toString() ?? '';
      uName = u['name']?.toString() ?? 'Team Member';
      uAvatar = u['avatar']?.toString();
      uDesig = u['designation']?.toString();
      if (u['department'] is Map) {
        uDept = u['department']['name']?.toString();
      } else if (u['department'] != null) {
        final dStr = u['department'].toString();
        // Avoid displaying raw 24-char hex ObjectIds as department names
        if (!RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(dStr)) {
          uDept = dStr;
        }
      }
      if (uDesig == null || uDesig.isEmpty) {
        if (u['domain'] != null && u['domain'].toString().isNotEmpty) {
          uDesig = '${u['domain']} Intern';
        }
      }
      if (uDept == null || uDept.isEmpty) {
        if (u['college'] != null && u['college'].toString().isNotEmpty) {
          uDept = u['college'].toString();
        }
      }
    } else {
      uId = json['user']?.toString() ?? '';
    }

    final roleStr = json['role']?.toString() ?? 'Contributor';
    if ((uDesig == null || uDesig.isEmpty) && roleStr.toLowerCase().contains('intern')) {
      uDesig = 'Software Engineering Intern';
    }

    return ProjectTeamMember(
      userId: uId,
      name: uName.isNotEmpty ? uName : 'Team Member',
      avatar: uAvatar,
      designation: uDesig,
      department: uDept,
      role: roleStr,
      allocationPercentage: (json['allocationPercentage'] as num?)?.toInt() ?? 100,
      joinedAt: json['addedAt']?.toString() ?? json['joinedAt']?.toString(),
    );
  }

  bool get isLead {
    final r = role.toLowerCase();
    return r.contains('lead') ||
        r.contains('manager') ||
        r.contains('architect') ||
        r.contains('director') ||
        r.contains('head') ||
        r.contains('owner') ||
        r.contains('principal');
  }

  bool get isIntern {
    final r = role.toLowerCase();
    final d = (designation ?? '').toLowerCase();
    return r.contains('intern') ||
        r.contains('trainee') ||
        d.contains('intern') ||
        d.contains('trainee');
  }

  double get fte => allocationPercentage / 100.0;
}

class ProjectMilestone {
  final String id;
  final String name;
  final String? date;
  final String status;
  final String? deliverable;
  final List<String> blockedBy;

  ProjectMilestone({
    required this.id,
    required this.name,
    this.date,
    required this.status,
    this.deliverable,
    this.blockedBy = const [],
  });

  factory ProjectMilestone.fromJson(Map<String, dynamic> json) {
    return ProjectMilestone(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      date: json['date']?.toString(),
      status: json['status']?.toString() ?? 'upcoming',
      deliverable: json['deliverable']?.toString(),
      blockedBy: (json['blockedBy'] as List?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}

class ProjectDeployment {
  final String id;
  final String environment;
  final String url;
  final String status;
  final String version;
  final String? previousVersion;
  final int durationSeconds;
  final String? pipelineRunUrl;
  final String? deployedAt;
  final String? deployedByName;
  final String? deployedByAvatar;

  ProjectDeployment({
    required this.id,
    required this.environment,
    required this.url,
    required this.status,
    required this.version,
    this.previousVersion,
    this.durationSeconds = 0,
    this.pipelineRunUrl,
    this.deployedAt,
    this.deployedByName,
    this.deployedByAvatar,
  });

  factory ProjectDeployment.fromJson(Map<String, dynamic> json) {
    String? dName, dAvatar;
    if (json['deployedBy'] is Map) {
      dName = json['deployedBy']['name']?.toString();
      dAvatar = json['deployedBy']['avatar']?.toString();
    }

    return ProjectDeployment(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      environment: json['environment']?.toString() ?? 'Staging',
      url: json['url']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Live',
      version: json['version']?.toString() ?? 'v1.0.0',
      previousVersion: json['previousVersion']?.toString(),
      durationSeconds: (json['durationSeconds'] as num?)?.toInt() ?? 0,
      pipelineRunUrl: json['pipelineRunUrl']?.toString(),
      deployedAt: json['deployedAt']?.toString(),
      deployedByName: dName,
      deployedByAvatar: dAvatar,
    );
  }
}

class ProjectCredential {
  final String id;
  final String key;
  final String env;
  final String description;
  final bool isMasked;
  final String maskedValue;
  final String? plaintext;
  final String? updatedAt;

  ProjectCredential({
    required this.id,
    required this.key,
    required this.env,
    required this.description,
    this.isMasked = true,
    this.maskedValue = '••••••••••••••••',
    this.plaintext,
    this.updatedAt,
  });

  factory ProjectCredential.fromJson(Map<String, dynamic> json) {
    return ProjectCredential(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      key: json['key']?.toString() ?? '',
      env: json['env']?.toString() ?? 'Staging',
      description: json['description']?.toString() ?? '',
      isMasked: json['isMasked'] ?? true,
      maskedValue: json['maskedValue']?.toString() ?? '••••••••••••••••',
      plaintext: json['plaintext']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
    );
  }

  ProjectCredential copyWithPlaintext(String newPlaintext) {
    return ProjectCredential(
      id: id,
      key: key,
      env: env,
      description: description,
      isMasked: false,
      maskedValue: maskedValue,
      plaintext: newPlaintext,
      updatedAt: updatedAt,
    );
  }
}

class ProjectBug {
  final String id;
  final String ticketId;
  final String title;
  final String category;
  final String severity;
  final String priority;
  final String environment;
  final String module;
  final String description;
  final String? stepsToReproduce;
  final String? expectedBehavior;
  final String? actualBehavior;
  final List<String> attachments;
  final String status;
  final String createdByName;
  final String? createdByAvatar;
  final String? createdAt;
  final List<dynamic> blockedBy;
  final String? fixCommitHash;
  final String? fixBranch;
  final String? fixPrUrl;
  final String? resolutionNotes;
  final String? resolvedByName;
  final String? resolvedByAvatar;
  final String? resolvedByDesignation;
  final String? resolvedAt;
  final int reopenedCount;
  final int ageHours;
  final int ageDays;
  final bool isOverdue;
  final List<ProjectBugComment> comments;

  ProjectBug({
    required this.id,
    required this.ticketId,
    required this.title,
    required this.category,
    required this.severity,
    this.priority = 'Medium',
    this.environment = 'Production',
    this.module = 'General',
    required this.description,
    this.stepsToReproduce,
    this.expectedBehavior,
    this.actualBehavior,
    this.attachments = const [],
    required this.status,
    required this.createdByName,
    this.createdByAvatar,
    this.createdAt,
    this.blockedBy = const [],
    this.fixCommitHash,
    this.fixBranch,
    this.fixPrUrl,
    this.resolutionNotes,
    this.resolvedByName,
    this.resolvedByAvatar,
    this.resolvedByDesignation,
    this.resolvedAt,
    this.reopenedCount = 0,
    this.ageHours = 0,
    this.ageDays = 0,
    this.isOverdue = false,
    this.comments = const [],
  });

  factory ProjectBug.fromJson(Map<String, dynamic> json) {
    String cName = 'Engineer';
    String? cAvatar;
    if (json['createdBy'] is Map) {
      cName = json['createdBy']['name']?.toString() ?? 'Engineer';
      cAvatar = json['createdBy']['avatar']?.toString();
    }

    String? rName, rAvatar, rDesig;
    if (json['resolvedBy'] is Map) {
      rName = json['resolvedBy']['name']?.toString();
      rAvatar = json['resolvedBy']['avatar']?.toString();
      rDesig = json['resolvedBy']['designation']?.toString();
    }

    final commentList = (json['comments'] as List?)
            ?.map((e) => ProjectBugComment.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    final rawAtts = json['attachments'] as List?;
    final attList = <String>[];
    if (rawAtts != null) {
      for (final a in rawAtts) {
        if (a is String && a.isNotEmpty) {
          attList.add(a);
        } else if (a is Map && a['url'] != null) {
          attList.add(a['url'].toString());
        }
      }
    }

    return ProjectBug(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      ticketId: json['ticketId']?.toString() ?? 'BUG-000',
      title: json['title']?.toString() ?? '',
      category: json['category']?.toString() ?? 'Defect',
      severity: json['severity']?.toString() ?? 'Medium',
      priority: json['priority']?.toString() ?? 'Medium',
      environment: json['environment']?.toString() ?? 'Production',
      module: json['module']?.toString() ?? 'General',
      description: json['description']?.toString() ?? '',
      stepsToReproduce: json['stepsToReproduce']?.toString(),
      expectedBehavior: json['expectedBehavior']?.toString(),
      actualBehavior: json['actualBehavior']?.toString(),
      attachments: attList,
      status: json['status']?.toString() ?? 'Open',
      createdByName: cName,
      createdByAvatar: cAvatar,
      createdAt: json['createdAt']?.toString(),
      blockedBy: (json['blockedBy'] as List?) ?? [],
      fixCommitHash: json['fixCommitHash']?.toString(),
      fixBranch: json['fixBranch']?.toString(),
      fixPrUrl: json['fixPrUrl']?.toString(),
      resolutionNotes: json['resolutionNotes']?.toString(),
      resolvedByName: rName,
      resolvedByAvatar: rAvatar,
      resolvedByDesignation: rDesig,
      resolvedAt: json['resolvedAt']?.toString(),
      reopenedCount: (json['reopenedCount'] as num?)?.toInt() ?? 0,
      ageHours: (json['ageHours'] as num?)?.toInt() ?? 0,
      ageDays: (json['ageDays'] as num?)?.toInt() ?? 0,
      isOverdue: json['isOverdue'] ?? false,
      comments: commentList,
    );
  }
}

class ProjectBugComment {
  final String id;
  final String authorName;
  final String? authorAvatar;
  final String text;
  final String? createdAt;

  ProjectBugComment({
    required this.id,
    required this.authorName,
    this.authorAvatar,
    required this.text,
    this.createdAt,
  });

  factory ProjectBugComment.fromJson(Map<String, dynamic> json) {
    String aName = json['authorName']?.toString() ?? 'Engineer';
    String? aAvatar;
    if (json['author'] is Map) {
      aName = json['author']['name']?.toString() ?? aName;
      aAvatar = json['author']['avatar']?.toString();
    }

    return ProjectBugComment(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      authorName: aName,
      authorAvatar: aAvatar,
      text: json['text']?.toString() ?? '',
      createdAt: json['createdAt']?.toString(),
    );
  }
}

class ProjectActivityItem {
  final String id;
  final String actorName;
  final String? actorAvatar;
  final String action;
  final String title;
  final String details;
  final String? createdAt;

  ProjectActivityItem({
    required this.id,
    required this.actorName,
    this.actorAvatar,
    required this.action,
    required this.title,
    required this.details,
    this.createdAt,
  });

  factory ProjectActivityItem.fromJson(Map<String, dynamic> json) {
    String aName = json['actorName']?.toString() ?? 'System';
    String? aAvatar;
    if (json['actor'] is Map) {
      aName = json['actor']['name']?.toString() ?? aName;
      aAvatar = json['actor']['avatar']?.toString();
    }

    return ProjectActivityItem(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      actorName: aName,
      actorAvatar: aAvatar,
      action: json['action']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      details: json['details']?.toString() ?? '',
      createdAt: json['createdAt']?.toString(),
    );
  }
}
