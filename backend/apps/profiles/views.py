from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.serializers import CurrentUserSerializer, UserSerializer
from apps.profiles.models import ProfilePhoto, VerificationRequest
from apps.profiles.serializers import (
    DiscoveryProfileSerializer,
    ProfilePhotoSerializer,
    ProfileUpdateSerializer,
    VerificationRequestSerializer,
)
from apps.safety.models import Block


class ProfileViewSet(viewsets.GenericViewSet):
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserSerializer

    def get_queryset(self):
        return super().get_queryset().prefetch_related('profile_photos')

    def get_visible_queryset(self):
        user = self.request.user
        blocked_ids = Block.objects.filter(
            Q(blocker=user) | Q(blocked=user)
        ).values_list('blocker_id', 'blocked_id')
        excluded = set()
        for blocker_id, blocked_id in blocked_ids:
            excluded.add(blocker_id)
            excluded.add(blocked_id)
        excluded.discard(user.id)
        return self.get_queryset().exclude(id__in=excluded)

    def me(self, request):
        return Response(CurrentUserSerializer(request.user, context={'request': request}).data)

    def update_me(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(CurrentUserSerializer(user, context={'request': request}).data)

    def retrieve(self, request, pk=None):
        profile = self.get_visible_queryset().filter(pk=pk).filter(
            Q(profile_status=User.ProfileStatus.ACTIVE) | Q(pk=request.user.pk)
        ).first()
        if not profile:
            raise NotFound('Profile not found.')
        return Response(UserSerializer(profile, context={'request': request}).data)

    def discover(self, request):
        queryset = self.get_visible_queryset().filter(profile_status=User.ProfileStatus.ACTIVE).exclude(pk=request.user.pk)
        query = request.query_params.get('q', '').strip()
        gender = request.query_params.get('gender', '').strip()
        verified = request.query_params.get('verified')
        preferences = request.user.preferences or {}
        age_min = request.query_params.get('age_min', preferences.get('age_min'))
        age_max = request.query_params.get('age_max', preferences.get('age_max'))
        shared_interests_only = request.query_params.get('shared_interests') == 'true'

        if query:
            queryset = queryset.filter(
                Q(display_name__icontains=query) |
                Q(city__icontains=query) |
                Q(interests__icontains=query)
            )
        genders = {
            'women': 'woman',
            'woman': 'woman',
            'men': 'man',
            'man': 'man',
            'non-binary': 'non_binary',
            'non_binary': 'non_binary',
        }
        if gender and gender.lower() != 'everyone':
            gender = genders.get(gender.lower(), gender.lower())
            queryset = queryset.filter(gender=gender)
        elif preferences.get('interested_in'):
            selected_genders = [genders.get(value.lower(), value.lower()) for value in preferences['interested_in']]
            queryset = queryset.filter(gender__in=selected_genders)
        if verified == 'true':
            queryset = queryset.filter(verification_status=User.VerificationStatus.VERIFIED)
        if age_min:
            queryset = queryset.filter(age__gte=self._parse_age(age_min))
        if age_max:
            queryset = queryset.filter(age__lte=self._parse_age(age_max))
        viewer_interests = {
            item.strip().casefold()
            for item in (request.user.interests or [])
            if isinstance(item, str) and item.strip()
        }
        viewer_city = (request.user.city or '').strip().casefold()
        profiles = list(queryset.prefetch_related('profile_photos'))
        if shared_interests_only:
            profiles = [
                profile for profile in profiles
                if any(
                    isinstance(item, str) and item.strip().casefold() in viewer_interests
                    for item in (profile.interests or [])
                )
            ]
        profiles.sort(
            key=lambda profile: (
                sum(
                    1                     for item in (profile.interests or [])
                    if isinstance(item, str) and item.strip().casefold() in viewer_interests
                ),
                bool(viewer_city and (profile.city or '').strip().casefold() == viewer_city),
                profile.last_active,
            ),
            reverse=True,
        )
        return Response(DiscoveryProfileSerializer(
            profiles,
            many=True,
            context={
                'request': request,
                'viewer_interests': viewer_interests,
                'viewer_city': viewer_city,
            },
        ).data)

    @staticmethod
    def _parse_age(value):
        try:
            age = int(value)
        except (TypeError, ValueError) as exc:
            raise ValidationError('Age filters must be integers.') from exc
        if not 18 <= age <= 100:
            raise ValidationError('Age filters must be between 18 and 100.')
        return age


class ProfilePhotoViewSet(viewsets.ModelViewSet):
    serializer_class = ProfilePhotoSerializer
    http_method_names = ('get', 'post', 'patch', 'delete', 'head', 'options')

    def get_queryset(self):
        return ProfilePhoto.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        last_position = self.request.user.profile_photos.order_by('-position').values_list('position', flat=True).first()
        position = serializer.validated_data.get('position', (last_position if last_position is not None else -1) + 1)
        photo = serializer.save(user=self.request.user, position=position)
        if self.request.user.profile_photos.count() == 1 and not photo.is_primary:
            photo.is_primary = True
            photo.save(update_fields=('is_primary',))
        if photo.is_primary:
            self.request.user.avatar_url = photo.url
            self.request.user.save(update_fields=('avatar_url',))

    def perform_update(self, serializer):
        photo = serializer.save()
        if photo.is_primary:
            self.request.user.avatar_url = photo.url
            self.request.user.save(update_fields=('avatar_url',))

    def perform_destroy(self, instance):
        was_primary = instance.is_primary
        instance.delete()
        if was_primary:
            next_photo = self.request.user.profile_photos.first()
            if next_photo:
                next_photo.is_primary = True
                next_photo.save(update_fields=('is_primary',))
            self.request.user.avatar_url = next_photo.url if next_photo else ''
            self.request.user.save(update_fields=('avatar_url',))


class VerificationRequestView(APIView):
    def get(self, request):
        current = request.user.verification_requests.first()
        if not current:
            return Response({'status': request.user.verification_status, 'request': None})
        return Response({
            'status': current.status,
            'request': VerificationRequestSerializer(current).data,
        })

    def post(self, request):
        if request.user.verification_status == User.VerificationStatus.VERIFIED:
            return Response({'detail': 'This profile is already verified.'}, status=status.HTTP_409_CONFLICT)
        pending = request.user.verification_requests.filter(status=VerificationRequest.Status.PENDING).first()
        if pending:
            return Response(VerificationRequestSerializer(pending).data, status=status.HTTP_200_OK)

        verification = VerificationRequest.objects.create(user=request.user)
        request.user.verification_status = User.VerificationStatus.PENDING
        request.user.save(update_fields=('verification_status',))
        return Response(VerificationRequestSerializer(verification).data, status=status.HTTP_201_CREATED)
