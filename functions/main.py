import os
import stripe
from firebase_admin import initialize_app, firestore, credentials
from firebase_functions import firestore_fn, options

cred = credentials.Certificate("tilt-af037-e2e569468028.json")
initialize_app(cred)

db = firestore.client()
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")


@firestore_fn.on_document_updated(document="users/{userId}")
def check_balance_for_autopay(event: firestore_fn.Event[firestore_fn.Change]) -> None:
    """Watches for updates on user documents to trigger auto-payments."""
    before_data = event.data.before.to_dict() or {}
    after_data = event.data.after.to_dict() or {}

    balance_before = before_data.get("balance", 0)
    balance_after = after_data.get("balance", 0)

    # Prevent infinite loops: If balance increased, stop.
    if balance_after > balance_before:
        print(f"User {event.params['userId']}: Balance increased. No action needed.")
        return

    # Trigger only if balance was spent and is now low
    if not (balance_after < balance_before and balance_after <= 0):
        return

    # Check if auto-pay is enabled for this user
    if not (after_data.get("autoPayEnabled") and after_data.get("stripeCustomerId")):
        return

    print(
        f"User {event.params['userId']}: Low balance detected. Triggering auto-top-up."
    )
    user_ref = db.collection("users").document(event.params["userId"])
    top_up_amount = after_data.get("autoPayAmountCents", 0)

    try:
        payment_methods = stripe.PaymentMethod.list(
            customer=after_data["stripeCustomerId"], type="card"
        )
        if not payment_methods.data:
            print(f"User {event.params['userId']}: No saved card. Disabling auto-pay.")
            user_ref.update({"autoPayEnabled": False})
            return

        # Charge the user's saved card
        stripe.PaymentIntent.create(
            amount=top_up_amount,
            currency="nzd",
            customer=after_data["stripeCustomerId"],
            payment_method=payment_methods.data[0].id,
            off_session=True,
            confirm=True,
        )
        # On success, atomically increment the balance
        user_ref.update({"balance": firestore.Increment(top_up_amount)})
        print(f"User {event.params['userId']}: Auto-top-up successful.")

    except Exception as e:
        print(
            f"Auto-payment failed for {event.params['userId']}: {e}. Disabling auto-pay."
        )
        user_ref.update({"autoPayEnabled": False})
