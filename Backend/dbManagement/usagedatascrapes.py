import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()


# Web page URL to scrape
URL = os.getenv('USAGE_URL')

# Set up MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')
DATABASE_NAME = os.getenv('DATABASE_NAME')
COLLECTION_NAME = os.getenv('USAGE_COLLECTION_NAME')

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
collection = db[COLLECTION_NAME]

# Set up Selenium WebDriver
options = Options()
options.add_argument('--headless')
options.add_argument('--disable-gpu')
options.add_argument('--no-sandbox')
driver = webdriver.Chrome(options=options)

def scrape_data_and_store():
    # Load the page with Selenium
    driver.get(URL)
    time.sleep(5)  # Wait for dynamic content to load

    # Parse the page source with BeautifulSoup
    soup = BeautifulSoup(driver.page_source, 'html.parser')

    # Extract all location elements
    location_elements = soup.select('.rw-c2c-feed__location')
    if not location_elements:
        print('No location elements found on the page.')
        return

    for element in location_elements:
         # Extract location name
        name = element.select_one('.rw-c2c-feed__location--name').get_text(strip=True)
        # Extract capacity information (with null check)
        capacity_element = element.select_one('.rw-c2c-feed__about--capacity')
        capacity_text = capacity_element.get_text(strip=True).replace('Capacity: ', '') if capacity_element else 'N/A'
        # Extract last updated time (with null check)
        last_updated_element = element.select_one('.rw-c2c-feed__about--update')
        last_updated_text = last_updated_element.get_text(strip=True).replace('Last Updated: ', '') if last_updated_element else 'N/A'
        
        existing_record = collection.find_one({'location': name}, sort=[('scraped_at', -1)])
        if existing_record and 'last_updated' in existing_record:
            last_recorded_time_text = existing_record['last_updated']
            if last_updated_text <= last_recorded_time_text:
                print(f'Skipping data for {name}, no new updates.')
                continue
            
        # Format data for MongoDB
        data = {
            'location': name,
            'capacity': capacity_text,
            'last_updated': last_updated_text
        }

        # Store in MongoDB
        collection.insert_one(data)
        print('Data stored successfully:', data)

    driver.quit()

if __name__ == '__main__':
    scrape_data_and_store()
