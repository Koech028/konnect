import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import EmailVerificationCode

CODE_LIFETIME = timedelta(minutes=10)
CODE_RESEND_DELAY = timedelta(seconds=60)
MAX_CODE_ATTEMPTS = 5


def has_recent_code(user, purpose):
    return EmailVerificationCode.objects.filter(
        user=user,
        purpose=purpose,
        created_at__gte=timezone.now() - CODE_RESEND_DELAY,
    ).exists()


def send_email_code(user, purpose):
    code = f'{secrets.randbelow(1_000_000):06d}'
    now = timezone.now()
    EmailVerificationCode.objects.filter(
        user=user,
        purpose=purpose,
        consumed_at__isnull=True,
    ).update(consumed_at=now)
    EmailVerificationCode.objects.create(
        user=user,
        purpose=purpose,
        code_hash=make_password(code),
        expires_at=now + CODE_LIFETIME,
    )

    if purpose == EmailVerificationCode.Purpose.SIGNUP:
        subject = 'Verify your LinkUp email'
        purpose_text = 'verify your email address'
    else:
        subject = 'Your LinkUp password reset code'
        purpose_text = 'reset your password'

    send_mail(
        subject=subject,
        message=(
            f'Your LinkUp verification code is {code}.\n\n'
            f'Enter this code to {purpose_text}. It expires in 10 minutes. '
            'If you did not request this, you can ignore this email.'
        ),
        from_email=None,
        recipient_list=[user.email],
        fail_silently=False,
    )


def consume_email_code(user, purpose, submitted_code):
    with transaction.atomic():
        challenge = EmailVerificationCode.objects.select_for_update().filter(
            user=user,
            purpose=purpose,
            consumed_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).order_by('-created_at').first()
        if challenge is None or challenge.attempts >= MAX_CODE_ATTEMPTS:
            return False

        if not check_password(submitted_code, challenge.code_hash):
            challenge.attempts += 1
            if challenge.attempts >= MAX_CODE_ATTEMPTS:
                challenge.consumed_at = timezone.now()
            challenge.save(update_fields=('attempts', 'consumed_at'))
            return False

        challenge.consumed_at = timezone.now()
        challenge.save(update_fields=('consumed_at',))
        return True
