import uuid
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.livestreams.livekit import create_join_token, ensure_livekit_configured
from apps.livestreams.models import (
    CreatorEarning,
    Gift,
    LiveStream,
    LiveStreamAdmission,
    Wallet,
    WalletTransaction,
)
from apps.livestreams.serializers import CreateLiveStreamSerializer, GiftSerializer, LiveStreamSerializer
from apps.safety.models import Block
from apps.livestreams.wallet import get_or_create_wallet, record_creator_earning, spend_credits


GIFT_CATALOG = [
    {'type': gift_type, 'name': label, 'credits': Gift.CREDIT_VALUES[gift_type]}
    for gift_type, label in Gift.Type.choices
]
CREDIT_BUNDLES = [{'id': 'credits-100', 'credits': 100, 'price_kes': '50.00'}]


def _user_has_blocked_host(user, host):
    return Block.objects.filter(
        Q(blocker=user, blocked=host) | Q(blocker=host, blocked=user)
    ).exists()


def _pending_creator_earnings_kes(user):
    return CreatorEarning.objects.filter(
        creator=user,
        status=CreatorEarning.Status.PENDING_RECONCILIATION,
    ).aggregate(total=Sum('estimated_creator_share_kes'))['total'] or Decimal('0.00')


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
        data = LiveStreamSerializer(streams.select_related('host'), many=True, context={'request': request}).data
        wallet = get_or_create_wallet(request.user)
        return Response({
            'results': data,
            'wallet_balance': wallet.balance,
            'promotional_balance': wallet.promotional_balance,
            'purchased_balance': wallet.purchased_balance,
            'pending_creator_earnings_kes': f'{_pending_creator_earnings_kes(request.user):.2f}',
            'gift_catalog': GIFT_CATALOG,
        })

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
            title=serializer.validated_data['title'] or 'Live video',
            entry_price=serializer.validated_data['entry_price'],
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
        data = LiveStreamSerializer(stream, context={'request': request}).data
        data['has_access'] = (
            stream.host_id == request.user.id
            or LiveStreamAdmission.objects.filter(stream=stream, viewer=request.user).exists()
        )
        return Response(data)


class LiveStreamJoinView(APIView):
    def post(self, request, pk):
        stream = _get_visible_stream(request.user, pk)
        if not request.user.is_active or request.user.profile_status != 'active':
            raise PermissionDenied('Your account must be active to join a live stream.')
        is_host = stream.host_id == request.user.id
        wallet_balance = None
        promotional_balance = None
        purchased_balance = None
        if not is_host:
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
                admission = LiveStreamAdmission.objects.filter(stream=stream, viewer=request.user).first()
                if admission is None:
                    wallet = get_or_create_wallet(request.user)
                    wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
                    if wallet.balance < stream.entry_price:
                        raise ValidationError({
                            'detail': f'This live stream costs {stream.entry_price} credits to join. '
                            f'You have {wallet.balance}.'
                        })
                    spend = spend_credits(
                        wallet,
                        stream.entry_price,
                        WalletTransaction.Type.LIVE_ENTRY,
                        f'live-entry:{stream.id}:{request.user.id}',
                    )
                    admission = LiveStreamAdmission.objects.create(
                        stream=stream,
                        viewer=request.user,
                        credits_paid=stream.entry_price,
                        promotional_credits_paid=spend['promotional'],
                        purchased_credits_paid=spend['purchased'],
                    )
                    if spend['purchased']:
                        record_creator_earning(
                            stream=stream,
                            creator=stream.host,
                            admission=admission,
                            eligible_credits=spend['purchased'],
                        )
                wallet = get_or_create_wallet(request.user)
                wallet_balance = wallet.balance
                promotional_balance = wallet.promotional_balance
                purchased_balance = wallet.purchased_balance
                join_data = create_join_token(request.user, stream, is_host)
        else:
            join_data = create_join_token(request.user, stream, is_host)
        return Response({
            **join_data,
            'wallet_balance': wallet_balance,
            'promotional_balance': promotional_balance,
            'purchased_balance': purchased_balance,
        })


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
        wallet = get_or_create_wallet(request.user)
        return Response({
            'balance': wallet.balance,
            'promotional_balance': wallet.promotional_balance,
            'purchased_balance': wallet.purchased_balance,
            'pending_creator_earnings_kes': f'{_pending_creator_earnings_kes(request.user):.2f}',
            'gift_catalog': GIFT_CATALOG,
            'credit_bundles': CREDIT_BUNDLES,
            'checkout_enabled': False,
            'withdrawals_enabled': False,
        })


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
            sender_wallet = get_or_create_wallet(request.user)
            sender_wallet = Wallet.objects.select_for_update().get(pk=sender_wallet.pk)
            gift = Gift.objects.create(
                stream=stream,
                sender=request.user,
                recipient=stream.host,
                gift_type=gift_type,
                credits=credits,
            )
            spend = spend_credits(
                sender_wallet,
                credits,
                WalletTransaction.Type.GIFT_SPEND,
                f'gift:{gift.id}',
            )
            if spend['purchased']:
                record_creator_earning(
                    stream=stream,
                    creator=stream.host,
                    gift=gift,
                    eligible_credits=spend['purchased'],
                )
        return Response({
            'gift': GiftSerializer(gift).data,
            'wallet_balance': sender_wallet.balance,
            'promotional_balance': sender_wallet.promotional_balance,
            'purchased_balance': sender_wallet.purchased_balance,
        }, status=status.HTTP_201_CREATED)
