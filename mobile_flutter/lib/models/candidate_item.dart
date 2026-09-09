class CandidateScorecard {
  final int technical;
  final int problemSolving;
  final int cultureFit;
  final int communication;
  final double overall;
  final String recommendation;
  final String? notes;
  final DateTime? evaluatedAt;

  CandidateScorecard({
    required this.technical,
    required this.problemSolving,
    required this.cultureFit,
    required this.communication,
    required this.overall,
    required this.recommendation,
    this.notes,
    this.evaluatedAt,
  });

  factory CandidateScorecard.fromJson(Map<String, dynamic> json) {
    return CandidateScorecard(
      technical: (json['technical'] as num?)?.toInt() ?? 3,
      problemSolving: (json['problemSolving'] as num?)?.toInt() ?? 3,
      cultureFit: (json['cultureFit'] as num?)?.toInt() ?? 3,
      communication: (json['communication'] as num?)?.toInt() ?? 3,
      overall: (json['overall'] as num?)?.toDouble() ?? 3.0,
      recommendation: json['recommendation']?.toString() ?? 'Hire',
      notes: json['notes']?.toString(),
      evaluatedAt: json['evaluatedAt'] != null ? DateTime.tryParse(json['evaluatedAt'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'technical': technical,
    'problemSolving': problemSolving,
    'cultureFit': cultureFit,
    'communication': communication,
    'overall': overall,
    'recommendation': recommendation,
    'notes': notes,
  };
}

class CandidateOfferDetails {
  final String designation;
  final String department;
  final DateTime? joiningDate;
  final String probationPeriod;
  final String workMode;
  final String? reportingManager;
  final String serialNumber;
  final String status;
  final DateTime? issuedAt;

  CandidateOfferDetails({
    required this.designation,
    required this.department,
    this.joiningDate,
    required this.probationPeriod,
    required this.workMode,
    this.reportingManager,
    required this.serialNumber,
    required this.status,
    this.issuedAt,
  });

  factory CandidateOfferDetails.fromJson(Map<String, dynamic> json) {
    return CandidateOfferDetails(
      designation: json['designation']?.toString() ?? 'Software Engineer',
      department: json['department']?.toString() ?? 'Engineering',
      joiningDate: json['joiningDate'] != null ? DateTime.tryParse(json['joiningDate'].toString()) : null,
      probationPeriod: json['probationPeriod']?.toString() ?? '3 Months',
      workMode: json['workMode']?.toString() ?? 'Office',
      reportingManager: json['reportingManager']?.toString(),
      serialNumber: json['serialNumber']?.toString() ?? 'OFF-2026-0001',
      status: json['status']?.toString() ?? 'Issued',
      issuedAt: json['issuedAt'] != null ? DateTime.tryParse(json['issuedAt'].toString()) : null,
    );
  }
}

class CandidateItem {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? college;
  final String? domain;
  final String? appliedRole;
  final String recruitmentStatus;
  final String interviewResult;
  final String? interviewNotes;
  final String? interviewDate;
  final String? joiningDate;
  final String? convertedTo;
  final CandidateScorecard? scorecard;
  final CandidateOfferDetails? offerDetails;
  final String? resumeFileName;
  final String? resumeFilePath;

  CandidateItem({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.college,
    this.domain,
    this.appliedRole,
    required this.recruitmentStatus,
    required this.interviewResult,
    this.interviewNotes,
    this.interviewDate,
    this.joiningDate,
    this.convertedTo,
    this.scorecard,
    this.offerDetails,
    this.resumeFileName,
    this.resumeFilePath,
  });

  factory CandidateItem.fromJson(Map<String, dynamic> json) {
    CandidateScorecard? sc;
    if (json['interviewScorecard'] is Map<String, dynamic>) {
      sc = CandidateScorecard.fromJson(json['interviewScorecard'] as Map<String, dynamic>);
    }

    CandidateOfferDetails? od;
    if (json['offerDetails'] is Map<String, dynamic>) {
      od = CandidateOfferDetails.fromJson(json['offerDetails'] as Map<String, dynamic>);
    }

    String? rName;
    String? rPath;
    if (json['documents'] is Map) {
      final docs = json['documents'] as Map;
      if (docs['resume'] is Map) {
        rName = docs['resume']['fileName']?.toString();
        rPath = docs['resume']['filePath']?.toString();
      }
    }

    return CandidateItem(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString(),
      college: json['college']?.toString(),
      domain: json['domain']?.toString(),
      appliedRole: json['appliedRole']?.toString(),
      recruitmentStatus: json['recruitmentStatus']?.toString() ?? 'Applied',
      interviewResult: json['interviewResult']?.toString() ?? 'Pending',
      interviewNotes: json['interviewNotes']?.toString(),
      interviewDate: json['interviewDate']?.toString(),
      joiningDate: json['joiningDate']?.toString(),
      convertedTo: json['convertedTo']?.toString(),
      scorecard: sc,
      offerDetails: od,
      resumeFileName: rName,
      resumeFilePath: rPath,
    );
  }
}

