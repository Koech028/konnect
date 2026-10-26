from rest_framework.test import APITestCase
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory

from apps.accounts.models import User
from apps.profiles.admin import VerificationRequestAdmin
from apps.profiles.models import VerificationRequest


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

    def test_admin_can_approve_verification_without_uploading_identity_documents(self):
        request = VerificationRequest.objects.create(user=self.user)
        admin_user = User.objects.create_superuser(
            email='moderator@example.com',
            password='Mango!Sunrise_2026',
            display_name='Moderator',
            age=35,
            gender='other',
        )
        admin_request = RequestFactory().post('/admin/profiles/verificationrequest/')
        admin_request.user = admin_user
        model_admin = VerificationRequestAdmin(VerificationRequest, AdminSite())

        model_admin.approve_requests(admin_request, VerificationRequest.objects.filter(pk=request.pk))

        request.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(request.status, VerificationRequest.Status.APPROVED)
        self.assertEqual(request.reviewed_by, admin_user)
        self.assertEqual(self.user.verification_status, User.VerificationStatus.VERIFIED)
