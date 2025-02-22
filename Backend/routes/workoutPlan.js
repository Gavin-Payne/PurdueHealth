const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { authenticateToken } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { retrieveDataFromMongodb } = require('../geminiFeatures/retrieveSurveyData');
require('dotenv').config();

router.get('/workout-plan/:userId', authenticateToken, async (req, res) => {
  let client;
  try {
    client = await new MongoClient(process.env.MONGO_URI).connect();
    const db = client.db('test');
    const collection = db.collection('workoutPlans');
    const userId = req.params.userId;

    // Verify user authorization
    if (req.user.email !== userId) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // First try to get existing plan
    const existingPlan = await collection.findOne({ userId });
    
    if (existingPlan) {
      console.log('Found existing workout plan for user:', userId);
      return res.json(existingPlan.plan);
    }

    // If no plan exists, generate new one
    const surveyData = await retrieveDataFromMongodb(userId);
    
    if (!surveyData) {
      return res.status(404).json({ error: 'Survey data not found' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
      Create a personalized workout plan based on the following information:
      - Workout experience: ${surveyData.workout || 'beginner'}
      - Lifting frequency: ${surveyData.lifting_frequency || 3} times per week
      - Cardio frequency: ${surveyData.cardio_frequency || 2} times per week
      - Workout duration: ${surveyData.workout_duration || 60} minutes
      
      Return ONLY the following JSON structure with no markdown formatting or code blocks:
      {
        "schedule": [
          {
            "name": "Day 1",
            "exercises": [
              {
                "name": "Exercise Name",
                "sets": 3,
                "reps": 12
              }
            ]
          }
        ]
      }`;

    console.log('Sending prompt to Gemini:', prompt);
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean up the response text by removing markdown code block markers
    const cleanResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const workoutPlan = JSON.parse(cleanResponse);
      console.log('Parsed workout plan:', workoutPlan);
      
      // Validate the response structure
      if (!workoutPlan.schedule || !Array.isArray(workoutPlan.schedule)) {
        throw new Error('Invalid workout plan structure');
      }

      // Store the generated plan
      await collection.updateOne(
        { userId },
        { 
          $set: { 
            userId,
            plan: workoutPlan,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      return res.json(workoutPlan);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return res.status(500).json({
        error: 'Failed to parse AI response',
        details: parseError.message,
        rawResponse: responseText
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (client) await client.close();
  }
});

// Add endpoint to force regeneration
router.post('/workout-plan/:userId/regenerate', authenticateToken, async (req, res) => {
  // Similar to GET but forces new plan generation
  // Copy the plan generation logic here but without checking for existing plan
});

module.exports = router;