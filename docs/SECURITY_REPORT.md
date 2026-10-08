# Security, performance and design report

Branch `security-hardening`, 2026-10-08. This covers the red-team audit and pen test of the MVP, the blue-team fixes, the performance gains that ship with them, and the Apple HIG pass. `HANDOFF.md` has the raw finding list and the fix contract the work followed.

## 1. Verdict

The MVP had no access control at all. Anyone could download every insured driver's name, mobile, plate and policy number. Anyone could also approve or reject any claim, which corrupted the insurer's billing and savings figures.

On this branch every one of the 16 reproduced findings is fixed. The pen-test script fails 22 of 26 probes against `main` (the other four are functional checks that pass on both, plus one artefact), and its after run passes all 26 once one probe false positive is fixed. Some residual risks remain, listed in section 7. The largest is that per-IP limits are only as good as the reverse proxy in front of the app.

## 2. Scope and method

| Lens | Skill or tool | What it covered |
| --- | --- | --- |
| Red team | `red-team-tactics`, `red-team-tools`, `attack-tree-construction` | Recon of the public surface, live probes with curl, an attack tree, mapped to MITRE ATT&CK |
| Blue team | `security-auditor`, `security-audit` | Fixes for every finding, defence in depth, a re-test |
| SAST | `security-scanning-security-sast` | bandit, semgrep (security-audit, owasp-top-ten and secrets rule packs), pip-audit, npm audit |
| Pen test | `scripts/pentest.sh` | 26 probes, run against `main` and against this branch |
| Review | A six-lens workflow: red team, backend, frontend, Apple design with a11y and Persian copy, performance, infra | Every finding was checked by an independent skeptic before it was fixed |
| Simplicity | `ponytail`, `ponytail-review` | Smallest diff, standard library first, no new dependencies |
| Design | `apple-design` | Springs, momentum, interruptibility, materials, accessibility settings |
| Knowledge graph | `graphify` | `graphify-out/` maps the code to the findings and fixes |

All testing ran against local instances on loopback.

## 3. Attack tree

The root goal is to steal drivers' personal data or manipulate claim payouts. Each branch is an OR. A ✗ marks a branch that this branch now blocks, and a ⚠ marks a partial or residual risk. In the leaf notes, "before" is how hard the attack was on `main` and "now" is what stops it.

```
Steal PII or manipulate payouts
├── 1. Read PII in bulk
│   ├── ✗ 1.1 GET /api/claims with no credentials ........ before: trivial, no skill, invisible
│   │        now: bearer token, added only by the proxy for a valid session cookie
│   ├── ✗ 1.2 Guess tracking codes, then GET /api/claims/{code} ... before: 10^6 codes, no limit
│   │        now: CSPRNG codes from a space of ~10^12, a redacted view, 5 req/s per IP
│   ├── ✗ 1.3 Steal the session cookie with XSS ........ now: httpOnly, CSP, React escaping, input rules
│   ├── ✗ 1.4 Ride the session with CSRF ................. now: SameSite=Strict plus a Sec-Fetch-Site/Origin check
│   ├── ⚠ 1.5 Brute-force the panel password .............. now: 10/min per IP and 30 failures/min globally
│   │        (XFF spoofing beats the per-IP cap; the global cap still holds)
│   └── ✗ 1.6 Read PII from a shared cache by ETag ........ now: Cache-Control private or no-store
├── 2. Manipulate claims or KPIs
│   ├── ✗ 2.1 PATCH a status with no credentials ......... before: trivial (self-approve, mass-reject)
│   ├── ✗ 2.2 Skip steps or revive a rejected claim ....... now: one step at a time; done and rejected are final
│   ├── ✗ 2.3 Swing CSAT by re-rating ...................... now: one rating, only once the claim is done
│   └── ⚠ 2.4 Flood fake claims into the stats ........... now: 10 burst, then 1 per 5 s per IP; store cap 5000
├── 3. Attack the insurer's staff
│   ├── ✗ 3.1 CSV formula injection through plate or policy ... now: every cell quoted, = + - @ prefixed with '
│   ├── ✗ 3.2 Stored XSS through the name or insurer ....... now: insurer and city are Literals, React escapes, CSP
│   └── ✗ 3.3 Bidi or control characters to spoof names ... now: rejected with a 422
├── 4. Deny service
│   ├── ✗ 4.1 Huge bodies ................................... now: 413 above 64 KB, at the proxy and the backend
│   ├── ✗ 4.2 Crash with NaN or 1e400 ...................... before: 500; now: 422
│   ├── ⚠ 4.3 Hold connections open ........................ now: --limit-concurrency 100, keep-alive 5 s
│   ├── ⚠ 4.4 Fill the in-memory store .................... now: 503 at the cap (needs a real DB to retire)
│   └── ⚠ 4.5 Lock out logins with the global cap ......... an accepted trade-off; existing sessions keep working
└── 5. Attack the infrastructure
    ├── ✗ 5.1 Reach the backend directly .................. now: bound to 127.0.0.1 on the host
    ├── ✗ 5.2 Escape a container ........................... now: non-root, cap_drop ALL, read_only, no-new-privileges
    └── ✗ 5.3 Find secrets in the image .................... now: env at runtime, .env* in .dockerignore, fail fast
```

