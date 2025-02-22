from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pandas as pd
from bs4 import BeautifulSoup
import sqlite3
import time

chrome_options = Options()
chrome_options.add_argument('--headless')
driver = webdriver.Chrome(options=chrome_options)

conn = sqlite3.connect('dining_menus.db')
cursor = conn.cursor()
cursor.execute('''
    CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dining_court TEXT,
        station TEXT,
        item_name TEXT,
        nutrition_link TEXT,
        dietary_tags TEXT,
        date TEXT
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS nutrition_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT,
        calories TEXT,
        serving_size TEXT,
        total_fat TEXT,
        saturated_fat TEXT,
        cholesterol TEXT,
        sodium TEXT,
        total_carbohydrate TEXT,
        sugar TEXT,
        added_sugar TEXT,
        dietary_fiber TEXT,
        protein TEXT,
        calcium TEXT,
        iron TEXT,
        ingredients TEXT
    )
''')

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
            
            # Get dietary tags
            dietary_icons = item.find_all('img', class_='station-item--icon__allergen')
            dietary_tags = [icon.get('alt') for icon in dietary_icons]
            dietary_tags_str = ','.join(dietary_tags)
            
            menu_items.append((
                dining_court,
                station_name,
                item_name,
                nutrition_link,
                dietary_tags_str,
                date
            ))
    
    return menu_items

def extract_nutrition_data(driver, url):
    try:
        driver.get(url)
        time.sleep(2)
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # Initialize dictionary with default "N/A" values
        nutrition_data = {
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
            'ingredients': 'N/A'
        }
        
        # Extract calories and serving size
        calories_div = soup.find('div', class_='nutrition-feature-calories')
        if calories_div:
            calories = calories_div.find('span', class_='nutrition-feature-calories-quantity')
            serving = calories_div.find('span', class_='calories-label-title')
            if calories:
                nutrition_data['calories'] = calories.text.strip()
            if serving:
                nutrition_data['serving_size'] = serving.text.replace('amount per ', '').strip()
        
        # Extract nutrition table data if it exists
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
        
        # Extract ingredients if they exist
        ingredients_div = soup.find('div', class_='nutrition-ingredient-list')
        if ingredients_div:
            nutrition_data['ingredients'] = ingredients_div.text.strip()
            
        return nutrition_data
        
    except Exception as e:
        print(f"Error extracting nutrition data: {str(e)}")
        return None

for court in diningCourts:
    date = "2025-02-21"
    
    for time_slot in times:
        url = f"https://dining.purdue.edu/menus/{court}/2025/2/21/{time_slot}"
        
        try:
            driver.get(url)
            time.sleep(2)
            
            # Check if page exists/has content
            if "Page Not Found" in driver.title or "404" in driver.title:
                print(f"Skipping {court} - {time_slot} (not available)")
                continue
                
            page_source = driver.page_source
            menu_items = extract_menu_data(page_source, court, date)
            
            if not menu_items:
                print(f"No items found for {court} - {time_slot}")
                continue
            
            # Check each item before inserting
            for item in menu_items:
                # Add time_slot to the existing check
                cursor.execute('''
                    SELECT id FROM menu_items 
                    WHERE dining_court = ? 
                    AND station = ? 
                    AND item_name = ? 
                    AND date = ?
                ''', (item[0], item[1], item[2], item[5]))
                
                existing_item = cursor.fetchone()
                
                if not existing_item:
                    cursor.execute('''
                        INSERT INTO menu_items 
                        (dining_court, station, item_name, nutrition_link, dietary_tags, date)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', item)
                    print(f"Added new item: {item[2]} at {item[0]} - {time_slot}")
                else:
                    print(f"Skipped existing item: {item[2]} at {item[0]} - {time_slot}")
            
            conn.commit()
            print(f"Data collection completed for {court} - {time_slot}")
            
        except Exception as e:
            print(f"Error collecting data for {court} - {time_slot}: {str(e)}")
            continue

# Print stored data
print("\nStored Menu Items:")
cursor.execute("""
    SELECT dining_court, station, item_name, dietary_tags, nutrition_link
    FROM menu_items 
    ORDER BY dining_court, station, item_name
""")
results = cursor.fetchall()

for row in results[0:5]:
    print(f"\nDining Court: {row[0]}")
    print(f"Station: {row[1]}")
    print(f"Item: {row[2]}")
    print(f"Dietary Tags: {row[3]}")
    print(f"link: {row[4]}")
    print("-" * 50)

print("\nCollecting nutrition information...")
cursor.execute("SELECT item_name, nutrition_link FROM menu_items")
items = cursor.fetchall()

for item_name, nutrition_link in items:
    # Check if item already exists in nutrition_info
    cursor.execute('SELECT id FROM nutrition_info WHERE item_name = ?', (item_name,))
    if cursor.fetchone() is None:
        nutrition_data = extract_nutrition_data(driver, nutrition_link)
        
        if nutrition_data:
            cursor.execute('''
                INSERT INTO nutrition_info 
                (item_name, calories, serving_size, total_fat, saturated_fat, 
                cholesterol, sodium, total_carbohydrate, sugar, added_sugar, 
                dietary_fiber, protein, calcium, iron, ingredients)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                item_name,
                nutrition_data['calories'],
                nutrition_data['serving_size'],
                nutrition_data['total_fat'],
                nutrition_data['saturated_fat'],
                nutrition_data['cholesterol'],
                nutrition_data['sodium'],
                nutrition_data['total_carbohydrate'],
                nutrition_data['sugar'],
                nutrition_data['added_sugar'],
                nutrition_data['dietary_fiber'],
                nutrition_data['protein'],
                nutrition_data['calcium'],
                nutrition_data['iron'],
                nutrition_data['ingredients']
            ))
            print(f"Added nutrition info for: {item_name}")
        else:
            # Insert item with N/A values if nutrition data couldn't be retrieved
            cursor.execute('''
                INSERT INTO nutrition_info 
                (item_name, calories, serving_size, total_fat, saturated_fat, 
                cholesterol, sodium, total_carbohydrate, sugar, added_sugar, 
                dietary_fiber, protein, calcium, iron, ingredients)
                VALUES (?, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A')
            ''', (item_name,))
            print(f"Added placeholder nutrition info for: {item_name}")
        
        conn.commit()
    else:
        print(f"Nutrition info already exists for: {item_name}")

# Add this before closing the connection to verify the data:
print("\nSample Nutrition Information:")
cursor.execute("""
    SELECT item_name, calories, serving_size, total_fat, protein, ingredients 
    FROM nutrition_info 
    LIMIT 5
""")
nutrition_results = cursor.fetchall()

for row in nutrition_results:
    print(f"\nItem: {row[0]}")
    print(f"Calories: {row[1]}")
    print(f"Serving Size: {row[2]}")
    print(f"Total Fat: {row[3]}")
    print(f"Protein: {row[4]}")
    print(f"Ingredients: {row[5][:100]}...")  # Show first 100 characters of ingredients
    print("-" * 50)

# Clean up
driver.quit()
conn.close()


