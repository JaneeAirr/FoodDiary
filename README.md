# Interactive Food Diary - Web Project

A full-stack web application for tracking daily food intake, nutrition, and health goals.

## Tech Stack

- **Frontend**: React + React Router + State Management
- **Backend**: Django + Django REST Framework
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT tokens

## Project Structure

```
ExamWebProject/
├── backend/                 # Django backend
│   ├── food_diary/         # Main Django project
│   ├── api/                # REST API app
│   ├── users/              # User authentication app
│   └── manage.py
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API calls
│   │   ├── store/          # State management
│   │   └── App.js          # Main app component
│   └── package.json
└── README.md
```

## Features

### Core Functionality
- ✅ User authentication (register, login, logout)
- ✅ Food database with nutrition facts
- ✅ Daily meal entry tracking
- ✅ Nutrition calculations (calories, macros)
- ✅ Goal setting and tracking
- ✅ Data visualization (charts, graphs)
- ✅ Search and filter foods
- ✅ Calendar view of entries

### Frontend Requirements
- ✅ React components with proper structure
- ✅ React Router for navigation
- ✅ State management (Context API or Redux)
- ✅ API integration with Axios
- ✅ Responsive design

### Backend Requirements
- ✅ Django REST Framework API
- ✅ Database models (User, Food, Meal, Entry)
- ✅ CRUD operations for all entities
- ✅ JWT authentication
- ✅ JSON API responses
- ✅ Data validation

## Getting Started

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
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

## API Endpoints

- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `GET /api/foods/` - List/search foods
- `POST /api/meals/` - Create meal entry
- `GET /api/entries/` - Get daily entries
- `GET /api/stats/` - Get nutrition statistics

## Development Status

🚧 Project initialization - Ready for development

