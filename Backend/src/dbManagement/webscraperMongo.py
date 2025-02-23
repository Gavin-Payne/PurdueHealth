from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pymongo
from bs4 import BeautifulSoup
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from pymongo import MongoClient
import certifi

# Set up MongoDB connection
MONGODB_URI = os.getenv('MONGO_URI')
DATABASE_NAME = os.getenv('DATABASE_NAME')
MENU_COLLECTION_NAME = os.getenv('MENU_COLLECTION_NAME')
NUT_COLLECTION_NAME = os.getenv('NUT_COLLECTION_NAME')

# Connect to MongoDB with SSL certificate verification
client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where())
db = client[DATABASE_NAME]
menu_collection = db[MENU_COLLECTION_NAME]
nutrition_collection = db[NUT_COLLECTION_NAME]

# Create indexes for efficient querying
menu_collection.create_index([
    ('dining_court', pymongo.ASCENDING),
    ('item_name', pymongo.ASCENDING),
    ('date', pymongo.ASCENDING)
], unique=True)

nutrition_collection.create_index([
    ('item_name', pymongo.ASCENDING)
], unique=True)

# Selenium setup
chrome_options = Options()
chrome_options.add_argument('--headless')
driver = webdriver.Chrome(options=chrome_options)

diningCourts = [
    "Hillenbrand",
    "Earhart",
    "Ford",
    "Wiley",
    "Windsor"
]

times = [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Brunch",
    "Late%20Lunch"
]

def extract_menu_data(html_content, dining_court, date):
    soup = BeautifulSoup(html_content, 'html.parser')
    stations = soup.find_all('div', class_='station')

    menu_items = []
    for station in stations:
        station_name = station.find('div', class_='station-name').text.strip()
        items = station.find_all('a', class_='station-item')

        for item in items:
            item_name = item.find('span', class_='station-item-text').text.strip()
            nutrition_link = "https://dining.purdue.edu" + item.get('href')

            dietary_icons = item.find_all('img', class_='station-item--icon__allergen')
            dietary_tags = [icon.get('alt') for icon in dietary_icons]

            menu_items.append({
                'dining_court': dining_court,
                'station': station_name,
                'item_name': item_name,
                'nutrition_link': nutrition_link,
                'dietary_tags': dietary_tags,
                'date': date,
                'timestamp': datetime.utcnow()
            })

    return menu_items

def extract_nutrition_data(driver, url, item_name):
    try:
        driver.get(url)
        time.sleep(2)

        soup = BeautifulSoup(driver.page_source, 'html.parser')

        nutrition_data = {
            'item_name': item_name,
            'calories': 'N/A',
            'serving_size': 'N/A',
            'total_fat': 'N/A',
            'saturated_fat': 'N/A',
            'cholesterol': 'N/A',
            'sodium': 'N/A',
            'total_carbohydrate': 'N/A',
            'sugar': 'N/A',
            'added_sugar': 'N/A',
            'dietary_fiber': 'N/A',
            'protein': 'N/A',
            'calcium': 'N/A',
            'iron': 'N/A',
            'ingredients': 'N/A',
            'last_updated': datetime.utcnow()
        }

        calories_div = soup.find('div', class_='nutrition-feature-calories')
        if calories_div:
            calories = calories_div.find('span', class_='nutrition-feature-calories-quantity')
            serving = calories_div.find('span', class_='calories-label-title')
            if calories:
                nutrition_data['calories'] = calories.text.strip()
            if serving:
                nutrition_data['serving_size'] = serving.text.replace('amount per ', '').strip()

        nutrition_table = soup.find('div', class_='nutrition-table')
        if nutrition_table:
            rows = nutrition_table.find_all('div', class_='nutrition-table-row')
            for row in rows:
                label = row.find('span', class_='table-row-label')
                value = row.find('span', class_='table-row-labelValue')
                if label and value:
                    key = label.text.strip().lower().replace(' ', '_')
                    if key in nutrition_data:
                        nutrition_data[key] = value.text.strip()

        ingredients_div = soup.find('div', class_='nutrition-ingredient-list')
        if ingredients_div:
            nutrition_data['ingredients'] = ingredients_div.text.strip()

        return nutrition_data

    except Exception as e:
        print(f"Error extracting nutrition data: {str(e)}")
        return None

def check_future_menus():
    # Check menus for the next 7 days
    for i in range(7):
        date = (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')

        for court in diningCourts:
            for time_slot in times:
                url = f"https://dining.purdue.edu/menus/{court}/{date.replace('-', '/')}/{time_slot}"

                try:
                    driver.get(url)
                    time.sleep(2)

                    if "Page Not Found" in driver.title or "404" in driver.title:
                        print(f"Skipping {court} - {time_slot} on {date} (not available)")
                        continue

                    page_source = driver.page_source
                    menu_items = extract_menu_data(page_source, court, date)

                    if not menu_items:
                        print(f"No items found for {court} - {time_slot} on {date}")
                        continue

                    # Insert menu items only if they don't already exist
                    for item in menu_items:
                        existing_item = menu_collection.find_one({
                            'dining_court': item['dining_court'],
                            'item_name': item['item_name'],
                            'date': item['date']
                        })

                        if not existing_item:
                            menu_collection.insert_one(item)
                            print(f"Added new menu item: {item['item_name']} at {item['dining_court']} on {item['date']}")

                            # Check and update nutrition info
                            nutrition_data = extract_nutrition_data(driver, item['nutrition_link'], item['item_name'])
                            if nutrition_data:
                                nutrition_collection.update_one(
                                    {'item_name': item['item_name']},
                                    {'$set': nutrition_data},
                                    upsert=True
                                )
                                print(f"Updated nutrition info for: {item['item_name']}")
                        else:
                            print(f"Skipping existing item: {item['item_name']} at {item['dining_court']} on {item['date']}")

                    print(f"Data collection completed for {court} - {time_slot} on {date}")

                except Exception as e:
                    print(f"Error collecting data for {court} - {time_slot} on {date}: {str(e)}")
                    continue

def main():
    check_future_menus()

    # Print sample of stored data
    print("\nSample Menu Items:")
    for item in menu_collection.find().limit(5):
        print(f"\nDining Court: {item['dining_court']}")
        print(f"Station: {item['station']}")
        print(f"Item: {item['item_name']}")
        print(f"Dietary Tags: {', '.join(item['dietary_tags'])}")
        print("-" * 50)

    print("\nSample Nutrition Information:")
    for item in nutrition_collection.find().limit(5):
        print(f"\nItem: {item['item_name']}")
        print(f"Calories: {item['calories']}")
        print(f"Serving Size: {item['serving_size']}")
        print(f"Total Fat: {item['total_fat']}")
        print(f"Protein: {item['protein']}")
        print(f"Ingredients: {item['ingredients'][:100]}...")
        print("-" * 50)

    # Clean up
    driver.quit()
    client.close()

if __name__ == "__main__":
    main()