**MITRE ATT&CK mapping for the original state**

| Technique | Where it applied |
| --- | --- |
| T1595 Active Scanning | Public `/docs` and `/openapi.json` listed every endpoint |
| T1190 Exploit Public-Facing Application | Unauthenticated list and PATCH |
| T1110 Brute Force | Six-digit tracking codes with no rate limit |
| T1213 Data from Information Repositories | Bulk PII download and search by plate or policy |
| T1565.001 Stored Data Manipulation | Arbitrary status changes and re-rating |
| T1499 Endpoint Denial of Service | Unbounded store, unbounded bodies, crashes from NaN |

## 4. Pen test, before and after

`scripts/pentest.sh` was run against the backend directly. The before run used the code on `main`, and the after run used this branch.

| ID | Probe | Expected | `main` | This branch |
| --- | --- | --- | --- | --- |
| authz-01 | list claims (PII) without login | 401 | 200 ✗ | 401 ✓ |
| authz-01 | search by plate/policy without login | 401 | 200 ✗ | 401 ✓ |
| authz-01 | full insurer stats without login | 401 | 200 ✗ | 401 ✓ |
| authz-02 | PATCH status without login | 401 | 200 ✗ | 401 ✓ |
| authz-04 | code format: CSPRNG, 8 unambiguous symbols | 1 | 0 ✗ | 1 ✓ |
| authz-04 | public claim view leaks no name/mobile/plate | 0 | 1 ✗ | 0 ✓ |
| authz-05 | re-rate an already rated claim | 409 | 409 ✓ | 409 ✓ |
| authz-01 | list claims with insurer login | 200 | 200 ✓ | 200 ✓ |
| authz-03 | skip steps: received -> done | 409 | 200 ✗ | 409 ✓ |
| authz-03 | one step: received -> approved | 200 | 200 ✓ | 200 ✓ |
| authz-03 | reopen: approved -> received | 409 | 200 ✗ | 409 ✓ |
| authz-03 | reject, then revive: rejected -> scheduled | 409 | 200 ✗ | 409 ✓ |
| perf | unchanged list with If-None-Match | 304 | 200 ✗ | 304 ✓ |
| cache | PII list is never stored (Cache-Control) | 1 | not probed | 1 ✓ |
| perf | list gzip: 44479 B -> 4811 B | 1 | 0 ✗ | 1 ✓ |
| res-03 | 70 KB request body | 413 | 422 ✗ | 413 ✓ |
| res-05 | unknown insurer with HTML | 422 | 201 ✗ | 422 ✓ |
| res-05 | bidi override in name | 422 | 201 ✗ | 422 ✓ |
| res-05 | NUL byte in plate | 422 | 201 ✗ | 422 ✓ |
| res-06 | NaN size (used to 500) | 422 | 500 ✗ | 422 ✓ |
| res-06 | 1e400 photos (used to 500) | 422 | 500 ✗ | 422 ✓ |
| res-08 | Swagger UI | 404 | 200 ✗ | 404 ✓ |
| res-08 | OpenAPI schema | 404 | 200 ✗ | 404 ✓ |
| authz-07 | CORS preflight from evil origin allowed | 0 | 1 ✗ | 0 ✓ |
| res-09 | nosniff header on API | 1 | 0 ✗ | 1 ✓ |
| traversal | dot-dot segments past /api | 40[04] | 404 ✓ | 404 ✓ |
| res-01 | 12 rapid anonymous writes hit the limiter | 1 | 0 ✗ | 1 ✓ |
| res-01 | 70 writes from rotating spoofed IPs hit a cap | 1 | not probed | 1 ✓ |

