"""
SynapX GymOS — Biometric microservice (reference scaffold)
==========================================================
Face recognition with InsightFace; embeddings matched by cosine similarity
(swap the in-memory store for FAISS to scale to thousands of members).

Contract used by the Node API (src/services/biometricService.js):
    POST /enroll/face   { memberId, image(base64) } -> { ok, memberId }
    POST /match/face    { image(base64) }           -> { memberId|null, confidence }
    POST /match/fingerprint { template }            -> { memberId|null, confidence }

Run:
    pip install -r requirements.txt
    uvicorn app:app --port 8000 --reload
Then in the Node backend .env:
    BIOMETRIC_SERVICE_URL=http://localhost:8000
"""
import base64, io, json, os
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from PIL import Image
from insightface.app import FaceAnalysis

app = FastAPI(title="SynapX Biometric Service")

# Load the face model once (detection + ArcFace embedding).
face = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
face.prepare(ctx_id=0, det_size=(640, 640))

DB_PATH = "embeddings.json"          # { memberId: [512-d vector] }
MATCH_THRESHOLD = 0.35               # cosine similarity floor for a positive match

def _load():
    if os.path.exists(DB_PATH):
        return {k: np.array(v, dtype=np.float32) for k, v in json.load(open(DB_PATH)).items()}
    return {}

def _save(db):
    json.dump({k: v.tolist() for k, v in db.items()}, open(DB_PATH, "w"))

DB = _load()

def _embed(image_b64: str):
    """Decode a base64 (data URL or raw) image and return the primary face embedding."""
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]
    img = Image.open(io.BytesIO(base64.b64decode(image_b64))).convert("RGB")
    faces = face.get(np.array(img)[:, :, ::-1])  # RGB -> BGR
    if not faces:
        return None
    emb = faces[0].embedding
    return emb / np.linalg.norm(emb)

class EnrollReq(BaseModel):
    memberId: str
    image: str

class MatchReq(BaseModel):
    image: str

class FpReq(BaseModel):
    template: str

@app.post("/enroll/face")
def enroll_face(req: EnrollReq):
    emb = _embed(req.image)
    if emb is None:
        return {"ok": False, "error": "NO_FACE_DETECTED"}
    DB[req.memberId] = emb
    _save(DB)
    return {"ok": True, "memberId": req.memberId}

@app.post("/match/face")
def match_face(req: MatchReq):
    emb = _embed(req.image)
    if emb is None or not DB:
        return {"memberId": None, "confidence": 0.0}
    ids = list(DB.keys())
    mat = np.stack([DB[i] for i in ids])          # (N, 512) — replace with FAISS index at scale
    sims = mat @ emb                               # cosine similarity (vectors are L2-normalised)
    best = int(np.argmax(sims))
    score = float(sims[best])
    if score < MATCH_THRESHOLD:
        return {"memberId": None, "confidence": round(score * 100, 1)}
    return {"memberId": ids[best], "confidence": round(score * 100, 1)}

@app.post("/match/fingerprint")
def match_fingerprint(req: FpReq):
    # Fingerprint templates come from the ZKTeco SDK bridge (native, Windows).
    # Match req.template against enrolled templates here. Stub for now:
    return {"memberId": None, "confidence": 0.0}

@app.get("/health")
def health():
    return {"status": "ok", "enrolled": len(DB)}
