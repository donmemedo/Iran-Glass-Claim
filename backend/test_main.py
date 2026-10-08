"""Run: python test_main.py"""
import os
import re

os.environ["INSURER_TOKEN"] = "test-token"
from fastapi import HTTPException
from pydantic import ValidationError

import main
from main import BUCKETS, CLAIMS, ClaimIn, PublicClaim, allow, allowed, compute_stats, decide, estimate, require_insurer

assert decide("windshield", 2.0, False, False) == "repair"
assert decide("windshield", 2.0, True, False) == "replace"   # in driver's view
assert decide("windshield", 2.0, False, True) == "replace"   # at the edge
assert decide("windshield", 5.0, False, False) == "replace"  # too big
assert decide("side", 1.0, False, False) == "replace"        # tempered glass shatters
e = estimate("repair", "windshield", mobile=True, adas=False)
assert e == {"total": 3.8, "avoided": 12.1}, e
assert len(CLAIMS) == 64 and compute_stats(main.VERSION, 0)["total"] == 64

# Codes: CSPRNG, unambiguous alphabet, 8 symbols.
assert all(re.fullmatch(r"IGC-[2-9A-HJ-NP-Z]{8}", c) for c in CLAIMS)

# State machine: one step forward or reject; done/rejected are final.
assert allowed("received", "approved") and allowed("in_service", "done") and allowed("approved", "rejected")
for cur, new in [("received", "done"), ("done", "received"), ("rejected", "done"), ("done", "done"), ("received", "received")]:
    assert not allowed(cur, new), (cur, new)

# Auth.
def denied(header):
    try:
        require_insurer(header)
        return False
    except HTTPException as exc:
        return exc.status_code == 401
assert denied("") and denied("Bearer wrong") and denied("Bearer tést") and not denied("Bearer test-token")

# Public view is redacted.
pub = PublicClaim.model_validate(next(iter(CLAIMS.values())).model_dump()).model_dump()
assert not {"name", "mobile", "plate", "policy_no"} & pub.keys()

# Validation.
ok = dict(name="Sara", mobile="09121234567", policy_no="BD-1234", insurer="Iran Insurance",
          plate="12 B 345 - 67", glass="windshield", size_cm=1.0)
ClaimIn(**ok)
ClaimIn(**ok | {"name": "سارا‌احمدی"})  # ZWNJ stays allowed
for bad in ({"insurer": "<script>"}, {"size_cm": float("nan")}, {"size_cm": float("inf")},
            {"name": "Sa‮ara"}, {"plate": "12\r\n34"}, {"name": "a\x00b"}):
    try:
        ClaimIn(**ok | bad)
        raise AssertionError(bad)
    except ValidationError:
        pass

# Rate limiter: 10-write burst per IP.
BUCKETS.clear()
assert all(allow("1.2.3.4", True) for _ in range(10)) and not allow("1.2.3.4", True) and allow("5.6.7.8", True)

try:
    from fastapi.testclient import TestClient
except (ImportError, RuntimeError):  # httpx missing: the HTTP checks below need it
    TestClient = None
    print("skipped HTTP checks: httpx not installed")

if TestClient:
    BUCKETS.clear()
    cl = TestClient(main.app)
    H = {"Authorization": "Bearer test-token"}
    assert cl.get("/api/claims").status_code == 401
    assert cl.get("/api/stats").status_code == 401
    assert cl.get("/docs").status_code == 404 and cl.get("/openapi.json").status_code == 404
    r = cl.get("/api/claims?limit=5", headers=H)
    assert r.status_code == 200 and len(r.json()) == 5 and r.headers["x-total-count"] == "64", r.headers
    assert r.headers["x-content-type-options"] == "nosniff"
    assert cl.get("/api/claims?limit=5", headers=H | {"If-None-Match": r.headers["etag"]}).status_code == 304
    big = cl.get("/api/claims?limit=200", headers=H | {"Accept-Encoding": "gzip"})
    assert big.headers.get("content-encoding") == "gzip"
    p = cl.get("/api/stats/public").json()
    assert set(p) == {"repair_rate", "csat", "avoided", "insurers", "demo_code"}, p
    d = cl.get(f"/api/claims/{p['demo_code'].lower()}").json()
    assert d["code"] == p["demo_code"] and "mobile" not in d and "name" not in d
    assert cl.post(f"/api/claims/{p['demo_code']}/rating", json={"rating": 1}).status_code == 409  # already rated
    J = {"Content-Type": "application/json"}
    assert cl.post("/api/claims", content=b"x" * 70000, headers=J).status_code == 413
    assert cl.post("/api/claims", content=b'{"size_cm": NaN}', headers=J).status_code == 422
    code = cl.post("/api/claims", json=ok).json()["code"]
    assert cl.patch(f"/api/claims/{code}", json={"status": "approved"}).status_code == 401
    assert cl.patch(f"/api/claims/{code}", json={"status": "done"}, headers=H).status_code == 409
    assert cl.patch(f"/api/claims/{code}", json={"status": "approved"}, headers=H).status_code == 200
    assert cl.get("/api/claims?limit=5", headers=H | {"If-None-Match": r.headers["etag"]}).status_code == 200
    demo = {"company": "Acme", "contact": "Ali", "phone": "021 1234 5678", "monthly_claims": 10}
    codes = [cl.post("/api/demo", json=demo).status_code for _ in range(12)]
    assert codes[0] == 201 and codes[-1] == 429, codes

print("ok")
