from __future__ import annotations

from math import floor
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from domain.models.evaluate import (
    EvaluateRequest,
    EvaluationResponse,
    ScenarioResult,
    AdviceItem,
    SensitivityBand,
)
from domain.services.enrich.service import enrich_request
from domain.services.lot_yield.service import estimate_lot_yield

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

    # 3) Базовая метрика
    price_per_sqm = enriched.prop.purchase_price / enriched.prop.land_area_sqm

    # 4) Черновой сценарий (MVP): "subdivide_sell_lots"
    #    Revenue ≈ lots * target_lot_size * market $/sqm
    target_lot = enriched.scen.target_lot_size_sqm if enriched.scen else enriched.market.land_target_lot_size_sqm
    revenue = float(lots * target_lot * enriched.market.land_price_per_sqm_small_lot)

    #    Стоимость: покупка + минимальные транзакционные + базовая сабдив
    base_cost = (
        enriched.prop.purchase_price
        + enriched.asm.settlement_cost
        + max(enriched.asm.subdiv_cost_range_min, 0.0)
    )

    #    Холдинг: проценты на покупку на срок сабдивижна
    holding_cost = float(
        enriched.prop.purchase_price
        * (enriched.asm.annual_interest_rate / 12.0)
        * enriched.asm.subdiv_months
    )

    total_cost = base_cost + holding_cost
    profit = revenue - total_cost
    denom = total_cost if total_cost > 0 else 1.0
    margin_on_cost = profit / denom
    roi_simple = profit / enriched.prop.purchase_price

    scenario = ScenarioResult(
        scenario="subdivide_sell_lots",
        lots=lots,
        revenue=revenue,
        total_cost=base_cost,
        holding_cost=holding_cost,
        profit=profit,
        margin_on_cost=margin_on_cost,
        roi_simple=roi_simple,
        notes=[*ctx.notes, *ly_notes],
    )

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
        rev = float(lots * target_lot * psqm)
        return rev - total_cost

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
        scenarios=[scenario],
        advice=advice,
        sensitivity=sensitivity,
    )