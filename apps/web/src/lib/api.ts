export type EvaluatePayload = {
  area: number
  price: number
  frontage: number
  rcode: string
  landPricePerSqm: number
}

export type EvaluationResponse = {
  price_per_sqm?: number
  lot_yield_estimate?: number
  scenarios?: any[]
}

const BASE = process.env.NEXT_PUBLIC_API_BASE

export async function postEvaluate(payload: EvaluatePayload): Promise<EvaluationResponse> {
  const res = await fetch(`${BASE}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // На всякий случай шлём и snake_case, и camelCase
    body: JSON.stringify({
      area: payload.area,
      price: payload.price,
      frontage: payload.frontage,
      rcode: payload.rcode,
      land_price_per_sqm: payload.landPricePerSqm,
      landPricePerSqm: payload.landPricePerSqm,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API /evaluate ${res.status}: ${text}`)
  }
  return res.json()
}

export type UIScenario = {
  id: string
  name: string
  lots: number
  avgLotSize: number
  grossRevenue: number
  costs: number
  landCost: number
  yield: number
  notes: string[]
}

export function mapApiToUIScenarios(
  api: EvaluationResponse,
  defaults: { area: number; landPricePerSqm: number }
): UIScenario[] {
  const arr = api.scenarios ?? []
  return arr.map((s: any, i: number) => {
    const landCost = Number(s.land_cost ?? s.landCost ?? defaults.landPricePerSqm * defaults.area) || 0
    const gross = Number(s.gross_revenue ?? s.grossRevenue ?? s.revenue ?? 0) || 0
    const costs = Number(s.costs ?? s.total_costs ?? 0) || 0
    const y = s.yield ?? s.roi
    const yieldNum = typeof y === 'number' ? y : landCost ? (gross - costs - landCost) / landCost : 0

    return {
      id: String.fromCharCode(65 + i), // A, B, C...
      name: String(s.name ?? s.scenario ?? `Scenario ${i + 1}`),
      lots: Number(s.lots ?? s.num_lots ?? s.lot_count ?? 0) || 0,
      avgLotSize: Number(s.avg_lot_size ?? s.avgLotSize ?? 0) || 0,
      grossRevenue: gross,
      costs,
      landCost,
      yield: yieldNum,
      notes: Array.isArray(s.notes) ? s.notes : [],
    }
  })
}