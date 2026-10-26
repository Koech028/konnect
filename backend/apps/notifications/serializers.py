from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.notifications.models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = ('id', 'type', 'body', 'actor', 'target_type', 'target_id', 'read', 'created_at')
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ('messages', 'likes', 'posts')
