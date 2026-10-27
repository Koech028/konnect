from django.contrib import admin

from apps.safety.models import Block, ContentReport, Report


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ('blocker', 'blocked', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('blocker__email', 'blocked__email')
    readonly_fields = ('created_at',)


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('reported_user', 'reporter', 'reason', 'status', 'created_at')
    list_filter = ('status', 'reason', 'created_at')
    search_fields = ('reported_user__email', 'reporter__email', 'details')
    readonly_fields = ('reporter', 'reported_user', 'reason', 'details', 'created_at')


@admin.register(ContentReport)
class ContentReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'reporter', 'target_summary', 'reason', 'status', 'created_at')
    list_filter = ('status', 'reason', 'created_at')
    search_fields = (
        'reporter__email',
        'short__caption',
        'comment__text',
        'details',
    )
    readonly_fields = ('reporter', 'short', 'comment', 'reason', 'details', 'created_at')

    @admin.display(description='Reported content')
    def target_summary(self, obj):
        if obj.short_id:
            return f'Short: {obj.short.caption[:60] or obj.short_id}'
        if obj.comment_id:
            return f'Comment: {obj.comment.text[:60]}'
        return 'Content no longer exists'
