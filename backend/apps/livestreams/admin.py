from django.contrib import admin

from apps.livestreams.models import (
    CreatorEarning,
    Gift,
    LiveStream,
    LiveStreamAdmission,
    Wallet,
    WalletTransaction,
)


@admin.register(LiveStream)
class LiveStreamAdmin(admin.ModelAdmin):
    list_display = ('title', 'host', 'status', 'entry_price', 'created_at', 'ended_at')
    list_filter = ('status',)
    search_fields = ('title', 'host__email', 'host__display_name')


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'promotional_balance', 'purchased_balance', 'updated_at')
    search_fields = ('user__email', 'user__display_name')
    readonly_fields = tuple(field.name for field in Wallet._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ('wallet', 'transaction_type', 'credits_delta', 'balance_after', 'reference', 'created_at')
    list_filter = ('transaction_type',)
    search_fields = ('wallet__user__email', 'reference')
    readonly_fields = tuple(field.name for field in WalletTransaction._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Gift)
class GiftAdmin(admin.ModelAdmin):
    list_display = ('gift_type', 'sender', 'recipient', 'credits', 'created_at')
    list_filter = ('gift_type',)
    search_fields = ('sender__email', 'recipient__email', 'stream__title')


@admin.register(LiveStreamAdmission)
class LiveStreamAdmissionAdmin(admin.ModelAdmin):
    list_display = ('stream', 'viewer', 'credits_paid', 'promotional_credits_paid', 'purchased_credits_paid', 'created_at')
    search_fields = ('stream__title', 'viewer__email', 'viewer__display_name')


@admin.register(CreatorEarning)
class CreatorEarningAdmin(admin.ModelAdmin):
    list_display = (
        'creator',
        'stream',
        'eligible_credits',
        'estimated_creator_share_kes',
        'estimated_platform_share_kes',
        'status',
        'created_at',
    )
    list_filter = ('status',)
    search_fields = ('creator__email', 'creator__display_name', 'stream__title')
    readonly_fields = tuple(field.name for field in CreatorEarning._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
