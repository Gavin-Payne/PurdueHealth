const express = require('express');
const router = express.Router();
const Survey = require('../models/Survey');
const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

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