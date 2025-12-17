"""
Management command to import foods from USDA FoodData Central API
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Food
from api.usda_importer import USDADataImporter
from decouple import config


class Command(BaseCommand):
    help = 'Import foods from USDA FoodData Central API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--search',
            type=str,
            nargs='+',
            help='Search for foods by name(s)',
        )
        parser.add_argument(
            '--fdc-ids',
            type=int,
            nargs='+',
            help='Import specific foods by FDC IDs',
        )
        parser.add_argument(
            '--popular',
            action='store_true',
            help='Import popular/common foods',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Maximum number of foods to import (default: 50)',
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip foods that already exist in database',
        )

    def handle(self, *args, **options):
        # Check for API key
        api_key = config('USDA_API_KEY', default='')
        if not api_key:
            self.stdout.write(
                self.style.ERROR(
                    'USDA_API_KEY not found in .env file.\n'
                    'Get your free API key at: https://fdc.nal.usda.gov/api-key-signup.html\n'
                    'Add it to backend/.env: USDA_API_KEY=your_key_here'
                )
            )
            return

        try:
            importer = USDADataImporter(api_key)
        except ValueError as e:
            self.stdout.write(self.style.ERROR(str(e)))
            return

        imported_foods = []
        
        # Import by search terms
        if options['search']:
            self.stdout.write(self.style.SUCCESS(f"Searching for: {', '.join(options['search'])}"))
            for search_term in options['search']:
                self.stdout.write(f"  Searching: {search_term}")
                try:
                    search_results = importer.search_foods(search_term, page_size=min(options['limit'], 50))
                    foods = search_results.get('foods', [])
                    self.stdout.write(f"  Found {len(foods)} results")
                    
                    for food in foods[:options['limit']]:
                        parsed = importer.parse_food_data(food)
                        if parsed:
                            imported_foods.append(parsed)
                            self.stdout.write(f"    [OK] Parsed: {parsed['name']}")
                        else:
                            # Try to get detailed data
                            fdc_id = food.get('fdcId')
                            if fdc_id:
                                try:
                                    detailed = importer.get_food_details(fdc_id)
                                    if detailed:
                                        parsed = importer.parse_food_data(detailed)
                                        if parsed:
                                            imported_foods.append(parsed)
                                            self.stdout.write(f"    [OK] Parsed (detailed): {parsed['name']}")
                                except Exception as e:
                                    self.stdout.write(f"    [SKIP] Could not get details for FDC {fdc_id}: {e}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"  Error searching for {search_term}: {e}"))
                    continue
        
        # Import by FDC IDs
        elif options['fdc_ids']:
            self.stdout.write(self.style.SUCCESS(f"Importing FDC IDs: {options['fdc_ids']}"))
            results = importer.import_by_fdc_ids(options['fdc_ids'])
            imported_foods.extend(results)
        
        # Import popular foods
        elif options['popular']:
            popular_foods = [
                'chicken breast', 'salmon', 'eggs', 'milk', 'banana', 'apple', 'orange',
                'broccoli', 'spinach', 'carrot', 'potato', 'rice', 'pasta', 'bread',
                'yogurt', 'cheese', 'beef', 'pork', 'turkey', 'tuna', 'shrimp',
                'avocado', 'almonds', 'peanut butter', 'oatmeal', 'quinoa', 'sweet potato',
                'tomato', 'cucumber', 'lettuce', 'onion', 'garlic', 'olive oil',
                'strawberry', 'blueberry', 'grapes', 'watermelon', 'pineapple',
                'chicken thigh', 'ground beef', 'bacon', 'sausage', 'ham',
                'cottage cheese', 'mozzarella', 'cheddar cheese', 'butter',
                'whole wheat bread', 'white bread', 'bagel', 'croissant',
                'brown rice', 'white rice', 'barley', 'buckwheat',
                'lentils', 'black beans', 'chickpeas', 'kidney beans',
                'peanut', 'walnut', 'cashew', 'pistachio',
                'dark chocolate', 'honey', 'maple syrup', 'sugar',
                'coffee', 'tea', 'orange juice', 'apple juice',
            ]
            self.stdout.write(self.style.SUCCESS(f"Importing {len(popular_foods)} popular foods..."))
            imported_foods = importer.import_popular_foods(popular_foods, max_per_food=3)
        
        else:
            self.stdout.write(
                self.style.WARNING(
                    'No import method specified. Use --search, --fdc-ids, or --popular'
                )
            )
            return

        if not imported_foods:
            self.stdout.write(self.style.WARNING('No foods found to import'))
            return

        # Limit results
        imported_foods = imported_foods[:options['limit']]
        
        # Import to database
        created_count = 0
        skipped_count = 0
        error_count = 0

        self.stdout.write(self.style.SUCCESS(f'\nImporting {len(imported_foods)} foods to database...'))

        with transaction.atomic():
            for food_data in imported_foods:
                try:
                    # Check if food already exists
                    if options['skip_existing']:
                        if food_data.get('usda_fdc_id'):
                            exists = Food.objects.filter(usda_fdc_id=food_data['usda_fdc_id']).exists()
                        else:
                            exists = Food.objects.filter(
                                name=food_data['name'],
                                brand=food_data.get('brand', '')
                            ).exists()
                        
                        if exists:
                            skipped_count += 1
                            continue
                    
                    # Create food
                    food, created = Food.objects.get_or_create(
                        usda_fdc_id=food_data.get('usda_fdc_id'),
                        defaults={
                            'name': food_data['name'],
                            'brand': food_data.get('brand', ''),
                            'description': food_data.get('description', ''),
                            'data_source': food_data.get('data_source', 'usda'),
                            'calories': food_data['calories'],
                            'protein': food_data['protein'],
                            'carbs': food_data['carbs'],
                            'fat': food_data['fat'],
                            'fiber': food_data.get('fiber', 0),
                            'sugar': food_data.get('sugar'),
                            'sodium': food_data.get('sodium'),
                        }
                    )
                    
                    if created:
                        created_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'  [OK] Created: {food.name}')
                        )
                    else:
                        skipped_count += 1
                        self.stdout.write(
                            self.style.WARNING(f'  [-] Skipped (exists): {food.name}')
                        )
                
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f'  [ERROR] Error importing {food_data.get("name", "unknown")}: {e}')
                    )

        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f'\n[SUCCESS] Import complete!\n'
                f'  Created: {created_count}\n'
                f'  Skipped: {skipped_count}\n'
                f'  Errors: {error_count}'
            )
        )
