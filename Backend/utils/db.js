const { MongoClient } = require('mongodb');

let client = null;
let isConnecting = false;
let connectionPromise = null;

const getMongoClient = async () => {
  if (client?.topology?.isConnected?.()) {
    return client;
  }

  if (isConnecting) {
    return await connectionPromise;
  }

  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MongoDB URI not configured');
    }

    isConnecting = true;
    client = new MongoClient(process.env.MONGO_URI);
    connectionPromise = client.connect();
    await connectionPromise;
    
    console.log('Connected to MongoDB');
    return client;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  } finally {
    isConnecting = false;
    connectionPromise = null;
  }
};

const getCollection = async (collectionName) => {
  try {
    const client = await getMongoClient();
    const db = client.db('test');
    return db.collection(collectionName);
  } catch (error) {
    console.error(`Error getting collection ${collectionName}:`, error);
    throw error;
  }
};

const closeConnection = async () => {
  try {
    if (client?.topology?.isConnected?.()) {
      await client.close();
      client = null;
      console.log('Closed MongoDB connection');
    }
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

module.exports = { 
  getMongoClient, 
  getCollection, 
  closeConnection 
};