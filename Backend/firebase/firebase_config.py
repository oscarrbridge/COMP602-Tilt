import firebase_admin
from firebase_admin import firestore

# Initialize once with Application Default Credentials (from gcloud login)
if not firebase_admin._apps:
    firebase_admin.initialize_app()

db = firestore.client()
