from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import LoginView, RegisterView, CurrentUserView, PasswordResetRequestView, PasswordResetConfirmView
from apps.matching.views import LikeView, IncomingLikesView, OutgoingLikesView, MatchViewSet
from apps.messaging.views import MessageViewSet
from apps.notifications.views import (
    NotificationPreferencesView,
    NotificationViewSet,
    PushConfigView,
    PushSubscriptionView,
)
from apps.posts.views import PostViewSet, CommentViewSet, PollVoteView
from apps.profiles.views import ProfileViewSet, ProfilePhotoViewSet, VerificationRequestView
from apps.safety.views import BlockViewSet, ContentReportViewSet, ReportViewSet
from apps.livestreams.views import (
    GiftView,
    LiveStreamDetailView,
    LiveStreamJoinView,
    LiveStreamListCreateView,
    LiveStreamStopView,
    WalletView,
)
from apps.community.views import (
    DailyPromptView,
    EventDetailView,
    EventListCreateView,
    ShortCommentListCreateView,
    ShortDetailView,
    ShortLikeView,
    ShortListCreateView,
    ShortWatchView,
    StoryDetailView,
    StoryListCreateView,
)
from apps.accounts.views import PremiumStatusView
from config.media import MediaUploadUrlView


def health_check(_request):
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1')
        cursor.fetchone()
    return JsonResponse({'status': 'ok', 'service': 'linkup-api'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health-check'),
    path('api/v1/media/upload-url/', MediaUploadUrlView.as_view(), name='media-upload-url'),
    path('api/v1/auth/register/', RegisterView.as_view(), name='register'),
    path('api/v1/auth/login/', LoginView.as_view(), name='token-obtain-pair'),
    path('api/v1/auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('api/v1/auth/me/', CurrentUserView.as_view(), name='current-user'),
    path('api/v1/premium/', PremiumStatusView.as_view(), name='premium-status'),
    path('api/v1/auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('api/v1/auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('api/v1/profiles/me/', ProfileViewSet.as_view({'get': 'me', 'patch': 'update_me'}), name='my-profile'),
    path('api/v1/profiles/<uuid:pk>/', ProfileViewSet.as_view({'get': 'retrieve'}), name='profile-detail'),
    path('api/v1/discover/', ProfileViewSet.as_view({'get': 'discover'}), name='discover'),
    path('api/v1/profiles/me/photos/', ProfilePhotoViewSet.as_view({'get': 'list', 'post': 'create'}), name='my-photos'),
    path('api/v1/profiles/me/photos/<uuid:pk>/', ProfilePhotoViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'}), name='my-photo-detail'),
    path('api/v1/profiles/me/verification/', VerificationRequestView.as_view(), name='verification-request'),
    path('api/v1/posts/', PostViewSet.as_view({'get': 'list', 'post': 'create'}), name='post-list'),
    path('api/v1/posts/<uuid:pk>/', PostViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='post-detail'),
    path('api/v1/posts/<uuid:post_id>/like/', PostViewSet.as_view({'post': 'toggle_like'}), name='post-like'),
    path('api/v1/posts/<uuid:post_id>/interest/', PostViewSet.as_view({'post': 'toggle_interest'}), name='post-interest'),
    path('api/v1/posts/<uuid:post_id>/comments/', CommentViewSet.as_view({'get': 'list', 'post': 'create'}), name='post-comments'),
    path('api/v1/posts/<uuid:post_id>/poll-vote/', PollVoteView.as_view(), name='poll-vote'),
    path('api/v1/likes/', LikeView.as_view(), name='like-user'),
    path('api/v1/likes/incoming/', IncomingLikesView.as_view(), name='incoming-likes'),
    path('api/v1/likes/outgoing/', OutgoingLikesView.as_view(), name='outgoing-likes'),
    path('api/v1/matches/', MatchViewSet.as_view({'get': 'list'}), name='matches'),
    path('api/v1/matches/<uuid:pk>/', MatchViewSet.as_view({'get': 'retrieve'}), name='match-detail'),
    path('api/v1/matches/<uuid:match_id>/messages/', MessageViewSet.as_view({'get': 'list', 'post': 'create'}), name='match-messages'),
    path('api/v1/matches/<uuid:match_id>/messages/activity/', MessageViewSet.as_view({'get': 'activity', 'post': 'activity'}), name='match-message-activity'),
    path('api/v1/notifications/', NotificationViewSet.as_view({'get': 'list'}), name='notifications'),
    path('api/v1/notifications/read-all/', NotificationViewSet.as_view({'post': 'read_all'}), name='notifications-read-all'),
    path('api/v1/notifications/<uuid:pk>/read/', NotificationViewSet.as_view({'post': 'mark_read'}), name='notification-read'),
    path('api/v1/settings/notifications/', NotificationPreferencesView.as_view(), name='notification-preferences'),
    path('api/v1/settings/push/config/', PushConfigView.as_view(), name='push-config'),
    path('api/v1/settings/push/subscription/', PushSubscriptionView.as_view(), name='push-subscription'),
    path('api/v1/stories/', StoryListCreateView.as_view(), name='story-list-create'),
    path('api/v1/stories/<uuid:pk>/', StoryDetailView.as_view(), name='story-detail'),
    path('api/v1/shorts/', ShortListCreateView.as_view(), name='short-list-create'),
    path('api/v1/shorts/<uuid:pk>/', ShortDetailView.as_view(), name='short-detail'),
    path('api/v1/shorts/<uuid:pk>/like/', ShortLikeView.as_view(), name='short-like'),
    path('api/v1/shorts/<uuid:pk>/watch/', ShortWatchView.as_view(), name='short-watch'),
    path('api/v1/shorts/<uuid:pk>/comments/', ShortCommentListCreateView.as_view(), name='short-comments'),
    path('api/v1/prompts/today/', DailyPromptView.as_view(), name='daily-prompt-today'),
    path('api/v1/events/', EventListCreateView.as_view(), name='event-list-create'),
    path('api/v1/events/<uuid:pk>/', EventDetailView.as_view(), name='event-detail'),
    path('api/v1/safety/blocks/', BlockViewSet.as_view({'get': 'list', 'post': 'create'}), name='blocks'),
    path('api/v1/safety/blocks/<uuid:pk>/', BlockViewSet.as_view({'delete': 'destroy'}), name='block-detail'),
    path('api/v1/safety/reports/', ReportViewSet.as_view({'get': 'list', 'post': 'create'}), name='reports'),
    path('api/v1/safety/content-reports/', ContentReportViewSet.as_view({'get': 'list', 'post': 'create'}), name='content-reports'),
    path('api/v1/live/', LiveStreamListCreateView.as_view(), name='live-list-create'),
    path('api/v1/live/wallet/', WalletView.as_view(), name='live-wallet'),
    path('api/v1/live/<uuid:pk>/', LiveStreamDetailView.as_view(), name='live-detail'),
    path('api/v1/live/<uuid:pk>/join/', LiveStreamJoinView.as_view(), name='live-join'),
    path('api/v1/live/<uuid:pk>/end/', LiveStreamStopView.as_view(), name='live-end'),
    path('api/v1/live/<uuid:pk>/gifts/', GiftView.as_view(), name='live-gifts'),
]
