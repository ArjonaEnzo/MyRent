import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refrescar sesión si existe — con timeout de 5s para no colgar la app
  // si Supabase Auth está degradado. Bajo outage tratamos al usuario como
  // anónimo en vez de bloquear toda navegación.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Auth timeout after 5s')), 5000)
    )
    const result = await Promise.race([
      supabase.auth.getUser(),
      timeoutPromise,
    ])
    user = result.data.user
  } catch (err) {
    console.warn('[middleware] auth.getUser failed — treating as anonymous', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  const pathname = request.nextUrl.pathname

  // ── Protect owner/staff dashboard ──────────────────────────────────────────
  // Any unauthenticated access to /dashboard/* redirects to /login.
  // Role validation (owner / admin / etc.) happens inside pages and actions.
  if (!user && pathname.startsWith('/dashboard')) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ── Protect tenant portal ───────────────────────────────────────────────────
  // Any unauthenticated access to /tenant/* redirects to /tenant/login.
  // Whether the authenticated user is actually a tenant is checked inside
  // the page via getCurrentTenant() — middleware only enforces authentication.
  // /tenant/set-password is public: tenants arrive here from the invite email
  // before a session is established (the client page exchanges the token).
  const tenantPublicPaths = ['/tenant/login', '/tenant/set-password']
  if (!user && pathname.startsWith('/tenant') && !tenantPublicPaths.includes(pathname)) {
    const redirectUrl = new URL('/tenant/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ── Redirect authenticated users away from auth pages ──────────────────────
  // Staff users go to the owner dashboard; tenant portal has its own login.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && pathname === '/tenant/login') {
    return NextResponse.redirect(new URL('/tenant/dashboard', request.url))
  }

  return response
}
