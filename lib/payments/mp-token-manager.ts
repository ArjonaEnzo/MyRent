/**
 * Mercado Pago OAuth Token Manager
 *
 * Manages per-account MP OAuth tokens stored in `account_payment_providers`.
 * Handles token retrieval, automatic refresh, storage, and disconnection.
 *
 * Uses `createAdminClient()` (service-role) for all DB operations because:
 *   - Webhook handlers don't have user context
 *   - RLS would block tenant access to owner tokens
 *   - Token refresh runs in background without user session
 */

import { createAdminClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { logger } from '@/lib/utils/logger'

// 5-minute buffer before actual expiry for preventive refresh
const REFRESH_BUFFER_MS = 5 * 60 * 1000

/**
 * Retrieves the MP access token for a given account.
 *
 * Resolution order:
 *   1. account_payment_providers row for provider='mercadopago' (not disconnected)
 *      - If token is fresh, return it
 *      - If token is expired/about to expire, refresh it first
 *   2. Fall back to env.MERCADOPAGO_ACCESS_TOKEN (global/platform token)
 *   3. Return null if nothing is configured
 */
export async function getMPAccessTokenForAccount(
  accountId: string
): Promise<{ accessToken: string; isAccountSpecific: boolean } | null> {
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('account_payment_providers')
    .select('access_token, refresh_token, expires_at')
    .eq('account_id', accountId)
    .eq('provider', 'mercadopago')
    .is('disconnected_at', null)
    .maybeSingle()

  if (error) {
    logger.error('Failed to query account_payment_providers', {
      accountId,
      error: error.message,
    })
    // Fall through to global token
  }

  if (row) {
    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null
    const now = Date.now()
    const isExpired = expiresAt !== null && expiresAt < now + REFRESH_BUFFER_MS

    if (!isExpired) {
      return { accessToken: row.access_token, isAccountSpecific: true }
    }

    // Token is expired or about to expire — refresh it
    if (row.refresh_token) {
      try {
        const newAccessToken = await refreshMPToken(accountId, row.refresh_token)
        return { accessToken: newAccessToken, isAccountSpecific: true }
      } catch (refreshError) {
        logger.error('MP token refresh failed, falling back to global token', {
          accountId,
          error:
            refreshError instanceof Error
              ? refreshError.message
              : String(refreshError),
        })
        // Fall through to global token
      }
    } else {
      logger.warn('MP token expired but no refresh_token available', {
        accountId,
      })
    }
  }

  // Fallback: global platform token
  if (env.MERCADOPAGO_ACCESS_TOKEN) {
    return { accessToken: env.MERCADOPAGO_ACCESS_TOKEN, isAccountSpecific: false }
  }

  return null
}

/**
 * Refreshes an expired MP OAuth token.
 *
 * POST https://api.mercadopago.com/oauth/token
 *   grant_type=refresh_token
 *   client_secret=MERCADOPAGO_CLIENT_SECRET
 *   refresh_token=<current refresh token>
 *
 * Updates the row in account_payment_providers with the new tokens and expiry.
 *
 * @returns The new access token
 * @throws Error if the refresh request fails or CLIENT_SECRET is missing
 */
async function refreshMPToken(
  accountId: string,
  refreshToken: string
): Promise<string> {
  if (!env.MERCADOPAGO_CLIENT_SECRET) {
    throw new Error(
      'MERCADOPAGO_CLIENT_SECRET not configured — cannot refresh MP token'
    )
  }

  logger.info('Refreshing MP OAuth token', { accountId })

  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_secret: env.MERCADOPAGO_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'no body')
    throw new Error(
      `MP token refresh failed (${response.status}): ${errorText}`
    )
  }

  const data = await response.json()

  if (!data.access_token) {
    throw new Error('MP token refresh response missing access_token')
  }

  // Calculate expiry timestamp
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null

  // Update the stored tokens
  const supabase = createAdminClient()
  const { error: updateError } = await supabase
    .from('account_payment_providers')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? refreshToken,
      expires_at: expiresAt,
      public_key: data.public_key ?? null,
      scope: data.scope ?? null,
    })
    .eq('account_id', accountId)
    .eq('provider', 'mercadopago')

  if (updateError) {
    logger.error('Failed to persist refreshed MP tokens', {
      accountId,
      error: updateError.message,
    })
    // Still return the token — it's valid even if we couldn't persist it
  }

  logger.info('MP OAuth token refreshed successfully', { accountId })
  return data.access_token as string
}

/**
 * Stores OAuth tokens after initial authorization code exchange.
 *
 * Upserts into account_payment_providers using the unique constraint
 * on (account_id, provider). If a row already exists (e.g., reconnecting
 * after disconnect), it updates the tokens and clears disconnected_at.
 */
export async function storeMPOAuthTokens(params: {
  accountId: string
  accessToken: string
  refreshToken: string
  publicKey: string | null
  providerUserId: string
  expiresIn: number
  scope: string | null
}): Promise<void> {
  const supabase = createAdminClient()

  const expiresAt = params.expiresIn
    ? new Date(Date.now() + params.expiresIn * 1000).toISOString()
    : null

  const { error } = await supabase
    .from('account_payment_providers')
    .upsert(
      {
        account_id: params.accountId,
        provider: 'mercadopago',
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
        public_key: params.publicKey,
        provider_user_id: params.providerUserId,
        expires_at: expiresAt,
        scope: params.scope,
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        metadata: {},
      },
      { onConflict: 'account_id,provider' }
    )

  if (error) {
    logger.error('Failed to store MP OAuth tokens', {
      accountId: params.accountId,
      error: error.message,
    })
    throw new Error(`Failed to store MP OAuth tokens: ${error.message}`)
  }

  logger.info('MP OAuth tokens stored', {
    accountId: params.accountId,
    providerUserId: params.providerUserId,
  })
}

/**
 * Disconnects the MP account for a given account.
 *
 * Sets disconnected_at, clears the access_token (replaced with 'revoked'),
 * and nulls out the refresh_token. The row is preserved for audit purposes.
 */
export async function disconnectMPAccount(accountId: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('account_payment_providers')
    .update({
      disconnected_at: new Date().toISOString(),
      access_token: 'revoked',
      refresh_token: null,
    })
    .eq('account_id', accountId)
    .eq('provider', 'mercadopago')

  if (error) {
    logger.error('Failed to disconnect MP account', {
      accountId,
      error: error.message,
    })
    throw new Error(`Failed to disconnect MP account: ${error.message}`)
  }

  logger.info('MP account disconnected', { accountId })
}

/**
 * Returns the current MP connection status for a given account.
 * Used by the UI to show connection state and provider user ID.
 */
export async function getMPConnectionStatus(
  accountId: string
): Promise<{
  connected: boolean
  providerUserId: string | null
  connectedAt: string | null
}> {
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('account_payment_providers')
    .select('provider_user_id, connected_at')
    .eq('account_id', accountId)
    .eq('provider', 'mercadopago')
    .is('disconnected_at', null)
    .maybeSingle()

  if (error) {
    logger.error('Failed to query MP connection status', {
      accountId,
      error: error.message,
    })
    return { connected: false, providerUserId: null, connectedAt: null }
  }

  if (!row) {
    return { connected: false, providerUserId: null, connectedAt: null }
  }

  return {
    connected: true,
    providerUserId: row.provider_user_id,
    connectedAt: row.connected_at,
  }
}
