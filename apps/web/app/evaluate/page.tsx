'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Info, Sparkles, Star, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useI18n } from '@/i18n'
import { postEvaluate, mapApiToUIScenarios } from '@/lib/api'

type Scenario = {
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

function parseRCode(rcode: string): number {
  const n = Number(rcode.replace(/[^0-9]/g, ''))
  return isNaN(n) ? 20 : n
}
function currency(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}
function pct(n: number): string { return `${(n * 100).toFixed(1)}%` }

function mockComputeScenarios(
  { area, price, frontage, rcode, landPricePerSqm }:
  { area: number; price: number; frontage: number; rcode: string; landPricePerSqm: number },
  t: (k: string) => string
): Scenario[] {
  const r = parseRCode(rcode)
  const minLotSize = Math.max(150, Math.round(10000 / r))
  const possibleLots = Math.max(1, Math.floor(area / minLotSize))
  const landCost = landPricePerSqm * area
  const baseCostPerLot = 55000
  const frontagePenalty = frontage < possibleLots * 10 ? possibleLots * 5000 : 0
  const civilCost = possibleLots * baseCostPerLot + frontagePenalty
  const scenarios: Scenario[] = [
    { id: 'A', name: '2-lot subdiv', lots: Math.min(2, possibleLots),
      avgLotSize: area / Math.min(2, possibleLots),
      grossRevenue: Math.min(2, possibleLots) * (price * 0.55),
      costs: civilCost * (Math.min(2, possibleLots) / possibleLots) + 45000,
      landCost, yield: 0, notes: [] },
    { id: 'B', name: '3-lot subdiv', lots: Math.min(3, possibleLots),
      avgLotSize: area / Math.min(3, possibleLots),
      grossRevenue: Math.min(3, possibleLots) * (price * 0.4),
      costs: civilCost * (Math.min(3, possibleLots) / possibleLots) + 65000,
      landCost, yield: 0, notes: [] },
    { id: 'C', name: 'Retain & 1', lots: Math.min(2, possibleLots),
      avgLotSize: area * 0.65,
      grossRevenue: price * 0.85 + price * 0.45,
      costs: civilCost * 0.7 + 35000,
      landCost, yield: 0, notes: [] },
  ]
  return scenarios.map((s) => {
    const net = s.grossRevenue - s.costs - landCost
    const y = net / landCost
    const notes: string[] = []
    if (frontage < s.lots * 10) notes.push(t('note.frontage'))
    if (s.avgLotSize < minLotSize) notes.push(t('note.avg_small'))
    if (r >= 40) notes.push(t('note.density'))
    if (area - s.lots * minLotSize > 80) notes.push(t('note.residual'))
    return { ...s, yield: y, notes }
  })
}

function buildSensitivity(best: Scenario): { label: string; yield: number }[] {
  const shifts = [-0.1, -0.05, 0, 0.05, 0.1]
  return shifts.map((k) => {
    const newLandCost = best.landCost * (1 + k)
    const newYield = (best.grossRevenue - best.costs - newLandCost) / newLandCost
    const label = `${k > 0 ? '+' : ''}${Math.round(k * 100)}%`
    return { label, yield: Number(newYield.toFixed(3)) }
  })
}

export default function EvaluateUXPrototype() {
  const { t } = useI18n()
  const [area, setArea] = useState<number>(728)
  const [price, setPrice] = useState<number>(520000)
  const [frontage, setFrontage] = useState<number>(18)
  const [rcode, setRcode] = useState<string>('R30')
  const [landPricePerSqm, setLandPricePerSqm] = useState<number>(900)
  const [results, setResults] = useState<Scenario[] | null>(null)
  const [loading, setLoading] = useState(false)

  const bestScenario = useMemo(() => results?.length ? [...results].sort((a,b)=>b.yield-a.yield)[0] : null, [results])
  const sensitivity = useMemo(() => (bestScenario ? buildSensitivity(bestScenario) : []), [bestScenario])

  async function onCalculate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const apiRes = await postEvaluate({ area, price, frontage, rcode, landPricePerSqm })
      const mapped = mapApiToUIScenarios(apiRes, { area, landPricePerSqm })
      setResults(mapped.length ? mapped : mockComputeScenarios({ area, price, frontage, rcode, landPricePerSqm }, t))
    } catch {
      setResults(mockComputeScenarios({ area, price, frontage, rcode, landPricePerSqm }, t))
    } finally { setLoading(false) }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background:linear-gradient(#7dd3fc0d_1px,transparent_1px),linear-gradient(90deg,#7dd3fc0d_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.08),transparent_65%)]" />
      <main className="relative mx-auto max-w-7xl px-5 pb-24 pt-12">
        <section className="mb-10 flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-400/10 px-3 py-1 text-xs text-sky-300 ring-1 ring-inset ring-sky-400/30">
              <Sparkles className="h-3.5 w-3.5" />
              {t('hero.badge')}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t('hero.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{t('hero.subtitle')}</p>
          </div>
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="hidden md:block">
            <Badge className="bg-slate-200 text-slate-900">{t('ui.prototype')}</Badge>
          </motion.div>
        </section>

        <Card className="shadow-2xl shadow-black/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Calculator className="h-5 w-5 text-sky-300" /> {t('form.title')}
            </CardTitle>
            <CardDescription className="text-slate-300">{t('form.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCalculate} className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div><Label htmlFor="area">{t('form.area')}</Label>
                <Input id="area" type="number" value={area} onChange={(e)=>setArea(Number(e.target.value))} className="mt-1 bg-slate-950/40" required />
              </div>
              <div><Label htmlFor="price">{t('form.price')}</Label>
                <Input id="price" type="number" value={price} onChange={(e)=>setPrice(Number(e.target.value))} className="mt-1 bg-slate-950/40" required />
              </div>
              <div><Label htmlFor="frontage">{t('form.frontage')}</Label>
                <Input id="frontage" type="number" value={frontage} onChange={(e)=>setFrontage(Number(e.target.value))} className="mt-1 bg-slate-950/40" required />
              </div>
              <div>
                <Label htmlFor="rcode">{t('form.rcode')}</Label>
                <select id="rcode" value={rcode} onChange={(e)=>setRcode(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100">
                  {['R20','R25','R30','R40','R60'].map(r=> <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><Label htmlFor="land">{t('form.land')}</Label>
                <Input id="land" type="number" value={landPricePerSqm} onChange={(e)=>setLandPricePerSqm(Number(e.target.value))}
                       className="mt-1 bg-slate-950/40" required />
              </div>

              <div className="md:col-span-5 mt-2 flex items-center justify-between">
                <div className="text-xs text-slate-400">{t('form.hint')}</div>
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button type="submit" className="bg-sky-500 text-slate-950 hover:bg-sky-400" disabled={loading}>
                    {loading ? '…' : t('form.calc')}
                  </Button>
                </motion.div>
              </div>
            </form>
          </CardContent>
        </Card>

        {results && (
          <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {results.slice().sort((a,b)=>b.yield-a.yield).map((s, idx) => {
                const isBest = idx === 0
                return (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: idx * 0.05 }}>
                    <Card className={`backdrop-blur ${isBest ? 'ring-1 ring-sky-400/40 shadow-sky-500/20' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-slate-100">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs">{s.id}</span>
                            {s.name}
                          </CardTitle>
                          {isBest && (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
                              <Badge className="gap-1 bg-emerald-400 text-emerald-950">
                                <Star className="h-3.5 w-3.5" /> {t('results.best')}
                              </Badge>
                            </motion.div>
                          )}
                        </div>
                        <CardDescription className="text-slate-300">{s.notes[0] ?? t('results.no_comments')}</CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <Stat label={t('stat.lots')} value={s.lots} />
                        <Stat label={t('stat.avg')} value={`${Math.round(s.avgLotSize)} m²`} />
                        <Stat label={t('stat.revenue')} value={currency(s.grossRevenue)} />
                        <Stat label={t('stat.costs')} value={currency(s.costs)} />
                        <Stat label={t('stat.landcost')} value={currency(s.landCost)} />
                        <Stat label={t('stat.margin')} value={currency(s.grossRevenue - s.costs - s.landCost)} emphasize />
                        <Stat label={t('stat.yield')} value={pct(s.yield)} emphasize />
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <TrendingUp className="h-5 w-5 text-sky-300" /> {t('whatif.title')}
                  </CardTitle>
                  <CardDescription className="text-slate-300">{t('whatif.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bestScenario ? buildSensitivity(bestScenario) : []} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeOpacity={0.1} />
                      <XAxis dataKey="label" tick={{ fill: '#94a3b8' }} />
                      <YAxis tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`} tick={{ fill: '#94a3b8' }} />
                      <Tooltip formatter={(v: any) => `${(Number(v) * 100).toFixed(1)}%`} labelStyle={{ color: '#e2e8f0' }}
                               contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 8 }} />
                      <Line type="monotone" dataKey="yield" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <Info className="h-5 w-5 text-sky-300" /> {t('advice.title')}
                  </CardTitle>
                  <CardDescription className="text-slate-300">{t('advice.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-inside space-y-2 text-sm text-slate-200">
                    <li>➤ {t('advice.1')}</li>
                    <li>➤ {t('advice.2')}</li>
                    <li>➤ {t('advice.3')}</li>
                    <li>➤ {t('advice.4')}</li>
                    <li>➤ {t('advice.5')}</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </main>

      <footer className="relative mx-auto max-w-7xl px-5 pb-10 text-xs text-slate-500">
        {t('footer.note')}
      </footer>
    </div>
  )
}

function Stat({ label, value, emphasize = false }: { label: string; value: React.ReactNode; emphasize?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 tabular-nums ${emphasize ? 'text-lg font-semibold text-sky-300' : 'text-base text-slate-100'}`}>{value}</div>
    </div>
  )
}
