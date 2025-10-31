from fastapi.testclient import TestClient
from apps.api.main import app

client = TestClient(app)

def test_evaluate_happy_path():
    payload = {
        "prop": {
            "address": "123 Sample St, Thornlie WA",
            "land_area_sqm": 760,
            "purchase_price": 680000,
            "frontage_m": 12.5,
            "r_code": "R20"
        },
        "asm": {},
        "market": { "land_price_per_sqm_small_lot": 1600 }
    }
    r = client.post("/evaluate", json=payload)
    assert r.status_code == 200

    data = r.json()
    assert data["lot_yield_estimate"] == 2
    assert abs(data["price_per_sqm"] - (680000/760)) < 1e-6

    scen = data["scenarios"][0]
    assert scen["scenario"] == "subdivide_sell_lots"
    assert scen["lots"] == 2
    assert scen["revenue"] == 1120000
    # total_cost включает purchase + проектные (без holding)
    assert scen["total_cost"] == 808000
    # holding отдельно
    assert scen["holding_cost"] == 23800
    # итоговая прибыль и маржа
    assert scen["profit"] == 288200
    assert 0.34 < scen["margin_on_cost"] < 0.35