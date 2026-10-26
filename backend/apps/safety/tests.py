from rest_framework.test import APITestCase

from apps.accounts.models import User


class SafetyApiTests(APITestCase):
    def setUp(self):
        self.reporter = User.objects.create_user(
            email='reporter@example.com',
            password='Mango!Sunrise_2026',
            display_name='Reporter',
            age=25,
            gender='woman',
        )
        self.target = User.objects.create_user(
            email='target@example.com',
            password='Mango!Sunrise_2026',
            display_name='Target',
            age=29,
            gender='man',
        )
        self.client.force_authenticate(self.reporter)

    def test_block_hides_profile_and_removes_likes(self):
        self.client.post('/api/v1/likes/', {'user_id': str(self.target.id)}, format='json')
        block = self.client.post('/api/v1/safety/blocks/', {'user_id': str(self.target.id)}, format='json')
        self.assertEqual(block.status_code, 201)

        profile = self.client.get(f'/api/v1/profiles/{self.target.id}/')
        self.assertEqual(profile.status_code, 404)
        likes = self.client.get('/api/v1/likes/outgoing/')
        self.assertEqual(likes.data, [])

    def test_report_is_stored_as_open(self):
        response = self.client.post('/api/v1/safety/reports/', {
            'reported_user_id': str(self.target.id),
            'reason': 'fake_profile',
            'details': 'The profile details appear inconsistent.',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'open')
        self.assertEqual(response.data['reported_user']['id'], str(self.target.id))
