from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.safety.models import Block, Report


class BlockSerializer(serializers.ModelSerializer):
    user = UserSerializer(source='blocked', read_only=True)
    user_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Block
        fields = ('id', 'user', 'user_id', 'created_at')
        read_only_fields = ('id', 'user', 'created_at')

    def validate_user_id(self, value):
        if value == self.context['request'].user.id:
            raise serializers.ValidationError('You cannot block your own profile.')
        return value

    def create(self, validated_data):
        user_id = validated_data.pop('user_id')
        from apps.accounts.models import User
        target = User.objects.filter(pk=user_id, is_active=True).first()
        if not target:
            raise serializers.ValidationError({'user_id': 'Profile not found.'})
        block, _created = Block.objects.get_or_create(
            blocker=self.context['request'].user,
            blocked=target,
        )
        return block


class ReportSerializer(serializers.ModelSerializer):
    reported_user_id = serializers.UUIDField(write_only=True)
    reported_user = UserSerializer(read_only=True)

    class Meta:
        model = Report
        fields = (
            'id', 'reported_user', 'reported_user_id', 'reason',
            'details', 'status', 'created_at',
        )
        read_only_fields = ('id', 'reported_user', 'status', 'created_at')

    def validate(self, attrs):
        request = self.context['request']
        if attrs['reported_user_id'] == request.user.id:
            raise serializers.ValidationError({'reported_user_id': 'You cannot report your own profile.'})
        return attrs

    def create(self, validated_data):
        reported_user_id = validated_data.pop('reported_user_id')
        from apps.accounts.models import User
        target = User.objects.filter(pk=reported_user_id, is_active=True).first()
        if not target:
            raise serializers.ValidationError({'reported_user_id': 'Profile not found.'})
        return Report.objects.create(
            reporter=self.context['request'].user,
            reported_user=target,
            **validated_data,
        )
