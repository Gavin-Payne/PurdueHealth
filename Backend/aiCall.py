from google import genai
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Get the API key from the environment variable
api_key = os.getenv("GEMINI_API_KEY")

# Verify that the API key is loaded correctly
if not api_key:
    raise ValueError("API key is missing or invalid")

def getAIResponse(inputPrompt):
    # Create a client with the API key
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash", contents=inputPrompt
    )
    return response