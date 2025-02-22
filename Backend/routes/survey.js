const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken'); // Add this import
require('dotenv').config();

// Add this near the top of the file
let mongoClient = null;

const getMongoClient = async () => {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGO_URI);
    await mongoClient.connect();
  }
  return mongoClient;
};

// Updated authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('JWT verification error:', err);
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(403).json({ message: 'Invalid token' });
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

// Check if user has completed survey
router.get('/status/:userId', authenticateToken, async (req, res) => {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('test');
    const collection = db.collection('surveys');

    const userId = req.params.userId;
    console.log('Checking survey status for:', userId);

    const survey = await collection.findOne({ userId: userId });
    console.log('Found survey:', survey);

    res.json({ hasTakenSurvey: !!survey });
  } catch (error) {
    console.error('Error checking survey status:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.close();
  }
});

// Submit survey
router.post('/', authenticateToken, async (req, res) => {
  let client;
  try {
    client = await getMongoClient();
    const db = client.db('test');
    const collection = db.collection('surveys');

    const { userId, answers } = req.body;
    console.log('Received survey submission:', { 
      userId, 
      answers,
      authenticatedUser: req.user 
    });

    if (!userId || !answers) {
      return res.status(400).json({ message: 'Missing userId or answers' });
    }

    // Verify that the authenticated user matches the survey submission
    if (req.user.email !== userId && req.user.id !== userId) {
      return res.status(403).json({ message: 'Unauthorized survey submission' });
    }

    const result = await collection.updateOne(
      { userId: userId },
      { 
        $set: { 
          userId: userId,
          answers: answers,
          updatedAt: new Date(),
          updatedBy: req.user.id
        }
      },
      { upsert: true }
    );

    console.log('Survey saved:', result);
    res.json({ 
      success: true, 
      message: 'Survey saved successfully',
      surveyId: result.upsertedId || result.modifiedCount
    });
  } catch (error) {
    console.error('Error saving survey:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;