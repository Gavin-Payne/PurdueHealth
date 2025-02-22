const express = require('express');
const router = express.Router();
const Survey = require('../models/Survey');
const { auth } = require('express-oauth2-jwt-bearer');

// Authentication middleware using Auth0
const authenticateToken = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
});

// Check if user has completed survey
router.get('/status/:userId', authenticateToken, async (req, res) => {
  try {
    const survey = await Survey.findOne({ userId: req.params.userId });
    res.json({ 
      hasTakenSurvey: !!survey,
      surveyData: survey ? survey.answers : null 
    });
  } catch (error) {
    console.error('Error checking survey status:', error);
    res.status(500).json({ message: 'Error checking survey status' });
  }
});

// Submit survey
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, answers } = req.body;

    if (!userId || !answers) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const survey = await Survey.findOneAndUpdate(
      { userId },
      { 
        userId,
        answers,
        completedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Survey submitted successfully', survey });
  } catch (error) {
    console.error('Error submitting survey:', error);
    res.status(500).json({ message: 'Error submitting survey' });
  }
});

module.exports = router;