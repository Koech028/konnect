import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


def default_story_expiry():
    return timezone.now() + timedelta(hours=24)


class Story(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stories')
    text = models.CharField(max_length=300, blank=True)
    image_url = models.URLField(blank=True)
    video_url = models.URLField(blank=True)
    video_duration_seconds = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=default_story_expiry, db_index=True)

    class Meta:
        ordering = ('-created_at',)


class Short(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shorts')
    caption = models.CharField(max_length=300, blank=True)
    video_url = models.URLField()
    duration_seconds = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)


class ShortLike(models.Model):
    short = models.ForeignKey(Short, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='short_likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=('short', 'user'), name='unique_short_like'),
        ]


class ShortView(models.Model):
    short = models.ForeignKey(Short, on_delete=models.CASCADE, related_name='views')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='short_views')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=('short', 'user'), name='unique_short_view'),
        ]


class ShortComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    short = models.ForeignKey(Short, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='short_comments')
    text = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('created_at',)


class DailyPromptResponse(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_prompt_responses')
    prompt_date = models.DateField()
    answer = models.CharField(max_length=400)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-prompt_date',)
        constraints = [
            models.UniqueConstraint(fields=('user', 'prompt_date'), name='unique_daily_prompt_response'),
        ]


class DatingEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dating_events')
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=1000, blank=True)
    location = models.CharField(max_length=200)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    capacity = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('starts_at',)


class ActivityOffer(models.Model):
    class Category(models.TextChoices):
        HANGOUT = 'hangout', 'Hangout'
        SERVICE = 'service', 'Service'

    class LunchExpectation(models.TextChoices):
        NO_EXPECTATION = 'no_expectation', 'No lunch expectation'
        OPTIONAL = 'optional', 'Lunch is optional'
        GUEST_PAYS = 'guest_pays', 'Guest is expected to pay for lunch'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activity_offers')
    category = models.CharField(max_length=20, choices=Category.choices)
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=1000, blank=True)
    city = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    image_url = models.URLField(blank=True)
    activities = models.JSONField(default=list, blank=True)
    boundaries = models.CharField(max_length=1000)
    price_ksh = models.PositiveIntegerField(default=0)
    lunch_expectation = models.CharField(max_length=24, choices=LunchExpectation.choices)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('starts_at',)
        indexes = [
            models.Index(fields=('is_active', 'city', 'category', 'starts_at')),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(ends_at__gt=models.F('starts_at')), name='activity_offer_end_after_start'),
        ]


class OfferConversation(models.Model):
    offer = models.ForeignKey(
        ActivityOffer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations',
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='offer_conversations_started',
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='offer_conversations_received',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)
        constraints = [
            models.UniqueConstraint(fields=('offer', 'requester'), name='unique_offer_requester_conversation'),
            models.CheckConstraint(condition=~models.Q(requester=models.F('host')), name='offer_conversation_different_users'),
        ]


class OfferMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(OfferConversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='offer_messages_sent')
    text = models.CharField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ('created_at',)


class EventRSVP(models.Model):
    event = models.ForeignKey(DatingEvent, on_delete=models.CASCADE, related_name='rsvps')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='event_rsvps')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('created_at',)
        constraints = [
            models.UniqueConstraint(fields=('event', 'user'), name='unique_event_rsvp'),
        ]
