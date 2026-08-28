import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Counter from '../models/Counter.js';
import ArchivedUser from '../models/ArchivedUser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const counters = await Counter.find({});
  console.log('--- COUNTERS ---');
  console.log(JSON.stringify(counters, null, 2));

  const usersCount = await User.countDocuments({});
  console.log(`Active users count: ${usersCount}`);

  const archivedCount = await ArchivedUser.countDocuments({});
  console.log(`Archived users count: ${archivedCount}`);

  // Fetch some employee IDs
  const activeEmpIds = await User.find({}).select('employeeId name').lean();
  console.log('--- ACTIVE USER EMP IDs ---');
  console.log(JSON.stringify(activeEmpIds, null, 2));

  mongoose.connection.close();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
