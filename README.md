# Iran Glass Claim · ایران‌گلس‌کلیم

Repair-first glass claims for Iranian insurers (B2B2C), based on the Carglass Insurance Services case and the completed business plan in this folder.

- **Landing** (`/`) — the three offerings (repair first, instant pay, insurance services), a savings calculator, pricing, and a demo request form
- **Claim wizard** (`/claim`) — tap the damaged glass on a car diagram, see a live repair/replace verdict, get a tracking code
- **Tracking** (`/track`) — status timeline and a star rating once the job is done
- **Insurer panel** (`/dashboard`) — KPIs, charts, claims table, a detail sheet (drag down to close on mobile), settlement CSV

Farsi (RTL, Persian digits and calendar) and English · light, dark and auto themes · responsive, with an iOS-style tab bar on phones.

## Run

```bash
cp .env.example .env   # then set INSURER_TOKEN and DASHBOARD_PASSWORD
docker compose up -d --build
```

Frontend: http://localhost:3003 · API (loopback only): http://localhost:8003. Swagger is off; start the backend with `DOCS=1` to get `/docs`.

## Security model

| Who | Can do | How |
| --- | --- | --- |
| Anyone | File a claim, request a demo, see headline stats (`/api/stats/public`) | Rate-limited per IP; body ≤ 64 KB |
| Holder of a tracking code | See status, decision and timeline, rate once when done | Codes are `IGC-` + 8 symbols from a CSPRNG (~10¹² space); no name, mobile, plate or policy number is returned |
| Insurer (logged in at `/dashboard`) | List and search claims with PII, full stats, move a claim one step or reject it | Password → 12 h HMAC-signed, httpOnly, SameSite=Strict cookie; the Next.js proxy turns it into `Authorization: Bearer $INSURER_TOKEN`, which the browser never sees |

- Status changes follow `received → approved → scheduled → in_service → done`, one step at a time; any open claim can be rejected; `done` and `rejected` are final (409 otherwise).
- The API sends `nosniff`, `X-Frame-Options`, `CSP default-src 'none'`, `Referrer-Policy: no-referrer` and `Cache-Control: no-store`; pages send a CSP, HSTS, `Permissions-Policy` and no `X-Powered-By`.
- Put a reverse proxy in front of the frontend that sets `X-Forwarded-For` (nginx: `proxy_set_header X-Forwarded-For $remote_addr;`) and start the frontend with `TRUST_PROXY=1`. Next.js keeps a client-sent value, so without one the per-IP limits can be dodged. Login stays safe either way: failed logins are also capped globally (30 a minute).
- Re-run the pen test: `TOKEN=… scripts/pentest.sh http://127.0.0.1:8003` (backend) or `PASSWORD=… scripts/pentest.sh http://127.0.0.1:3003` (through the proxy).

The builds work on slow or offline networks. The backend installs from the wheels in `backend/wheels/` (refresh them with `pip download -r requirements.txt -d wheels`). The frontend reuses `frontend/node_modules` when it's there and runs `npm install` when it isn't.

Local dev: `cd backend && pip install -r requirements.txt && INSURER_TOKEN=dev uvicorn main:app --port 8000`, then `cd frontend && npm i && INSURER_TOKEN=dev DASHBOARD_PASSWORD=dev npm run dev`.

Backend check: `cd backend && python test_main.py`

## Stack

`frontend/` Next.js 16 (App Router), `motion` for springs, `lucide-react` for icons, self-hosted Vazirmatn font, plain CSS tokens.
`backend/` FastAPI with an in-memory store seeded with 64 demo claims. Data resets when the backend restarts.
