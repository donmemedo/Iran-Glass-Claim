# Iran Glass Claim · ایران‌گلس‌کلیم

Repair-first glass claims for Iranian insurers (B2B2C), based on the Carglass Insurance Services case and the completed business plan in this folder.

- **Landing** (`/`) — the three offerings (repair first, instant pay, insurance services), a savings calculator, pricing, and a demo request form
- **Claim wizard** (`/claim`) — tap the damaged glass on a car diagram, see a live repair/replace verdict, get a tracking code
- **Tracking** (`/track`) — status timeline and a star rating once the job is done
- **Insurer panel** (`/dashboard`) — KPIs, charts, claims table, a detail sheet (drag down to close on mobile), settlement CSV

Farsi (RTL, Persian digits and calendar) and English · light, dark and auto themes · responsive, with an iOS-style tab bar on phones.

## Run

```bash
docker compose up -d --build
```

Frontend: http://localhost:3003 · API: http://localhost:8003/docs

The builds work on slow or offline networks. The backend installs from the wheels in `backend/wheels/` (refresh them with `pip download -r requirements.txt -d wheels`). The frontend reuses `frontend/node_modules` when it's there and runs `npm install` when it isn't.

Local dev: `cd backend && pip install -r requirements.txt && uvicorn main:app --port 8000`, then `cd frontend && npm i && npm run dev`.

Backend check: `cd backend && python test_main.py`

## Stack

`frontend/` Next.js 16 (App Router), `motion` for springs, `lucide-react` for icons, self-hosted Vazirmatn font, plain CSS tokens.
`backend/` FastAPI with an in-memory store seeded with 64 demo claims. Data resets when the backend restarts.
