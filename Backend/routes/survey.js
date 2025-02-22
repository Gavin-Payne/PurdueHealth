const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
require('dotenv').config();
const { authenticateToken } = require('../middleware/auth');

// Singleton MongoDB client
let mongoClient = null;

const getMongoClient = async () => {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGO_URI);
    await mongoClient.connect();
  }
  return mongoClient;
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

// Get survey data
router.get('/data/:userId', authenticateToken, async (req, res) => {
  let client;
  try {
    // Get MongoDB client
    client = await getMongoClient();
    const db = client.db('test');
    const collection = db.collection('surveys');

    const userId = req.params.userId;
    console.log('Fetching survey data for:', userId);

    // Verify user authorization
    const userEmail = req.user.email;
    console.log('User email from token:', userEmail);
    console.log('Requested userId:', userId);

    if (userEmail !== userId) {
      console.log('Authorization failed: email mismatch');
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Find survey with more specific query
    const survey = await collection.findOne({ userId: userId });
    console.log('Found survey:', survey);

    if (!survey) {
      return res.status(404).json({ 
        message: 'Survey not found',
        userId: userId
      });
    }

    // Send response with survey data
    res.json({
      answers: survey.answers || {},
      updatedAt: survey.updatedAt
    });

  } catch (error) {
    console.error('Detailed error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch survey data',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

// Update survey field
router.patch('/:userId', authenticateToken, async (req, res) => {
  let client;
  try {
    client = await getMongoClient();
    const db = client.db('test');
    const collection = db.collection('surveys');

    const userId = req.params.userId;
    const { field, value } = req.body;

    if (!field || value === undefined) {
      return res.status(400).json({ message: 'Missing field or value' });
    }

    // Verify user authorization
    if (req.user.email !== userId) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const result = await collection.updateOne(
      { userId },
      { 
        $set: { 
          [`answers.${field}`]: value,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    // Also trigger workout plan regeneration if needed
    if (['workout', 'liftingFrequency', 'cardioFrequency', 'workoutDuration'].includes(field)) {
      try {
        const workoutCollection = db.collection('workoutPlans');
        await workoutCollection.deleteOne({ userId });
        console.log('Deleted existing workout plan for regeneration');
      } catch (error) {
        console.error('Error deleting workout plan:', error);
      }
    }

    res.json({ 
      message: 'Survey updated successfully',
      field,
      value 
    });
  } catch (error) {
    console.error('Error updating survey:', error);
    res.status(500).json({ message: 'Failed to update survey' });
  } finally {
    if (client) await client.close();
  }
});

module.exports = router;