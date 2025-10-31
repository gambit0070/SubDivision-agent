# ФАЙЛ: domain/services/costs/service.py
from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Tuple

from domain.models.evaluate import EvaluateRequest


@dataclass
class CostBreakdown:
    items: Dict[str, float]
    total_ex_purchase: float  # сумма БЕЗ цены покупки


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for p in [here] + list(here.parents):
        candidate = p / "data" / "catalogs" / "cost_catalog_wa.csv"
        if candidate.exists():
            return p
    return Path.cwd()


def _load_cost_catalog(root: Optional[Path] = None) -> Dict[str, Dict[str, str]]:
    """
    Загружает cost_catalog_wa.csv в вид:
      { "ITEM_CODE": {"unit":"AUD"/"percent", "default_value":"..."} }
    """
    root = root or _repo_root()
    path = root / "data" / "catalogs" / "cost_catalog_wa.csv"
    table: Dict[str, Dict[str, str]] = {}
    if not path.exists():
        return table

    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = (row.get("item_code") or "").strip()
            if not code:
                continue
            table[code] = {
                "unit": (row.get("unit") or "").strip(),
                "default_value": (row.get("default_value") or "").strip(),
            }
    return table


def _get_num(v: Optional[str]) -> float:
    try:
        return float(v) if v not in (None, "") else 0.0
    except ValueError:
        return 0.0


def compute_project_costs(req: EvaluateRequest, *, lots: int, revenue: float) -> CostBreakdown:
    """
    Считает проектные затраты (без цены покупки и без холдинга).
    :param req: обогащённый EvaluateRequest
    :param lots: рассчитанное число лотов
    :param revenue: оценённая выручка (для маркетингового %)
    """
    catalog = _load_cost_catalog()

    # --- базовые позиции из каталога ---
    demo = _get_num(catalog.get("DEMO_BASE", {}).get("default_value"))
    subdiv = _get_num(catalog.get("SUBDIV_BASE", {}).get("default_value"))
    utilities = _get_num(catalog.get("UTILITIES_BASE", {}).get("default_value"))

    # Маркетинг: проценты от выручки
    mkt_unit = (catalog.get("MARKETING", {}).get("unit") or "").lower()
    mkt_val = _get_num(catalog.get("MARKETING", {}).get("default_value"))
    marketing = revenue * mkt_val if mkt_unit == "percent" else mkt_val

    # Settlement берём из asm (если в каталоге есть дефолт — игнорируем его, приоритет за asm)
    settlement = float(req.asm.settlement_cost or 0.0)

    # Резерв (контингент) считаем НА твёрдые затраты (без маркетинга/сеттлмента)
    contingency_pct = float(req.asm.contingency_pct or 0.0)
    hard_costs = demo + subdiv + utilities
    contingency = hard_costs * contingency_pct

    items = {
        "DEMO_BASE": demo,
        "SUBDIV_BASE": subdiv,
        "UTILITIES_BASE": utilities,
        "MARKETING": marketing,
        "SETTLEMENT": settlement,
        "CONTINGENCY": contingency,
    }
    total_ex_purchase = sum(items.values())
    return CostBreakdown(items=items, total_ex_purchase=total_ex_purchase)