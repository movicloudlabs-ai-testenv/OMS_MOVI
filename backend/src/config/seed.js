import { generatePermissionDefinitions } from './permissionsConfig.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
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
import LearningResource from '../models/LearningResource.js';
import Notification from '../models/Notification.js';
import InternRequest from '../models/InternRequest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected for Seeding');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

const permissionsList = generatePermissionDefinitions();

const seedData = async () => {
  try {
    await connectDB();
    console.log('Dropping database...');
    await mongoose.connection.db.dropDatabase();

    console.log('Creating Settings...');
    await Settings.create({ key: 'global' });

    console.log('Creating Permissions...');
    const insertedPerms = await Permission.insertMany(permissionsList);
    const permMap = {};
    insertedPerms.forEach(p => { permMap[p.name] = p._id; });

    const getAllPerms = () => Object.values(permMap);
    const getPermsByPrefix = (prefix) => insertedPerms.filter(p => p.name.startsWith(prefix)).map(p => p._id);

    console.log('Creating Roles...');
    const insertedRoles = await Role.insertMany([
      { name: 'Super Admin', slug: 'super-admin', isSystem: true, color: '#ef4444', permissions: getAllPerms() },
      { name: 'Admin', slug: 'admin', isSystem: true, color: '#f97316', permissions: getAllPerms() },
      { name: 'HR Manager', slug: 'hr-manager', isSystem: true, color: '#8b5cf6', permissions: [
          permMap['users.read'], permMap['users.create'], permMap['users.update'],
          ...getPermsByPrefix('departments.'), ...getPermsByPrefix('attendance.'),
          ...getPermsByPrefix('leave.'), ...getPermsByPrefix('interns.'),
        ]
      },
      { name: 'PMO Lead', slug: 'pmo-lead', isSystem: true, color: '#06b6d4', permissions: [
          permMap['users.read'], ...getPermsByPrefix('projects.'),
          ...getPermsByPrefix('tasks.'), permMap['interns.read'], permMap['interns.manage'],
          permMap['departments.read'], permMap['leave.read'],
        ]
      },
      { name: 'Employee', slug: 'employee', isSystem: true, color: '#3b82f6', permissions: [
          permMap['tasks.read'], permMap['tasks.update'],
          permMap['attendance.read'], permMap['leave.read'],
        ]
      },
      { name: 'Intern', slug: 'intern', isSystem: true, color: '#10b981', permissions: [
          permMap['tasks.read'], permMap['tasks.update'],
          permMap['attendance.read'], permMap['leave.read'],
        ]
      },
    ]);
    const roleMap = {};
    insertedRoles.forEach(r => { roleMap[r.slug] = r._id; });

    console.log('Creating Departments...');
    const depts = await Department.insertMany([
      { name: 'Engineering', code: 'ENG', color: '#3b82f6' },
      { name: 'Human Resources', code: 'HR', color: '#8b5cf6' },
      { name: 'Management', code: 'MGT', color: '#f59e0b' },
    ]);
    const getDept = (code) => depts.find(d => d.code === code)._id;

    console.log('Creating Users...');
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const year = new Date().getFullYear();
    const adminPass = await bcrypt.hash('Admin@123', rounds);
    const hrPass = await bcrypt.hash('HR@123456', rounds);
    const pmoPass = await bcrypt.hash('PMO@12345', rounds);
    const empPass = await bcrypt.hash('Emp@12345', rounds);
    const intPass = await bcrypt.hash('Int@12345', rounds);

    const users = await User.insertMany([
      {
        name: 'Super Admin', email: 'admin@owms.com', password: adminPass,
        role: roleMap['super-admin'], department: getDept('MGT'), employmentType: 'Full-time',
        employeeId: `EMP-${year}-001`, status: 'Active',
      },
      {
        name: 'Sarah Connor', email: 'sarah.hr@owms.com', password: hrPass,
        role: roleMap['hr-manager'], department: getDept('HR'), designation: 'HR Manager',
        employmentType: 'Full-time', employeeId: `EMP-${year}-002`, status: 'Active',
      },
      {
        name: 'Michael Scott', email: 'pmo@owms.com', password: pmoPass,
        role: roleMap['pmo-lead'], department: getDept('MGT'), designation: 'PMO Lead',
        employmentType: 'Full-time', employeeId: `EMP-${year}-003`, status: 'Active',
      },
      {
        name: 'Alex Johnson', email: 'alex.emp@owms.com', password: empPass,
        role: roleMap['employee'], department: getDept('ENG'), designation: 'Software Engineer',
        employmentType: 'Full-time', employeeId: `EMP-${year}-004`, status: 'Active',
      },
      {
        name: 'Rahul Patel', email: 'rahul.intern@owms.com', password: intPass,
        role: roleMap['intern'], department: getDept('ENG'), designation: 'Frontend Intern',
        employmentType: 'Intern', employeeId: `INT-${year}-001`, status: 'Active',
        performanceRatings: [
          { week: 1, rating: 3, note: 'Good start', addedBy: null },
          { week: 2, rating: 4, note: 'Improving', addedBy: null },
          { week: 3, rating: 4, note: 'Consistent', addedBy: null },
          { week: 4, rating: 5, note: 'Excellent delivery', addedBy: null },
        ]
      },
    ]);

    const admin = users[0];
    const hr = users[1];
    const pmo = users[2];
    const emp = users[3];
    const intern = users[4];

    // Assign Managers — use updateOne to avoid triggering the pre-save password hash hook
    await User.updateOne({ _id: emp._id },   { manager: pmo._id, hrManager: hr._id });
    await User.updateOne({ _id: intern._id }, { mentor: emp._id, pmoLead: pmo._id, hrManager: hr._id });

    // Project
    const project = await Project.create({
      code: `PRJ-${year}-001`,
      name: 'Alpha Upgrade',
      department: getDept('ENG'),
      manager: pmo._id,
      status: 'Active',
      team: [{ user: emp._id, role: 'Developer' }],
      interns: [{ user: intern._id }],
    });

    intern.project = project._id;
    await intern.save({ validateBeforeSave: false });

    // Leave Balances
    await LeaveBalance.insertMany([
      { user: emp._id, year, casual: { total: 10, used: 2 }, sick: { total: 7, used: 1 }, annual: { total: 15, used: 0 } },
      { user: intern._id, year, casual: { total: 5, used: 0 }, sick: { total: 3, used: 0 } }
    ]);

    // Tasks
    for (let i = 1; i <= 10; i++) {
      await Task.create({
        title: `Task ${i} for project`,
        project: project._id,
        assignedTo: i % 2 === 0 ? intern._id : emp._id,
        assignedBy: pmo._id,
        status: i < 5 ? 'Done' : (i < 8 ? 'In Progress' : 'Todo'),
        dueDate: new Date(Date.now() + i * 86400000),
      });
    }

    // Attendance (1 month)
    const attendanceData = [];
    const now = new Date();
    for (let d = 1; d <= 28; d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        attendanceData.push({ user: emp._id, date, status: 'Present', checkIn: new Date(date.setHours(9,0,0)), checkOut: new Date(date.setHours(17,0,0)) });
        attendanceData.push({ user: intern._id, date, status: 'Present', checkIn: new Date(date.setHours(9,15,0)), checkOut: new Date(date.setHours(17,0,0)) });
      }
    }
    await Attendance.insertMany(attendanceData);

    // Leave Requests
    await LeaveRequest.insertMany([
      { user: emp._id, type: 'Casual', fromDate: new Date(), toDate: new Date(Date.now() + 86400000), days: 2, reason: 'Personal', status: 'Pending' },
      { user: emp._id, type: 'Sick', fromDate: new Date(Date.now() - 86400000 * 5), toDate: new Date(Date.now() - 86400000 * 4), days: 2, reason: 'Fever', status: 'Approved', reviewedBy: hr._id },
    ]);

    // Learning Resources
    await LearningResource.insertMany([
      { title: 'React Basics', type: 'Course', assignedTo: intern._id, assignedBy: hr._id, status: 'Completed' },
      { title: 'Advanced CSS', type: 'Video', assignedTo: intern._id, assignedBy: emp._id, status: 'In Progress' },
    ]);

    // Notifications
    await Notification.insertMany([
      { recipient: emp._id, type: 'system_alert', title: 'Welcome', message: 'Welcome to OWMS', sender: admin._id },
      { recipient: pmo._id, type: 'system_alert', title: 'Project Assigned', message: 'You are PMO Lead', sender: admin._id },
      { recipient: hr._id, type: 'system_alert', title: 'New Employee', message: 'Please review', sender: admin._id },
    ]);

    console.log(`✅ Seed complete! DB populated with Part 2 data.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedData();
