"""Run: python test_main.py"""
from main import decide, estimate, stats, CLAIMS

assert decide("windshield", 2.0, False, False) == "repair"
assert decide("windshield", 2.0, True, False) == "replace"   # in driver's view
assert decide("windshield", 2.0, False, True) == "replace"   # at the edge
assert decide("windshield", 5.0, False, False) == "replace"  # too big
assert decide("side", 1.0, False, False) == "replace"        # tempered glass shatters
e = estimate("repair", "windshield", mobile=True, adas=False)
assert e == {"total": 3.8, "avoided": 12.1}, e
assert len(CLAIMS) == 64 and stats()["total"] == 64
print("ok")
