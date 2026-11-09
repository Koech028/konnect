import os
from io import StringIO
from unittest.mock import Mock, patch

from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings
from django.db import connection

from apps.operations.management.commands.check_deployment import Command


class DeploymentPreflightTests(TestCase):
    @override_settings(
        DEBUG=False,
        SECRET_KEY='a-production-secret-key-that-is-long-enough',
        ALLOWED_HOSTS=['api.example.com'],
        SECURE_SSL_REDIRECT=True,
        SESSION_COOKIE_SECURE=True,
        CSRF_COOKIE_SECURE=True,
    )
    def test_security_check_accepts_explicit_production_settings(self):
        Command.check_security()

    @override_settings(DEBUG=True)
    def test_security_check_rejects_debug_mode(self):
        with self.assertRaisesRegex(CommandError, 'DJANGO_DEBUG must be false'):
            Command.check_security()

    def test_database_check_requires_postgresql_and_runs_query(self):
        with patch.object(connection, 'vendor', 'postgresql'):
            Command.check_database()
        with patch.object(connection, 'vendor', 'sqlite'):
            with self.assertRaisesRegex(CommandError, 'must be PostgreSQL'):
                Command.check_database()

    def test_migration_check_reports_unapplied_migrations(self):
        executor = Mock()
        executor.loader.graph.leaf_nodes.return_value = [('accounts', '0002_next')]
        executor.migration_plan.return_value = [('accounts', '0002_next')]
        with patch(
            'apps.operations.management.commands.check_deployment.MigrationExecutor',
            return_value=executor,
        ):
            with self.assertRaisesRegex(CommandError, 'accounts.0002_next'):
                Command.check_migrations()

    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend',
        SMTP_EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend',
        EMAIL_HOST='smtp.example.com',
        EMAIL_HOST_USER='mail-user',
        EMAIL_HOST_PASSWORD='test-mail-password',
        CONFIGURED_DEFAULT_FROM_EMAIL='LinkUp <no-reply@example.com>',
    )
    def test_email_check_connects_and_closes_without_sending(self):
        email_connection = Mock()
        with patch(
            'apps.operations.management.commands.check_deployment.get_connection',
            return_value=email_connection,
        ):
            Command.check_email()
        email_connection.open.assert_called_once_with()
        email_connection.close.assert_called_once_with()

    def test_storage_check_verifies_bucket_without_exposing_credentials(self):
        environment = {
            'CLOUDFLARE_ACCOUNT_ID': 'test-account',
            'CLOUDFLARE_R2_ACCESS_KEY_ID': 'test-access-key',
            'CLOUDFLARE_R2_SECRET_ACCESS_KEY': 'test-secret-key',
            'CLOUDFLARE_R2_BUCKET': 'test-bucket',
            'CLOUDFLARE_R2_PUBLIC_URL': 'https://media.example.com/',
        }
        client = Mock()
        with patch.dict(os.environ, environment, clear=False), patch(
            'apps.operations.management.commands.check_deployment.boto3.client',
            return_value=client,
        ):
            Command.check_storage()
        client.head_bucket.assert_called_once_with(Bucket='test-bucket')

    def test_command_reports_failure_without_secret_values(self):
        output = StringIO()
        with patch.object(Command, 'check_security'), patch.object(
            Command,
            'check_database',
            side_effect=CommandError('Database query failed (OperationalError).'),
        ), patch.object(Command, 'check_migrations'), patch.object(
            Command, 'check_email'
        ), patch.object(Command, 'check_storage'):
            with self.assertRaisesRegex(CommandError, 'preflight failed'):
                call_command('check_deployment', stdout=output, stderr=output)
        self.assertIn('FAIL PostgreSQL connection', output.getvalue())
        self.assertNotIn('password', output.getvalue().lower())


__all__ = ['DeploymentPreflightTests']
