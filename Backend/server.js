const express = require('express');
const cors = require('cors');
const { getMongoClient } = require('./utils/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Enable CORS before any route definitions
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-User-Email'
  ]
}));

app.use(express.json());

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

// Import all routes
const surveyRoutes = require('./routes/survey');
const workoutPlanRoutes = require('./routes/workoutPlan');

// Register routes
app.use('/api/survey', surveyRoutes); // Make sure this is registered
app.use('/api/workout-plan', workoutPlanRoutes);

// Register routes with corrected path
app.use('/api/workout-plan', workoutPlanRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Error handling for Auth0
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  next(err);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize MongoDB connection before starting server
const initializeServer = async () => {
  try {
    await getMongoClient(); // Establish initial connection
    console.log('MongoDB connection initialized');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

initializeServer();

const { closeConnection } = require('./utils/db');

process.on('SIGINT', async () => {
  try {
    await closeConnection();
    console.log('Gracefully shutting down');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

module.exports = app;