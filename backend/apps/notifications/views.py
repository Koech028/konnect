from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.response import Response

from rest_framework.views import APIView

from apps.notifications.models import Notification, NotificationPreference
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
