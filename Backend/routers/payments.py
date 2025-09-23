import os
import stripe
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from Backend.firebase.firebase_config import db
from google.cloud.firestore_v1 import Transaction as FsTransaction  # type: ignore
from dotenv import load_dotenv
from pathlib import Path
from google.cloud import firestore


# Load the .env
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# Load_dotenv()
router = APIRouter(prefix="/payments", tags=["payments"])

# Initilise keys, frontend URL, and currency
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
print("Stripe key loaded:", bool(stripe.api_key))
FRONTEND_URL = (os.getenv("FRONTEND_URL", "http://localhost:5173")).rstrip("/")
DEFAULT_CURRENCY = (os.getenv("CURRENCY") or "nzd").lower()


FX_RATES = {
    "nzd": 1.0,
    "aud": 0.90,
    "usd": 0.59,
    "eur": 0.50,
    "gbp": 0.44,
}
ZERO_DECIMAL = {"jpy"}  # future-proof


def _norm(c: str | None) -> str:
    return (c or DEFAULT_CURRENCY).lower()


def _factor(cur: str) -> int:
    return 1 if cur in ZERO_DECIMAL else 100


def _convert(amount: float, from_cur: str, to_cur: str, base: str = "nzd") -> float:
    f, t = _norm(from_cur), _norm(to_cur)
    if f == t:
        return amount
    if f == base:
        return amount * FX_RATES[t]
    if t == base:
        return amount / FX_RATES[f]
    return (amount / FX_RATES[f]) * FX_RATES[t]


def _minor_to_nzd_cents(minor_in_src: int, src_cur: str) -> int:
    src = _norm(src_cur)
    major_src = minor_in_src / _factor(src)
    nzd_major = _convert(major_src, src, "nzd")
    return int(round(nzd_major * _factor("nzd")))


# Pydantic model for validation, ensures field: string, amount in cents: integer, currency: string
class DepositBody(BaseModel):
    uid: str = Field(..., description="Firebase Auth UID")
    amount_cents: int = Field(
        ..., gt=0, description="Amount in the smallest currency unit"
    )
    currency: str | None = Field(
        None, description="e.g. nzd, usd (lowercase 3-letter code)"
    )


# Withdraw request body: same shape as deposit
class WithdrawBody(BaseModel):
    uid: str = Field(..., description="Firebase Auth UID")
    amount_cents: int = Field(
        ..., gt=0, description="Amount in the smallest currency unit"
    )
    currency: str | None = Field(
        None, description="e.g. nzd, usd (lowercase 3-letter code)"
    )


