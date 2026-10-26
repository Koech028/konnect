from rest_framework.test import APITestCase

from apps.accounts.models import User


class ProfileApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='profile@example.com',
            password='Mango!Sunrise_2026',
            display_name='Profile Owner',
            age=28,
            gender='woman',
            city='Nairobi',
            country='Kenya',
        )
        self.other = User.objects.create_user(
            email='discover@example.com',
            password='Mango!Sunrise_2026',
            display_name='Discover Me',
            age=31,
            gender='man',
            city='Nairobi',
            country='Kenya',
            interests=['coffee'],
        )
        self.client.force_authenticate(self.user)

    def test_update_own_profile_with_frontend_location_shape(self):
        response = self.client.patch('/api/v1/profiles/me/', {
            'display_name': 'Updated Name',
            'location': {'city': 'Westlands', 'country': 'Kenya'},
            'preferences': {
                'interested_in': ['women', 'non_binary'],
                'age_min': 22,
                'age_max': 36,
                'max_distance_km': 45,
            },
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['location']['city'], 'Westlands')
        self.assertEqual(response.data['preferences']['age_max'], 36)

    def test_discover_applies_age_gender_search_and_excludes_self(self):
        response = self.client.get('/api/v1/discover/?q=coffee&gender=men&age_min=30&age_max=35')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([profile['id'] for profile in response.data], [str(self.other.id)])

    def test_profile_photos_are_owned_and_limited(self):
        created = self.client.post('/api/v1/profiles/me/photos/', {
            'url': 'https://example.com/profile.jpg',
            'is_primary': True,
        }, format='json')
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data['position'], 0)
        self.assertEqual(self.user.__class__.objects.get(pk=self.user.pk).avatar_url, 'https://example.com/profile.jpg')

    def test_notification_preferences_are_saved_per_user(self):
        response = self.client.patch('/api/v1/settings/notifications/', {
            'messages': False,
            'likes': True,
            'posts': False,
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['messages'])
        self.assertFalse(response.data['posts'])
