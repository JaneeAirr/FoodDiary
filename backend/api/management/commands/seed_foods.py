"""
Management command to seed the database with sample food data
"""
from django.core.management.base import BaseCommand
from api.models import Food


class Command(BaseCommand):
    help = 'Seeds the database with sample food items'

    def handle(self, *args, **options):
        foods_data = [
            {
                'name': 'Chicken Breast',
                'brand': '',
                'calories': 165,
                'protein': 31,
                'carbs': 0,
                'fat': 3.6,
                'fiber': 0,
            },
            {
                'name': 'Brown Rice',
                'brand': '',
                'calories': 111,
                'protein': 2.6,
                'carbs': 23,
                'fat': 0.9,
                'fiber': 1.8,
            },
            {
                'name': 'Broccoli',
                'brand': '',
                'calories': 34,
                'protein': 2.8,
                'carbs': 7,
                'fat': 0.4,
                'fiber': 2.6,
            },
            {
                'name': 'Salmon',
                'brand': '',
                'calories': 208,
                'protein': 20,
                'carbs': 0,
                'fat': 12,
                'fiber': 0,
            },
            {
                'name': 'Sweet Potato',
                'brand': '',
                'calories': 86,
                'protein': 1.6,
                'carbs': 20,
                'fat': 0.1,
                'fiber': 3,
            },
            {
                'name': 'Eggs',
                'brand': '',
                'calories': 155,
                'protein': 13,
                'carbs': 1.1,
                'fat': 11,
                'fiber': 0,
            },
            {
                'name': 'Oatmeal',
                'brand': '',
                'calories': 68,
                'protein': 2.4,
                'carbs': 12,
                'fat': 1.4,
                'fiber': 1.7,
            },
            {
                'name': 'Banana',
                'brand': '',
                'calories': 89,
                'protein': 1.1,
                'carbs': 23,
                'fat': 0.3,
                'fiber': 2.6,
            },
            {
                'name': 'Greek Yogurt',
                'brand': '',
                'calories': 59,
                'protein': 10,
                'carbs': 3.6,
                'fat': 0.4,
                'fiber': 0,
            },
            {
                'name': 'Almonds',
                'brand': '',
                'calories': 579,
                'protein': 21,
                'carbs': 22,
                'fat': 50,
                'fiber': 12,
            },
            {
                'name': 'Whole Wheat Bread',
                'brand': '',
                'calories': 247,
                'protein': 13,
                'carbs': 41,
                'fat': 4.2,
                'fiber': 7,
            },
            {
                'name': 'Avocado',
                'brand': '',
                'calories': 160,
                'protein': 2,
                'carbs': 9,
                'fat': 15,
                'fiber': 7,
            },
            {
                'name': 'Spinach',
                'brand': '',
                'calories': 23,
                'protein': 2.9,
                'carbs': 3.6,
                'fat': 0.4,
                'fiber': 2.2,
            },
            {
                'name': 'Apple',
                'brand': '',
                'calories': 52,
                'protein': 0.3,
                'carbs': 14,
                'fat': 0.2,
                'fiber': 2.4,
            },
            {
                'name': 'Quinoa',
                'brand': '',
                'calories': 120,
                'protein': 4.4,
                'carbs': 22,
                'fat': 1.9,
                'fiber': 2.8,
            },
        ]

        created_count = 0
        skipped_count = 0

        for food_data in foods_data:
            food, created = Food.objects.get_or_create(
                name=food_data['name'],
                defaults=food_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created: {food.name}')
                )
            else:
                skipped_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Skipped (already exists): {food.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSeeding complete! Created: {created_count}, Skipped: {skipped_count}'
            )
        )

