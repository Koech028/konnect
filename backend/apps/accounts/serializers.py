from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import User


class UserSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'display_name', 'age', 'gender', 'bio', 'location',
            'photos', 'avatar', 'interests', 'verification_status',
            'profile_status',
        )
        read_only_fields = ('id', 'verification_status', 'profile_status')

    def get_location(self, obj):
        return {'city': obj.city, 'country': obj.country}

    def get_photos(self, obj):
        photos = getattr(obj, 'profile_photos', None)
        if photos is not None:
            urls = [photo.url for photo in photos.all()]
            if urls:
                return urls
        return [obj.avatar_url] if obj.avatar_url else []

    def get_avatar(self, obj):
        photos = getattr(obj, 'profile_photos', None)
        if photos is not None:
            primary = next((photo.url for photo in photos.all() if photo.is_primary), None)
            if primary:
                return primary
        return obj.avatar_url or None


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    city = serializers.CharField(write_only=True, required=False, allow_blank=True)
    country = serializers.CharField(write_only=True, required=False, allow_blank=True)
    interests = serializers.ListField(
        child=serializers.CharField(max_length=40, trim_whitespace=True),
        required=False,
        default=list,
        max_length=30,
    )
    location = serializers.DictField(
        child=serializers.CharField(max_length=100, allow_blank=True),
        write_only=True,
        required=False,
    )

    class Meta:
        model = User
        fields = (
            'email', 'password', 'display_name', 'age', 'gender',
            'bio', 'city', 'country', 'location', 'interests',
        )

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate(self, attrs):
        location = attrs.pop('location', {})
        attrs.setdefault('city', location.get('city', ''))
        attrs.setdefault('country', location.get('country', 'Kenya'))
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CurrentUserSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + (
            'email', 'preferences', 'subscription_tier', 'created_at', 'last_active',
        )
        read_only_fields = UserSerializer.Meta.read_only_fields + (
            'email', 'preferences', 'subscription_tier', 'created_at', 'last_active',
        )
