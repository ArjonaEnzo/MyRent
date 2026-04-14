import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    const detail = encodeURIComponent(error.message || 'unknown')
    const status = error.status ?? ''
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&detail=${detail}&status=${status}`
    )
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&detail=no_code`)
}
