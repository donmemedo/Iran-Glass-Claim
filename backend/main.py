"""Iran Glass Claim API — repair-first glass claims for insurers (B2B2C)."""
import logging
import os
import random
import secrets
import time
import unicodedata
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Annotated, Literal, get_args

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import AfterValidator, BaseModel, Field
from starlette.middleware.gzip import GZipMiddleware

log = logging.getLogger("uvicorn.error")
DOCS = os.getenv("DOCS") == "1"
app = FastAPI(title="Iran Glass Claim API", version="1.1.0", redoc_url=None,
              docs_url="/docs" if DOCS else None, openapi_url="/openapi.json" if DOCS else None)

# Insurer-only endpoints need `Authorization: Bearer <INSURER_TOKEN>`. The Next.js proxy adds it after login.
TOKEN = os.getenv("INSURER_TOKEN") or secrets.token_urlsafe(32)
if not os.getenv("INSURER_TOKEN"):
    log.warning("INSURER_TOKEN is not set; generated one for this run: %s", TOKEN)

Glass = Literal["windshield", "side", "rear", "sunroof"]
Status = Literal["received", "approved", "scheduled", "in_service", "done", "rejected"]
Insurer = Literal["Iran Insurance", "Asia Insurance", "Dana Insurance", "Parsian Insurance", "Saman Insurance"]
FLOW: list[Status] = ["received", "approved", "scheduled", "in_service", "done"]
INSURERS = list(get_args(Insurer))

# Prices in million Toman, from the business plan (repair 1.3–2.8, replace 5–28, handling 0.25–0.6).
REPLACE_PRICE = {"windshield": 14.0, "side": 5.5, "rear": 8.5, "sunroof": 22.0}
REPAIR_PRICE = 1.9
HANDLING_FEE = 0.4
MOBILE_FEE = 1.5
ADAS_CALIBRATION = 3.5


def decide(glass: Glass, size_cm: float, in_driver_view: bool, at_edge: bool) -> str:
    """Repair-first rule: chips under 2.5 cm, away from the edge and the driver's view, are repaired."""
    if glass in ("windshield", "rear") and size_cm <= 2.5 and not in_driver_view and not at_edge:
        return "repair"
    return "replace"


def estimate(decision: str, glass: Glass, mobile: bool, adas: bool) -> dict:
    labour = REPAIR_PRICE if decision == "repair" else REPLACE_PRICE[glass] + (ADAS_CALIBRATION if adas else 0)
    total = labour + HANDLING_FEE + (MOBILE_FEE if mobile else 0)
    # "Avoided" = what the insurer would have paid had it been replaced.
    avoided = REPLACE_PRICE[glass] - REPAIR_PRICE if decision == "repair" else 0
    return {"total": round(total, 2), "avoided": round(avoided, 2)}


# Control chars and bidi overrides spoof text in the dashboard/CSV. ZWNJ (U+200C) stays: Persian needs it.
BIDI = set("‪‫‬‭‮⁦⁧⁨⁩")


def clean(s: str) -> str:
    if any(unicodedata.category(ch) == "Cc" or ch in BIDI for ch in s):
        raise ValueError("control characters are not allowed")
    return s


Text = Annotated[str, AfterValidator(clean)]


class Damage(BaseModel):
    """The non-personal part of a claim; safe to show to anyone holding the tracking code."""
    insurer: Insurer
    glass: Glass
    size_cm: float = Field(ge=0, le=200, allow_inf_nan=False)
    in_driver_view: bool = False
    at_edge: bool = False
    adas: bool = False
    service: Literal["center", "mobile"] = "center"
    city: Literal["Tehran", "Karaj", "Isfahan", "Mashhad", "Shiraz", "Tabriz"] = "Tehran"
    photos: int = Field(default=0, ge=0, le=10)


class ClaimIn(Damage):
    name: Text = Field(min_length=2, max_length=80)
    mobile: str = Field(pattern=r"^(\+98|0)?9\d{9}$")
    policy_no: Text = Field(min_length=4, max_length=30)
    plate: Text = Field(min_length=4, max_length=20)


