# SynapX Biometric Service

Face + fingerprint recognition microservice for SynapX GymOS. The Node backend
forwards captures here and stores the bytes we return; matching happens here.

## Why it exists

Face/fingerprint need native ML libraries (InsightFace, ONNX Runtime) and, for
fingerprint, a vendor SDK — none of which belong in the Node API. This service
isolates them behind a small HTTP contract.

## Endpoints

| Method | Path                  | Body                                   | Returns                        |
|--------|-----------------------|----------------------------------------|--------------------------------|
| POST   | `/enroll/face`        | `{ memberId, image }` (base64/dataURL) | `{ embedding }`                |
| POST   | `/match/face`         | `{ image }`                            | `{ memberId, confidence }`     |
| POST   | `/enroll/fingerprint` | `{ memberId }`                         | `{ template1, template2 }`     |
| POST   | `/match/fingerprint`  | `{ template }`                         | `{ memberId, confidence }`     |
| GET    | `/health`             | —                                      | service + gallery status       |

`memberId` is `null` when there is no confident match.

## Setup (Windows / PowerShell)

```powershell
cd D:\2_Amila\Final_Project_Gym_OS\SynapX_Biometric_Service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

> First run downloads the `buffalo_l` face model (~300 MB) to
> `~/.insightface/models`. Needs internet once; cached afterward.

## Run

```powershell
python app.py
# or: uvicorn app:app --port 8000
```

Confirm it's up:

```powershell
curl http://localhost:8000/health
```

You should see `"face": true`. `"fingerprint": false` is expected unless a
ZKTeco reader + ZKFinger SDK are present (see below) — face enrollment works
regardless.

## Wire it to the backend

Already set in `SynapX_Backend_API/synapx-backend/.env`:

```
BIOMETRIC_SERVICE_URL=http://localhost:8000
BIOMETRIC_TIMEOUT_MS=15000
```

Restart the Node backend after this service is running. Now **Add Member →
Step 2 → Capture face** stores a real embedding and returns success.

## Fingerprint (optional)

Real fingerprint templates require a **ZKTeco desktop reader** (ZK4500 / SLK20R),
its **ZKFinger SDK** installed on the machine, and the `pyzkfp` package. With
those present, `/health` shows `"fingerprint": true` and:

- `/enroll/fingerprint` captures 3 scans from the reader, merges them, registers
  the member in the reader DB, and returns the template.
- `/match/fingerprint` captures live and identifies.

Without the reader the fingerprint routes return `503` and the app shows
"Biometric service not connected" for fingerprint only — face and QR still work.

## Notes

- The enrolled face gallery is persisted to `face_index.json` (path configurable
  via `INDEX_PATH`). Delete it to reset all face enrollments.
- CPU inference is fine for a gym-desk workload. For many concurrent kiosks,
  install `onnxruntime-gpu` and set providers accordingly in `app.py`.
