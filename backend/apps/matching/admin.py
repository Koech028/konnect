from django.contrib import admin

from apps.matching.models import Match, UserLike

admin.site.register(UserLike)
admin.site.register(Match)
