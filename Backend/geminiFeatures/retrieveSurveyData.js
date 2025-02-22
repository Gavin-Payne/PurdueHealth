const { MongoClient } = require('mongodb');
require('dotenv').config();

async function retrieveDataFromMongodb(userId) {
    const client = new MongoClient(process.env.MONGO_URI);

    try {
        await client.connect();
        const db = client.db('test');
        const collection = db.collection('surveys'); // Note: using 'surveys' collection

        console.log('Searching for survey with userId:', userId);

        const document = await collection.findOne(
            { userId: userId },
            {
                projection: {
                    'answers': 1
                }
            }
        );

        console.log('Found document:', document);

        if (!document || !document.answers) {
            throw new Error('No survey data found for user');
        }

        const answers = document.answers;
        return {
            workout: answers.workout || 'beginner',
            lifting_frequency: answers.liftingFrequency || '3',
            cardio_frequency: answers.cardioFrequency || '2',
            workout_duration: answers.workoutDuration || '30'
        };
    } catch (error) {
        console.error('Error retrieving survey data:', error);
        throw error;
    } finally {
        await client.close();
    }
}

module.exports = { retrieveDataFromMongodb };