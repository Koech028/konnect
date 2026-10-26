from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, throttling
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.community.models import (
    DailyPromptResponse,
    DatingEvent,
    EventRSVP,
    Short,
    ShortComment,
    ShortLike,
    ShortView,
    Story,
)
from apps.community.serializers import (
    CreateShortSerializer,
    CreateStorySerializer,
    DailyPromptResponseSerializer,
    DatingEventSerializer,
    ShortCommentSerializer,
    ShortSerializer,
    StorySerializer,
)
from apps.safety.models import Block


def blocked_user_ids(user):
    pairs = Block.objects.filter(Q(blocker=user) | Q(blocked=user)).values_list('blocker_id', 'blocked_id')
    return {user_id for pair in pairs for user_id in pair if user_id != user.id}


DAILY_PROMPTS = (
    'What small thing made you smile today?',
    'What is your ideal low-key first date?',
    'Which song always improves your mood?',
    'What is something you would love to learn this year?',
    'What is your favorite way to spend a free afternoon?',
    'Which meal would you happily eat every week?',
    'What is a place nearby you would recommend to a friend?',
    'What quality do you appreciate most in a conversation?',
    'What is one kind thing someone did for you recently?',
    'Would you rather plan a day out or make it up as you go?',
    'What hobby helps you recharge?',
    'What is a movie you can watch more than once?',
    'What does a great weekend look like to you?',
    'What is something you are looking forward to?',
)


class StoryListCreateView(APIView):
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'story-write'

    def get_throttles(self):
        return super().get_throttles() if self.request.method == 'POST' else []

    def get(self, request):
        now = timezone.now()
        expired = Story.objects.filter(expires_at__lte=now)
        if expired.exists():
            expired.delete()
        stories = Story.objects.filter(
            expires_at__gt=now,
            author__is_active=True,
            author__profile_status='active',
        ).exclude(author_id__in=blocked_user_ids(request.user)).select_related('author')[:100]
        return Response(StorySerializer(stories, many=True).data)

    def post(self, request):
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to post a story.')
        serializer = CreateStorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        story = serializer.save(author=request.user, expires_at=timezone.now() + timedelta(hours=24))
        return Response(StorySerializer(story).data, status=status.HTTP_201_CREATED)


def get_visible_short_queryset(request):
    blocked_ids = blocked_user_ids(request.user)
    return Short.objects.filter(
        author__is_active=True,
        author__profile_status='active',
    ).exclude(author_id__in=blocked_ids).select_related('author').annotate(
        likes_count=Count('likes', distinct=True),
        comments_count=Count('comments', distinct=True),
        views_count=Count('views', distinct=True),
    )


def get_visible_short(request, pk):
    short = get_object_or_404(get_visible_short_queryset(request), pk=pk)
    return short


