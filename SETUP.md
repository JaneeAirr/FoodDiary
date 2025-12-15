# Setup Guide - Interactive Food Diary

## Prerequisites

- Python 3.8+ installed
- Node.js 14+ and npm installed
- Git (optional)

## Backend Setup (Django)

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create superuser (optional, for admin access):**
   ```bash
   python manage.py createsuperuser
   ```

6. **Run development server:**
   ```bash
   python manage.py runserver
   ```
   Backend will be available at `http://localhost:8000`

## Frontend Setup (React)

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm start
   ```
   Frontend will be available at `http://localhost:3000`

## Initial Data (Optional)

To populate the food database with sample data, you can:

1. Use Django admin at `http://localhost:8000/admin/`
2. Create foods via API endpoints
3. Add sample data through Django shell:
   ```bash
   python manage.py shell
   ```
   Then create Food objects programmatically

## Testing the Application

1. **Register a new user:**
   - Go to `http://localhost:3000/register`
   - Fill in the registration form

2. **Login:**
   - Use your credentials at `http://localhost:3000/login`

3. **Set nutrition goals:**
   - Navigate to Profile page
   - Set your daily calorie and macro goals

4. **Add foods to database:**
   - Go to Foods page
   - Use Django admin or API to add food items

5. **Log meals:**
   - Go to Diary page
   - Click "Add Meal"
   - Select food, meal type, and quantity

6. **View statistics:**
   - Check Dashboard for daily summary
   - View Statistics page for charts and trends

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login
- `GET /api/auth/profile/` - Get user profile
- `PUT /api/auth/profile/update/` - Update profile

### Foods
- `GET /api/foods/` - List foods (supports ?search=query)
- `GET /api/foods/{id}/` - Get food details

### Meals
- `GET /api/meals/` - List meals (supports ?date=YYYY-MM-DD)
- `POST /api/meals/` - Create meal entry
- `GET /api/meals/{id}/` - Get meal details
- `PUT /api/meals/{id}/` - Update meal
- `DELETE /api/meals/{id}/` - Delete meal

### Statistics
- `GET /api/daily-summary/?date=YYYY-MM-DD` - Get daily nutrition summary
- `GET /api/statistics/?days=7` - Get nutrition statistics over time

### Goals
- `GET /api/goals/my_goals/` - Get user's nutrition goals
- `PUT /api/goals/my_goals/` - Update goals
- `POST /api/goals/` - Create goals

## Troubleshooting

### Backend Issues
- **Port 8000 already in use:** Change port with `python manage.py runserver 8001`
- **Migration errors:** Run `python manage.py makemigrations` then `migrate`
- **CORS errors:** Ensure `corsheaders` is in INSTALLED_APPS and CORS settings are correct

### Frontend Issues
- **Port 3000 already in use:** React will prompt to use another port
- **API connection errors:** Check backend is running and CORS is configured
- **Module not found:** Run `npm install` again

## Production Considerations

Before deploying:
1. Change `SECRET_KEY` in `settings.py`
2. Set `DEBUG = False`
3. Configure proper database (PostgreSQL recommended)
4. Set up proper CORS origins
5. Use environment variables for sensitive data
6. Set up static file serving
7. Configure HTTPS
8. Set up proper logging

