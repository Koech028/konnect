from rest_framework.test import APITestCase
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode

from apps.accounts.models import User


class AccountApiTests(APITestCase):
    def test_register_login_and_current_profile(self):
        response = self.client.post('/api/v1/auth/register/', {
            'email': 'new-member@example.com',
            'password': 'Mango!Sunrise_2026',
            'display_name': 'New Member',
            'age': 26,
            'gender': 'woman',
            'location': {'city': 'Nairobi', 'country': 'Kenya'},
            'bio': 'Here to meet good people.',
            'interests': ['coffee', 'hiking'],
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['user']['location']['city'], 'Nairobi')
        self.assertEqual(response.data['user']['interests'], ['coffee', 'hiking'])
        self.assertEqual(response.data['user']['email'], 'new-member@example.com')

        login = self.client.post('/api/v1/auth/login/', {
            'email': 'new-member@example.com',
            'password': 'Mango!Sunrise_2026',
        }, format='json')
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data['user']['display_name'], 'New Member')

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        current = self.client.get('/api/v1/auth/me/')
        self.assertEqual(current.status_code, 200)
        self.assertEqual(current.data['email'], 'new-member@example.com')

    def test_registration_email_is_case_insensitive(self):
        payload = {
            'email': 'Case.Member@example.com',
            'password': 'Mango!Sunrise_2026',
            'display_name': 'Case Member',
            'age': 28,
            'gender': 'woman',
        }
        first = self.client.post('/api/v1/auth/register/', payload, format='json')
        payload['email'] = 'case.member@EXAMPLE.com'
        duplicate = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(duplicate.status_code, 400)

    def test_public_profile_does_not_expose_private_account_fields(self):
        profile = User.objects.create_user(
            email='private@example.com',
            password='Mango!Sunrise_2026',
            display_name='Private Member',
            age=25,
            gender='woman',
        )
        self.client.force_authenticate(profile)
        response = self.client.get(f'/api/v1/profiles/{profile.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('email', response.data)
        self.assertNotIn('preferences', response.data)

    def test_registration_rejects_underage_user(self):
        response = self.client.post('/api/v1/auth/register/', {
            'email': 'underage@example.com',
            'password': 'Mango!Sunrise_2026',
            'display_name': 'Underage',
            'age': 17,
            'gender': 'woman',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='underage@example.com').exists())

    def test_password_reset_request_does_not_reveal_account_existence(self):
        user = User.objects.create_user(
            email='member@example.com',
            password='Mango!Sunrise_2026',
            display_name='Member',
            age=25,
            gender='woman',
        )
        existing = self.client.post('/api/v1/auth/password-reset/', {'email': 'member@example.com'}, format='json')
        missing = self.client.post('/api/v1/auth/password-reset/', {'email': 'missing@example.com'}, format='json')
        self.assertEqual(existing.status_code, 200)
        self.assertEqual(missing.status_code, 200)
        self.assertEqual(existing.data, missing.data)

        uid = urlsafe_base64_encode(str(user.pk).encode())
        token = default_token_generator.make_token(user)
        reset = self.client.post('/api/v1/auth/password-reset/confirm/', {
            'uid': uid,
            'token': token,
            'password': 'New!CedarRiver_2026',
        }, format='json')
        self.assertEqual(reset.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password('New!CedarRiver_2026'))
