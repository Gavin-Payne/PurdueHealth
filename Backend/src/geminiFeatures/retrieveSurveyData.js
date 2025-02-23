const { MongoClient } = require('mongodb');
require('dotenv').config();

async function retrieveDataFromMongodb(userId) {
    let client;
    try {
        client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        console.log('MongoDB connected successfully');

        const db = client.db('test');
        const collection = db.collection('surveys');

        console.log('Searching for survey with userId:', userId);

        // Debug: List all collections
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));

        // First try exact match
        let document = await collection.findOne({ userId: userId });
        
        if (!document) {
            console.log('Trying email match...');
            document = await collection.findOne({ 'answers.email': userId });
        }
        
        if (!document) {
            console.log('Trying direct email match...');
            document = await collection.findOne({ email: userId });
        }

        console.log('Found document:', JSON.stringify(document, null, 2));

        if (!document || !document.answers) {
            console.log('No survey data found for user:', userId);
            throw new Error(`No survey data found for user: ${userId}`);
        }

        const answers = document.answers;
        
        // Validate required fields
        console.log('Survey answers:', {
            workout: answers.workout,
            liftingFreq: answers.liftingFrequency,
            cardioFreq: answers.cardioFrequency,
            duration: answers.workoutDuration
        });

        return {
            workout: answers.workout || 'beginner',
            lifting_frequency: answers.liftingFrequency || '3',
            cardio_frequency: answers.cardioFrequency || '2',
            workout_duration: answers.workoutDuration || '30',
            height_feet: answers.height?.feet || '5',
            height_inches: answers.height?.inches || '10',
            weight: answers.weight || '150'
        };
    } catch (error) {
        console.error('Error retrieving survey data:', error);
        throw error;
    } finally {
        await client.close();
    }
}

module.exports = { retrieveDataFromMongodb };