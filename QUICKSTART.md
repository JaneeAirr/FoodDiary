# Quick Start Guide

## ✅ Setup Complete!

Your Interactive Food Diary project is ready to run. Here's what has been set up:

### Backend (Django)
- ✅ Virtual environment created
- ✅ Dependencies installed
- ✅ Database migrations applied
- ✅ Sample food data seeded (15 foods)

### Frontend (React)
- ✅ Dependencies installed
- ✅ All components and pages created

## 🚀 Running the Application

### Start Backend Server

Open a terminal and run:

```bash
cd backend
.\venv\Scripts\Activate.ps1
python manage.py runserver
```

Backend will be available at: **http://localhost:8000**

### Start Frontend Server

Open another terminal and run:

```bash
cd frontend
npm start
```

Frontend will be available at: **http://localhost:3000**

## 📝 First Steps

1. **Register a new account:**
   - Go to http://localhost:3000/register
   - Create your user account

2. **Set your nutrition goals:**
   - After login, go to Profile page
   - Set your daily calorie and macro goals

3. **Start logging meals:**
   - Go to Diary page
   - Click "Add Meal"
   - Select from the 15 pre-loaded foods
   - Enter quantity and meal type

4. **View your dashboard:**
   - Check daily nutrition summary
   - See progress toward your goals

5. **Explore statistics:**
   - View charts showing your nutrition trends
   - Track calories and macros over time

## 🍎 Available Foods

The database has been pre-populated with 15 common foods:
- Chicken Breast, Salmon, Eggs
- Brown Rice, Quinoa, Oatmeal
- Broccoli, Spinach, Sweet Potato
- Banana, Apple, Avocado
- Greek Yogurt, Almonds, Whole Wheat Bread

## 🔧 Useful Commands

### Backend
```bash
# Create superuser (for admin access)
python manage.py createsuperuser

# Add more foods
python manage.py seed_foods

# Access Django admin
# http://localhost:8000/admin/
```

### Frontend
```bash
# Build for production
npm run build
```

## 📚 API Endpoints

- `POST /api/auth/register/` - Register
- `POST /api/auth/login/` - Login
- `GET /api/foods/` - List foods
- `GET /api/meals/` - List meals
- `POST /api/meals/` - Create meal
- `GET /api/daily-summary/` - Daily summary
- `GET /api/statistics/` - Statistics

## 🎯 Project Features

✅ User authentication (JWT)
✅ Food database with search
✅ Meal logging (breakfast, lunch, dinner, snack)
✅ Real-time nutrition calculations
✅ Goal tracking
✅ Data visualization (charts)
✅ Responsive design

Enjoy your Food Diary application! 🎉

