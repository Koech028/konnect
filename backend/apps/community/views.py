from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, OuterRef, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status, throttling
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.community.models import (
    ActivityOffer,
    DailyPromptResponse,
    DatingEvent,
    EventRSVP,
    OfferConversation,
    OfferMessage,
    Short,
    ShortComment,
    ShortLike,
    ShortView,
    Story,
)
from apps.community.serializers import (
    ActivityOfferSerializer,
    CreateShortSerializer,
    CreateStorySerializer,
    DailyPromptResponseSerializer,
    DatingEventSerializer,
    OfferConversationSerializer,
    OfferMessageSerializer,
    ShortCommentSerializer,
    ShortSerializer,
    StorySerializer,
)
from apps.matching.models import Follow
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
        following_by_me=Exists(Follow.objects.filter(
            follower=request.user,
            following_id=OuterRef('author_id'),
        )),
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


class ActivityOfferListCreateView(APIView):
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'offer-write'

    def get_throttles(self):
        return super().get_throttles() if self.request.method == 'POST' else []

    def get(self, request):
        offers = ActivityOffer.objects.filter(
            is_active=True,
            starts_at__gte=timezone.now(),
            host__is_active=True,
            host__profile_status='active',
        ).exclude(host_id__in=blocked_user_ids(request.user)).select_related('host')
        city = request.query_params.get('city', '').strip()
        if city:
            offers = offers.filter(city__iexact=city)
        category = request.query_params.get('category', '').strip()
        if category:
            if category not in ActivityOffer.Category.values:
                raise ValidationError({'category': 'Choose hangout or service.'})
            offers = offers.filter(category=category)
        price = request.query_params.get('price', '').strip()
        if price == 'free':
            offers = offers.filter(price_ksh=0)
        elif price == 'paid':
            offers = offers.filter(price_ksh__gt=0)
        elif price:
            raise ValidationError({'price': 'Choose free or paid.'})
        date = request.query_params.get('date', '').strip()
        if date:
            selected_date = parse_date(date)
            if selected_date is None:
                raise ValidationError({'date': 'Use YYYY-MM-DD.'})
            offers = offers.filter(starts_at__date=selected_date)
        return Response(ActivityOfferSerializer(offers[:100], many=True, context={'request': request}).data)

    def post(self, request):
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to publish an offer.')
        serializer = ActivityOfferSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        offer = serializer.save()
        return Response(
            ActivityOfferSerializer(offer, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class ActivityOfferDetailView(APIView):
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'offer-write'

    def get_throttles(self):
        return super().get_throttles() if self.request.method in ('PATCH', 'DELETE') else []

    def get(self, request, pk):
        offer = get_object_or_404(
            ActivityOffer.objects.select_related('host'),
            pk=pk,
            is_active=True,
            starts_at__gte=timezone.now(),
            host__is_active=True,
            host__profile_status='active',
        )
        if offer.host_id in blocked_user_ids(request.user):
            raise NotFound('This offer is not available.')
        return Response(ActivityOfferSerializer(offer, context={'request': request}).data)

    def patch(self, request, pk):
        offer = get_object_or_404(ActivityOffer, pk=pk, host=request.user, is_active=True)
        serializer = ActivityOfferSerializer(
            offer,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        offer = serializer.save()
        return Response(ActivityOfferSerializer(offer, context={'request': request}).data)

    def delete(self, request, pk):
        offer = get_object_or_404(ActivityOffer, pk=pk, host=request.user, is_active=True)
        offer.is_active = False
        offer.save(update_fields=('is_active', 'updated_at'))
        return Response(status=status.HTTP_204_NO_CONTENT)


class OfferConversationListView(APIView):
    def get(self, request):
        blocked_ids = blocked_user_ids(request.user)
        conversations = OfferConversation.objects.filter(
            Q(requester=request.user) | Q(host=request.user),
        ).exclude(
            Q(requester_id__in=blocked_ids) | Q(host_id__in=blocked_ids),
        ).select_related('offer', 'requester', 'host').prefetch_related('messages')[:100]
        return Response(OfferConversationSerializer(
            conversations,
            many=True,
            context={'request': request},
        ).data)


class OfferConversationDetailView(APIView):
    def get(self, request, pk):
        conversation = get_object_or_404(
            OfferConversation.objects.select_related('offer', 'requester', 'host'),
            pk=pk,
        )
        if request.user.id not in (conversation.requester_id, conversation.host_id):
            raise NotFound('Conversation not found.')
        other_user_id = (
            conversation.host_id
            if request.user.id == conversation.requester_id
            else conversation.requester_id
        )
        if other_user_id in blocked_user_ids(request.user):
            raise NotFound('Conversation not found.')
        return Response(OfferConversationSerializer(
            conversation,
            context={'request': request},
        ).data)


class OfferMessageView(APIView):
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'offer-message'

    def get_conversation(self, request, pk):
        conversation = get_object_or_404(
            OfferConversation.objects.select_related('offer', 'requester', 'host'),
            pk=pk,
        )
        if request.user.id not in (conversation.requester_id, conversation.host_id):
            raise NotFound('Conversation not found.')
        other_user_id = (
            conversation.host_id
            if request.user.id == conversation.requester_id
            else conversation.requester_id
        )
        if other_user_id in blocked_user_ids(request.user):
            raise NotFound('Conversation not found.')
        return conversation

    def get(self, request, pk):
        conversation = self.get_conversation(request, pk)
        OfferMessage.objects.filter(
            conversation=conversation,
        ).exclude(sender=request.user).filter(read_at__isnull=True).update(read_at=timezone.now())
        messages = conversation.messages.select_related('sender')
        return Response(OfferMessageSerializer(messages, many=True).data)

    def post(self, request, pk):
        conversation = self.get_conversation(request, pk)
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to send messages.')
        serializer = OfferMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(conversation=conversation, sender=request.user)
        conversation.save(update_fields=('updated_at',))
        recipient = conversation.host if request.user.id == conversation.requester_id else conversation.requester
        from apps.notifications.services import create_notification
        create_notification(
            recipient=recipient,
            actor=request.user,
            notification_type='message',
            body=f'{request.user.display_name} sent you a message about {conversation.offer.title if conversation.offer else "an offer"}.',
            target_type='offer_conversation',
            target_id=conversation.id,
        )
        return Response(OfferMessageSerializer(message).data, status=status.HTTP_201_CREATED)


class StartOfferConversationView(APIView):
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'offer-message'

    def post(self, request, offer_id):
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to send messages.')
        offer = get_object_or_404(
            ActivityOffer.objects.select_related('host'),
            pk=offer_id,
            is_active=True,
            starts_at__gte=timezone.now(),
            host__is_active=True,
            host__profile_status='active',
        )
        if offer.host_id == request.user.id:
            raise ValidationError({'detail': 'You cannot message yourself about your offer.'})
        if offer.host_id in blocked_user_ids(request.user):
            raise NotFound('This offer is not available.')
        serializer = OfferMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation, _created = OfferConversation.objects.get_or_create(
            offer=offer,
            requester=request.user,
            defaults={'host': offer.host},
        )
        message = serializer.save(conversation=conversation, sender=request.user)
        conversation.save(update_fields=('updated_at',))
        from apps.notifications.services import create_notification
        create_notification(
            recipient=offer.host,
            actor=request.user,
            notification_type='message',
            body=f'{request.user.display_name} messaged you about {offer.title}.',
            target_type='offer_conversation',
            target_id=conversation.id,
        )
        return Response({
            'conversation': OfferConversationSerializer(
                conversation,
                context={'request': request},
            ).data,
            'message': OfferMessageSerializer(message).data,
        }, status=status.HTTP_201_CREATED)
