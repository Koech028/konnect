from django.utils import timezone
from rest_framework import serializers

from apps.community.models import (
    ActivityOffer,
    DailyPromptResponse,
    DatingEvent,
    EventRSVP,
    OfferConversation,
    OfferMessage,
    Short,
    ShortComment,
    Story,
)
from apps.livestreams.serializers import LiveStreamSerializer


class StorySerializer(serializers.ModelSerializer):
    author_id = serializers.UUIDField(source='author.id', read_only=True)
    author_name = serializers.CharField(source='author.display_name', read_only=True)
    author_avatar = serializers.CharField(source='author.avatar_url', read_only=True)

    class Meta:
        model = Story
        fields = (
            'id', 'author_id', 'author_name', 'author_avatar', 'text',
            'image_url', 'video_url', 'video_duration_seconds', 'created_at', 'expires_at',
        )
        read_only_fields = fields


class CreateStorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Story
        fields = ('text', 'image_url', 'video_url', 'video_duration_seconds')
        extra_kwargs = {
            'text': {'required': False, 'allow_blank': True},
            'image_url': {'required': False, 'allow_blank': True},
            'video_url': {'required': False, 'allow_blank': True},
            'video_duration_seconds': {'required': False, 'allow_null': True},
        }

    def validate(self, attrs):
        if attrs.get('image_url') and attrs.get('video_url'):
            raise serializers.ValidationError('Choose either an image or a video for your story.')
        if attrs.get('video_url'):
            if not attrs['video_url'].startswith('https://'):
                raise serializers.ValidationError({'video_url': 'Story videos must use a secure HTTPS URL.'})
            duration = attrs.get('video_duration_seconds')
            if duration is None or not 1 <= duration <= 60:
                raise serializers.ValidationError({
                    'video_duration_seconds': 'Story videos must be between 1 and 60 seconds.'
                })
        elif attrs.get('video_duration_seconds') is not None:
            raise serializers.ValidationError({'video_duration_seconds': 'A duration is only valid with a video.'})
        if not attrs.get('text', '').strip() and not attrs.get('image_url') and not attrs.get('video_url'):
            raise serializers.ValidationError('Add text, an image, or a video to your story.')
        attrs['text'] = attrs.get('text', '').strip()
        return attrs


class ShortSerializer(serializers.ModelSerializer):
    author_id = serializers.UUIDField(source='author.id', read_only=True)
    author_name = serializers.CharField(source='author.display_name', read_only=True)
    author_avatar = serializers.CharField(source='author.avatar_url', read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    views_count = serializers.IntegerField(read_only=True)
    liked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Short
        fields = (
            'id', 'author_id', 'author_name', 'author_avatar', 'caption',
            'video_url', 'duration_seconds', 'likes_count', 'comments_count',
            'views_count', 'liked_by_me', 'created_at',
        )
        read_only_fields = (
            'id', 'author_id', 'author_name', 'author_avatar', 'likes_count',
            'comments_count', 'views_count', 'liked_by_me', 'created_at',
        )

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        return bool(
            request
            and request.user.is_authenticated
            and obj.likes.filter(user=request.user).exists()
        )


class CreateShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Short
        fields = ('caption', 'video_url', 'duration_seconds')
        extra_kwargs = {
            'caption': {'required': False, 'allow_blank': True},
        }

    def validate_duration_seconds(self, value):
        if not 1 <= value <= 60:
            raise serializers.ValidationError('Short videos must be between 1 and 60 seconds.')
        return value

    def validate_video_url(self, value):
        if not value.startswith('https://'):
            raise serializers.ValidationError('Short videos must use a secure HTTPS URL.')
        return value


class ShortCommentSerializer(serializers.ModelSerializer):
    author_id = serializers.UUIDField(source='author.id', read_only=True)
    author_name = serializers.CharField(source='author.display_name', read_only=True)
    author_avatar = serializers.CharField(source='author.avatar_url', read_only=True)

    class Meta:
        model = ShortComment
        fields = ('id', 'author_id', 'author_name', 'author_avatar', 'text', 'created_at')
        read_only_fields = ('id', 'author_id', 'author_name', 'author_avatar', 'created_at')


class DailyPromptResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyPromptResponse
        fields = ('answer', 'updated_at')
        read_only_fields = ('updated_at',)

    def validate_answer(self, value):
        answer = value.strip()
        if not answer:
            raise serializers.ValidationError('Write a response before saving.')
        return answer


class DatingEventSerializer(serializers.ModelSerializer):
    host_id = serializers.UUIDField(source='host.id', read_only=True)
    host_name = serializers.CharField(source='host.display_name', read_only=True)
    attendee_count = serializers.IntegerField(source='rsvps.count', read_only=True)
    attending = serializers.SerializerMethodField()

    class Meta:
        model = DatingEvent
        fields = (
            'id', 'host_id', 'host_name', 'title', 'description', 'location',
            'starts_at', 'ends_at', 'capacity', 'attendee_count', 'attending', 'created_at',
        )
        read_only_fields = ('id', 'host_id', 'host_name', 'attendee_count', 'attending', 'created_at')

    def get_attending(self, obj):
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated and obj.rsvps.filter(user=request.user).exists())

    def validate(self, attrs):
        starts_at = attrs.get('starts_at', getattr(self.instance, 'starts_at', None))
        ends_at = attrs.get('ends_at', getattr(self.instance, 'ends_at', None))
        if starts_at and starts_at <= timezone.now():
            raise serializers.ValidationError({'starts_at': 'Choose a future date and time.'})
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError({'ends_at': 'The event must end after it starts.'})
        capacity = attrs.get('capacity', getattr(self.instance, 'capacity', None))
        if capacity is not None and not 2 <= capacity <= 500:
            raise serializers.ValidationError({'capacity': 'Capacity must be between 2 and 500.'})
        return attrs

    def create(self, validated_data):
        return DatingEvent.objects.create(host=self.context['request'].user, **validated_data)


