# AGENTS.md

## Scope
These instructions apply to the full repository.

## Project Map
- Backend: FastAPI + SQLAlchemy async in `backend/app`.
- Frontend: React + Vite in `frontend/src`.
- Core shift start flow spans:
  - `frontend/src/components/ShiftSetupForm.jsx`
  - `frontend/src/services/shiftService.js`
  - `backend/app/api/v1/routers/shifts.py`
  - `backend/app/services/shift_service.py`
  - `backend/app/models/shift_machine_setup.py`

## Run Commands
- Frontend:
  - `cd frontend`
  - `npm install`
  - `npm run dev`
  - `npm run build`
- Backend (local):
  - `cd backend`
  - `pip install -r requirements.txt`
  - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Backend (docker):
  - `cd backend`
  - `docker-compose up --build`

## API and Data Contracts (Do Not Break)
- Endpoint for startup setup: `POST /api/v1/shifts/{shift_id}/setup` (multipart/form-data).
- Multiple files are sent by repeating the same multipart key.
- Image keys must stay aligned between frontend and backend:
  - `img_materias_primas`
  - `img_condiciones_proceso`
  - `img_temp_secadores`
  - `img_extraccion_adhesivo`
  - `img_tiempo_paradas_turno_maquina`
- Backend expects `List[UploadFile]` for each image key and appends new files to existing JSON arrays.

## Critical Pitfall
- Legacy sync from machine setup images to `shifts` table image fields is intentionally disabled in `backend/app/services/shift_service.py`.
- Reason: legacy `shifts` columns are VARCHAR(255) and can fail with multi-image JSON payloads.
- See `FIX_README.md` before re-enabling legacy sync logic.

## Editing Guidance
- For shift-start image bugs, inspect both sides before changing code:
  - frontend file selection, FormData append logic, and key names
  - backend router parameter names and service append logic
- Keep image fields as arrays; do not regress to single string paths.
- Preserve machine-level setup model (`shift_machine_setups`) as source of truth.

## Validation Checklist
- Start shift with one machine in `en_produccion`.
- Upload 2+ images in at least one category from `ShiftSetupForm`.
- Submit setup and verify success response.
- Re-open/edit and upload more images in the same category.
- Confirm backend persists appended arrays (not overwrite, not truncate).

## Testing Note
- No automated test suite is currently configured in the workspace.
- For behavior changes, rely on focused manual verification of the setup flow.
