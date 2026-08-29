import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/owms';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }));
  const task = await Task.findOne({});
  if (task) {
    console.log('\n--- SAMPLE TASK DOCUMENT ---');
    console.log(JSON.stringify(task.toObject(), null, 2));
  } else {
    console.log('No tasks found in DB.');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
