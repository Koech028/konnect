import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        MATCH = 'match', 'Match'
        MESSAGE = 'message', 'Message'
        INTEREST = 'interest', 'Interest'
        POST_INTERACTION = 'post_interaction', 'Post interaction'
        COMMENT = 'comment', 'Comment'
        VERIFICATION = 'verification', 'Verification'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications_sent',
    )
    type = models.CharField(max_length=30, choices=Type.choices)
    body = models.CharField(max_length=255)
    target_type = models.CharField(max_length=30, blank=True)
    target_id = models.UUIDField(null=True, blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)


class NotificationPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preferences')
    messages = models.BooleanField(default=True)
    likes = models.BooleanField(default=True)
    posts = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)


class PushSubscription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.URLField(max_length=2048, unique=True)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
