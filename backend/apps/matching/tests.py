from datetime import timedelta
from urllib.parse import quote

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.matching.models import Match


class MatchingApiTests(APITestCase):
    def setUp(self):
        self.first = User.objects.create_user(
            email='first@example.com',
            password='Mango!Sunrise_2026',
            display_name='First',
            age=25,
            gender='woman',
        )
        self.second = User.objects.create_user(
            email='second@example.com',
            password='Mango!Sunrise_2026',
            display_name='Second',
            age=27,
            gender='man',
        )

    def test_reciprocal_likes_create_one_match(self):
        self.client.force_authenticate(self.first)
        first_like = self.client.post('/api/v1/likes/', {'user_id': str(self.second.id)}, format='json')
        self.assertEqual(first_like.status_code, 201)
        self.assertFalse(first_like.data['is_match'])

        self.client.force_authenticate(self.second)
        second_like = self.client.post('/api/v1/likes/', {'user_id': str(self.first.id)}, format='json')
        self.assertEqual(second_like.status_code, 201)
        self.assertTrue(second_like.data['is_match'])
        self.assertEqual(Match.objects.count(), 1)

        matches = self.client.get('/api/v1/matches/')
        self.assertEqual(matches.status_code, 200)
        self.assertEqual(matches.data['count'], 1)
        self.assertEqual(matches.data['results'][0]['user']['id'], str(self.first.id))

        match_id = matches.data['results'][0]['id']
        self.client.force_authenticate(self.first)
        sent = self.client.post(
            f'/api/v1/matches/{match_id}/messages/',
            {'text': 'Hello from the API'},
            format='json',
        )
        self.assertEqual(sent.status_code, 201)

        self.client.force_authenticate(self.second)
        received = self.client.get(f'/api/v1/matches/{match_id}/messages/')
        self.assertEqual(received.status_code, 200)
        self.assertEqual(received.data[0]['text'], 'Hello from the API')
        self.assertIsNotNone(received.data[0]['read_at'])

        self.client.force_authenticate(self.first)
        sent_message = self.client.get(f'/api/v1/matches/{match_id}/messages/')
        self.assertIsNotNone(sent_message.data[0]['read_at'])
        cursor = (
            parse_datetime(sent_message.data[0]['created_at']) + timedelta(seconds=1)
        ).isoformat()
        from apps.messaging.models import Message
        Message.objects.filter(pk=sent.data['id']).update(read_at=timezone.now() + timedelta(seconds=2))
        receipt_update = self.client.get(
            f'/api/v1/matches/{match_id}/messages/?after={quote(cursor)}',
        )
        self.assertEqual([item['id'] for item in receipt_update.data], [sent.data['id']])

    def test_message_activity_reports_typing_and_respects_match_permissions(self):
        match, _ = Match.create_for_users(self.first, self.second)
        self.client.force_authenticate(self.first)
        typing = self.client.post(
            f'/api/v1/matches/{match.id}/messages/activity/',
            {'typing': True},
            format='json',
        )
        self.assertEqual(typing.status_code, 200)
        self.assertFalse(typing.data['other_user_typing'])

        self.client.force_authenticate(self.second)
        activity = self.client.get(f'/api/v1/matches/{match.id}/messages/activity/')
        self.assertTrue(activity.data['other_user_typing'])

        self.client.force_authenticate(self.first)
        cleared = self.client.post(
            f'/api/v1/matches/{match.id}/messages/activity/',
            {'typing': False},
            format='json',
        )
        self.assertFalse(cleared.data['other_user_typing'])
        self.client.force_authenticate(self.second)
        activity = self.client.get(f'/api/v1/matches/{match.id}/messages/activity/')
        self.assertFalse(activity.data['other_user_typing'])
