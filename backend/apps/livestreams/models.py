import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class LiveStream(models.Model):
    class Status(models.TextChoices):
        LIVE = 'live', 'Live'
        ENDED = 'ended', 'Ended'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_streams')
    title = models.CharField(max_length=80)
    room_name = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.LIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ('-created_at',)
        constraints = [
            models.UniqueConstraint(
                fields=('host',),
                condition=Q(status='live'),
                name='one_live_stream_per_host',
            ),
        ]


class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_wallet')
    balance = models.PositiveIntegerField(default=100)
    updated_at = models.DateTimeField(auto_now=True)


class Gift(models.Model):
    class Type(models.TextChoices):
        ROSE = 'rose', 'Rose'
        HEART = 'heart', 'Heart'
        STAR = 'star', 'Star'

    CREDIT_VALUES = {
        Type.ROSE: 10,
        Type.HEART: 25,
        Type.STAR: 50,
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stream = models.ForeignKey(LiveStream, on_delete=models.CASCADE, related_name='gifts')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_gifts_sent')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_gifts_received')
    gift_type = models.CharField(max_length=10, choices=Type.choices)
    credits = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)
