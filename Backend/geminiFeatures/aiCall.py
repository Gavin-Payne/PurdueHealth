from google import genai
from dotenv import load_dotenv
import os
import retrieveSurveyData

# Load env
load_dotenv()

# Get the API key
api_key = os.getenv("GEMINI_API_KEY")

# Return an error if the key is invalid
if not api_key:
    raise ValueError("API key is missing or invalid")

def getAIResponse(inputPrompt):
    # Create client
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash", contents=inputPrompt
    )
    return response

if __name__ == "__main__":
    # Call the database
    data = retrieveSurveyData.retrieve_data_from_mongodb(userID)

    # Get data
    contents = []
    for x in data:
        workout = x.get("workout")
        height_ft = x.get("heightFt")
        height_in = x.get("heightIn")
        weight = x.get("weight")
        workout_duration = x.get("workout_duration")
        lifting_frequency = x.get("lifting_frequency")
        cardio_frequency = x.get("cardio_frequency")

        # Create a list of strings for the AI
        content = (
            f"Given the following information, create a workout plan, and stress that anyone seeking such information should consult with a medical professional before making any life altering changes:\n"
            f"Begin Information\n"
            f"Does Workout: {workout}\n"
            f"Height: {height_ft} feet {height_in} inches\n"
            f"Weight: {weight}\n"
            f"Workout Duration: {workout_duration}\n"
            f"Lifting Frequency: {lifting_frequency}\n"
            f"Cardio Frequency: {cardio_frequency}\n"
            f"End Information\n"
        )
        contents.append(content)

    response = getAIResponse(contents)
    print(response)