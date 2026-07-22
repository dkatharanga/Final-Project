"""
SynapX GymOS — Biometric Microservice
=====================================
Face recognition (InsightFace) + fingerprint bridge (ZKTeco / pyzkfp).

The Node backend (SynapX_Backend_API) talks to this service over HTTP. It never
stores or matches biometrics itself — it forwards captures here and persists the
bytes we return. Contract (must match src/services/biometricService.js):

  POST /enroll/face        { memberId, image:<base64 jpeg|dataURL> } -> { embedding:<base64> }
  POST /match/face         { image:<base64 jpeg|dataURL> }           -> { memberId, confidence }
  POST /enroll/fingerprint { memberId }                              -> { template1, template2 }
  POST /match/fingerprint  { template:<base64> }                     -> { memberId, confidence }
  GET  /health                                                       -> { status, face, fingerprint, enrolled }

Face works with any webcam — no special hardware. Fingerprint needs a ZKTeco
desktop reader (ZK4500 / SLK20R) + the ZKFinger SDK via `pyzkfp`; if that isn't
present the fingerprint routes return 503 and the backend shows a clear message.
"""

import os
import json
import base64
import threading

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

MODEL_NAME  = os.getenv("FACE_MODEL", "buffalo_l")
THRESHOLD   = float(os.getenv("FACE_THRESHOLD", "0.45"))   # cosine similarity for a match
INDEX_PATH  = os.getenv("INDEX_PATH", "face_index.json")
PORT        = int(os.getenv("PORT", "8000"))

app = FastAPI(title="SynapX Biometric Service", version="1.0.0")
_lock = threading.Lock()

# ── Face gallery (memberId -> 512-d normalized embedding) ─────────────────────
# Persisted to disk so enrollments survive restarts. The Node DB keeps its own
# copy of the bytes; this index is what /match/face searches.
_face_index: dict[str, np.ndarray] = {}


def _load_index() -> None:
    if os.path.exists(INDEX_PATH):
        try:
            with open(INDEX_PATH, "r", encoding="utf-8") as f:
                raw = json.load(f)
            for mid, vec in raw.items():
                _face_index[mid] = np.asarray(vec, dtype=np.float32)
            print(f"[face] loaded {len(_face_index)} enrolled embeddings from {INDEX_PATH}")
        except Exception as e:  # noqa: BLE001
            print(f"[face] could not load index: {e}")


def _save_index() -> None:
    tmp = {mid: vec.tolist() for mid, vec in _face_index.items()}
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(tmp, f)


# ── Face model (lazy, loaded once at startup) ────────────────────────────────
_face_app = None


def _get_face_app():
    global _face_app
    if _face_app is None:
        from insightface.app import FaceAnalysis
        fa = FaceAnalysis(name=MODEL_NAME, providers=["CPUExecutionProvider"])
        fa.prepare(ctx_id=0, det_size=(640, 640))
        _face_app = fa
    return _face_app


