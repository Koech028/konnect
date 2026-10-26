from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.matching.models import Match, UserLike
from apps.matching.serializers import MatchSerializer
from apps.safety.models import Block


class LikeView(APIView):
    def post(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            raise ValidationError({'user_id': 'This field is required.'})
        recipient = get_object_or_404(
            User,
            pk=user_id,
            is_active=True,
            profile_status=User.ProfileStatus.ACTIVE,
        )
        if recipient.pk == request.user.pk:
            raise ValidationError({'user_id': 'You cannot like your own profile.'})
        if Block.objects.filter(
            Q(blocker=request.user, blocked=recipient) | Q(blocker=recipient, blocked=request.user)
        ).exists():
            return Response({'detail': 'You cannot like this profile.'}, status=status.HTTP_403_FORBIDDEN)
        like, created = UserLike.objects.get_or_create(sender=request.user, recipient=recipient)
        reciprocal = UserLike.objects.filter(sender=recipient, recipient=request.user).exists()
        match = None
        if reciprocal:
            match, match_created = Match.create_for_users(request.user, recipient)
            if match_created:
                from apps.notifications.services import create_notification
                create_notification(
                    recipient=recipient,
                    actor=request.user,
                    notification_type='match',
                    body=f'You and {request.user.display_name} matched!',
                    target_type='match',
                    target_id=match.id,
                )
                create_notification(
                    recipient=request.user,
                    actor=recipient,
                    notification_type='match',
                    body=f'You and {recipient.display_name} matched!',
                    target_type='match',
                    target_id=match.id,
                )
        elif created:
            from apps.notifications.services import create_notification
            create_notification(
                recipient=recipient,
                actor=request.user,
                notification_type='interest',
                body=f'{request.user.display_name} liked your profile.',
                target_type='profile',
                target_id=request.user.id,
            )
        return Response({
            'liked': True,
            'is_match': match is not None,
            'match': MatchSerializer(match, context={'request': request}).data if match else None,
        }, status=status.HTTP_201_CREATED)

    def delete(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            raise ValidationError({'user_id': 'This field is required.'})
        UserLike.objects.filter(sender=request.user, recipient_id=user_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class IncomingLikesView(APIView):
    def get(self, request):
        blocked_ids = Block.objects.filter(
            Q(blocker=request.user) | Q(blocked=request.user)
        ).values_list('blocker_id', 'blocked_id')
        exclude_ids = {item for pair in blocked_ids for item in pair} - {request.user.id}
        queryset = User.objects.filter(
            likes_sent__recipient=request.user,
            is_active=True,
            profile_status=User.ProfileStatus.ACTIVE,
        ).exclude(
            id__in=exclude_ids
        ).distinct().prefetch_related('profile_photos')
        return Response(UserSerializer(queryset, many=True, context={'request': request}).data)


class OutgoingLikesView(APIView):
    def get(self, request):
        blocked_ids = Block.objects.filter(
            Q(blocker=request.user) | Q(blocked=request.user)
        ).values_list('blocker_id', 'blocked_id')
        exclude_ids = {item for pair in blocked_ids for item in pair} - {request.user.id}
        queryset = User.objects.filter(
            likes_received__sender=request.user,
            is_active=True,
            profile_status=User.ProfileStatus.ACTIVE,
        ).exclude(
            id__in=exclude_ids
        ).distinct().prefetch_related('profile_photos')
        return Response(UserSerializer(queryset, many=True, context={'request': request}).data)


class MatchViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MatchSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        blocked_ids = Block.objects.filter(
            Q(blocker=user) | Q(blocked=user)
        ).values_list('blocker_id', 'blocked_id')
        exclude_ids = {item for pair in blocked_ids for item in pair} - {user.id}
        return Match.objects.filter(Q(user_one=user) | Q(user_two=user)).exclude(
            Q(user_one_id__in=exclude_ids) | Q(user_two_id__in=exclude_ids)
        ).select_related('user_one', 'user_two').prefetch_related(
            'user_one__profile_photos', 'user_two__profile_photos'
        )