@router.post("/deposit")
# creates a stripe checkout session for a deposit
# return session url redirect and session ID
async def create_deposit_checkout(body: DepositBody):

    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    # Default currency if missing
    currency = (body.currency or DEFAULT_CURRENCY).lower()

    try:
        # Make a one-time payment session in Stripe (card, single line item)
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            customer_creation="if_required",
            line_items=[
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": currency,
                        "unit_amount": body.amount_cents,
                        "product_data": {
                            "name": "Account Deposit",
                            "metadata": {"uid": body.uid},
                        },
                    },
                }
            ],
            # stripe redirect after successful or canceled payment
            success_url=f"{FRONTEND_URL}/wallet?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/wallet?cancelled=1",
            metadata={"type": "deposit", "uid": body.uid},
        )
        # Send the URL back to the frontend so it can redirect the user
        return {"url": session.url, "sessionId": session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# prevents duplicate stripe events
def _record_stripe_event_once(event_id: str) -> bool:

    marker_ref = db.collection("stripe_events").document(event_id)
    snap = marker_ref.get()
    if snap.exists:
        return False
    marker_ref.set({"processed": True})
    return True


# Add money to the user's balance and write a transaction record.
def _credit_user_and_log_transaction(
    uid: str, amount_cents: int, currency: str, session_id: str
):
    user_ref = db.collection("users").document(uid)
    tx_ref = user_ref.collection("transactions").document(session_id)

    @firestore.transactional
    def run_in_transaction(transaction):
        # Read current balance
        user_snap = user_ref.get(transaction=transaction)

        current_balance = 0
        if user_snap.exists:
            data = user_snap.to_dict() or {}
            current_balance = int(data.get("balance", 0))

        # use amount_cents as units
        delta = amount_cents

        new_balance = current_balance + delta

        # Update user balance
        transaction.set(user_ref, {"balance": new_balance}, merge=True)

        # Write a transaction doc
        transaction.set(
            tx_ref,
            {
                "type": "deposit",
                "amount": amount_cents,  # raw cents
                "currency": currency.lower(),
                "source": "stripe",
                "sessionId": session_id,
                "status": "succeeded",
                "balanceBefore": current_balance,
                "balanceAfter": new_balance,
                "gameType": None,
                "round": None,
                "timestamp": firestore.SERVER_TIMESTAMP,
            },
        )

    # Run the Firestore transaction
    run_in_transaction(db.transaction())


# Subtract money from the user's balance and write a transaction record
def _debit_user_and_log_transaction(uid: str, amount_cents: int, currency: str):
    user_ref = db.collection("users").document(uid)
    tx_ref = user_ref.collection("transactions").document()

    @firestore.transactional
    def run_in_transaction(transaction):
        # Read current balance
        user_data = user_ref.get(transaction=transaction)
        current_balance = 0
        if user_data.exists:
            data = user_data.to_dict() or {}
            current_balance = int(data.get("balance", 0))

        # Keep units consistent with deposit (currently 'cents as units')
        delta = amount_cents

        if current_balance < delta:
            raise HTTPException(status_code=400, detail="Insufficient balance")

        new_balance = current_balance - delta

        # Update user balance
        transaction.set(user_ref, {"balance": new_balance}, merge=True)

        # Write a transaction doc
        transaction.set(
            tx_ref,
            {
                "type": "withdraw",
                "amount": amount_cents,
                "currency": currency.lower(),
                "source": "app",
                "status": "succeeded",
                "balanceBefore": current_balance,
                "balanceAfter": new_balance,
                "gameType": None,
                "round": None,
                "timestamp": firestore.SERVER_TIMESTAMP,
            },
        )

    # Run and return the id of the transaction doc
    run_in_transaction(db.transaction())
    return tx_ref.id


@router.post("/webhook")
async def stripe_webhook(request: Request):
    # reads payload from stripe
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    wh_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not wh_secret:
        raise HTTPException(status_code=500, detail="Webhook not configured")

    # Let Stripe SDK verify the signature
    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig, secret=wh_secret
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    # Duplication check
    if not _record_stripe_event_once(event["id"]):
        return {"received": True, "duplicate": True}

    etype = event["type"]

    # Credit on successful payment
    if etype == "checkout.session.completed":
        session = event["data"]["object"]
        session_id = session["id"]
        uid = (session.get("metadata") or {}).get("uid")
        amount_minor = int(
            session.get("amount_total") or 0
        )  # minor units in session currency
        charge_cur = (session.get("currency") or DEFAULT_CURRENCY).lower()

        if uid and amount_minor > 0:
            # Convert charged currency -> NZD cents for the ledger
            nzd_cents = _minor_to_nzd_cents(amount_minor, charge_cur)
            _credit_user_and_log_transaction(uid, nzd_cents, "nzd", session_id)

    return {"received": True}


@router.post("/withdraw")
async def create_withdrawal(body: WithdrawBody):
    # Basic checks
    if not body.uid:
        raise HTTPException(status_code=400, detail="Missing uid")

    currency = (body.currency or DEFAULT_CURRENCY).lower()

    # Small guard for Stripe's minimums (50 cents)
    if body.amount_cents < 50:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is 50 cents")

    try:
        # Try to subtract the balance and write a transaction record
        transaction_id = _debit_user_and_log_transaction(
            body.uid, body.amount_cents, currency
        )
        return {"ok": True, "txId": transaction_id}
    except HTTPException:
        # Pass through known errors (e.g., insufficient balance)
        raise
    except Exception as e:
        # Other errors
        raise HTTPException(status_code=500, detail="Internal server error")
