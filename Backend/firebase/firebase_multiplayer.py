import firebase_admin
from firebase_admin import credentials, firestore
import { runTransaction } from "firebase/firestore";


# Firebase service account to authenticate Firebase Database
cred = credentials.Certificate("tilt-af037-firebase-adminsdk-fbsvc-b3c4e4e23f.json")
firebase_admin.initialize_app(cred)
# db - our database of users
db = firestore.client()

# Transaction object from database
transaction = db.transaction()



@firestore.transactional
