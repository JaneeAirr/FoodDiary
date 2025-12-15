from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'date_of_birth', 'height', 'weight', 'activity_level']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('date_of_birth', 'height', 'weight', 'activity_level')}),
    )

