# CricketBowlingCoach

A mobile-first cricket bowling analysis and coaching application for coaches using smartphones.

## Overview

CricketBowlingCoach helps cricket coaches:
- Upload bowling videos recorded on a smartphone.
- Run automated video quality assessments.
- Analyse bowling actions based on reliably visible evidence.
- Review individual deliveries and patterns across a six-ball session.
- Add coaching observations and recommendations.
- Download and share PDF reports with students.

The application supports both **fast bowling** and **spin bowling**.

---

## Technology Stack

| Layer    | Technologies                                  |
|----------|-----------------------------------------------|
| Frontend | React, Vite, TypeScript, Tailwind CSS, PWA    |
| Backend  | Python, FastAPI, OpenCV, MoveNet LiteRT         |
| Reports  | PDF generation (future)                       |

---

## Project Structure

```
CricketBowlingCoach/
├── frontend/          # React + Vite + TypeScript PWA
│   ├── public/        # Static assets, PWA icons
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page-level components
│       ├── services/    # API client and utilities
│       ├── hooks/       # Custom React hooks
│       ├── types/       # TypeScript type definitions
│       └── styles/      # Global styles
├── backend/           # FastAPI Python backend
│   ├── app/
│   │   ├── api/       # API route handlers
│   │   ├── core/      # App configuration and settings
│   │   ├── services/  # Business logic services
│   │   ├── video/     # Video processing (future)
│   │   ├── pose/      # Pose estimation (future)
│   │   ├── analysis/  # Bowling analysis (future)
│   │   └── reports/   # PDF report generation (future)
│   ├── tests/         # Backend tests
│   └── requirements.txt
├── storage/           # Runtime file storage
│   ├── uploads/       # Uploaded videos
│   ├── processed/     # Processed video frames
│   └── reports/       # Generated PDF reports
├── docs/              # Documentation
└── README.md
```

---

## Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **npm** ≥ 9

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd CricketBowlingCoach
```

### 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend development server will start at **http://localhost:5173**.

### 3. Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at **http://localhost:8000**.

### 4. Verify the setup

- Frontend: Open **http://localhost:5173** in your browser.
- Backend health check: Visit **http://localhost:8000/api/health** or run:

```bash
curl http://localhost:8000/api/health
```

### 5. Create a session (Stage 2A)

The frontend provides a mobile-friendly session form. It accepts MP4 and MOV videos up to 200 MB and submits the video with session details to `POST /api/sessions` as `multipart/form-data`.

Required form fields:

| Field | Values |
|---|---|
| `video` | MP4 or MOV file; maximum 200 MB |
| `bowler_name` | Non-empty text, up to 120 characters |
| `session_date` | Date in `YYYY-MM-DD` format |
| `bowling_type` | `fast` or `spin` |
| `bowling_arm` | `right` or `left` |
| `camera_view` | `front`, `side`, `rear`, or `other` |
| `notes` | Optional text, up to 2,000 characters |

Example response (`201 Created`):

```json
{
  "session_id": "3f48ca4b-1f6c-48f3-9c77-f6d3cc2ad10d",
  "bowler_name": "Asha Kumar",
  "session_date": "2026-11-04",
  "bowling_type": "fast",
  "bowling_arm": "right",
  "camera_view": "side",
  "notes": null,
  "original_filename": "practice.mp4",
  "video_size_bytes": 1048576,
  "status": "uploaded",
  "created_at": "2026-11-04T10:30:00Z"
}
```

Videos are streamed to `storage/uploads` under a generated server-side name; session metadata is stored separately as JSON in `storage/sessions`. The API does not return filesystem paths. The default limit is 200 MiB and can be changed with the `CBC_MAX_UPLOAD_SIZE_BYTES` environment variable. Unsupported extensions/content return `415`, oversized uploads return `413`, and invalid or missing form fields return `422`.

Expected response:

```json
{
  "status": "healthy",
  "service": "CricketBowlingCoach API",
  "version": "0.1.0"
}
```

---

### 6. Check video quality (Stage 2B)

After creating a session, request `POST /api/sessions/{session_id}/quality-check` to inspect the saved video with OpenCV. The response contains container metadata, independent reliability-rated metrics, recommendations, and an overall assessment. Results are saved separately as `storage/sessions/{session_id}.quality.json` and reused on later requests. Add `?refresh=true` to recalculate a saved result.

The checks cover file integrity, resolution, frame rate, sampled brightness, a heuristic sharpness/blur metric, and an initial limited camera-motion estimate. Bowler visibility and pose coverage are returned as unavailable; this endpoint does not analyze bowling technique. Thresholds, rationale, and limitations are documented in [docs/VIDEO_QUALITY_CRITERIA.md](docs/VIDEO_QUALITY_CRITERIA.md).

### 7. Select the bowler and confirm an active interval (Stage 4)

After upload, pause the video on a frame where the intended bowler is clear and draw a box around that person. The backend initializes the installed OpenCV MIL tracker from this selection, proposes movement intervals, and reports interruptions. Review a proposed start/end time or enter adjusted times and explicitly confirm the interval before pose assessment.

- `GET /api/sessions/{session_id}/video` serves the uploaded video for seeking in the coach review screen.
- `POST /api/sessions/{session_id}/subject-tracking` accepts `{"timestamp_seconds": 1.5, "box": {"x": 0.4, "y": 0.2, "width": 0.2, "height": 0.7}}`, with normalized box coordinates in `[0,1]`.
- `POST /api/sessions/{session_id}/subject-interval` accepts `{"start_seconds": 2.0, "end_seconds": 5.5}` to confirm the reviewed bounds. Editing either time records the interval source as `manual`.

### 8. Assess selected-bowler pose visibility (Stage 3 plus Stage 4 tracking)

After a successful technical integrity check, a coach-selected subject track, and a confirmed active interval, the session screen offers **Run bowler pose assessment**. `POST /api/sessions/{session_id}/pose-assessment` samples only the confirmed interval and runs MoveNet only on reliably tracked selected-person frames. Results are saved in `storage/sessions/{session_id}.pose.json`; previews are in `storage/processed/{session_id}/`. Cached results are reused; pass `?refresh=true` to rerun inference.

Tracking uses OpenCV MIL plus an HSV appearance check. It does not automatically switch to another person after repeated tracking loss. The interval proposal is based on selected-box movement and scale change, not delivery segmentation; coach review is required. See [docs/BOWLER_TRACKING.md](docs/BOWLER_TRACKING.md) for request details, interpretation, and limitations.

The MoveNet Lightning weights are downloaded separately into `backend/models/` and excluded from Git. From the `backend` directory, run `python scripts/download_movenet_model.py` to fetch and verify the model. Runtime selection, model source, licensing, keypoint convention, thresholds, limitations, and a manual validation procedure are in [docs/POSE_ESTIMATION.md](docs/POSE_ESTIMATION.md).

## Development

### Frontend commands

| Command           | Description                  |
|-------------------|------------------------------|
| `npm run dev`     | Start development server     |
| `npm run build`   | Build for production         |
| `npm run preview` | Preview production build     |
| `npm run lint`    | Run ESLint / Oxlint          |

### Backend commands

| Command                                          | Description              |
|--------------------------------------------------|--------------------------|
| `uvicorn app.main:app --reload --port 8000`      | Start dev server         |
| `pytest`                                         | Run tests                |

Run backend tests from the `backend` directory with `pytest`.

---

## Product Principles

See [docs/PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md) for the full product requirements and guiding principles.

---

## License

Private — All rights reserved.
