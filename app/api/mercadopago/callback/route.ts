import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { env } from '@/lib/env'
import { storeMPOAuthTokens } from '@/lib/payments/mp-token-manager'
import { logger, logError } from '@/lib/utils/logger'

/** Maximum age of the state parameter (10 minutes) */
const STATE_MAX_AGE_MS = 10 * 60 * 1000

/**
 * OAuth callback handler for Mercado Pago.
 *
 * Flow:
 *   1. MP redirects user here with `code` and `state` query params
 *   2. Validate the HMAC-signed state (prevents CSRF)
 *   3. Exchange the authorization code for tokens via MP API
 *   4. Store the tokens in account_payment_providers
 *   5. Redirect to /account with success or error indicator
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const appUrl = env.NEXT_PUBLIC_APP_URL

  // ── Validate inputs ──────────────────────────────────────────────────────

  if (!code || !state) {
    logger.warn('MP OAuth callback missing code or state')
    return NextResponse.redirect(
      `${appUrl}/account?mp=error&reason=missing_params`
    )
  }

  if (!env.MERCADOPAGO_CLIENT_SECRET || !env.MERCADOPAGO_APP_ID) {
    logger.error('MP OAuth callback called but APP_ID or CLIENT_SECRET not configured')
    return NextResponse.redirect(
      `${appUrl}/account?mp=error&reason=not_configured`
    )
  }

  // ── Validate state (HMAC + expiry) ────────────────────────────────────────

  const dotIndex = state.lastIndexOf('.')
  if (dotIndex === -1) {
    logger.warn('MP OAuth callback: malformed state (no dot separator)')
    return NextResponse.redirect(
      `${appUrl}/account?mp=error&reason=invalid_state`
    )
  }

  const base64Payload = state.substring(0, dotIndex)
  const receivedSignature = state.substring(dotIndex + 1)

  // Verify HMAC signature
  const expectedSignature = createHmac('sha256', env.MERCADOPAGO_CLIENT_SECRET)
    .update(base64Payload)
    .digest('hex')

  if (receivedSignature !== expectedSignature) {
    logger.warn('MP OAuth callback: invalid state signature')
    return NextResponse.redirect(
      `${appUrl}/account?mp=error&reason=invalid_state`
    )
  }

  // Decode and validate payload
  let statePayload: { accountId: string; nonce: string; ts: number }
  try {
    const decoded = Buffer.from(base64Payload, 'base64url').toString('utf-8')
    statePayload = JSON.parse(decoded)
  } catch {
    logger.warn('MP OAuth callback: could not decode state payload')
    return NextResponse.redirect(
      `${appUrl}/account?mp=error&reason=invalid_state`
    )
  }

  if (
    !statePayload.accountId ||
    !statePayload.ts ||
    typeof statePayload.ts !== 'number'
  ) {
    logger.warn('MP OAuth callback: state payload missing required fields')
    return NextResponse.redirect(
      `${appUrl}/account?mp=error&reason=invalid_state`
    )
  }

  // Check timestamp freshness
  const stateAge = Date.now() - statePayload.ts
  if (stateAge > STATE_MAX_AGE_MS || stateAge < 0) {
    logger.warn('MP OAuth callback: state expired', {
      ageMs: stateAge,
      accountId: statePayload.accountId,
    })
    return NextResponse.redirect(
      `${appUrl}/account?mp=error&reason=state_expired`
    )
  }

  // ── Exchange code for tokens ──────────────────────────────────────────────

  try {
    const tokenResponse = await fetch(
      'https://api.mercadopago.com/oauth/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_secret: env.MERCADOPAGO_CLIENT_SECRET,
          client_id: env.MERCADOPAGO_APP_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/mercadopago/callback`,
        }),
      }
    )

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => 'no body')
      logger.error('MP OAuth token exchange failed', {
        status: tokenResponse.status,
        body: errorText,
        accountId: statePayload.accountId,
      })
      return NextResponse.redirect(
        `${appUrl}/account?mp=error&reason=token_exchange_failed`
      )
    }

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token || !tokenData.refresh_token) {
      logger.error('MP OAuth token response missing required fields', {
        accountId: statePayload.accountId,
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
      })
      return NextResponse.redirect(
        `${appUrl}/account?mp=error&reason=invalid_token_response`
      )
    }

    // ── Store tokens ──────────────────────────────────────────────────────────

    await storeMPOAuthTokens({
      accountId: statePayload.accountId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      publicKey: tokenData.public_key ?? null,
      providerUserId: String(tokenData.user_id ?? ''),
      expiresIn: tokenData.expires_in ?? 21600,
      scope: tokenData.scope ?? null,
    })

    logger.info('MP OAuth flow completed successfully', {
      accountId: statePayload.accountId,
      providerUserId: tokenData.user_id,
    })

    return NextResponse.redirect(`${appUrl}/account?mp=connected`)
  } catch (error) {
    logError(error, {
      action: 'mp-oauth-callback',
      accountId: statePayload.accountId,
    })
    return NextResponse.redirect(
      `${appUrl}/account?mp=error&reason=unexpected_error`
    )
  }
}
