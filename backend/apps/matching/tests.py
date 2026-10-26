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
