/**
 * migrateDeletedUsers.js
 * One-time migration: moves all soft-deleted users (email starting with "deleted_")
 * into the ArchivedUser collection, then hard-deletes them from users.
 * Run: node src/config/migrateDeletedUsers.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import ArchivedUser from '../models/ArchivedUser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const deletedUsers = await User.find({
      email: { $regex: /^deleted_/ },
    });

    console.log(`Found ${deletedUsers.length} soft-deleted user(s)`);

    let migrated = 0;
    let skipped = 0;

    for (const user of deletedUsers) {
      // Extract original email from "deleted_{timestamp}_{email}"
      const originalEmail = user.email.replace(/^deleted_\d+_/, '');

      // Check if already archived
      const exists = await ArchivedUser.findOne({ originalId: user._id });
      if (exists) {
        console.log(`  ⏭  Skipped (already archived): ${user.name} (${user.employeeId})`);
        skipped++;
        continue;
      }

      await ArchivedUser.create({
        originalId:       user._id,
        employeeId:       user.employeeId,
        name:             user.name,
        email:            originalEmail,
        avatar:           user.avatar,
        role:             user.role,
        department:       user.department,
        designation:      user.designation,
        employmentType:   user.employmentType,
        joinDate:         user.joinDate,
        skills:           user.skills,
        archivedBy:       null,
        archivedByName:   'System Migration',
        archiveReason:    'Migrated from soft-delete',
        originalDocument: user.toObject(),
        archivedAt:       user.updatedAt || user.deletedAt || new Date(),
      });

      await User.findByIdAndDelete(user._id);
      console.log(`  ✅ Migrated: ${user.name} (${user.employeeId}) — email restored: ${originalEmail}`);
      migrated++;
    }

    console.log(`\n── Migration complete ──`);
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped:  ${skipped}`);
    console.log(`   Total:    ${deletedUsers.length}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

run();