def _decode_image(b64: str) -> np.ndarray:
    """Accept a raw base64 string or a full `data:image/...;base64,` data URL."""
    import cv2
    if "," in b64 and b64.strip().lower().startswith("data:"):
        b64 = b64.split(",", 1)[1]
    try:
        buf = base64.b64decode(b64)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid base64 image.")
    img = cv2.imdecode(np.frombuffer(buf, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")
    return img


def _embed(img: np.ndarray):
    """Return the normalized embedding of the largest detected face, or None."""
    faces = _get_face_app().get(img)
    if not faces:
        return None
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    return face.normed_embedding.astype(np.float32)  # L2-normalized, 512-d


# ── Fingerprint bridge (optional — needs ZKTeco reader + pyzkfp) ─────────────
_fp = None            # pyzkfp.ZKFP2 handle
_fp_error = None      # why fingerprint is unavailable, if so
_fp_ids: dict[int, str] = {}  # reader slot id -> memberId (for identify)


def _init_fingerprint():
    global _fp, _fp_error
    try:
        from pyzkfp import ZKFP2
    except Exception as e:  # noqa: BLE001
        _fp_error = f"pyzkfp not installed ({e})"
        return
    try:
        z = ZKFP2()
        z.Init()
        if z.GetDeviceCount() < 1:
            _fp_error = "no fingerprint reader detected"
            return
        z.OpenDevice(0)
        _fp = z
        print("[fp] ZKTeco reader ready")
    except Exception as e:  # noqa: BLE001
        _fp_error = f"reader init failed ({e})"


def _capture_once(timeout_s: float = 10.0):
    """Block until a finger is read or timeout. Returns (template, image) or None."""
    import time
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        cap = _fp.AcquireFingerprint()
        if cap:
            return cap  # (template, image)
        time.sleep(0.2)
    return None


# ── Schemas ──────────────────────────────────────────────────────────────────
class EnrollFace(BaseModel):
    memberId: str
    image: str


class MatchFace(BaseModel):
    image: str


class EnrollFinger(BaseModel):
    memberId: str


class MatchFinger(BaseModel):
    template: str


# ── Lifecycle ────────────────────────────────────────────────────────────────
@app.on_event("startup")
def _startup():
    _load_index()
    try:
        _get_face_app()
        print(f"[face] model '{MODEL_NAME}' ready (threshold {THRESHOLD})")
    except Exception as e:  # noqa: BLE001
        print(f"[face] model load FAILED: {e}")
    _init_fingerprint()
    if _fp_error:
        print(f"[fp] disabled: {_fp_error}")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "face": _face_app is not None,
        "fingerprint": _fp is not None,
        "fingerprintError": _fp_error,
        "enrolled": len(_face_index),
    }


# ── Face endpoints ───────────────────────────────────────────────────────────
@app.post("/enroll/face")
def enroll_face(body: EnrollFace):
    emb = _embed(_decode_image(body.image))
    if emb is None:
        # 200 with a null embedding so the backend reports "no face" cleanly
        # rather than treating it as the service being down.
        return {"embedding": None, "reason": "NO_FACE"}
    with _lock:
        _face_index[body.memberId] = emb
        _save_index()
    return {"embedding": base64.b64encode(emb.tobytes()).decode("ascii")}


@app.post("/match/face")
def match_face(body: MatchFace):
    emb = _embed(_decode_image(body.image))
    if emb is None:
        return {"memberId": None, "confidence": 0.0}
    if not _face_index:
        return {"memberId": None, "confidence": 0.0}
    ids = list(_face_index.keys())
    mat = np.stack([_face_index[i] for i in ids])   # (N, 512), rows are normalized
    sims = mat @ emb                                # cosine similarity (both L2-normed)
    best = int(np.argmax(sims))
    score = float(sims[best])
    if score >= THRESHOLD:
        return {"memberId": ids[best], "confidence": round(score, 4)}
    return {"memberId": None, "confidence": round(score, 4)}


# ── Fingerprint endpoints ────────────────────────────────────────────────────
def _require_fp():
    if _fp is None:
        raise HTTPException(status_code=503, detail=_fp_error or "fingerprint reader unavailable")


@app.post("/enroll/fingerprint")
def enroll_fingerprint(body: EnrollFinger):
    _require_fp()
    # Enrollment merges three captures of the same finger into one template.
    templates = []
    for _ in range(3):
        cap = _capture_once()
        if not cap:
            raise HTTPException(status_code=408, detail="Fingerprint capture timed out.")
        templates.append(cap[0])
    reg = _fp.DBMerge(*templates)                   # merged registration template
    reg_template = reg[0] if isinstance(reg, (list, tuple)) else reg
    # Register in the reader's DB so /match/fingerprint can identify it later.
    with _lock:
        fid = (max(_fp_ids.keys()) + 1) if _fp_ids else 1
        _fp.DBAdd(fid, reg_template)
        _fp_ids[fid] = body.memberId
    b = bytes(reg_template)
    half = len(b) // 2 or len(b)
    return {
        "template1": base64.b64encode(b[:half]).decode("ascii"),
        "template2": base64.b64encode(b[half:]).decode("ascii"),
    }


@app.post("/match/fingerprint")
def match_fingerprint(body: MatchFinger = None):
    _require_fp()
    # The reader owns the scan; capture live from the device and identify.
    cap = _capture_once()
    if not cap:
        raise HTTPException(status_code=408, detail="Fingerprint capture timed out.")
    fid, score = _fp.DBIdentify(cap[0])
    if fid and fid in _fp_ids:
        return {"memberId": _fp_ids[fid], "confidence": int(score)}
    return {"memberId": None, "confidence": 0}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=PORT, reload=False)
