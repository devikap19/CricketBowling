# CricketBowlingCoach 🏏

A web application for analysing cricket bowling videos using **browser-based MoveNet pose estimation** and a **Python/FastAPI analysis backend**.

The application helps review a bowler's movement by selecting and tracking the bowler, confirming the delivery interval, detecting body landmarks, and generating pose-based measurements, visualisations, and feedback.

## Features

- Upload bowling videos and assess basic video quality
- Select the bowler and track the selected subject
- Review and confirm the active bowling/delivery interval
- Run MoveNet Lightning pose estimation in the browser using TensorFlow.js
- Transfer keypoint coordinates and confidence scores to the backend
- Map crop-relative keypoints back to the original video frame
- Validate pose landmarks and calculate pose-based measurements
- View annotated pose previews, results, and feedback
- Reopen saved sessions

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Browser pose inference | TensorFlow.js, MoveNet Lightning |
| Backend API | Python 3.11, FastAPI, Uvicorn |
| Video processing | OpenCV |
| Validation and data models | Pydantic |
| Testing | pytest |

> **Note:** MoveNet inference runs in the **browser**, not in the Python backend. You do **not** need `ai-edge-litert` or a backend `.tflite` model file.

## Prerequisites

Install the following before starting:

- [Git](https://git-scm.com/downloads)
- [Python 3.11](https://www.python.org/downloads/) (ensure `python` works in a terminal)
- [Node.js and npm](https://nodejs.org/) (use a version supported by the project's Vite installation)
- A modern browser such as Chrome or Edge, preferably with WebGL support

The commands below are for **Windows PowerShell**. Keep the backend and frontend running in separate terminals.

## Getting started

### 1. Clone the repository

```powershell
git clone https://github.com/devikap19/CricketBowling.git
cd CricketBowling
```

If the repository is private, ask the owner to add your GitHub account as a collaborator and accept the invitation before cloning.

### 2. Install backend dependencies

From the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Using the virtual environment's Python executable directly avoids PowerShell activation-policy issues.

### 3. Start the backend

In the **same backend terminal**:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

The API should be available at:

- API: http://127.0.0.1:8000
- Interactive API docs: http://127.0.0.1:8000/docs

**Keep this terminal running.**

### 4. Install frontend dependencies

Open a **second PowerShell terminal**, navigate to the cloned repository, then:

```powershell
cd frontend
npm.cmd ci
```

`npm.cmd` is used instead of `npm` because some Windows PowerShell configurations block `npm.ps1`.

### 5. Start the frontend

In the frontend terminal:

```powershell
npm.cmd run dev
```

Open the local address shown by Vite, normally:

**http://localhost:5173**

Keep the backend running at the same time.

## How to use

1. Open the web application.
2. Upload a cricket bowling video and enter the session details.
3. Run the video quality check.
4. Select the bowler to track.
5. Review the tracking results and confirm the delivery interval.
6. Start pose assessment. The browser loads MoveNet and processes the prepared crops.
7. Review pose landmarks, measurements, annotated previews, and available feedback.
8. Revisit saved sessions from the application when needed.

## How the analysis works

```text
Bowling video
    ↓
Video quality assessment
    ↓
Bowler selection and subject tracking
    ↓
Confirmed delivery interval
    ↓
Backend prepares tracked-bowler image crops
    ↓
Browser runs TensorFlow.js MoveNet Lightning
    ↓
17 pose keypoints + confidence scores per sampled frame
    ↓
Backend maps keypoints to original-frame coordinates
    ↓
Landmark validation, measurements and feedback
    ↓
Annotated previews and session results
```

## Project structure

```text
CricketBowling/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI endpoints
│   │   ├── core/           # Application configuration
│   │   ├── pose/           # Tracking, crops, validation and analysis
│   │   └── video/          # Video quality assessment
│   ├── tests/              # Backend tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/       # API calls and browser MoveNet inference
│   │   └── types/
│   ├── package.json
│   └── package-lock.json
├── docs/                   # Technical and product documentation
├── storage/                # Local session/video output (not committed)
└── README.md
```

## Testing

### Backend

From `backend/`, with the virtual environment created:

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

### Frontend production build

From `frontend/`:

```powershell
npm.cmd run build
```

The build may show a bundle-size warning; this does not necessarily mean the build failed.

## Troubleshooting

**`npm.ps1 cannot be loaded because running scripts is disabled`**  
Use `npm.cmd` instead of `npm`, for example `npm.cmd run dev`.

**PowerShell blocks virtual-environment activation**  
Use `backend\.venv\Scripts\python.exe` directly, as shown in the setup commands. Activation is optional.

**`python` is not recognised or the wrong Python version is used**  
Install Python 3.11 and verify with `python --version`. On Windows, `py -3.11` may also be available.

**Frontend opens but API calls fail**  
Confirm the backend is running on port **8000** and the frontend is running on **localhost:5173**. Check the browser console and backend terminal for errors. The backend's default CORS configuration expects `http://localhost:5173`.

**Browser pose estimation is slow or fails**  
Use an up-to-date Chrome or Edge browser and check WebGL availability. Initial model loading can take longer than subsequent runs. Open the browser developer console for detailed errors.

**Uploads or sessions are missing on a fresh clone**  
This is expected: personal videos and generated session files are intentionally excluded from Git. Upload a new video to create a new session. If a required storage directory is absent, create it under `storage/`.

**Port 8000 or 5173 is already in use**  
Stop the conflicting process. If you change ports, update the corresponding frontend API URL or backend CORS configuration as needed.

## Notes for collaborators

- Do not commit `.env` files, virtual environments, `node_modules`, uploaded videos, or generated reports.
- Install Python dependencies from `backend/requirements.txt` and frontend dependencies from `frontend/package-lock.json`.
- Create a feature branch before making major changes and open a pull request when ready.
- The browser-based MoveNet implementation is the active inference path; the old Python LiteRT implementation has been removed.

## Current validation

On the original development machine, the backend test suite completed with **61 passed, 1 skipped**, and the frontend production build succeeded. These results are not a guarantee of compatibility with every machine; collaborators should run the checks above after cloning.

## Repository

https://github.com/devikap19/CricketBowling
