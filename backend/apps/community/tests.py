from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.community.models import (
    DailyPromptResponse,
    DatingEvent,
    EventRSVP,
    Short,
    ShortComment,
    ShortView,
    Story,
)


class CommunityApiTests(APITestCase):
    def setUp(self):
        self.host = User.objects.create_user(
            email='community-host@example.com',
            password='Mango!Sunrise_2026',
            display_name='Host',
            age=27,
            gender='woman',
        )
        self.viewer = User.objects.create_user(
            email='community-viewer@example.com',
            password='Mango!Sunrise_2026',
            display_name='Viewer',
            age=29,
            gender='man',
        )
        self.client.force_authenticate(self.viewer)

    def test_stories_expire_after_24_hours_and_require_content(self):
        empty = self.client.post('/api/v1/stories/', {}, format='json')
        self.assertEqual(empty.status_code, 400)

        response = self.client.post('/api/v1/stories/', {'text': 'Coffee in the sun'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertAlmostEqual(
            (
                parse_datetime(response.data['expires_at']) -
                parse_datetime(response.data['created_at'])
            ).total_seconds(),
            24 * 60 * 60,
            delta=2,
        )
        self.assertEqual(len(self.client.get('/api/v1/stories/').data), 1)

        Story.objects.create(author=self.host, text='Expired', expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(len(self.client.get('/api/v1/stories/').data), 1)
        self.assertEqual(Story.objects.filter(text='Expired').count(), 0)

    def test_users_can_delete_only_their_own_stories(self):
        story = Story.objects.create(author=self.host, text='Hello')

        response = self.client.delete(f'/api/v1/stories/{story.id}/')

        self.assertEqual(response.status_code, 404)
        self.assertTrue(Story.objects.filter(pk=story.id).exists())

    def test_story_accepts_text_image_or_short_video_but_not_image_and_video_together(self):
        video = self.client.post('/api/v1/stories/', {
            'text': 'A quick hello',
            'video_url': 'https://media.example.com/hello.mp4',
            'video_duration_seconds': 30,
        }, format='json')
        self.assertEqual(video.status_code, 201, video.data)
        self.assertEqual(video.data['video_duration_seconds'], 30)

        too_long = self.client.post('/api/v1/stories/', {
            'video_url': 'https://media.example.com/long.mp4',
            'video_duration_seconds': 61,
        }, format='json')
        self.assertEqual(too_long.status_code, 400)

        both_media = self.client.post('/api/v1/stories/', {
            'image_url': 'https://media.example.com/image.jpg',
            'video_url': 'https://media.example.com/video.mp4',
            'video_duration_seconds': 10,
        }, format='json')
        self.assertEqual(both_media.status_code, 400)

    def test_shorts_can_be_published_liked_commented_and_watched_once(self):
        created = self.client.post('/api/v1/shorts/', {
            'caption': 'Coffee walk',
            'video_url': 'https://media.example.com/coffee.mp4',
            'duration_seconds': 25,
        }, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        short_id = created.data['id']
        self.assertEqual(created.data['duration_seconds'], 25)

        invalid = self.client.post('/api/v1/shorts/', {
            'video_url': 'https://media.example.com/too-long.mp4',
            'duration_seconds': 61,
        }, format='json')
        self.assertEqual(invalid.status_code, 400)

        watched = self.client.post(f'/api/v1/shorts/{short_id}/watch/', {}, format='json')
        self.client.post(f'/api/v1/shorts/{short_id}/watch/', {}, format='json')
        self.assertEqual(watched.data['views_count'], 1)
        self.assertEqual(ShortView.objects.filter(short_id=short_id, user=self.viewer).count(), 1)

        like = self.client.post(f'/api/v1/shorts/{short_id}/like/', {}, format='json')
        self.assertTrue(like.data['liked'])
        self.assertEqual(like.data['likes_count'], 1)

        comment = self.client.post(
            f'/api/v1/shorts/{short_id}/comments/',
            {'text': 'Looks lovely!'},
            format='json',
        )
        self.assertEqual(comment.status_code, 201, comment.data)
        self.assertEqual(ShortComment.objects.filter(short_id=short_id).count(), 1)
        listed = self.client.get('/api/v1/shorts/').data
        self.assertEqual(listed[0]['comments_count'], 1)
        self.assertEqual(listed[0]['views_count'], 1)
        self.assertTrue(listed[0]['liked_by_me'])

    def test_short_is_hidden_from_blocked_users(self):
        short = Short.objects.create(
            author=self.host,
            video_url='https://media.example.com/blocked.mp4',
            duration_seconds=15,
        )
        self.host.blocks_created.create(blocked=self.viewer)

        self.assertEqual(self.client.get('/api/v1/shorts/').data, [])
        self.assertEqual(self.client.post(f'/api/v1/shorts/{short.id}/watch/').status_code, 404)

    def test_only_short_owner_can_delete_it(self):
        self.client.force_authenticate(self.host)
        short = self.client.post('/api/v1/shorts/', {
            'video_url': 'https://media.example.com/owned.mp4',
            'duration_seconds': 20,
        }, format='json').data
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.delete(f"/api/v1/shorts/{short['id']}/").status_code, 404)

        self.client.force_authenticate(self.host)
        self.assertEqual(self.client.delete(f"/api/v1/shorts/{short['id']}/").status_code, 204)

    def test_daily_prompt_response_is_private_to_user_and_editable(self):
        prompt = self.client.get('/api/v1/prompts/today/')
        self.assertEqual(prompt.status_code, 200)
        self.assertFalse(prompt.data['answered'])
        self.assertTrue(prompt.data['prompt'])

        saved = self.client.post('/api/v1/prompts/today/', {'answer': 'A quiet walk'}, format='json')
        self.assertEqual(saved.status_code, 200, saved.data)
        self.assertTrue(saved.data['answered'])
        self.assertEqual(DailyPromptResponse.objects.filter(user=self.viewer).count(), 1)

        updated = self.client.post('/api/v1/prompts/today/', {'answer': 'Coffee with a friend'}, format='json')
        self.assertEqual(updated.data['answer'], 'Coffee with a friend')
        self.assertEqual(DailyPromptResponse.objects.filter(user=self.viewer).count(), 1)
        self.client.force_authenticate(self.host)
        self.assertEqual(self.client.get('/api/v1/prompts/today/').data['answer'], '')

    def test_events_can_be_created_and_attendees_can_rsvp_and_cancel(self):
        starts_at = timezone.now() + timedelta(days=2)
        self.client.force_authenticate(self.host)
        create = self.client.post('/api/v1/events/', {
            'title': 'Coffee meetup',
            'location': 'Public cafe, Nairobi',
            'starts_at': starts_at.isoformat(),
            'ends_at': (starts_at + timedelta(hours=2)).isoformat(),
            'capacity': 2,
        }, format='json')
        self.assertEqual(create.status_code, 201)
        self.assertEqual(create.data['attendee_count'], 0)

        event_id = create.data['id']
        self.client.force_authenticate(self.viewer)
        rsvp = self.client.post(f'/api/v1/events/{event_id}/', {}, format='json')
        self.assertEqual(rsvp.status_code, 200, rsvp.data)
        self.assertTrue(rsvp.data['attending'])
        self.assertEqual(rsvp.data['attendee_count'], 1)
        self.assertEqual(EventRSVP.objects.filter(event_id=event_id, user=self.viewer).count(), 1)

        cancel = self.client.post(f'/api/v1/events/{event_id}/', {}, format='json')
        self.assertFalse(cancel.data['attending'])
        self.assertEqual(cancel.data['attendee_count'], 0)

    def test_event_rejects_invalid_times_and_enforces_capacity(self):
        now = timezone.now()
        invalid = self.client.post('/api/v1/events/', {
            'title': 'Past event',
            'location': 'Cafe',
            'starts_at': (now - timedelta(days=1)).isoformat(),
            'ends_at': now.isoformat(),
        }, format='json')
        self.assertEqual(invalid.status_code, 400)

        starts_at = now + timedelta(days=1)
        event = DatingEvent.objects.create(
            host=self.host,
            title='Full event',
            location='Cafe',
            starts_at=starts_at,
            ends_at=starts_at + timedelta(hours=1),
            capacity=2,
        )
        another = User.objects.create_user(
            email='community-another@example.com',
            password='Mango!Sunrise_2026',
            display_name='Another',
            age=30,
            gender='woman',
        )
        EventRSVP.objects.create(event=event, user=another)
        extra = User.objects.create_user(
            email='community-extra@example.com',
            password='Mango!Sunrise_2026',
            display_name='Extra',
            age=31,
            gender='other',
        )
        EventRSVP.objects.create(event=event, user=extra)
        response = self.client.post(f'/api/v1/events/{event.id}/', {}, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(EventRSVP.objects.filter(event=event, user=self.viewer).exists())

    def test_blocked_host_event_is_hidden(self):
        starts_at = timezone.now() + timedelta(days=2)
        event = DatingEvent.objects.create(
            host=self.host,
            title='Unavailable',
            location='Cafe',
            starts_at=starts_at,
            ends_at=starts_at + timedelta(hours=1),
        )
        self.host.blocks_created.create(blocked=self.viewer)

        self.assertEqual(self.client.get('/api/v1/events/').data, [])
        self.assertEqual(self.client.get(f'/api/v1/events/{event.id}/').status_code, 404)
