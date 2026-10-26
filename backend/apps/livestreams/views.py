import uuid

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.livestreams.livekit import create_join_token, ensure_livekit_configured
from apps.livestreams.models import Gift, LiveStream, Wallet
from apps.livestreams.serializers import CreateLiveStreamSerializer, GiftSerializer, LiveStreamSerializer
from apps.safety.models import Block


GIFT_CATALOG = [
    {'type': gift_type, 'name': label, 'credits': Gift.CREDIT_VALUES[gift_type]}
    for gift_type, label in Gift.Type.choices
]


def _user_has_blocked_host(user, host):
    return Block.objects.filter(
        Q(blocker=user, blocked=host) | Q(blocker=host, blocked=user)
    ).exists()


def _get_visible_stream(user, pk):
    stream = get_object_or_404(LiveStream.objects.select_related('host'), pk=pk, status=LiveStream.Status.LIVE)
    if _user_has_blocked_host(user, stream.host):
        raise NotFound('This live stream is not available.')
    return stream


class LiveStreamListCreateView(APIView):
    def get(self, request):
        blocked_user_ids = Block.objects.filter(
            Q(blocker=request.user) | Q(blocked=request.user)
        ).values_list('blocker_id', 'blocked_id')
        blocked_ids = {user_id for pair in blocked_user_ids for user_id in pair}
        blocked_ids.discard(request.user.id)
        streams = LiveStream.objects.filter(
            status=LiveStream.Status.LIVE,
            host__is_active=True,
            host__profile_status='active',
        ).exclude(host_id__in=blocked_ids)
        data = LiveStreamSerializer(streams.select_related('host'), many=True).data
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        return Response({'results': data, 'wallet_balance': wallet.balance, 'gift_catalog': GIFT_CATALOG})

    def post(self, request):
        serializer = CreateLiveStreamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ensure_livekit_configured()
        if not (request.user.is_active and request.user.profile_status == 'active'):
            raise PermissionDenied('Your account must be active to start a live stream.')
        if LiveStream.objects.filter(host=request.user, status=LiveStream.Status.LIVE).exists():
            raise ValidationError({'detail': 'You already have a live stream.'})
        stream = LiveStream(
            host=request.user,
            title=serializer.validated_data['title'],
            room_name=f'linkup-{uuid.uuid4()}',
        )
        try:
            stream.save()
        except IntegrityError as error:
            raise ValidationError({'detail': 'You already have a live stream.'}) from error
        return Response(LiveStreamSerializer(stream).data, status=status.HTTP_201_CREATED)


class LiveStreamDetailView(APIView):
    def get(self, request, pk):
        stream = _get_visible_stream(request.user, pk)
        return Response(LiveStreamSerializer(stream).data)


class LiveStreamJoinView(APIView):
    def post(self, request, pk):
        stream = _get_visible_stream(request.user, pk)
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to join a live stream.')
        return Response(create_join_token(request.user, stream, stream.host_id == request.user.id))


class LiveStreamStopView(APIView):
    def post(self, request, pk):
        stream = get_object_or_404(LiveStream, pk=pk, status=LiveStream.Status.LIVE)
        if stream.host_id != request.user.id:
            raise PermissionDenied('Only the host can end this live stream.')
        stream.status = LiveStream.Status.ENDED
        stream.ended_at = timezone.now()
        stream.save(update_fields=('status', 'ended_at'))
        return Response({'status': stream.status})


class WalletView(APIView):
    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        return Response({'balance': wallet.balance, 'gift_catalog': GIFT_CATALOG})


class GiftView(APIView):
    def post(self, request, pk):
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to send gifts.')

        gift_type = request.data.get('gift_type')
        if not isinstance(gift_type, str) or gift_type not in Gift.CREDIT_VALUES:
            raise ValidationError({'gift_type': 'Choose a valid gift.'})
        credits = Gift.CREDIT_VALUES[gift_type]

        with transaction.atomic():
            try:
                stream = LiveStream.objects.select_for_update().select_related('host').get(
                    pk=pk,
                    status=LiveStream.Status.LIVE,
                )
            except LiveStream.DoesNotExist as error:
                raise NotFound('This live stream is not available.') from error
            if _user_has_blocked_host(request.user, stream.host):
                raise NotFound('This live stream is not available.')
            if stream.host_id == request.user.id:
                raise ValidationError({'detail': 'You cannot send gifts to your own live stream.'})
            Wallet.objects.get_or_create(user=request.user)
            Wallet.objects.get_or_create(user=stream.host)
            wallets = {
                wallet.user_id: wallet
                for wallet in Wallet.objects.select_for_update().filter(
                    user_id__in=(request.user.id, stream.host_id)
                ).order_by('user_id')
            }
            sender_wallet = wallets[request.user.id]
            recipient_wallet = wallets[stream.host_id]
            if sender_wallet.balance < credits:
                raise ValidationError({'detail': 'Not enough credits to send this gift.'})
            sender_wallet.balance -= credits
            recipient_wallet.balance += credits
            sender_wallet.save(update_fields=('balance', 'updated_at'))
            recipient_wallet.save(update_fields=('balance', 'updated_at'))
            gift = Gift.objects.create(
                stream=stream,
                sender=request.user,
                recipient=stream.host,
                gift_type=gift_type,
                credits=credits,
            )
        return Response({
            'gift': GiftSerializer(gift).data,
            'wallet_balance': sender_wallet.balance,
        }, status=status.HTTP_201_CREATED)
