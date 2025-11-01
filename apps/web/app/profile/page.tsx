'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Placeholder page — coming soon.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">
            Здесь будет профиль пользователя: настройки, язык, контакты и т. п.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
