from rest_framework import serializers
from urllib.parse import urlparse

from apps.accounts.serializers import UserSerializer
from apps.posts.models import Comment, PollOption, Post, PostMedia, PollVote


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'post', 'author', 'text', 'created_at')
        read_only_fields = ('id', 'post', 'author', 'created_at')


class PostSerializer(serializers.ModelSerializer):
    author_id = serializers.UUIDField(source='author.id', read_only=True)
    author = UserSerializer(read_only=True)
    content = serializers.SerializerMethodField()
    engagement = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    interested_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = (
            'id', 'author_id', 'author', 'type', 'content', 'engagement',
            'liked_by_me', 'interested_by_me', 'created_at',
        )
        read_only_fields = ('id', 'author_id', 'author', 'engagement', 'liked_by_me', 'interested_by_me', 'created_at')

    def to_internal_value(self, data):
        content = data.get('content')
        requested_type = data.get('type', self.instance.type if self.instance else Post.Type.STATUS)
        if self.instance is not None and self.partial:
            if content is None:
                content = {}
            if not isinstance(content, dict):
                raise serializers.ValidationError({'content': 'Expected an object containing text and optional media.'})
            content = {
                'text': content.get('text', self.instance.text),
                'media': content.get(
                    'media',
                    [media.url for media in self.instance.media.all()]
                    if requested_type == self.instance.type else [],
                ),
                'poll_options': content.get(
                    'poll_options',
                    [option.text for option in self.instance.poll_options.all()]
                    if requested_type == self.instance.type else [],
                ),
            }
        elif content is None:
            content = {}
        if not isinstance(content, dict):
            raise serializers.ValidationError({'content': 'Expected an object containing text and optional media.'})
        normalized = {
            'type': requested_type,
            'text': content.get('text', ''),
            'media_urls': content.get('media', []),
            'poll_options': content.get('poll_options', []),
        }
        serializer = PostWriteSerializer(data=normalized, context=self.context)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def create(self, validated_data):
        media_urls = validated_data.pop('media_urls')
        poll_options = validated_data.pop('poll_options')
        post = Post.objects.create(author=self.context['request'].user, **validated_data)
        self._save_related(post, media_urls, poll_options)
        return post

    def update(self, instance, validated_data):
        media_urls = validated_data.pop('media_urls')
        poll_options = validated_data.pop('poll_options')
        instance.type = validated_data['type']
        instance.text = validated_data['text']
        instance.save(update_fields=('type', 'text', 'updated_at'))
        instance.media.all().delete()
        instance.poll_options.all().delete()
        self._save_related(instance, media_urls, poll_options)
        return instance

    @staticmethod
    def _save_related(post, media_urls, poll_options):
        PostMedia.objects.bulk_create([
            PostMedia(post=post, url=url, position=position)
            for position, url in enumerate(media_urls)
        ])
        PollOption.objects.bulk_create([
            PollOption(post=post, text=text, position=position)
            for position, text in enumerate(poll_options)
        ])

    def get_content(self, obj):
        options = list(obj.poll_options.all())
        vote_counts = [option.votes.count() for option in options]
        content = {
            'text': obj.text,
            'media': [media.url for media in obj.media.all()],
        }
        if options:
            user_id = self.context['request'].user.id
            vote = next((item for item in obj.poll_votes.all() if item.user_id == user_id), None)
            content['poll_options'] = [option.text for option in options]
            content['poll_option_ids'] = [str(option.id) for option in options]
            content['poll_votes'] = vote_counts
            content['selected_poll_option'] = vote.option.position if vote else None
        return content

    def get_engagement(self, obj):
        return {
            'likes_count': obj.likes.count(),
            'comments_count': obj.comments.count(),
            'shares_count': 0,
        }

    def get_liked_by_me(self, obj):
        user_id = self.context['request'].user.id
        return any(like.user_id == user_id for like in obj.likes.all())

    def get_interested_by_me(self, obj):
        user_id = self.context['request'].user.id
        return any(interest.user_id == user_id for interest in obj.interests.all())


class PostWriteSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=Post.Type.choices)
    text = serializers.CharField(max_length=2000, allow_blank=False, trim_whitespace=True)
    media_urls = serializers.ListField(
        child=serializers.URLField(),
        required=False,
        default=list,
        max_length=6,
    )
    poll_options = serializers.ListField(
        child=serializers.CharField(max_length=100, allow_blank=False, trim_whitespace=True),
        required=False,
        default=list,
        min_length=0,
        max_length=4,
    )

    def validate(self, attrs):
        if attrs['type'] == Post.Type.POLL and len(attrs['poll_options']) < 2:
            raise serializers.ValidationError({'content': {'poll_options': 'Polls need at least two options.'}})
        if attrs['type'] != Post.Type.POLL and attrs['poll_options']:
            raise serializers.ValidationError({'content': {'poll_options': 'Poll options are only valid for poll posts.'}})
        if len(attrs['poll_options']) != len(set(attrs['poll_options'])):
            raise serializers.ValidationError({'content': {'poll_options': 'Poll options must be unique.'}})
        if attrs['type'] == Post.Type.VIDEO:
            if len(attrs['media_urls']) != 1:
                raise serializers.ValidationError({
                    'content': {'media': 'A video post must contain exactly one uploaded video.'}
                })
            video_url = attrs['media_urls'][0]
            parsed_url = urlparse(video_url)
            if parsed_url.scheme != 'https' or not parsed_url.path.lower().endswith(('.mp4', '.webm', '.mov')):
                raise serializers.ValidationError({
                    'content': {'media': 'Upload an MP4, WebM, or QuickTime video over HTTPS.'}
                })
        if any(urlparse(url).scheme != 'https' for url in attrs['media_urls']):
            raise serializers.ValidationError({
                'content': {'media': 'Media URLs must use HTTPS.'}
            })
        return attrs
