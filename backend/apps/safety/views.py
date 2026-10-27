from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework import status, throttling, viewsets
from rest_framework.response import Response

from apps.safety.models import Block, ContentReport, Report
from apps.safety.serializers import BlockSerializer, ContentReportSerializer, ReportSerializer


class BlockViewSet(viewsets.GenericViewSet):
    serializer_class = BlockSerializer

    def get_queryset(self):
        return Block.objects.filter(blocker=self.request.user).select_related('blocked').prefetch_related('blocked__profile_photos')

    def list(self, request):
        return Response(self.get_serializer(self.get_queryset(), many=True, context={'request': request}).data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        block = serializer.save()
        from apps.matching.models import UserLike
        UserLike.objects.filter(
            Q(sender=request.user, recipient=block.blocked) |
            Q(sender=block.blocked, recipient=request.user)
        ).delete()
        return Response(self.get_serializer(block, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        block = get_object_or_404(self.get_queryset(), pk=pk)
        block.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReportViewSet(viewsets.GenericViewSet):
    serializer_class = ReportSerializer

    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user).select_related('reported_user').prefetch_related('reported_user__profile_photos')

    def list(self, request):
        return Response(self.get_serializer(self.get_queryset(), many=True, context={'request': request}).data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save()
        return Response(self.get_serializer(report, context={'request': request}).data, status=status.HTTP_201_CREATED)


class ContentReportViewSet(viewsets.GenericViewSet):
    serializer_class = ContentReportSerializer
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'content-report'

    def get_queryset(self):
        return ContentReport.objects.filter(reporter=self.request.user).select_related(
            'short', 'comment', 'comment__short'
        )

    def list(self, request):
        reports = self.get_queryset()
        return Response(self.get_serializer(reports, many=True, context={'request': request}).data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save()
        return Response(
            self.get_serializer(report, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )
