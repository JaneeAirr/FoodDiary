"""
AI services for food diary analysis and recommendations
Multi-provider support with automatic fallback
"""
import os
import json
import re
from typing import Dict, List, Optional, Tuple
from decouple import config

# Try to import AI providers
OPENAI_AVAILABLE = False
GEMINI_AVAILABLE = False
ANTHROPIC_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    pass

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    pass

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    pass


class AIService:
    """Service for AI-powered food analysis with multi-provider support"""
    
    def __init__(self):
        # Initialize OpenAI
        self.openai_client = None
        openai_key = config('OPENAI_API_KEY', default=None)
        if OPENAI_AVAILABLE and openai_key:
            try:
                self.openai_client = OpenAI(api_key=openai_key)
            except:
                pass
        
        # Initialize Gemini
        self.gemini_client = None
        self.gemini_model_name = None
        gemini_key = config('GEMINI_API_KEY', default=None)
        if GEMINI_AVAILABLE and gemini_key:
            try:
                genai.configure(api_key=gemini_key)
                # Используем актуальные модели (с префиксом models/)
                model_names = [
                    'models/gemini-2.5-flash',  # Быстрая и бесплатная
                    'models/gemini-flash-latest',  # Последняя версия flash
                    'models/gemini-pro-latest',  # Последняя версия pro
                    'models/gemini-2.0-flash',  # Альтернатива
                ]
                for model_name in model_names:
                    try:
                        self.gemini_client = genai.GenerativeModel(model_name)
                        self.gemini_model_name = model_name
                        print(f"Gemini initialized with model: {model_name}")
                        break
                    except Exception as e:
                        continue
            except Exception as e:
                print(f"Gemini initialization error: {e}")
                pass
        
        # Initialize Anthropic Claude
        self.anthropic_client = None
        anthropic_key = config('ANTHROPIC_API_KEY', default=None)
        if ANTHROPIC_AVAILABLE and anthropic_key:
            try:
                self.anthropic_client = anthropic.Anthropic(api_key=anthropic_key)
            except:
                pass
        
        # Provider priority order (most stable first)
        self.providers = []
        if self.anthropic_client:
            self.providers.append('anthropic')
        if self.gemini_client:
            self.providers.append('gemini')
        if self.openai_client:
            self.providers.append('openai')
    
    def _call_ai_provider(self, prompt: str, system_message: str = None, max_retries: int = 2) -> Optional[str]:
        """
        Call AI provider with automatic fallback
        
        Args:
            prompt: User prompt
            system_message: System message (optional)
            max_retries: Maximum retries per provider
            
        Returns:
            AI response or None if all providers fail
        """
        # Try each provider in order
        for provider in self.providers:
            for attempt in range(max_retries):
                try:
                    if provider == 'anthropic' and self.anthropic_client:
                        full_prompt = prompt
                        if system_message:
                            full_prompt = f"{system_message}\n\n{prompt}"
                        
                        response = self.anthropic_client.messages.create(
                            model="claude-3-haiku-20240307",  # Fast and cheap
                            max_tokens=2000,
                            messages=[{"role": "user", "content": full_prompt}],
                            timeout=10.0,
                        )
                        return response.content[0].text
                    
                    elif provider == 'gemini' and self.gemini_client:
                        full_prompt = prompt
                        if system_message:
                            full_prompt = f"{system_message}\n\n{prompt}"
                        
                        try:
                            # Простой вызов без generation_config для совместимости
                            response = self.gemini_client.generate_content(full_prompt)
                            if hasattr(response, 'text'):
                                return response.text
                            elif hasattr(response, 'candidates') and len(response.candidates) > 0:
                                return response.candidates[0].content.parts[0].text
                            else:
                                return str(response)
                        except Exception as e:
                            # Если ошибка, пробуем без system_message
                            try:
                                response = self.gemini_client.generate_content(prompt)
                                if hasattr(response, 'text'):
                                    return response.text
                                elif hasattr(response, 'candidates') and len(response.candidates) > 0:
                                    return response.candidates[0].content.parts[0].text
                                else:
                                    return str(response)
                            except:
                                raise e
                    
                    elif provider == 'openai' and self.openai_client:
                        messages = []
                        if system_message:
                            messages.append({"role": "system", "content": system_message})
                        messages.append({"role": "user", "content": prompt})
                        
                        response = self.openai_client.chat.completions.create(
                            model="gpt-4o-mini",
                            messages=messages,
                            temperature=0.7,
                            timeout=10.0,
                        )
                        return response.choices[0].message.content
                
                except Exception as e:
                    print(f"Provider {provider} attempt {attempt + 1} failed: {e}")
                    if attempt < max_retries - 1:
                        continue
                    else:
                        break  # Try next provider
        
        return None  # All providers failed
    
    def chat_with_ai(self, user_message: str, conversation_history: List[Dict], user_profile: Dict) -> str:
        """
        Chat with AI nutrition assistant (works 24/7 with multi-provider fallback)
        """
        # Build system message with user context
        goal_text = 'похудение' if user_profile.get('goal') == 'weight_loss' else 'набор веса' if user_profile.get('goal') == 'weight_gain' else 'поддержание веса'
        
        system_message = f"""Ты - персональный AI-диетолог и помощник по питанию.

ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:
- Цель: {user_profile.get('goal', 'maintenance')} ({goal_text})
- Вес: {user_profile.get('weight', 'не указан')} кг
- Рост: {user_profile.get('height', 'не указан')} см
- Возраст: {user_profile.get('age', 'не указан')} лет
- Пол: {user_profile.get('gender', 'не указан')}
- Уровень активности: {user_profile.get('activity_level', 'moderate')}
- Целевые калории: {user_profile.get('goal_calories', 'не установлено')} ккал/день
- Целевой белок: {user_profile.get('goal_protein', 'не установлено')} г/день
- Диетические предпочтения: {user_profile.get('dietary_preference', 'нет')}

ТВОЯ РОЛЬ:
- Отвечай на вопросы о питании
- Помогай планировать рацион
- Давай конкретные рекомендации по продуктам
- Учитывай цели и профиль пользователя
- Будь дружелюбным и профессиональным
- Отвечай на русском языке
- Давай конкретные, практичные советы
"""
        
        # Build conversation context
        context = ""
        if conversation_history:
            for msg in conversation_history[-5:]:  # Last 5 messages for context
                role = "Пользователь" if msg.get('role') == 'user' else "Ассистент"
                context += f"{role}: {msg.get('content', '')}\n"
        
        full_prompt = f"{context}\nПользователь: {user_message}\nАссистент:"
        
        # Try AI providers first
        ai_response = self._call_ai_provider(full_prompt, system_message)
        
        if ai_response:
            # Clean up response (remove markdown, extra formatting)
            ai_response = re.sub(r'```json\s*', '', ai_response)
            ai_response = re.sub(r'```\s*', '', ai_response)
            ai_response = ai_response.strip()
            return ai_response
        
        # Fallback to rule-based (always works)
        return self._rule_based_chat_response(user_message, user_profile)
    
    def _rule_based_chat_response(self, user_message: str, user_profile: Dict) -> str:
        """
        Enhanced rule-based chat responses (works without any API, 24/7)
        """
        message_lower = user_message.lower()
        
        # Get user goals
        goal_calories = user_profile.get('goal_calories')
        goal_protein = user_profile.get('goal_protein')
        goal = user_profile.get('goal', 'maintenance')
        weight = user_profile.get('weight')
        height = user_profile.get('height')
        age = user_profile.get('age')
        
        # Greetings
        if any(word in message_lower for word in ['привет', 'здравствуй', 'добрый', 'hello', 'hi', 'здарова']):
            return f"Привет! Я ваш персональный диетолог-помощник. Чем могу помочь? Могу ответить на вопросы о питании, помочь с планированием рациона и дать рекомендации с учетом ваших целей."
        
        # Questions about calories
        if any(word in message_lower for word in ['калори', 'calorie', 'ккал', 'энерг']):
            if goal_calories:
                goal_text = 'похудения' if goal == 'weight_loss' else 'набора веса' if goal == 'weight_gain' else 'поддержания веса'
                return f"Ваша целевая норма калорий: {goal_calories} ккал/день. Это рассчитано для {goal_text} с учетом вашего профиля. Старайтесь придерживаться этой нормы, отслеживая приемы пищи в дневнике."
            else:
                return "Для расчета вашей нормы калорий заполните профиль (рост, вес, возраст, пол, цель, активность). После этого я смогу дать точные рекомендации."
        
        # Questions about protein
        if any(word in message_lower for word in ['белок', 'протеин', 'protein']):
            if goal_protein:
                return f"Ваша целевая норма белка: {goal_protein}г/день. Белок важен для мышц, восстановления и сытости. Хорошие источники: курица, рыба, яйца, творог, бобовые, орехи."
            else:
                protein_needed = int(weight * 1.5) if weight else 150
                return f"Для расчета вашей нормы белка заполните профиль. Обычно рекомендуется 1.5-2г белка на кг веса для активных людей. Примерно вам нужно около {protein_needed}г белка в день."
        
        # Questions about weight loss
        if any(word in message_lower for word in ['похуд', 'сброс', 'снизить вес', 'weight loss', 'lose weight', 'похудеть']):
            if goal == 'weight_loss':
                advice = "Для похудения важно:\n\n"
                advice += "1. Создать дефицит калорий (есть меньше, чем тратите)\n"
                advice += "2. Увеличить белок (помогает сохранить мышцы)\n"
                advice += "3. Добавить физическую активность\n"
                advice += "4. Есть регулярно (не пропускать приемы пищи)\n"
                advice += "5. Пить достаточно воды (30-35мл на кг веса)\n"
                if goal_calories:
                    advice += f"\nВаша норма: {goal_calories} ккал/день. Старайтесь не превышать эту цифру."
                return advice
            else:
                return "Для похудения создайте дефицит калорий. Заполните профиль с целью 'похудение', и я рассчитаю вашу норму калорий."
        
        # Questions about weight gain
        if any(word in message_lower for word in ['набор', 'набрать', 'увеличить вес', 'weight gain', 'gain weight', 'поправиться']):
            if goal == 'weight_gain':
                advice = "Для набора веса важно:\n\n"
                advice += "1. Создать профицит калорий (есть больше, чем тратите)\n"
                advice += "2. Увеличить белок для роста мышц (2г на кг веса)\n"
                advice += "3. Силовые тренировки\n"
                advice += "4. Есть регулярно и достаточно\n"
                advice += "5. Добавить полезные калории (орехи, авокадо, цельнозерновые)\n"
                if goal_calories:
                    advice += f"\nВаша норма: {goal_calories} ккал/день. Старайтесь достигать этой цифры."
                return advice
            else:
                return "Для набора веса создайте профицит калорий. Заполните профиль с целью 'набор веса', и я рассчитаю вашу норму."
        
        # Questions about products/foods
        if any(word in message_lower for word in ['продукт', 'еда', 'что есть', 'что кушать', 'food', 'product', 'кушать', 'питание']):
            goal_text = 'похудения' if goal == 'weight_loss' else 'набора веса' if goal == 'weight_gain' else 'здорового питания'
            advice = f"Для {goal_text} рекомендую:\n\n"
            advice += "🥩 Белковые продукты: курица, индейка, рыба, яйца, творог, греческий йогурт, бобовые\n"
            advice += "🌾 Углеводы: овсянка, рис, гречка, картофель, цельнозерновой хлеб, фрукты\n"
            advice += "🥑 Жиры: авокадо, орехи, оливковое масло, рыба жирных сортов\n"
            advice += "🥬 Овощи: любые (низкокалорийные, богаты клетчаткой)\n\n"
            advice += "Старайтесь есть разнообразно и сбалансированно!"
            return advice
        
        # Questions about meal plan
        if any(word in message_lower for word in ['план', 'меню', 'рацион', 'meal plan', 'menu', 'расписание']):
            return "Я могу создать персональный план питания! Перейдите во вкладку 'Meal Plan' и нажмите 'Generate Meal Plan'. План будет создан с учетом ваших целей и предпочтений."
        
        # Questions about BJU/macros
        if any(word in message_lower for word in ['бжу', 'макро', 'белки жиры углеводы', 'macros', 'macro']):
            if goal_calories and goal_protein:
                return f"Ваши целевые макронутриенты:\n- Калории: {goal_calories} ккал/день\n- Белок: {goal_protein}г/день\n\nЭти значения рассчитаны специально для вас. Отслеживайте их в дневнике питания."
            else:
                return "БЖУ (белки, жиры, углеводы) - это основные питательные вещества. Заполните профиль, и я рассчитаю ваши персональные нормы."
        
        # Questions about breakfast
        if any(word in message_lower for word in ['завтрак', 'breakfast', 'утром']):
            return "Завтрак - важный прием пищи! Рекомендую:\n- Овсянка с фруктами и орехами\n- Яйца с овощами\n- Творог с ягодами\n- Греческий йогурт с мюсли\n\nЗавтрак дает энергию на день и помогает контролировать аппетит."
        
        # Questions about dinner
        if any(word in message_lower for word in ['ужин', 'dinner', 'вечер', 'вечером']):
            return "Для ужина выбирайте:\n- Легкие белковые продукты (курица, рыба, творог)\n- Овощи (салат, тушеные овощи)\n- Избегайте тяжелых углеводов перед сном\n\nУжин должен быть за 2-3 часа до сна."
        
        # Questions about water
        if any(word in message_lower for word in ['вода', 'воды', 'water', 'пить']):
            water_needed = int(weight * 35) if weight else 2000
            return f"Вода очень важна! Рекомендуется:\n- {water_needed}мл в день (30-35мл на кг веса)\n- Пить регулярно в течение дня\n- Больше при физической активности\n- Вода помогает метаболизму и контролю аппетита"
        
        # Questions about profile/settings
        if any(word in message_lower for word in ['профиль', 'настройки', 'settings', 'profile', 'данные']):
            return "Заполните профиль в разделе Settings → Profile. Укажите рост, вес, возраст, пол, дату рождения, цель и уровень активности. После этого я смогу давать более точные рекомендации с учетом ваших данных."
        
        # Questions about time/meal timing
        if any(word in message_lower for word in ['когда', 'время', 'time', 'когда есть']):
            return "Рекомендуемое время приемов пищи:\n- Завтрак: 7-9 утра\n- Обед: 12-14 часов\n- Ужин: 18-20 часов\n- Перекусы: между основными приемами\n\nЕшьте каждые 3-4 часа для стабильного уровня энергии."
        
        # Questions about snacks
        if any(word in message_lower for word in ['перекус', 'snack', 'перекусить']):
            return "Полезные перекусы:\n- Фрукты с орехами\n- Греческий йогурт\n- Овощи с хумусом\n- Творог\n- Яблоко с арахисовой пастой\n\nПерекусы помогают контролировать аппетит и поддерживать метаболизм."
        
        # Default response with helpful suggestions
        suggestions = [
            "Расскажите о вашей норме калорий",
            "Какие продукты мне есть?",
            "Как похудеть?",
            "Сколько белка нужно?",
            "Составьте план питания"
        ]
        
        return f"Хороший вопрос! Я могу помочь с:\n- Расчетом норм калорий и БЖУ\n- Рекомендациями по продуктам\n- Планированием рациона\n- Советами по питанию\n\nПопробуйте спросить:\n" + "\n".join([f"- {s}" for s in suggestions[:3]]) + "\n\nИли заполните профиль для персональных рекомендаций."

    def analyze_behavior(self, meals_data: List[Dict], user_profile: Dict) -> Dict:
        """Analyze user's eating behavior patterns"""
        # Always use rule-based analysis first
        rule_based_analysis = self._mock_behavior_analysis(meals_data, user_profile)
        
        # Try to enhance with AI
        if not self.providers:
            return rule_based_analysis
        
        try:
            goal_text = 'похудение' if user_profile.get('goal') == 'weight_loss' else 'набор веса' if user_profile.get('goal') == 'weight_gain' else 'поддержание веса'
            
            prompt = f"""
Проанализируй данные о питании пользователя за последние 7 дней.

ПРОФИЛЬ:
- Цель: {goal_text}
- Целевые калории: {user_profile.get('goal_calories', 'не установлено')} ккал/день
- Целевой белок: {user_profile.get('goal_protein', 'не установлено')} г/день

ДАННЫЕ О ПИТАНИИ:
{json.dumps(meals_data, indent=2, ensure_ascii=False)}

Верни ТОЛЬКО JSON:
{{
    "patterns": ["позитивный паттерн 1", "позитивный паттерн 2"],
    "issues": ["проблема 1 с цифрами", "проблема 2"],
    "recommendations": ["рекомендация 1", "рекомендация 2"],
    "summary": "Краткое резюме (2-3 предложения)"
}}
"""
            
            ai_response = self._call_ai_provider(prompt, "Ты - эксперт-диетолог. Анализируй объективно, давай конкретные рекомендации на русском.")
            
            if ai_response:
                # Try to extract JSON
                json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
                if json_match:
                    ai_result = json.loads(json_match.group())
                    return {
                        "patterns": rule_based_analysis.get("patterns", []) + ai_result.get("patterns", []),
                        "issues": rule_based_analysis.get("issues", []) + ai_result.get("issues", []),
                        "recommendations": rule_based_analysis.get("recommendations", []) + ai_result.get("recommendations", []),
                        "summary": ai_result.get("summary", rule_based_analysis.get("summary", "")),
                        "ai_enhanced": True
                    }
        except Exception as e:
            print(f"AI enhancement failed: {e}")
        
        return rule_based_analysis

    def get_recommendations(self, user_data: Dict, current_nutrition: Dict) -> List[str]:
        """Get AI-powered nutrition recommendations"""
        recommendations = []
        goal_calories = user_data.get('daily_calories', 0)
        current_calories = current_nutrition.get('calories', 0)
        goal_protein = user_data.get('daily_protein', 0)
        current_protein = current_nutrition.get('protein', 0)
        
        if goal_calories > 0:
            remaining = goal_calories - current_calories
            if remaining > 200:
                recommendations.append(f"Осталось {remaining:.0f} ккал до цели. Добавьте полезный перекус.")
            elif remaining < -200:
                recommendations.append(f"Превышение на {abs(remaining):.0f} ккал. Следующий прием пищи должен быть легче.")
        
        if goal_protein > 0 and current_protein < goal_protein * 0.7:
            needed = goal_protein - current_protein
            recommendations.append(f"Не хватает {needed:.0f}г белка. Добавьте белковые продукты.")
        
        if not recommendations:
            recommendations.append("Продолжайте следовать вашим целям!")
        
        return recommendations

    def generate_meal_plan(self, requirements: Dict, days: int = 7) -> Dict:
        """Generate personalized meal plan"""
        # Try AI first
        if self.providers:
            try:
                available_foods = requirements.get('available_foods', [])
                foods_context = f"\nДоступные продукты: {', '.join(available_foods[:50])}" if available_foods else ""
                
                prompt = f"""
Создай план питания на {days} дней с КОНКРЕТНЫМИ продуктами и количествами.

ТРЕБОВАНИЯ:
- Калории: {requirements.get('calories', 2000)} ккал/день
- Белок: {requirements.get('protein', 150)}г
- Углеводы: {requirements.get('carbs', 200)}г
- Жиры: {requirements.get('fat', 65)}г
{foods_context}

Верни ТОЛЬКО JSON:
{{
    "days": [
        {{
            "day_number": 1,
            "breakfast": {{"foods": [{{"name": "Овсянка", "quantity_grams": 100}}], "total": {{"calories": 389}}}},
            "lunch": {{...}},
            "dinner": {{...}},
            "snacks": {{...}},
            "day_total": {{"calories": 2000, "protein": 150, "carbs": 200, "fat": 65}}
        }}
    ]
}}
"""
                ai_response = self._call_ai_provider(prompt, "Ты - эксперт-диетолог. Создавай практичные планы питания.")
                
                if ai_response:
                    json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
                    if json_match:
                        return json.loads(json_match.group())
            except Exception as e:
                print(f"AI meal plan failed: {e}")
        
        # Fallback to mock
        return self._mock_meal_plan()

    def _mock_behavior_analysis(self, meals_data: List[Dict], user_profile: Dict = None) -> Dict:
        """Rule-based behavior analysis"""
        if not meals_data:
            return {
                "patterns": [],
                "issues": ["Недостаточно данных для анализа. Добавьте приемы пищи за последние 7 дней."],
                "recommendations": ["Начните отслеживать приемы пищи в дневнике."],
                "summary": "Недостаточно данных для анализа."
            }
        
        # Analyze patterns
        patterns = []
        issues = []
        recommendations = []
        
        # Check breakfast
        days_with_breakfast = sum(1 for m in meals_data if m.get('meal_type') == 'breakfast')
        total_days = len(set(m.get('date') for m in meals_data))
        if total_days > 0:
            breakfast_rate = (days_with_breakfast / total_days) * 100
            if breakfast_rate < 70:
                issues.append(f"Пропуск завтрака: вы пропускали завтрак в {100 - breakfast_rate:.0f}% дней.")
                recommendations.append("Старайтесь завтракать каждый день. Завтрак дает энергию и помогает контролировать аппетит.")
            else:
                patterns.append("Регулярные завтраки - отличная привычка!")
        
        # Check calories vs goal
        if user_profile and user_profile.get('goal_calories'):
            goal_calories = user_profile.get('goal_calories')
            daily_calories = {}
            for meal in meals_data:
                date = meal.get('date')
                if date not in daily_calories:
                    daily_calories[date] = 0
                daily_calories[date] += meal.get('calories', 0)
            
            over_days = sum(1 for cal in daily_calories.values() if cal > goal_calories * 1.1)
            if over_days > 0:
                issues.append(f"Превышение калорий: превышали норму ({goal_calories} ккал) в {over_days} днях.")
                recommendations.append(f"Старайтесь не превышать {goal_calories} ккал в день.")
        
        # Check protein
        if user_profile and user_profile.get('goal_protein'):
            goal_protein = user_profile.get('goal_protein')
            daily_protein = {}
            for meal in meals_data:
                date = meal.get('date')
                if date not in daily_protein:
                    daily_protein[date] = 0
                daily_protein[date] += meal.get('protein', 0)
            
            low_protein_days = sum(1 for prot in daily_protein.values() if prot < goal_protein * 0.7)
            if low_protein_days > 0:
                avg_protein = sum(daily_protein.values()) / len(daily_protein) if daily_protein else 0
                issues.append(f"Нехватка белка: белок ниже нормы ({goal_protein}г) в {low_protein_days} днях. Среднее потребление: {avg_protein:.0f}г")
                recommendations.append(f"Увеличьте потребление белка до {goal_protein}г в день.")
        
        if not patterns and not issues:
            patterns.append("Стабильное питание!")
        
        summary = f"Проанализировано {total_days} дней. "
        if issues:
            summary += f"Найдено {len(issues)} проблемных паттернов. "
        if patterns:
            summary += f"Выявлено {len(patterns)} положительных привычек."
        
        return {
            "patterns": patterns,
            "issues": issues,
            "recommendations": recommendations,
            "summary": summary
        }

    def _mock_meal_plan(self) -> Dict:
        """Mock meal plan"""
        return {
            "breakfast": {
                "foods": [{"name": "Oatmeal", "quantity": 100}, {"name": "Banana", "quantity": 1}],
                "calories": 350,
                "protein": 12,
                "carbs": 65,
                "fat": 8
            },
            "lunch": {
                "foods": [{"name": "Chicken Breast", "quantity": 150}, {"name": "Brown Rice", "quantity": 100}],
                "calories": 450,
                "protein": 45,
                "carbs": 50,
                "fat": 8
            },
            "dinner": {
                "foods": [{"name": "Salmon", "quantity": 150}, {"name": "Broccoli", "quantity": 200}],
                "calories": 400,
                "protein": 35,
                "carbs": 20,
                "fat": 20
            },
            "total": {
                "calories": 1200,
                "protein": 92,
                "carbs": 135,
                "fat": 36
            }
        }

    def parse_meal_text(self, text: str) -> Dict:
        """Parse meal from natural language"""
        return {
            "foods": [
                {"name": "Parsed food", "quantity_grams": 100, "meal_type": "lunch"}
            ]
        }


# Singleton instance
ai_service = AIService()
