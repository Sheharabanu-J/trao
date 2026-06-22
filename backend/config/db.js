const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('Missing MONGO_URI');
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error('Invalid MONGO_URI: expected connection string to start with "mongodb://" or "mongodb+srv://"');
  }


  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    dbName: process.env.MONGO_DB_NAME || undefined,
  });

  console.log('MongoDB connected');
}

module.exports = { connectDB };

