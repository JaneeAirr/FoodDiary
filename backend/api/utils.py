"""
Utility functions for nutrition calculations
"""
from datetime import date
from typing import Optional, Dict


def calculate_bmr(weight: float, height: float, age: int, gender: str) -> float:
    """
    Calculate Basal Metabolic Rate (BMR) using Harris-Benedict equation
    
    Args:
        weight: Weight in kg
        height: Height in cm
        age: Age in years
        gender: 'M', 'F', or 'Other'
    
    Returns:
        BMR in calories per day
    """
    if gender == 'M':
        # Male: BMR = 88.362 + (13.397 × weight) + (4.799 × height) - (5.677 × age)
        bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    elif gender == 'F':
        # Female: BMR = 447.593 + (9.247 × weight) + (3.098 × height) - (4.330 × age)
        bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
    else:
        # For 'Other', use average of male and female formulas
        bmr_male = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
        bmr_female = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
        bmr = (bmr_male + bmr_female) / 2
    
    return round(bmr, 2)


def get_activity_multiplier(activity_level: str) -> float:
    """
    Get activity multiplier for TDEE calculation
    
    Args:
        activity_level: Activity level string
    
    Returns:
        Multiplier value
    """
    multipliers = {
        'sedentary': 1.2,          # Little or no exercise
        'light': 1.375,             # Light exercise 1-3 days/week
        'moderate': 1.55,           # Moderate exercise 3-5 days/week
        'active': 1.725,            # Hard exercise 6-7 days/week
        'very_active': 1.9,         # Very hard exercise, physical job
    }
    return multipliers.get(activity_level, 1.55)  # Default to moderate


def calculate_tdee(bmr: float, activity_level: str) -> float:
    """
    Calculate Total Daily Energy Expenditure (TDEE)
    
    Args:
        bmr: Basal Metabolic Rate
        activity_level: Activity level string
    
    Returns:
        TDEE in calories per day
    """
    multiplier = get_activity_multiplier(activity_level)
    return round(bmr * multiplier, 2)


def calculate_daily_calories(
    weight: float,
    height: float,
    age: int,
    gender: str,
    activity_level: str,
    goal: str
) -> float:
    """
    Calculate daily calorie goal based on user parameters and goal
    
    Args:
        weight: Weight in kg
        height: Height in cm
        age: Age in years
        gender: 'M', 'F', or 'Other'
        activity_level: Activity level string
        goal: 'weight_loss', 'weight_gain', or 'maintenance'
    
    Returns:
        Daily calorie goal
    """
    bmr = calculate_bmr(weight, height, age, gender)
    tdee = calculate_tdee(bmr, activity_level)
    
    if goal == 'weight_loss':
        # Deficit of 500 calories per day (approximately 0.5 kg per week)
        daily_calories = tdee - 500
    elif goal == 'weight_gain':
        # Surplus of 500 calories per day
        daily_calories = tdee + 500
    else:  # maintenance
        daily_calories = tdee
    
    return max(round(daily_calories, 2), 1200)  # Minimum 1200 calories for safety


def calculate_macros(daily_calories: float, goal: str) -> Dict[str, float]:
    """
    Calculate daily macronutrient goals
    
    Args:
        daily_calories: Daily calorie goal
        goal: 'weight_loss', 'weight_gain', or 'maintenance'
    
    Returns:
        Dictionary with protein, carbs, and fat in grams
    """
    if goal == 'weight_loss':
        # Higher protein, moderate carbs, moderate fat
        protein_percent = 0.30  # 30% of calories
        carbs_percent = 0.40     # 40% of calories
        fat_percent = 0.30       # 30% of calories
    elif goal == 'weight_gain':
        # Moderate protein, higher carbs, moderate fat
        protein_percent = 0.25   # 25% of calories
        carbs_percent = 0.45     # 45% of calories
        fat_percent = 0.30       # 30% of calories
    else:  # maintenance
        # Balanced macros
        protein_percent = 0.25   # 25% of calories
        carbs_percent = 0.45     # 45% of calories
        fat_percent = 0.30       # 30% of calories
    
    # Calculate grams (protein and carbs: 4 cal/g, fat: 9 cal/g)
    protein = round((daily_calories * protein_percent) / 4, 2)
    carbs = round((daily_calories * carbs_percent) / 4, 2)
    fat = round((daily_calories * fat_percent) / 9, 2)
    
    return {
        'protein': protein,
        'carbs': carbs,
        'fat': fat,
    }


def calculate_age_from_birthdate(birthdate: Optional[date]) -> Optional[int]:
    """
    Calculate age from birthdate
    
    Args:
        birthdate: Date of birth
    
    Returns:
        Age in years or None
    """
    if not birthdate:
        return None
    
    today = date.today()
    age = today.year - birthdate.year
    
    # Adjust if birthday hasn't occurred this year
    if (today.month, today.day) < (birthdate.month, birthdate.day):
        age -= 1
    
    return age
