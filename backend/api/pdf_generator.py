"""
PDF Report Generator for Nutrition Reports
"""
from io import BytesIO
from datetime import date, timedelta
from django.http import HttpResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from .models import Meal, NutritionGoal


def generate_nutrition_report(user, start_date, end_date):
    """
    Generate PDF nutrition report for a user over a date range
    
    Args:
        user: User object
        start_date: Start date (date object)
        end_date: End date (date object)
    
    Returns:
        HttpResponse with PDF content
    """
    # Register Unicode fonts that support Cyrillic
    try:
        pdfmetrics.registerFont(UnicodeCIDFont('HeiseiMin-W3'))
        font_name = 'HeiseiMin-W3'
    except:
        try:
            pdfmetrics.registerFont(UnicodeCIDFont('HeiseiKakuGo-W5'))
            font_name = 'HeiseiKakuGo-W5'
        except:
            # Fallback to standard font (may not support Cyrillic well)
            font_name = 'Helvetica'
    
    # Create buffer for PDF
    buffer = BytesIO()
    
    # Create PDF document
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=72)
    
    # Container for PDF elements
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Helper function to create Paragraph with proper encoding
    def para(text, style):
        """Create a Paragraph with proper text encoding"""
        if isinstance(text, str):
            try:
                return Paragraph(text, style)
            except:
                return Paragraph(str(text), style)
        return Paragraph(str(text), style)
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName=font_name,
        fontSize=24,
        textColor=colors.HexColor('#2E7D32'),
        spaceAfter=30,
        alignment=TA_CENTER,
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontName=font_name,
        fontSize=16,
        textColor=colors.HexColor('#1976D2'),
        spaceAfter=12,
        spaceBefore=12,
    )
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10,
    )
    
    # Title
    elements.append(para("Nutrition Report", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # User info
    user_name = user.get_full_name() or user.username
    user_info = [
        ['User:', user_name],
        ['Period:', f"{start_date.strftime('%d.%m.%Y')} - {end_date.strftime('%d.%m.%Y')}"],
        ['Created:', date.today().strftime('%d.%m.%Y')],
    ]
    
    # Convert user_info to Paragraphs for proper text rendering
    user_table_data = []
    for row in user_info:
        user_table_data.append([
            para(row[0], ParagraphStyle('Label', parent=normal_style, fontName=font_name, fontSize=10, textColor=colors.black)),
            para(row[1], ParagraphStyle('Value', parent=normal_style, fontName=font_name, fontSize=10, textColor=colors.black))
        ])
    
    user_table = Table(user_table_data, colWidths=[2*inch, 4*inch])
    user_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#E3F2FD')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
    ]))
    elements.append(user_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Get meals for the period
    meals = Meal.objects.filter(
        user=user,
        date__gte=start_date,
        date__lte=end_date
    ).select_related('food').order_by('date', 'meal_type')
    
    # Calculate daily totals
    daily_totals = {}
    for meal in meals:
        day_key = str(meal.date)
        if day_key not in daily_totals:
            daily_totals[day_key] = {
                'date': meal.date,
                'calories': 0,
                'protein': 0,
                'carbs': 0,
                'fat': 0,
                'meals': []
            }
        daily_totals[day_key]['calories'] += meal.total_calories
        daily_totals[day_key]['protein'] += meal.total_protein
        daily_totals[day_key]['carbs'] += meal.total_carbs
        daily_totals[day_key]['fat'] += meal.total_fat
        daily_totals[day_key]['meals'].append(meal)
    
    # Overall summary
    elements.append(para("Overall Statistics", heading_style))
    
    total_calories = sum(day['calories'] for day in daily_totals.values())
    total_protein = sum(day['protein'] for day in daily_totals.values())
    total_carbs = sum(day['carbs'] for day in daily_totals.values())
    total_fat = sum(day['fat'] for day in daily_totals.values())
    days_count = len(daily_totals)
    
    avg_calories = total_calories / days_count if days_count > 0 else 0
    avg_protein = total_protein / days_count if days_count > 0 else 0
    avg_carbs = total_carbs / days_count if days_count > 0 else 0
    avg_fat = total_fat / days_count if days_count > 0 else 0
    
    # Get user goals if available
    try:
        goals = NutritionGoal.objects.get(user=user)
        goal_calories = goals.daily_calories
        goal_protein = goals.daily_protein
        goal_carbs = goals.daily_carbs
        goal_fat = goals.daily_fat
    except NutritionGoal.DoesNotExist:
        goal_calories = goal_protein = goal_carbs = goal_fat = None
    
    summary_data = [
        ['Metric', 'Total', 'Daily Average', 'Daily Goal' if goal_calories else ''],
        ['Calories (kcal)', f"{total_calories:.0f}", f"{avg_calories:.0f}", 
         f"{goal_calories:.0f}" if goal_calories else '-'],
        ['Protein (g)', f"{total_protein:.1f}", f"{avg_protein:.1f}", 
         f"{goal_protein:.1f}" if goal_protein else '-'],
        ['Carbs (g)', f"{total_carbs:.1f}", f"{avg_carbs:.1f}", 
         f"{goal_carbs:.1f}" if goal_carbs else '-'],
        ['Fat (g)', f"{total_fat:.1f}", f"{avg_fat:.1f}", 
         f"{goal_fat:.1f}" if goal_fat else '-'],
    ]
    
    # Convert summary_data to Paragraphs
    summary_table_data = []
    for i, row in enumerate(summary_data):
        table_row = []
        for cell in row:
            if i == 0:  # Header row
                style = ParagraphStyle('Header', parent=normal_style, fontName=font_name, 
                                      fontSize=10, textColor=colors.whitesmoke, alignment=TA_CENTER)
            else:
                style = ParagraphStyle('Cell', parent=normal_style, fontName=font_name, 
                                      fontSize=10, textColor=colors.black, alignment=TA_CENTER)
            table_row.append(para(cell, style))
        summary_table_data.append(table_row)
    
    summary_table = Table(summary_table_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 1.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976D2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Daily breakdown
    if daily_totals:
        elements.append(para("Daily Breakdown", heading_style))
        
        # Create daily breakdown table
        daily_data = [['Date', 'Calories', 'Protein', 'Carbs', 'Fat', 'Meals']]
        
        for day_key in sorted(daily_totals.keys()):
            day = daily_totals[day_key]
            daily_data.append([
                day['date'].strftime('%d.%m.%Y'),
                f"{day['calories']:.0f}",
                f"{day['protein']:.1f}",
                f"{day['carbs']:.1f}",
                f"{day['fat']:.1f}",
                str(len(day['meals']))
            ])
        
        # Convert daily_data to Paragraphs
        daily_table_data = []
        for i, row in enumerate(daily_data):
            table_row = []
            for cell in row:
                if i == 0:  # Header row
                    style = ParagraphStyle('Header', parent=normal_style, fontName=font_name, 
                                          fontSize=9, textColor=colors.whitesmoke, alignment=TA_CENTER)
                else:
                    style = ParagraphStyle('Cell', parent=normal_style, fontName=font_name, 
                                          fontSize=9, textColor=colors.black, alignment=TA_CENTER)
                table_row.append(para(cell, style))
            daily_table_data.append(table_row)
        
        daily_table = Table(daily_table_data, colWidths=[1.2*inch, 1*inch, 0.8*inch, 0.8*inch, 0.8*inch, 1*inch])
        daily_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976D2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
        ]))
        elements.append(daily_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Detailed meals (first 3 days to avoid too long report)
        elements.append(para("Meal Details (First Days)", heading_style))
        
        meal_type_labels = {
            'breakfast': 'Breakfast',
            'lunch': 'Lunch',
            'dinner': 'Dinner',
            'snack': 'Snack',
        }
        
        days_shown = 0
        for day_key in sorted(daily_totals.keys())[:3]:  # Show first 3 days
            day = daily_totals[day_key]
            date_style = ParagraphStyle('DateStyle', parent=normal_style, fontSize=12, 
                                       textColor=colors.HexColor('#1976D2'), fontName=font_name)
            elements.append(para(
                f"<b>{day['date'].strftime('%d.%m.%Y')}</b>",
                date_style
            ))
            
            meal_data = [['Time', 'Food', 'Quantity', 'Calories', 'Protein', 'Carbs', 'Fat']]
            
            for meal in day['meals']:
                food_name = meal.food.name[:30] if meal.food.name else 'Unknown'
                meal_data.append([
                    meal_type_labels.get(meal.meal_type, meal.meal_type),
                    food_name,  # Truncate long names
                    f"{meal.quantity:.0f}g",
                    f"{meal.total_calories:.0f}",
                    f"{meal.total_protein:.1f}",
                    f"{meal.total_carbs:.1f}",
                    f"{meal.total_fat:.1f}",
                ])
            
            # Convert meal_data to Paragraphs
            meal_table_data = []
            for i, row in enumerate(meal_data):
                table_row = []
                for cell in row:
                    if i == 0:  # Header row
                        style = ParagraphStyle('Header', parent=normal_style, fontName=font_name, 
                                              fontSize=8, textColor=colors.whitesmoke, alignment=TA_CENTER)
                    else:
                        style = ParagraphStyle('Cell', parent=normal_style, fontName=font_name, 
                                              fontSize=8, textColor=colors.black, alignment=TA_CENTER)
                    table_row.append(para(cell, style))
                meal_table_data.append(table_row)
            
            meal_table = Table(meal_table_data, colWidths=[0.8*inch, 1.5*inch, 0.7*inch, 0.7*inch, 0.6*inch, 0.6*inch, 0.6*inch])
            meal_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4CAF50')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
            ]))
            elements.append(meal_table)
            elements.append(Spacer(1, 0.2*inch))
            days_shown += 1
    
    # Build PDF
    doc.build(elements)
    
    # Get PDF value from buffer
    pdf = buffer.getvalue()
    buffer.close()
    
    # Create HTTP response
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="nutrition_report_{start_date}_{end_date}.pdf"'
    response.write(pdf)
    
    return response
