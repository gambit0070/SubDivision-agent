from __future__ import annotations

from pathlib import Path
from typing import Dict

from fastapi import APIRouter

router = APIRouter(prefix="", tags=["health"])

def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for p in [here] + list(here.parents):
        if (p / "data" / "catalogs").exists():
            return p
    return Path.cwd()

@router.get("/health")
def health() -> Dict[str, object]:
    root = _repo_root()
    catalogs = root / "data" / "catalogs"
    r_codes = catalogs / "r_codes_wa.csv"
    costs = catalogs / "cost_catalog_wa.csv"
    duty = catalogs / "wa_stamp_duty_brackets.csv"

    return {
        "status": "ok",
        "version": "0.0.1",
        "catalogs_dir": str(catalogs),
        "files_present": {
            "r_codes_wa.csv": r_codes.exists(),
            "cost_catalog_wa.csv": costs.exists(),
            "wa_stamp_duty_brackets.csv": duty.exists(),
        },
    }