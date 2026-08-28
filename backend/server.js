/*
 * Office Workspace Management System (OWMS)
 * Copyright © 2026 Movi Cloud Labs. All rights reserved. Proprietary and confidential.
 */
import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { validateEnv } from './src/config/env.js';
import { syncPermissions } from './src/utils/syncPermissions.js';
import { scheduleLeaveCleanup } from './src/utils/cleanupLeaves.js';
import { scrubDeletedUserRefs } from './src/utils/scrubDeletedUsers.js';

// Validate environment variables before anything else
validateEnv();

// Connect to MongoDB then sync permissions from config
await connectDB();
await syncPermissions();
await scrubDeletedUserRefs(); // heal any stale references to soft-deleted users
scheduleLeaveCleanup();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 OWMS Backend running on port ${PORT} [${process.env.NODE_ENV}]`);
});
