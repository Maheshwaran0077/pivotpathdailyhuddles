require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const dns = require('dns');
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const mongoose = require('mongoose');
const { initWatchdogScheduler } = require('./utils/watchdogScheduler');

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not set in environment variables");
  process.exit(1);
}

console.log("🔄 Starting QDSHI Mail Watchdog Service...");

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected for Watchdog Service');
    initWatchdogScheduler();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error for Watchdog Service:', err.message);
    process.exit(1);
  });

// Graceful Shutdown
process.on('SIGINT', async () => { 
  await mongoose.connection.close();
  console.log('🛑 MongoDB connection closed for Watchdog Service'); 
  process.exit(0);
});
