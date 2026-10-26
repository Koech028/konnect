from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.response import Response

from rest_framework.views import APIView

from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.models import PushSubscription
from apps.notifications.push_serializers import PushSubscriptionSerializer
from apps.notifications.serializers import NotificationPreferenceSerializer, NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).select_related('actor').prefetch_related('actor__profile_photos')

    def mark_read(self, request, pk=None):
        notification = get_object_or_404(self.get_queryset(), pk=pk)
        notification.read = True
        notification.save(update_fields=('read',))
        return Response(self.get_serializer(notification).data)

    def read_all(self, request):
        updated = self.get_queryset().filter(read=False).update(read=True)
        return Response({'updated': updated}, status=status.HTTP_200_OK)


class NotificationPreferencesView(APIView):
    def get(self, request):
        preferences, _created = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(preferences).data)

    def patch(self, request):
        preferences, _created = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(preferences, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PushConfigView(APIView):
    def get(self, request):
        from django.conf import settings
        return Response({'public_key': settings.VAPID_PUBLIC_KEY})


class PushSubscriptionView(APIView):
    def get(self, request):
        return Response({'subscribed': PushSubscription.objects.filter(user=request.user).exists()})

    def post(self, request):
        serializer = PushSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        endpoint = serializer.validated_data['endpoint']
        if (
            not PushSubscription.objects.filter(endpoint=endpoint).exists()
            and PushSubscription.objects.filter(user=request.user).count() >= 10
        ):
            return Response({'detail': 'This account has reached the browser subscription limit.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        subscription, created = PushSubscription.objects.get_or_create(
            endpoint=endpoint,
            defaults={
                'user': request.user,
                'p256dh': serializer.validated_data['p256dh'],
                'auth': serializer.validated_data['auth'],
            },
        )
        if not created and subscription.user_id != request.user.id:
            return Response({'detail': 'This browser subscription is already registered.'}, status=status.HTTP_409_CONFLICT)
        if not created:
            subscription.p256dh = serializer.validated_data['p256dh']
            subscription.auth = serializer.validated_data['auth']
            subscription.save(update_fields=('p256dh', 'auth', 'updated_at'))
        return Response({'subscribed': True}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request):
        endpoint = request.data.get('endpoint')
        if not isinstance(endpoint, str) or not endpoint:
            return Response({'endpoint': ['A subscription endpoint is required.']}, status=status.HTTP_400_BAD_REQUEST)
        PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
