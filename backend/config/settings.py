import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

DEBUG = os.environ.get('DJANGO_DEBUG', 'false').lower() == 'true'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError('DJANGO_SECRET_KEY must be set when DEBUG is false.')
    SECRET_KEY = 'local-development-only-change-me'
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get('DJANGO_ALLOWED_HOSTS', '127.0.0.1,localhost').split(',')
    if host.strip()
]
if not DEBUG and not ALLOWED_HOSTS:
    raise RuntimeError('DJANGO_ALLOWED_HOSTS must contain at least one host when DEBUG is false.')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'apps.accounts',
    'apps.profiles',
    'apps.posts',
    'apps.matching',
    'apps.messaging',
    'apps.notifications',
    'apps.safety',
    'apps.livestreams',
    'apps.community',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()
if not DATABASE_URL and not DEBUG:
    raise RuntimeError('DATABASE_URL must be set when DEBUG is false.')
DATABASES = {
    'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    if DATABASE_URL
    else {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_USER_MODEL = 'accounts.User'
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LIVEKIT_URL = os.environ.get('LIVEKIT_URL', '').strip()
LIVEKIT_API_KEY = os.environ.get('LIVEKIT_API_KEY', '').strip()
LIVEKIT_API_SECRET = os.environ.get('LIVEKIT_API_SECRET', '').strip()
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '').strip()
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '').strip()
VAPID_CLAIMS_EMAIL = os.environ.get('VAPID_CLAIMS_EMAIL', '').strip()

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('FRONTEND_ORIGIN', 'http://localhost:3000,http://127.0.0.1:3000').split(',')
    if origin.strip()
]
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',')
    if origin.strip()
]

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '300/minute',
        'auth': '10/minute',
        'story-write': '20/day',
        'short-write': '10/day',
        'short-comment': '60/hour',
        'daily-prompt': '10/day',
        'content-report': '10/day',
        'media-upload': '40/hour',
        'event-write': '30/hour',
    },
}

SIMPLE_JWT = {
    'AUTH_HEADER_TYPES': ('Bearer',),
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
}

EMAIL_BACKEND = os.environ.get('DJANGO_EMAIL_BACKEND') or (
    'django.core.mail.backends.console.EmailBackend'
    if DEBUG else 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = os.environ.get('DJANGO_EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('DJANGO_EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('DJANGO_EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('DJANGO_EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('DJANGO_EMAIL_USE_TLS', 'true').lower() == 'true'
DEFAULT_FROM_EMAIL = os.environ.get('DJANGO_DEFAULT_FROM_EMAIL', 'noreply@linkup.local')
if not DEBUG and EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend':
    missing_email_settings = [
        name for name, value in (
            ('DJANGO_EMAIL_HOST', EMAIL_HOST),
            ('DJANGO_EMAIL_HOST_USER', EMAIL_HOST_USER),
            ('DJANGO_EMAIL_HOST_PASSWORD', EMAIL_HOST_PASSWORD),
        ) if not value
    ]
    if missing_email_settings:
        raise RuntimeError(
            f'Production SMTP is enabled but these settings are missing: {", ".join(missing_email_settings)}.'
        )
