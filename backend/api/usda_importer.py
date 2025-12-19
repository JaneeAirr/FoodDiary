"""
USDA FoodData Central API importer
Imports food data from USDA FoodData Central API
"""
import requests
import time
from typing import List, Dict, Optional
from decouple import config
from functools import lru_cache
from datetime import datetime, timedelta

# Simple in-memory cache for USDA search results
_usda_cache = {}
_cache_ttl = timedelta(hours=24)  # Cache for 24 hours


class USDADataImporter:
    """Importer for USDA FoodData Central API"""
    
    BASE_URL = "https://api.nal.usda.gov/fdc/v1"
    RATE_LIMIT_DELAY = 0.1  # Delay between requests to respect rate limits (1000/hour = ~3.6 sec/request)
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config('USDA_API_KEY', default='')
        if not self.api_key:
            raise ValueError("USDA_API_KEY not found in environment variables")
    
    def search_foods(self, query: str, page_size: int = 50, page_number: int = 1, use_cache: bool = True) -> Dict:
        """
        Search for foods in USDA database with caching
        
        Args:
            query: Search query (food name)
            page_size: Number of results per page (max 200)
            page_number: Page number
            use_cache: Whether to use cached results
            
        Returns:
            Dictionary with search results
        """
        # Check cache first
        cache_key = f"{query.lower()}_{page_size}_{page_number}"
        if use_cache and cache_key in _usda_cache:
            cached_result, cached_time = _usda_cache[cache_key]
            if datetime.now() - cached_time < _cache_ttl:
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"USDA cache hit for '{query}'")
                return cached_result
        
        url = f"{self.BASE_URL}/foods/search"
        data = {
            'query': query,
            'pageSize': min(page_size, 200),
            'pageNumber': page_number,
        }
        params = {
            'api_key': self.api_key,
        }
        
        try:
            response = requests.post(url, json=data, params=params, timeout=10)
            
            # Handle rate limit gracefully
            if response.status_code == 429:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"USDA rate limit exceeded for query: {query}")
                # Return cached result if available, even if expired
                if cache_key in _usda_cache:
                    logger.info(f"Returning stale cache for '{query}' due to rate limit")
                    return _usda_cache[cache_key][0]
                return {'foods': [], 'totalHits': 0, 'error': 'rate_limit_exceeded'}
            
            response.raise_for_status()
            result = response.json()
            
            # Cache successful results
            if use_cache and 'error' not in result:
                _usda_cache[cache_key] = (result, datetime.now())
                # Limit cache size to prevent memory issues
                if len(_usda_cache) > 1000:
                    # Remove oldest entries
                    oldest_key = min(_usda_cache.keys(), key=lambda k: _usda_cache[k][1])
                    del _usda_cache[oldest_key]
            
            # Log search results for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"USDA search '{query}': {result.get('totalHits', 0)} total hits, {len(result.get('foods', []))} foods returned")
            
            # Reduced delay for faster response
            time.sleep(0.1)  # Slightly increased to respect rate limits
            return result
        except requests.exceptions.Timeout:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"USDA API timeout for query: {query}")
            # Return cached result if available
            if cache_key in _usda_cache:
                logger.info(f"Returning cached result for '{query}' due to timeout")
                return _usda_cache[cache_key][0]
            return {'foods': [], 'totalHits': 0, 'error': 'timeout'}
        except requests.exceptions.RequestException as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error searching USDA: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response text: {e.response.text[:200]}")
            # Return cached result if available
            if cache_key in _usda_cache:
                logger.info(f"Returning cached result for '{query}' due to error")
                return _usda_cache[cache_key][0]
            return {'foods': [], 'totalHits': 0, 'error': str(e)}
    
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
        }
        
        try:
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            time.sleep(self.RATE_LIMIT_DELAY)
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching food {fdc_id}: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response status: {e.response.status_code}")
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
            
            if not fdc_id or not description:
                return None
            
            # Extract nutrients - handle both search results and detailed food data
            nutrients = {}
            food_nutrients = usda_food.get('foodNutrients', [])
            
            # Handle different response formats - sometimes nutrients are nested differently
            if not food_nutrients and 'foodNutrients' in usda_food:
                food_nutrients = usda_food['foodNutrients']
            
            for nutrient in food_nutrients:
                # Handle different response formats
                if isinstance(nutrient, dict):
                    nutrient_info = nutrient.get('nutrient', {})
                    if not nutrient_info:
                        nutrient_info = nutrient
                    
                    # Try multiple ways to get nutrient ID
                    nutrient_id = (
                        nutrient_info.get('id') or 
                        nutrient_info.get('number') or 
                        nutrient_info.get('nutrientId') or
                        nutrient.get('nutrientId') or
                        nutrient.get('id')
                    )
                    
                    # Try multiple ways to get amount
                    amount = (
                        nutrient.get('amount') or 
                        nutrient.get('value') or
                        nutrient_info.get('amount') or
                        nutrient_info.get('value')
                    )
                    
                    if not nutrient_id or amount is None:
                        continue
                    
                    try:
                        amount = float(amount)
                    except (ValueError, TypeError):
                        continue
                    
                    # Map USDA nutrient IDs to our fields
                    # 208 = Energy (kcal), 203 = Protein, 204 = Fat, 205 = Carbs, 291 = Fiber
                    # Also check nutrient name as fallback
                    nutrient_name = (nutrient_info.get('name') or nutrient.get('name') or '').lower()
                    
                    # Map by ID first (most reliable)
                    if str(nutrient_id) == '208' or 'energy' in nutrient_name:
                        nutrients['calories'] = amount
                    elif str(nutrient_id) == '203' or 'protein' in nutrient_name:
                        nutrients['protein'] = amount
                    elif str(nutrient_id) == '204' or ('total fat' in nutrient_name and 'saturated' not in nutrient_name):
                        nutrients['fat'] = amount
                    elif str(nutrient_id) == '205' or ('carbohydrate' in nutrient_name and 'fiber' not in nutrient_name and 'sugar' not in nutrient_name):
                        nutrients['carbs'] = amount
                    elif str(nutrient_id) == '291' or 'fiber' in nutrient_name:
                        nutrients['fiber'] = amount
                    elif str(nutrient_id) == '269' or ('sugar' in nutrient_name and 'total' in nutrient_name):
                        nutrients['sugar'] = amount
                    elif str(nutrient_id) == '307' or 'sodium' in nutrient_name:
                        nutrients['sodium'] = amount
            
            # Be very lenient - if no calories found, try to get detailed data
            # Otherwise, use default values
            if 'calories' not in nutrients:
                # Try to get detailed food data if search result doesn't have calories
                detailed = self.get_food_details(fdc_id)
                if detailed:
                    return self.parse_food_data(detailed)
                # If we can't get details, use 0 as default (better than nothing)
                nutrients['calories'] = 0
            
            # Set defaults for missing nutrients
            if 'protein' not in nutrients:
                nutrients['protein'] = 0
            if 'carbs' not in nutrients:
                nutrients['carbs'] = 0
            if 'fat' not in nutrients:
                nutrients['fat'] = 0
            if 'fiber' not in nutrients:
                nutrients['fiber'] = 0
            
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
                'calories': max(0, nutrients.get('calories', 0)),
                'protein': max(0, nutrients.get('protein', 0)),
                'carbs': max(0, nutrients.get('carbs', 0)),
                'fat': max(0, nutrients.get('fat', 0)),
                'fiber': max(0, nutrients.get('fiber', 0)),
                'sugar': nutrients.get('sugar') if nutrients.get('sugar') else None,
                'sodium': nutrients.get('sodium') if nutrients.get('sodium') else None,
            }
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error parsing food data: {e}")
            logger.debug(f"Food data: {usda_food.get('fdcId')} - {usda_food.get('description', '')[:50]}")
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
