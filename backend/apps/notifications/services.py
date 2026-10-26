from django.conf import settings
from django.db import transaction

from apps.notifications.models import Notification


def create_notification(*, recipient, actor, notification_type, body, target_type='', target_id=None):
    if recipient.pk == actor.pk:
        return None
    preference_field = {
        'message': 'messages',
        'interest': 'likes',
        'match': 'likes',
        'post_interaction': 'posts',
        'comment': 'posts',
    }.get(notification_type)
    if preference_field:
        from apps.notifications.models import NotificationPreference
        preferences = NotificationPreference.objects.filter(user=recipient).first()
        if preferences and not getattr(preferences, preference_field):
            return None
    notification = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        type=notification_type,
        body=body,
        target_type=target_type,
        target_id=target_id,
    )
    transaction.on_commit(lambda: deliver_web_push(notification))
    return notification


def deliver_web_push(notification):
    if not all((settings.VAPID_PUBLIC_KEY, settings.VAPID_PRIVATE_KEY, settings.VAPID_CLAIMS_EMAIL)):
        return

    import json
    import logging

    from pywebpush import WebPushException, webpush

    from apps.notifications.models import NotificationPreference, PushSubscription

    logger = logging.getLogger(__name__)
    preferences = NotificationPreference.objects.filter(user=notification.recipient).first()
    if preferences and not preferences.push_enabled:
        return
    payload = json.dumps({
        'title': 'LinkUp',
        'body': notification.body,
        'url': '/notifications',
    })
    subscriptions = PushSubscription.objects.filter(user=notification.recipient)
    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    'endpoint': subscription.endpoint,
                    'keys': {'p256dh': subscription.p256dh, 'auth': subscription.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={'sub': f'mailto:{settings.VAPID_CLAIMS_EMAIL}'},
                ttl=60,
                timeout=5,
            )
        except WebPushException as error:
            response = getattr(error, 'response', None)
            if response is not None and response.status_code in (404, 410):
                subscription.delete()
            else:
                logger.warning('Web push delivery failed for notification %s: %s', notification.pk, error)
