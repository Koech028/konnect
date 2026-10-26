from datetime import timedelta

from django.conf import settings
from rest_framework.exceptions import APIException


class LiveKitUnavailable(APIException):
    status_code = 503
    default_detail = 'Live streaming is not configured yet. Please try again later.'
    default_code = 'livekit_unavailable'


def ensure_livekit_configured():
    if not settings.LIVEKIT_URL or not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET:
        raise LiveKitUnavailable()


def create_join_token(user, stream, is_host):
    ensure_livekit_configured()

    from livekit import api

    grants = api.VideoGrants(
        room_join=True,
        room=stream.room_name,
        can_publish=is_host,
        can_subscribe=True,
        can_publish_data=True,
    )
    token = (
        api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
        .with_identity(str(user.id))
        .with_name(user.display_name)
        .with_ttl(timedelta(hours=2))
        .with_grants(grants)
        .to_jwt()
    )
    return {'server_url': settings.LIVEKIT_URL, 'token': token}
