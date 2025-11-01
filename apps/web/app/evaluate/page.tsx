'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Info, Sparkles, Star, TrendingUp } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

// ---------------------------
// Types
// ---------------------------

type Scenario = {
  id: string
  name: string
  lots: number
  avgLotSize: number
  grossRevenue: number
  costs: number
  landCost: number
  yield: number // net profit / landCost
  notes: string[]
}

// ---------------------------
// Helpers (mock calc for prototype)
// ---------------------------

function parseRCode(rcode: string): number {
  // e.g. "R20" → 20
  const n = Number(rcode.replace(/[^0-9]/g, ''))
  return isNaN(n) ? 20 : n
}

function currency(n: number): string {
  return n.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  })
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function mockComputeScenarios({
  area,
  price,
  frontage,
  rcode,
  landPricePerSqm,
}: {
  area: number
  price: number
  frontage: number
  rcode: string
  landPricePerSqm: number
}): Scenario[] {
  const r = parseRCode(rcode)
  const minLotSize = Math.max(150, Math.round(10000 / r)) // грубая эвристика
  const possibleLots = Math.max(1, Math.floor(area / minLotSize))
  const landCost = landPricePerSqm * area

  const baseCostPerLot = 55000 // прототип
  const frontagePenalty = frontage < possibleLots * 10 ? possibleLots * 5000 : 0
  const civilCost = possibleLots * baseCostPerLot + frontagePenalty

  const scenarios: Scenario[] = [
    {
      id: 'A',
      name: '2-lot subdiv',
      lots: Math.min(2, possibleLots),
      avgLotSize: area / Math.min(2, possibleLots),
      grossRevenue: Math.min(2, possibleLots) * (price * 0.55),
      costs: civilCost * (Math.min(2, possibleLots) / possibleLots) + 45000,
      landCost,
      yield: 0,
      notes: [],
    },
    {
      id: 'B',
      name: '3-lot subdiv',
      lots: Math.min(3, possibleLots),
      avgLotSize: area / Math.min(3, possibleLots),
      grossRevenue: Math.min(3, possibleLots) * (price * 0.4),
      costs: civilCost * (Math.min(3, possibleLots) / possibleLots) + 65000,
      landCost,
      yield: 0,
      notes: [],
    },
    {
      id: 'C',
      name: 'Retain & 1',
      lots: Math.min(2, possibleLots),
      avgLotSize: area * 0.65, // retain ~65%
      grossRevenue: price * 0.85 + price * 0.45,
      costs: civilCost * 0.7 + 35000,
      landCost,
      yield: 0,
      notes: [],
    },
  ]

  return scenarios.map((s) => {
    const net = s.grossRevenue - s.costs - landCost
    const y = net / landCost

    const notes: string[] = []
    if (frontage < s.lots * 10) notes.push('Фронтаж может ограничивать количество фасадных участков.')
    if (s.avgLotSize < minLotSize) notes.push('Средняя площадь участка ниже ориентиров по R-коду.')
    if (r >= 40) notes.push('Высокая плотность (R' + r + '): проверьте парковку и доступ.')
    if (area - s.lots * minLotSize > 80) notes.push('Остаток площади может быть непродуктивным → подумайте о пере-планировке.')

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

// ---------------------------
// Page
// ---------------------------

export default function EvaluateUXPrototype() {
  const [area, setArea] = useState<number>(728)
  const [price, setPrice] = useState<number>(520000)
  const [frontage, setFrontage] = useState<number>(18)
  const [rcode, setRcode] = useState<string>('R30')
  const [landPricePerSqm, setLandPricePerSqm] = useState<number>(900)

  const [results, setResults] = useState<Scenario[] | null>(null)

  const bestScenario = useMemo(() => {
    if (!results?.length) return null
    return [...results].sort((a, b) => b.yield - a.yield)[0]
  }, [results])

  const sensitivity = useMemo(
    () => (bestScenario ? buildSensitivity(bestScenario) : []),
    [bestScenario]
  )

  function onCalculate(e: React.FormEvent) {
    e.preventDefault()
    // в реальном приложении сюда придёт fetch на /evaluate
    const scenarios = mockComputeScenarios({
      area,
      price,
      frontage,
      rcode,
      landPricePerSqm,
    })
    setResults(scenarios)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Blueprint grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-25 [background:linear-gradient(#7dd3fc0d_1px,transparent_1px),linear-gradient(90deg,#7dd3fc0d_1px,transparent_1px)] [background-size:28px_28px]" />
      {/* Soft glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.08),transparent_65%)]" />

      <main className="relative mx-auto max-w-7xl px-5 pb-24 pt-12">
        {/* Header */}
        <section className="mb-10 flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-400/10 px-3 py-1 text-xs text-sky-300 ring-1 ring-inset ring-sky-400/30">
              <Sparkles className="h-3.5 w-3.5" />
              Прототип UX · Subdivision Advisor
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Быстрая оценка сценариев разделения участка
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Заполните параметры участка — получите карточки сценариев, чувствительность к цене земли и советы.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden md:block"
          >
            <Badge className="bg-slate-200 text-slate-900">v0.1 prototype</Badge>
          </motion.div>
        </section>

        {/* Form */}
        <Card className="shadow-2xl shadow-black/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Calculator className="h-5 w-5 text-sky-300" /> Параметры участка
            </CardTitle>
            <CardDescription className="text-slate-300">5 полей · без лишнего</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCalculate} className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div>
                <Label htmlFor="area">Площадь, м²</Label>
                <Input
                  id="area"
                  type="number"
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  className="mt-1 bg-slate-950/40"
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Рыночная цена, $</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="mt-1 bg-slate-950/40"
                  required
                />
              </div>
              <div>
                <Label htmlFor="frontage">Фронтаж, м</Label>
                <Input
                  id="frontage"
                  type="number"
                  value={frontage}
                  onChange={(e) => setFrontage(Number(e.target.value))}
                  className="mt-1 bg-slate-950/40"
                  required
                />
              </div>
              <div>
                <Label htmlFor="rcode">R-код</Label>
                <select
                  id="rcode"
                  value={rcode}
                  onChange={(e) => setRcode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100"
                >
                  {['R20', 'R25', 'R30', 'R40', 'R60'].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="land">Цена земли, $/м²</Label>
                <Input
                  id="land"
                  type="number"
                  value={landPricePerSqm}
                  onChange={(e) => setLandPricePerSqm(Number(e.target.value))}
                  className="mt-1 bg-slate-950/40"
                  required
                />
              </div>

              <div className="md:col-span-5 mt-2 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Подсказка: используйте реальные цены по району для точности.
                </div>
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button type="submit" className="bg-sky-500 text-slate-950 hover:bg-sky-400">
                    Рассчитать
                  </Button>
                </motion.div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Scenario cards */}
            <div className="lg:col-span-2 space-y-4">
              {results
                .slice()
                .sort((a, b) => b.yield - a.yield)
                .map((s, idx) => {
                  const isBest = idx === 0
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      <Card
                        className={`backdrop-blur ${isBest ? 'ring-1 ring-sky-400/40 shadow-sky-500/20' : ''}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-slate-100">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs">
                                {s.id}
                              </span>
                              {s.name}
                            </CardTitle>
                            {isBest && (
                              <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                              >
                                <Badge className="gap-1 bg-emerald-400 text-emerald-950">
                                  <Star className="h-3.5 w-3.5" /> Лучший сценарий
                                </Badge>
                              </motion.div>
                            )}
                          </div>
                          <CardDescription className="text-slate-300">
                            {s.notes[0] ?? 'Без критичных замечаний'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          <Stat label="Участков" value={s.lots} />
                          <Stat label="Сред. площадь" value={`${Math.round(s.avgLotSize)} м²`} />
                          <Stat label="Доход" value={currency(s.grossRevenue)} />
                          <Stat label="Расходы" value={currency(s.costs)} />
                          <Stat label="Цена земли" value={currency(s.landCost)} />
                          <Stat label="Маржа" value={currency(s.grossRevenue - s.costs - s.landCost)} emphasize />
                          <Stat label="Yield" value={pct(s.yield)} emphasize />
                          <div className="col-span-2 md:col-span-4 text-xs text-slate-400">
                            {s.notes.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {s.notes.map((n, i) => (
                                  <span
                                    key={i}
                                    className="rounded-full bg-slate-800/80 px-2 py-1 text-slate-200 ring-1 ring-slate-700/60"
                                  >
                                    {n}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <Info className="h-3.5 w-3.5" /> Комментарии не требуются
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
            </div>

            {/* What-if + Advice */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <TrendingUp className="h-5 w-5 text-sky-300" /> Что если? (±10% к цене земли)
                  </CardTitle>
                  <CardDescription className="text-slate-300">Чувствительность yield лучшего сценария</CardDescription>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sensitivity} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeOpacity={0.1} />
                      <XAxis dataKey="label" tick={{ fill: '#94a3b8' }} />
                      <YAxis tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`} tick={{ fill: '#94a3b8' }} />
                      <Tooltip
                        formatter={(v: any) => `${(Number(v) * 100).toFixed(1)}%`}
                        labelStyle={{ color: '#e2e8f0' }}
                        contentStyle={{
                          background: '#0f172a',
                          border: '1px solid #1f2937',
                          borderRadius: 8,
                        }}
                      />
                      <Line type="monotone" dataKey="yield" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <Info className="h-5 w-5 text-sky-300" /> Советы
                  </CardTitle>
                  <CardDescription className="text-slate-300">Почему такой yield и куда смотреть дальше</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-inside space-y-2 text-sm text-slate-200">
                    <li>➤ Проверьте соответствие <span className="font-medium">R-коду</span>: минимальные площади и фронтаж на фасадные лоты.</li>
                    <li>➤ Уточните <span className="font-medium">подземные коммуникации</span> и точки подключения — это влияет на гражданские работы.</li>
                    <li>➤ <span className="font-medium">Рыночные цены</span> на готовые лоты колеблются — прогоните сценарий с 2–3 ценовыми диапазонами.</li>
                    <li>➤ Рассмотрите <span className="font-medium">Retain & Build</span>, если дом в хорошем состоянии — меньше CAPEX, быстрее реализация.</li>
                    <li>➤ Если остаток площади велик — проверьте возможность <span className="font-medium">альтернативной нарезки</span> (battle-axe, corner).</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </main>

      <footer className="relative mx-auto max-w-7xl px-5 pb-10 text-xs text-slate-500">
        Примечание: расчёты демонстрационные. Для продакшена подключите API /evaluate и валидацию.
      </footer>
    </div>
  )
}

function Stat({
  label,
  value,
  emphasize = false,
}: {
  label: string
  value: React.ReactNode
  emphasize?: boolean
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 tabular-nums ${emphasize ? 'text-lg font-semibold text-sky-300' : 'text-base text-slate-100'}`}>
        {value}
      </div>
    </div>
  )
}