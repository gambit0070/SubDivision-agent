from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter
from domain.models.evaluate import (
    EvaluateRequest,
    EvaluationResponse,
    AdviceItem,
    SensitivityBand,
)
from domain.services.enrich.service import enrich_request
from domain.services.lot_yield.service import estimate_lot_yield
from domain.services.scenarios.service import build_scenarios

router = APIRouter(prefix="", tags=["evaluate"])


@router.post("/evaluate", response_model=EvaluationResponse)
def evaluate(req: EvaluateRequest) -> EvaluationResponse:
    # 1) Enrich (поднять пороги по R-коду, собрать контекст)
    enriched, ctx = enrich_request(req)

    # 2) Lot yield
    rmap: Optional[Dict[str, Dict[str, float]]] = None
    if ctx.r_code_info and enriched.prop.r_code:
        rmap = {enriched.prop.r_code: ctx.r_code_info}

    lots, ly_notes = estimate_lot_yield(
        prop=enriched.prop,
        scen=enriched.scen,
        r_code_info=rmap,
    )

    # Прокинем заметки из lot_yield в общий контекст,
    # чтобы билдер сценариев включил их в notes
    ctx.notes = [*(ctx.notes or []), *ly_notes]

    # 3) Базовая метрика
    price_per_sqm = enriched.prop.purchase_price / enriched.prop.land_area_sqm

    # 4) Построить набор сценариев (A/B/C) по обогащённым данным
    scenarios = build_scenarios(enriched, ctx, lots)
    scenarios_sorted = sorted(
        scenarios,
        key=lambda s: (float(s.profit), float(s.margin_on_cost)),
        reverse=True,
    )
    best_code = scenarios_sorted[0].scenario if scenarios_sorted else None

    # 5) Советы
    advice: List[AdviceItem] = []
    if lots == 0:
        advice.append(
            AdviceItem(
                code="NO_YIELD",
                severity="high",
                message="Невозможно получить соответствующие лоты при текущих параметрах (проверьте фронтаж и R-код).",
            )
        )
    if enriched.prop.frontage_m is None:
        advice.append(
            AdviceItem(
                code="MISSING_FRONTAGE",
                severity="medium",
                message="Не указан фронтаж; расчёт носит ориентировочный характер без фронтажных проверок.",
            )
        )

    # 6) Простая чувствительность к цене земли (±10%)
    def _profit_for(psqm: float) -> float:
        target_lot = (
            enriched.scen.target_lot_size_sqm
            if enriched.scen
            else enriched.market.land_target_lot_size_sqm
        )
        rev = float(lots * target_lot * psqm)
        if scenarios:
            base_total = scenarios[0].total_cost
            base_hold = scenarios[0].holding_cost
            return rev - (base_total + base_hold)
        return rev  # fallback если сценариев нет

    base_p = float(enriched.market.land_price_per_sqm_small_lot)
    sensitivity = {
        "land_psqm": SensitivityBand(
            base_profit=_profit_for(base_p),
            best_profit=_profit_for(base_p * 1.10),
            worst_profit=_profit_for(base_p * 0.90),
        )
    }

    return EvaluationResponse(
        price_per_sqm=price_per_sqm,
        lot_yield_estimate=lots,
        scenarios=scenarios_sorted,             # ← сортированные
        advice=advice,
        sensitivity=sensitivity,
        best_scenario_code=best_code,           # ← NEW
        scenario_order=[s.scenario for s in scenarios_sorted],
    )