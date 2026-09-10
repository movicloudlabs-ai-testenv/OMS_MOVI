import mongoose from 'mongoose';

let isConnected = false;

export const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * MongoDB Connection
 * Connects to MongoDB using MONGO_URI from env.
 * Keeps the server running and continuously retries in background if MongoDB is starting.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/owms';

  const tryConnect = async () => {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 4000,
      });
      isConnected = true;
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return true;
    } catch (error) {
      isConnected = false;
      return false;
    }
  };

  const initialSuccess = await tryConnect();
  if (!initialSuccess) {
    console.error(`\n=====================================================================`);
    console.error(`⚠️  NOTICE: MongoDB is not currently reachable on localhost:27017.`);
    console.error(`👉 Backend Server is ONLINE on port ${process.env.PORT || 5000} and will keep retrying database connection.`);
    console.error(`👉 To log in, ensure MongoDB is started:`);
    console.error(`   - Windows: Run "net start MongoDB" in Administrator CMD, or start MongoDB service`);
    console.error(`   - Mac/Linux: Run "brew services start mongodb-community" or "sudo systemctl start mongod"`);
    console.error(`=====================================================================\n`);

    // Continuously retry connection every 4 seconds in the background
    const retryInterval = setInterval(async () => {
      const ok = await tryConnect();
      if (ok) {
        clearInterval(retryInterval);
        try {
          const { syncPermissions } = await import('../utils/syncPermissions.js');
          const { scrubDeletedUserRefs } = await import('../utils/scrubDeletedUsers.js');
          const { ensureDefaultUsersExist } = await import('../utils/autoSeed.js');
          await syncPermissions();
          await scrubDeletedUserRefs();
          await ensureDefaultUsersExist();
          console.log('✅ Background post-connect initialization completed.');
        } catch (postErr) {
          console.warn('Post-connect init warning:', postErr.message);
        }
      }
    }, 4000);
  }

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.error(`❌ MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️  MongoDB disconnected. Attempting reconnection...');
  });
};

export default connectDB;
