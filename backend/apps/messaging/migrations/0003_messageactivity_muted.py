from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0002_messageactivity'),
    ]

    operations = [
        migrations.AddField(
            model_name='messageactivity',
            name='muted',
            field=models.BooleanField(default=False),
        ),
    ]