const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
require('dotenv').config();

let isConnected = false;
let mongoClient = null;

const createIndexes = async () => {
  try {
    const collection = mongoose.connection.db.collection('nutritions');  // Changed from 'nutrition'
    
    // Create text index on item_name
    await collection.createIndex({ item_name: 'text' });
    console.log('Created text index on item_name');

    // Create regular index for regex searches
    await collection.createIndex({ item_name: 1 });
    console.log('Created regular index on item_name');
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

const connectDB = async () => {
  if (isConnected) {
    console.log('Using existing database connection');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Debug: List all collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    // Create indexes after connection
    await createIndexes();

  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

const getCollection = async (collectionName) => {
  if (!isConnected) {
    await connectDB();
  }
  return mongoose.connection.db.collection(collectionName);
};

const getMongoClient = async () => {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGO_URI);
    await mongoClient.connect();
  }
  return mongoClient;
};

module.exports = { connectDB, getCollection, getMongoClient };