class ActivityOfferSerializer(serializers.ModelSerializer):
    host_id = serializers.UUIDField(source='host.id', read_only=True)
    host_name = serializers.CharField(source='host.display_name', read_only=True)
    host_age = serializers.IntegerField(source='host.age', read_only=True)
    host_avatar = serializers.CharField(source='host.avatar_url', read_only=True)
    host_verification_status = serializers.CharField(source='host.verification_status', read_only=True)

    class Meta:
        model = ActivityOffer
        fields = (
            'id', 'host_id', 'host_name', 'host_age', 'host_avatar', 'host_verification_status',
            'category', 'title', 'description', 'city', 'location', 'starts_at', 'ends_at',
            'image_url', 'activities', 'boundaries', 'price_ksh', 'lunch_expectation',
            'is_active', 'created_at',
        )
        read_only_fields = (
            'id', 'host_id', 'host_name', 'host_age', 'host_avatar',
            'host_verification_status', 'created_at',
        )
        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True},
            'image_url': {'required': False, 'allow_blank': True},
            'activities': {'required': False},
            'price_ksh': {'max_value': 1_000_000},
            'boundaries': {'trim_whitespace': True},
        }

    def validate_activities(self, value):
        normalized = [activity.strip() for activity in value if activity.strip()]
        if len(normalized) > 10:
            raise serializers.ValidationError('List no more than 10 activities.')
        if any(len(activity) > 60 for activity in normalized):
            raise serializers.ValidationError('Each activity must be 60 characters or fewer.')
        return normalized

    def validate_image_url(self, value):
        if value and not value.startswith('https://'):
            raise serializers.ValidationError('Offer images must use a secure HTTPS URL.')
        return value

    def validate(self, attrs):
        starts_at = attrs.get('starts_at', getattr(self.instance, 'starts_at', None))
        ends_at = attrs.get('ends_at', getattr(self.instance, 'ends_at', None))
        if starts_at and starts_at <= timezone.now():
            raise serializers.ValidationError({'starts_at': 'Choose a future date and time.'})
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError({'ends_at': 'The offer must end after it starts.'})
        if not self.instance and 'lunch_expectation' not in attrs:
            raise serializers.ValidationError({'lunch_expectation': 'Choose a lunch expectation.'})
        return attrs

    def create(self, validated_data):
        validated_data['host'] = self.context['request'].user
        return super().create(validated_data)


class OfferMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = OfferMessage
        fields = ('id', 'sender_id', 'text', 'created_at', 'read_at')
        read_only_fields = ('id', 'sender_id', 'created_at', 'read_at')

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Message cannot be empty.')
        return value


class OfferConversationSerializer(serializers.ModelSerializer):
    other_user_id = serializers.SerializerMethodField()
    other_user_name = serializers.SerializerMethodField()
    other_user_avatar = serializers.SerializerMethodField()
    offer_id = serializers.UUIDField(source='offer.id', read_only=True, allow_null=True)
    offer_title = serializers.CharField(source='offer.title', read_only=True, allow_null=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = OfferConversation
        fields = (
            'id', 'other_user_id', 'other_user_name', 'other_user_avatar',
            'offer_id', 'offer_title', 'last_message', 'unread_count', 'updated_at',
        )

    def get_other_user(self, obj):
        return obj.host if obj.requester_id == self.context['request'].user.id else obj.requester

    def get_other_user_id(self, obj):
        return str(self.get_other_user(obj).id)

    def get_other_user_name(self, obj):
        return self.get_other_user(obj).display_name

    def get_other_user_avatar(self, obj):
        return self.get_other_user(obj).avatar_url

    def get_last_message(self, obj):
        message = obj.messages.order_by('-created_at').first()
        return message.text if message else ''

    def get_unread_count(self, obj):
        return obj.messages.exclude(sender=self.context['request'].user).filter(read_at__isnull=True).count()
