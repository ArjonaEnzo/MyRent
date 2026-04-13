import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * @deprecated Reemplazado por /api/cron/daily-billing
 * Redirige al nuevo cron consolidado que maneja notificaciones + generación.
 */
export async function GET(request: Request) {
  const url = new URL('/api/cron/daily-billing', request.url)
  const headers: Record<string, string> = {}
  const auth = request.headers.get('authorization')
  if (auth) headers['authorization'] = auth

  const response = await fetch(url.toString(), { headers })
  const data = await response.json()

  return NextResponse.json(data, { status: response.status })
}
