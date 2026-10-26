from django.contrib import admin

from apps.notifications.models import Notification, NotificationPreference

admin.site.register(Notification)
admin.site.register(NotificationPreference)
