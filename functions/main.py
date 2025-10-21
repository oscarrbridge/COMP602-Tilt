from datetime import datetime, timedelta, timezone
from firebase_admin import firestore
from firebase_functions import firestore_fn
from firebase_admin.firestore import SERVER_TIMESTAMP
from google.cloud.firestore_v1._helpers import DatetimeWithNanoseconds
import stripe

TOP_UP_THRESHOLD_CENTS = 1000  # $10.00


def _now_utc():
    return datetime.now(timezone.utc)


@firestore_fn.on_document_updated(document="users/{userId}")
def check_balance_for_autopay(event: firestore_fn.Event[firestore_fn.Change]) -> None:
    before_data = event.data.before.to_dict() or {}
    after_data = event.data.after.to_dict() or {}
    uid = event.params["userId"]

    # Must be enabled and have a customer
    if not (after_data.get("autoPayEnabled") and after_data.get("stripeCustomerId")):
        return

    # ⬇️ REPLACE your old crossing-only logic with this block:
    before_bal = int(before_data.get("balance") or 0)
    after_bal = int(after_data.get("balance") or 0)

    is_below = after_bal < TOP_UP_THRESHOLD_CENTS
    went_down = after_bal < before_bal
    crossed = before_bal >= TOP_UP_THRESHOLD_CENTS and is_below

    print(
        f"[AUTOPAY] uid={uid} before={before_bal} after={after_bal} "
        f"is_below={is_below} crossed={crossed} went_down={went_down}"
    )

    # Allow when below the threshold AND (just crossed OR went further down)
    should_fire = False
    if is_below:
        should_fire = crossed or went_down

    # If not crossing/dropping, still allow a run; debounce below prevents repeats
    if not should_fire:
        should_fire = is_below

    if not should_fire:
        return

    user_ref = firestore.client().collection("users").document(uid)
    top_up_amount = int(after_data.get("autoPayAmountCents") or 0)
    if top_up_amount <= 0:
        print(f"[AUTOPAY] uid={uid} top_up_amount invalid: {top_up_amount}")
        return

    # Debounce by lastAutoTopupAt
    try:
        user_snap = user_ref.get()
        data = user_snap.to_dict() or {}
        last = data.get("lastAutoTopupAt")
        if isinstance(last, (DatetimeWithNanoseconds, datetime)):
            if _now_utc() - last < timedelta(seconds=15):
                print(f"[AUTOPAY] uid={uid} recently topped up; skipping.")
                return
    except Exception as e:
        print(f"[AUTOPAY] uid={uid} read lastAutoTopupAt failed: {e}")

    try:
        # Ensure a saved card exists
        pms = stripe.PaymentMethod.list(
            customer=after_data["stripeCustomerId"], type="card"
        )
        if not pms.data:
            print(f"[AUTOPAY] uid={uid} no saved card; disabling auto-pay.")
            user_ref.update({"autoPayEnabled": False})
            return

        # Charge saved card
        stripe.PaymentIntent.create(
            amount=top_up_amount,
            currency="nzd",
            customer=after_data["stripeCustomerId"],
            payment_method=pms.data[0].id,
            off_session=True,
            confirm=True,
        )

        # Atomically add balance and stamp time
        user_ref.update(
            {
                "balance": firestore.Increment(top_up_amount),
                "lastAutoTopupAt": SERVER_TIMESTAMP,
            }
        )
        print(f"[AUTOPAY] uid={uid} auto-top-up +{top_up_amount} cents succeeded.")
    except Exception as e:
        print(f"[AUTOPAY] uid={uid} auto-payment failed: {e}; disabling auto-pay.")
        user_ref.update({"autoPayEnabled": False})
