import uuid
from decimal import Decimal
from django.core.validators import MaxValueValidator, MinValueValidator

from django.conf import settings
from django.db import models
from django.db.models import F, Q


MAX_LIVE_ENTRY_PRICE = 100


class LiveStream(models.Model):
    class Status(models.TextChoices):
        LIVE = 'live', 'Live'
        ENDED = 'ended', 'Ended'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_streams')
    title = models.CharField(max_length=80)
    entry_price = models.PositiveSmallIntegerField(
        default=0,
        validators=(MinValueValidator(0), MaxValueValidator(MAX_LIVE_ENTRY_PRICE)),
    )
    room_name = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.LIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ('-created_at',)
        constraints = [
            models.CheckConstraint(
                condition=Q(entry_price__lte=MAX_LIVE_ENTRY_PRICE),
                name='live_entry_price_max_100',
            ),
            models.UniqueConstraint(
                fields=('host',),
                condition=Q(status='live'),
                name='one_live_stream_per_host',
            ),
        ]


class LiveStreamAdmission(models.Model):
    stream = models.ForeignKey(LiveStream, on_delete=models.CASCADE, related_name='admissions')
    viewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_admissions')
    credits_paid = models.PositiveSmallIntegerField(default=0)
    promotional_credits_paid = models.PositiveSmallIntegerField(default=0)
    purchased_credits_paid = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)
        constraints = [
            models.UniqueConstraint(fields=('stream', 'viewer'), name='unique_live_stream_admission'),
        ]


class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_wallet')
    balance = models.PositiveIntegerField(default=100)
    promotional_balance = models.PositiveIntegerField(default=100)
    purchased_balance = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(balance=F('promotional_balance') + F('purchased_balance')),
                name='wallet_balance_matches_credit_buckets',
            ),
        ]


class WalletTransaction(models.Model):
    class Type(models.TextChoices):
        STARTER_GRANT = 'starter_grant', 'Starter bonus'
        LEGACY_PROMOTIONAL = 'legacy_promotional', 'Legacy promotional balance'
        CREDIT_PURCHASE = 'credit_purchase', 'Credit purchase'
        GIFT_SPEND = 'gift_spend', 'Gift spend'
        LIVE_ENTRY = 'live_entry', 'Live entry'
        REVERSAL = 'reversal', 'Reversal'

    wallet = models.ForeignKey(Wallet, on_delete=models.PROTECT, related_name='transactions')
    transaction_type = models.CharField(max_length=32, choices=Type.choices)
    credits_delta = models.IntegerField()
    promotional_credits_delta = models.IntegerField(default=0)
    purchased_credits_delta = models.IntegerField(default=0)
    balance_after = models.PositiveIntegerField()
    amount_kes = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    reference = models.CharField(max_length=160, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)
        constraints = [
            models.CheckConstraint(
                condition=Q(
                    credits_delta=F('promotional_credits_delta') + F('purchased_credits_delta'),
                ),
                name='wallet_transaction_delta_matches_credit_buckets',
            ),
        ]


class Gift(models.Model):
    class Type(models.TextChoices):
        ROSE = 'rose', 'Rose'
        HEART = 'heart', 'Heart'
        STAR = 'star', 'Star'
        WAVE = 'wave', 'Wave'

    CREDIT_VALUES = {
        Type.ROSE: 10,
        Type.HEART: 25,
        Type.STAR: 50,
        Type.WAVE: 0,
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


class CreatorEarning(models.Model):
    class Status(models.TextChoices):
        PENDING_RECONCILIATION = 'pending_reconciliation', 'Pending payment reconciliation'
        AVAILABLE = 'available', 'Available'
        PAID = 'paid', 'Paid'
        REVERSED = 'reversed', 'Reversed'

    stream = models.ForeignKey(LiveStream, on_delete=models.PROTECT, related_name='creator_earnings')
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='live_earnings')
    gift = models.OneToOneField(Gift, on_delete=models.PROTECT, null=True, blank=True, related_name='creator_earning')
    admission = models.OneToOneField(
        LiveStreamAdmission,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='creator_earning',
    )
    eligible_credits = models.PositiveIntegerField()
    eligible_gross_kes = models.DecimalField(max_digits=12, decimal_places=2)
    creator_share_percentage = models.PositiveSmallIntegerField(default=80)
    estimated_creator_share_kes = models.DecimalField(max_digits=12, decimal_places=2)
    estimated_platform_share_kes = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING_RECONCILIATION,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(gift__isnull=False, admission__isnull=True)
                    | Q(gift__isnull=True, admission__isnull=False)
                ),
                name='creator_earning_has_one_source',
            ),
            models.CheckConstraint(
                condition=Q(creator_share_percentage=80),
                name='creator_share_fixed_at_80_percent',
            ),
        ]
