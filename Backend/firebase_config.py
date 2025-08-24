import firebase_admin
from firebase_admin import credentials, firestore, auth, storage

SERVICE_ACCOUNT_PATH = "CHANGE ME"

if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred, {
        "storageBucket": "<your-project-id>.appspot.com"
    })

db = firestore.client()

bucket = storage.bucket()
