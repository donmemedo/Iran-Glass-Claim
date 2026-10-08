# Session handoff: security audit, pen test, performance and Apple-style UI pass

Written 2026-10-02 at the end of a Claude Code session. Read this whole file before touching code.

## 0. Progress (updated 2026-10-08, second session)

Branch `security-hardening`, pushed, with a draft PR open.

**Done and verified**
- Backend fixes for every section 4 finding, with `backend/test_main.py` passing. Its HTTP block needs `httpx2`.
- Frontend: `app/api/[...path]/route.ts` proxy, `app/api/login/route.ts` with an HMAC session cookie, per-IP and global login caps, CSP and security headers in `next.config.ts`, the `api()` change for ETag reuse, the dashboard (login card, logout, Reject confirm, error notices, focus trap, momentum projection, CSV-injection fix), the track and claim fixes, i18n, and the Apple HIG CSS (static aurora, reduced transparency, increased contrast, press feedback).
- Infra: hardened compose, non-root images, `.env.example`, `public/.gitkeep`, committed wheels, untracked tsbuildinfo.
- `npx tsc --noEmit` passes. `scripts/pentest.sh` gives 26 of 26 PASS against the fixed backend and 25 FAIL against `main` (results in the PR body).
- graphify: `graphify-out/` built, with 327 nodes and 13 communities. It reports a health warning of 21 dangling-endpoint edges. Communities are still unlabelled (Step 5) and the HTML export has not run.

**Left**
1. Read the results of the review workflow (run `wf_36a9d1b7-bc3`; it can be resumed from the session journal) and of the `/security-audit` fork. Apply the confirmed findings.
2. Run `scripts/pentest.sh` through the Next proxy, with `PASSWORD=…` against `next start`. It has not run because the machine was too loaded for `next build` or `next dev`.
3. Do a visual check at phone width in fa and en, in light and dark.
4. graphify Steps 5 to 9: labels, `graphify export html`, and the manifest. Then run `graphify update .`.
5. Write the ponytail-review list and the final report.

## 1. The original request

The user asked, in their words:

> use red team agents and blue team agents and security skills to audit and solve all problems and of course do pen test for this project, also add performance to all security things. and for ui/ux use /apple-design. you can use how much tokens you want, just try to finish all works under 5 hours

So the full scope is:

1. **Red team.** Audit and pen test the app.
2. **Blue team.** Fix every confirmed problem.
3. **Performance.** Every security fix should also carry a performance improvement where one exists, such as ETag/304, gzip, pagination, bounded stores or memoised stats.
4. **UI/UX.** Apply Apple's fluid-interface and Human Interface principles, summarised in section 8.
5. **Persian copy.** It must follow the user's Persian UX vocabulary at `~/references/persian-ux-vocab/README.md`.

## 2. Status at a glance

| Area | State |
| --- | --- |
| Repo code changes | **None yet.** No file in the repo has been edited for this task. |
| Red-team recon | **Partial.** 2 of 7 reviewers finished: authorization/business logic and resource exhaustion/input validation. They produced 16 findings, each backed by live curl evidence. |
| Adversarial verification of findings | **Not run.** The verifiers hit usage limits. Section 4 lists the findings as reported. I checked each code-level claim against the source myself and they match. |
| Frontend, infra, perf, privacy and runtime reviewers | **Not run.** Section 5 has my own notes from reading the code, as a starting point. |
| Apple-design audit | **Not run.** Section 8 has the checklist plus the concrete issues I saw while reading. |
| Fixes, tests, re-test | **Not started.** |

Why it stalled: the session ran parallel multi-agent workflows, and they kept hitting account usage limits. Agents died mid-run three times. If you continue with Claude, do the work inline or with at most one or two subagents.

## 3. Project and environment

**Stack.** Next.js 16.3.6 with the App Router, React 19.2.8, `motion`, `lucide-react` and the self-hosted Vazirmatn font live in `frontend/`. FastAPI 0.141.1, Starlette 1.7.0, Pydantic 2.13.5 and Uvicorn 0.53.0 live in `backend/main.py`. The backend uses an in-memory store seeded with 64 demo claims, and the data resets on restart.

