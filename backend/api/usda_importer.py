"""
USDA FoodData Central API importer
Imports food data from USDA FoodData Central API
"""
import requests
import time
from typing import List, Dict, Optional
from decouple import config


class USDADataImporter:
    """Importer for USDA FoodData Central API"""
    
    BASE_URL = "https://api.nal.usda.gov/fdc/v1"
    RATE_LIMIT_DELAY = 0.1  # Delay between requests to respect rate limits (1000/hour = ~3.6 sec/request)
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config('USDA_API_KEY', default='')
        if not self.api_key:
            raise ValueError("USDA_API_KEY not found in environment variables")
    
    def search_foods(self, query: str, page_size: int = 50, page_number: int = 1) -> Dict:
        """
        Search for foods in USDA database
        
        Args:
            query: Search query (food name)
            page_size: Number of results per page (max 200)
            page_number: Page number
            
        Returns:
            Dictionary with search results
        """
        url = f"{self.BASE_URL}/foods/search"
        params = {
            'api_key': self.api_key,
            'query': query,
            'pageSize': min(page_size, 200),
            'pageNumber': page_number,
            'dataType': ['Foundation', 'SR Legacy'],  # Exclude Branded Foods for now
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            time.sleep(self.RATE_LIMIT_DELAY)  # Rate limiting
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error searching USDA: {e}")
            return {'foods': [], 'totalHits': 0}
    
    def get_food_details(self, fdc_id: int) -> Optional[Dict]:
        """
        Get detailed information about a specific food
        
        Args:
            fdc_id: USDA FoodData Central ID
            
        Returns:
            Dictionary with food details or None
        """
        url = f"{self.BASE_URL}/food/{fdc_id}"
        params = {
            'api_key': self.api_key,
            'nutrients': [203, 204, 205, 208, 291],  # Protein, Fat, Carbs, Calories, Fiber
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            time.sleep(self.RATE_LIMIT_DELAY)
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching food {fdc_id}: {e}")
            return None
    
    def parse_food_data(self, usda_food: Dict) -> Optional[Dict]:
        """
        Parse USDA food data into our Food model format
        
        Args:
            usda_food: Food data from USDA API
            
        Returns:
            Dictionary with parsed food data or None
        """
        try:
            fdc_id = usda_food.get('fdcId')
            description = usda_food.get('description', '')
            
            # Extract nutrients
            nutrients = {}
            for nutrient in usda_food.get('foodNutrients', []):
                nutrient_id = nutrient.get('nutrient', {}).get('id')
                amount = nutrient.get('amount', 0)
                
                # Map USDA nutrient IDs to our fields
                # 208 = Energy (kcal), 203 = Protein, 204 = Fat, 205 = Carbs, 291 = Fiber
                if nutrient_id == 208:
                    nutrients['calories'] = amount
                elif nutrient_id == 203:
                    nutrients['protein'] = amount
                elif nutrient_id == 204:
                    nutrients['fat'] = amount
                elif nutrient_id == 205:
                    nutrients['carbs'] = amount
                elif nutrient_id == 291:
                    nutrients['fiber'] = amount
                elif nutrient_id == 269:  # Sugar
                    nutrients['sugar'] = amount
                elif nutrient_id == 307:  # Sodium
                    nutrients['sodium'] = amount
            
            # Check if we have required nutrients
            if not all(key in nutrients for key in ['calories', 'protein', 'carbs', 'fat']):
                return None
            
            # Clean description (remove brand info if present)
            name = description.split(',')[0].strip() if ',' in description else description.strip()
            brand = ''
            if ',' in description:
                parts = description.split(',')
                if len(parts) > 1:
                    brand = parts[-1].strip()
            
            return {
                'name': name[:200],  # Limit to model max_length
                'brand': brand[:100] if brand else '',
                'description': description[:500] if description else '',
                'usda_fdc_id': fdc_id,
                'data_source': 'usda',
                'calories': nutrients.get('calories', 0),
                'protein': nutrients.get('protein', 0),
                'carbs': nutrients.get('carbs', 0),
                'fat': nutrients.get('fat', 0),
                'fiber': nutrients.get('fiber', 0),
                'sugar': nutrients.get('sugar'),
                'sodium': nutrients.get('sodium'),
            }
        except Exception as e:
            print(f"Error parsing food data: {e}")
            return None
    
    def import_popular_foods(self, food_names: List[str], max_per_food: int = 5) -> List[Dict]:
        """
        Import popular foods by searching for them
        
        Args:
            food_names: List of food names to search for
            max_per_food: Maximum number of results to import per food name
            
        Returns:
            List of parsed food data dictionaries
        """
        imported_foods = []
        
        for food_name in food_names:
            print(f"Searching for: {food_name}")
            search_results = self.search_foods(food_name, page_size=max_per_food)
            
            foods = search_results.get('foods', [])
            for food in foods[:max_per_food]:
                parsed = self.parse_food_data(food)
                if parsed:
                    imported_foods.append(parsed)
                    print(f"  ✓ Parsed: {parsed['name']}")
            
            time.sleep(0.5)  # Additional delay between searches
        
        return imported_foods
    
    def import_by_fdc_ids(self, fdc_ids: List[int]) -> List[Dict]:
        """
        Import foods by their FDC IDs
        
        Args:
            fdc_ids: List of USDA FDC IDs
            
        Returns:
            List of parsed food data dictionaries
        """
        imported_foods = []
        
        for fdc_id in fdc_ids:
            print(f"Fetching FDC ID: {fdc_id}")
            food_data = self.get_food_details(fdc_id)
            if food_data:
                parsed = self.parse_food_data(food_data)
                if parsed:
                    imported_foods.append(parsed)
                    print(f"  ✓ Parsed: {parsed['name']}")
        
        return imported_foods
