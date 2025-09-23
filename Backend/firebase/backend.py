# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase
cred = credentials.Certificate("path/to/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

app = FastAPI()

# Enable CORS so React frontend can access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/games/slots")
def get_slots():
    slots_ref = db.collection("games").document("slots")
    slots_doc = slots_ref.get()
    
    if slots_doc.exists:
        return slots_doc.to_dict()  # returns {'name': ...}
    else:
        return {"error": "No slots found"}
