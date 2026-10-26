from unittest.mock import patch

from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.notifications.models import PushSubscription
from apps.notifications.services import deliver_web_push


class PushNotificationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='push@example.com',
            password='Mango!Sunrise_2026',
            display_name='Push User',
            age=25,
            gender='woman',
        )
        self.other = User.objects.create_user(
            email='push-other@example.com',
            password='Mango!Sunrise_2026',
            display_name='Other User',
            age=27,
            gender='man',
        )
        self.client.force_authenticate(self.user)
        self.subscription = {
            'endpoint': 'https://fcm.googleapis.com/subscriptions/abc',
            'keys': {'p256dh': 'public-key', 'auth': 'auth-secret'},
        }

    def test_subscription_is_owned_by_the_current_account(self):
        created = self.client.post('/api/v1/settings/push/subscription/', self.subscription, format='json')
        self.assertEqual(created.status_code, 201)
        self.assertEqual(PushSubscription.objects.get().user, self.user)
        self.assertTrue(self.client.get('/api/v1/settings/push/subscription/').data['subscribed'])

        self.client.force_authenticate(self.other)
        conflict = self.client.post('/api/v1/settings/push/subscription/', self.subscription, format='json')
        self.assertEqual(conflict.status_code, 409)

        self.client.force_authenticate(self.user)
        removed = self.client.delete(
            '/api/v1/settings/push/subscription/',
            {'endpoint': self.subscription['endpoint']},
            format='json',
        )
        self.assertEqual(removed.status_code, 204)
        self.assertFalse(PushSubscription.objects.exists())

    def test_push_config_exposes_only_the_public_key(self):
        with override_settings(VAPID_PUBLIC_KEY='public-vapid-key', VAPID_PRIVATE_KEY='private-vapid-key'):
            response = self.client.get('/api/v1/settings/push/config/')

        self.assertEqual(response.data, {'public_key': 'public-vapid-key'})
        self.assertNotIn('private_key', response.data)

    def test_push_endpoint_cannot_target_arbitrary_urls(self):
        response = self.client.post('/api/v1/settings/push/subscription/', {
            **self.subscription,
            'endpoint': 'https://127.0.0.1/admin/',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(PushSubscription.objects.exists())

    @override_settings(
        VAPID_PUBLIC_KEY='public-vapid-key',
        VAPID_PRIVATE_KEY='private-vapid-key',
        VAPID_CLAIMS_EMAIL='support@example.com',
    )
    @patch('pywebpush.webpush')
    def test_push_delivery_sends_a_notification_to_saved_subscriptions(self, webpush):
        PushSubscription.objects.create(
            user=self.user,
            endpoint=self.subscription['endpoint'],
            p256dh=self.subscription['keys']['p256dh'],
            auth=self.subscription['keys']['auth'],
        )
        from apps.notifications.models import Notification
        notification = Notification.objects.create(
            recipient=self.user,
            type='message',
            body='A new message arrived.',
            target_type='match',
        )

        deliver_web_push(notification)

        self.assertEqual(webpush.call_count, 1)
        self.assertEqual(webpush.call_args.kwargs['vapid_private_key'], 'private-vapid-key')
