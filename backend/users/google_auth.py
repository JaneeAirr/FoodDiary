"""
Google OAuth 2.0 authentication views
"""
import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from decouple import config
from .models import User
from .serializers import UserSerializer


def get_google_oauth_url():
    """Generate Google OAuth authorization URL"""
    from urllib.parse import urlencode
    
    google_client_id = config('GOOGLE_OAUTH_CLIENT_ID', default='')
    # Frontend redirect URI - Google will redirect here after authentication
    frontend_url = config('FRONTEND_URL', default='http://localhost:3000')
    redirect_uri = config('GOOGLE_OAUTH_REDIRECT_URI', default=f'{frontend_url}/auth/google/callback')
    
    if not google_client_id:
        return None
    
    params = {
        'client_id': google_client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'prompt': 'consent',
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return auth_url


@api_view(['GET'])
@permission_classes([AllowAny])
def google_auth(request):
    """Initiate Google OAuth flow"""
    auth_url = get_google_oauth_url()
    
    if not auth_url:
        return Response({
            'error': 'Google OAuth not configured. Please set GOOGLE_OAUTH_CLIENT_ID in .env file.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'auth_url': auth_url
    })


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def google_callback(request):
    """Handle Google OAuth callback"""
    code = request.GET.get('code') or (request.data.get('code') if hasattr(request, 'data') else None)
    error = request.GET.get('error') or (request.data.get('error') if hasattr(request, 'data') else None)
    
    if error:
        return Response({
            'error': f'OAuth error: {error}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not code:
        return Response({
            'error': 'Authorization code not provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Exchange code for tokens
    google_client_id = config('GOOGLE_OAUTH_CLIENT_ID', default='')
    google_client_secret = config('GOOGLE_OAUTH_CLIENT_SECRET', default='')
    # Frontend redirect URI - must match the one used in authorization
    frontend_url = config('FRONTEND_URL', default='http://localhost:3000')
    redirect_uri = config('GOOGLE_OAUTH_REDIRECT_URI', default=f'{frontend_url}/auth/google/callback')
    
    if not google_client_id or not google_client_secret:
        return Response({
            'error': 'Google OAuth not properly configured'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Exchange authorization code for access token
    token_url = 'https://oauth2.googleapis.com/token'
    token_data = {
        'code': code,
        'client_id': google_client_id,
        'client_secret': google_client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code',
    }
    
    try:
        token_response = requests.post(token_url, data=token_data)
        token_response.raise_for_status()
        tokens = token_response.json()
        access_token = tokens.get('access_token')
        
        if not access_token:
            return Response({
                'error': 'Failed to get access token from Google'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user info from Google
        user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
        headers = {'Authorization': f'Bearer {access_token}'}
        user_info_response = requests.get(user_info_url, headers=headers)
        user_info_response.raise_for_status()
        user_info = user_info_response.json()
        
        # Extract user data
        google_id = user_info.get('id')
        email = user_info.get('email')
        first_name = user_info.get('given_name', '')
        last_name = user_info.get('family_name', '')
        full_name = user_info.get('name', '')
        picture = user_info.get('picture', '')
        
        if not email:
            return Response({
                'error': 'Email not provided by Google'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create user
        # Try to find user by email first
        try:
            user = User.objects.get(email=email)
            created = False
        except User.DoesNotExist:
            # Create new user with unique username
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            # Ensure username is unique
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1
            
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
            )
            created = True
        
        # Update user info if needed
        if not created:
            updated = False
            if first_name and not user.first_name:
                user.first_name = first_name
                updated = True
            if last_name and not user.last_name:
                user.last_name = last_name
                updated = True
            if not user.is_active:
                user.is_active = True
                updated = True
            if updated:
                user.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Return response - for frontend redirect, we'll return HTML that sets tokens and redirects
        # Or return JSON for API calls
        if request.GET.get('format') == 'json' or request.content_type == 'application/json':
            return Response({
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'created': created
            })
        else:
            # For browser redirect, return HTML page that sets tokens in localStorage and redirects
            from django.http import HttpResponse
            frontend_url = config('FRONTEND_URL', default='http://localhost:3000')
            html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Google Authentication</title>
            </head>
            <body>
                <script>
                    localStorage.setItem('accessToken', '{refresh.access_token}');
                    localStorage.setItem('refreshToken', '{refresh}');
                    window.location.href = '{frontend_url}/dashboard';
                </script>
                <p>Redirecting...</p>
            </body>
            </html>
            """
            return HttpResponse(html)
        
    except requests.exceptions.RequestException as e:
        return Response({
            'error': f'Failed to authenticate with Google: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': f'Unexpected error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
