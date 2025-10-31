from domain.models.evaluate import EvaluateRequest, PropertyInput, Assumptions, MarketBenchmarks, ScenarioSettings
from domain.services.enrich.service import enrich_request
from domain.services.lot_yield.service import estimate_lot_yield

def test_lot_yield_r20_ok():
    req = EvaluateRequest(
        prop=PropertyInput(
            address="123 Sample St, Thornlie WA",
            land_area_sqm=760,
            frontage_m=12.5,
            r_code="R20",
            purchase_price=680_000,
        ),
        asm=Assumptions(),
        market=MarketBenchmarks(land_price_per_sqm_small_lot=1600),
        scen=ScenarioSettings(),  # дефолты
    )

    enriched, ctx = enrich_request(req)
    rmap = {enriched.prop.r_code: ctx.r_code_info} if (ctx.r_code_info and enriched.prop.r_code) else None
    lots, notes = estimate_lot_yield(enriched.prop, enriched.scen, rmap)

    assert lots == 2
    assert any("raised from 200 to 350" in n for n in ctx.notes)  # подняли целевой размер лота до min по R20
    assert any("Leftover area ~60 sqm" in n for n in notes)

def test_lot_yield_insufficient_frontage():
    req = EvaluateRequest(
        prop=PropertyInput(
            address="X",
            land_area_sqm=760,
            frontage_m=8.0,   # меньше требуемых 10м по R20
            r_code="R20",
            purchase_price=600_000,
        ),
        asm=Assumptions(),
        market=MarketBenchmarks(land_price_per_sqm_small_lot=1500),
        scen=ScenarioSettings(),
    )

    enriched, ctx = enrich_request(req)
    rmap = {enriched.prop.r_code: ctx.r_code_info} if (ctx.r_code_info and enriched.prop.r_code) else None
    lots, notes = estimate_lot_yield(enriched.prop, enriched.scen, rmap)

    assert lots == 0
    assert any("Frontage" in n and "< required" in n for n in notes)