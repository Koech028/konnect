from django.contrib import admin
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.profiles.models import ProfilePhoto, VerificationRequest
from apps.safety.admin import ModerationModelAdmin
from apps.safety.models import ModerationAuditEvent


@admin.register(ProfilePhoto)
class ProfilePhotoAdmin(admin.ModelAdmin):
    list_display = ('user', 'position', 'is_primary', 'created_at')
    search_fields = ('user__email', 'user__display_name')


@admin.register(VerificationRequest)
class VerificationRequestAdmin(ModerationModelAdmin):
    _case_type = ModerationAuditEvent.CaseType.VERIFICATION
    actions = ('claim_verification_requests', 'approve_requests', 'reject_requests')
    list_display = ('user', 'status', 'assigned_to', 'created_at', 'reviewed_at', 'reviewed_by')
    list_filter = ('status', 'assigned_to', 'created_at')
    search_fields = ('user__email', 'user__display_name')
    list_select_related = ('user', 'assigned_to', 'reviewed_by')
    fields = (
        'user',
        'status',
        'assigned_to',
        'review_notes',
        'created_at',
        'reviewed_at',
        'reviewed_by',
    )
    readonly_fields = ('user', 'status', 'created_at', 'reviewed_at', 'reviewed_by')

    @admin.action(description='Assign selected verification requests to me')
    def claim_verification_requests(self, request, queryset):
        for verification in queryset:
            self._record_update(
                request,
                verification,
                assigned_to=request.user,
                message='Verification request assigned to the current moderator.',
            )

    def save_model(self, request, obj, form, change):
        if change and 'review_notes' in form.changed_data:
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)

    @admin.action(description='Approve selected verification requests')
    def approve_requests(self, request, queryset):
        self._review_requests(request, queryset, VerificationRequest.Status.APPROVED)

    @admin.action(description='Reject selected verification requests')
    def reject_requests(self, request, queryset):
        self._review_requests(request, queryset, VerificationRequest.Status.REJECTED)

    @transaction.atomic
    def _review_requests(self, request, queryset, outcome):
        from apps.notifications.services import create_notification

        for verification in queryset.select_for_update().select_related('user'):
            if verification.status != VerificationRequest.Status.PENDING:
                continue
            verification.status = outcome
            verification.reviewed_at = timezone.now()
            verification.reviewed_by = request.user
            verification.save(update_fields=('status', 'reviewed_at', 'reviewed_by'))
            ModerationAuditEvent.objects.create(
                case_type=ModerationAuditEvent.CaseType.VERIFICATION,
                case_id=verification.pk,
                actor=request.user,
                action=outcome,
                details=f'Verification request {outcome}.',
                previous_status=VerificationRequest.Status.PENDING,
                new_status=outcome,
                review_notes=verification.review_notes,
            )
            self.log_change(
                request,
                verification,
                f'Verification request {outcome}.',
            )
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
