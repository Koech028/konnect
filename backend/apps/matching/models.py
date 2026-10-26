import uuid

from django.conf import settings
from django.db import models
from django.db.models import F, Q


class UserLike(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes_sent')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes_received')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=('sender', 'recipient'), name='unique_user_like'),
            models.CheckConstraint(condition=~Q(sender=F('recipient')), name='user_cannot_like_self'),
        ]
        ordering = ('-created_at',)


class Match(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_one = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='matches_as_one')
    user_two = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='matches_as_two')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=('user_one', 'user_two'), name='unique_match_pair'),
            models.CheckConstraint(condition=Q(user_one__lt=F('user_two')), name='match_users_sorted'),
        ]
        ordering = ('-created_at',)

    @classmethod
    def create_for_users(cls, first, second):
        user_one, user_two = sorted((first, second), key=lambda user: str(user.pk))
        return cls.objects.get_or_create(user_one=user_one, user_two=user_two)

    def includes(self, user):
        return user.pk in (self.user_one_id, self.user_two_id)

    def other_user(self, user):
        return self.user_two if self.user_one_id == user.pk else self.user_one
