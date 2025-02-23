const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  foods: [{
    name: String,
    servings: Number,
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    totalCalories: Number,
    totalProtein: Number,
    totalCarbs: Number,
    totalFat: Number,
    servingSize: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  dailyTotals: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  }
});

// Add index for querying meals by date range
mealSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('Meal', mealSchema);