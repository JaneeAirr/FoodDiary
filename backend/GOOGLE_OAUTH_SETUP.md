# Google OAuth 2.0 Setup Guide

## Шаг 1: Создание OAuth 2.0 Credentials в Google Cloud Console

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в **APIs & Services** → **Credentials**
4. Нажмите **Create Credentials** → **OAuth client ID**
5. Если появится запрос, настройте **OAuth consent screen**:
   - Выберите **External** (для тестирования)
   - Заполните обязательные поля:
     - App name: "Food Diary"
     - User support email: ваш email
     - Developer contact: ваш email
   - Нажмите **Save and Continue**
   - В разделе **Scopes** нажмите **Add or Remove Scopes** и добавьте:
     - `email`
     - `profile`
     - `openid`
   - Нажмите **Save and Continue**
   - В разделе **Test users** добавьте ваш email (для тестирования)
   - Нажмите **Save and Continue**
   - Просмотрите и вернитесь на dashboard

6. Создайте **OAuth client ID**:
   - Application type: **Web application**
   - Name: "Food Diary Web Client"
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `http://127.0.0.1:3000`
   - **Authorized redirect URIs**:
     - `http://localhost:8000/api/auth/google/callback/`
     - `http://127.0.0.1:8000/api/auth/google/callback/`
   - Нажмите **Create**

7. Скопируйте **Client ID** и **Client Secret**

## Шаг 2: Настройка .env файла

Добавьте в `backend/.env`:

```env
GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/google/callback/
```

## Шаг 3: Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

## Шаг 4: Перезапуск сервера

```bash
python manage.py runserver
```

## Шаг 5: Тестирование

1. Откройте `http://localhost:3000/login`
2. Нажмите "Continue with Google"
3. Войдите в Google аккаунт
4. Разрешите доступ приложению
5. Вы будете перенаправлены обратно и автоматически войдете в систему

## Важные замечания

- Для production измените `GOOGLE_OAUTH_REDIRECT_URI` на ваш production URL
- Убедитесь, что redirect URI в Google Console точно совпадает с URI в .env
- Для production также нужно будет опубликовать OAuth consent screen
