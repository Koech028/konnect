from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import generics, permissions, throttling
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import EmailVerificationCode
from apps.accounts.otp import (
    consume_email_code,
    has_recent_code,
    send_email_code,
)
from apps.accounts.serializers import (
    CurrentUserSerializer,
    EmailCodeSerializer,
    EmailSerializer,
    PasswordResetCodeSerializer,
    RegistrationSerializer,
)


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
        user = serializer.save(is_active=False, email_verified=False)
        send_email_code(user, EmailVerificationCode.Purpose.SIGNUP)
        return Response({
            'detail': 'If the address can be registered, a verification code has been sent.'
        }, status=201)


class SignupEmailVerifyView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'otp-verify'

    def post(self, request):
        serializer = EmailCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = get_user_model().objects.filter(
            email__iexact=serializer.validated_data['email'],
            is_active=False,
            email_verified=False,
        ).first()
        if user is None:
            return Response({'detail': 'The code is invalid or expired.'}, status=400)

        with transaction.atomic():
            if not consume_email_code(
                user,
                EmailVerificationCode.Purpose.SIGNUP,
                serializer.validated_data['code'],
            ):
                return Response({'detail': 'The code is invalid or expired.'}, status=400)
            user.email_verified = True
            user.is_active = True
            user.save(update_fields=('email_verified', 'is_active'))

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': CurrentUserSerializer(user, context={'request': request}).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class SignupEmailResendView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'otp-send'

    def post(self, request):
        serializer = EmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = get_user_model().objects.filter(
            email__iexact=serializer.validated_data['email'],
            is_active=False,
            email_verified=False,
        ).first()
        if user and not has_recent_code(user, EmailVerificationCode.Purpose.SIGNUP):
            send_email_code(user, EmailVerificationCode.Purpose.SIGNUP)
        return Response({
            'detail': 'If an account is awaiting verification, a code has been sent.'
        })


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
            'successful_signups': request.user.referred_users.filter(email_verified=True).count(),
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
    throttle_scope = 'otp-send'

    def post(self, request):
        serializer = EmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = get_user_model().objects.filter(
            email__iexact=serializer.validated_data['email'],
            is_active=True,
            email_verified=True,
        ).first()
        if user and not has_recent_code(user, EmailVerificationCode.Purpose.PASSWORD_RESET):
            send_email_code(user, EmailVerificationCode.Purpose.PASSWORD_RESET)
        return Response({
            'detail': 'If an account exists for that email, a password-reset code has been sent.'
        })


class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (throttling.ScopedRateThrottle,)
    throttle_scope = 'otp-verify'

    def post(self, request):
        serializer = PasswordResetCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = get_user_model().objects.filter(
            email__iexact=email,
            is_active=True,
            email_verified=True,
        ).first()
        if user is None:
            return Response({'detail': 'The code is invalid or expired.'}, status=400)

        password = serializer.validated_data['password']
        try:
            validate_password(password, user=user)
        except DjangoValidationError as exc:
            raise ValidationError({'password': list(exc.messages)}) from exc

        with transaction.atomic():
            if not consume_email_code(
                user,
                EmailVerificationCode.Purpose.PASSWORD_RESET,
                serializer.validated_data['code'],
            ):
                return Response({'detail': 'The code is invalid or expired.'}, status=400)
            user.set_password(password)
            user.save(update_fields=('password',))
        return Response({'detail': 'Password updated. Sign in with your new password.'})
