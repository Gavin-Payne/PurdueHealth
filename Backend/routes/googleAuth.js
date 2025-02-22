const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google sign-in check route
router.post('/check', async (req, res) => {
  try {
    if (!req.body.email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const { email } = req.body;
    const user = await User.findOne({ email });
    res.json({ exists: !!user });
  } catch (error) {
    console.error('Google sign-in check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Google sign-in route
router.post('/signin', async (req, res) => {
  try {
    const { credential, username } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();  // Safely verified token

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Invalid Google credential' });
    }

    let user = await User.findOne({ email: payload.email });

    if (user) {
      const token = jwt.sign(
        { 
          id: user._id, 
          email: user.email,
          username: user.username 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({ token, user: { username: user.username, email: user.email } });
    }

    if (!username) {
      return res.status(400).json({ 
        message: 'Username required for new accounts',
        needsUsername: true 
      });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ 
        message: 'Username already taken',
        error: 'username_taken' 
      });
    }

    user = new User({
      username,
      email: payload.email,
      googleId: payload.sub
    });
    await user.save();

    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        username: user.username 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: { username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;