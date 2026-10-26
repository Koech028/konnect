import uuid
from unittest.mock import patch

from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.livestreams.models import Gift, LiveStream, Wallet
from apps.livestreams.livekit import create_join_token


class LiveStreamApiTests(APITestCase):
    def setUp(self):
        self.host = User.objects.create_user(
            email='host@example.com',
            password='Mango!Sunrise_2026',
            display_name='Host',
            age=25,
            gender='woman',
        )
        self.viewer = User.objects.create_user(
            email='viewer@example.com',
            password='Mango!Sunrise_2026',
            display_name='Viewer',
            age=29,
            gender='man',
        )
        self.stream = LiveStream.objects.create(
            host=self.host,
            title='Say hello',
            room_name=f'linkup-{uuid.uuid4()}',
        )
        self.client.force_authenticate(self.viewer)

    @patch('apps.livestreams.views.ensure_livekit_configured')
    def test_host_can_start_a_stream_and_signed_in_users_can_list_it(self, _ensure_livekit):
        self.stream.status = LiveStream.Status.ENDED
        self.stream.save(update_fields=('status',))
        self.client.force_authenticate(self.host)
        response = self.client.post('/api/v1/live/', {'title': 'Coffee chat'}, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['title'], 'Coffee chat')
        self.client.force_authenticate(self.viewer)
        listing = self.client.get('/api/v1/live/')
        self.assertEqual(listing.status_code, 200)
        self.assertEqual([stream['id'] for stream in listing.data['results']], [response.data['id']])
        self.assertEqual(listing.data['wallet_balance'], 100)

    @patch('apps.livestreams.views.create_join_token')
    def test_viewer_gets_join_token(self, create_token):
        create_token.return_value = {'server_url': 'wss://live.example', 'token': 'signed-token'}

        response = self.client.post(f'/api/v1/live/{self.stream.id}/join/', {}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['token'], 'signed-token')
        create_token.assert_called_once_with(self.viewer, self.stream, False)

    @override_settings(
        LIVEKIT_URL='wss://live.example',
        LIVEKIT_API_KEY='lk_test',
        LIVEKIT_API_SECRET='test-secret-for-livekit-token-signing-2026',
    )
    def test_host_and_viewer_tokens_have_different_publish_permissions(self):
        from livekit import api

        verifier = api.TokenVerifier('lk_test', 'test-secret-for-livekit-token-signing-2026')
        host_claims = verifier.verify(create_join_token(self.host, self.stream, True)['token'])
        viewer_claims = verifier.verify(create_join_token(self.viewer, self.stream, False)['token'])

        self.assertTrue(host_claims.video.can_publish)
        self.assertTrue(viewer_claims.video.room_join)
        self.assertFalse(viewer_claims.video.can_publish)
        self.assertTrue(viewer_claims.video.can_subscribe)

    @override_settings(LIVEKIT_URL='', LIVEKIT_API_KEY='', LIVEKIT_API_SECRET='')
    def test_stream_cannot_start_without_livekit_configuration(self):
        self.client.force_authenticate(self.host)

        response = self.client.post('/api/v1/live/', {'title': 'Unavailable'}, format='json')

        self.assertEqual(response.status_code, 503)
        self.assertFalse(LiveStream.objects.filter(host=self.host, title='Unavailable').exists())

    def test_sending_a_gift_transfers_credits_to_the_host(self):
        response = self.client.post(
            f'/api/v1/live/{self.stream.id}/gifts/',
            {'gift_type': Gift.Type.ROSE},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['gift']['credits'], 10)
        self.assertEqual(response.data['wallet_balance'], 90)
        self.assertEqual(Wallet.objects.get(user=self.viewer).balance, 90)
        self.assertEqual(Wallet.objects.get(user=self.host).balance, 110)

    def test_gift_rejects_unknown_types_and_insufficient_balance(self):
        invalid = self.client.post(
            f'/api/v1/live/{self.stream.id}/gifts/',
            {'gift_type': []},
            format='json',
        )
        self.assertEqual(invalid.status_code, 400)

        Wallet.objects.update_or_create(user=self.viewer, defaults={'balance': 0})
        insufficient = self.client.post(
            f'/api/v1/live/{self.stream.id}/gifts/',
            {'gift_type': Gift.Type.ROSE},
            format='json',
        )
        self.assertEqual(insufficient.status_code, 400)
        self.assertEqual(Gift.objects.count(), 0)

    def test_host_cannot_gift_themselves(self):
        self.client.force_authenticate(self.host)

        response = self.client.post(
            f'/api/v1/live/{self.stream.id}/gifts/',
            {'gift_type': Gift.Type.ROSE},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Gift.objects.count(), 0)

    def test_blocked_users_cannot_view_or_join_a_stream(self):
        self.host.blocks_created.create(blocked=self.viewer)

        listing = self.client.get('/api/v1/live/')
        detail = self.client.get(f'/api/v1/live/{self.stream.id}/')

        self.assertEqual(listing.data['results'], [])
        self.assertEqual(detail.status_code, 404)

    def test_only_host_can_end_a_stream(self):
        forbidden = self.client.post(f'/api/v1/live/{self.stream.id}/end/', {}, format='json')
        self.assertEqual(forbidden.status_code, 403)

        self.client.force_authenticate(self.host)
        ended = self.client.post(f'/api/v1/live/{self.stream.id}/end/', {}, format='json')
        self.assertEqual(ended.status_code, 200)
        self.assertEqual(ended.data['status'], LiveStream.Status.ENDED)