On `main`, 22 probes fail. The `authz-05` pass on `main` is an artefact: the unauthenticated PATCH just before it had already rejected the sample claim, so the rating was refused for a different reason. The two "not probed" rows were added after the review. The gzip row reports sizes on `main` as uncompressed 44.6 KB with no `Content-Encoding`.

## 5. Static analysis and dependencies

| Tool | Scope | Result | Action |
| --- | --- | --- | --- |
| bandit 1.9 | `backend/` | 2 high (B613 Trojan Source), 1 low B311, 1 low B105, the rest B101 asserts in the test file | **Fixed** B613: literal bidi characters in `main.py` and `test_main.py` became `\u` escapes. B311 is deterministic demo seed data (`# nosec` with the reason). B105 and B101 are a test fixture and test asserts. |
| semgrep (`p/security-audit`, `p/owasp-top-ten`, `p/secrets`, 352 rules) | backend, frontend, scripts, compose | 1: the generated `INSURER_TOKEN` was logged | **Fixed**: the token is never logged, and weak or placeholder secrets now fail closed |
| npm audit | `frontend/` | First: no lockfile (reproducibility risk). With a lockfile: 3 high. `next` 16.3.6 had 6 advisories, including image-optimizer SSRF and SSG/ISR cache poisoning; `sharp` <0.35.5 (librsvg CVE); `source-map-js` (DoS) | **Fixed**: `package-lock.json` added, `next` upgraded to 16.4.0 (pinned exactly), `npm audit fix`. Now 0 vulnerabilities |
| pip-audit | `backend/requirements.txt` | No known vulnerabilities | — |

## 6. Fixes and the performance each one carries

| Finding | Fix | Performance gained with it |
| --- | --- | --- |
| authz-01 PII list was public | Insurer bearer auth; the proxy adds the token only for a session | The list is paginated (≤200) and the sort is memoised per write |
| authz-02 Anyone could PATCH | Same auth | — |
| authz-03 Free status changes | `allowed()` state machine, 409 otherwise | — |
| authz-04 Guessable codes, full PII | `secrets.choice`, 8 of 32 symbols, a redacted `PublicClaim` | — |
| authz-05 Ratings could be re-rated | One rating, only when done | — |
| authz-06 / resource-01 Unbounded demo list and store | Per-IP token buckets, caps of 5000 claims and 1000 demos, a phone pattern | The limiter is O(1) per request with a bounded map |
| authz-07 Wildcard CORS | Removed; the browser only ever calls its own origin | One less middleware on every request |
| resource-02 Uvicorn defaults | `--limit-concurrency 100 --timeout-keep-alive 5 --proxy-headers` | Slow clients can't pin the thread pool |
| resource-03 No body limit | ASGI `BodyLimit` checks Content-Length and the stream | Big bodies are refused before they're buffered |
| resource-05 Free-text insurer, control chars | `Insurer`/`city` Literals, `clean()` | — |
| resource-06 NaN gave a 500 | `allow_inf_nan=False`; 422s drop the echoed input | No traceback work per bad request |
| resource-07 `new_code()` could loop forever | Bounded retries, then a 503 | — |
| resource-08 Public Swagger | Only with `DOCS=1` | — |
| resource-09 No API headers | nosniff, CSP `default-src 'none'`, no-referrer, no-store | — |
| F-1 CSV injection | Quoted cells, formula prefix, CRLF, revoked object URL | — |
| F-2 No page headers | CSP, HSTS, Permissions-Policy, COOP, no `X-Powered-By` | — |
| F-3 Cookies not Secure | `secure` over HTTPS | — |
| F-4 Object URL leak | Revoked on reset and unmount; the UI says photos stay on the device | Image memory is freed |
| F-5 Unencoded code in the URL | `encodeURIComponent` | — |
| F-6 Silent failures | Error notices on status change, rating and track | — |
| F-7 `no-store` defeated caching | `api()` uses the default cache mode; the server sends ETags | Polling an unchanged list returns 304s; gzip takes it from 44 KB to 4.8 KB |
| P-1 Animated blur background | Static gradients, no `filter: blur` | No permanent full-screen repaint |
| P-2 Stats recomputed per request | `lru_cache` keyed on the write counter and the minute | O(1) for repeat reads |
| P-3 Per-frame React renders | `CountUp` writes `textContent` | Zero React renders while it animates |
| I-1 to I-6 Infra | `public/.gitkeep`, committed wheels, loopback bind, hardened compose, `.env*` ignored, tsbuildinfo untracked | — |

