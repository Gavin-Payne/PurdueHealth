const { GoogleGenerativeAI } = require('@google/generative-ai');
const { retrieveDataFromMongodb } = require('./retrieveSurveyData');
require('dotenv').config();

// Initialize the Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not found");
}

const genAI = new GoogleGenerativeAI(apiKey);

async function generateWorkoutPlan(workoutStatus, heightFeet, heightInches, weight, duration, liftingFreq, cardioFreq) {
    // Create the model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Format the prompt with more specific instructions
    const prompt = `
    Create a detailed weekly workout plan for someone with these parameters:
    - Workout experience: ${workoutStatus}
    - Height: ${heightFeet}'${heightInches}"
    - Weight: ${weight} lbs
    - Workout duration: ${duration}
    - Weekly lifting sessions: ${liftingFreq}
    - Weekly cardio sessions: ${cardioFreq}

    The response should be a valid JSON object with this exact structure:
    {
      "Monday": "Detailed workout description",
      "Tuesday": "Detailed workout description",
      "Wednesday": "Detailed workout description",
      "Thursday": "Detailed workout description",
      "Friday": "Detailed workout description",
      "Saturday": "Detailed workout description",
      "Sunday": "Detailed workout description"
    }

    Include specific exercises, sets, reps, and rest periods where applicable.
    `;

    try {
        // Generate the response
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('Raw AI response:', text);

        try {
            const parsedResponse = JSON.parse(text);
            console.log('Successfully parsed response:', parsedResponse);
            return parsedResponse;
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            console.log('Attempting to extract JSON from response...');
            
            // Try to extract JSON from the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const extractedJson = JSON.parse(jsonMatch[0]);
                    console.log('Successfully extracted and parsed JSON:', extractedJson);
                    return extractedJson;
                } catch (extractError) {
                    console.error('Failed to parse extracted JSON:', extractError);
                    throw new Error('Could not parse workout plan from AI response');
                }
            }
            throw new Error('No valid JSON found in AI response');
        }
    } catch (error) {
        console.error('Error generating workout plan:', {
            error: error.message,
            workoutStatus,
            liftingFreq,
            cardioFreq
        });
        throw error; // Let the calling function handle the fallback
    }
}

async function generatePlanForUser(userId) {
    try {
        const data = await retrieveDataFromMongodb(userId);
        console.log('Retrieved user data:', data);
        
        if (!data) {
            throw new Error('No survey data found for user');
        }

        // Clean and validate the input data
        const cleanData = {
            workout: data.workout?.trim() || 'No',
            height_feet: data.height_feet?.toString() || '5',
            height_inches: data.height_inches?.toString() || '10',
            weight: data.weight?.toString() || '150',
            workout_duration: data.workout_duration?.replace(' min', '') || '60',
            lifting_frequency: data.lifting_frequency?.toString() || '0',
            cardio_frequency: data.cardio_frequency?.toString() || '0'
        };

        console.log('Cleaned data for AI:', cleanData);

        const plan = await generateWorkoutPlan(
            cleanData.workout,
            cleanData.height_feet,
            cleanData.height_inches,
            cleanData.weight,
            cleanData.workout_duration,
            cleanData.lifting_frequency,
            cleanData.cardio_frequency
        );

        if (!plan || Object.keys(plan).length === 0) {
            throw new Error('Generated plan is empty');
        }

        return plan;
    } catch (error) {
        console.error('Error in generatePlanForUser:', error);
        // Return fallback plan instead of throwing
        return {
            "Monday": "Rest day",
            "Tuesday": "Basic cardio - 30 minutes walking",
            "Wednesday": "Rest day",
            "Thursday": "Basic strength training",
            "Friday": "Rest day",
            "Saturday": "Light cardio",
            "Sunday": "Rest day"
        };
    }
}

module.exports = { generatePlanForUser, generateWorkoutPlan };