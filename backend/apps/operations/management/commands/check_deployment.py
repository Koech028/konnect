import os
from smtplib import SMTPException

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from django.core.management import BaseCommand, CommandError
from django.core.mail import get_connection
from django.db import DatabaseError, connection
from django.db.migrations.executor import MigrationExecutor


class Command(BaseCommand):
    help = 'Check production security, database migrations, email, and media storage.'

    def handle(self, *args, **options):
        checks = (
            ('Production security settings', self.check_security),
            ('PostgreSQL connection', self.check_database),
            ('Database migrations', self.check_migrations),
            ('SMTP connection', self.check_email),
            ('R2 bucket access', self.check_storage),
        )
        failed = False
        for label, check in checks:
            try:
                check()
            except CommandError as exc:
                failed = True
                self.stderr.write(self.style.ERROR(f'FAIL {label}: {exc}'))
            else:
                self.stdout.write(self.style.SUCCESS(f'OK   {label}'))
        if failed:
            raise CommandError('Deployment preflight failed; resolve the checks above.')

    @staticmethod
    def check_security():
        if settings.DEBUG:
            raise CommandError('DJANGO_DEBUG must be false.')
        if not settings.SECRET_KEY or settings.SECRET_KEY == 'local-development-only-change-me':
            raise CommandError('Set a production DJANGO_SECRET_KEY.')
        if not settings.ALLOWED_HOSTS or '*' in settings.ALLOWED_HOSTS:
            raise CommandError('Set explicit DJANGO_ALLOWED_HOSTS; wildcard hosts are not allowed.')
        secure_settings = (
            'SECURE_SSL_REDIRECT',
            'SESSION_COOKIE_SECURE',
            'CSRF_COOKIE_SECURE',
        )
        missing = [name for name in secure_settings if not getattr(settings, name, False)]
        if missing:
            raise CommandError(f'Enable required HTTPS settings: {", ".join(missing)}.')

    @staticmethod
    def check_database():
        if connection.vendor != 'postgresql':
            raise CommandError('Production database must be PostgreSQL.')
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
        except DatabaseError as exc:
            raise CommandError(f'Database query failed ({exc.__class__.__name__}).') from exc

    @staticmethod
    def check_migrations():
        try:
            executor = MigrationExecutor(connection)
            pending = executor.migration_plan(executor.loader.graph.leaf_nodes())
        except DatabaseError as exc:
            raise CommandError(f'Could not inspect migrations ({exc.__class__.__name__}).') from exc
        if pending:
            names = ', '.join(f'{app}.{name}' for app, name in pending[:10])
            remaining = len(pending) - 10
            suffix = f' and {remaining} more' if remaining > 0 else ''
            raise CommandError(f'Unapplied migrations: {names}{suffix}.')

    @staticmethod
    def check_email():
        if settings.EMAIL_BACKEND != settings.SMTP_EMAIL_BACKEND:
            raise CommandError('Configure the SMTP email backend.')
        if not all((
            settings.EMAIL_HOST,
            settings.EMAIL_HOST_USER,
            settings.EMAIL_HOST_PASSWORD,
            settings.CONFIGURED_DEFAULT_FROM_EMAIL,
        )):
            raise CommandError('Configure the SMTP host, credentials, and sender address.')
        email_connection = get_connection()
        try:
            email_connection.open()
        except (OSError, SMTPException) as exc:
            raise CommandError(f'SMTP connection failed ({exc.__class__.__name__}).') from exc
        finally:
            email_connection.close()

    @staticmethod
    def check_storage():
        account_id = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '').strip()
        access_key = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID', '').strip()
        secret_key = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY', '').strip()
        bucket = os.environ.get('CLOUDFLARE_R2_BUCKET', '').strip()
        public_url = os.environ.get('CLOUDFLARE_R2_PUBLIC_URL', '').strip().rstrip('/')
        if not all((account_id, access_key, secret_key, bucket)):
            raise CommandError('Configure all Cloudflare R2 credentials and the bucket name.')
        if not public_url.startswith('https://'):
            raise CommandError('CLOUDFLARE_R2_PUBLIC_URL must use HTTPS.')
        client = boto3.client(
            's3',
            endpoint_url=f'https://{account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name='auto',
            config=Config(
                signature_version='s3v4',
                connect_timeout=5,
                read_timeout=5,
                retries={'max_attempts': 1},
            ),
        )
        try:
            client.head_bucket(Bucket=bucket)
        except (BotoCoreError, ClientError, OSError) as exc:
            raise CommandError(f'R2 bucket check failed ({exc.__class__.__name__}).') from exc
