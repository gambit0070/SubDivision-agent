import './globals.css'
import { Inter } from 'next/font/google'
import React from 'react'
import I18nProvider from '@/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' })

export const metadata = {
  title: 'Subdivision Advisor',
  description: 'Quick evaluation of subdivision scenarios',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <I18nProvider>
          <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/20 ring-1 ring-sky-400/40">
                <span className="text-sm font-bold text-sky-300">SA</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">Subdivision Advisor</span>
              <span className="ml-2 rounded-full bg-sky-400/10 px-2 py-0.5 text-xs text-sky-300 ring-1 ring-sky-400/30">
                Prototype
              </span>

              {/* флажки справа */}
              <LanguageSwitcher />
            </div>
          </header>

          {children}

          <footer className="border-t border-slate-800/60 bg-slate-900/40">
            <div className="mx-auto max-w-7xl px-5 py-6 text-xs text-slate-400">
              © {new Date().getFullYear()} Subdivision Advisor · Demo UI
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  )
}
