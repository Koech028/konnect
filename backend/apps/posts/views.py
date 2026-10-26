from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.posts.models import Comment, PollOption, PollVote, Post, PostInterest, PostLike
from apps.posts.permissions import IsAuthorOrReadOnly
from apps.posts.serializers import CommentSerializer, PostSerializer
from apps.safety.models import Block


def get_visible_post(request, post_id):
    post = get_object_or_404(Post.objects.select_related('author'), pk=post_id)
    if post.author_id != request.user.id and post.author.profile_status != 'active':
        raise Http404
    if Block.objects.filter(
        Q(blocker=request.user, blocked=post.author) |
        Q(blocker=post.author, blocked=request.user)
    ).exists():
        raise Http404
    return post


class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = (permissions.IsAuthenticated, IsAuthorOrReadOnly)
    http_method_names = ('get', 'post', 'patch', 'delete', 'head', 'options')

    def get_queryset(self):
        user = self.request.user
        blocked = Block.objects.filter(Q(blocker=user) | Q(blocked=user)).values_list('blocker_id', 'blocked_id')
        hidden_ids = set()
        for blocker_id, blocked_id in blocked:
            hidden_ids.update((blocker_id, blocked_id))
        hidden_ids.discard(user.id)
        queryset = Post.objects.select_related('author').prefetch_related(
            'author__profile_photos', 'media', 'poll_options__votes', 'poll_votes',
            'likes', 'comments', 'interests'
        ).exclude(author_id__in=hidden_ids).filter(Q(author__profile_status='active') | Q(author=user))
        author_id = self.request.query_params.get('author')
        if author_id:
            queryset = queryset.filter(author_id=author_id)
        if self.action == 'retrieve':
            return queryset.filter(Q(author__profile_status='active') | Q(author=user))
        return queryset

    def perform_create(self, serializer):
        serializer.save()

    def toggle_like(self, request, post_id=None):
        post = get_object_or_404(self.get_queryset(), pk=post_id)
        like, created = PostLike.objects.get_or_create(post=post, user=request.user)
        if not created:
            like.delete()
        elif post.author_id != request.user.id:
            from apps.notifications.services import create_notification
            create_notification(
                recipient=post.author,
                actor=request.user,
                notification_type='post_interaction',
                body=f'{request.user.display_name} liked your post.',
                target_type='post',
                target_id=post.id,
            )
        return Response({
            'liked': created,
            'likes_count': PostLike.objects.filter(post=post).count(),
        })

    def toggle_interest(self, request, post_id=None):
        post = get_object_or_404(self.get_queryset(), pk=post_id)
        interest, created = PostInterest.objects.get_or_create(post=post, user=request.user)
        if not created:
            interest.delete()
        return Response({'interested': created})


class CommentViewSet(viewsets.GenericViewSet):
    serializer_class = CommentSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Comment.objects.filter(post_id=self.kwargs['post_id']).select_related('author').prefetch_related('author__profile_photos')

    def get_post(self, post_id):
        return get_visible_post(self.request, post_id)

    def list(self, request, post_id=None):
        self.get_post(post_id)
        return Response(self.get_serializer(self.get_queryset(), many=True, context={'request': request}).data)

    def create(self, request, post_id=None):
        post = self.get_post(post_id)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(post=post, author=request.user)
        if post.author_id != request.user.id:
            from apps.notifications.services import create_notification
            create_notification(
                recipient=post.author,
                actor=request.user,
                notification_type='comment',
                body=f'{request.user.display_name} commented on your post.',
                target_type='post',
                target_id=post.id,
            )
        return Response(
            self.get_serializer(comment, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class PollVoteView(APIView):
    def post(self, request, post_id):
        post = get_visible_post(request, post_id)
        if post.type != Post.Type.POLL:
            raise Http404
        option_id = request.data.get('option_id')
        option_index = request.data.get('option_index')
        if option_id:
            option = get_object_or_404(PollOption, pk=option_id, post=post)
        elif option_index is not None:
            try:
                option = post.poll_options.get(position=int(option_index))
            except (TypeError, ValueError, PollOption.DoesNotExist) as exc:
                raise ValidationError({'option_index': 'Choose a valid poll option.'}) from exc
        else:
            raise ValidationError({'option_id': 'Provide option_id or option_index.'})
        vote, created = PollVote.objects.get_or_create(post=post, user=request.user, defaults={'option': option})
        if not created and vote.option_id != option.id:
            vote.option = option
            vote.save(update_fields=('option',))
        options = list(post.poll_options.all())
        return Response({
            'selected_option': str(option.id),
            'selected_option_index': option.position,
            'poll_votes': [item.votes.count() for item in options],
            'total_votes': post.poll_votes.count(),
        })