class Tracking(BaseModel):
    code: str
    decision: Literal["repair", "replace"]
    total: float
    avoided: float
    status: Status
    created_at: datetime
    history: list[dict]
    rating: int | None = None


class PublicClaim(Tracking, Damage):
    pass


class Claim(Tracking, ClaimIn):
    pass


class StatusIn(BaseModel):
    status: Status


class RatingIn(BaseModel):
    rating: int = Field(ge=1, le=5)


class DemoIn(BaseModel):
    company: Text = Field(min_length=2, max_length=80)
    contact: Text = Field(min_length=2, max_length=80)
    phone: str = Field(pattern=r"^\+?[0-9 ()-]{8,20}$")
    monthly_claims: int = Field(ge=0, le=1_000_000)


# ponytail: in-memory store, resets on restart; swap for Postgres when real insurers onboard.
CLAIMS: dict[str, Claim] = {}
DEMOS: list[DemoIn] = []
MAX_CLAIMS, MAX_DEMOS = 5000, 1000
VERSION = 0  # bumped on every write; keys the caches and ETags below


def touch() -> None:
    global VERSION
    VERSION += 1


# 32 symbols without 0/O/1/I, 8 long: 32^8 ≈ 10^12 codes, drawn from a CSPRNG.
ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def new_code() -> str:
    for _ in range(10):
        if (code := "IGC-" + "".join(secrets.choice(ALPHABET) for _ in range(8))) not in CLAIMS:
            return code
    raise HTTPException(503, "Please try again")


def create(data: ClaimIn, at: datetime | None = None) -> Claim:
    if len(CLAIMS) >= MAX_CLAIMS:
        raise HTTPException(503, "Claim store is full")
    at = at or datetime.now(timezone.utc)
    decision = decide(data.glass, data.size_cm, data.in_driver_view, data.at_edge)
    claim = Claim(
        **data.model_dump(),
        code=new_code(),
        decision=decision,
        status="received",
        created_at=at,
        history=[{"status": "received", "at": at.isoformat()}],
        **estimate(decision, data.glass, data.service == "mobile", data.adas),
    )
    CLAIMS[claim.code] = claim
    touch()
    return claim


def allowed(current: Status, new: Status) -> bool:
    """Open claims move one step along FLOW or get rejected; done and rejected are final."""
    if current in ("done", "rejected"):
        return False
    return new == "rejected" or FLOW.index(new) == FLOW.index(current) + 1


def advance(claim: Claim, status: Status, at: datetime | None = None) -> None:
    claim.status = status
    claim.history.append({"status": status, "at": (at or datetime.now(timezone.utc)).isoformat()})
    touch()


def seed(n: int = 64) -> None:
    rnd = random.Random(1405)
    names = ["Sara Ahmadi", "Reza Karimi", "Maryam Hosseini", "Ali Rezaei", "Neda Moradi", "Hamid Jafari", "Leila Sadeghi", "Omid Rahimi"]
    cities = ["Tehran", "Karaj", "Isfahan", "Mashhad", "Shiraz", "Tabriz"]
    now = datetime.now(timezone.utc)
    for i in range(n):
        glass = rnd.choices(["windshield", "side", "rear", "sunroof"], [78, 8, 12, 2])[0]
        at = now - timedelta(days=rnd.randint(0, 29), hours=rnd.randint(0, 23))
        c = create(ClaimIn(
            name=rnd.choice(names), mobile=f"0912{rnd.randint(1000000, 9999999)}",
            policy_no=f"BD-{rnd.randint(100000, 999999)}", insurer=rnd.choice(INSURERS),
            plate=f"{rnd.randint(10, 99)} B {rnd.randint(100, 999)} - {rnd.randint(10, 99)}",
            glass=glass, size_cm=round(rnd.uniform(0.5, 2.5) if rnd.random() < 0.75 else rnd.uniform(3, 40), 1),
            in_driver_view=rnd.random() < 0.08, at_edge=rnd.random() < 0.06, adas=rnd.random() < 0.2,
            service=rnd.choice(["center", "mobile"]), city=rnd.choice(cities), photos=rnd.randint(2, 6),
        ), at)
        if i % 23 == 5:
            advance(c, "rejected", at + timedelta(hours=1))
            continue
        steps = FLOW[1:] if i > 8 else FLOW[1:rnd.randint(1, 4)]
        for k, s in enumerate(steps, 1):
            advance(c, s, at + timedelta(hours=2 * k))
        if c.status == "done":
            c.rating = rnd.choices([5, 4, 3, 2], [70, 20, 7, 3])[0]


