from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.matching.models import Match


class MatchSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    matched_at = serializers.DateTimeField(source='created_at', read_only=True)
    last_message = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = ('id', 'user', 'status', 'matched_at', 'last_message', 'last_message_at', 'unread_count')

    def get_user(self, obj):
        user = obj.other_user(self.context['request'].user)
        return UserSerializer(user, context=self.context).data

    def get_status(self, _obj):
        return 'matched'

    def get_last_message(self, obj):
        from apps.messaging.models import Message
        message = Message.objects.filter(match=obj).order_by('-created_at').first()
        if not message:
            return None
        return {'text': message.text, 'sender_id': str(message.sender_id)}

    def get_last_message_at(self, obj):
        from apps.messaging.models import Message
        message = Message.objects.filter(match=obj).order_by('-created_at').first()
        return message.created_at if message else obj.created_at

    def get_unread_count(self, obj):
        from apps.messaging.models import Message
        return Message.objects.filter(match=obj, read_at__isnull=True).exclude(sender=self.context['request'].user).count()
