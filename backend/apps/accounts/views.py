import os

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.exceptions import ValidationError
from rest_framework import generics, permissions, throttling
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.serializers import CurrentUserSerializer, RegistrationSerializer


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        attrs[self.username_field] = attrs[self.username_field].strip().lower()
        return super().validate(attrs)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegistrationSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'auth'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': CurrentUserSerializer(user, context={'request': request}).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=201)


class LoginView(generics.GenericAPIView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'auth'

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user
        return Response({
            **serializer.validated_data,
            'user': CurrentUserSerializer(user, context={'request': request}).data,
        })


class CurrentUserView(APIView):
    def get(self, request):
        return Response(CurrentUserSerializer(request.user, context={'request': request}).data)


class MyReferralsView(APIView):
    def get(self, request):
        return Response({
            'referral_code': request.user.referral_code,
            'successful_signups': request.user.referred_users.count(),
        })


class PremiumStatusView(APIView):
    def get(self, request):
        return Response({
            'tier': request.user.subscription_tier,
            'active': request.user.subscription_tier == get_user_model().SubscriptionTier.PREMIUM,
            'benefits': ['Premium profile badge'],
            'billing_enabled': False,
        })


class PasswordResetRequestView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'auth'

    def post(self, request):
        email = request.data.get('email', '')
        if not isinstance(email, str) or not email.strip():
            return Response({'email': ['This field is required.']}, status=400)
        users = get_user_model().objects.filter(email__iexact=email.strip(), is_active=True)
        frontend_url = os.environ.get('FRONTEND_PASSWORD_RESET_URL', 'http://localhost:3000/reset-password')
        for user in users:
            uid = urlsafe_base64_encode(str(user.pk).encode())
            token = default_token_generator.make_token(user)
            reset_url = f'{frontend_url}?uid={uid}&token={token}'
            send_mail(
                subject='Reset your LinkUp password',
                message=f'Use this link to choose a new password. It expires after use:\n\n{reset_url}',
                from_email=None,
                recipient_list=[user.email],
                fail_silently=False,
            )
        return Response({
            'detail': 'If an account exists for that email, password-reset instructions have been sent.'
        })


class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'auth'

    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        password = request.data.get('password')
        if not isinstance(uid, str) or not isinstance(token, str) or not isinstance(password, str) or not password:
            return Response({'detail': 'uid, token, and password are required.'}, status=400)
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = get_user_model().objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, UnicodeDecodeError, get_user_model().DoesNotExist):
            return Response({'detail': 'The password-reset link is invalid or expired.'}, status=400)
        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'The password-reset link is invalid or expired.'}, status=400)
        from django.contrib.auth.password_validation import validate_password
        try:
            validate_password(password, user=user)
        except DjangoValidationError as exc:
            raise ValidationError({'password': list(exc.messages)}) from exc
        user.set_password(password)
        user.save(update_fields=('password',))
        return Response({'detail': 'Password updated. Sign in with your new password.'})
