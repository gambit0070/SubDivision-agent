from domain.models.evaluate import EvaluateRequest, PropertyInput, Assumptions, MarketBenchmarks, ScenarioSettings
from domain.services.enrich.service import enrich_request
from domain.services.costs.service import compute_project_costs

def test_cost_breakdown_catalog_defaults():
    # кейс как в ручной проверке/Swagger
    req = EvaluateRequest(
        prop=PropertyInput(
            address="123 Sample St, Thornlie WA",
            land_area_sqm=760,
            frontage_m=12.5,
            r_code="R20",
            purchase_price=680_000,
        ),
        asm=Assumptions(),  # settlement=1000, contingency=10%
        market=MarketBenchmarks(land_price_per_sqm_small_lot=1600),
        scen=ScenarioSettings(),
    )

    enriched, _ = enrich_request(req)
    target_lot = enriched.scen.target_lot_size_sqm
    lots = 2  # из предыдущего теста
    revenue = float(lots * target_lot * enriched.market.land_price_per_sqm_small_lot)  # 1_120_000

    costs = compute_project_costs(req=enriched, lots=lots, revenue=revenue)

    # Каталожные дефолты:
    # DEMO=35000, SUBDIV=40000, UTILITIES=15000, MARKETING=2.5%*revenue=28000, SETTLEMENT=1000, CONTINGENCY=10%*(35+40+15)=9000
    expected = {
        "DEMO_BASE": 35_000,
        "SUBDIV_BASE": 40_000,
        "UTILITIES_BASE": 15_000,
        "MARKETING": 28_000,
        "SETTLEMENT": 1_000,
        "CONTINGENCY": 9_000,
    }
    for k, v in expected.items():
        assert abs(costs.items[k] - v) < 1e-6

    assert abs(costs.total_ex_purchase - sum(expected.values())) < 1e-6  # 128_000