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
from Backend.firebase_config import db

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Backend is running!"}


    