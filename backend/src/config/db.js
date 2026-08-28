import mongoose from 'mongoose';

/**
 * MongoDB Connection
 * Connects to MongoDB using MONGO_URI from env.
 * Logs connection host on success, provides actionable diagnostic guide on failure.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/owms';
  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting reconnection...');
    });
  } catch (error) {
    console.error(`❌ MongoDB connection failed to ${uri}: ${error.message}`);
    console.error(`\n=====================================================================`);
    console.error(`⚠️  DIAGNOSTIC: MongoDB is not running or unreachable on localhost:27017.`);
    console.error(`👉 Please ensure the MongoDB service is started:`);
    console.error(`   - Windows: Run "net start MongoDB" in Administrator CMD, or start MongoDB via services.msc`);
    console.error(`   - Mac/Linux: Run "brew services start mongodb-community" or "sudo systemctl start mongod"`);
    console.error(`=====================================================================\n`);
    process.exit(1);
  }
};

export default connectDB;
