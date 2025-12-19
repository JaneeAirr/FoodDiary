"""
Management command to download and import USDA FoodData Central database
Downloads Foundation Foods and SR Legacy datasets and imports them into local database
"""
import os
import json
import zipfile
import requests
from io import BytesIO
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Food

# Try to import tqdm for progress bar, but make it optional
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
    # Simple progress function if tqdm is not available
    def tqdm(iterable, desc=''):
        print(f'{desc}...')
        return iterable


class Command(BaseCommand):
    help = 'Downloads and imports USDA FoodData Central database into local database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--download',
            action='store_true',
            help='Download USDA database files',
        )
        parser.add_argument(
            '--file',
            type=str,
            help='Path to local USDA JSON file to import (skips download)',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of foods to import (for testing)',
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip foods that already exist in database',
        )

    def handle(self, *args, **options):
        download = options['download']
        file_path = options.get('file')
        limit = options.get('limit')
        skip_existing = options['skip_existing']

        if file_path:
            # Import from local file
            self.stdout.write(f'Importing from local file: {file_path}')
            self.import_from_file(file_path, limit, skip_existing)
        elif download:
            # Download and import
            self.stdout.write('Downloading USDA database...')
            downloaded_files = self.download_usda_database()
            for file_path in downloaded_files:
                self.stdout.write(f'Importing from: {file_path}')
                self.import_from_file(file_path, limit, skip_existing)
        else:
            self.stdout.write(
                self.style.ERROR(
                    'Please specify --download to download USDA database or --file <path> to import from local file'
                )
            )
            self.stdout.write(
                'Example: python manage.py import_usda_database --download'
            )
            self.stdout.write(
                'Or: python manage.py import_usda_database --file /path/to/foundation_foods.json'
            )

    def download_usda_database(self):
        """
        Download USDA FoodData Central database files
        Returns list of downloaded file paths
        """
        # USDA download URLs (these may need to be updated)
        # Foundation Foods - smaller, more curated dataset
        foundation_url = "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2024-04-18.zip"
        
        # SR Legacy - larger, comprehensive dataset
        sr_legacy_url = "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2024-04-18.zip"
        
        download_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'data', 'usda')
        os.makedirs(download_dir, exist_ok=True)
        
        downloaded_files = []
        
        # Try to download Foundation Foods first (smaller, faster)
        try:
            self.stdout.write('Downloading Foundation Foods dataset...')
            file_path = self.download_file(foundation_url, download_dir, 'foundation_foods.zip')
            if file_path:
                extracted = self.extract_zip(file_path, download_dir)
                downloaded_files.extend(extracted)
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'Failed to download Foundation Foods: {e}')
            )
            self.stdout.write('You can manually download from: https://fdc.nal.usda.gov/download-datasets.html')
        
        return downloaded_files

    def download_file(self, url, download_dir, filename):
        """Download a file with progress bar"""
        file_path = os.path.join(download_dir, filename)
        
        # Check if file already exists
        if os.path.exists(file_path):
            self.stdout.write(f'File already exists: {file_path}')
            return file_path
        
        try:
            response = requests.get(url, stream=True, timeout=300)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            
            with open(file_path, 'wb') as f:
                if total_size == 0:
                    f.write(response.content)
                else:
                    downloaded = 0
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total_size > 0:
                                percent = (downloaded / total_size) * 100
                                self.stdout.write(f'\rDownloading: {percent:.1f}%', ending='')
            
            self.stdout.write('')  # New line after progress
            self.stdout.write(self.style.SUCCESS(f'Downloaded: {filename}'))
            return file_path
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error downloading {url}: {e}')
            )
            return None

    def extract_zip(self, zip_path, extract_dir):
        """Extract ZIP file and return list of extracted JSON files"""
        extracted_files = []
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
                for file_info in zip_ref.namelist():
                    if file_info.endswith('.json'):
                        extracted_files.append(os.path.join(extract_dir, file_info))
            self.stdout.write(self.style.SUCCESS(f'Extracted: {len(extracted_files)} JSON files'))
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error extracting {zip_path}: {e}')
            )
        return extracted_files

    def import_from_file(self, file_path, limit=None, skip_existing=False):
        """Import foods from USDA JSON file"""
        if not os.path.exists(file_path):
            self.stdout.write(
                self.style.ERROR(f'File not found: {file_path}')
            )
            return
        
        self.stdout.write(f'Reading file: {file_path}')
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # USDA JSON structure: {"FoundationFoods": [...]} or {"SRLegacyFoods": [...]}
            foods_data = []
            if 'FoundationFoods' in data:
                foods_data = data['FoundationFoods']
            elif 'SRLegacyFoods' in data:
                foods_data = data['SRLegacyFoods']
            elif isinstance(data, list):
                foods_data = data
            else:
                # Try to find any array in the data
                for key, value in data.items():
                    if isinstance(value, list):
                        foods_data = value
                        break
            
            if not foods_data:
                self.stdout.write(
                    self.style.ERROR('No food data found in file')
                )
                return
            
            total = len(foods_data)
            if limit:
                foods_data = foods_data[:limit]
                self.stdout.write(f'Limited to {limit} foods (out of {total} total)')
            else:
                self.stdout.write(f'Found {total} foods to import')
            
            created_count = 0
            updated_count = 0
            skipped_count = 0
            error_count = 0
            
            with transaction.atomic():
                for food_data in tqdm(foods_data, desc='Importing foods'):
                    try:
                        parsed = self.parse_usda_food(food_data)
                        if not parsed:
                            skipped_count += 1
                            continue
                        
                        fdc_id = parsed.get('usda_fdc_id')
                        if not fdc_id:
                            skipped_count += 1
                            continue
                        
                        # Check if food already exists
                        if skip_existing:
                            existing = Food.objects.filter(usda_fdc_id=fdc_id).first()
                            if existing:
                                skipped_count += 1
                                continue
                        
                        food, created = Food.objects.update_or_create(
                            usda_fdc_id=fdc_id,
                            defaults=parsed
                        )
                        
                        if created:
                            created_count += 1
                        else:
                            updated_count += 1
                    
                    except Exception as e:
                        error_count += 1
                        if error_count <= 5:  # Show first 5 errors
                            self.stdout.write(
                                self.style.WARNING(f'Error importing food: {e}')
                            )
            
            self.stdout.write('')
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nImport complete! Created: {created_count}, Updated: {updated_count}, '
                    f'Skipped: {skipped_count}, Errors: {error_count}'
                )
            )
        
        except json.JSONDecodeError as e:
            self.stdout.write(
                self.style.ERROR(f'Invalid JSON file: {e}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error reading file: {e}')
            )

    def parse_usda_food(self, usda_food):
        """Parse USDA food data into our Food model format"""
        try:
            fdc_id = usda_food.get('fdcId')
            description = usda_food.get('description', '')
            
            if not fdc_id or not description:
                return None
            
            # Extract nutrients
            nutrients = {}
            food_nutrients = usda_food.get('foodNutrients', [])
            
            for nutrient in food_nutrients:
                if isinstance(nutrient, dict):
                    nutrient_info = nutrient.get('nutrient', {})
                    if not nutrient_info:
                        nutrient_info = nutrient
                    
                    nutrient_id = (
                        nutrient_info.get('id') or 
                        nutrient_info.get('number') or 
                        nutrient_info.get('nutrientId') or
                        nutrient.get('nutrientId') or
                        nutrient.get('id')
                    )
                    
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
                    
                    # Map USDA nutrient IDs
                    if nutrient_id == 208 or nutrient_id == '208':
                        nutrients['calories'] = amount
                    elif nutrient_id == 203 or nutrient_id == '203':
                        nutrients['protein'] = amount
                    elif nutrient_id == 204 or nutrient_id == '204':
                        nutrients['fat'] = amount
                    elif nutrient_id == 205 or nutrient_id == '205':
                        nutrients['carbs'] = amount
                    elif nutrient_id == 291 or nutrient_id == '291':
                        nutrients['fiber'] = amount
                    elif nutrient_id == 269 or nutrient_id == '269':
                        nutrients['sugar'] = amount
                    elif nutrient_id == 307 or nutrient_id == '307':
                        nutrients['sodium'] = amount
            
            # Set defaults for missing nutrients
            if 'calories' not in nutrients:
                nutrients['calories'] = 0
            if 'protein' not in nutrients:
                nutrients['protein'] = 0
            if 'carbs' not in nutrients:
                nutrients['carbs'] = 0
            if 'fat' not in nutrients:
                nutrients['fat'] = 0
            if 'fiber' not in nutrients:
                nutrients['fiber'] = 0
            
            # Clean description
            name = description.split(',')[0].strip() if ',' in description else description.strip()
            brand = ''
            if ',' in description:
                parts = description.split(',')
                if len(parts) > 1:
                    brand = parts[-1].strip()
            
            return {
                'name': name[:200],
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
            return None

