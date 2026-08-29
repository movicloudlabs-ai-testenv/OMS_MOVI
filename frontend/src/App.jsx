import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute, ROLE_HOME } from './routes/ProtectedRoute';

// Auth
import LoginPage from './pages/auth/LoginPage';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Unauthorized from './pages/auth/Unauthorized';
import ForceChangePassword from './pages/auth/ForceChangePassword';

// Intern
import InternDashboard from './pages/intern/Dashboard';
import InternDailyTracker from './pages/intern/DailyTracker';
import InternEODReport from './pages/intern/EODReport';
import InternTasks from './pages/intern/Tasks';
import InternAttendance from './pages/intern/Attendance';
import InternLeave from './pages/intern/Leave';
import InternLearning from './pages/intern/Learning';
import InternDocuments from './pages/intern/Documents';
import InternPayments from './pages/intern/Payments';
import InternProfile from './pages/intern/Profile';

// Employee
import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeTasks from './pages/employee/Tasks';
import EmployeeProjects from './pages/employee/Projects';
import EmployeeTeam from './pages/employee/Team';
import EmployeeTeamDetails from './pages/employee/TeamDetails';
import EmployeeAttendance from './pages/employee/Attendance';
import EmployeeLeave from './pages/employee/Leave';
import EmployeeProfile from './pages/employee/Profile';

// HR
import HRDashboard from './pages/hr/Dashboard';
import HREmployees from './pages/hr/Employees';
import HRAddEmployee from './pages/hr/AddEmployee';
import HREmployeeDetails from './pages/hr/EmployeeDetails';
import HRInterns from './pages/hr/Interns';
import HRInternDetails from './pages/hr/InternDetails';
import HRRecruitment from './pages/hr/Recruitment';
import HRCandidateDetails from './pages/hr/CandidateDetails';
import HRDailyTracker from './pages/hr/DailyTracker';
import HREODReports from './pages/hr/EODReports';
import HRLeaveApproval from './pages/hr/LeaveApproval';
import PMODailyTracker from './pages/pmo/DailyTracker';
import PMOEODReports from './pages/pmo/EODReports';
import PMOMyDailyTracker from './pages/pmo/MyDailyTracker';
import PMOMyEODReport from './pages/pmo/MyEODReport';
import HROnboarding from './pages/hr/Onboarding';
import HRAttendance from './pages/hr/Attendance';
import HRDocuments from './pages/hr/Documents';
import HRPerformance from './pages/hr/Performance';
import HRCommunication from './pages/hr/Communication';
import HRAssignTask from './pages/hr/AssignTask';
import HRTaskBoard from './pages/hr/TaskBoard';
import HRProjects from './pages/hr/Projects';
import HRMyLeave from './pages/hr/MyLeave';
import HRMyAttendance from './pages/hr/MyAttendance';
import HRProfile from './pages/hr/Profile';
import IssueSupport from './pages/IssueSupport';
import BugSheet from './pages/BugSheet';

// PMO
import PMODashboard from './pages/pmo/Dashboard';
import PMOProjects from './pages/pmo/Projects';
import PMOProjectDetails from './pages/pmo/ProjectDetails';
import PMOTasks from './pages/pmo/Tasks';
import PMOMonitoring from './pages/pmo/Monitoring';
import PMOTimeline from './pages/pmo/Timeline';
import PMOApprovals from './pages/pmo/Approvals';
import PMOTeam from './pages/pmo/Team';
import PMOInterns from './pages/pmo/Interns';
import PMOInternDetails from './pages/pmo/InternDetails';
import PMOEmployees from './pages/pmo/Employees';
import PMOEmployeeDetails from './pages/pmo/EmployeeDetails';
import PMOReports from './pages/pmo/Reports';
import PMOAttendance from './pages/pmo/Attendance';
import PMOProfile from './pages/pmo/Profile';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminCreateUser from './pages/admin/CreateUser';
import AdminUserDetails from './pages/admin/UserDetails';
import AdminDepartments from './pages/admin/Departments';
import AdminCreateDepartment from './pages/admin/CreateDepartment';
import AdminDepartmentDetails from './pages/admin/DepartmentDetails';
import AdminEditDepartment from './pages/admin/EditDepartment';
import AdminEditUser from './pages/admin/EditUser';
import AdminEditRole from './pages/admin/EditRole';
import AdminRoles from './pages/admin/Roles';
import AdminCreateRole from './pages/admin/CreateRole';
import AdminRoleDetails from './pages/admin/RoleDetails';
import AdminAccessMatrix from './pages/admin/AccessMatrix';
import AdminAuditLogs from './pages/admin/AuditLogs';
import AdminReports from './pages/admin/Reports';
import AdminCreateReport from './pages/admin/CreateReport';
import AdminSettings from './pages/admin/Settings';
import AdminPayments from './pages/admin/Payments';
import AdminProfile from './pages/admin/Profile';

