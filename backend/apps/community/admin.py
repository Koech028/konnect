from django.contrib import admin

from apps.community.models import DailyPromptResponse, DatingEvent, EventRSVP, Short, Story


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ('author', 'created_at', 'expires_at')
    list_filter = ('created_at', 'expires_at')
    search_fields = ('author__email', 'author__display_name', 'text')
    readonly_fields = ('created_at', 'expires_at')


@admin.register(Short)
class ShortAdmin(admin.ModelAdmin):
    list_display = ('author', 'caption', 'duration_seconds', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('author__email', 'author__display_name', 'caption')
    readonly_fields = ('created_at',)


@admin.register(DailyPromptResponse)
class DailyPromptResponseAdmin(admin.ModelAdmin):
    list_display = ('user', 'prompt_date', 'updated_at')
    list_filter = ('prompt_date',)
    search_fields = ('user__email', 'user__display_name', 'answer')
    readonly_fields = ('user', 'prompt_date', 'answer', 'updated_at')


class EventRSVPInline(admin.TabularInline):
    model = EventRSVP
    extra = 0
    readonly_fields = ('user', 'created_at')
    can_delete = False


@admin.register(DatingEvent)
class DatingEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'host', 'location', 'starts_at', 'ends_at')
    list_filter = ('starts_at',)
    search_fields = ('title', 'host__email', 'host__display_name', 'location')
    inlines = (EventRSVPInline,)
