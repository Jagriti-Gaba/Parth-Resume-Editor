const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Replace <dbname> with your database name (will be created automatically if it doesn't exist)
    const conn = await mongoose.connect('mongodb://localhost:27017/myResumeAppDB', {
      
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host} / DB: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
