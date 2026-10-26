from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.matching.models import Match
from apps.messaging.models import Message
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
        return Response(self.get_serializer(messages, many=True).data)

    def create(self, request, match_id=None):
        match = self.get_match()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(match=match, sender=request.user)
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
