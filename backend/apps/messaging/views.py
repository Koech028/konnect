from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.matching.models import Match
from apps.messaging.models import Message, MessageActivity
from apps.messaging.serializers import MessageSerializer
from apps.safety.models import Block


class MessageViewSet(viewsets.GenericViewSet):
    serializer_class = MessageSerializer
    http_method_names = ('get', 'post', 'head', 'options')

    def get_match(self):
        match = get_object_or_404(
            Match.objects.select_related('user_one', 'user_two'),
            pk=self.kwargs['match_id'],
        )
        if not match.includes(self.request.user):
            raise PermissionDenied('You are not a participant in this match.')
        other_user = match.other_user(self.request.user)
        if Block.objects.filter(
            Q(blocker=self.request.user, blocked=other_user) |
            Q(blocker=other_user, blocked=self.request.user)
        ).exists():
            raise PermissionDenied('Messaging is unavailable for this match.')
        return match

    def list(self, request, match_id=None):
        match = self.get_match()
        Message.objects.filter(match=match).exclude(sender=request.user).filter(read_at__isnull=True).update(read_at=timezone.now())
        messages = Message.objects.filter(match=match).select_related('sender')
        after = request.query_params.get('after')
        if after:
            timestamp = parse_datetime(after)
            if timestamp is None:
                return Response({'after': ['Use a valid ISO 8601 timestamp.']}, status=status.HTTP_400_BAD_REQUEST)
            if timezone.is_naive(timestamp):
                timestamp = timezone.make_aware(timestamp, timezone.get_current_timezone())
            messages = messages.filter(
                Q(created_at__gt=timestamp) |
                Q(sender=request.user, read_at__gt=timestamp)
            )
        return Response(self.get_serializer(messages, many=True).data)

    def create(self, request, match_id=None):
        match = self.get_match()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(match=match, sender=request.user)
        MessageActivity.objects.filter(match=match, user=request.user).update(typing_until=None)
        recipient = match.other_user(request.user)
        from apps.notifications.services import create_notification
        create_notification(
            recipient=recipient,
            actor=request.user,
            notification_type='message',
            body=f'{request.user.display_name} sent you a message.',
            target_type='match',
            target_id=match.id,
        )
        return Response(self.get_serializer(message).data, status=status.HTTP_201_CREATED)

    def activity(self, request, match_id=None):
        match = self.get_match()
        other_user = match.other_user(request.user)
        activity, _ = MessageActivity.objects.get_or_create(match=match, user=request.user)
        if request.method == 'POST':
            is_typing = request.data.get('typing')
            if not isinstance(is_typing, bool):
                return Response({'typing': ['A boolean value is required.']}, status=status.HTTP_400_BAD_REQUEST)
            from datetime import timedelta
            activity.typing_until = timezone.now() + timedelta(seconds=5) if is_typing else None
            activity.save(update_fields=('typing_until',))
        other_activity = MessageActivity.objects.filter(match=match, user=other_user).first()
        return Response({
            'other_user_typing': bool(
                other_activity and other_activity.typing_until and other_activity.typing_until > timezone.now()
            ),
        })