**Files that matter.**
- `backend/main.py` holds the whole API in about 220 lines. `backend/test_main.py` is an assert-based check you run with `python test_main.py`.
- `frontend/app/` holds `layout.tsx`, `providers.tsx` (with the `api()` helper, `Reveal`, `CountUp` and `spotlight`), `nav.tsx`, `claims.tsx` (with `Timeline`), `i18n.ts`, `globals.css` and the pages `page.tsx`, `claim/`, `track/` and `dashboard/`.
- `frontend/next.config.ts` rewrites `/api/:path*` to `API_URL`.
- `docker-compose.yml` and the two Dockerfiles are the deploy path.

**Endpoints today.** None of them require any authentication.

```
GET   /api/health
POST  /api/claims                 create claim
GET   /api/claims?status=&q=      list ALL claims with full PII
GET   /api/claims/{code}          one claim with full PII
PATCH /api/claims/{code}          {status}: any status, no rules
POST  /api/claims/{code}/rating   {rating 1-5}, only when done
GET   /api/stats                  full insurer KPIs
POST  /api/demo                   demo request form
GET   /docs, /openapi.json        public Swagger
```

**Local environment on the user's machine.**
- Other projects run on ports 3000, 3010, 3011, 3037, 3300, 3737, 8000 and 8010. **Never kill Next.js or Uvicorn processes by name.** Check `readlink /proc/<pid>/cwd` first.
- A backend venv exists at `backend/.venv`, installed from `backend/wheels/`. Python 3.12 and Node 24 are installed. Google Chrome is at `/usr/bin/google-chrome`, but headless screenshots timed out after 90 s once.
- Two test servers from this session may still be running. The backend runs on `http://127.0.0.1:8541` and the frontend `next dev` on `http://127.0.0.1:3541`, with `API_URL=http://127.0.0.1:8541`. The backend's data now contains probe claims such as "Review Probe" and "Test User", plus a script-tag insurer. Restart the backend to reset it.
- RAM was about 94% used at the end of the session. One background job was killed for memory pressure.

To restart the test servers:

```bash
cd backend && nohup .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8541 > /tmp/igc-api.log 2>&1 &
cd frontend && API_URL=http://127.0.0.1:8541 nohup node node_modules/next/dist/bin/next dev -p 3541 > /tmp/igc-web.log 2>&1 &
```

**Next.js 16 gotchas.**
- `middleware.ts` is now called `proxy.ts`.
- `next dev` writes `frontend/AGENTS.md` and `frontend/CLAUDE.md`. Disable that with `agentRules: false` in `next.config.ts`, or commit the files. They are untracked right now.
- `next dev` also rewrote `frontend/next-env.d.ts` to point at `.next/dev/types`. That is the only modified tracked file, and it is not a real change.
- Read `frontend/node_modules/next/dist/docs/` before using any Next.js API from memory.

**Pre-existing untracked items.** `backend/wheels/` and `skills-lock.json` were already untracked when the session started. See finding I-2 about the wheels.

## 4. Findings from the red-team reviewers

Each of these was reproduced with curl against the local test instance. The adversarial second-opinion pass did not run.

