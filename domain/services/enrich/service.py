from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from domain.models.evaluate import EvaluateRequest, ScenarioSettings


@dataclass
class EnrichmentContext:
    """Контекст, который пригодится последующим сервисам (lot_yield/costs/finance)."""
    r_code_info: Optional[Dict[str, float]] = None
    notes: List[str] = None

    def __post_init__(self):
        if self.notes is None:
            self.notes = []


# ---- каталог R-кодов ----

def _repo_root() -> Path:
    """
    Пытаемся найти корень репозитория по наличию data/catalogs/r_codes_wa.csv.
    Если не нашли — используем текущую рабочую директорию.
    """
    here = Path(__file__).resolve()
    for p in [here] + list(here.parents):
        candidate = p / "data" / "catalogs" / "r_codes_wa.csv"
        if candidate.exists():
            return p
    return Path.cwd()


def _load_r_codes_catalog(root: Optional[Path] = None) -> Dict[str, Dict[str, float]]:
    """
    Загружает r_codes_wa.csv в словарь вида:
      { "R20": {"min_lot_sqm": 350, "avg_lot_sqm": 450, "min_frontage_m": 10}, ... }
    """
    root = root or _repo_root()
    path = root / "data" / "catalogs" / "r_codes_wa.csv"
    table: Dict[str, Dict[str, float]] = {}
    if not path.exists():
        return table

    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = (row.get("r_code") or "").strip()
            if not code:
                continue
            def _num(key: str) -> Optional[float]:
                val = (row.get(key) or "").strip()
                if val == "":
                    return None
                try:
                    return float(val)
                except ValueError:
                    return None

            table[code] = {
                "min_lot_sqm": _num("min_lot_sqm") or 0.0,
                "avg_lot_sqm": _num("avg_lot_sqm") or 0.0,
                "min_frontage_m": _num("min_frontage_m") or 0.0,
            }
    return table


def _select_r_info(r_code: Optional[str], catalog: Dict[str, Dict[str, float]]) -> Optional[Dict[str, float]]:
    if not r_code:
        return None
    return catalog.get(r_code)


# ---- публичные функции ----

def enrich_request(req: EvaluateRequest) -> Tuple[EvaluateRequest, EnrichmentContext]:
    """
    Подставляет пороги из R-код каталога в ScenarioSettings.
    Возвращает новую копию EvaluateRequest + контекст.
    """
    catalog = _load_r_codes_catalog()
    r_info = _select_r_info(req.prop.r_code, catalog)
    notes: List[str] = []

    # Гарантируем наличие scen
    scen = req.scen or ScenarioSettings()

    # Если нашли R-порог по площади — повысим целевой размер лота
    if r_info and r_info.get("min_lot_sqm", 0) > 0:
        min_lot = int(r_info["min_lot_sqm"])
        if min_lot > scen.target_lot_size_sqm:
            notes.append(f"Target lot size raised from {scen.target_lot_size_sqm} to {min_lot} due to R-code minimum.")
            scen = ScenarioSettings(
                allow_retain=scen.allow_retain,
                target_lot_size_sqm=min_lot,
                min_frontage_required_m=scen.min_frontage_required_m,
            )

    # Если нашли R-порог по фронтажу — применим его
    if r_info and r_info.get("min_frontage_m", 0) > 0:
        mf = float(r_info["min_frontage_m"])
        if abs(mf - scen.min_frontage_required_m) > 1e-9:
            notes.append(f"Min frontage requirement set to {mf}m from R-code.")
            scen = ScenarioSettings(
                allow_retain=scen.allow_retain,
                target_lot_size_sqm=scen.target_lot_size_sqm,
                min_frontage_required_m=mf,
            )

    # Соберём обновлённый запрос
    enriched = EvaluateRequest(
        prop=req.prop,
        asm=req.asm,
        market=req.market,
        scen=scen,
    )

    ctx = EnrichmentContext(r_code_info=r_info, notes=notes)
    return enriched, ctx