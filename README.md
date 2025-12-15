# Food Diary - AI-Powered Nutrition Tracker

A modern full-stack web application for tracking daily food intake, nutrition goals, and receiving AI-powered personalized recommendations.

## 🚀 Features

- **User Authentication**: Register, login, logout with JWT tokens
- **Google OAuth**: Sign in with Google account
- **Food Tracking**: Add meals, track calories and macronutrients (protein, carbs, fat)
- **Nutrition Goals**: Automatic calculation of BMR, TDEE, and daily calorie goals
- **AI Assistant**: Personalized meal plans and nutrition advice
- **Statistics**: Visual charts and graphs of your nutrition data
- **Weight Tracking**: Monitor your weight progress over time
- **Meal Reminders**: Browser notifications for scheduled meal times
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend**: React, Material-UI, React Router, Axios
- **Backend**: Django, Django REST Framework
- **Database**: SQLite (development)
- **Authentication**: JWT tokens, Google OAuth 2.0
- **AI**: OpenAI, Google Gemini, Anthropic Claude (with fallback)

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
```

See `backend/API_KEYS_SETUP.md` for AI setup instructions.
See `backend/GOOGLE_OAUTH_SETUP.md` for Google OAuth setup instructions.

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

- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `GET /api/auth/profile/` - Get user profile
- `GET /api/foods/` - Search foods
- `POST /api/meals/` - Create meal entry
- `GET /api/daily-summary/` - Get daily nutrition summary
- `GET /api/statistics/` - Get nutrition statistics
- `POST /api/ai/chat/` - Chat with AI assistant
- `POST /api/ai/generate-meal-plan/` - Generate personalized meal plan

## 📝 License

This project is for educational purposes.

