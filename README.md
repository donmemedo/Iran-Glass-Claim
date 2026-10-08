# Iran Glass Claim · ایران‌گلس‌کلیم

Repair-first glass claims for Iranian insurers (B2B2C), based on the Carglass Insurance Services case and the completed business plan in this folder.

- **Landing** (`/`) — the three offerings (repair first, instant pay, insurance services), a savings calculator, pricing, and a demo request form
- **Claim wizard** (`/claim`) — tap the damaged glass on a car diagram, see a live repair/replace verdict, get a tracking code
- **Tracking** (`/track`) — status timeline and a star rating once the job is done
- **Insurer panel** (`/dashboard`) — KPIs, charts, claims table, a detail sheet (drag down to close on mobile), settlement CSV

Farsi (RTL, Persian digits and calendar) and English · light, dark and auto themes · responsive, with an iOS-style tab bar on phones.

## Run

```bash
cp .env.example .env   # then set INSURER_TOKEN (24+ chars) and DASHBOARD_PASSWORD (12+ chars)
docker compose up -d --build
```

Frontend: http://localhost:3003 · API: http://localhost:8003. Both listen on loopback only. Swagger is off; start the backend with `DOCS=1` to get `/docs`.

To serve it to others, terminate TLS in front of the frontend. Secure cookies and HSTS need HTTPS, and the per-IP limits need a proxy that overwrites `X-Forwarded-For`:

```nginx
location / {
    proxy_pass http://127.0.0.1:3003;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;   # overwrite, never append the client's value
    proxy_set_header X-Forwarded-Proto https;
    client_max_body_size 64k;
}
```

## Security model

| Who | Can do | How |
| --- | --- | --- |
| Anyone | File a claim, request a demo, see headline stats (`/api/stats/public`) | Rate-limited per IP; body ≤ 64 KB |
| Holder of a tracking code | See status, decision and timeline, rate once when done | Codes are `IGC-` + 8 symbols from a CSPRNG (~10¹² space); no name, mobile, plate or policy number is returned |
| Insurer (logged in at `/dashboard`) | List and search claims with PII, full stats, move a claim one step or reject it | Password → 12 h HMAC-signed, httpOnly, SameSite=Strict cookie; the Next.js proxy turns it into `Authorization: Bearer $INSURER_TOKEN`, which the browser never sees. API responses are `no-store`; ETags are kept in memory only and dropped on logout |

- Status changes follow `received → approved → scheduled → in_service → done`, one step at a time; any open claim can be rejected; `done` and `rejected` are final (409 otherwise).
- The API sends `nosniff`, `X-Frame-Options`, `CSP default-src 'none'`, `Referrer-Policy: no-referrer` and `Cache-Control: no-store`; pages send a CSP, HSTS, `Permissions-Policy` and no `X-Powered-By`.
- Per-IP limits trust `X-Forwarded-For` only with `TRUST_PROXY=1` (the compose default, paired with the loopback-only port and the proxy above). Next.js keeps a client-sent value, so never set it when the frontend is reachable directly. Anonymous writes also share a global ceiling (60 burst, 1/s), so rotating IPs can't flood the store; failed logins are capped at 300 a minute globally, and short or placeholder secrets fail closed.
- Re-run the pen test: `TOKEN=… scripts/pentest.sh http://127.0.0.1:8003` (backend) or `PASSWORD=… scripts/pentest.sh http://127.0.0.1:3003` (through the proxy).

The builds work on slow or offline networks. The backend installs from the wheels in `backend/wheels/` (refresh them with `pip download -r requirements.txt -d wheels`). The frontend reuses `frontend/node_modules` when it's there and runs `npm install` when it isn't.

Local dev: `export INSURER_TOKEN=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))') DASHBOARD_PASSWORD='a long local passphrase'`, then `cd backend && pip install -r requirements.txt && uvicorn main:app --port 8000` and `cd frontend && npm i && npm run dev`.

Backend check: `cd backend && python test_main.py`

## Stack

`frontend/` Next.js 16 (App Router), `motion` for springs, `lucide-react` for icons, self-hosted Vazirmatn font, plain CSS tokens.
`backend/` FastAPI with an in-memory store seeded with 64 demo claims. Data resets when the backend restarts.
