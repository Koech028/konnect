import os
import uuid

import boto3
from botocore.config import Config
from rest_framework import status, throttling
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView


class MediaStorageUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Media uploads are not configured on this server.'
    default_code = 'media_storage_unavailable'


class MediaUploadUrlView(APIView):
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'media-upload'

    allowed_types = {
        'image/jpeg': ('jpg', 5 * 1024 * 1024),
        'image/png': ('png', 5 * 1024 * 1024),
        'image/webp': ('webp', 5 * 1024 * 1024),
        'video/mp4': ('mp4', 50 * 1024 * 1024),
        'video/webm': ('webm', 50 * 1024 * 1024),
        'video/quicktime': ('mov', 50 * 1024 * 1024),
    }

    def post(self, request):
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to upload media.')
        content_type = request.data.get('content_type', '')
        if isinstance(content_type, str):
            content_type = content_type.split(';', 1)[0].strip().lower()
        try:
            size = int(request.data.get('size', 0))
        except (TypeError, ValueError) as exc:
            raise ValidationError({'size': 'Provide the media size in bytes.'}) from exc
        if content_type not in self.allowed_types:
            raise ValidationError({
                'content_type': 'Upload a JPEG, PNG, WebP, MP4, WebM, or QuickTime video.'
            })
        extension, max_size = self.allowed_types[content_type]
        if not 0 < size <= max_size:
            max_mb = max_size // (1024 * 1024)
            media_kind = 'Videos' if content_type.startswith('video/') else 'Images'
            raise ValidationError({'size': f'{media_kind} must be between 1 byte and {max_mb} MB.'})

        account_id = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '').strip()
        access_key = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID', '').strip()
        secret_key = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY', '').strip()
        bucket = os.environ.get('CLOUDFLARE_R2_BUCKET', '').strip()
        public_url = os.environ.get('CLOUDFLARE_R2_PUBLIC_URL', '').strip().rstrip('/')
        if not all((account_id, access_key, secret_key, bucket, public_url)):
            raise MediaStorageUnavailable()
        if not public_url.startswith('https://'):
            raise MediaStorageUnavailable('CLOUDFLARE_R2_PUBLIC_URL must use HTTPS.')

        key = f'{request.user.pk}/{uuid.uuid4().hex}.{extension}'
        client = boto3.client(
            's3',
            endpoint_url=f'https://{account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name='auto',
            config=Config(signature_version='s3v4'),
        )
        upload_url = client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket,
                'Key': key,
                'ContentType': content_type,
                'ContentLength': size,
            },
            ExpiresIn=300,
        )
        return Response({
            'upload_url': upload_url,
            'url': f'{public_url}/{key}',
            'content_type': content_type,
        })
