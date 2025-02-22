const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/Users'); // Ensure the correct path to the User model
const { auth } = require('express-oauth2-jwt-bearer');
require('dotenv').config(); // Load environment variables

const router = express.Router();

// Middleware to check JWT
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
});

// Endpoint to handle user sign-in
router.post('/signin', checkJwt, async (req, res) => {
  try {
    const { sub, email, name } = req.auth.payload;

    // Check if user exists
    let user = await User.findOne({ auth0Id: sub });
    if (!user) {
      // Create new user
      user = new User({
        auth0Id: sub,
        email,
        name,
      });
      await user.save();
    }

    // Generate a token for the user
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });

    res.json({ token, user });
  } catch (error) {
    console.error('Sign-in error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;