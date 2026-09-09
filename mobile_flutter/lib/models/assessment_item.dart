class AssessmentQuestion {
  final String id;
  final String questionText;
  final String category;
  final String difficulty;
  final List<String> options;
  final int? correctOptionIndex;
  final int points;
  final String? codeSnippet;
  final String? explanation;

  AssessmentQuestion({
    required this.id,
    required this.questionText,
    required this.category,
    required this.difficulty,
    required this.options,
    this.correctOptionIndex,
    this.points = 10,
    this.codeSnippet,
    this.explanation,
  });

  factory AssessmentQuestion.fromJson(Map<String, dynamic> json) {
    final opts = (json['options'] as List?)?.map((e) => e.toString()).toList() ?? [];
    return AssessmentQuestion(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      questionText: json['questionText']?.toString() ?? '',
      category: json['category']?.toString() ?? 'Technical',
      difficulty: json['difficulty']?.toString() ?? 'Mid',
      options: opts,
      correctOptionIndex: (json['correctOptionIndex'] as num?)?.toInt(),
      points: (json['points'] as num?)?.toInt() ?? 10,
      codeSnippet: json['codeSnippet']?.toString(),
      explanation: json['explanation']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'questionText': questionText,
      'category': category,
      'difficulty': difficulty,
      'options': options,
      if (correctOptionIndex != null) 'correctOptionIndex': correctOptionIndex,
      'points': points,
      if (codeSnippet != null) 'codeSnippet': codeSnippet,
      if (explanation != null) 'explanation': explanation,
    };
  }
}

class AssessmentDriveStats {
  final int totalSubmissions;
  final int completed;
  final int passed;
  final int avgScore;
  final int questionCount;

  AssessmentDriveStats({
    this.totalSubmissions = 0,
    this.completed = 0,
    this.passed = 0,
    this.avgScore = 0,
    this.questionCount = 0,
  });

  factory AssessmentDriveStats.fromJson(Map<String, dynamic>? json) {
    if (json == null) return AssessmentDriveStats();
    return AssessmentDriveStats(
      totalSubmissions: (json['totalSubmissions'] as num?)?.toInt() ?? 0,
      completed: (json['completed'] as num?)?.toInt() ?? 0,
      passed: (json['passed'] as num?)?.toInt() ?? 0,
      avgScore: (json['avgScore'] as num?)?.toInt() ?? 0,
      questionCount: (json['questionCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class AssessmentDrive {
  final String id;
  final String title;
  final String role;
  final String department;
  final String sessionCode;
  final int durationMinutes;
  final int passingScore;
  final String status;
  final List<AssessmentQuestion> questions;
  final AssessmentDriveStats? stats;
  final String? createdAt;

  AssessmentDrive({
    required this.id,
    required this.title,
    required this.role,
    required this.department,
    required this.sessionCode,
    required this.durationMinutes,
    required this.passingScore,
    required this.status,
    required this.questions,
    this.stats,
    this.createdAt,
  });

  factory AssessmentDrive.fromJson(Map<String, dynamic> json) {
    final qList = (json['questions'] as List?)
            ?.map((q) => AssessmentQuestion.fromJson(q as Map<String, dynamic>))
            .toList() ??
        [];

    return AssessmentDrive(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      department: json['department']?.toString() ?? 'Engineering',
      sessionCode: json['sessionCode']?.toString() ?? '',
      durationMinutes: (json['durationMinutes'] as num?)?.toInt() ?? 30,
      passingScore: (json['passingScore'] as num?)?.toInt() ?? 70,
      status: json['status']?.toString() ?? 'Active',
      questions: qList,
      stats: json['stats'] is Map ? AssessmentDriveStats.fromJson(json['stats'] as Map<String, dynamic>) : null,
      createdAt: json['createdAt']?.toString(),
    );
  }
}

class CandidateSession {
  final String id;
  final String candidateName;
  final String candidateEmail;
  final String? candidatePhone;
  final String? startTime;
  final String? submittedAt;
  final int timeSpentSeconds;
  final int score;
  final int totalPoints;
  final int percentage;
  final bool passed;
  final int tabSwitchCount;
  final String status;
  final String? createdAt;

  CandidateSession({
    required this.id,
    required this.candidateName,
    required this.candidateEmail,
    this.candidatePhone,
    this.startTime,
    this.submittedAt,
    this.timeSpentSeconds = 0,
    this.score = 0,
    this.totalPoints = 0,
    this.percentage = 0,
    this.passed = false,
    this.tabSwitchCount = 0,
    required this.status,
    this.createdAt,
  });

  factory CandidateSession.fromJson(Map<String, dynamic> json) {
    return CandidateSession(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      candidateName: json['candidateName']?.toString() ?? 'Candidate',
      candidateEmail: json['candidateEmail']?.toString() ?? '',
      candidatePhone: json['candidatePhone']?.toString(),
      startTime: json['startTime']?.toString(),
      submittedAt: json['submittedAt']?.toString(),
      timeSpentSeconds: (json['timeSpentSeconds'] as num?)?.toInt() ?? 0,
      score: (json['score'] as num?)?.toInt() ?? 0,
      totalPoints: (json['totalPoints'] as num?)?.toInt() ?? 0,
      percentage: (json['percentage'] as num?)?.toInt() ?? 0,
      passed: json['passed'] == true,
      tabSwitchCount: (json['tabSwitchCount'] as num?)?.toInt() ?? 0,
      status: json['status']?.toString() ?? 'InProgress',
      createdAt: json['createdAt']?.toString(),
    );
  }
}

class CandidateSessionInitResult {
  final String sessionId;
  final AssessmentDrive drive;
  final List<AssessmentQuestion> questions;

  CandidateSessionInitResult({
    required this.sessionId,
    required this.drive,
    required this.questions,
  });

  factory CandidateSessionInitResult.fromJson(Map<String, dynamic> json) {
    final driveMap = json['drive'] as Map<String, dynamic>? ?? {};
    final qList = (json['questions'] as List?)
            ?.map((q) => AssessmentQuestion.fromJson(q as Map<String, dynamic>))
            .toList() ??
        [];

    return CandidateSessionInitResult(
      sessionId: json['sessionId']?.toString() ?? '',
      drive: AssessmentDrive.fromJson(driveMap),
      questions: qList,
    );
  }
}
