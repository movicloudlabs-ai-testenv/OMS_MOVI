/**
 * OWMS Demo Reset Script
 * Wipes all data, regenerates permissions, creates 6 system roles,
 * 6 departments, Settings singleton, and one Super Admin user.
 *
 * Usage: npm run demo:reset
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import Department from '../models/Department.js';
import Settings from '../models/Settings.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import LearningResource from '../models/LearningResource.js';
import InternRequest from '../models/InternRequest.js';
import Report from '../models/Report.js';
import ReportRun from '../models/ReportRun.js';
import { generatePermissionDefinitions } from './permissionsConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// ─── 1. Connect ──────────────────────────────────────────────────────────────

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected');
};

// ─── 2. Wipe all collections ─────────────────────────────────────────────────

const wipeAll = async () => {
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Role.deleteMany({}),
    Permission.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Attendance.deleteMany({}),
    LeaveRequest.deleteMany({}),
    LeaveBalance.deleteMany({}),
    AuditLog.deleteMany({}),
    Notification.deleteMany({}),
    Settings.deleteMany({}),
    LearningResource.deleteMany({}),
    InternRequest.deleteMany({}),
    Report.deleteMany({}),
    ReportRun.deleteMany({}),
  ]);
  console.log('🗑️  All collections cleared');
};

// ─── 3. Regenerate permissions ────────────────────────────────────────────────

const seedPermissions = async () => {
  const definitions = generatePermissionDefinitions();
  const perms = await Permission.insertMany(definitions);
  const permMap = {};
  perms.forEach(p => { permMap[p.name] = p._id; });
  console.log(`✅ Permissions: ${perms.length} created`);
  return { perms, permMap };
};

// ─── 4. Create 6 system roles ─────────────────────────────────────────────────

const seedRoles = async (permMap, allPermIds) => {
  const p = (name) => permMap[name];

  const roles = await Role.insertMany([
    {
      name: 'Super Admin',
      slug: 'super-admin',
      color: '#ef4444',
      isSystem: true,
      permissions: allPermIds,
    },
    {
      name: 'Admin',
      slug: 'admin',
      color: '#f97316',
      isSystem: true,
      // All except roles.delete and settings.update
      permissions: allPermIds.filter(id => {
        const name = Object.keys(permMap).find(k => permMap[k].toString() === id.toString());
        return name !== 'roles.delete' && name !== 'settings.update';
      }),
    },
    {
      name: 'HR Manager',
      slug: 'hr-manager',
      color: '#8b5cf6',
      isSystem: true,
      permissions: [
        p('users.read'), p('users.update'),
        p('departments.read'),
        p('attendance.read'), p('attendance.update'), p('attendance.export'),
        p('leave.read'), p('leave.create'), p('leave.update'), p('leave.approve'),
        p('interns.read'), p('interns.update'), p('interns.manage'),
        p('reports.read'), p('reports.export'),
        p('tasks.read'),
        p('roles.read'),
      ].filter(Boolean),
    },
    {
      name: 'PMO Lead',
      slug: 'pmo-lead',
      color: '#06b6d4',
      isSystem: true,
      permissions: [
        p('projects.create'), p('projects.read'), p('projects.update'),
        p('projects.delete'),
        p('tasks.create'), p('tasks.read'), p('tasks.update'), p('tasks.delete'),
        p('users.read'),
        p('interns.read'), p('interns.manage'),
        p('reports.read'), p('reports.export'),
        p('leave.read'),
      ].filter(Boolean),
    },
    {
      name: 'Employee',
      slug: 'employee',
      color: '#3b82f6',
      isSystem: true,
      permissions: [
        p('tasks.read'), p('tasks.update'),
        p('projects.read'),
        p('attendance.read'),
        p('leave.create'), p('leave.read'), p('leave.update'),
        p('users.read'),
      ].filter(Boolean),
    },
    {
      name: 'Intern',
      slug: 'intern',
      color: '#10b981',
      isSystem: true,
      permissions: [
        p('tasks.read'), p('tasks.update'),
        p('attendance.read'),
        p('leave.create'), p('leave.read'), p('leave.update'),
        p('projects.read'),
      ].filter(Boolean),
    },
  ]);

  console.log(`✅ Roles: ${roles.length} system roles created`);
  const roleMap = {};
  roles.forEach(r => { roleMap[r.slug] = r._id; });
  return roleMap;
};

// ─── 5. Settings singleton ────────────────────────────────────────────────────

const seedSettings = async () => {
  await Settings.create({ key: 'global' });
  console.log('✅ Settings: singleton initialized');
};

// ─── 6. Users ────────────────────────────────────────────────────────────────

const seedUsers = async (roleMap, deptMap) => {
  const year = new Date().getFullYear();
  const now = new Date();

  // Create one at a time so the pre-save password hash hook fires for each
  const admin = await User.create({
    name: 'Super Admin',
    email: 'admin@owms.com',
    password: 'Admin@123',
    role: roleMap['super-admin'],
    department: deptMap['PMO'],
    employeeId: `EMP-${year}-001`,
    employmentType: 'Full-time',
    status: 'Active',
  });

  const hr = await User.create({
    name: 'Sarah Johnson',
    email: 'hr@owms.com',
    password: 'HR@123456',
    role: roleMap['hr-manager'],
    department: deptMap['HR'],
    designation: 'HR Manager',
    employeeId: `EMP-${year}-002`,
    employmentType: 'Full-time',
    status: 'Active',
  });

  const pmo = await User.create({
    name: 'Alex Wong',
    email: 'pmo@owms.com',
    password: 'PMO@12345',
    role: roleMap['pmo-lead'],
    department: deptMap['PMO'],
    designation: 'PMO Lead',
    employeeId: `EMP-${year}-003`,
    employmentType: 'Full-time',
    status: 'Active',
  });

  const emp = await User.create({
    name: 'John Employee',
    email: 'john@owms.com',
    password: 'Emp@12345',
    role: roleMap['employee'],
    department: deptMap['ENG'],
    designation: 'Software Engineer',
    employeeId: `EMP-${year}-004`,
    employmentType: 'Full-time',
    status: 'Active',
    hrManager: hr._id,
  });

  const internStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const internEnd   = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const intern = await User.create({
    name: 'Rahul Intern',
    email: 'rahul@owms.com',
    password: 'Int@12345',
    role: roleMap['intern'],
    department: deptMap['ENG'],
    designation: 'Frontend Intern',
    employeeId: `INT-${year}-001`,
    employmentType: 'Intern',
    status: 'Active',
    college: 'Tech University',
    hrManager: hr._id,
    mentor: emp._id,
    internshipStart: internStart,
    internshipEnd: internEnd,
  });

  console.log(`✅ Users: 5 created (admin, HR, PMO, employee, intern)`);
  return { admin, hr, pmo, emp, intern };
};

// ─── 7. Departments ───────────────────────────────────────────────────────────

const seedDepartments = async () => {
  const depts = await Department.insertMany([
    { name: 'Engineering',        code: 'ENG', color: '#3b82f6' },
    { name: 'HR',                 code: 'HR',  color: '#8b5cf6' },
    { name: 'Design',             code: 'DES', color: '#ec4899' },
    { name: 'QA',                 code: 'QA',  color: '#f59e0b' },
    { name: 'Project Management', code: 'PMO', color: '#06b6d4' },
    { name: 'Marketing',          code: 'MKT', color: '#10b981' },
  ]);
  console.log(`✅ Departments: ${depts.length} created`);
  const deptMap = {};
  depts.forEach(d => { deptMap[d.code] = d._id; });
  return deptMap;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const run = async () => {
  try {
    await connectDB();
    await wipeAll();

    const { perms, permMap } = await seedPermissions();
    const allPermIds = perms.map(p => p._id);
    const roleMap = await seedRoles(permMap, allPermIds);

    await seedSettings();
    const deptMap = await seedDepartments();
    await seedUsers(roleMap, deptMap);

    console.log('');
    console.log('=== OWMS Demo Reset Complete ===');
    console.log(`Permissions: ${perms.length} auto-generated`);
    console.log('Roles: 6 system roles created');
    console.log('Departments: 6 created');
    console.log('Users: 5 created');
    console.log('Settings: singleton initialized');
    console.log('');
    console.log('--- Login Credentials ---');
    console.log('Super Admin : admin@owms.com  / Admin@123');
    console.log('HR Manager  : hr@owms.com     / HR@123456');
    console.log('PMO Lead    : pmo@owms.com    / PMO@12345');
    console.log('Employee    : john@owms.com   / Emp@12345');
    console.log('Intern      : rahul@owms.com  / Int@12345');

    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  }
};

run();
