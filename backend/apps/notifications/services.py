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
    return Notification.objects.create(
        recipient=recipient,
        actor=actor,
        type=notification_type,
        body=body,
        target_type=target_type,
        target_id=target_id,
    )
