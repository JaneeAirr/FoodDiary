"""
WSGI config for food_diary project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'food_diary.settings')

application = get_wsgi_application()

