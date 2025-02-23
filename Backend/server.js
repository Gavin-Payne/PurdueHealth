const express = require('express');
const cors = require('cors');
const { connectDB, closeConnection } = require('./src/utils/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Enable CORS before any route definitions
const allowedOrigins = [
  'https://localhost:3000',
  'https://boilerfit.me'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Email']
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
const surveyRoutes = require('./src/routes/survey');
const workoutPlanRoutes = require('./src/routes/workoutPlan');
const authenticationRoutes = require('./src/routes/authentication');
const dietaryRoutes = require('./src/routes/dietary');

// Register routes
app.use('/api/survey', surveyRoutes); // Make sure this is registered
app.use('/api/workout-plan', workoutPlanRoutes);
app.use('/api/auth', authenticationRoutes);
app.use('/api/dietary', dietaryRoutes);

const menuRoutes = require('./src/routes/menu');
app.use('/api/menu', menuRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
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
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();

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