| ID | Severity | Where | Finding |
| --- | --- | --- | --- |
| authz-01 | critical | `main.py:155` | `GET /api/claims` returns every claim with name, mobile, plate and policy number to anyone, including through the Next.js rewrite. The `q` parameter lets a caller search by plate or policy number. The track page's "Try a sample claim" button also depends on this endpoint, at `track/page.tsx:26`. |
| authz-02 | critical | `main.py:170` | `PATCH /api/claims/{code}` changes status without any credential. A driver can approve their own replacement claim, or an attacker can reject every open claim. |
| authz-03 | high | `main.py:111` | Status transitions are unrestricted. The reviewer verified received to done, done to received with the rating kept, rejected to done, and done to done appended twice. This corrupts the billed, avoided and repair-rate KPIs. |
| authz-04 | high | `main.py:89` | The tracking code is `IGC-` plus 6 digits from `random.choices`, a non-cryptographic generator with a space of one million and no rate limit. A single valid code returns the full PII record, although the track page never displays it. Lowercase codes are accepted. |
| authz-05 | medium | `main.py:177` | Anyone with the code can rate a claim, and ratings can be overwritten, which swings CSAT. The rating also survives a status regression. |
| authz-06 | low | `main.py:214` | `POST /api/demo` accepts unlimited anonymous submissions into an unbounded list that nothing reads. The phone field is free text and the company field accepts HTML. |
| authz-07 + resource-04 | medium | `main.py:12` | CORS is set to `allow_origins=*` with all methods and headers. The browser only ever talks to the Next.js origin, so no origin needs to be allowed. |
| resource-01 | medium | `main.py:85-86,150` | There is no rate limiting, and `CLAIMS` and `DEMOS` grow without bound. Fake claims also pollute the insurer dashboard and stats. |
| resource-02 | medium | `backend/Dockerfile:9` | Uvicorn runs with defaults: one worker, no `--limit-concurrency` and no keep-alive tuning. The sync handlers share a 40-thread pool, so a few slow clients can hold it. |
| resource-03 | medium | `main.py:151` | There is no request body limit. A 2 MB body is fully buffered before Pydantic rejects it with a 422. |
| resource-05 | medium | `main.py:42-55` | `insurer` accepts any string instead of one of the known insurers. Free-text fields accept NUL, CRLF and bidirectional override characters, which are stored and echoed back. |
| resource-06 | low | `main.py:49` | The reviewer observed that NaN, Infinity or `1e400` in `size_cm` or `photos` returns a 500 instead of a 422. Nothing was persisted. The fix is `allow_inf_nan=False` plus a generic exception handler. |
| resource-07 | low | `main.py:89` | `new_code()` retries forever as the code space fills, and loops infinitely at one million claims. |
| resource-08 | low | `main.py:11` | `/docs` and `/openapi.json` are public. |
| resource-09 | low | `main.py:11` | The API sends no security headers such as nosniff, frame-ancestors or Referrer-Policy. |

The reviewers checked these areas and found them sound:
- Mass assignment is blocked, because the server sets `code`, `status`, `total` and `decision`.
- The mobile regex rejects Persian digits and trailing newlines.
- Length limits return clean 422 errors.
- Wrong content types and malformed JSON return 422.
- Error responses do not leak stack traces.
- The pricing decision is computed server-side.
- No secrets are hard-coded.
- Very long `q` values are handled.

**One reviewer conclusion is wrong.** A reviewer marked the CSV export safe because the `name` field is not exported. But `plate` and `policy_no` are exported, and both are user-controlled. See F-1.

## 5. My own notes from reading the code

The reviewers for these areas never ran. Confirm each item before fixing it.

**Frontend**
- **F-1. CSV injection and broken CSV, `dashboard/page.tsx:119-125`.** Cells are joined with `,` and never quoted. A plate or policy number such as `=HYPERLINK(...)` becomes a spreadsheet formula, and a comma in the insurer field shifts the columns. Quote every cell, double any embedded quotes, and prefix cells that start with `= + - @` or a tab with `'`.
- **F-2. No security headers on the frontend.** I confirmed with curl on `/track` that there is no CSP, no frame-ancestors, no nosniff and no Referrer-Policy. The response also sends `X-Powered-By: Next.js`.
- **F-3. Theme and language cookies, `providers.tsx:10`.** They have no `Secure` flag. That is low risk because they hold no secrets, but add `Secure` over HTTPS.
- **F-4. Object URL leak, `claim/page.tsx:146`.** Photo previews from `URL.createObjectURL` are never revoked. Also, photos are only counted and never uploaded. Say that honestly in the UI, or upload them.
- **F-5. Unencoded code in the URL, `track/page.tsx:20`.** `router.replace` builds `/track?code=${q.trim().toUpperCase()}` without `encodeURIComponent`.
- **F-6. Silent failures in the dashboard.** `change()` at `dashboard/page.tsx:113` has no try/catch, so a failed PATCH is an unhandled rejection the user never sees. The rating call in `track/page.tsx:29` has the same problem.
- **F-7. `api()` forces `cache: "no-store"`, `providers.tsx:75`.** That defeats conditional requests, so the dashboard re-downloads the full list every 15 s. The list is 48.6 KB uncompressed today, with no gzip, ETag or Cache-Control.

