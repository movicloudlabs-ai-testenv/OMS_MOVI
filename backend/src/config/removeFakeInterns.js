/**
 * removeFakeInterns.js
 * Removes the 5 demo interns added by seedUsers.js.
 * Keeps Rahul Patel (rahul.intern@owms.com) — the original seed intern.
 * Run: node src/config/removeFakeInterns.js
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

const FAKE_INTERN_EMAILS = [
  'arjun.p@owms.com',
  'preethi.m@owms.com',
  'kishore.k@owms.com',
  'nandini.s@owms.com',
  'mohammed.a@owms.com',
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  MongoDB connected');

    // Find fake interns
    const fakeInterns = await User.find({ email: { $in: FAKE_INTERN_EMAILS } });
    const fakeInternIds = fakeInterns.map(u => u._id);

    if (fakeInternIds.length === 0) {
      console.log('ℹ️   No fake interns found — nothing to remove.');
      process.exit(0);
    }

    // Remove related records
    const attendanceDel = await Attendance.deleteMany({ user: { $in: fakeInternIds } });
    const leaveBalDel   = await LeaveBalance.deleteMany({ user: { $in: fakeInternIds } });
    const leaveReqDel   = await LeaveRequest.deleteMany({ user: { $in: fakeInternIds } });

    // Remove the users
    const userDel = await User.deleteMany({ _id: { $in: fakeInternIds } });

    console.log(`✅  Removed ${userDel.deletedCount} intern(s):`);
    fakeInterns.forEach(u => console.log(`     - ${u.name} (${u.email})`));
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
