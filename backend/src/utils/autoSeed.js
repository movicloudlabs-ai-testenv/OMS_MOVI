import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import Department from '../models/Department.js';
import Settings from '../models/Settings.js';
import { generatePermissionDefinitions } from '../config/permissionsConfig.js';
import { syncEmployeeIdCounters } from './syncEmployeeIdCounters.js';

/**
 * Auto-Seed on Startup
 * If a fresh/empty database is detected (0 users), automatically
 * populates the system with default roles, departments, settings, and standard demo users.
 */
export const ensureDefaultUsersExist = async () => {
  try {
    const userCount = await User.countDocuments({});
    if (userCount > 0) {
      return; // Already initialized
    }

    console.log('🌱 Empty database detected! Running initial auto-seed...');

    // 1. Settings
    const existingSettings = await Settings.findOne({ key: 'global' });
    if (!existingSettings) {
      await Settings.create({ key: 'global' });
    }

    // 2. Permissions
    const permissionsList = generatePermissionDefinitions();
    for (const def of permissionsList) {
      const exists = await Permission.findOne({ name: def.name });
      if (!exists) {
        await Permission.create(def);
      }
    }
    const allPerms = await Permission.find({});
    const permMap = {};
    allPerms.forEach((p) => {
      permMap[p.name] = p._id;
    });

    // 3. Roles
    const rolesData = [
      { name: 'Super Admin', slug: 'super-admin', permissions: allPerms.map((p) => p._id), isSystemRole: true },
      { name: 'Admin', slug: 'admin', permissions: allPerms.map((p) => p._id), isSystemRole: true },
      {
        name: 'HR Manager',
        slug: 'hr-manager',
        permissions: allPerms
          .filter((p) =>
            [
              'users.read', 'users.create', 'users.update', 'users.delete', 'users.archive',
              'departments.read', 'departments.create', 'departments.update',
              'roles.read', 'roles.create', 'roles.update',
              'attendance.read', 'attendance.create', 'attendance.update', 'attendance.export',
              'leave.read', 'leave.create', 'leave.update', 'leave.approve', 'leave.export',
              'interns.read', 'interns.create', 'interns.update', 'interns.delete',
              'tasks.read', 'tasks.create', 'tasks.update',
              'learning.read', 'learning.create', 'learning.update', 'learning.delete',
              'notifications.read', 'notifications.create',
              'reports.read', 'reports.export',
              'settings.read',
            ].includes(p.name) || p.resource === 'Recruitment' || p.resource === 'Daily Tracker'
          )
          .map((p) => p._id),
        isSystemRole: true,
      },
      {
        name: 'PMO Lead',
        slug: 'pmo-lead',
        permissions: allPerms
          .filter((p) =>
            [
              'projects.read', 'projects.create', 'projects.update', 'projects.delete', 'projects.assign',
              'tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete', 'tasks.assign',
              'users.read', 'attendance.read', 'attendance.create',
              'leave.read', 'leave.create', 'leave.update', 'leave.approve',
              'interns.read', 'interns.update',
              'notifications.read', 'notifications.create',
              'reports.read', 'reports.export',
            ].includes(p.name) || p.resource === 'Daily Tracker'
          )
          .map((p) => p._id),
        isSystemRole: true,
      },
      {
        name: 'Employee',
        slug: 'employee',
        permissions: allPerms
          .filter((p) =>
            [
              'tasks.read', 'tasks.update',
              'attendance.read', 'attendance.create',
              'leave.read', 'leave.create',
              'projects.read',
              'notifications.read',
            ].includes(p.name) || p.resource === 'Daily Tracker'
          )
          .map((p) => p._id),
        isSystemRole: true,
      },
      {
        name: 'Intern',
        slug: 'intern',
        permissions: allPerms
          .filter((p) =>
            [
              'tasks.read', 'tasks.update',
              'attendance.read', 'attendance.create',
              'leave.read', 'leave.create',
              'learning.read',
              'notifications.read',
            ].includes(p.name) || p.resource === 'Daily Tracker'
          )
          .map((p) => p._id),
        isSystemRole: true,
      },
    ];

    const roleMap = {};
    for (const r of rolesData) {
      let roleDoc = await Role.findOne({ slug: r.slug });
      if (!roleDoc) {
        roleDoc = await Role.create(r);
      }
      roleMap[r.slug] = roleDoc._id;
    }

    // 4. Departments
    const deptEngineering = await Department.findOneAndUpdate(
      { name: 'Engineering' },
      { name: 'Engineering', code: 'ENG' },
      { upsert: true, new: true }
    );
    const deptHR = await Department.findOneAndUpdate(
      { name: 'Human Resources' },
      { name: 'Human Resources', code: 'HR' },
      { upsert: true, new: true }
    );
    const deptPMO = await Department.findOneAndUpdate(
      { name: 'Project Management' },
      { name: 'Project Management', code: 'PMO' },
      { upsert: true, new: true }
    );

    // 5. Default Users
    const usersToCreate = [
      {
        name: 'Admin User',
        email: 'aswanthksv@gmail.com',
        password: await bcrypt.hash('Admin@123', 10),
        role: roleMap['super-admin'],
        department: deptEngineering._id,
        employmentType: 'Full-time',
        status: 'Active',
        employeeId: 'ADM-001',
        designation: 'System Administrator',
      },
      {
        name: 'Sarah Connor',
        email: 'sarah.hr@owms.com',
        password: await bcrypt.hash('HR@123456', 10),
        role: roleMap['hr-manager'],
        department: deptHR._id,
        employmentType: 'Full-time',
        status: 'Active',
        employeeId: 'EMP-001',
        designation: 'HR Manager',
      },
      {
        name: 'Michael Scott',
        email: 'pmo@owms.com',
        password: await bcrypt.hash('PMO@12345', 10),
        role: roleMap['pmo-lead'],
        department: deptPMO._id,
        employmentType: 'Full-time',
        status: 'Active',
        employeeId: 'EMP-002',
        designation: 'PMO Lead',
      },
      {
        name: 'Alex Johnson',
        email: 'alex.emp@owms.com',
        password: await bcrypt.hash('Emp@12345', 10),
        role: roleMap['employee'],
        department: deptEngineering._id,
        employmentType: 'Full-time',
        status: 'Active',
        employeeId: 'EMP-003',
        designation: 'Senior Developer',
      },
      {
        name: 'Rahul Verma',
        email: 'rahul.intern@owms.com',
        password: await bcrypt.hash('Int@12345', 10),
        role: roleMap['intern'],
        department: deptEngineering._id,
        employmentType: 'Intern',
        status: 'Active',
        employeeId: 'INT-001',
        designation: 'Frontend Intern',
      },
    ];

    for (const u of usersToCreate) {
      await User.findOneAndUpdate({ email: u.email }, u, { upsert: true });
    }

    await syncEmployeeIdCounters();
    console.log('✅ Auto-seed completed successfully. Default accounts ready.');
  } catch (err) {
    console.warn('⚠️ Auto-seed notice:', err.message);
  }
};
