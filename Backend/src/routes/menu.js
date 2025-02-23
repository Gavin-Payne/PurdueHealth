const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { checkJwt, extractUserFromToken, requireEmail, handlePreflightRequest } = require('../middleware/auth');
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

// Get menu items for a specific dining court, date, and meal
router.get('/getMenus', async (req, res) => { // Remove checkJwt for testing
    console.log('Received request for menu data');
    try {
        const client = await getMongoClient();
        const db = client.db(process.env.DATABASE_NAME);
        const menuCollection = db.collection(process.env.MENUS_COLLECTION_NAME);
        const nutritionCollection = db.collection(process.env.NUT_COLLECTION_NAME);
        
        const { dining_court, date} = req.query;

        if (!dining_court || !date) {
            console.error('Missing required query parameters');
            return res.status(400).json({ message: 'Missing required query parameters' });
        }

        console.log(`Fetching menu data for court: ${dining_court}, date: ${date}`);

        const menuItems = await menuCollection.aggregate([
            { $match: { dining_court, date} },
            { $group: {
                _id: '$station',
                items: { $push: {
                    item_name: '$item_name',
                    dietary_tags: '$dietary_tags',
                    nutrition_link: '$nutrition_link'
                }}
            }}
        ]).toArray();

        console.log('Menu items fetched:', menuItems);

        // Fetch nutrition info for menu items
        for (const station of menuItems) {
            for (const item of station.items) {
                const nutrition = await nutritionCollection.findOne({ item_name: item.item_name });
                if (nutrition) {
                    item.nutrition = nutrition;
                }
            }
        }

        res.json(menuItems);
    } catch (error) {
        console.error('Failed to fetch menu data:', error);
        res.status(500).json({ error: 'Failed to fetch menu data', details: error.message });
    }
});

module.exports = router;