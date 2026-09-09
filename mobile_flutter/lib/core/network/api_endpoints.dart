class ApiEndpoints {
  // Auth
  static const String login = '/api/auth/login';
  static const String me = '/api/auth/me';
  static const String refresh = '/api/auth/refresh';
  static const String logout = '/api/auth/logout';

  // Employee
  static const String todayAttendance = '/api/employee/attendance/today';
  static const String resetTodayAttendance = '/api/employee/attendance/reset-today';
  static const String checkIn = '/api/employee/attendance/check-in';
  static const String checkOut = '/api/employee/attendance/check-out';
  static const String breakStart = '/api/employee/attendance/break/start';
  static const String breakEnd = '/api/employee/attendance/break/end';
  static const String attendanceHistory = '/api/employee/attendance';
  static const String attendanceRegularize = '/api/employee/attendance/regularize';
  static const String myAttendanceRegularizations = '/api/employee/attendance/regularize/my';
  static const String employeeTasks = '/api/employee/tasks';
  static const String employeeMyProjects = '/api/employee/tasks/my-projects';
  static String employeeProjectMembers(String projectId) => '/api/employee/tasks/project-members/$projectId';
  static const String employeeCreateProjectTask = '/api/employee/tasks/create-task';
  static String employeeSendToTesting(String id) => '/api/employee/tasks/$id/send-to-testing';
  static String employeeTestSubtask(String taskId, String subtaskId) => '/api/employee/tasks/$taskId/test-subtask/$subtaskId';
  static const String createPersonalTask = '/api/employee/tasks/personal';
  static String updateTaskStatus(String id) => '/api/employee/tasks/$id/status';
  static String toggleSubtask(String taskId, String subtaskId) => '/api/employee/tasks/$taskId/subtasks/$subtaskId';
  static const String leaveBalance = '/api/employee/leave/balance';
  static const String leaveRequests = '/api/employee/leave/requests';
  static const String applyLeave = '/api/employee/leave/apply';
  static const String submitEod = '/api/employee/eod/submit';
  static const String todayEod = '/api/employee/eod/today';

  // Intern
  static const String internProjects = '/api/intern/projects';
  static String internProject(String id) => '/api/intern/projects/$id';
  static const String internTasks = '/api/intern/tasks';
  static String internTaskStatus(String id) => '/api/intern/tasks/$id/status';
  static String internToggleSubtask(String taskId, String subtaskId) => '/api/intern/tasks/$taskId/subtasks/$subtaskId';
  static const String internAttendanceToday = '/api/intern/attendance/today';
  static const String internResetTodayAttendance = '/api/intern/attendance/reset-today';
  static const String internCheckIn = '/api/intern/attendance/check-in';
  static const String internCheckOut = '/api/intern/attendance/check-out';
  static const String internBreakStart = '/api/intern/attendance/break/start';
  static const String internBreakEnd = '/api/intern/attendance/break/end';
  static const String internAttendanceHistory = '/api/intern/attendance';
  static const String internAttendanceRegularize = '/api/intern/attendance/regularize';
  static const String internAttendanceRegularizeMy = '/api/intern/attendance/regularize/my';
  static const String internLeaveBalance = '/api/intern/leave/balance';
  static const String internLeaves = '/api/intern/leave';
  static const String internDailyTrackerToday = '/api/intern/daily-tracker/today';
  static const String internDailyTracker = '/api/intern/daily-tracker';
  static const String internEodToday = '/api/intern/eod/today';
  static const String internEod = '/api/intern/eod';
  static const String internLearning = '/api/intern/learning';

  // HR
  static const String hrEmployees = '/api/hr/employees';
  static const String hrLeaves = '/api/hr/leaves';
  static const String hrLeaveBalances = '/api/hr/leaves/balances';
  static String hrLeaveBalanceUser(String id) => '/api/hr/leaves/balance/$id';
  static const String hrAllocateLeaveBalance = '/api/hr/leaves/balance';
  static const String hrPendingLeaves = '/api/hr/leaves/pending';
  static const String hrMyLeaves = '/api/hr/leaves/my';
  static const String hrMyLeaveBalance = '/api/hr/leaves/my/balance';
  static const String hrApplyMyLeave = '/api/hr/leaves/my/apply';
  static String hrUpdateLeave(String id) => '/api/hr/leaves/$id/review';
  static const String hrAttendanceSummary = '/api/hr/reports/attendance-summary';
  static const String hrHeadcount = '/api/hr/reports/headcount';
  static const String hrLeaveSummary = '/api/hr/reports/leave-summary';
  static const String hrRecruitment = '/api/hr/recruitment';
  static const String hrRecruitmentStats = '/api/hr/recruitment/stats';
  static const String hrAttendance = '/api/hr/attendance';
  static const String hrAttendanceTodayRoster = '/api/hr/attendance/today-roster';
  static const String hrAttendanceRegularizations = '/api/hr/attendance/regularizations';
  static String hrAttendanceRegularizeReview(String id) => '/api/hr/attendance/regularize/$id';
  static const String hrAttendanceOverride = '/api/hr/attendance/override';
  static const String hrAttendanceExport = '/api/hr/attendance/export';
  static const String hrOnboarding = '/api/hr/onboarding';
  static const String hrInterns = '/api/hr/interns';
  static const String hrInternsExport = '/api/hr/interns/export';
  static const String hrInternMentors = '/api/hr/interns/meta/mentors';
  static String hrIntern(String id) => '/api/hr/interns/$id';
  static String hrInternPerformance(String id) => '/api/hr/interns/$id/performance';
  static String hrInternAssignMentor(String id) => '/api/hr/interns/$id/assign-mentor';
  static String hrInternConvert(String id) => '/api/hr/interns/$id/convert';
  static String hrInternLearning(String id) => '/api/hr/interns/$id/learning';
  static String hrInternLearningDelete(String id, String resId) => '/api/hr/interns/$id/learning/$resId';
  static String hrEmployeePersonnel(String id) => '/api/hr/employees/$id/personnel';
  static String hrCandidate(String id) => '/api/hr/recruitment/$id';
  static String hrCandidateConvert(String id) => '/api/hr/recruitment/$id/convert-to-user';
  static String hrCandidateScorecard(String id) => '/api/hr/recruitment/$id/scorecard';
  static String hrCandidateOffer(String id) => '/api/hr/recruitment/$id/generate-offer';
  static const String hrAssessments = '/api/hr/assessments';
  static String hrAssessmentDrive(String id) => '/api/hr/assessments/$id';
  static String hrAssessmentQuestions(String id) => '/api/hr/assessments/$id/questions';
  static String hrAssessmentQuestionDelete(String id, String qId) => '/api/hr/assessments/$id/questions/$qId';
  static String hrAssessmentSubmissions(String id) => '/api/hr/assessments/$id/submissions';
  static const String candidateSessionStart = '/api/hr/assessments/session/start';
  static const String candidateSessionSubmit = '/api/hr/assessments/session/submit';
  static const String candidateSessionTabSwitch = '/api/hr/assessments/session/tab-switch';
  static const String candidateSessionActiveStatus = '/api/hr/assessments/session/active-status';

  // PMO & Projects
  static const String pmoProjects = '/api/pmo/projects';
  static String pmoProject(String id) => '/api/pmo/projects/$id';
  static String pmoProjectTeam(String id) => '/api/pmo/projects/$id/team';
  static String pmoProjectTeamMember(String id, String userId) => '/api/pmo/projects/$id/team/$userId';
  static String pmoProjectMilestones(String id) => '/api/pmo/projects/$id/milestones';
  static String pmoProjectMilestone(String id, String milestoneId) => '/api/pmo/projects/$id/milestones/$milestoneId';
  static String pmoProjectDeployments(String id) => '/api/pmo/projects/$id/deployments';
  static String pmoProjectCredentials(String id) => '/api/pmo/projects/$id/credentials';
  static String pmoProjectCredentialReveal(String id, String credId) => '/api/pmo/projects/$id/credentials/$credId/reveal';
  static String pmoProjectCredentialDelete(String id, String credId) => '/api/pmo/projects/$id/credentials/$credId';
  static String pmoProjectBugs(String id) => '/api/pmo/projects/$id/bugs';
  static String pmoProjectBugResolve(String id, String bugId) => '/api/pmo/projects/$id/bugs/$bugId/resolve';
  static String pmoProjectBugReopen(String id, String bugId) => '/api/pmo/projects/$id/bugs/$bugId/reopen';
  static String pmoProjectBugComments(String id, String bugId) => '/api/pmo/projects/$id/bugs/$bugId/comments';
  static String pmoProjectActivity(String id) => '/api/pmo/projects/$id/activity';
  static const String pmoTasks = '/api/pmo/tasks';
  static String pmoReviewTask(String id) => '/api/pmo/tasks/$id/review';
  static String pmoSendToTesting(String id) => '/api/pmo/tasks/$id/send-to-testing';
  static String pmoTestSubtask(String taskId, String subtaskId) => '/api/pmo/tasks/$taskId/test-subtask/$subtaskId';
  static String pmoCreateTask = '/api/pmo/tasks';
  static const String pmoAvailableTeam = '/api/pmo/team/available';
  static String pmoProjectSprints(String id) => '/api/pmo/projects/$id/sprints';
  static String pmoProjectSprintStart(String id, String sprintId) => '/api/pmo/projects/$id/sprints/$sprintId/start';
  static String pmoProjectSprintComplete(String id, String sprintId) => '/api/pmo/projects/$id/sprints/$sprintId/complete';
  static String pmoProjectKanban(String id) => '/api/pmo/projects/$id/kanban';
  static String pmoProjectTaskStatus(String id, String taskId) => '/api/pmo/projects/$id/tasks/$taskId/status';
  static String pmoProjectGantt(String id) => '/api/pmo/projects/$id/gantt';
  static String pmoProjectChangeLead(String id) => '/api/pmo/projects/$id/lead';
  static const String pmoAvailableManagers = '/api/pmo/team/available';

  // Admin
  static const String adminStats = '/api/admin/dashboard/stats';
  static const String adminUsers = '/api/admin/users';
  static const String adminLogs = '/api/admin/audit-logs';
  static const String adminDepartments = '/api/admin/departments';
  static const String adminRoles = '/api/admin/roles';

  // Notifications
  static const String notifications = '/api/notifications';
  static String markNotificationRead(String id) => '/api/notifications/$id/read';
  static const String markAllNotificationsRead = '/api/notifications/read-all';

  // Chat
  static const String chatChannels = '/api/chat/channels';
  static String chatChannelRead(String channelId) => '/api/chat/channels/$channelId/read';
  static String chatChannelAvatar(String channelId) => '/api/chat/channels/$channelId/avatar';
  static String chatChannelMembers(String channelId) => '/api/chat/channels/$channelId/members';
  static const String chatMessages = '/api/chat/messages';
  static String chatMessageInfo(String messageId) => '/api/chat/messages/$messageId/info';
  static const String chatUpload = '/api/chat/upload';
  static const String chatAnnouncements = '/api/chat/announcements';
  static const String chatCreateTaskFromMessage = '/api/chat/tasks/from-message';
  static const String chatUsers = '/api/chat/users';
}
