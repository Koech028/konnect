from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.profiles.models import ProfilePhoto, VerificationRequest


class ProfilePhotoSerializer(serializers.ModelSerializer):
    position = serializers.IntegerField(required=False, min_value=0)

    class Meta:
        model = ProfilePhoto
        fields = ('id', 'url', 'position', 'is_primary', 'created_at')
        read_only_fields = ('id', 'created_at')

    def validate(self, attrs):
        user = self.context['request'].user
        if not self.instance and user.profile_photos.count() >= 6:
            raise serializers.ValidationError('A profile can have at most 6 photos.')
        position = attrs.get('position')
        if position is not None and user.profile_photos.filter(position=position).exclude(pk=getattr(self.instance, 'pk', None)).exists():
            raise serializers.ValidationError({'position': 'This photo position is already in use.'})
        return attrs


class ProfileUpdateSerializer(serializers.ModelSerializer):
    interests = serializers.ListField(
        child=serializers.CharField(max_length=40, trim_whitespace=True),
        required=False,
        max_length=30,
    )
    location = serializers.DictField(
        child=serializers.CharField(max_length=100, allow_blank=True),
        write_only=True,
        required=False,
    )

    class Meta:
        from apps.accounts.models import User
        model = User
        fields = (
            'display_name', 'age', 'gender', 'bio', 'cover_image_url', 'location',
            'interests', 'preferences', 'profile_status',
        )

    def validate_preferences(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Preferences must be an object.')
        interested_in = value.get('interested_in', [])
        if not isinstance(interested_in, list) or any(
            item not in ('women', 'men', 'non_binary') for item in interested_in
        ):
            raise serializers.ValidationError({'interested_in': 'Choose women, men, and/or non_binary.'})
        age_min = value.get('age_min', 18)
        age_max = value.get('age_max', 100)
        try:
            age_min = int(age_min)
            age_max = int(age_max)
        except (TypeError, ValueError) as exc:
            raise serializers.ValidationError('Age preferences must be integers.') from exc
        if not 18 <= age_min <= age_max <= 100:
            raise serializers.ValidationError('Choose a valid age range from 18 to 100.')
        if 'max_distance_km' in value:
            try:
                distance = int(value['max_distance_km'])
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError('Maximum distance must be an integer.') from exc
            if not 5 <= distance <= 500:
                raise serializers.ValidationError('Maximum distance must be between 5 and 500 km.')
        return value

    def update(self, instance, validated_data):
        location = validated_data.pop('location', None)
        if location is not None:
            instance.city = location.get('city', instance.city)
            instance.country = location.get('country', instance.country)
        return super().update(instance, validated_data)


class VerificationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationRequest
        fields = ('id', 'status', 'created_at', 'reviewed_at')
        read_only_fields = fields


class ProfileReadSerializer(UserSerializer):
    pass


class DiscoveryProfileSerializer(UserSerializer):
    shared_interests = serializers.SerializerMethodField()
    same_city = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ('shared_interests', 'same_city')

    def get_shared_interests(self, obj):
        viewer_interests = self.context.get('viewer_interests', set())
        return [
            interest for interest in (obj.interests or [])
            if isinstance(interest, str) and interest.strip().casefold() in viewer_interests
        ]

    def get_same_city(self, obj):
        viewer_city = self.context.get('viewer_city', '')
        return bool(viewer_city and (obj.city or '').strip().casefold() == viewer_city)
