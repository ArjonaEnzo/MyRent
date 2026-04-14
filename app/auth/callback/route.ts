import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // Token-hash flow (device-independent — no PKCE verifier required)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    const detail = encodeURIComponent(error.message || 'unknown')
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&detail=${detail}&status=${error.status ?? ''}`
    )
  }

  // PKCE code flow (same-device)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    const detail = encodeURIComponent(error.message || 'unknown')
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&detail=${detail}&status=${error.status ?? ''}`
    )
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&detail=no_code_or_token`)
}
