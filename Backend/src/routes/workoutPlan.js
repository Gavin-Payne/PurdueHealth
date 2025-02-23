const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { checkJwt } = require('../middleware/auth');
require('dotenv').config();
const { generatePlanForUser } = require('../geminiFeatures/aiCall');

// Get workout plan
router.get('/:userId', checkJwt, async (req, res) => {
  let client;
  try {
    client = await new MongoClient(process.env.MONGO_URI).connect();
    const db = client.db('test');
    const collection = db.collection('workoutPlans');
    
    const userId = req.params.userId;
    console.log('Fetching workout plan for:', userId);

    // Find existing plan
    const existingPlan = await collection.findOne({ userId });
    
    if (existingPlan) {
      console.log('Found existing workout plan');
      return res.json(existingPlan.plan);
    }

    // If no plan exists, create default plan
    const defaultPlan = {
      schedule: [
        {
          name: "Day 1",
          exercises: [
            { name: "Squats", sets: 3, reps: 12 },
            { name: "Bench Press", sets: 3, reps: 12 },
            { name: "Rows", sets: 3, reps: 12 }
          ]
        }
      ]
    };

    // Store new plan
    await collection.insertOne({
      userId,
      plan: defaultPlan,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json(defaultPlan);
  } catch (error) {
    console.error('Error handling workout plan:', error);
    res.status(500).json({ 
      message: 'Failed to fetch workout plan',
      error: error.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Update the regenerate route
router.post('/:userId/regenerate', checkJwt, async (req, res) => {
  let client;
  try {
    client = await new MongoClient(process.env.MONGO_URI).connect();
    const db = client.db('test');
    const workoutCollection = db.collection('workoutPlans');
    
    const userId = req.params.userId;
    console.log('Regenerating workout plan for:', userId);

    // Generate new plan using the JS version
    const newPlan = await generatePlanForUser(userId);
    
    // Update workout plan in database
    await workoutCollection.updateOne(
      { userId },
      { 
        $set: {
          plan: { schedule: newPlan },
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('Workout plan updated successfully');
    res.json({ 
      message: 'Workout plan regenerated successfully',
      plan: newPlan 
    });

  } catch (error) {
    console.error('Error regenerating workout plan:', error);
    res.status(500).json({ 
      message: 'Failed to regenerate workout plan',
      error: error.message
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

module.exports = router;