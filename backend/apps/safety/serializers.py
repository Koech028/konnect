from rest_framework import serializers
from django.db.models import Q

from apps.accounts.serializers import UserSerializer
from apps.safety.models import Block, ContentReport, Report


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


class ContentReportSerializer(serializers.ModelSerializer):
    short_id = serializers.UUIDField(source='short.id', read_only=True)
    comment_id = serializers.UUIDField(source='comment.id', read_only=True)
    short = serializers.UUIDField(write_only=True, required=False)
    comment = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = ContentReport
        fields = (
            'id', 'short_id', 'comment_id', 'short', 'comment',
            'reason', 'details', 'status', 'created_at',
        )
        read_only_fields = ('id', 'short_id', 'comment_id', 'status', 'created_at')
        extra_kwargs = {
            'details': {'required': False, 'allow_blank': True},
        }

    def validate(self, attrs):
        from apps.community.models import Short, ShortComment

        has_short = 'short' in attrs
        has_comment = 'comment' in attrs
        if has_short == has_comment:
            raise serializers.ValidationError('Report either a Short or a comment.')

        target_model = Short if has_short else ShortComment
        target_id = attrs.pop('short' if has_short else 'comment')
        target = target_model.objects.filter(pk=target_id).first()
        if target is None:
            raise serializers.ValidationError('This content is no longer available.')
        short = target if has_short else target.short
        request = self.context['request']
        if not short.author.is_active or short.author.profile_status != 'active':
            raise serializers.ValidationError('This content is no longer available.')
        if Block.objects.filter(
            Q(blocker=request.user, blocked=short.author)
            | Q(blocker=short.author, blocked=request.user)
        ).exists():
            raise serializers.ValidationError('This content is no longer available.')
        content_author = target.author if has_comment else short.author
        if content_author.id == request.user.id:
            raise serializers.ValidationError('You cannot report your own content.')
        if not has_short:
            attrs['comment'] = target
        else:
            attrs['short'] = target
        target_field = 'short' if has_short else 'comment'
        if ContentReport.objects.filter(
            reporter=request.user,
            **{target_field: target},
        ).exists():
            raise serializers.ValidationError('You have already reported this content.')
        return attrs

    def create(self, validated_data):
        validated_data['reporter'] = self.context['request'].user
        return ContentReport.objects.create(**validated_data)
