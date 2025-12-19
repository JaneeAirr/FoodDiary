# Инструкция по исправлению Google OAuth

## Проблема
Google OAuth не работает, потому что redirect URI не совпадает между Google Console и кодом.

## Решение

### Шаг 1: Настройка в Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Выберите ваш проект
3. Перейдите в **APIs & Services** → **Credentials**
4. Найдите ваш OAuth 2.0 Client ID и нажмите на него для редактирования
5. В разделе **Authorized redirect URIs** добавьте/измените на:
   ```
   http://localhost:3000/auth/google/callback
   ```
   **ВАЖНО:** Убедитесь, что это именно фронтенд URL, а не бэкенд!

6. Сохраните изменения

### Шаг 2: Настройка переменных окружения

Создайте или обновите файл `backend/.env`:

```env
GOOGLE_OAUTH_CLIENT_ID=ваш_client_id_из_google_console
GOOGLE_OAUTH_CLIENT_SECRET=ваш_client_secret_из_google_console
FRONTEND_URL=http://localhost:3000
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**Где взять Client ID и Secret:**
- В Google Cloud Console → APIs & Services → Credentials
- Найдите ваш OAuth 2.0 Client ID
- Скопируйте Client ID и Client Secret

### Шаг 3: Проверка кода

Убедитесь, что в `backend/users/google_auth.py` используется правильный redirect URI:

```python
frontend_url = config('FRONTEND_URL', default='http://localhost:3000')
redirect_uri = config('GOOGLE_OAUTH_REDIRECT_URI', default=f'{frontend_url}/auth/google/callback')
```

### Шаг 4: Перезапуск серверов

1. Остановите бэкенд сервер (Ctrl+C)
2. Запустите снова:
   ```bash
   cd backend
   python manage.py runserver
   ```

3. Перезапустите фронтенд:
   ```bash
   cd frontend
   npm start
   ```

### Шаг 5: Тестирование

1. Откройте http://localhost:3000/login
2. Нажмите "Continue with Google"
3. Должно произойти перенаправление на Google
4. После авторизации вы вернетесь на http://localhost:3000/auth/google/callback
5. Затем автоматически перенаправитесь на /dashboard

## Частые ошибки

### Ошибка: "redirect_uri_mismatch"
- **Причина:** Redirect URI в Google Console не совпадает с тем, что в коде
- **Решение:** Убедитесь, что в Google Console указан точно `http://localhost:3000/auth/google/callback` (без слеша в конце или со слешем - должно совпадать везде)

### Ошибка: "invalid_client"
- **Причина:** Неправильный Client ID или Secret
- **Решение:** Проверьте, что в `.env` файле правильные значения

### Ошибка: "access_denied"
- **Причина:** OAuth consent screen не настроен или пользователь не добавлен в тестовые пользователи
- **Решение:** 
  1. В Google Console → APIs & Services → OAuth consent screen
  2. Добавьте ваш email в "Test users"
  3. Убедитесь, что scopes включают: email, profile, openid

## Для Production

Когда будете деплоить на production:

1. В Google Console добавьте production redirect URI:
   ```
   https://yourdomain.com/auth/google/callback
   ```

2. Обновите `.env`:
   ```env
   FRONTEND_URL=https://yourdomain.com
   GOOGLE_OAUTH_REDIRECT_URI=https://yourdomain.com/auth/google/callback
   ```

3. Опубликуйте OAuth consent screen (в Google Console)

