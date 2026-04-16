'use server'

import { getCurrentUserWithAccount, requireRole } from '@/lib/supabase/auth'
import { env } from '@/lib/env'
import { createHmac, randomBytes } from 'crypto'
import {
  getMPConnectionStatus,
  disconnectMPAccount,
} from '@/lib/payments/mp-token-manager'
import { revalidatePath } from 'next/cache'
import { logger, logError } from '@/lib/utils/logger'

// ─── initiateMPOAuth ─────────────────────────────────────────────────────────

/**
 * Initiates the Mercado Pago OAuth flow.
 *
 * 1. Verifies the user is an owner or admin
 * 2. Generates a signed state parameter (HMAC-SHA256) containing accountId + nonce + timestamp
 * 3. Builds the MP authorization URL
 * 4. Returns the URL for the client to redirect to
 */
export async function initiateMPOAuth(): Promise<
  { success: true; authUrl: string } | { success: false; error: string }
> {
  try {
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    if (!env.MERCADOPAGO_APP_ID || !env.MERCADOPAGO_CLIENT_SECRET) {
      return {
        success: false,
        error:
          'Mercado Pago OAuth no está configurado. Configurá MERCADOPAGO_APP_ID y MERCADOPAGO_CLIENT_SECRET.',
      }
    }

    // Build state: JSON payload → base64url → HMAC sign
    const payload = JSON.stringify({
      accountId,
      nonce: randomBytes(16).toString('hex'),
      ts: Date.now(),
    })
    const base64Payload = Buffer.from(payload).toString('base64url')

    const signature = createHmac('sha256', env.MERCADOPAGO_CLIENT_SECRET)
      .update(base64Payload)
      .digest('hex')

    const state = `${base64Payload}.${signature}`

    const redirectUri = encodeURIComponent(
      `${env.NEXT_PUBLIC_APP_URL}/api/mercadopago/callback`
    )

    const authUrl =
      `https://auth.mercadopago.com/authorization` +
      `?client_id=${env.MERCADOPAGO_APP_ID}` +
      `&response_type=code` +
      `&platform_id=mp` +
      `&redirect_uri=${redirectUri}` +
      `&state=${state}`

    logger.info('MP OAuth flow initiated', { accountId, userId: user.id })

    return { success: true, authUrl }
  } catch (error) {
    logError(error, { action: 'initiateMPOAuth' })
    return {
      success: false,
      error: 'No se pudo iniciar la conexión con Mercado Pago.',
    }
  }
}

// ─── disconnectMercadoPago ───────────────────────────────────────────────────

/**
 * Disconnects the current account's Mercado Pago integration.
 * Requires owner or admin role.
 */
export async function disconnectMercadoPago(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    await disconnectMPAccount(accountId)

    revalidatePath('/account')
    logger.info('MP account disconnected via action', {
      accountId,
      userId: user.id,
    })

    return { success: true }
  } catch (error) {
    logError(error, { action: 'disconnectMercadoPago' })
    return {
      success: false,
      error: 'No se pudo desconectar Mercado Pago.',
    }
  }
}

// ─── getMPStatus ─────────────────────────────────────────────────────────────

/**
 * Returns the current MP connection status for the authenticated user's account.
 */
export async function getMPStatus(): Promise<{
  connected: boolean
  providerUserId: string | null
  connectedAt: string | null
}> {
  try {
    const { accountId } = await getCurrentUserWithAccount()
    return await getMPConnectionStatus(accountId)
  } catch (error) {
    logError(error, { action: 'getMPStatus' })
    return { connected: false, providerUserId: null, connectedAt: null }
  }
}
