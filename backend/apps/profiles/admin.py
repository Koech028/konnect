from django.contrib import admin

from apps.profiles.models import ProfilePhoto, VerificationRequest

admin.site.register(ProfilePhoto)
admin.site.register(VerificationRequest)
