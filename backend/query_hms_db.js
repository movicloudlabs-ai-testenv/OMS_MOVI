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

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  for (const collInfo of collections) {
    const collName = collInfo.name;
    const collection = db.collection(collName);
    const cursor = collection.find({});
    
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const docStr = JSON.stringify(doc).toLowerCase();
      if (docStr.includes('hms')) {
        console.log(`Found HMS in collection: "${collName}" | Doc ID: ${doc._id}`);
        console.log(JSON.stringify(doc, null, 2));
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