seed()
DEMO_CODE = next(c.code for c in CLAIMS.values() if c.status == "done")  # for the track page's "sample" button

# ---- abuse limits ---------------------------------------------------------------------------
# Per-IP token buckets: (tokens per second, burst). The client IP comes from uvicorn, which only
# honours X-Forwarded-For from --forwarded-allow-ips (the Next.js proxy).
BUCKETS: dict[tuple[str, bool], tuple[float, float]] = {}
LIMITS = {True: (0.2, 10), False: (5.0, 60)}  # keyed by "is a write"


def allow(ip: str, write: bool) -> bool:
    rate, burst = LIMITS[write]
    now = time.monotonic()
    tokens, ts = BUCKETS.get((ip, write), (burst, now))
    tokens = min(burst, tokens + (now - ts) * rate)
    if len(BUCKETS) > 10_000:  # ponytail: crude memory bound; an LRU per IP if this ever trips in practice
        BUCKETS.clear()
    BUCKETS[(ip, write)] = (tokens - 1 if tokens >= 1 else tokens, now)
    return tokens >= 1


def is_insurer(authorization: str) -> bool:
    return secrets.compare_digest(authorization.encode(), f"Bearer {TOKEN}".encode())


def require_insurer(authorization: str = Header("")) -> None:
    if not is_insurer(authorization):
        raise HTTPException(401, "Insurer login required", headers={"WWW-Authenticate": "Bearer"})


INSURER_ONLY = [Depends(require_insurer)]
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
}


class BodyLimit:
    """413 for bodies over `limit`, checked on Content-Length and again while streaming."""

    def __init__(self, app, limit: int = 64 * 1024):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        length = dict(scope["headers"]).get(b"content-length", b"0")
        if not length.isdigit() or int(length) > self.limit:
            return await JSONResponse({"detail": "Payload too large"}, 413)(scope, receive, send)
        seen = 0

        async def limited():
            nonlocal seen
            message = await receive()
            seen += len(message.get("body", b""))
            if seen > self.limit:
                raise HTTPException(413, "Payload too large")
            return message

        await self.app(scope, limited, send)


app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(BodyLimit)


@app.middleware("http")
async def guard(request: Request, call_next):
    ip = request.client.host if request.client else "?"
    write = request.method not in ("GET", "HEAD", "OPTIONS")
    if request.url.path != "/api/health" and not is_insurer(request.headers.get("authorization", "")) and not allow(ip, write):
        return JSONResponse({"detail": "Too many requests"}, 429, headers={"Retry-After": "5", **SECURITY_HEADERS})
    response = await call_next(request)
    if request.url.path.startswith("/api"):
        response.headers.update(SECURITY_HEADERS)
        response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.exception_handler(RequestValidationError)
async def invalid(_: Request, exc: RequestValidationError):
    # Drop the echoed input: it can hold NaN/Infinity (unserialisable, used to cause a 500) or PII.
    return JSONResponse({"detail": [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]}, 422)


@app.exception_handler(Exception)
async def crash(_: Request, exc: Exception):
    log.exception("Unhandled error", exc_info=exc)
    return JSONResponse({"detail": "Internal error"}, 500)


def etag_hit(request: Request, response: Response, tag: str) -> Response | None:
    """Sets a weak ETag; returns a ready 304 when the client already has this version."""
    headers = {"ETag": f'W/"{tag}"', "Cache-Control": "private, no-cache"}
    if request.headers.get("if-none-match") == headers["ETag"]:
        return Response(status_code=304, headers=headers)
    response.headers.update(headers)
    return None


@lru_cache(1)
def newest_first(version: int) -> list[Claim]:
    return sorted(CLAIMS.values(), key=lambda c: c.created_at, reverse=True)


