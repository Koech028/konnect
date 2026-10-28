from rest_framework import serializers

from apps.livestreams.models import Gift, LiveStream, MAX_LIVE_ENTRY_PRICE


class LiveStreamSerializer(serializers.ModelSerializer):
    host_id = serializers.UUIDField(source='host.id', read_only=True)
    host_name = serializers.CharField(source='host.display_name', read_only=True)
    host_avatar_url = serializers.URLField(source='host.avatar_url', read_only=True)

    class Meta:
        model = LiveStream
        fields = ('id', 'title', 'status', 'entry_price', 'host_id', 'host_name', 'host_avatar_url', 'created_at')
        read_only_fields = fields


class CreateLiveStreamSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=80, trim_whitespace=True, required=False, allow_blank=True, default='')
    entry_price = serializers.IntegerField(min_value=0, max_value=MAX_LIVE_ENTRY_PRICE, required=False, default=0)


class GiftSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(source='sender.id', read_only=True)
    sender_name = serializers.CharField(source='sender.display_name', read_only=True)
    gift_name = serializers.CharField(source='get_gift_type_display', read_only=True)

    class Meta:
        model = Gift
        fields = ('id', 'sender_id', 'sender_name', 'gift_type', 'gift_name', 'credits', 'created_at')
        read_only_fields = fields
