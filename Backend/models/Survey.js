const mongoose = require('mongoose');

const surveySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true  // Ensures one survey per user
  },
  answers: {
    dietaryRestrictions: [String],
    mealSwipes: {
      type: String,
      required: true,
      enum: ['0', '7', '10', '14', 'Unlimited']
    },
    distanceImportance: {
      type: String,
      required: true,
      enum: ['Not at all', 'Not very', 'Somewhat', 'Very']
    },
    height: {
      feet: {
        type: Number,
        required: true,
        min: 0,
        max: 8
      },
      inches: {
        type: Number,
        required: true,
        min: 0,
        max: 11
      }
    },
    weight: {
      type: Number,
      required: true,
      min: 0
    },
    workout: {
      type: String,
      required: true,
      enum: ['Yes', 'No']
    },
    liftingFrequency: String,
    cardioFrequency: String,
    workoutDuration: String,
    wantsPlan: String
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Survey', surveySchema);