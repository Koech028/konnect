from decimal import Decimal

from django.db import IntegrityError, transaction
from rest_framework.exceptions import ValidationError

from apps.livestreams.models import CreatorEarning, Wallet, WalletTransaction

CREDIT_VALUE_KES = Decimal('0.50')
CREATOR_SHARE_PERCENTAGE = 80


@transaction.atomic
def get_or_create_wallet(user):
    wallet, created = Wallet.objects.get_or_create(user=user)
    if created:
        WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.Type.STARTER_GRANT,
            credits_delta=wallet.balance,
            promotional_credits_delta=wallet.promotional_balance,
            purchased_credits_delta=wallet.purchased_balance,
            balance_after=wallet.balance,
            reference=f'starter:{user.pk}',
        )
    return wallet


@transaction.atomic
def grant_purchased_credits(user, credits, amount_kes, reference):
    if not isinstance(credits, int) or credits <= 0:
        raise ValueError('Purchased credits must be a positive integer.')
    if not isinstance(reference, str) or not reference.strip():
        raise ValueError('A unique payment reference is required.')
    amount = Decimal(amount_kes)
    if amount != CREDIT_VALUE_KES * credits:
        raise ValueError('The payment amount does not match the configured credit rate.')

    wallet = get_or_create_wallet(user)
    wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
    prior = WalletTransaction.objects.filter(reference=reference).first()
    if prior:
        if prior.wallet_id != wallet.id or prior.credits_delta != credits:
            raise ValidationError('This payment reference has already been used.')
        return wallet, False

    try:
        with transaction.atomic():
            WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type=WalletTransaction.Type.CREDIT_PURCHASE,
                credits_delta=credits,
                promotional_credits_delta=0,
                purchased_credits_delta=credits,
                balance_after=wallet.balance + credits,
                amount_kes=amount,
                reference=reference,
            )
    except IntegrityError:
        wallet.refresh_from_db()
        prior = WalletTransaction.objects.get(reference=reference)
        if prior.wallet_id != wallet.id or prior.credits_delta != credits:
            raise ValidationError('This payment reference has already been used.')
        return wallet, False
    wallet.balance += credits
    wallet.purchased_balance += credits
    wallet.save(update_fields=('balance', 'purchased_balance', 'updated_at'))
    return wallet, True


@transaction.atomic
def spend_credits(wallet, credits, transaction_type, reference):
    if type(credits) is not int or credits < 0:
        raise ValueError('Credit spend must be a non-negative integer.')
    if credits == 0:
        return {'promotional': 0, 'purchased': 0}
    if wallet.balance < credits:
        raise ValidationError({'detail': f'Not enough credits. You have {wallet.balance}.'})

    promotional_spent = min(wallet.promotional_balance, credits)
    purchased_spent = credits - promotional_spent
    wallet.balance -= credits
    wallet.promotional_balance -= promotional_spent
    wallet.purchased_balance -= purchased_spent
    wallet.save(update_fields=(
        'balance',
        'promotional_balance',
        'purchased_balance',
        'updated_at',
    ))
    WalletTransaction.objects.create(
        wallet=wallet,
        transaction_type=transaction_type,
        credits_delta=-credits,
        promotional_credits_delta=-promotional_spent,
        purchased_credits_delta=-purchased_spent,
        balance_after=wallet.balance,
        reference=reference,
    )
    return {'promotional': promotional_spent, 'purchased': purchased_spent}


def record_creator_earning(*, stream, creator, gift=None, admission=None, eligible_credits):
    if eligible_credits <= 0:
        return None
    eligible_gross = (CREDIT_VALUE_KES * eligible_credits).quantize(Decimal('0.01'))
    creator_share = (
        eligible_gross * Decimal(CREATOR_SHARE_PERCENTAGE) / Decimal(100)
    ).quantize(Decimal('0.01'))
    platform_share = eligible_gross - creator_share
    return CreatorEarning.objects.create(
        stream=stream,
        creator=creator,
        gift=gift,
        admission=admission,
        eligible_credits=eligible_credits,
        eligible_gross_kes=eligible_gross,
        creator_share_percentage=CREATOR_SHARE_PERCENTAGE,
        estimated_creator_share_kes=creator_share,
        estimated_platform_share_kes=platform_share,
        status=CreatorEarning.Status.PENDING_RECONCILIATION,
    )
