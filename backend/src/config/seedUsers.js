/**
 * seedUsers.js — Additive demo seed
 * Adds realistic users (HR, PMO, Employees, Interns) across multiple departments.
 * DOES NOT wipe existing data — safe to run on top of the main seed.
 *
 * Run: node src/config/seedUsers.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User         from '../models/User.js';
import Role         from '../models/Role.js';
import Department   from '../models/Department.js';
import Attendance   from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Task         from '../models/Task.js';
import Project      from '../models/Project.js';
import { syncEmployeeIdCounters } from '../utils/syncEmployeeIdCounters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connect = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  MongoDB connected');
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return workday dates (Mon–Fri) within the last N days */
const workdaysInRange = (days) => {
  const dates = [];
  for (let i = days; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(new Date(d));
  }
  return dates;
};

/** Random int between min and max inclusive */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── Main ─────────────────────────────────────────────────────────────────────

const run = async () => {
  try {
    await connect();

    const year = new Date().getFullYear();

    // ── 1. Resolve existing roles ────────────────────────────────────────────
    const roles = await Role.find({});
    const roleMap = {};
    roles.forEach(r => { roleMap[r.slug] = r._id; });

    const requiredSlugs = ['hr-manager', 'pmo-lead', 'employee', 'intern'];
    for (const slug of requiredSlugs) {
      if (!roleMap[slug]) { console.error(`❌  Role "${slug}" not found. Run main seed first.`); process.exit(1); }
    }

    // ── 2. Upsert departments ────────────────────────────────────────────────
    const deptDefs = [
      { name: 'Engineering',      code: 'ENG',  color: '#3B82F6', description: 'Software development and infrastructure' },
      { name: 'Human Resources',  code: 'HR',   color: '#8B5CF6', description: 'People operations and talent management' },
      { name: 'Management',       code: 'MGT',  color: '#F59E0B', description: 'Executive leadership and strategy' },
      { name: 'Product',          code: 'PRD',  color: '#10B981', description: 'Product strategy, roadmap, and analytics' },
      { name: 'Design',           code: 'DES',  color: '#EC4899', description: 'UI/UX and brand design' },
      { name: 'Sales & Marketing',code: 'SAL',  color: '#F97316', description: 'Revenue growth and market outreach' },
      { name: 'Finance',          code: 'FIN',  color: '#14B8A6', description: 'Financial planning and accounting' },
      { name: 'QA & Testing',     code: 'QA',   color: '#6366F1', description: 'Quality assurance and release testing' },
      { name: 'Operations',       code: 'OPS',  color: '#64748B', description: 'Business operations and infrastructure support' },
    ];

    const deptMap = {};
    for (const d of deptDefs) {
      const existing = await Department.findOne({ code: d.code });
      if (existing) {
        deptMap[d.code] = existing._id;
      } else {
        const created = await Department.create({ ...d, status: 'Active' });
        deptMap[d.code] = created._id;
        console.log(`  ✔  Created dept: ${d.name}`);
      }
    }

    // ── 3. Resolve existing PMO / HR leads for references ───────────────────
    const existingHR  = await User.findOne({ 'role': roleMap['hr-manager'] });
    const existingPMO = await User.findOne({ 'role': roleMap['pmo-lead'] });

    // ── 4. Build user list ───────────────────────────────────────────────────


    /**
     * Schema shape:
     *   name, email, designation, dept (code), roleSlug, employmentType, employeeId
     */
    const userDefs = [
      // ── HR team ────────────────────────────────────────────────────────────
      { name: 'Priya Sharma',     email: 'priya.sharma@owms.com',    designation: 'HR Manager',           dept: 'HR',  roleSlug: 'hr-manager', employmentType: 'Full-time',  employeeId: `EMP-${year}-010` },
      { name: 'Anita Nair',       email: 'anita.nair@owms.com',      designation: 'HR Executive',         dept: 'HR',  roleSlug: 'hr-manager', employmentType: 'Full-time',  employeeId: `EMP-${year}-011` },
      { name: 'Deepa Menon',      email: 'deepa.menon@owms.com',     designation: 'HR Coordinator',       dept: 'HR',  roleSlug: 'hr-manager', employmentType: 'Full-time',  employeeId: `EMP-${year}-012` },

      // ── PMO team ───────────────────────────────────────────────────────────
      { name: 'Rajan Mehta',      email: 'rajan.mehta@owms.com',     designation: 'PMO Lead',             dept: 'MGT', roleSlug: 'pmo-lead',    employmentType: 'Full-time',  employeeId: `EMP-${year}-013` },
      { name: 'Sunita Rao',       email: 'sunita.rao@owms.com',      designation: 'Project Manager',      dept: 'MGT', roleSlug: 'pmo-lead',    employmentType: 'Full-time',  employeeId: `EMP-${year}-014` },
      { name: 'Karthik Iyer',     email: 'karthik.iyer@owms.com',    designation: 'Project Coordinator',  dept: 'OPS', roleSlug: 'pmo-lead',    employmentType: 'Full-time',  employeeId: `EMP-${year}-015` },

      // ── Engineering ────────────────────────────────────────────────────────
      { name: 'Vikram Singh',     email: 'vikram.singh@owms.com',    designation: 'Senior Software Engineer', dept: 'ENG', roleSlug: 'employee', employmentType: 'Full-time',  employeeId: `EMP-${year}-020` },
      { name: 'Neha Gupta',       email: 'neha.gupta@owms.com',      designation: 'Backend Developer',    dept: 'ENG', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-021` },
      { name: 'Amit Kumar',       email: 'amit.kumar@owms.com',      designation: 'Frontend Developer',   dept: 'ENG', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-022` },
      { name: 'Pooja Reddy',      email: 'pooja.reddy@owms.com',     designation: 'Full Stack Developer', dept: 'ENG', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-023` },
      { name: 'Arun Krishnan',    email: 'arun.k@owms.com',          designation: 'DevOps Engineer',      dept: 'ENG', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-024` },
      { name: 'Sneha Joshi',      email: 'sneha.joshi@owms.com',     designation: 'Software Engineer',    dept: 'ENG', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-025` },

      // ── Product ────────────────────────────────────────────────────────────
      { name: 'Rohit Verma',      email: 'rohit.verma@owms.com',     designation: 'Product Manager',      dept: 'PRD', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-030` },
      { name: 'Kavya Nair',       email: 'kavya.nair@owms.com',      designation: 'Product Analyst',      dept: 'PRD', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-031` },

      // ── Design ─────────────────────────────────────────────────────────────
      { name: 'Divya Pillai',     email: 'divya.pillai@owms.com',    designation: 'UI/UX Designer',       dept: 'DES', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-040` },
      { name: 'Sanjay Patel',     email: 'sanjay.patel@owms.com',    designation: 'Graphic Designer',     dept: 'DES', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-041` },

      // ── Sales & Marketing ──────────────────────────────────────────────────
      { name: 'Meenakshi Iyer',   email: 'meenakshi.i@owms.com',     designation: 'Marketing Manager',    dept: 'SAL', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-050` },
      { name: 'Suresh Pillai',    email: 'suresh.pillai@owms.com',   designation: 'Sales Executive',      dept: 'SAL', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-051` },

      // ── Finance ────────────────────────────────────────────────────────────
      { name: 'Meera Krishnan',   email: 'meera.k@owms.com',         designation: 'Finance Manager',      dept: 'FIN', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-060` },
      { name: 'Rajesh Nair',      email: 'rajesh.nair@owms.com',     designation: 'Accountant',           dept: 'FIN', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-061` },

      // ── QA ─────────────────────────────────────────────────────────────────
      { name: 'Suresh Kumar',     email: 'suresh.kumar@owms.com',    designation: 'QA Lead',              dept: 'QA',  roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-070` },
      { name: 'Lakshmi Reddy',    email: 'lakshmi.reddy@owms.com',   designation: 'QA Engineer',          dept: 'QA',  roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-071` },

      // ── Operations ─────────────────────────────────────────────────────────
      { name: 'Ganesh Babu',      email: 'ganesh.babu@owms.com',     designation: 'Operations Manager',   dept: 'OPS', roleSlug: 'employee',    employmentType: 'Full-time',  employeeId: `EMP-${year}-080` },

      // ── Interns ────────────────────────────────────────────────────────────
      { name: 'Arjun Patel',      email: 'arjun.p@owms.com',         designation: 'Frontend Intern',      dept: 'ENG', roleSlug: 'intern',      employmentType: 'Intern',     employeeId: `INT-${year}-010`,
        college: 'IIT Madras',        domain: 'Frontend Development', batch: '2026 Summer Batch', phone: '+91 98765 43210', address: 'Chennai, Tamil Nadu' },
      { name: 'Preethi Menon',    email: 'preethi.m@owms.com',       designation: 'Backend Intern',       dept: 'ENG', roleSlug: 'intern',      employmentType: 'Intern',     employeeId: `INT-${year}-011`,
        college: 'NIT Trichy',        domain: 'Backend Development',  batch: '2026 Summer Batch', phone: '+91 98765 43211', address: 'Coimbatore, Tamil Nadu' },
      { name: 'Kishore Kumar',    email: 'kishore.k@owms.com',       designation: 'UI/UX Intern',         dept: 'DES', roleSlug: 'intern',      employmentType: 'Intern',     employeeId: `INT-${year}-012`,
        college: 'Anna University',   domain: 'UI/UX Design',         batch: '2026 Spring Batch', phone: '+91 98765 43212', address: 'Madurai, Tamil Nadu' },
      { name: 'Nandini Shah',     email: 'nandini.s@owms.com',       designation: 'Product Intern',       dept: 'PRD', roleSlug: 'intern',      employmentType: 'Intern',     employeeId: `INT-${year}-013`,
        college: 'IIM Ahmedabad',     domain: 'Product Management',   batch: '2026 Spring Batch', phone: '+91 98765 43213', address: 'Ahmedabad, Gujarat' },
      { name: 'Mohammed Ali',     email: 'mohammed.a@owms.com',      designation: 'QA Intern',            dept: 'QA',  roleSlug: 'intern',      employmentType: 'Intern',     employeeId: `INT-${year}-014`,
        college: 'VIT Vellore',       domain: 'Quality Assurance',    batch: '2026 Summer Batch', phone: '+91 98765 43214', address: 'Vellore, Tamil Nadu' },
    ];

    // ── 5. Insert users (skip if email already exists) ──────────────────────
    // Pass plain password — the User model's pre-save hook will hash it
    const createdUsers = [];
    for (const def of userDefs) {
      const exists = await User.findOne({ email: def.email });
      if (exists) {
        console.log(`  ⚠   Skipped (exists): ${def.email}`);
        createdUsers.push(exists);
        continue;
      }
      const u = await User.create({
        name:           def.name,
        email:          def.email,
        password:       'Pass@1234',
        designation:    def.designation,
        role:           roleMap[def.roleSlug],
        department:     deptMap[def.dept],
        employmentType: def.employmentType,
        employeeId:     def.employeeId,
        status:         'Active',
        ...(existingPMO ? { manager: existingPMO._id } : {}),
        ...(existingHR  ? { hrManager: existingHR._id } : {}),
        ...(def.roleSlug === 'intern' ? {
          performanceRatings: [
            { week: 1, rating: rand(3, 4), note: 'Good onboarding', addedBy: null },
            { week: 2, rating: rand(3, 5), note: 'Progressing well', addedBy: null },
            { week: 3, rating: rand(4, 5), note: 'Consistent effort', addedBy: null },
          ]
        } : {}),
      });
      createdUsers.push(u);
      console.log(`  ✔   Created: ${def.name} (${def.roleSlug})`);
    }

    // ── 6. Attendance — past 30 workdays ────────────────────────────────────
    console.log('\nGenerating attendance records...');
    const workdays = workdaysInRange(30);
    const statusOptions = ['Present', 'Present', 'Present', 'Present', 'Half-Day', 'Absent']; // weighted

    for (const user of createdUsers) {
      const existing = await Attendance.findOne({ user: user._id });
      if (existing) continue; // skip if already has records

      const records = workdays.map(date => {
        const status = statusOptions[rand(0, statusOptions.length - 1)];
        const d = new Date(date);
        const ciH = rand(8, 9), ciM = rand(0, 30);
        const coH = rand(17, 18), coM = rand(0, 30);
        const pad = n => String(n).padStart(2, '0');
        const to12 = (h, m) => {
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 || 12;
          return `${pad(h12)}:${pad(m)} ${ampm}`;
        };
        return {
          user:     user._id,
          date:     new Date(d),
          status,
          checkIn:  status !== 'Absent' ? to12(ciH, ciM) : undefined,
          checkOut: status !== 'Absent' ? to12(coH, coM) : undefined,
        };
      });
      await Attendance.insertMany(records);
    }
    console.log('  ✔  Attendance done');

    // ── 7. Leave balances ────────────────────────────────────────────────────
    console.log('Generating leave balances...');
    for (const user of createdUsers) {
      const exists = await LeaveBalance.findOne({ user: user._id, year });
      if (exists) continue;
      const isIntern = (await User.findById(user._id).select('employmentType')).employmentType === 'Intern';
      await LeaveBalance.create({
        user:   user._id,
        year,
        casual: { total: isIntern ? 5  : 10, used: rand(0, isIntern ? 2 : 4) },
        sick:   { total: isIntern ? 3  : 7,  used: rand(0, 2) },
        annual: { total: isIntern ? 0  : 15, used: rand(0, isIntern ? 0 : 5) },
      });
    }
    console.log('  ✔  Leave balances done');

    // ── 8. Leave requests ────────────────────────────────────────────────────
    console.log('Generating leave requests...');
    const leaveTypes = ['Casual', 'Sick', 'Annual'];
    const hrUser     = createdUsers.find(u => u.email === 'priya.sharma@owms.com') || existingHR;

    for (const user of createdUsers.filter((_, i) => i % 3 === 0)) { // every 3rd user gets a leave
      const existing = await LeaveRequest.findOne({ user: user._id });
      if (existing) continue;
      const from = new Date();
      from.setDate(from.getDate() + rand(2, 10));
      const to = new Date(from);
      to.setDate(to.getDate() + rand(0, 2));
      await LeaveRequest.create({
        user:       user._id,
        type:       leaveTypes[rand(0, leaveTypes.length - 1)],
        fromDate:   from,
        toDate:     to,
        days:       Math.max(1, Math.round((to - from) / 86400000) + 1),
        reason:     ['Family function', 'Medical appointment', 'Personal work', 'Travel'][rand(0, 3)],
        status:     ['Pending', 'Approved', 'Pending'][rand(0, 2)],
        ...(hrUser ? { reviewedBy: hrUser._id } : {}),
      });
    }
    console.log('  ✔  Leave requests done');

    // ── 9. Assign interns to a project ───────────────────────────────────────
    console.log('Assigning interns to project...');
    const internUsers = createdUsers.filter(u =>
      userDefs.find(d => d.email === u.email)?.roleSlug === 'intern'
    );
    const project = await Project.findOne({}).sort({ createdAt: -1 });
    if (project && internUsers.length > 0) {
      for (const intern of internUsers) {
        if (!project.interns.find(i => i.user?.toString() === intern._id.toString())) {
          project.interns.push({ user: intern._id });
        }
        intern.project = project._id;
        await intern.save({ validateBeforeSave: false });
      }
      await project.save();
      console.log(`  ✔  ${internUsers.length} interns assigned to project "${project.name}"`);
    }

    // ── 10. Summary ──────────────────────────────────────────────────────────
    // Sync employeeId counters so future auto-generated IDs (INT-/EMP-)
    // never collide with the hard-coded IDs seeded above.
    await syncEmployeeIdCounters();

    const totalUsers = await User.countDocuments();
    const totalDepts = await Department.countDocuments();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅  Demo seed complete!');
    console.log(`   Total users:       ${totalUsers}`);
    console.log(`   Total departments: ${totalDepts}`);
    console.log('   Default password:  Pass@1234  (all new users)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (err) {
    console.error('❌  Seed error:', err);
    process.exit(1);
  }
};

run();
