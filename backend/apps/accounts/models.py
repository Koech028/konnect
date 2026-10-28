import uuid

from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.functions import Lower


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('An email address is required.')
        user = self.model(email=self.normalize_email(email).lower(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        if not extra_fields['is_staff'] or not extra_fields['is_superuser']:
            raise ValueError('A superuser must have is_staff=True and is_superuser=True.')
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    objects = UserManager()

    class Gender(models.TextChoices):
        WOMAN = 'woman', 'Woman'
        MAN = 'man', 'Man'
        NON_BINARY = 'non_binary', 'Non-binary'
        OTHER = 'other', 'Other'

    class VerificationStatus(models.TextChoices):
        NOT_STARTED = 'not_started', 'Not started'
        PENDING = 'pending', 'Pending'
        VERIFIED = 'verified', 'Verified'
        REJECTED = 'rejected', 'Rejected'

    class ProfileStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        HIDDEN = 'hidden', 'Hidden'

    class SubscriptionTier(models.TextChoices):
        FREE = 'free', 'Free'
        PREMIUM = 'premium', 'Premium'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=40)
    age = models.PositiveSmallIntegerField(validators=[MinValueValidator(18), MaxValueValidator(100)])
    gender = models.CharField(max_length=20, choices=Gender.choices)
    bio = models.CharField(max_length=500, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True, default='Kenya')
    avatar_url = models.URLField(blank=True)
    cover_image_url = models.URLField(blank=True)
    referral_code = models.CharField(max_length=32, unique=True, blank=True)
    referred_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referred_users',
    )
    interests = models.JSONField(default=list, blank=True)
    preferences = models.JSONField(default=dict, blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.NOT_STARTED,
    )
    profile_status = models.CharField(
        max_length=20,
        choices=ProfileStatus.choices,
        default=ProfileStatus.ACTIVE,
    )
    subscription_tier = models.CharField(max_length=20, choices=SubscriptionTier.choices, default=SubscriptionTier.FREE)
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower('email'), name='unique_user_email_case_insensitive'),
        ]

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['age']

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        if not self.referral_code:
            self.referral_code = uuid.uuid4().hex
        super().save(*args, **kwargs)
