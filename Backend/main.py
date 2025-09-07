# To run this file:


# Make sure python extension is installed.
# cd Backend
# python -m venv venv
# Mac: source venv/bin/activate
# Windows: venv\Scripts\activate
# pip install firebase-admin fastapi uvicorn

# uvicorn main:app --reload

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Backend.firebase.firebase_config import db
from Backend.routers.blackjack import router as blackjack_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(blackjack_router)


@app.get("/")
def read_root():
    return {"message": "Backend is running!"}


@app.get("/ping")
def ping_firestore():
    doc_ref = db.collection("demo").document("ping")
    doc_ref.set({"ok": True})
    snap = doc_ref.get()
    return {"doc_id": snap.id, "data": snap.to_dict()}
