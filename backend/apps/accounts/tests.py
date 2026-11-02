import re
from datetime import timedelta

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from django.core.cache import cache

from apps.accounts.models import EmailVerificationCode, User


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class AccountApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        mail.outbox.clear()

    def email_code(self, message=None):
        body = (message or mail.outbox[-1]).body
        match = re.search(r'\b(\d{6})\b', body)
        self.assertIsNotNone(match)
        return match.group(1)

    def verify_signup(self, email):
        return self.client.post('/api/v1/auth/verify-email/', {
            'email': email,
            'code': self.email_code(),
        }, format='json')

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
        user = User.objects.get(email='new-member@example.com')
        self.assertFalse(user.is_active)
        self.assertFalse(user.email_verified)
        code = self.email_code()
        self.assertNotIn(code, user.email_verification_codes.first().code_hash)
        self.assertIn('verification code', response.data['detail'])
        self.assertNotIn('access', response.data)
        pending_login = self.client.post('/api/v1/auth/login/', {
            'email': 'new-member@example.com',
            'password': 'Mango!Sunrise_2026',
        }, format='json')
        self.assertEqual(pending_login.status_code, 401)
        verified = self.verify_signup('new-member@example.com')
        self.assertEqual(verified.status_code, 200)
        self.assertIn('access', verified.data)
        self.assertEqual(verified.data['user']['location']['city'], 'Nairobi')
        self.assertEqual(verified.data['user']['interests'], ['coffee', 'hiking'])
        self.assertEqual(verified.data['user']['email'], 'new-member@example.com')

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

    def test_referral_link_attributes_new_signup_and_counts_it_for_referrer(self):
        referrer = User.objects.create_user(
            email='inviter@example.com',
            password='Mango!Sunrise_2026',
            display_name='Inviter',
            age=30,
            gender='woman',
        )
        response = self.client.post('/api/v1/auth/register/', {
            'email': 'invited@example.com',
            'password': 'Mango!Sunrise_2026',
            'display_name': 'Invited Member',
            'age': 26,
            'gender': 'man',
            'referral_code': referrer.referral_code,
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.verify_signup('invited@example.com').status_code, 200)
        invited = User.objects.get(email='invited@example.com')
        self.assertEqual(invited.referred_by, referrer)
        self.assertNotIn('referral_code', response.data)
        self.client.force_authenticate(referrer)
        referrals = self.client.get('/api/v1/referrals/me/')
        self.assertEqual(referrals.status_code, 200)
        self.assertEqual(referrals.data, {
            'referral_code': referrer.referral_code,
            'successful_signups': 1,
        })

    def test_invalid_referral_code_does_not_create_account(self):
        response = self.client.post('/api/v1/auth/register/', {
            'email': 'invalid-referral@example.com',
            'password': 'Mango!Sunrise_2026',
            'display_name': 'No Referral',
            'age': 26,
            'gender': 'man',
            'referral_code': 'not-a-real-code',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('referral_code', response.data)
        self.assertFalse(User.objects.filter(email='invalid-referral@example.com').exists())

    def test_referral_endpoint_requires_authentication_and_code_is_not_public(self):
        user = User.objects.create_user(
            email='private-referral@example.com',
            password='Mango!Sunrise_2026',
            display_name='Private Referral',
            age=25,
            gender='woman',
        )
        unauthenticated = self.client.get('/api/v1/referrals/me/')
        self.assertEqual(unauthenticated.status_code, 401)

        self.client.force_authenticate(user)
        public_profile = self.client.get(f'/api/v1/profiles/{user.id}/')
        self.assertEqual(public_profile.status_code, 200)
        self.assertNotIn('referral_code', public_profile.data)

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
        self.assertEqual(response.data['subscription_tier'], User.SubscriptionTier.FREE)

    def test_premium_status_is_read_only_and_billing_is_not_enabled(self):
        user = User.objects.create_user(
            email='tier@example.com',
            password='Mango!Sunrise_2026',
            display_name='Tier User',
            age=25,
            gender='woman',
        )
        self.client.force_authenticate(user)
        response = self.client.get('/api/v1/premium/')
        self.assertEqual(response.data['tier'], User.SubscriptionTier.FREE)
        self.assertFalse(response.data['billing_enabled'])

        update = self.client.patch('/api/v1/profiles/me/', {'subscription_tier': 'premium'}, format='json')
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.data['subscription_tier'], User.SubscriptionTier.FREE)

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

    def test_registration_does_not_require_optional_profile_details(self):
        response = self.client.post('/api/v1/auth/register/', {
            'email': 'minimal-member@example.com',
            'password': 'Mango!Sunrise_2026',
            'display_name': 'Minimal Member',
            'age': 26,
            'gender': 'woman',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.verify_signup('minimal-member@example.com').status_code, 200)
        user = User.objects.get(email='minimal-member@example.com')
        self.assertEqual(user.city, '')
        self.assertEqual(user.bio, '')
        self.assertEqual(user.interests, [])

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
        code = self.email_code()

        reset = self.client.post('/api/v1/auth/password-reset/confirm/', {
            'email': user.email,
            'code': code,
            'password': 'New!CedarRiver_2026',
        }, format='json')
        self.assertEqual(reset.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password('New!CedarRiver_2026'))
        reused = self.client.post('/api/v1/auth/password-reset/confirm/', {
            'email': user.email,
            'code': code,
            'password': 'Other!CedarRiver_2026',
        }, format='json')
        self.assertEqual(reused.status_code, 400)

    def test_referrals_count_only_verified_signups(self):
        referrer = User.objects.create_user(
            email='inviter@example.com',
            password='Mango!Sunrise_2026',
            display_name='Inviter',
            age=30,
            gender='woman',
        )
        self.client.post('/api/v1/auth/register/', {
            'email': 'invited@example.com',
            'password': 'Mango!Sunrise_2026',
            'display_name': 'Invited Member',
            'age': 26,
            'gender': 'man',
            'referral_code': referrer.referral_code,
        }, format='json')
        self.client.force_authenticate(referrer)
        before_verification = self.client.get('/api/v1/referrals/me/')
        self.assertEqual(before_verification.data['successful_signups'], 0)
        self.client.force_authenticate(None)
        self.assertEqual(self.verify_signup('invited@example.com').status_code, 200)
        self.client.force_authenticate(referrer)
        after_verification = self.client.get('/api/v1/referrals/me/')
        self.assertEqual(after_verification.data['successful_signups'], 1)

    def test_signup_code_cannot_be_used_after_five_failed_attempts(self):
        self.client.post('/api/v1/auth/register/', {
            'email': 'pending@example.com',
            'password': 'Mango!Sunrise_2026',
            'display_name': 'Pending Member',
            'age': 26,
            'gender': 'woman',
        }, format='json')
        code = self.email_code()
        wrong_code = '000000' if code != '000000' else '000001'
        for _ in range(5):
            invalid = self.client.post('/api/v1/auth/verify-email/', {
                'email': 'pending@example.com',
                'code': wrong_code,
            }, format='json')
            self.assertEqual(invalid.status_code, 400)
        locked_out = self.client.post('/api/v1/auth/verify-email/', {
            'email': 'pending@example.com',
            'code': code,
        }, format='json')
        self.assertEqual(locked_out.status_code, 400)
        self.assertFalse(User.objects.get(email='pending@example.com').is_active)

    def test_expired_signup_code_is_rejected(self):
        self.client.post('/api/v1/auth/register/', {
            'email': 'expired@example.com',
            'password': 'Mango!Sunrise_2026',
            'display_name': 'Expired Member',
            'age': 26,
            'gender': 'woman',
        }, format='json')
        user = User.objects.get(email='expired@example.com')
        EmailVerificationCode.objects.filter(user=user).update(
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        response = self.client.post('/api/v1/auth/verify-email/', {
            'email': user.email,
            'code': self.email_code(),
        }, format='json')
        self.assertEqual(response.status_code, 400)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_signup_code_can_be_resent_after_cooldown(self):
        self.client.post('/api/v1/auth/register/', {
            'email': 'resend@example.com',
            'password': 'Mango!Sunrise_2026',
            'display_name': 'Resend Member',
            'age': 26,
            'gender': 'woman',
        }, format='json')
        user = User.objects.get(email='resend@example.com')
        self.email_code()

        self.client.post('/api/v1/auth/verify-email/resend/', {
            'email': user.email,
        }, format='json')
        self.assertEqual(len(mail.outbox), 1)

        EmailVerificationCode.objects.filter(user=user).update(
            created_at=timezone.now() - timedelta(minutes=2),
        )
        resent = self.client.post('/api/v1/auth/verify-email/resend/', {
            'email': user.email,
        }, format='json')
        self.assertEqual(resent.status_code, 200)
        self.assertEqual(len(mail.outbox), 2)
        self.assertNotEqual(
            EmailVerificationCode.objects.filter(user=user).order_by('-created_at').first().code_hash,
            EmailVerificationCode.objects.filter(user=user).order_by('created_at').first().code_hash,
        )
