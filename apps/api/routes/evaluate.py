from __future__ import annotations
from domain.services.costs.service import compute_project_costs

from domain.services.finance.duty import calc_wa_stamp_duty

from typing import Dict, List, Optional

from fastapi import APIRouter
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

    costs = compute_project_costs(req=enriched, lots=lots, revenue=revenue)
    base_cost_ex_purchase = costs.total_ex_purchase  # только проектные
    purchase = enriched.prop.purchase_price

    # Stamp duty (WA) — по таблице скобок, если она есть
    duty = calc_wa_stamp_duty(purchase)

    # Сводная стоимость без холдинга
    total_cost = purchase + duty + base_cost_ex_purchase

    # Холдинг: проценты на срок сабдивижна на сумму покупки (упрощённо)
    holding_cost = float(
        purchase * (enriched.asm.annual_interest_rate / 12.0) * enriched.asm.subdiv_months
    )

    # Сводная стоимость без холдинга (для margin_on_cost)
    total_cost = purchase + base_cost_ex_purchase

    # Прибыль считаем ПОСЛЕ холдинга
    profit = revenue - (total_cost + holding_cost)
    tdc = total_cost + holding_cost  # total development cost (включая проценты)
    denom = tdc if tdc > 0 else 1.0
    margin_on_cost = profit / denom
    roi_simple = profit / purchase

    # Красивое примечание с разбиением затрат
    cost_note = "Costs: " + ", ".join(f"{k}={v:,.0f}" for k, v in costs.items.items())
    cost_note = cost_note + f", DUTY={duty:,.0f}"
    
    scenario = ScenarioResult(
        scenario="subdivide_sell_lots",
        lots=lots,
        revenue=revenue,
        total_cost=total_cost,       # теперь это purchase + проектные затраты
        holding_cost=holding_cost,   # отдельно
        profit=profit,
        margin_on_cost=margin_on_cost,
        roi_simple=roi_simple,
        notes=[*ctx.notes, *ly_notes, cost_note],
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
        return rev - (total_cost + holding_cost)

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