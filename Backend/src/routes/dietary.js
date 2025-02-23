const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { checkJwt, requireEmail, handlePreflightRequest } = require('../middleware/auth');
require('dotenv').config();

let mongoClient = null;

const getMongoClient = async () => {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGO_URI);
    await mongoClient.connect();
  }
  return mongoClient;
};

router.use(handlePreflightRequest);

// Add this new test route at the beginning of your routes
router.get('/test-connection', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const stats = {};

    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      stats[collection.name] = count;
    }

    res.json({
      message: 'Database connection test',
      databaseName: db.databaseName,
      collections: stats
    });

  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({
      message: 'Connection test failed',
      error: error.message
    });
  }
});

// Search Purdue dining foods
router.get('/foods', checkJwt, requireEmail, async (req, res) => {
  try {
    const { search } = req.query;
    console.log('Searching foods by item_name:', search);

    if (!search || search.length < 2) {
      return res.json([]);
    }

    const client = await getMongoClient();
    const db = client.db(process.env.DATABASE_NAME);
    const collection = db.collection(process.env.NUT_COLLECTION_NAME);

    // Debug info
    console.log('Database:', process.env.DATABASE_NAME);
    console.log('Collection:', process.env.NUT_COLLECTION_NAME);

    // Perform search
    const foods = await collection
      .find({
        item_name: {
          $regex: search,
          $options: 'i'
        }
      })
      .limit(20)
      .toArray();

    console.log(`Found ${foods.length} items matching "${search}"`);

    // Transform results
    const transformedFoods = foods.map(food => ({
      _id: food._id,
      name: food.item_name,
      calories: parseNutritionValue(food.calories),
      protein: parseNutritionValue(food.protein),
      carbs: parseNutritionValue(food.total_carbohydrate),
      fat: parseNutritionValue(food.total_fat),
      servingSize: food.serving_size || 'N/A',
      details: {
        sugar: food.sugar,
        fiber: food.dietary_fiber
      }
    }));

    res.json(transformedFoods);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      message: 'Failed to search foods',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Update the macros route with better survey data handling
router.get('/macros/:userId', checkJwt, requireEmail, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Calculating macros for:', userId);

    const client = await getMongoClient();
    const db = client.db(process.env.test);
    const surveyCollection = db.collection('surveys');
    
    console.log(`Fetching survey data for user: ${userId}`);

    // Find user's survey with more detailed query
    const userSurvey = await surveyCollection.findOne({
      $or: [
        { userId: userId },
        { 'answers.email': userId },
        { email: userId }
      ]
    });

    if (!userSurvey) {
      console.log('No survey found for user:', userId);
      return res.json({
        calories: 2000,
        protein: 150,
        fat: 67,
        carbs: 250,
        message: 'Using default values - no survey found'
      });
    }

    console.log('Found survey:', {
      userId: userSurvey.userId,
      hasAnswers: !!userSurvey.answers,
      weight: userSurvey.answers?.weight,
      height: userSurvey.answers?.height
    });

    // Extract values from survey
    const answers = userSurvey.answers || {};
    const weightInPounds = parseFloat(answers.weight) || 155; // Default 155 lbs
    const weightInKg = weightInPounds * 0.453592; // Convert pounds to kg
    const height = {
      feet: parseFloat(answers.height?.feet) || 5,
      inches: parseFloat(answers.height?.inches) || 10
    };
    
    // Convert height to cm
    const heightInCm = (height.feet * 30.48) + (height.inches * 2.54);
    
    // Update the workout and TDEE calculations
    const workoutFreq = parseInt(answers.liftingFrequency) || 0;
    const cardioFreq = parseInt(answers.cardioFrequency) || 0;
    const workoutsPerDay = (workoutFreq + cardioFreq) / 7; // Convert to daily average

    // Calculate activity level based on average daily activity
    let activityLevel;
    if (workoutsPerDay < 0.15) activityLevel = 'sedentary';      // Less than 1 workout per week
    else if (workoutsPerDay < 0.43) activityLevel = 'light';      // 1-3 workouts per week
    else if (workoutsPerDay < 0.72) activityLevel = 'moderate';   // 3-5 workouts per week
    else activityLevel = 'active';                                // 5+ workouts per week

    // Calculate BMR using Mifflin-St Jeor Equation with weight in kg
    const age = parseInt(answers.age) || 25;
    const bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * age) + 5;

    const activityMultipliers = {
      sedentary: 1.2,    // Little or no exercise
      light: 1.375,      // Light exercise 1-3 days/week
      moderate: 1.55,    // Moderate exercise 3-5 days/week
      active: 1.725      // Heavy exercise 6-7 days/week
    };

    // Calculate daily TDEE including average workout calories
    const dailyWorkoutCalories = (workoutsPerDay * 150); // 150 calories per workout
    const tdee = Math.round(bmr * activityMultipliers[activityLevel]);
    const totalDailyCalories = Math.round(tdee + dailyWorkoutCalories);

    // Calculate daily macros using weight in kg
    const proteinPerKg = 2.2; // Increased for active individuals
    const macros = {
      calories: totalDailyCalories,
      protein: Math.round(weightInKg * proteinPerKg),
      fat: Math.round((totalDailyCalories * 0.25) / 9), // 25% of calories from fat
      carbs: Math.round(
        (totalDailyCalories - 
          ((weightInKg * proteinPerKg * 4) + // Protein calories
          (totalDailyCalories * 0.25))) / 4  // Fat calories
      )
    };

    console.log('Daily calculation details:', {
      weightInPounds,
      weightInKg,
      heightInCm,
      age,
      bmr,
      activityLevel,
      workoutsPerDay,
      dailyWorkoutCalories,
      tdee,
      totalDailyCalories
    });

    console.log('Calculated macros:', macros);
    res.json(macros);

  } catch (error) {
    console.error('Error calculating macros:', error);
    res.status(500).json({ 
      message: 'Failed to calculate macros',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Debug route to check collection contents
router.get('/debug', checkJwt, requireEmail, async (req, res) => {
  try {
    const collection = mongoose.connection.db.collection('nutrition');
    const stats = {
      count: await collection.countDocuments(),
      sample: await collection.findOne(),
      collections: await mongoose.connection.db.listCollections().toArray()
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this new route after the existing debug route
router.get('/collections-stats', checkJwt, requireEmail, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const stats = {};

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    // Get count for each collection
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      stats[collection.name] = {
        count,
        isNutritionCollection: collection.name === process.env.NUT_COLLECTION_NAME
      };
      console.log(`Collection ${collection.name}: ${count} documents`);
    }

    // Special check for nutrition collection
    const nutritionCollection = process.env.NUT_COLLECTION_NAME;
    if (stats[nutritionCollection]) {
      const sample = await db.collection(nutritionCollection).findOne();
      console.log('Sample nutrition document:', JSON.stringify(sample, null, 2));
    }

    res.json({
      message: 'Collection statistics',
      databaseName: db.databaseName,
      nutritionCollectionName: process.env.NUT_COLLECTION_NAME,
      stats
    });

  } catch (error) {
    console.error('Error getting collection stats:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Failed to get collection statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Add this new route after the existing collections-stats route
router.post('/meals', checkJwt, requireEmail, async (req, res) => {
  try {
    const { userId, date, foods, totals } = req.body;

    const client = await getMongoClient();
    const db = client.db(process.env.DATABASE_NAME);
    const collection = db.collection('meals');

    const result = await collection.insertOne({
      userId,
      date,
      foods,
      totals,
      createdAt: new Date()
    });

    res.json({ 
      message: 'Meal saved successfully',
      mealId: result.insertedId 
    });

  } catch (error) {
    console.error('Error saving meal:', error);
    res.status(500).json({ 
      message: 'Failed to save meal',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

const Meal = require('../models/Meals');

// Add this route to get today's meals
router.get('/today-meals/:userId', checkJwt, requireEmail, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get start and end of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const meals = await Meal.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (!meals) {
      // Create new meal tracking for today
      const newMeals = await Meal.create({
        userId,
        date: new Date(),
        foods: [],
        dailyTotals: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      });
      return res.json(newMeals);
    }

    res.json(meals);

  } catch (error) {
    console.error('Error fetching today\'s meals:', error);
    res.status(500).json({ 
      message: 'Failed to fetch meals',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Add this route to add a food to today's meals
router.post('/add-food', checkJwt, requireEmail, async (req, res) => {
  try {
    const { userId, food } = req.body;
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let todaysMeals = await Meal.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (!todaysMeals) {
      todaysMeals = await Meal.create({
        userId,
        date: new Date(),
        foods: [],
        dailyTotals: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      });
    }

    // Add the new food
    todaysMeals.foods.push({
      ...food,
      addedAt: new Date()
    });

    // Update daily totals
    todaysMeals.dailyTotals = todaysMeals.foods.reduce((acc, food) => ({
      calories: acc.calories + food.totalCalories,
      protein: acc.protein + food.totalProtein,
      carbs: acc.carbs + food.totalCarbs,
      fat: acc.fat + food.totalFat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    await todaysMeals.save();
    res.json(todaysMeals);

  } catch (error) {
    console.error('Error adding food:', error);
    res.status(500).json({ 
      message: 'Failed to add food',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Helper function to parse nutrition values
const parseNutritionValue = (value) => {
  if (!value) return 0;
  const numericValue = value.toString().replace(/[^\d.]/g, '');
  return parseFloat(numericValue) || 0;
};

module.exports = router;