## 7. Residual risks and what retires them

1. **The client IP depends on a reverse proxy.** Next.js keeps a client-sent `X-Forwarded-For`, so without nginx in front the per-IP buckets can be dodged. The login stays protected by the global failure cap. To retire this, put nginx in front of the frontend and set `TRUST_PROXY=1`.
2. **The store is in memory.** A determined flood can still fill the store to its cap, after which new claims get a 503 until a restart. To retire this, move to Postgres with per-insurer quotas.
3. **One shared panel password.** There is no per-user identity or audit trail of who changed which claim. To retire this, give each insurer staff member an account and log every status change.
4. **CSP allows `'unsafe-inline'` scripts.** Next.js hydration needs this without nonces. To retire this, use nonce-based CSP with dynamic rendering.
5. **Photos are never uploaded.** The UI now says so. A real upload path will need size and type checks, plus EXIF stripping.

## 8. Apple HIG pass

| Principle | Before | Now |
| --- | --- | --- |
| Springs are critically damped unless momentum drives them | The Sheet opened with `bounce: 0.15` | `bounce: 0`, `duration: 0.4` |
| Momentum projection | `offset + v*0.2 > 140` | Apple's `(v/1000)·0.998/(1−0.998)`, dismissing past half the sheet |
| Confirm only what can't be undone | Reject had no safeguard | An inline confirmation, since rejection is now final |
| Avoid full-viewport motion | Three drifting 60vmax blurred layers | Static |
| Honour the accessibility settings | Only reduced motion, and motion components ignored it | `MotionConfig reducedMotion="user"`, plus reduced transparency and increased contrast |
| Never stack light glass on light glass | Ghost buttons were blurred on glass cards | Solid inside `.glass` |
| Feedback on press | Rows had no press state, and Space didn't open them | `:active` states, and Enter and Space both open a row |
| Focus | The Sheet didn't move or trap focus | Focus moves in, Tab is trapped, and focus returns on close |
| Status feedback | Track search had no spinner, and failures were silent | A spinner, `aria-busy`, and `role="alert"` notices |

All new Persian strings follow the Persian UX vocabulary: «رمز عبور نادرست است» rather than «اشتباه», «انصراف», «پیش‌خوان», and نیم‌فاصله throughout.

## 9. Review findings and their fixes

<!-- REVIEW -->

## 10. How to re-run

```bash
cd backend && python test_main.py                                   # logic checks
TOKEN=$INSURER_TOKEN scripts/pentest.sh http://127.0.0.1:8003       # backend
PASSWORD=$DASHBOARD_PASSWORD scripts/pentest.sh http://127.0.0.1:3003  # through the proxy
cd frontend && npx tsc --noEmit
```
