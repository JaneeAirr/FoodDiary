from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'date_of_birth', 'height', 'weight', 'activity_level')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    # Ensure JSONField is properly serialized
    allergies = serializers.JSONField(required=False, allow_null=True)
    dietary_restrictions = serializers.JSONField(required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'date_of_birth', 'gender', 'height', 'weight', 'target_weight',
            'goal', 'activity_level', 'allergies', 'dietary_restrictions',
            'display_name', 'show_display_name', 'dietary_preference', 'theme_preference',
            'created_at'
        )
        read_only_fields = ('id', 'created_at')

