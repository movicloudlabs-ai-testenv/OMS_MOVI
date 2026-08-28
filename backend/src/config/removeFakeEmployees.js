/**
 * removeFakeEmployees.js
 * Removes the 17 demo employees added by seedUsers.js.
 * Keeps Alex Johnson (alex.emp@owms.com) — the original seed employee.
 * Run: node src/config/removeFakeEmployees.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import LeaveBalance from '../models/LeaveBalance.js';
import LeaveRequest from '../models/LeaveRequest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const FAKE_EMPLOYEE_EMAILS = [
  'vikram.singh@owms.com',
  'neha.gupta@owms.com',
  'amit.kumar@owms.com',
  'pooja.reddy@owms.com',
  'arun.k@owms.com',
  'sneha.joshi@owms.com',
  'rohit.verma@owms.com',
  'kavya.nair@owms.com',
  'divya.pillai@owms.com',
  'sanjay.patel@owms.com',
  'meenakshi.i@owms.com',
  'suresh.pillai@owms.com',
  'meera.k@owms.com',
  'rajesh.nair@owms.com',
  'suresh.kumar@owms.com',
  'lakshmi.reddy@owms.com',
  'ganesh.babu@owms.com',
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  MongoDB connected');

    const fakeEmployees = await User.find({ email: { $in: FAKE_EMPLOYEE_EMAILS } });
    const fakeIds = fakeEmployees.map(u => u._id);

    if (fakeIds.length === 0) {
      console.log('ℹ️   No fake employees found — nothing to remove.');
      process.exit(0);
    }

    const attendanceDel = await Attendance.deleteMany({ user: { $in: fakeIds } });
    const leaveBalDel   = await LeaveBalance.deleteMany({ user: { $in: fakeIds } });
    const leaveReqDel   = await LeaveRequest.deleteMany({ user: { $in: fakeIds } });
    const userDel       = await User.deleteMany({ _id: { $in: fakeIds } });

    console.log(`✅  Removed ${userDel.deletedCount} employee(s):`);
    fakeEmployees.forEach(u => console.log(`     - ${u.name} (${u.email})`));
    console.log(`   Attendance records removed : ${attendanceDel.deletedCount}`);
    console.log(`   Leave balances removed     : ${leaveBalDel.deletedCount}`);
    console.log(`   Leave requests removed     : ${leaveReqDel.deletedCount}`);

    process.exit(0);
  } catch (err) {
    console.error('❌  Error:', err);
    process.exit(1);
  }
};

run();
