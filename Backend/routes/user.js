require('dotenv').config();
const express = require('express');
const router = express.Router();
const User = require('../models/Users.js');
const { expressjwt: jwtMiddleware } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

// Auth0 middleware
const checkJwt = jwtMiddleware({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

// Create or update user
router.post('/', checkJwt, async (req, res) => {
  console.log('POST /api/user endpoint hit'); // Log when the endpoint is hit
  const { sub, name, email } = req.user;
  console.log('Received user data:', { sub, name, email }); // Log the received data

  try {
    const user = await User.findOneAndUpdate(
      { auth0Id: sub },
      { auth0Id: sub, name, email },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('User saved to database:', user); // Log the saved user
    res.json(user);
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ message: 'Error saving user' });
  }
});

// User profile route
router.get('/profile', checkJwt, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;