**Infra**
- **I-1. Fresh-clone Docker build breaks.** `frontend/Dockerfile` does `COPY --from=build /app/public ./public`, but `frontend/public/` is empty, and git does not track empty directories. Add `frontend/public/.gitkeep` or drop the COPY.
- **I-2. Backend wheels are untracked.** The backend Dockerfile copies `wheels/`, which is untracked, so a fresh clone fails there too. Either commit the wheels or install from PyPI with hashes. That is the user's call. Today `requirements.txt` has no `--hash` pins either.
- **I-3. Backend published on all interfaces.** The backend port is mapped as `8003:8000`, which listens on every interface. Only the frontend needs the backend, so bind it to `127.0.0.1` or drop the mapping.
- **I-4. Containers are not hardened.** Both containers run as root, and there is no `read_only`, `cap_drop`, `no-new-privileges`, memory limit or restart policy. The frontend has no healthcheck.
- **I-5. Host `node_modules` leaks into the image.** `frontend/.dockerignore` excludes only `.next`, so the host's `node_modules` is copied into the build context. That hurts reproducibility and weakens the supply chain.
- **I-6. Build artifact tracked.** `frontend/tsconfig.tsbuildinfo` is tracked in git and should be removed and ignored.

**Performance**
- **P-1. Heavy animated background.** The background uses three 60vmax layers with `filter: blur(90px)` that animate forever, plus `backdrop-filter` on every card. That is expensive on low-end phones. Freeze or simplify it on small screens and under reduced motion.
- **P-2. Redundant stats work.** `stats()` and `list_claims()` re-scan and re-sort the store on every request. Memoise them on a version counter that bumps on every write, and reuse that counter as the ETag.
- **P-3. Per-frame React renders.** `CountUp` calls `setState` on every animation frame. Writing `textContent` through a ref is cheaper.

## 6. Agreed fix plan and contract

Implement the backend and the frontend against the same contract. Use only the standard library and packages already installed; add no new dependencies.

### Backend, in `backend/main.py`
1. **Insurer auth.** Add an `INSURER_TOKEN` environment variable. If it is unset, generate a random token at startup and log it once. Add a `require_insurer` dependency that checks `Authorization: Bearer <token>` with `secrets.compare_digest`. Apply it to the list endpoint, `PATCH`, and the full `/api/stats`.
2. **Public views.**
   - `GET /api/claims/{code}` returns a `PublicClaim` model without name, mobile, plate or policy number.
   - A new `GET /api/stats/public` returns only `{repair_rate, csat, avoided}` for the landing page.
   - Replace the track page's sample lookup with a fixed demo code exposed by a public endpoint, or drop the button.
3. **State machine.** Return 409 unless the current status is not done or rejected, and the new status is either `rejected` or the next step in `FLOW`. Allow one rating per claim only.
4. **Codes.** Generate codes with `secrets.choice` over an unambiguous alphabet that drops 0, O, 1 and I, with at least 8 characters, and retry a bounded number of times. Keep the `IGC-` prefix. Update `track/page.tsx`'s placeholder to match.
5. **Validation.**
   - Make `insurer` a `Literal` of the known insurers, and make `city` a `Literal` too.
   - Reject control and bidirectional characters in free text.
   - Set `allow_inf_nan=False` on floats.
   - Give `DemoIn.phone` a pattern.
   - Add a generic 500 handler.
6. **Abuse limits.**
   - Add a per-IP token bucket written with the standard library. Key it on the client IP from `X-Forwarded-For`, trusted only from the Next.js proxy.
   - Cap the store with `MAX_CLAIMS` around 5000 and `MAX_DEMOS` around 1000.
   - Add a body-size middleware that returns 413 above 64 KB, checking `Content-Length` and the streamed size.
