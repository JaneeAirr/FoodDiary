"""
Management command to bulk import foods from predefined lists
Includes common foods with accurate nutrition data
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Food


class Command(BaseCommand):
    help = 'Bulk import common foods with accurate nutrition data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--category',
            type=str,
            choices=['all', 'proteins', 'carbs', 'vegetables', 'fruits', 'dairy', 'nuts', 'grains'],
            default='all',
            help='Category of foods to import',
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip foods that already exist',
        )

    def handle(self, *args, **options):
        # Comprehensive food database with accurate nutrition data (per 100g)
        foods_database = {
            'proteins': [
                {'name': 'Chicken Breast (cooked)', 'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 3.6, 'fiber': 0},
                {'name': 'Chicken Thigh (cooked)', 'calories': 209, 'protein': 26, 'carbs': 0, 'fat': 10.9, 'fiber': 0},
                {'name': 'Salmon (cooked)', 'calories': 208, 'protein': 20, 'carbs': 0, 'fat': 12, 'fiber': 0},
                {'name': 'Tuna (canned in water)', 'calories': 116, 'protein': 26, 'carbs': 0, 'fat': 0.8, 'fiber': 0},
                {'name': 'Cod (cooked)', 'calories': 82, 'protein': 18, 'carbs': 0, 'fat': 0.7, 'fiber': 0},
                {'name': 'Shrimp (cooked)', 'calories': 99, 'protein': 24, 'carbs': 0.2, 'fat': 0.3, 'fiber': 0},
                {'name': 'Eggs (whole)', 'calories': 155, 'protein': 13, 'carbs': 1.1, 'fat': 11, 'fiber': 0},
                {'name': 'Egg Whites', 'calories': 52, 'protein': 11, 'carbs': 0.7, 'fat': 0.2, 'fiber': 0},
                {'name': 'Ground Beef (80/20, cooked)', 'calories': 250, 'protein': 25, 'carbs': 0, 'fat': 17, 'fiber': 0},
                {'name': 'Ground Turkey (cooked)', 'calories': 189, 'protein': 27, 'carbs': 0, 'fat': 8, 'fiber': 0},
                {'name': 'Pork Tenderloin (cooked)', 'calories': 143, 'protein': 26, 'carbs': 0, 'fat': 3.5, 'fiber': 0},
                {'name': 'Lamb (cooked)', 'calories': 294, 'protein': 25, 'carbs': 0, 'fat': 21, 'fiber': 0},
                {'name': 'Turkey Breast (cooked)', 'calories': 135, 'protein': 30, 'carbs': 0, 'fat': 1, 'fiber': 0},
                {'name': 'Duck (cooked)', 'calories': 337, 'protein': 19, 'carbs': 0, 'fat': 28, 'fiber': 0},
                {'name': 'Beef Steak (sirloin, cooked)', 'calories': 250, 'protein': 26, 'carbs': 0, 'fat': 15, 'fiber': 0},
            ],
            'carbs': [
                {'name': 'White Rice (cooked)', 'calories': 130, 'protein': 2.7, 'carbs': 28, 'fat': 0.3, 'fiber': 0.4},
                {'name': 'Brown Rice (cooked)', 'calories': 111, 'protein': 2.6, 'carbs': 23, 'fat': 0.9, 'fiber': 1.8},
                {'name': 'Quinoa (cooked)', 'calories': 120, 'protein': 4.4, 'carbs': 22, 'fat': 1.9, 'fiber': 2.8},
                {'name': 'Oats (dry)', 'calories': 389, 'protein': 17, 'carbs': 66, 'fat': 7, 'fiber': 11},
                {'name': 'Oatmeal (cooked)', 'calories': 68, 'protein': 2.4, 'carbs': 12, 'fat': 1.4, 'fiber': 1.7},
                {'name': 'Pasta (cooked)', 'calories': 131, 'protein': 5, 'carbs': 25, 'fat': 1.1, 'fiber': 1.8},
                {'name': 'Whole Wheat Pasta (cooked)', 'calories': 124, 'protein': 5.5, 'carbs': 25, 'fat': 1.1, 'fiber': 3.2},
                {'name': 'Potato (baked)', 'calories': 93, 'protein': 2.5, 'carbs': 21, 'fat': 0.1, 'fiber': 2.2},
                {'name': 'Sweet Potato (baked)', 'calories': 90, 'protein': 2, 'carbs': 21, 'fat': 0.2, 'fiber': 3.3},
                {'name': 'White Bread', 'calories': 265, 'protein': 9, 'carbs': 49, 'fat': 3.2, 'fiber': 2.7},
                {'name': 'Whole Wheat Bread', 'calories': 247, 'protein': 13, 'carbs': 41, 'fat': 4.2, 'fiber': 7},
                {'name': 'Bagel', 'calories': 257, 'protein': 10, 'carbs': 50, 'fat': 1.7, 'fiber': 2.3},
                {'name': 'Tortilla (flour)', 'calories': 298, 'protein': 7.3, 'carbs': 49, 'fat': 7.4, 'fiber': 2.7},
                {'name': 'Barley (cooked)', 'calories': 123, 'protein': 2.3, 'carbs': 28, 'fat': 0.4, 'fiber': 3.8},
                {'name': 'Buckwheat (cooked)', 'calories': 92, 'protein': 3.4, 'carbs': 20, 'fat': 0.6, 'fiber': 2.7},
            ],
            'vegetables': [
                {'name': 'Broccoli (raw)', 'calories': 34, 'protein': 2.8, 'carbs': 7, 'fat': 0.4, 'fiber': 2.6},
                {'name': 'Spinach (raw)', 'calories': 23, 'protein': 2.9, 'carbs': 3.6, 'fat': 0.4, 'fiber': 2.2},
                {'name': 'Kale (raw)', 'calories': 49, 'protein': 4.3, 'carbs': 9, 'fat': 0.9, 'fiber': 2},
                {'name': 'Carrot (raw)', 'calories': 41, 'protein': 0.9, 'carbs': 10, 'fat': 0.2, 'fiber': 2.8},
                {'name': 'Tomato (raw)', 'calories': 18, 'protein': 0.9, 'carbs': 3.9, 'fat': 0.2, 'fiber': 1.2},
                {'name': 'Cucumber (raw)', 'calories': 16, 'protein': 0.7, 'carbs': 4, 'fat': 0.1, 'fiber': 0.5},
                {'name': 'Bell Pepper (red, raw)', 'calories': 31, 'protein': 1, 'carbs': 7, 'fat': 0.3, 'fiber': 2.5},
                {'name': 'Onion (raw)', 'calories': 40, 'protein': 1.1, 'carbs': 9, 'fat': 0.1, 'fiber': 1.7},
                {'name': 'Garlic (raw)', 'calories': 149, 'protein': 6.4, 'carbs': 33, 'fat': 0.5, 'fiber': 2.1},
                {'name': 'Zucchini (raw)', 'calories': 17, 'protein': 1.2, 'carbs': 3.1, 'fat': 0.3, 'fiber': 1},
                {'name': 'Cauliflower (raw)', 'calories': 25, 'protein': 1.9, 'carbs': 5, 'fat': 0.3, 'fiber': 2},
                {'name': 'Cabbage (raw)', 'calories': 25, 'protein': 1.3, 'carbs': 6, 'fat': 0.1, 'fiber': 2.5},
                {'name': 'Asparagus (raw)', 'calories': 20, 'protein': 2.2, 'carbs': 4, 'fat': 0.1, 'fiber': 2.1},
                {'name': 'Green Beans (raw)', 'calories': 31, 'protein': 1.8, 'carbs': 7, 'fat': 0.2, 'fiber': 2.7},
                {'name': 'Mushrooms (raw)', 'calories': 22, 'protein': 3.1, 'carbs': 3.3, 'fat': 0.3, 'fiber': 1},
                {'name': 'Lettuce (romaine, raw)', 'calories': 17, 'protein': 1.2, 'carbs': 3.3, 'fat': 0.3, 'fiber': 2.1},
                {'name': 'Celery (raw)', 'calories': 16, 'protein': 0.7, 'carbs': 3, 'fat': 0.2, 'fiber': 1.6},
                {'name': 'Radish (raw)', 'calories': 16, 'protein': 0.7, 'carbs': 3.4, 'fat': 0.1, 'fiber': 1.6},
            ],
            'fruits': [
                {'name': 'Apple (raw)', 'calories': 52, 'protein': 0.3, 'carbs': 14, 'fat': 0.2, 'fiber': 2.4},
                {'name': 'Banana (raw)', 'calories': 89, 'protein': 1.1, 'carbs': 23, 'fat': 0.3, 'fiber': 2.6},
                {'name': 'Orange (raw)', 'calories': 47, 'protein': 0.9, 'carbs': 12, 'fat': 0.1, 'fiber': 2.4},
                {'name': 'Strawberry (raw)', 'calories': 32, 'protein': 0.7, 'carbs': 8, 'fat': 0.3, 'fiber': 2},
                {'name': 'Blueberry (raw)', 'calories': 57, 'protein': 0.7, 'carbs': 14, 'fat': 0.3, 'fiber': 2.4},
                {'name': 'Grapes (raw)', 'calories': 69, 'protein': 0.7, 'carbs': 18, 'fat': 0.2, 'fiber': 0.9},
                {'name': 'Watermelon (raw)', 'calories': 30, 'protein': 0.6, 'carbs': 8, 'fat': 0.2, 'fiber': 0.4},
                {'name': 'Pineapple (raw)', 'calories': 50, 'protein': 0.5, 'carbs': 13, 'fat': 0.1, 'fiber': 1.4},
                {'name': 'Mango (raw)', 'calories': 60, 'protein': 0.8, 'carbs': 15, 'fat': 0.4, 'fiber': 1.6},
                {'name': 'Peach (raw)', 'calories': 39, 'protein': 0.9, 'carbs': 10, 'fat': 0.3, 'fiber': 1.5},
                {'name': 'Pear (raw)', 'calories': 57, 'protein': 0.4, 'carbs': 15, 'fat': 0.1, 'fiber': 3.1},
                {'name': 'Kiwi (raw)', 'calories': 61, 'protein': 1.1, 'carbs': 15, 'fat': 0.5, 'fiber': 3},
                {'name': 'Avocado (raw)', 'calories': 160, 'protein': 2, 'carbs': 9, 'fat': 15, 'fiber': 7},
                {'name': 'Cherry (raw)', 'calories': 63, 'protein': 1, 'carbs': 16, 'fat': 0.2, 'fiber': 2.1},
                {'name': 'Raspberry (raw)', 'calories': 52, 'protein': 1.2, 'carbs': 12, 'fat': 0.7, 'fiber': 6.5},
            ],
            'dairy': [
                {'name': 'Whole Milk', 'calories': 61, 'protein': 3.2, 'carbs': 4.8, 'fat': 3.3, 'fiber': 0},
                {'name': 'Skim Milk', 'calories': 34, 'protein': 3.4, 'carbs': 5, 'fat': 0.1, 'fiber': 0},
                {'name': 'Greek Yogurt (plain)', 'calories': 59, 'protein': 10, 'carbs': 3.6, 'fat': 0.4, 'fiber': 0},
                {'name': 'Regular Yogurt (plain)', 'calories': 59, 'protein': 10, 'carbs': 3.6, 'fat': 0.4, 'fiber': 0},
                {'name': 'Cottage Cheese (low fat)', 'calories': 72, 'protein': 12, 'carbs': 2.7, 'fat': 1, 'fiber': 0},
                {'name': 'Cheddar Cheese', 'calories': 402, 'protein': 25, 'carbs': 1.3, 'fat': 33, 'fiber': 0},
                {'name': 'Mozzarella Cheese', 'calories': 300, 'protein': 22, 'carbs': 2.2, 'fat': 22, 'fiber': 0},
                {'name': 'Feta Cheese', 'calories': 264, 'protein': 14, 'carbs': 4, 'fat': 21, 'fiber': 0},
                {'name': 'Butter', 'calories': 717, 'protein': 0.9, 'carbs': 0.1, 'fat': 81, 'fiber': 0},
                {'name': 'Sour Cream', 'calories': 198, 'protein': 2.3, 'carbs': 4.6, 'fat': 19, 'fiber': 0},
            ],
            'nuts': [
                {'name': 'Almonds (raw)', 'calories': 579, 'protein': 21, 'carbs': 22, 'fat': 50, 'fiber': 12},
                {'name': 'Walnuts (raw)', 'calories': 654, 'protein': 15, 'carbs': 14, 'fat': 65, 'fiber': 6.7},
                {'name': 'Peanuts (raw)', 'calories': 567, 'protein': 26, 'carbs': 16, 'fat': 49, 'fiber': 8.5},
                {'name': 'Cashews (raw)', 'calories': 553, 'protein': 18, 'carbs': 30, 'fat': 44, 'fiber': 3.3},
                {'name': 'Pistachios (raw)', 'calories': 560, 'protein': 20, 'carbs': 27, 'fat': 45, 'fiber': 10.6},
                {'name': 'Hazelnuts (raw)', 'calories': 628, 'protein': 15, 'carbs': 17, 'fat': 61, 'fiber': 10},
                {'name': 'Pecans (raw)', 'calories': 691, 'protein': 9, 'carbs': 14, 'fat': 72, 'fiber': 9.6},
                {'name': 'Macadamia Nuts (raw)', 'calories': 718, 'protein': 8, 'carbs': 14, 'fat': 76, 'fiber': 8.6},
                {'name': 'Peanut Butter (smooth)', 'calories': 588, 'protein': 25, 'carbs': 20, 'fat': 50, 'fiber': 6},
                {'name': 'Almond Butter', 'calories': 614, 'protein': 21, 'carbs': 19, 'fat': 56, 'fiber': 10},
            ],
            'grains': [
                {'name': 'Lentils (cooked)', 'calories': 116, 'protein': 9, 'carbs': 20, 'fat': 0.4, 'fiber': 7.9},
                {'name': 'Black Beans (cooked)', 'calories': 132, 'protein': 9, 'carbs': 24, 'fat': 0.5, 'fiber': 8.7},
                {'name': 'Chickpeas (cooked)', 'calories': 164, 'protein': 9, 'carbs': 27, 'fat': 2.6, 'fiber': 7.6},
                {'name': 'Kidney Beans (cooked)', 'calories': 127, 'protein': 9, 'carbs': 23, 'fat': 0.5, 'fiber': 6.4},
                {'name': 'Pinto Beans (cooked)', 'calories': 143, 'protein': 9, 'carbs': 26, 'fat': 0.7, 'fiber': 9},
                {'name': 'Navy Beans (cooked)', 'calories': 140, 'protein': 8, 'carbs': 26, 'fat': 0.6, 'fiber': 10.5},
            ],
        }

        category = options['category']
        foods_to_import = []

        if category == 'all':
            for cat_foods in foods_database.values():
                foods_to_import.extend(cat_foods)
        else:
            foods_to_import = foods_database.get(category, [])

        if not foods_to_import:
            self.stdout.write(self.style.WARNING(f'No foods found for category: {category}'))
            return

        self.stdout.write(self.style.SUCCESS(f'Importing {len(foods_to_import)} foods from category: {category}'))

        created_count = 0
        skipped_count = 0

        with transaction.atomic():
            for food_data in foods_to_import:
                try:
                    if options['skip_existing']:
                        exists = Food.objects.filter(name=food_data['name']).exists()
                        if exists:
                            skipped_count += 1
                            continue

                    food, created = Food.objects.get_or_create(
                        name=food_data['name'],
                        defaults={
                            'brand': '',
                            'description': '',
                            'data_source': 'manual',
                            'calories': food_data['calories'],
                            'protein': food_data['protein'],
                            'carbs': food_data['carbs'],
                            'fat': food_data['fat'],
                            'fiber': food_data.get('fiber', 0),
                        }
                    )

                    if created:
                        created_count += 1
                        self.stdout.write(self.style.SUCCESS(f'  [OK] Created: {food.name}'))
                    else:
                        skipped_count += 1
                        self.stdout.write(self.style.WARNING(f'  [-] Skipped (exists): {food.name}'))

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  [ERROR] Error: {food_data.get("name")}: {e}'))

        self.stdout.write(
            self.style.SUCCESS(
                f'\n[SUCCESS] Import complete!\n'
                f'  Created: {created_count}\n'
                f'  Skipped: {skipped_count}'
            )
        )