// Profile
import Profile from './pages/Profile';

function RoleRedirect() {
  const { user } = useAuth();
  if (user) {
    const slug = user.role?.slug || user.role || '';
    return <Navigate to={ROLE_HOME[slug] || '/login'} replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/change-password" element={<ForceChangePassword />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* Intern */}
      <Route path="/intern/dashboard" element={<ProtectedRoute allowedRoles={['intern']}><InternDashboard /></ProtectedRoute>} />
      <Route path="/intern/daily-tracker" element={<ProtectedRoute allowedRoles={['intern']}><InternDailyTracker /></ProtectedRoute>} />
      <Route path="/intern/eod-report" element={<ProtectedRoute allowedRoles={['intern']}><InternEODReport /></ProtectedRoute>} />
      <Route path="/intern/tasks" element={<ProtectedRoute allowedRoles={['intern']}><InternTasks /></ProtectedRoute>} />
      <Route path="/intern/attendance" element={<ProtectedRoute allowedRoles={['intern']}><InternAttendance /></ProtectedRoute>} />
      <Route path="/intern/leave" element={<ProtectedRoute allowedRoles={['intern']}><InternLeave /></ProtectedRoute>} />
      <Route path="/intern/learning" element={<ProtectedRoute allowedRoles={['intern']}><InternLearning /></ProtectedRoute>} />
      <Route path="/intern/documents" element={<ProtectedRoute allowedRoles={['intern']}><InternDocuments /></ProtectedRoute>} />
      <Route path="/intern/payments" element={<ProtectedRoute allowedRoles={['intern']}><InternPayments /></ProtectedRoute>} />
      <Route path="/intern/profile" element={<ProtectedRoute allowedRoles={['intern']}><InternProfile /></ProtectedRoute>} />

      {/* Employee */}
      <Route path="/employee/dashboard" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/employee/tasks" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeTasks /></ProtectedRoute>} />
      <Route path="/employee/projects" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeProjects /></ProtectedRoute>} />
      <Route path="/employee/team" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeTeam /></ProtectedRoute>} />
      <Route path="/employee/team/:id" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeTeamDetails /></ProtectedRoute>} />
      <Route path="/employee/attendance" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeAttendance /></ProtectedRoute>} />
      <Route path="/employee/leave" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeLeave /></ProtectedRoute>} />
      <Route path="/employee/profile" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeProfile /></ProtectedRoute>} />


      {/* Issue Support — routing is role-aware in the backend */}
      <Route path="/support/issues" element={<ProtectedRoute allowedRoles={['intern','employee','hr','pmo','admin']}><IssueSupport /></ProtectedRoute>} />
      <Route path="/support/bugs" element={<ProtectedRoute allowedRoles={['intern','employee','hr','pmo','admin']}><BugSheet /></ProtectedRoute>} />

      {/* HR */}
      <Route path="/hr/dashboard" element={<ProtectedRoute allowedRoles={['hr']}><HRDashboard /></ProtectedRoute>} />
      <Route path="/hr/employees" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Users', action: 'read' }}><HREmployees /></ProtectedRoute>} />
      <Route path="/hr/employees/new" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Users', action: 'create' }}><HRAddEmployee /></ProtectedRoute>} />
      <Route path="/hr/employees/:id" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Users', action: 'read' }}><HREmployeeDetails /></ProtectedRoute>} />
      <Route path="/hr/interns"    element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Interns', action: 'read' }}><HRInterns /></ProtectedRoute>} />
      <Route path="/hr/interns/:id" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Interns', action: 'read' }}><HRInternDetails /></ProtectedRoute>} />
      <Route path="/hr/recruitment"    element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Recruitment', action: 'read' }}><HRRecruitment /></ProtectedRoute>} />
      <Route path="/hr/recruitment/:id" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Recruitment', action: 'read' }}><HRCandidateDetails /></ProtectedRoute>} />
      <Route path="/hr/daily-tracker" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Daily Tracker', action: 'read' }}><HRDailyTracker /></ProtectedRoute>} />
      <Route path="/hr/eod-reports" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Daily Tracker', action: 'read' }}><HREODReports /></ProtectedRoute>} />
      <Route path="/hr/leave-approval" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Leave', action: 'read' }}><HRLeaveApproval /></ProtectedRoute>} />
      <Route path="/pmo/daily-tracker" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Daily Tracker', action: 'read' }}><PMODailyTracker /></ProtectedRoute>} />
      <Route path="/pmo/eod-reports" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Daily Tracker', action: 'read' }}><PMOEODReports /></ProtectedRoute>} />
      <Route path="/pmo/my-daily-tracker" element={<ProtectedRoute allowedRoles={['pmo']}><PMOMyDailyTracker /></ProtectedRoute>} />
      <Route path="/pmo/my-eod-report" element={<ProtectedRoute allowedRoles={['pmo']}><PMOMyEODReport /></ProtectedRoute>} />
      <Route path="/hr/onboarding" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Users', action: 'update' }}><HROnboarding /></ProtectedRoute>} />
      <Route path="/hr/attendance" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Attendance', action: 'read' }}><HRAttendance /></ProtectedRoute>} />
      <Route path="/hr/documents" element={<ProtectedRoute allowedRoles={['hr']}><HRDocuments /></ProtectedRoute>} />
      <Route path="/hr/tasks" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Tasks', action: 'read' }}><HRTaskBoard /></ProtectedRoute>} />
      <Route path="/hr/performance" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Interns', action: 'read' }}><HRPerformance /></ProtectedRoute>} />
      <Route path="/hr/projects" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Projects', action: 'read' }}><HRProjects /></ProtectedRoute>} />
      <Route path="/hr/my-leave" element={<ProtectedRoute allowedRoles={['hr']}><HRMyLeave /></ProtectedRoute>} />
      <Route path="/hr/my-attendance" element={<ProtectedRoute allowedRoles={['hr']}><HRMyAttendance /></ProtectedRoute>} />
      <Route path="/hr/communication" element={<ProtectedRoute allowedRoles={['hr']}><HRCommunication /></ProtectedRoute>} />
      <Route path="/hr/tasks/new" element={<ProtectedRoute allowedRoles={['hr']} permission={{ resource: 'Tasks', action: 'create' }}><HRAssignTask /></ProtectedRoute>} />
      <Route path="/hr/profile" element={<ProtectedRoute allowedRoles={['hr']}><HRProfile /></ProtectedRoute>} />

      {/* PMO */}
      <Route path="/pmo/dashboard" element={<ProtectedRoute allowedRoles={['pmo']}><PMODashboard /></ProtectedRoute>} />
      <Route path="/pmo/projects" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Projects', action: 'read' }}><PMOProjects /></ProtectedRoute>} />
      <Route path="/pmo/projects/:id" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Projects', action: 'read' }}><PMOProjectDetails /></ProtectedRoute>} />
      <Route path="/pmo/tasks" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Tasks', action: 'read' }}><PMOTasks /></ProtectedRoute>} />
      <Route path="/pmo/team" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Users', action: 'read' }}><PMOTeam /></ProtectedRoute>} />
      <Route path="/pmo/interns" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Interns', action: 'read' }}><PMOInterns /></ProtectedRoute>} />
      <Route path="/pmo/interns/:id" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Interns', action: 'read' }}><PMOInternDetails /></ProtectedRoute>} />
      <Route path="/pmo/employees" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Users', action: 'read' }}><PMOEmployees /></ProtectedRoute>} />
      <Route path="/pmo/employees/:id" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Users', action: 'read' }}><PMOEmployeeDetails /></ProtectedRoute>} />
      <Route path="/pmo/monitoring" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Projects', action: 'read' }}><PMOMonitoring /></ProtectedRoute>} />
      <Route path="/pmo/timeline" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Projects', action: 'read' }}><PMOTimeline /></ProtectedRoute>} />
      <Route path="/pmo/approvals" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Tasks', action: 'read' }}><PMOApprovals /></ProtectedRoute>} />
      <Route path="/pmo/reports" element={<ProtectedRoute allowedRoles={['pmo']} permission={{ resource: 'Reports', action: 'read' }}><PMOReports /></ProtectedRoute>} />
      <Route path="/pmo/attendance" element={<ProtectedRoute allowedRoles={['pmo']}><PMOAttendance /></ProtectedRoute>} />
      <Route path="/pmo/profile" element={<ProtectedRoute allowedRoles={['pmo']}><PMOProfile /></ProtectedRoute>} />

      {/* Admin — strictly admin-only (security-sensitive) */}
      <Route path="/admin/dashboard"    element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/payments"     element={<ProtectedRoute allowedRoles={['admin']}><AdminPayments /></ProtectedRoute>} />
      <Route path="/admin/access-matrix" element={<ProtectedRoute allowedRoles={['admin']}><AdminAccessMatrix /></ProtectedRoute>} />
      <Route path="/admin/settings"     element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Settings', action: 'update' }}><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/profile"      element={<ProtectedRoute allowedRoles={['admin']}><AdminProfile /></ProtectedRoute>} />

      {/* Admin — Users: admin always, others if granted Users permission */}
      <Route path="/admin/users"        element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Users', action: 'read' }}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/users/new"    element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Users', action: 'create' }}><AdminCreateUser /></ProtectedRoute>} />
      <Route path="/admin/users/:id"    element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Users', action: 'read' }}><AdminUserDetails /></ProtectedRoute>} />
      <Route path="/admin/users/:id/edit" element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Users', action: 'update' }}><AdminEditUser /></ProtectedRoute>} />

      {/* Admin — Departments: admin always, others if granted */}
      <Route path="/admin/departments"          element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Departments', action: 'read' }}><AdminDepartments /></ProtectedRoute>} />
      <Route path="/admin/departments/new"      element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Departments', action: 'create' }}><AdminCreateDepartment /></ProtectedRoute>} />
      <Route path="/admin/departments/:id"      element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Departments', action: 'read' }}><AdminDepartmentDetails /></ProtectedRoute>} />
      <Route path="/admin/departments/:id/edit" element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Departments', action: 'update' }}><AdminEditDepartment /></ProtectedRoute>} />

      {/* Admin — Roles: admin always, others if granted */}
      <Route path="/admin/roles"        element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Roles', action: 'read' }}><AdminRoles /></ProtectedRoute>} />
      <Route path="/admin/roles/new"    element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Roles', action: 'create' }}><AdminCreateRole /></ProtectedRoute>} />
      <Route path="/admin/roles/:id"    element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Roles', action: 'read' }}><AdminRoleDetails /></ProtectedRoute>} />
      <Route path="/admin/roles/:id/edit" element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Roles', action: 'update' }}><AdminEditRole /></ProtectedRoute>} />

      {/* Admin — Audit & Reports: admin always, others if granted */}
      <Route path="/admin/audit"        element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Audit Logs', action: 'read' }}><AdminAuditLogs /></ProtectedRoute>} />
      <Route path="/admin/reports"      element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Reports', action: 'read' }}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/reports/new"  element={<ProtectedRoute allowedRoles={['admin']} permission={{ resource: 'Reports', action: 'create' }}><AdminCreateReport /></ProtectedRoute>} />

      
      {/* Global Profile Route */}
      <Route path="/profile" element={<ProtectedRoute allowedRoles={['intern', 'employee', 'hr', 'pmo', 'admin']}><Profile /></ProtectedRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