7. **Headers and docs.**
   - Remove `CORSMiddleware`, or read the allowed origins from a `CORS_ORIGINS` variable.
   - Add security headers: nosniff, `frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, and `Cache-Control: no-store` on PII responses.
   - Serve `/docs` only when `DOCS=1`.
8. **Performance.**
   - Add Starlette's `GZipMiddleware` with `minimum_size` around 1000.
   - Add a `VERSION` counter bumped on every write. Memoise stats per version, and return an ETag with 304 on the list and stats endpoints.
   - Paginate the list with `limit` up to 200, defaulting to 100, plus `offset`. Return the total in an `X-Total-Count` header.
9. **Uvicorn.** In the Dockerfile, add `--limit-concurrency 100 --timeout-keep-alive 5 --proxy-headers --forwarded-allow-ips <frontend>`.

### Frontend
1. **API proxy.** Replace the rewrite with `app/api/[...path]/route.ts`, which forwards to `API_URL`, sets `X-Forwarded-For`, and strips hop-by-hop headers. Privileged calls need a valid session cookie, otherwise they get a 401. Those calls are the list, any `PATCH`, and the full stats. With a valid cookie, the handler adds the bearer token from `INSURER_TOKEN`. For mutating methods, require a same-origin `Sec-Fetch-Site` or a matching `Origin`.
2. **Login.**
   - `app/api/login/route.ts`: `POST {password}` compares the password to `DASHBOARD_PASSWORD` with `crypto.timingSafeEqual`.
   - On success it sets an HMAC-signed session cookie that is `httpOnly`, `Secure` and `SameSite=Strict` and lasts 12 hours. `DELETE` logs the user out.
   - Limit login attempts to 10 per minute per IP.
3. **`next.config.ts`.**
   - Set `poweredByHeader: false` and `agentRules: false`.
   - Add a `headers()` block with this CSP: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
   - Also send nosniff, `Referrer-Policy: strict-origin-when-cross-origin` and a minimal `Permissions-Policy`. `next dev` needs `'unsafe-eval'`, so add it only when not in production.
4. **`api()` helper.** Drop `no-store` so the browser can send `If-None-Match`. Throw an error that carries the status code, and show a login card on 401.
5. **Dashboard.**
   - Add the login card and a logout button.
   - Add a confirm step, or an undo toast, for Reject.
   - Show an error notice when a status change fails.
   - Move focus into the Sheet, trap it there, and restore it on close.
   - Fix the CSV export as described in F-1.
   - Use the paginated list.
6. **Claim and track pages.** Revoke object URLs, encode the code in the URL, and show loading and error states for rating.
7. **Infra.**
   - In compose, bind the backend to `127.0.0.1` or keep it internal. Pass `INSURER_TOKEN` and `DASHBOARD_PASSWORD` with the `${VAR:?}` syntax so a missing value fails fast, and ship a `.env.example`.
   - Run both containers as non-root with `read_only`, `cap_drop: [ALL]`, `no-new-privileges`, memory limits, a frontend healthcheck and `restart: unless-stopped`.
   - Add `node_modules` to `frontend/.dockerignore`.
   - Fix I-1 and I-2.
   - Untrack `tsconfig.tsbuildinfo` and add `.env` and `backend/.venv` to `.gitignore`.
8. **Docs.** Update `README.md` with the new environment variables, how to log in, and what is public and what needs a password.

## 7. How to verify once the fixes land

1. Extend `backend/test_main.py` with plain asserts, using `fastapi.testclient` only if `httpx` is available offline. Cover these cases:
   - Each transition the state machine must reject.
   - The public view being redacted.
   - A 401 without a token.
   - A 413 on a large body.
   - A 422 on NaN, a bad insurer and control characters.
   - A 304 on a matching ETag.
   - The rate limiter tripping.
   - The code format.
2. Re-run each finding in sections 4 and 5 with the same curl probe and confirm the new status code. Do this through the Next.js proxy on port 3541 as well as directly against the backend.
3. Run `cd frontend && npx tsc --noEmit` and `npm run build`. Then check the headers with `curl -D -` on `/`, `/dashboard` and `/api/health`.
4. Run `docker compose build` from a clean clone to prove that I-1 and I-2 are fixed.
5. Re-measure the list payload with `Accept-Encoding: gzip` and a second request carrying `If-None-Match`. The baseline is 48.6 KB uncompressed with no 304.

## 8. Apple-design pass

This comes after the security work. It is condensed from the `apple-design` skill and Apple's WWDC talks, especially "Designing Fluid Interfaces" from 2018. The skill itself lives at `~/.claude/skills/apple-design/SKILL.md`.

**Rules to apply.**
- **Response.** Give feedback on pointer-down, never only on release, and never add artificial delays.
- **Springs.** The default is critically damped: `{type: "spring", bounce: 0, duration: 0.3-0.4}`. Use `bounce` around 0.2 only after a gesture that carried momentum, such as a flick.
- **Momentum projection.** Project the resting point as `current + (v/1000)*0.998/(1-0.998)` and snap to the target nearest that point.
- **Interruptibility.** Animate from the current on-screen value, never lock input during a transition, and enter and exit along the same path.
- **Materials.** Never stack a light translucent surface on another light translucent one. Larger surfaces should get stronger blur and deeper shadow. Use a scrim only for modal tasks, and boost text contrast on glass.
- **Accessibility settings.** Under `prefers-reduced-motion`, use cross-fades instead of slides. Under `prefers-reduced-transparency`, use solid surfaces with no blur. Under `prefers-contrast: more`, use solid surfaces with defined borders. Avoid full-viewport moving backgrounds.
- **Typography.** Large text gets negative tracking, body text about 0, and small text slightly positive. Persian text needs taller leading.
- **Feedback.** Give status, completion, warning and error feedback, and validate inline. Destructive actions that cannot be undone get either a confirmation or an undo.

**Concrete issues I saw, all unverified by an audit.**
1. The dashboard Sheet opens with `bounce: 0.15` at `dashboard/page.tsx:56`, but opening is not a momentum gesture, so use `bounce: 0`. Dismissal uses `offset + velocity*0.2 > 140` instead of Apple's projection.
2. Motion components ignore the CSS reduced-motion rule. Wrap the app in `<MotionConfig reducedMotion="user">` in `providers.tsx`.
3. The animated background is a full-viewport moving layer. It also hurts performance, as noted in P-1.
4. There are no `prefers-reduced-transparency` or `prefers-contrast` rules in `globals.css`.
5. `.btn-ghost` and `.opt` are translucent and blurred, and they sit on `.glass` cards, which stacks two translucent layers.
6. Table rows and mobile cards give no feedback on press. Rows respond to Enter but not Space.
7. The SVG car parts in `claim/page.tsx` may not show a visible focus ring. Add a stroke style for `:focus-visible`.
8. Some `aria-label` values are hard-coded in English: "Language" and "Tabs" in `nav.tsx`, and "Refresh" in `dashboard/page.tsx`. Move them into `i18n.ts`.
9. Several actions fail silently: dashboard status changes, rating, and the Track search, which has no spinner. Reject has neither a confirmation nor an undo.
10. Design the dashboard login card in the same style:
    - One password field and an inline error.
    - Press feedback on the button.
    - It reads "پیش‌خوان بیمه‌گر" in Persian and "Insurer panel" in English.
    - Persian error text says "رمز عبور نادرست است", not "اشتباه".

**Persian copy.** `i18n.ts` already follows most of the vocabulary:
- "پیش‌خوان" for the panel, "اینجا را خالی نگذارید" for empty fields, "نادرست" for invalid input, "دریافت" for download, and "کد رهگیری".

Keep that standard for every new string. Use نیم‌فاصله where it belongs, avoid any wording that blames the user, and write "رمز عبور" rather than "پسورد".

## 9. Suggested order of work

1. Backend fixes from section 6, steps 1 through 9, with tests. They are self-contained and fix both critical findings.
2. Frontend proxy, login, headers and `api()` changes, then the dashboard, claim and track fixes.
3. Infra and repo hygiene.
4. Re-run the pen test from section 7 and record the before and after status codes.
5. The Apple-design pass from section 8, then a visual check on a phone-width viewport in both Persian and English, light and dark.
6. Update the README.

**Decisions for the user.**
- Commit `backend/wheels/` or install from PyPI. That is I-2.
- Commit `frontend/AGENTS.md` and `frontend/CLAUDE.md`, or disable them with `agentRules: false`. Disabling is recommended.
- Decide whether Reject gets a confirmation dialog or an undo toast.

## Appendix: session artifacts

These paths are only useful if you continue in Claude Code on this machine.

- Raw reviewer output with all 16 findings in JSON: `/tmp/claude-1000/-home-makhataei-Projects-Mine-Iran-Glass-Claim/ebbb73cf-8068-43c6-9ba2-1dcd32b8970a/tasks/w0v3h7s7z.output`
- The plan notes these sections are based on: the `PLAN.md` file in the same scratchpad folder.
- Workflow scripts, which can be resumed with Claude's Workflow tool: `~/.claude/projects/-home-makhataei-Projects-Mine-Iran-Glass-Claim/ebbb73cf-8068-43c6-9ba2-1dcd32b8970a/workflows/scripts/`
