// Placeholder home page
import Link from 'next/link'
export default function Page() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Subdivision Evaluator (MVP)</h1>
      <p className="mt-3 text-sm opacity-80">
        Форма ввода и графики будут здесь. Типы запроса/ответа генерятся из OpenAPI.
      </p>
      <ul className="mt-6 list-disc pl-6 space-y-1 text-sm">
        <li><code>POST /evaluate</code> контракт: <code>contracts/api/evaluate.v1.yaml</code></li>
        <li>Скрипт генерации типов: <code>scripts/generate_api_types.sh</code></li>
        <li>Пакеты: <code>packages/types</code>, <code>packages/ui</code>, <code>packages/config</code></li>
      </ul>
      <p className="mt-6 text-sm">
        Пример: <Link href="#" className="underline pointer-events-none">оценить кейс Thornlie</Link> (UI в разработке).
      </p>
    </main>
  )
}
