import os
from unittest.mock import patch

from rest_framework.test import APITestCase

from apps.accounts.models import User


class PostApiTests(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            email='author@example.com',
            password='Mango!Sunrise_2026',
            display_name='Author',
            age=29,
            gender='woman',
            city='Nairobi',
            country='Kenya',
        )
        self.reader = User.objects.create_user(
            email='reader@example.com',
            password='Mango!Sunrise_2026',
            display_name='Reader',
            age=27,
            gender='man',
            city='Nairobi',
            country='Kenya',
        )
        self.client.force_authenticate(self.reader)

    def test_create_like_and_comment_post_with_frontend_shape(self):
        create = self.client.post('/api/v1/posts/', {
            'type': 'photo',
            'content': {
                'text': 'A walk in Karura Forest.',
                'media': ['https://example.com/forest.jpg'],
            },
        }, format='json')

        self.assertEqual(create.status_code, 201)
        self.assertEqual(create.data['author_id'], str(self.reader.id))
        self.assertEqual(create.data['content']['text'], 'A walk in Karura Forest.')
        self.assertEqual(create.data['content']['media'], ['https://example.com/forest.jpg'])
        post_id = create.data['id']

        like = self.client.post(f'/api/v1/posts/{post_id}/like/')
        self.assertEqual(like.status_code, 200)
        self.assertTrue(like.data['liked'])
        self.assertEqual(like.data['likes_count'], 1)

        comment = self.client.post(
            f'/api/v1/posts/{post_id}/comments/',
            {'text': 'Lovely spot!'},
            format='json',
        )
        self.assertEqual(comment.status_code, 201)
        detail = self.client.get(f'/api/v1/posts/{post_id}/')
        self.assertEqual(detail.data['engagement']['comments_count'], 1)

    def test_poll_vote_updates_frontend_poll_counts(self):
        create = self.client.post('/api/v1/posts/', {
            'type': 'poll',
            'content': {'text': 'Choose a weekend plan', 'poll_options': ['Hike', 'Coffee']},
        }, format='json')
        self.assertEqual(create.status_code, 201)
        self.assertEqual(len(create.data['content']['poll_option_ids']), 2)

        vote = self.client.post(
            f"/api/v1/posts/{create.data['id']}/poll-vote/",
            {'option_index': 1},
            format='json',
        )
        self.assertEqual(vote.status_code, 200)
        self.assertEqual(vote.data['poll_votes'], [0, 1])

    def test_interest_toggle_is_saved_and_returned_in_post(self):
        create = self.client.post('/api/v1/posts/', {
            'type': 'status',
            'content': {'text': 'Looking forward to this event.'},
        }, format='json')
        post_id = create.data['id']

        interested = self.client.post(f'/api/v1/posts/{post_id}/interest/')
        self.assertEqual(interested.status_code, 200)
        self.assertTrue(interested.data['interested'])
        self.assertTrue(self.client.get(f'/api/v1/posts/{post_id}/').data['interested_by_me'])

        removed = self.client.post(f'/api/v1/posts/{post_id}/interest/')
        self.assertFalse(removed.data['interested'])
        self.assertFalse(self.client.get(f'/api/v1/posts/{post_id}/').data['interested_by_me'])

    def test_image_upload_url_is_private_and_content_length_is_signed(self):
        with patch.dict(os.environ, {
            'CLOUDFLARE_ACCOUNT_ID': 'account',
            'CLOUDFLARE_R2_ACCESS_KEY_ID': 'access',
            'CLOUDFLARE_R2_SECRET_ACCESS_KEY': 'secret',
            'CLOUDFLARE_R2_BUCKET': 'linkup-media',
            'CLOUDFLARE_R2_PUBLIC_URL': 'https://media.example.com',
        }), patch('config.media.boto3.client') as create_client:
            create_client.return_value.generate_presigned_url.return_value = 'https://signed.example.com/put'
            response = self.client.post('/api/v1/media/upload-url/', {
                'content_type': 'image/png',
                'size': 128,
            }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['url'].startswith('https://media.example.com/'))
        self.assertEqual(response.data['upload_url'], 'https://signed.example.com/put')
        params = create_client.return_value.generate_presigned_url.call_args.kwargs['Params']
        self.assertEqual(params['ContentLength'], 128)
        self.assertIn(str(self.reader.id), params['Key'])

    def test_image_upload_url_rejects_unsupported_media(self):
        response = self.client.post('/api/v1/media/upload-url/', {
            'content_type': 'image/svg+xml',
            'size': 128,
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_member_cannot_edit_another_members_post(self):
        self.client.force_authenticate(self.author)
        create = self.client.post('/api/v1/posts/', {
            'type': 'status',
            'content': {'text': 'Author post'},
        }, format='json')
        self.client.force_authenticate(self.reader)
        update = self.client.patch(
            f"/api/v1/posts/{create.data['id']}/",
            {'content': {'text': 'Changed by reader'}},
            format='json',
        )
        self.assertEqual(update.status_code, 403)

    def test_partial_post_edit_preserves_existing_media(self):
        self.client.force_authenticate(self.author)
        create = self.client.post('/api/v1/posts/', {
            'type': 'photo',
            'content': {
                'text': 'Original text',
                'media': ['https://example.com/original.jpg'],
            },
        }, format='json')
        update = self.client.patch(
            f"/api/v1/posts/{create.data['id']}/",
            {'content': {'text': 'Edited text'}},
            format='json',
        )
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.data['content']['text'], 'Edited text')
        self.assertEqual(update.data['content']['media'], ['https://example.com/original.jpg'])
