# Исправление проблемы с отображением данных на Dashboard

## Проблема
Данные видны в Food Diary, но не отображаются на Dashboard при выборе того же дня.

## Исправления

### 1. Backend - MealViewSet
**Проблема**: Фильтрация по дате использовала строку напрямую, что могло приводить к несоответствиям.

**Исправление**: Добавлено преобразование строки даты в объект date:
```python
if date_param:
    try:
        if isinstance(date_param, str):
            date_obj = date.fromisoformat(date_param)
        else:
            date_obj = date_param
        queryset = queryset.filter(date=date_obj)
    except (ValueError, TypeError):
        pass
```

### 2. Backend - MealSerializer
**Добавлено**: Валидация даты при создании/обновлении meal:
```python
def validate_date(self, value):
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            raise serializers.ValidationError("Invalid date format. Use YYYY-MM-DD.")
    return value
```

### 3. Frontend - Логирование
**Добавлено**: Детальное логирование для отладки:
- В Dashboard: логирование запроса и ответа API
- В Diary: логирование при сохранении и получении meals

## Как проверить

1. **Откройте консоль браузера** (F12)
2. **Добавьте meal в Diary** - проверьте логи:
   - `Saving meal with data:` - должна быть правильная дата
   - `Meal created:` - должен быть успешный ответ
3. **Перейдите на Dashboard** - проверьте логи:
   - `Fetching summary for date:` - должна быть та же дата
   - `Dashboard API response:` - должны быть meals в ответе
   - `Meals count:` - должно быть > 0

## Если проблема сохраняется

1. Проверьте формат даты в консоли - должен быть `YYYY-MM-DD`
2. Убедитесь, что дата одинаковая в Diary и Dashboard
3. Проверьте Network tab в DevTools - посмотрите реальные запросы к API
4. Проверьте ответ API - должны быть meals в `response.data.meals`

## Дополнительная проверка

Запустите в Django shell:
```python
from api.models import Meal
from django.contrib.auth import get_user_model
from datetime import date

User = get_user_model()
user = User.objects.first()
today = date.today()

meals = Meal.objects.filter(user=user, date=today)
print(f"Meals for {today}: {meals.count()}")
for meal in meals:
    print(f"  - {meal.food.name} ({meal.quantity}g) on {meal.date}")
```


