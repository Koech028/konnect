from django.contrib import admin

from apps.livestreams.models import Gift, LiveStream, Wallet


@admin.register(LiveStream)
class LiveStreamAdmin(admin.ModelAdmin):
    list_display = ('title', 'host', 'status', 'created_at', 'ended_at')
    list_filter = ('status',)
    search_fields = ('title', 'host__email', 'host__display_name')


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'updated_at')
    search_fields = ('user__email', 'user__display_name')


@admin.register(Gift)
class GiftAdmin(admin.ModelAdmin):
    list_display = ('gift_type', 'sender', 'recipient', 'credits', 'created_at')
    list_filter = ('gift_type',)
    search_fields = ('sender__email', 'recipient__email', 'stream__title')
