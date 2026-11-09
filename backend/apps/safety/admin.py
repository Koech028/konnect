from django.contrib import admin
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import User
from apps.safety.models import Block, ContentReport, ModerationAuditEvent, Report

MODERATOR_GROUP_NAME = 'Moderators'


def is_moderator(user):
    return user.is_superuser or (
        user.is_authenticated
        and user.is_staff
        and user.groups.filter(name=MODERATOR_GROUP_NAME).exists()
    )


class ModerationModelAdmin(admin.ModelAdmin):
    actions = ('claim_selected', 'mark_selected_reviewing', 'close_selected')

    def has_module_permission(self, request):
        return is_moderator(request.user)

    def has_view_permission(self, request, obj=None):
        return is_moderator(request.user)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return is_moderator(request.user)

    def has_delete_permission(self, request, obj=None):
        return False

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'assigned_to':
            kwargs['queryset'] = User.objects.filter(
                Q(is_superuser=True) | Q(is_staff=True, groups__name=MODERATOR_GROUP_NAME)
            ).distinct()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        previous = self.model.objects.get(pk=obj.pk) if change else None
        super().save_model(request, obj, form, change)
        changed_fields = set(form.changed_data)
        if changed_fields.intersection(('status', 'assigned_to', 'review_notes')):
            details = []
            if 'status' in changed_fields:
                details.append(f'status: {previous.status} -> {obj.status}')
            if 'assigned_to' in changed_fields:
                details.append(
                    f'assigned_to: {previous.assigned_to_id} -> {obj.assigned_to_id}'
                )
            if 'review_notes' in changed_fields:
                details.append('review_notes updated')
            ModerationAuditEvent.objects.create(
                case_type=self._case_type,
                case_id=obj.pk,
                actor=request.user,
                action='case_updated',
                details='; '.join(details),
                previous_status=previous.status,
                new_status=obj.status,
                review_notes=obj.review_notes,
            )

    def _record_update(
        self,
        request,
        case,
        *,
        status=None,
        assigned_to=None,
        message,
        start_reviewing=False,
        only_unclosed=False,
    ):
        with transaction.atomic():
            case = self.model.objects.select_for_update().get(pk=case.pk)
            if only_unclosed and case.status == case.Status.CLOSED:
                return
            previous_status = case.status
            previous_assignee_id = case.assigned_to_id
            fields = []
            if start_reviewing and case.status == case.Status.OPEN:
                status = case.Status.REVIEWING
            if status is not None and case.status != status:
                case.status = status
                fields.append('status')
            if assigned_to is not None and case.assigned_to_id != assigned_to.pk:
                case.assigned_to = assigned_to
                fields.append('assigned_to')
            if not fields:
                return
            case.reviewed_by = request.user
            case.reviewed_at = timezone.now()
            fields.extend(('reviewed_by', 'reviewed_at'))
            case.save(update_fields=fields)
            self.log_change(request, case, message)
            changes = []
            if previous_status != case.status:
                changes.append(f'status: {previous_status} -> {case.status}')
            if previous_assignee_id != case.assigned_to_id:
                changes.append(f'assigned_to: {previous_assignee_id} -> {case.assigned_to_id}')
            ModerationAuditEvent.objects.create(
                case_type=self._case_type,
                case_id=case.pk,
                actor=request.user,
                action='case_updated',
                details='; '.join(changes),
                previous_status=previous_status,
                new_status=case.status,
                review_notes=case.review_notes,
            )

    @admin.action(description='Assign selected cases to me')
    def claim_selected(self, request, queryset):
        for case in queryset:
            self._record_update(
                request,
                case,
                assigned_to=request.user,
                message='Case assigned to the current moderator.',
                start_reviewing=True,
                only_unclosed=True,
            )

    @admin.action(description='Mark selected cases as reviewing')
    def mark_selected_reviewing(self, request, queryset):
        for case in queryset:
            self._record_update(
                request,
                case,
                status=case.Status.REVIEWING,
                message='Case marked as reviewing.',
                only_unclosed=True,
            )

    @admin.action(description='Close selected cases')
    def close_selected(self, request, queryset):
        for case in queryset:
            self._record_update(
                request,
                case,
                status=case.Status.CLOSED,
                message='Case closed.',
            )


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ('blocker', 'blocked', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('blocker__email', 'blocked__email')
    readonly_fields = ('created_at',)


@admin.register(Report)
class ReportAdmin(ModerationModelAdmin):
    _case_type = ModerationAuditEvent.CaseType.USER_REPORT
    list_display = (
        'reported_user',
        'reporter',
        'reason',
        'status',
        'assigned_to',
        'created_at',
    )
    list_filter = ('status', 'reason', 'assigned_to', 'created_at')
    search_fields = ('reported_user__email', 'reporter__email', 'details')
    list_select_related = ('reported_user', 'reporter', 'assigned_to')
    fields = (
        'reporter',
        'reported_user',
        'reason',
        'details',
        'status',
        'assigned_to',
        'review_notes',
        'reviewed_by',
        'reviewed_at',
        'created_at',
    )
    readonly_fields = (
        'reporter',
        'reported_user',
        'reason',
        'details',
        'reviewed_by',
        'reviewed_at',
        'created_at',
    )

    def save_model(self, request, obj, form, change):
        if change and {'status', 'review_notes'}.intersection(form.changed_data):
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)


@admin.register(ContentReport)
class ContentReportAdmin(ModerationModelAdmin):
    _case_type = ModerationAuditEvent.CaseType.CONTENT_REPORT
    list_display = (
        'id',
        'reporter',
        'target_summary',
        'reason',
        'status',
        'assigned_to',
        'created_at',
    )
    list_filter = ('status', 'reason', 'assigned_to', 'created_at')
    search_fields = (
        'reporter__email',
        'short__caption',
        'comment__text',
        'offer__title',
        'offer__host__email',
        'details',
    )
    list_select_related = ('reporter', 'short', 'comment', 'offer', 'assigned_to')
    fields = (
        'reporter',
        'short',
        'comment',
        'offer',
        'reason',
        'details',
        'status',
        'assigned_to',
        'review_notes',
        'reviewed_by',
        'reviewed_at',
        'created_at',
    )
    readonly_fields = (
        'reporter',
        'short',
        'comment',
        'offer',
        'reason',
        'details',
        'reviewed_by',
        'reviewed_at',
        'created_at',
    )

    def save_model(self, request, obj, form, change):
        if change and {'status', 'review_notes'}.intersection(form.changed_data):
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)

    @admin.display(description='Reported content')
    def target_summary(self, obj):
        if obj.short_id:
            return f'Short: {obj.short.caption[:60] or obj.short_id}'
        if obj.comment_id:
            return f'Comment: {obj.comment.text[:60]}'
        if obj.offer_id:
            return f'Offer: {obj.offer.title[:60]}'
        return 'Content no longer exists'


@admin.register(ModerationAuditEvent)
class ModerationAuditEventAdmin(admin.ModelAdmin):
    list_display = ('case_type', 'case_id', 'action', 'actor', 'created_at')
    list_filter = ('case_type', 'action', 'created_at')
    search_fields = ('case_id', 'actor__email', 'details', 'review_notes')
    readonly_fields = (
        'case_type',
        'case_id',
        'actor',
        'action',
        'details',
        'previous_status',
        'new_status',
        'review_notes',
        'created_at',
    )

    def has_module_permission(self, request):
        return is_moderator(request.user)

    def has_view_permission(self, request, obj=None):
        return is_moderator(request.user)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
