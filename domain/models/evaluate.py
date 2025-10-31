from typing import Literal, Optional, Dict, List
from pydantic import BaseModel, Field, ConfigDict


Severity = Literal["low", "medium", "high"]


class PropertyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    address: Optional[str] = None
    suburb: Optional[str] = None
    land_area_sqm: float = Field(..., gt=0, description="Площадь участка, м²")
    frontage_m: Optional[float] = Field(None, gt=0, description="Фронтаж, м")
    r_code: Optional[str] = Field(None, description="Напр. R20/R25/R30")
    purchase_price: float = Field(..., gt=0, description="Цена покупки, AUD")


class Assumptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    demo_cost_fixed_min: float = 20_000
    demo_cost_fixed_max: float = 50_000
    subdiv_cost_range_min: float = 30_000
    subdiv_cost_range_max: float = 50_000
    min_build_cost_total: float = 300_000
    annual_interest_rate: float = Field(0.07, ge=0, le=1)
    subdiv_months: int = Field(6, ge=0)
    build_months: int = Field(18, ge=0)
    weekly_rent_if_retain: float = Field(500, ge=0)
    stamp_duty: Optional[float] = None
    settlement_cost: float = Field(1000, ge=0)
    council_rates_annual: float = Field(1200, ge=0)
    contingency_pct: float = Field(0.10, ge=0, le=1)


class MarketBenchmarks(BaseModel):
    model_config = ConfigDict(extra="forbid")

    land_price_per_sqm_small_lot: float = Field(..., gt=0)
    house_arv: Optional[float] = None
    land_target_lot_size_sqm: int = Field(200, gt=0)


class ScenarioSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    allow_retain: bool = True
    target_lot_size_sqm: int = Field(200, gt=0)
    min_frontage_required_m: float = Field(10.0, gt=0)


class ScenarioResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenario: str
    lots: int = Field(..., ge=0)
    revenue: float = Field(..., ge=0)
    total_cost: float = Field(..., ge=0)
    holding_cost: float = Field(..., ge=0)
    profit: float
    margin_on_cost: float = Field(..., description="profit / total_cost")
    roi_simple: float = Field(..., description="profit / вложения (упрощённо)")
    notes: List[str] = Field(default_factory=list)


class AdviceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    severity: Severity
    message: str


class SensitivityBand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    base_profit: float
    best_profit: float
    worst_profit: float


class EvaluateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prop: PropertyInput
    asm: Assumptions
    market: MarketBenchmarks
    scen: Optional[ScenarioSettings] = None


class EvaluationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    price_per_sqm: float
    lot_yield_estimate: int
    scenarios: List[ScenarioResult]
    advice: List[AdviceItem] = Field(default_factory=list)
    sensitivity: Optional[Dict[str, SensitivityBand]] = None