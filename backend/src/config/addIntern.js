/**
 * addIntern.js — Add a single intern user (idempotent).
 * Safe to re-run: skips if the email or employee ID already exists.
 *
 * Run: node src/config/addIntern.js   (from the backend/ directory)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Role from '../models/Role.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const INTERN = {
  name: 'Rahul Intern',
  email: 'rahul@owms.com',
  employeeId: 'INT-2025-001',
  password: 'Int@12345', // hashed by the User model pre-save hook
  designation: 'Intern',
  employmentType: 'Intern',
  status: 'Active',
};

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌  MONGO_URI is not set. Add it to backend/.env (or the environment) and retry.');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  MongoDB connected');

    const internRole = await Role.findOne({ slug: 'intern' });
    if (!internRole) {
      console.error('❌  Intern role not found. Run the main seed (npm run seed) first.');
      process.exit(1);
    }

    const clash = await User.findOne({
      $or: [{ email: INTERN.email }, { employeeId: INTERN.employeeId }],
    });
    if (clash) {
      console.log(`⚠   User already exists (email or employeeId): ${clash.email} / ${clash.employeeId}. Nothing to do.`);
      process.exit(0);
    }

    const user = await User.create({
      name: INTERN.name,
      email: INTERN.email,
      password: INTERN.password,
      employeeId: INTERN.employeeId,
      designation: INTERN.designation,
      employmentType: INTERN.employmentType,
      role: internRole._id,
      status: INTERN.status,
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅  Intern created');
    console.log(`   Name:        ${user.name}`);
    console.log(`   Email:       ${user.email}`);
    console.log(`   Employee ID: ${user.employeeId}`);
    console.log(`   Password:    ${INTERN.password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
  } catch (err) {
    console.error('❌  Failed to add intern:', err.message);
    process.exit(1);
  }
};

run();
