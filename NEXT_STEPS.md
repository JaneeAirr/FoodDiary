# Следующие шаги для завершения проекта

## ✅ Выполнено

1. **Обновлен дизайн:**
   - Темная тема (Material-UI dark mode)
   - Сайдбар навигации вместо навбара
   - Обновлена страница Settings & Goals с табами
   - Обновлена страница Login с кнопкой Google

2. **Расширены модели:**
   - Добавлены поля в User: gender, goal, allergies, dietary_restrictions, display_name, dietary_preference, theme_preference
   - Создана модель PsychFoodProfile для психо-пищевого профиля

3. **Создана структура ИИ:**
   - Модуль `backend/ai/` с сервисами
   - API endpoints для ИИ функций
   - Интеграция с OpenAI (с fallback на mock данные)

## ⏳ Требуется выполнить

### 1. Установить зависимости

```bash
cd backend
pip install -r requirements.txt
```

### 2. Создать миграции и применить

```bash
python manage.py makemigrations users
python manage.py migrate
```

### 3. Настроить Google OAuth

1. Создать проект в Google Cloud Console
2. Включить Google+ API
3. Создать OAuth 2.0 credentials
4. Добавить в `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

5. Установить `django-allauth`:
   ```bash
   pip install django-allauth
   ```

6. Настроить в `settings.py` (см. документацию django-allauth)

### 4. Настроить OpenAI API (опционально)

1. Получить API ключ на https://platform.openai.com/
2. Добавить в `.env`:
   ```
   OPENAI_API_KEY=your_api_key
   ```

Без ключа ИИ функции будут работать с mock данными.

### 5. Обновить frontend для ИИ функций

Создать компоненты:
- `AIRecommendations.js` - отображение ИИ рекомендаций
- `AIAnalysis.js` - поведенческий анализ
- `MealPlanGenerator.js` - генератор плана питания
- `TextMealInput.js` - ввод еды через текст
- `ImageMealInput.js` - ввод еды через фото

### 6. Добавить психо-пищевой опросник

Создать страницу `/onboarding` с вопросами:
- Переедание вечером?
- Сладкое как стресс?
- Нерегулярное питание?

### 7. Расширить аналитику

Добавить:
- Индекс пищевой дисциплины
- Индекс баланса БЖУ
- Индекс устойчивости привычек
- График вес vs калории

### 8. Добавить уведомления

Использовать Web Push API или email уведомления.

### 9. Реализовать экспорт

- PDF отчеты (использовать библиотеку reportlab или weasyprint)
- Экспорт в CSV/JSON

## Быстрый старт для тестирования

1. **Запустить backend:**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Запустить frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Протестировать ИИ функции:**
   - Без OpenAI API ключа будут работать mock данные
   - С ключом - реальные ИИ рекомендации

## API Endpoints для ИИ

- `POST /api/ai/analyze-behavior/` - Анализ поведения
- `POST /api/ai/recommendations/` - Получить рекомендации
- `POST /api/ai/parse-meal-text/` - Распознать еду из текста
- `POST /api/ai/generate-meal-plan/` - Генерация плана питания

## Примечания

- Все ИИ функции имеют fallback на mock данные, если API недоступно
- Google OAuth требует настройки в Google Cloud Console
- OpenAI API платный, но есть бесплатный tier для тестирования

