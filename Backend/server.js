const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Set headers to allow cross-origin communication
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes (only import after confirming files exist)
const authRoutes = require('./routes/authentication');
const userRoutes = require('./routes/userdata');
const googleAuthRoutes = require('./routes/googleAuth');
const surveyRoutes = require('./routes/survey');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/google', googleAuthRoutes);
app.use('/api/survey', surveyRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

module.exports = app;