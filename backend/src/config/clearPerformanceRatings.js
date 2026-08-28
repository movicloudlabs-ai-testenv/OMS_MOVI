/**
 * clearPerformanceRatings.js
 * One-shot script to remove all seeded fake performance ratings from all interns.
 * Run: node src/config/clearPerformanceRatings.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  MongoDB connected');

    const result = await User.updateMany(
      { employmentType: 'Intern' },
      { $set: { performanceRatings: [] } }
    );

    console.log(`✅  Cleared performance ratings from ${result.modifiedCount} intern(s).`);
    process.exit(0);
  } catch (err) {
    console.error('❌  Error:', err);
    process.exit(1);
  }
};

run();
