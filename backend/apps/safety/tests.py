from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.community.models import Short
from apps.safety.models import ContentReport


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

    def test_short_report_is_private_and_cannot_be_duplicated(self):
        short = Short.objects.create(
            author=self.target,
            video_url='https://media.example.com/short.mp4',
            duration_seconds=20,
        )
        response = self.client.post('/api/v1/safety/content-reports/', {
            'short': str(short.id),
            'reason': 'inappropriate',
            'details': 'This content is not appropriate.',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['status'], 'open')
        self.assertEqual(response.data['short_id'], str(short.id))
        self.assertEqual(ContentReport.objects.filter(reporter=self.reporter, short=short).count(), 1)

        duplicate = self.client.post('/api/v1/safety/content-reports/', {
            'short': str(short.id),
            'reason': 'spam',
        }, format='json')
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(len(self.client.get('/api/v1/safety/content-reports/').data), 1)

        self.client.force_authenticate(self.target)
        self.assertEqual(self.client.get('/api/v1/safety/content-reports/').data, [])

    def test_short_comment_report_and_own_content_rejection(self):
        short = Short.objects.create(
            author=self.target,
            video_url='https://media.example.com/short.mp4',
            duration_seconds=20,
        )
        self.client.force_authenticate(self.target)
        own_comment = self.client.post(
            f'/api/v1/shorts/{short.id}/comments/',
            {'text': 'My comment'},
            format='json',
        )
        self.assertEqual(own_comment.status_code, 201)
        rejected_own_report = self.client.post('/api/v1/safety/content-reports/', {
            'comment': own_comment.data['id'],
            'reason': 'other',
        }, format='json')
        self.assertEqual(rejected_own_report.status_code, 400)

        self.client.force_authenticate(self.target)
        comment = self.client.post(
            f'/api/v1/shorts/{short.id}/comments/',
            {'text': 'A comment to report'},
            format='json',
        )
        self.assertEqual(comment.status_code, 201)
        self.client.force_authenticate(self.reporter)
        report = self.client.post('/api/v1/safety/content-reports/', {
            'comment': comment.data['id'],
            'reason': 'harassment',
        }, format='json')
        self.assertEqual(report.status_code, 201, report.data)
        self.assertEqual(report.data['comment_id'], comment.data['id'])

    def test_content_report_requires_exactly_one_visible_target(self):
        short = Short.objects.create(
            author=self.target,
            video_url='https://media.example.com/short.mp4',
            duration_seconds=20,
        )
        self.target.blocks_created.create(blocked=self.reporter)
        blocked = self.client.post('/api/v1/safety/content-reports/', {
            'short': str(short.id),
            'reason': 'other',
        }, format='json')
        self.assertEqual(blocked.status_code, 400)

        missing_target = self.client.post('/api/v1/safety/content-reports/', {
            'reason': 'other',
        }, format='json')
        self.assertEqual(missing_target.status_code, 400)
