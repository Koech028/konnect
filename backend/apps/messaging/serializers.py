from rest_framework import serializers

from apps.messaging.models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Message
        fields = ('id', 'sender_id', 'text', 'created_at', 'read_at')
        read_only_fields = ('id', 'sender_id', 'created_at', 'read_at')

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Message cannot be empty.')
        return value
