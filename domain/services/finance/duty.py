from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Tuple


Bracket = Tuple[float, float, float]  # (lower_bound, rate, fixed_amount)


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for p in [here] + list(here.parents):
        if (p / "data" / "catalogs").exists():
            return p
    return Path.cwd()


def _load_default_brackets() -> List[Bracket]:
    """
    Загружает CSV-таблицу скобок из data/catalogs/wa_stamp_duty_brackets.csv
    Формат строк: lower_bound,rate,fixed
      - lower_bound: нижняя граница скобки (включительно), AUD
      - rate: ставка (доля от 0 до 1) на сумму сверх lower_bound
      - fixed: фиксированная часть на нижней границе (кумулятивная)
    Если файл не найден или содержит ошибки — возвращает пустой список.
    """
    root = _repo_root()
    path = root / "data" / "catalogs" / "wa_stamp_duty_brackets.csv"
    if not path.exists():
        return []

    out: List[Bracket] = []
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                lb = float((row.get("lower_bound") or "").strip())
                rate = float((row.get("rate") or "").strip())
                fixed = float((row.get("fixed") or "").strip())
            except ValueError:
                continue
            out.append((lb, rate, fixed))
    # гарантируем сортировку по lower_bound
    out.sort(key=lambda x: x[0])
    return out


def calc_wa_stamp_duty(purchase_price: float, brackets: Optional[Iterable[Bracket]] = None) -> float:
    """
    Расчёт гербового сбора по кусочно-линейной шкале:
      duty = fixed + (price - lower_bound) * rate
    :param purchase_price: цена покупки (AUD)
    :param brackets: необязательно — список скобок (lower, rate, fixed).
                     Если None — берём из CSV в data/catalogs/wa_stamp_duty_brackets.csv
    """
    if purchase_price <= 0:
        return 0.0

    br = list(brackets) if brackets is not None else _load_default_brackets()
    if not br:
        # Нет таблицы — консервативно возвращаем 0 (пусть лучше UI предупредит)
        return 0.0

    # Найдём скобку с наибольшим lower_bound, не превышающим цену
    candidate = None
    for lower, rate, fixed in br:
        if purchase_price >= lower:
            candidate = (lower, rate, fixed)
        else:
            break

    if candidate is None:
        return 0.0

    lower, rate, fixed = candidate
    return float(fixed + (purchase_price - lower) * rate)