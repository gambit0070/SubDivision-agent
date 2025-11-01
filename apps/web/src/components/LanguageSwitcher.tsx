'use client'

import React from 'react'
import Link from 'next/link'
import { User } from 'lucide-react'
import { useI18n } from '@/i18n'

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  const pill =
    'inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors'

  return (
    <div className="ml-auto flex flex-col items-end gap-2">
      {/* ряд с флажками */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setLocale('ru')}
          className={
            locale === 'ru'
              ? `${pill} bg-sky-500 text-slate-950 ring-sky-400`
              : `${pill} bg-slate-800/60 text-slate-200 ring-slate-700 hover:bg-slate-700/60`
          }
          aria-pressed={locale === 'ru'}
          title="Русский"
        >
          <span role="img" aria-label="ru">🇷🇺</span> RU
        </button>
        <button
          onClick={() => setLocale('en')}
          className={
            locale === 'en'
              ? `${pill} bg-sky-500 text-slate-950 ring-sky-400`
              : `${pill} bg-slate-800/60 text-slate-200 ring-slate-700 hover:bg-slate-700/60`
          }
          aria-pressed={locale === 'en'}
          title="English"
        >
          <span role="img" aria-label="en">🇦🇺</span> EN
        </button>
      </div>

      {/* плейсхолдер кнопки профиля */}
      <Link
        href="/profile"
        className={`${pill} bg-slate-800/60 text-slate-200 ring-slate-700 hover:bg-slate-700/60`}
      >
        <User className="h-3.5 w-3.5" />
        {t('nav.profile')}
      </Link>
    </div>
  )
}