class ShortListCreateView(APIView):
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'short-write'

    def get_throttles(self):
        return super().get_throttles() if self.request.method == 'POST' else []

    def get(self, request):
        shorts = get_visible_short_queryset(request).order_by('-created_at')[:100]
        return Response(ShortSerializer(shorts, many=True, context={'request': request}).data)

    def post(self, request):
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to post a Short.')
        serializer = CreateShortSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        short = serializer.save(author=request.user)
        short = get_visible_short_queryset(request).get(pk=short.pk)
        return Response(
            ShortSerializer(short, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class ShortDetailView(APIView):
    def get(self, request, pk):
        short = get_visible_short(request, pk)
        return Response(ShortSerializer(short, context={'request': request}).data)

    def delete(self, request, pk):
        short = get_object_or_404(Short, pk=pk, author=request.user)
        short.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ShortLikeView(APIView):
    def post(self, request, pk):
        short = get_visible_short(request, pk)
        like, created = ShortLike.objects.get_or_create(short=short, user=request.user)
        if not created:
            like.delete()
        return Response({
            'liked': created,
            'likes_count': short.likes.count(),
        })


class ShortWatchView(APIView):
    def post(self, request, pk):
        short = get_visible_short(request, pk)
        ShortView.objects.get_or_create(short=short, user=request.user)
        return Response({'views_count': short.views.count()})


class ShortCommentListCreateView(APIView):
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'short-comment'

    def get_throttles(self):
        return super().get_throttles() if self.request.method == 'POST' else []

    def get(self, request, pk):
        short = get_visible_short(request, pk)
        comments = short.comments.select_related('author').all()[:100]
        return Response(ShortCommentSerializer(comments, many=True).data)

    def post(self, request, pk):
        short = get_visible_short(request, pk)
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to comment.')
        serializer = ShortCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(short=short, author=request.user)
        return Response(ShortCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class DailyPromptView(APIView):
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'daily-prompt'

    def get(self, request):
        today = timezone.localdate()
        response = DailyPromptResponse.objects.filter(user=request.user, prompt_date=today).first()
        return Response({
            'date': today.isoformat(),
            'prompt': DAILY_PROMPTS[today.toordinal() % len(DAILY_PROMPTS)],
            'answer': response.answer if response else '',
            'answered': response is not None,
        })

    def post(self, request):
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to answer the daily prompt.')
        serializer = DailyPromptResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        today = timezone.localdate()
        response, _ = DailyPromptResponse.objects.update_or_create(
            user=request.user,
            prompt_date=today,
            defaults={'answer': serializer.validated_data['answer']},
        )
        return Response({
            'date': today.isoformat(),
            'prompt': DAILY_PROMPTS[today.toordinal() % len(DAILY_PROMPTS)],
            'answer': response.answer,
            'answered': True,
        })


class StoryDetailView(APIView):
    def delete(self, request, pk):
        story = get_object_or_404(Story, pk=pk, author=request.user)
        story.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventListCreateView(APIView):
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'event-write'

    def get_throttles(self):
        return super().get_throttles() if self.request.method == 'POST' else []

    def get(self, request):
        events = DatingEvent.objects.filter(
            starts_at__gte=timezone.now(),
            host__is_active=True,
            host__profile_status='active',
        ).exclude(host_id__in=blocked_user_ids(request.user)).select_related('host').prefetch_related('rsvps')[:100]
        return Response(DatingEventSerializer(events, many=True, context={'request': request}).data)

    def post(self, request):
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to create an event.')
        serializer = DatingEventSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        event = serializer.save()
        return Response(
            DatingEventSerializer(event, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class EventDetailView(APIView):
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'event-write'

    def get_throttles(self):
        return super().get_throttles() if self.request.method == 'POST' else []

    def get_event(self, request, pk, *, lock=False):
        queryset = DatingEvent.objects.select_related('host').prefetch_related('rsvps')
        if lock:
            queryset = DatingEvent.objects.select_for_update().select_related('host')
        event = get_object_or_404(queryset, pk=pk, starts_at__gte=timezone.now())
        if (
            event.host_id in blocked_user_ids(request.user)
            or not event.host.is_active
            or event.host.profile_status != 'active'
        ):
            raise NotFound('This event is not available.')
        return event

    def get(self, request, pk):
        event = self.get_event(request, pk)
        return Response(DatingEventSerializer(event, context={'request': request}).data)

    def post(self, request, pk):
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to RSVP.')
        with transaction.atomic():
            event = self.get_event(request, pk, lock=True)
            if event.host_id == request.user.id:
                raise ValidationError({'detail': 'You are hosting this event.'})
            existing = EventRSVP.objects.filter(event=event, user=request.user).first()
            if existing:
                existing.delete()
                attending = False
            else:
                if event.capacity is not None and event.rsvps.count() >= event.capacity:
                    raise ValidationError({'detail': 'This event is full.'})
                try:
                    EventRSVP.objects.create(event=event, user=request.user)
                except IntegrityError:
                    raise ValidationError({'detail': 'Your RSVP could not be saved. Please try again.'})
                attending = True
        event.refresh_from_db()
        return Response({
            'attending': attending,
            'attendee_count': event.rsvps.count(),
        })
