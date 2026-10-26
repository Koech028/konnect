from django.contrib import admin

from apps.posts.models import Comment, PollOption, Post, PostLike, PostMedia, PollVote

admin.site.register(Post)
admin.site.register(PostMedia)
admin.site.register(PollOption)
admin.site.register(PostLike)
admin.site.register(Comment)
admin.site.register(PollVote)
