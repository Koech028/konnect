from rest_framework.test import APITestCase
from django.contrib.admin.models import CHANGE, LogEntry
from django.contrib.admin.sites import AdminSite
from django.contrib.auth.models import Group
from django.test import RequestFactory

from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.profiles.admin import VerificationRequestAdmin
from apps.profiles.models import VerificationRequest
from apps.safety.admin import MODERATOR_GROUP_NAME
from apps.safety.models import ModerationAuditEvent


class ProfileApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='profile@example.com',
            password='Mango!Sunrise_2026',
            display_name='Profile Owner',
            age=28,
            gender='woman',
            city='Nairobi',
            interests=['coffee', 'hiking'],
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

    def test_bio_allows_up_to_100_words_and_rejects_more(self):
        accepted_bio = ' '.join(['description'] * 100)
        accepted = self.client.patch(
            '/api/v1/profiles/me/',
            {'bio': accepted_bio},
            format='json',
        )
        self.assertEqual(accepted.status_code, 200)
        self.assertEqual(accepted.data['bio'], accepted_bio)

        rejected = self.client.patch(
            '/api/v1/profiles/me/',
            {'bio': ' '.join(['word'] * 101)},
            format='json',
        )
        self.assertEqual(rejected.status_code, 400)
        self.assertIn('100 words or fewer', str(rejected.data['bio']))

    def test_cover_picture_is_independent_of_profile_picture(self):
        profile_photo = self.client.post('/api/v1/profiles/me/photos/', {
            'url': 'https://example.com/avatar.jpg',
            'is_primary': True,
        }, format='json')
        self.assertEqual(profile_photo.status_code, 201)

        updated = self.client.patch('/api/v1/profiles/me/', {
            'cover_image_url': 'https://example.com/cover.jpg',
        }, format='json')

        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data['avatar'], 'https://example.com/avatar.jpg')
        self.assertEqual(updated.data['cover_image_url'], 'https://example.com/cover.jpg')
        second_photo = self.client.post('/api/v1/profiles/me/photos/', {
            'url': 'https://example.com/avatar-2.jpg',
        }, format='json')
        selected = self.client.patch(
            f"/api/v1/profiles/me/photos/{second_photo.data['id']}/",
            {'is_primary': True},
            format='json',
        )
        self.assertEqual(selected.status_code, 200)
        self.assertEqual(User.objects.get(pk=self.user.pk).cover_image_url, 'https://example.com/cover.jpg')
        public_profile = self.client.get(f'/api/v1/profiles/{self.user.id}/')
        self.assertEqual(public_profile.data['avatar'], 'https://example.com/avatar-2.jpg')
        self.assertEqual(public_profile.data['cover_image_url'], 'https://example.com/cover.jpg')
        self.assertNotIn('email', public_profile.data)
        self.assertNotIn('preferences', public_profile.data)
        self.assertNotIn('last_active', public_profile.data)
        cleared_cover = self.client.patch('/api/v1/profiles/me/', {'cover_image_url': ''}, format='json')
        self.assertEqual(cleared_cover.data['avatar'], 'https://example.com/avatar-2.jpg')
        self.assertEqual(cleared_cover.data['cover_image_url'], '')

    def test_discover_applies_age_gender_search_and_excludes_self(self):
        response = self.client.get('/api/v1/discover/?q=coffee&gender=men&age_min=30&age_max=35')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([profile['id'] for profile in response.data], [str(self.other.id)])

    def test_hidden_profile_is_excluded_from_discovery_and_public_reads(self):
        self.other.profile_status = User.ProfileStatus.HIDDEN
        self.other.save(update_fields=('profile_status',))

        discovery = self.client.get('/api/v1/discover/')
        public_profile = self.client.get(f'/api/v1/profiles/{self.other.id}/')

        self.assertNotIn(str(self.other.id), [profile['id'] for profile in discovery.data])
        self.assertEqual(public_profile.status_code, 404)

    def test_explicit_everyone_filter_overrides_saved_gender_preferences(self):
        self.user.preferences = {'interested_in': ['women']}
        self.user.save(update_fields=('preferences',))

        response = self.client.get('/api/v1/discover/?gender=Everyone')

        self.assertEqual(response.status_code, 200)
        self.assertIn(str(self.other.id), [profile['id'] for profile in response.data])

    def test_discover_reports_shared_interests_and_supports_shared_only_filter(self):
        unrelated = User.objects.create_user(
            email='unrelated@example.com',
            password='Mango!Sunrise_2026',
            display_name='Unrelated',
            age=30,
            gender='other',
            interests=['gardening'],
        )
        response = self.client.get('/api/v1/discover/')
        profiles = {profile['id']: profile for profile in response.data}

        self.assertEqual(profiles[str(self.other.id)]['shared_interests'], ['coffee'])
        self.assertTrue(profiles[str(self.other.id)]['same_city'])
        self.assertEqual(profiles[str(unrelated.id)]['shared_interests'], [])

        filtered = self.client.get('/api/v1/discover/?shared_interests=true')
        self.assertEqual([profile['id'] for profile in filtered.data], [str(self.other.id)])

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
        request.review_notes = 'Identity check approved.'
        request.save(update_fields=('review_notes',))
        admin_user = User.objects.create_user(
            email='moderator@example.com',
            password='Mango!Sunrise_2026',
            display_name='Moderator',
            age=35,
            gender='other',
            is_staff=True,
        )
        admin_user.groups.add(Group.objects.get(name=MODERATOR_GROUP_NAME))
        admin_request = RequestFactory().post('/admin/profiles/verificationrequest/')
        admin_request.user = admin_user
        model_admin = VerificationRequestAdmin(VerificationRequest, AdminSite())

        model_admin.approve_requests(admin_request, VerificationRequest.objects.filter(pk=request.pk))

        request.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(request.status, VerificationRequest.Status.APPROVED)
        self.assertEqual(request.reviewed_by, admin_user)
        self.assertEqual(self.user.verification_status, User.VerificationStatus.VERIFIED)
        self.assertTrue(Notification.objects.filter(
            recipient=self.user,
            actor=admin_user,
            type=Notification.Type.VERIFICATION,
        ).exists())
        audit_event = ModerationAuditEvent.objects.get(case_id=request.pk)
        self.assertEqual(audit_event.actor, admin_user)
        self.assertEqual(audit_event.action, VerificationRequest.Status.APPROVED)
        self.assertEqual(audit_event.review_notes, 'Identity check approved.')
        self.assertTrue(LogEntry.objects.filter(
            user=admin_user,
            object_id=str(request.pk),
            action_flag=CHANGE,
        ).exists())