@lru_cache(1)
def compute_stats(version: int, minute: int) -> dict:
    items = list(CLAIMS.values())
    active = [c for c in items if c.status != "rejected"]
    repairs = [c for c in active if c.decision == "repair"]
    rated = [c.rating for c in items if c.rating]
    now = datetime.now(timezone.utc)
    daily = [0] * 14
    for c in items:
        d = (now - c.created_at).days
        if d < 14:
            daily[13 - d] += 1
    return {
        "total": len(items),
        "open": sum(c.status not in ("done", "rejected") for c in items),
        "repair_rate": round(100 * len(repairs) / max(len(active), 1), 1),
        "avg_cost": round(sum(c.total for c in active) / max(len(active), 1), 2),
        "avoided": round(sum(c.avoided for c in active), 1),
        "billed": round(sum(c.total for c in active), 1),
        "csat": round(100 * sum(r >= 4 for r in rated) / max(len(rated), 1), 1),
        "sla": 96.4,  # ponytail: static until call-center timestamps are wired in
        "daily": daily,
        "by_glass": {g: sum(c.glass == g for c in items) for g in REPLACE_PRICE},
        "by_status": {s: sum(c.status == s for c in items) for s in [*FLOW, "rejected"]},
        "insurers": INSURERS,
    }


def find(code: str) -> Claim:
    if (claim := CLAIMS.get(code.strip().upper())) is None:
        raise HTTPException(404, "Claim not found")
    return claim


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/claims", response_model=Claim, status_code=201)
def post_claim(data: ClaimIn):
    return create(data)  # the filer sees back only what they typed in, plus the decision


@app.get("/api/claims", response_model=list[Claim], dependencies=INSURER_ONLY)
def list_claims(request: Request, response: Response, status: Status | None = None,
                q: str = Query("", max_length=60), limit: int = Query(100, ge=1, le=200), offset: int = Query(0, ge=0)):
    if (hit := etag_hit(request, response, str(VERSION))) is not None:
        return hit
    q = q.strip().lower()
    items = [c for c in newest_first(VERSION) if (not status or c.status == status)
             and (not q or q in f"{c.code} {c.name} {c.plate} {c.policy_no} {c.insurer}".lower())]
    response.headers["X-Total-Count"] = str(len(items))
    return items[offset:offset + limit]


@app.get("/api/claims/{code}", response_model=PublicClaim)
def get_claim(code: str):
    return find(code)


@app.patch("/api/claims/{code}", response_model=Claim, dependencies=INSURER_ONLY)
def patch_claim(code: str, body: StatusIn):
    claim = find(code)
    if not allowed(claim.status, body.status):
        raise HTTPException(409, f"A {claim.status} claim cannot move to {body.status}")
    advance(claim, body.status)
    return claim


@app.post("/api/claims/{code}/rating", response_model=PublicClaim)
def rate_claim(code: str, body: RatingIn):
    claim = find(code)
    if claim.status != "done":
        raise HTTPException(409, "Only finished claims can be rated")
    if claim.rating is not None:
        raise HTTPException(409, "This claim is already rated")
    claim.rating = body.rating
    touch()
    return claim


@app.get("/api/stats", dependencies=INSURER_ONLY)
def stats(request: Request, response: Response):
    minute = int(time.time() // 60)
    if (hit := etag_hit(request, response, f"{VERSION}-{minute}")) is not None:
        return hit
    return compute_stats(VERSION, minute)


@app.get("/api/stats/public")
def public_stats(request: Request, response: Response):
    minute = int(time.time() // 60)
    if (hit := etag_hit(request, response, f"p{VERSION}-{minute}")) is not None:
        return hit
    s = compute_stats(VERSION, minute)
    return {"repair_rate": s["repair_rate"], "csat": s["csat"], "avoided": s["avoided"],
            "insurers": INSURERS, "demo_code": DEMO_CODE}


@app.post("/api/demo", status_code=201)
def demo(body: DemoIn):
    if len(DEMOS) >= MAX_DEMOS:
        raise HTTPException(503, "Demo list is full")
    DEMOS.append(body)
    return {"ok": True}
