# ФАЙЛ: domain/services/lot_yield/service.py
from __future__ import annotations

from math import floor
from typing import Dict, List, Optional, Tuple

from domain.models.evaluate import PropertyInput, ScenarioSettings


def _min_frontage_required(
    scen: ScenarioSettings, r_info: Optional[Dict[str, float]]
) -> float:
    """Выбрать требуемый фронтаж: R-код имеет приоритет, если задан."""
    if r_info and (mf := r_info.get("min_frontage_m")):
        return float(mf)
    return float(scen.min_frontage_required_m)


def _effective_min_lot_size_sqm(
    scen: ScenarioSettings, r_info: Optional[Dict[str, float]]
) -> int:
    """
    Консервативно берём максимум между целевым размером (scen.target_lot_size_sqm)
    и минимально допустимым по R-коду (если известен).
    """
    base = int(scen.target_lot_size_sqm)
    if r_info and (ml := r_info.get("min_lot_sqm")):
        return max(base, int(ml))
    return base


def estimate_lot_yield(
    prop: PropertyInput,
    scen: Optional[ScenarioSettings],
    r_code_info: Optional[Dict[str, Dict[str, float]]] = None,
) -> Tuple[int, List[str]]:
    """
    Оценивает потенциальное количество лотов.
    :param prop: входные характеристики участка
    :param scen: настройки сценария (если None — используем дефолты из модели)
    :param r_code_info: справочник по R-кодам, формат:
                        { "R20": {"min_lot_sqm": 350, "min_frontage_m": 10}, ... }
    :return: (lot_yield_estimate, notes)
    """
    notes: List[str] = []
    s = scen or ScenarioSettings()

    # Подтянем R-ограничения для данного prop.r_code (если оно задано и известно)
    r_info = None
    if prop.r_code and r_code_info:
        r_info = r_code_info.get(prop.r_code)

    # 1) Проверка фронтажа
    min_front_required = _min_frontage_required(s, r_info)
    if prop.frontage_m is not None and prop.frontage_m < min_front_required:
        notes.append(
            f"Frontage {prop.frontage_m:.2f}m < required {min_front_required:.2f}m."
        )
        return 0, notes  # фронтаж не позволяет делить по правилу

    # 2) Эффективный минимум площади лота
    min_lot = _effective_min_lot_size_sqm(s, r_info)
    if min_lot != s.target_lot_size_sqm:
        notes.append(
            f"Target lot size raised to {min_lot} sqm due to R-code minimum."
        )

    # 3) Базовая оценка по площади
    if prop.land_area_sqm <= 0:
        return 0, notes

    lots_by_area = floor(prop.land_area_sqm / float(min_lot))
    if lots_by_area < 1:
        notes.append("Insufficient land area for even a single compliant lot.")
        return 0, notes

    # 4) Простейшие поправки (без угловых/формы/съёмов сервитутов и т.п.)
    # На MVP ничего не режем дополнительно; всё остальное — в advice/notes.
    if prop.land_area_sqm % min_lot != 0:
        leftover = prop.land_area_sqm - lots_by_area * min_lot
        notes.append(f"Leftover area ~{leftover:.0f} sqm (non-divisible residue).")

    return int(lots_by_area), notes