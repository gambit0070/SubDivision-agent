from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from domain.models.evaluate import ScenarioResult
from domain.services.costs.service import compute_project_costs
from domain.services.finance.duty import calc_wa_stamp_duty


def _target_lot_size(enriched) -> int:
    return (
        enriched.scen.target_lot_size_sqm if enriched.scen
        else enriched.market.land_target_lot_size_sqm
    )


def _holding_cost(purchase: float, annual_rate: float, months: int) -> float:
    return float(purchase * (annual_rate / 12.0) * months)


def _costs_note(items: Dict[str, float], *, duty: float) -> str:
    parts = [f"{k}={v:,.0f}" for k, v in items.items()]
    parts.append(f"DUTY={duty:,.0f}")
    return "Costs: " + ", ".join(parts)


def build_scenarios(enriched, ctx, lots: int) -> List[ScenarioResult]:
    """
    Возвращает список ScenarioResult по трём шаблонам (см. сводку выше).
    """
    scenarios: List[ScenarioResult] = []

    target_lot = _target_lot_size(enriched)
    land_psqm = float(enriched.market.land_price_per_sqm_small_lot)
    purchase = float(enriched.prop.purchase_price)
    duty = calc_wa_stamp_duty(purchase)

    # ---- A) subdivide & sell land (демо + продажа участков)
    revenue_a = float(lots * target_lot * land_psqm)
    costs_a = compute_project_costs(req=enriched, lots=lots, revenue=revenue_a)
    total_cost_a = purchase + duty + costs_a.total_ex_purchase
    holding_a = _holding_cost(purchase, float(enriched.asm.annual_interest_rate), int(enriched.asm.subdiv_months))
    profit_a = revenue_a - (total_cost_a + holding_a)
    denom_a = (total_cost_a + holding_a) or 1.0
    scen_a = ScenarioResult(
        scenario="subdivide_sell_lots",
        lots=lots,
        revenue=revenue_a,
        total_cost=total_cost_a,
        holding_cost=holding_a,
        profit=profit_a,
        margin_on_cost=profit_a / denom_a,
        roi_simple=profit_a / purchase if purchase > 0 else 0.0,
        notes=[*_merge_notes(ctx, f"A: {_costs_note(costs_a.items, duty=duty)}")],
    )
    scenarios.append(scen_a)

    # ---- B) retain house & subdivide (1 rear lot, если делимость >= 2)
    retain_lots = 1 if lots >= 2 else 0
    revenue_b = float(retain_lots * target_lot * land_psqm)
    costs_b = compute_project_costs(req=enriched, lots=retain_lots, revenue=revenue_b)
    # без демонтажа
    items_b = dict(costs_b.items)
    if "DEMO_BASE" in items_b:
        items_b["DEMO_BASE"] = 0.0
    total_cost_b = purchase + duty + sum(items_b.values())
    holding_b = _holding_cost(purchase, float(enriched.asm.annual_interest_rate), int(enriched.asm.subdiv_months))
    profit_b = revenue_b - (total_cost_b + holding_b)
    denom_b = (total_cost_b + holding_b) or 1.0
    scen_b = ScenarioResult(
        scenario="retain_and_subdivide",
        lots=retain_lots,
        revenue=revenue_b,
        total_cost=total_cost_b,
        holding_cost=holding_b,
        profit=profit_b,
        margin_on_cost=profit_b / denom_b,
        roi_simple=profit_b / purchase if purchase > 0 else 0.0,
        notes=[*_merge_notes(ctx, "B: retain house; DEMO excluded.", _costs_note(items_b, duty=duty))],
    )
    scenarios.append(scen_b)

    # ---- C) demo, rebuild & sell houses (нужен house_arv)
    arv = getattr(enriched.market, "house_arv", None)
    if arv is not None and float(arv) > 0 and lots > 0:
        revenue_c = float(lots) * float(arv)
        costs_c = compute_project_costs(req=enriched, lots=lots, revenue=revenue_c)
        items_c = dict(costs_c.items)
        # добавим строительство
        build_cost = float(enriched.asm.min_build_cost_total or 0.0) * float(lots)
        items_c["BUILD"] = build_cost
        total_cost_c = purchase + duty + sum(items_c.values())
        # удержание дольше: сабдив + стройка
        months_c = int(enriched.asm.subdiv_months) + int(enriched.asm.build_months)
        holding_c = _holding_cost(purchase, float(enriched.asm.annual_interest_rate), months_c)
        profit_c = revenue_c - (total_cost_c + holding_c)
        denom_c = (total_cost_c + holding_c) or 1.0
        scen_c = ScenarioResult(
            scenario="demo_rebuild_and_sell",
            lots=lots,
            revenue=revenue_c,
            total_cost=total_cost_c,
            holding_cost=holding_c,
            profit=profit_c,
            margin_on_cost=profit_c / denom_c,
            roi_simple=profit_c / purchase if purchase > 0 else 0.0,
            notes=[*_merge_notes(ctx, "C: includes BUILD cost.", _costs_note(items_c, duty=duty))],
        )
        scenarios.append(scen_c)
    else:
        # нет ARV — не добавляем сценарий C
        pass

    return scenarios


def _merge_notes(ctx, *extra: str) -> List[str]:
    base = list(ctx.notes or [])
    for n in extra:
        if n:
            base.append(n)
    return base