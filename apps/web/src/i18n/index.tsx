'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Locale = 'ru' | 'en'

type Ctx = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<Ctx>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => k,
})

const dict: Record<Locale, Record<string, string>> = {
  ru: {
    'hero.badge': 'Прототип UX · Subdivision Advisor',
    'hero.title': 'Быстрая оценка сценариев разделения участка',
    'hero.subtitle': 'Заполните параметры участка — получите карточки сценариев, чувствительность к цене земли и советы.',
    'ui.prototype': 'v0.1 прототип',
    'form.title': 'Параметры участка',
    'form.subtitle': '5 полей · без лишнего',
    'form.area': 'Площадь, м²',
    'form.price': 'Рыночная цена, $',
    'form.frontage': 'Фронтаж, м',
    'form.rcode': 'R-код',
    'form.land': 'Цена земли, $/м²',
    'form.hint': 'Подсказка: используйте реальные цены по району для точности.',
    'form.calc': 'Рассчитать',
    'nav.profile': 'Профиль',
    'results.best': 'Лучший сценарий',
    'results.no_comments': 'Комментарии не требуются',
    'stat.lots': 'Участков',
    'stat.avg': 'Сред. площадь',
    'stat.revenue': 'Доход',
    'stat.costs': 'Расходы',
    'stat.landcost': 'Цена земли',
    'stat.margin': 'Маржа',
    'stat.yield': 'Yield',
    'whatif.title': 'Что если? (±10% к цене земли)',
    'whatif.subtitle': 'Чувствительность yield лучшего сценария',
    'advice.title': 'Советы',
    'advice.subtitle': 'Почему такой yield и куда смотреть дальше',
    'advice.1': 'Проверьте соответствие R-коду: минимальные площади и фронтаж на фасадные лоты.',
    'advice.2': 'Уточните подземные коммуникации и точки подключения — это влияет на гражданские работы.',
    'advice.3': 'Рыночные цены на готовые лоты колеблются — прогоните сценарий с 2–3 диапазонами.',
    'advice.4': 'Рассмотрите Retain & Build, если дом в хорошем состоянии — меньше CAPEX, быстрее реализация.',
    'advice.5': 'Если остаток площади велик — проверьте альтернативную нарезку (battle-axe, corner).',
    'footer.note': 'Примечание: расчёты демонстрационные. Для продакшена подключите API /evaluate и валидацию.',
    'note.frontage': 'Фронтаж может ограничивать количество фасадных участков.',
    'note.avg_small': 'Средняя площадь участка ниже ориентиров по R-коду.',
    'note.density': 'Высокая плотность: проверьте парковку и доступ.',
    'note.residual': 'Остаток площади может быть непродуктивным → подумайте о перепланировке.',
  },
  en: {
    'hero.badge': 'UX Prototype · Subdivision Advisor',
    'hero.title': 'Quick evaluation of subdivision scenarios',
    'hero.subtitle': 'Enter site parameters — get scenario cards, land-price sensitivity, and tips.',
    'ui.prototype': 'v0.1 prototype',
    'form.title': 'Site parameters',
    'form.subtitle': '5 fields · nothing extra',
    'form.area': 'Area, m²',
    'form.price': 'Market price, $',
    'form.frontage': 'Frontage, m',
    'form.rcode': 'R-code',
    'form.land': 'Land price, $/m²',
    'form.hint': 'Tip: use actual suburb prices for better accuracy.',
    'form.calc': 'Calculate',
    'nav.profile': 'Profile',
    'results.best': 'Best scenario',
    'results.no_comments': 'No comments required',
    'stat.lots': 'Lots',
    'stat.avg': 'Avg lot size',
    'stat.revenue': 'Revenue',
    'stat.costs': 'Costs',
    'stat.landcost': 'Land cost',
    'stat.margin': 'Margin',
    'stat.yield': 'Yield',
    'whatif.title': 'What-if? (±10% to land price)',
    'whatif.subtitle': 'Yield sensitivity of the best scenario',
    'advice.title': 'Advice',
    'advice.subtitle': 'Why this yield and what to check next',
    'advice.1': 'Check R-code compliance: minimum lot sizes and frontage for street-facing lots.',
    'advice.2': 'Confirm utilities and connection points — they impact civil costs.',
    'advice.3': 'Lot exit prices vary — run 2–3 pricing bands.',
    'advice.4': 'Consider Retain & Build if the dwelling is solid — lower CAPEX, faster execution.',
    'advice.5': 'Large residual area? Try alternative layouts (battle-axe, corner).',
    'footer.note': 'Note: demo calculations. Wire up /evaluate API and validation for production.',
    'note.frontage': 'Frontage may limit number of street-facing lots.',
    'note.avg_small': 'Average lot size is below R-code guides.',
    'note.density': 'High density: check parking and access.',
    'note.residual': 'Residual area may be unproductive → consider re-layout.',
  },
}

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en')

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('lang') as Locale) || 'en'
      setLocale(saved)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('lang', locale)
    } catch {}
  }, [locale])

  const t = useMemo(() => {
    return (key: string) => dict[locale][key] ?? key
  }, [locale])

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
