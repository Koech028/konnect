from rest_framework import serializers
from urllib.parse import urlsplit


class PushSubscriptionSerializer(serializers.Serializer):
    endpoint = serializers.URLField(max_length=2048)
    keys = serializers.DictField()

    def validate(self, attrs):
        endpoint = urlsplit(attrs['endpoint'])
        host = (endpoint.hostname or '').lower().rstrip('.')
        try:
            port = endpoint.port
        except ValueError as error:
            raise serializers.ValidationError({'endpoint': 'Choose a valid browser push endpoint.'}) from error
        allowed_hosts = {
            'fcm.googleapis.com',
            'updates.push.services.mozilla.com',
            'push.services.mozilla.com',
            'web.push.apple.com',
        }
        allowed = host in allowed_hosts or host.endswith('.notify.windows.com')
        if (
            endpoint.scheme != 'https'
            or port not in (None, 443)
            or endpoint.username is not None
            or endpoint.password is not None
            or not allowed
        ):
            raise serializers.ValidationError({
                'endpoint': 'Use a supported HTTPS browser push service endpoint.'
            })
        keys = attrs['keys']
        p256dh = keys.get('p256dh')
        auth = keys.get('auth')
        if not isinstance(p256dh, str) or not p256dh or len(p256dh) > 200:
            raise serializers.ValidationError({'keys': {'p256dh': 'A valid browser encryption key is required.'}})
        if not isinstance(auth, str) or not auth or len(auth) > 100:
            raise serializers.ValidationError({'keys': {'auth': 'A valid browser authentication key is required.'}})
        attrs['p256dh'] = p256dh
        attrs['auth'] = auth
        return attrs
