import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export type ServerClient = Awaited<ReturnType<typeof createClient>>

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // El `set` puede fallar en Server Components - solo importa en middleware
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Igual que arriba
          }
        },
      },
    }
  )
}

/**
 * Cliente con Service Role Key - SOLO para operaciones administrativas
 *
 * Uso: Subir/eliminar archivos en Storage, operaciones que bypasean RLS
 *
 * ⚠️ ADVERTENCIAS:
 * - NUNCA exponer al cliente
 * - NUNCA usar para queries que requieren validación de owner_id
 * - Este cliente bypasea completamente RLS
 *
 * Singleton: el cliente admin no tiene estado de sesión, así que se reusa
 * entre requests dentro de la misma instancia serverless. Esto evita crear
 * cientos de conexiones bajo carga concurrente (300 requests = 1 cliente,
 * no 300).
 */
let adminClientInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createAdminClient() {
  if (adminClientInstance) return adminClientInstance

  adminClientInstance = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  return adminClientInstance
}
