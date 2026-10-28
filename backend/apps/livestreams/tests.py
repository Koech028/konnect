import uuid
from unittest.mock import patch

from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.livestreams.models import (
    CreatorEarning,
    Gift,
    LiveStream,
    LiveStreamAdmission,
    Wallet,
    WalletTransaction,
)
from apps.livestreams.livekit import create_join_token
from apps.livestreams.wallet import grant_purchased_credits


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
        self.assertEqual(listing.data['pending_creator_earnings_kes'], '0.00')

    @patch('apps.livestreams.views.ensure_livekit_configured')
    def test_host_can_start_a_stream_without_a_topic(self, _ensure_livekit):
        self.stream.status = LiveStream.Status.ENDED
        self.stream.save(update_fields=('status',))
        self.client.force_authenticate(self.host)

        response = self.client.post('/api/v1/live/', {}, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['title'], 'Live video')

    @patch('apps.livestreams.views.ensure_livekit_configured')
    def test_host_can_set_a_paid_entry_price(self, _ensure_livekit):
        self.stream.status = LiveStream.Status.ENDED
        self.stream.save(update_fields=('status',))
        self.client.force_authenticate(self.host)

        response = self.client.post('/api/v1/live/', {
            'title': 'Ticketed conversation',
            'entry_price': 75,
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['entry_price'], 75)

    @patch('apps.livestreams.views.ensure_livekit_configured')
    def test_live_entry_price_cannot_exceed_100_credits(self, _ensure_livekit):
        self.client.force_authenticate(self.host)

        response = self.client.post('/api/v1/live/', {
            'entry_price': 101,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(LiveStream.objects.filter(host=self.host, status=LiveStream.Status.LIVE).exclude(pk=self.stream.pk).exists())

    @patch('apps.livestreams.views.create_join_token')
    def test_viewer_gets_join_token(self, create_token):
        create_token.return_value = {'server_url': 'wss://live.example', 'token': 'signed-token'}

        response = self.client.post(f'/api/v1/live/{self.stream.id}/join/', {}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['token'], 'signed-token')
        self.assertEqual(response.data['wallet_balance'], 100)
        create_token.assert_called_once_with(self.viewer, self.stream, False)

    @patch('apps.livestreams.views.create_join_token')
    def test_paid_entry_is_charged_once_without_crediting_host_wallet(self, create_token):
        create_token.return_value = {'server_url': 'wss://live.example', 'token': 'signed-token'}
        self.stream.entry_price = 40
        self.stream.save(update_fields=('entry_price',))
        viewer_wallet = Wallet.objects.create(user=self.viewer, balance=100)
        host_wallet = Wallet.objects.create(user=self.host, balance=100)

        first_join = self.client.post(f'/api/v1/live/{self.stream.id}/join/', {}, format='json')
        second_join = self.client.post(f'/api/v1/live/{self.stream.id}/join/', {}, format='json')

        self.assertEqual(first_join.status_code, 200)
        self.assertEqual(first_join.data['wallet_balance'], 60)
        self.assertEqual(second_join.status_code, 200)
        self.assertEqual(second_join.data['wallet_balance'], 60)
        viewer_wallet.refresh_from_db()
        host_wallet.refresh_from_db()
        self.assertEqual(viewer_wallet.balance, 60)
        self.assertEqual(viewer_wallet.promotional_balance, 60)
        self.assertEqual(host_wallet.balance, 100)
        admission = LiveStreamAdmission.objects.get(stream=self.stream, viewer=self.viewer)
        self.assertEqual(admission.credits_paid, 40)
        self.assertEqual(admission.promotional_credits_paid, 40)
        self.assertEqual(admission.purchased_credits_paid, 0)
        self.assertFalse(CreatorEarning.objects.filter(admission=admission).exists())

    @patch('apps.livestreams.views.create_join_token')
    def test_paid_entry_spends_bonus_first_and_records_only_paid_credit_earnings(self, create_token):
        create_token.return_value = {'server_url': 'wss://live.example', 'token': 'signed-token'}
        self.stream.entry_price = 40
        self.stream.save(update_fields=('entry_price',))
        wallet = Wallet.objects.create(
            user=self.viewer,
            balance=100,
            promotional_balance=20,
            purchased_balance=80,
        )

        response = self.client.post(f'/api/v1/live/{self.stream.id}/join/', {}, format='json')

        self.assertEqual(response.status_code, 200)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, 60)
        self.assertEqual(wallet.promotional_balance, 0)
        self.assertEqual(wallet.purchased_balance, 60)
        admission = LiveStreamAdmission.objects.get(stream=self.stream, viewer=self.viewer)
        self.assertEqual(admission.promotional_credits_paid, 20)
        self.assertEqual(admission.purchased_credits_paid, 20)
        earning = CreatorEarning.objects.get(admission=admission)
        self.assertEqual(earning.eligible_credits, 20)
        self.assertEqual(earning.estimated_creator_share_kes, 8)
        self.assertEqual(earning.estimated_platform_share_kes, 2)

    @patch('apps.livestreams.views.create_join_token')
    def test_paid_entry_rejects_insufficient_balance_without_charging(self, create_token):
        create_token.return_value = {'server_url': 'wss://live.example', 'token': 'signed-token'}
        self.stream.entry_price = 40
        self.stream.save(update_fields=('entry_price',))
        wallet = Wallet.objects.create(user=self.viewer, balance=20, promotional_balance=20)

        response = self.client.post(f'/api/v1/live/{self.stream.id}/join/', {}, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('costs 40 credits', response.data['detail'])
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, 20)
        self.assertFalse(LiveStreamAdmission.objects.filter(stream=self.stream, viewer=self.viewer).exists())

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

    def test_sending_a_gift_spends_credits_without_crediting_host_wallet(self):
        response = self.client.post(
            f'/api/v1/live/{self.stream.id}/gifts/',
            {'gift_type': Gift.Type.ROSE},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['gift']['credits'], 10)
        self.assertEqual(response.data['wallet_balance'], 90)
        sender_wallet = Wallet.objects.get(user=self.viewer)
        self.assertEqual(sender_wallet.balance, 90)
        self.assertEqual(sender_wallet.promotional_balance, 90)
        self.assertFalse(Wallet.objects.filter(user=self.host).exists())
        self.assertFalse(CreatorEarning.objects.filter(gift__stream=self.stream).exists())

    def test_purchased_credit_gift_records_pending_creator_earning(self):
        wallet = Wallet.objects.create(
            user=self.viewer,
            balance=100,
            promotional_balance=0,
            purchased_balance=100,
        )

        response = self.client.post(
            f'/api/v1/live/{self.stream.id}/gifts/',
            {'gift_type': Gift.Type.ROSE},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, 90)
        self.assertEqual(wallet.purchased_balance, 90)
        earning = CreatorEarning.objects.get(gift_id=response.data['gift']['id'])
        self.assertEqual(earning.eligible_credits, 10)
        self.assertEqual(earning.eligible_gross_kes, 5)
        self.assertEqual(earning.estimated_creator_share_kes, 4)
        self.assertEqual(earning.estimated_platform_share_kes, 1)
        self.assertEqual(earning.status, CreatorEarning.Status.PENDING_RECONCILIATION)
        self.client.force_authenticate(self.host)
        wallet_summary = self.client.get('/api/v1/live/wallet/')
        self.assertEqual(wallet_summary.data['pending_creator_earnings_kes'], '4.00')

    def test_wave_gift_is_free(self):
        response = self.client.post(
            f'/api/v1/live/{self.stream.id}/gifts/',
            {'gift_type': Gift.Type.WAVE},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['gift']['credits'], 0)
        self.assertEqual(response.data['wallet_balance'], 100)
        self.assertFalse(CreatorEarning.objects.filter(gift__stream=self.stream).exists())

    def test_gift_rejects_unknown_types_and_insufficient_balance(self):
        invalid = self.client.post(
            f'/api/v1/live/{self.stream.id}/gifts/',
            {'gift_type': []},
            format='json',
        )
        self.assertEqual(invalid.status_code, 400)

        Wallet.objects.update_or_create(
            user=self.viewer,
            defaults={'balance': 0, 'promotional_balance': 0, 'purchased_balance': 0},
        )
        insufficient = self.client.post(
            f'/api/v1/live/{self.stream.id}/gifts/',
            {'gift_type': Gift.Type.ROSE},
            format='json',
        )
        self.assertEqual(insufficient.status_code, 400)
        self.assertEqual(Gift.objects.count(), 0)

    def test_wallet_exposes_balances_but_disables_checkout_and_withdrawals(self):
        response = self.client.get('/api/v1/live/wallet/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['balance'], 100)
        self.assertEqual(response.data['promotional_balance'], 100)
        self.assertEqual(response.data['purchased_balance'], 0)
        self.assertEqual(response.data['pending_creator_earnings_kes'], '0.00')
        self.assertFalse(response.data['checkout_enabled'])
        self.assertFalse(response.data['withdrawals_enabled'])
        self.assertEqual(response.data['credit_bundles'][0]['credits'], 100)

    def test_purchased_credit_grant_is_idempotent_by_payment_reference(self):
        first_wallet, created = grant_purchased_credits(self.viewer, 100, '50.00', 'sandbox-payment-123')
        second_wallet, created_again = grant_purchased_credits(
            self.viewer,
            100,
            '50.00',
            'sandbox-payment-123',
        )

        self.assertTrue(created)
        self.assertFalse(created_again)
        self.assertEqual(first_wallet.pk, second_wallet.pk)
        self.assertEqual(second_wallet.balance, 200)
        self.assertEqual(second_wallet.promotional_balance, 100)
        self.assertEqual(second_wallet.purchased_balance, 100)
        self.assertEqual(
            WalletTransaction.objects.filter(reference='sandbox-payment-123').count(),
            1,
        )

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
