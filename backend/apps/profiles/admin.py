from django.contrib import admin
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.profiles.models import ProfilePhoto, VerificationRequest


@admin.register(ProfilePhoto)
class ProfilePhotoAdmin(admin.ModelAdmin):
    list_display = ('user', 'position', 'is_primary', 'created_at')
    search_fields = ('user__email', 'user__display_name')


@admin.register(VerificationRequest)
class VerificationRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'created_at', 'reviewed_at', 'reviewed_by')
    list_filter = ('status', 'created_at')
    search_fields = ('user__email', 'user__display_name')
    readonly_fields = ('created_at', 'reviewed_at', 'reviewed_by')
    actions = ('approve_requests', 'reject_requests')

    @admin.action(description='Approve selected verification requests')
    def approve_requests(self, request, queryset):
        self._review_requests(request, queryset, VerificationRequest.Status.APPROVED)

    @admin.action(description='Reject selected verification requests')
    def reject_requests(self, request, queryset):
        self._review_requests(request, queryset, VerificationRequest.Status.REJECTED)

    @transaction.atomic
    def _review_requests(self, request, queryset, outcome):
        from apps.notifications.services import create_notification

        for verification in queryset.select_related('user'):
            if verification.status != VerificationRequest.Status.PENDING:
                continue
            verification.status = outcome
            verification.reviewed_at = timezone.now()
            verification.reviewed_by = request.user
            verification.save(update_fields=('status', 'reviewed_at', 'reviewed_by'))
            verification.user.verification_status = (
                User.VerificationStatus.VERIFIED
                if outcome == VerificationRequest.Status.APPROVED
                else User.VerificationStatus.REJECTED
            )
            verification.user.save(update_fields=('verification_status',))
            outcome_label = 'approved' if outcome == VerificationRequest.Status.APPROVED else 'reviewed'
            create_notification(
                recipient=verification.user,
                actor=request.user,
                notification_type='verification',
                body=f'Your profile verification request was {outcome_label}.',
                target_type='profile',
                target_id=verification.user_id,
            )
