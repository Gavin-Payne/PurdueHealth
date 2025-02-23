const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('../models/Users');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { checkJwt, requireEmail } = require('../middleware/auth');

// Validation middleware
const registerValidation = [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

// Modify the login validation
const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').exists().withMessage('Password is required')
    .if((value, { req }) => !req.headers.authorization) // Skip if Auth0 token present
];

// Token blacklist
const tokenBlacklist = new Set();

// Register route
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update login route
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check for Auth0 token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      // Delegate to Auth0 sync route
      return router.handle(req.path + '/auth0/sync', req, res);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    tokenBlacklist.add(token);
  }
  res.json({ message: 'Logged out successfully' });
});

// Auth0 sync route
router.post('/auth0/sync', checkJwt, requireEmail, async (req, res) => {
  try {
    const { sub, email, name, picture } = req.user;
    
    if (!email) {
      console.error('Missing email in Auth0 user data:', req.user);
      return res.status(400).json({ message: 'Email is required' });
    }

    let user = await User.findOne({ email }).exec();
    
    if (user) {
      // Update existing user
      user.lastLogin = new Date();
      user.picture = picture || user.picture;
      user.name = name || user.name;
      user.auth0Id = sub;
      
      await user.save();
      console.log('User updated:', email);
      return res.json({ user, message: 'User updated' });
    }

    // Create new user
    user = new User({
      username: name || email.split('@')[0],
      email,
      auth0Id: sub,
      picture,
      name
    });

    await user.save();
    console.log('New user created:', email);
    res.status(201).json({ user, message: 'User created' });

  } catch (error) {
    console.error('Auth0 sync error:', error);
    res.status(500).json({
      message: 'Failed to sync user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Export router with blacklist
router.tokenBlacklist = tokenBlacklist;
module.exports = router;
