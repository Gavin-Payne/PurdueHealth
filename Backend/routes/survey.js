const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { checkJwt, extractUserFromToken, requireEmail, handlePreflightRequest } = require('../middleware/auth');
const { getCollection } = require('../utils/db');

let mongoClient = null;

const getMongoClient = async () => {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGO_URI);
    await mongoClient.connect();
  }
  return mongoClient;
};

router.use(handlePreflightRequest);

// Check survey status
router.get('/status/:userId', checkJwt, requireEmail, async (req, res) => {
  try {
    if (req.user.email !== req.params.userId) {
      console.error('Email mismatch:', {
        tokenEmail: req.user.email,
        requestedId: req.params.userId
      });
      return res.status(403).json({
        message: 'Unauthorized access',
        details: 'Email mismatch'
      });
    }

    const collection = await getCollection('surveys');
    if (!collection) {
      throw new Error('Failed to get surveys collection');
    }

    const survey = await collection.findOne({ userId: req.params.userId });
    console.log('Survey lookup result:', { 
      userId: req.params.userId, 
      found: !!survey 
    });

    res.json({ hasTakenSurvey: !!survey });
  } catch (error) {
    console.error('Survey status check error:', error);
    res.status(500).json({ 
      message: 'Failed to check survey status',
      error: error.message 
    });
  }
});

// Get survey data
router.get('/data/:userId', checkJwt, requireEmail, async (req, res) => {
  try {
    // User info is now available in req.user
    if (req.user.email !== req.params.userId) {
      console.error('Email mismatch:', {
        tokenEmail: req.user.email,
        requestedId: req.params.userId
      });
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const collection = await getCollection('surveys');
    const survey = await collection.findOne({ userId: req.params.userId });
    
    if (!survey) {
      console.log('No survey found for user:', req.params.userId);
      return res.status(404).json({ message: 'Survey not found' });
    }

    console.log('Found survey for user:', req.params.userId);
    res.json({
      answers: survey.answers,
      updatedAt: survey.updatedAt
    });

  } catch (error) {
    console.error('Survey data fetch error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch survey data',
      error: error.message 
    });
  }
});

// Submit survey
router.post('/', checkJwt, requireEmail, async (req, res) => {
  try {
    const userEmail = req.user?.email;
    
    if (!userEmail) {
      console.error('No email found in token');
      return res.status(401).json({ 
        message: 'Cannot read properties of undefined (reading \'email\')',
        details: 'No email found in authentication token'
      });
    }

    if (userEmail !== req.body.userId) {
      console.error('Email mismatch:', {
        tokenEmail: userEmail,
        bodyUserId: req.body.userId
      });
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const collection = await getCollection('surveys');
    const result = await collection.insertOne({
      userId: req.body.userId,
      answers: req.body.answers,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Survey saved:', result.insertedId);
    res.status(201).json({ 
      message: 'Survey submitted successfully',
      surveyId: result.insertedId 
    });

  } catch (error) {
    console.error('Survey submission error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update survey field
router.patch('/:userId', checkJwt, requireEmail, async (req, res) => {
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