# ✅ Миграции выполнены успешно

## Выполненные действия

1. ✅ Установлены все зависимости из `requirements.txt`
2. ✅ Созданы миграции для новых моделей:
   - `WeightEntry` - для отслеживания веса
   - `Notification` - для системы уведомлений
3. ✅ Миграции применены к базе данных

## Файл миграции

Создан файл: `backend/api/migrations/0003_weightentry_notification.py`

## Новые модели в базе данных

### WeightEntry
- `user` - пользователь
- `weight` - вес в кг
- `date` - дата записи
- `notes` - заметки
- Уникальное ограничение: один пользователь - одна запись в день

### Notification
- `user` - пользователь
- `notification_type` - тип (reminder, warning, info, achievement)
- `title` - заголовок
- `message` - сообщение
- `is_read` - прочитано ли
- `created_at` - дата создания

## Проверка работы

Для проверки можно запустить сервер:

```bash
cd backend
python manage.py runserver
```

## Доступные API endpoints

### Вес
- `GET /api/weight/` - список записей
- `POST /api/weight/` - добавить запись
- `GET /api/weight/{id}/` - получить запись
- `PUT/PATCH /api/weight/{id}/` - обновить
- `DELETE /api/weight/{id}/` - удалить

### Уведомления
- `GET /api/notifications/` - список
- `POST /api/notifications/` - создать
- `POST /api/notifications/{id}/mark_read/` - отметить прочитанным
- `POST /api/notifications/mark_all_read/` - отметить все
- `GET /api/notifications/unread_count/` - количество непрочитанных
- `POST /api/check-notifications/` - проверить и создать уведомления

### Расчеты
- `GET/POST /api/calculate-nutrition/` - расчет BMR, TDEE, калорий

### Статистика
- `GET /api/statistics/?days=7` - статистика питания и веса

## Следующие шаги

1. Обновить frontend для работы с новыми endpoints
2. Добавить компоненты для отображения веса
3. Добавить компоненты для уведомлений
4. Интегрировать расчеты BMR/TDEE в профиль пользователя
