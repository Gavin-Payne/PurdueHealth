from pymongo import MongoClient
import os 
import certifi

# Load environment variables
MONGODB_URI = os.getenv('MONGO_URI')
DATABASE_NAME = 'test'  # Access the 'test' database
COLLECTION_NAME = 'survey'  # Access the 'survey' collection

def retrieve_data_from_mongodb():
    # Set up MongoDB connection
    client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where())
    db = client[DATABASE_NAME]
    collection = db[COLLECTION_NAME]

    # Get workout information for the user
    projection = {
        "userId": USER_ID,
        "answers.workout": 1,
        'answers.height': 1,
        'answers.weight': 1,
        'answers.workoutDuration': 1,
        'answers.wantsPlan': 1,
        'answers.liftingFrequency': 1,
        'answers.cardioFrequency': 1,
    }

    # Retrieve data from the collection
    data = collection.find({}, projection)

    for document in data:
        workout = document.get("answers", {}).get("workout")
        heightIn = document.get("answers.height", {}).get("inches")
        heightFt = document.get("answers.height", {}).get("feet")
        weight = document.get("answers", {}).get("weight")
        workout_duration = document.get("answers", {}).get("workoutDuration")
        wants_plan = document.get("answers", {}).get("wantsPlan")
        lifting_frequency = document.get("answers", {}).get("liftingFrequency")
        cardio_frequency = document.get("answers", {}).get("cardioFrequency")

    # Close the MongoDB connection
    client.close()
    return {'workout': workout, 'heightIn': heightIn, 'heightFt': heightFt, 'weight': weight, 'workout_duration': workout_duration, 'wants_plan': wants_plan, 'lifting_frequency': lifting_frequency, 'cardio_frequency': cardio_frequency}

# Usage
if __name__ == '__main__':
    retrieve_data_from_mongodb()