import os
import stripe
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from Backend.firebase.firebase_config import db
from google.cloud.firestore_v1 import Transaction as FsTransaction  # type: ignore
from dotenv import load_dotenv
from pathlib import Path
from google.cloud import firestore

# (All the code at the top of your file remains the same)
# ...
load_dotenv(Path(__file__).resolve().parents[1] / ".env")
router = APIRouter(prefix="/payments", tags=["payments"])
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
print("Stripe key loaded:", bool(stripe.api_key))
FRONTEND_URL = (os.getenv("FRONTEND_URL", "http://localhost:5173")).rstrip("/")
DEFAULT_CURRENCY = (os.getenv("CURRENCY") or "nzd").lower()
FX_RATES = {"nzd": 1.0, "aud": 0.90, "usd": 0.59, "eur": 0.50, "gbp": 0.44}
ZERO_DECIMAL = {"jpy"}


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


class DepositBody(BaseModel):
    uid: str = Field(..., description="Firebase Auth UID")
    amount_cents: int = Field(
        ..., gt=0, description="Amount in the smallest currency unit"
    )
    currency: str | None = Field(
        None, description="e.g. nzd, usd (lowercase 3-letter code)"
    )


class SetupSessionBody(BaseModel):
    uid: str = Field(..., description="Firebase Auth UID")


class UpdateAutoPayBody(BaseModel):
    uid: str = Field(..., description="Firebase Auth UID")
    autoPayEnabled: bool
    autoPayAmountCents: int = Field(
        ..., gt=49, description="Top-up amount in NZD cents (min 50)"
    )


class WithdrawBody(BaseModel):
    uid: str = Field(..., description="Firebase Auth UID")
    amount_cents: int = Field(
        ..., gt=0, description="Amount in the smallest currency unit"
    )
    currency: str | None = Field(
        None, description="e.g. nzd, usd (lowercase 3-letter code)"
    )


@router.post("/deposit")
async def create_deposit_checkout(body: DepositBody):
    # ... (This function is fine, leave as is)
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    currency = (body.currency or DEFAULT_CURRENCY).lower()
    try:
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
            success_url=f"{FRONTEND_URL}/wallet?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/wallet?cancelled=1",
            metadata={"type": "deposit", "uid": body.uid},
        )
        return {"url": session.url, "sessionId": session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _record_stripe_event_once(event_id: str) -> bool:
    # ... (This function is fine, leave as is)
    marker_ref = db.collection("stripe_events").document(event_id)
    snap = marker_ref.get()
    if snap.exists:
        return False
    marker_ref.set({"processed": True})
    return True


def _credit_user_and_log_transaction(
    uid: str, amount_cents: int, currency: str, session_id: str
):
    # ... (This function is fine, leave as is)
    user_ref = db.collection("users").document(uid)
    tx_ref = user_ref.collection("transactions").document(session_id)

    @firestore.transactional
    def run_in_transaction(transaction):
        user_snap = user_ref.get(transaction=transaction)
        current_balance = 0
        if user_snap.exists:
            data = user_snap.to_dict() or {}
            current_balance = int(data.get("balance", 0))
        delta = amount_cents
        new_balance = current_balance + delta
        transaction.set(user_ref, {"balance": new_balance}, merge=True)
        transaction.set(
            tx_ref,
            {
                "type": "deposit",
                "amount": amount_cents,
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

    run_in_transaction(db.transaction())


def _debit_user_and_log_transaction(uid: str, amount_cents: int, currency: str):
    # ... (This function is fine, leave as is)
    user_ref = db.collection("users").document(uid)
    tx_ref = user_ref.collection("transactions").document()

    @firestore.transactional
    def run_in_transaction(transaction):
        user_data = user_ref.get(transaction=transaction)
        current_balance = 0
        if user_data.exists:
            data = user_data.to_dict() or {}
            current_balance = int(data.get("balance", 0))
        delta = amount_cents
        if current_balance < delta:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        new_balance = current_balance - delta
        transaction.set(user_ref, {"balance": new_balance}, merge=True)
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

    run_in_transaction(db.transaction())
    return tx_ref.id


@router.post("/webhook")
async def stripe_webhook(request: Request):
    # ... (This function is fine, leave as is)
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    wh_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not wh_secret:
        raise HTTPException(status_code=500, detail="Webhook not configured")
    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig, secret=wh_secret
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")
    if not _record_stripe_event_once(event["id"]):
        return {"received": True, "duplicate": True}
    etype = event["type"]
    if etype == "checkout.session.completed":
        session = event["data"]["object"]
        session_id = session["id"]
        uid = (session.get("metadata") or {}).get("uid")
        amount_minor = int(session.get("amount_total") or 0)
        charge_cur = (session.get("currency") or DEFAULT_CURRENCY).lower()
        if uid and amount_minor > 0:
            nzd_cents = _minor_to_nzd_cents(amount_minor, charge_cur)
            _credit_user_and_log_transaction(uid, nzd_cents, "nzd", session_id)
    return {"received": True}


#
# --- THIS IS THE FUNCTION TO REPLACE ---
#
@router.post("/withdraw")
async def create_withdrawal(body: WithdrawBody):
    # --- DEBUGGING LINE 1 ---
    # Log the exact value received from the frontend
    print(f"DEBUG: Received withdrawal request for amount_cents = {body.amount_cents}")

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
        # --- DEBUGGING LINE 2 ---
        # Re-raise the original exception to get the full traceback
        print(f"DEBUG: An unexpected error occurred. Re-raising to get traceback.")
        raise e


#
# --- (The rest of the file is the same) ---
#
@router.post("/create-setup-session")
async def create_setup_session(body: SetupSessionBody):
    # ... (This function is fine, leave as is)
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    try:
        user_ref = db.collection("users").document(body.uid)
        user_snap = user_ref.get()
        user_data = user_snap.to_dict() or {}
        stripe_customer_id = user_data.get("stripeCustomerId")
        if not stripe_customer_id:
            customer = stripe.Customer.create(metadata={"firebaseUID": body.uid})
            stripe_customer_id = customer.id
            user_ref.set({"stripeCustomerId": stripe_customer_id}, merge=True)
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="setup",
            customer=stripe_customer_id,
            success_url=f"{FRONTEND_URL}/wallet?setup_success=true",
            cancel_url=f"{FRONTEND_URL}/wallet?setup_cancel=true",
            metadata={"uid": body.uid},
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-autopay-settings")
async def update_autopay_settings(body: UpdateAutoPayBody):
    # ... (This function is fine, leave as is)
    try:
        user_ref = db.collection("users").document(body.uid)
        user_ref.set(
            {
                "autoPayEnabled": body.autoPayEnabled,
                "autoPayAmountCents": body.autoPayAmountCents,
            },
            merge=True,
        )
        return {"ok": True, "message": "Settings updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update settings.")
