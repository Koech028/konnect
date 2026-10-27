import uuid

from django.conf import settings
from django.db import models
from django.db.models import F, Q


class Block(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blocker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blocks_created')
    blocked = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blocks_received')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=('blocker', 'blocked'), name='unique_user_block'),
            models.CheckConstraint(condition=~Q(blocker=F('blocked')), name='user_cannot_block_self'),
        ]
        ordering = ('-created_at',)


class Report(models.Model):
    class Reason(models.TextChoices):
        SPAM = 'spam', 'Spam or scam'
        INAPPROPRIATE = 'inappropriate', 'Inappropriate content'
        FAKE = 'fake_profile', 'Fake profile'
        HARASSMENT = 'harassment', 'Harassment or abuse'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        REVIEWING = 'reviewing', 'Reviewing'
        CLOSED = 'closed', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports_made')
    reported_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports_received')
    reason = models.CharField(max_length=30, choices=Reason.choices)
    details = models.CharField(max_length=1000, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)


class ContentReport(models.Model):
    class Reason(models.TextChoices):
        SPAM = 'spam', 'Spam or scam'
        INAPPROPRIATE = 'inappropriate', 'Inappropriate content'
        HARASSMENT = 'harassment', 'Harassment or abuse'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        REVIEWING = 'reviewing', 'Reviewing'
        CLOSED = 'closed', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='content_reports_made',
    )
    short = models.ForeignKey(
        'community.Short',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reports',
    )
    comment = models.ForeignKey(
        'community.ShortComment',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reports',
    )
    reason = models.CharField(max_length=30, choices=Reason.choices)
    details = models.CharField(max_length=1000, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(short__isnull=False, comment__isnull=True)
                    | Q(short__isnull=True, comment__isnull=False)
                ),
                name='content_report_has_one_target',
            ),
            models.UniqueConstraint(
                fields=('reporter', 'short'),
                condition=Q(short__isnull=False),
                name='unique_short_report_per_user',
            ),
            models.UniqueConstraint(
                fields=('reporter', 'comment'),
                condition=Q(comment__isnull=False),
                name='unique_comment_report_per_user',
            ),
        ]
