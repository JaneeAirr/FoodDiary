# Food Diary - AI-Powered Nutrition Tracker

A modern full-stack web application for tracking daily food intake, nutrition goals, and receiving AI-powered personalized recommendations.

## 🚀 Features

- **User Authentication**: Register, login, logout with JWT tokens
- **Google OAuth**: Sign in with Google account
- **Food Tracking**: Add meals, track calories and macronutrients (protein, carbs, fat)
- **Custom Recipes**: Create and manage custom recipes with ingredient search from full database
- **Nutrition Goals**: Automatic calculation of BMR, TDEE, and daily calorie goals
- **AI Assistant**: Personalized meal plans and nutrition advice
- **Intermittent Fasting**: Track fasting sessions with multiple protocols (16:8, 18:6, 20:4, 24:0, custom)
- **Water Tracking**: Monitor daily water intake with customizable goals
- **Statistics**: Visual charts and graphs of your nutrition data
- **Weight Tracking**: Monitor your weight progress over time
- **Meal Reminders**: Browser notifications for scheduled meal times
- **USDA Food Database**: Search and import foods from USDA FoodData Central
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend**: React, Material-UI, React Router, Axios
- **Backend**: Django, Django REST Framework
- **Database**: SQLite (development)
- **Authentication**: JWT tokens, Google OAuth 2.0
- **AI**: OpenAI, Google Gemini, Anthropic Claude (with fallback)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ExamWebProject
   ```

2. **Set up Backend**
   ```bash
   cd backend
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```
   Backend will run on `http://localhost:8000`

3. **Set up Frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm start
   ```
   Frontend will run on `http://localhost:3000`

4. **Populate Food Database** (optional but recommended)
   ```bash
   cd backend
   python manage.py import_foods_bulk --category all
   ```

5. **Create a user account** via the registration page and start tracking!

## 📦 Installation

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm or yarn

### Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app will be available at `http://localhost:3000`

### Populate Food Database

Import foods from public databases:

```bash
# Quick import (200+ popular foods, no API key needed)
cd backend
python manage.py import_foods_bulk --category all

# Or import from USDA FoodData Central (requires API key)
python manage.py import_usda_foods --popular --limit 100
```

See `backend/FOOD_DATABASE_IMPORT.md` for detailed instructions.

## ⚙️ Configuration

### Environment Variables

Create `backend/.env` file:

```env
# AI API Keys (optional - at least one recommended)
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Google OAuth (optional)
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/google/callback/

# USDA FoodData Central API (optional - for food database expansion)
USDA_API_KEY=your_usda_api_key
```

See `backend/API_KEYS_SETUP.md` for AI setup instructions.
See `backend/GOOGLE_OAUTH_SETUP.md` for Google OAuth setup instructions.
See `backend/FOOD_DATABASE_IMPORT.md` for food database import instructions.

## 📚 Project Structure

```
ExamWebProject/
├── backend/              # Django backend
│   ├── api/              # REST API endpoints
│   ├── users/            # User authentication
│   ├── ai/               # AI services
│   └── food_diary/       # Django settings
├── frontend/             # React frontend
│   └── src/
│       ├── components/   # Reusable components
│       ├── pages/        # Page components
│       ├── services/     # API services
│       └── store/        # State management
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `GET /api/auth/profile/` - Get user profile
- `PUT /api/auth/profile/update/` - Update user profile

### Foods & Recipes
- `GET /api/foods/` - List foods with search
- `GET /api/foods/search/` - Advanced food search (includes USDA database)
- `GET /api/recipes/` - List user recipes
- `POST /api/recipes/` - Create recipe
- `PUT /api/recipes/{id}/` - Update recipe
- `DELETE /api/recipes/{id}/` - Delete recipe

### Meals & Nutrition
- `GET /api/meals/` - List meals (filter by date)
- `POST /api/meals/` - Create meal entry
- `GET /api/daily-summary/` - Get daily nutrition summary
- `GET /api/statistics/` - Get nutrition statistics
- `POST /api/calculate-nutrition/` - Calculate BMR, TDEE, macros

### Water Tracking
- `GET /api/water/today/` - Get today's water intake
- `POST /api/water/` - Add water intake entry
- `GET /api/water-settings/my_settings/` - Get water settings
- `PUT /api/water-settings/my_settings/` - Update water settings

### Intermittent Fasting
- `GET /api/fasting/` - List fasting sessions
- `POST /api/fasting/start/` - Start fasting session
- `POST /api/fasting/{id}/end/` - End fasting session
- `GET /api/fasting/active/` - Get active fasting session
- `GET /api/fasting-settings/my_settings/` - Get fasting settings
- `PUT /api/fasting-settings/my_settings/` - Update fasting settings

### AI Assistant
- `POST /api/ai/chat/` - Chat with AI assistant
- `POST /api/ai/generate-meal-plan/` - Generate personalized meal plan
- `GET /api/ai/analyze-habits/` - Analyze eating habits

## 📝 License

This project is for educational purposes.

