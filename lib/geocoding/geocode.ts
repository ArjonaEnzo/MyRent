import { env } from '@/lib/env'
import { logger } from '@/lib/utils/logger'

export interface GeocodeResult {
  latitude: number
  longitude: number
  place_id?: string
}

/**
 * Server-side geocoding via Google Geocoding API.
 * Fail-open: returns null on any error. Callers should save the record
 * without coordinates and optionally retry later.
 *
 * Uses GOOGLE_MAPS_SERVER_KEY (IP-restricted), NOT the public autocomplete key.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = env.GOOGLE_MAPS_SERVER_KEY
  if (!apiKey) {
    logger.warn('GOOGLE_MAPS_SERVER_KEY not set — skipping geocoding')
    return null
  }

  if (!address?.trim()) return null

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('address', address)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('region', 'ar')

    const response = await fetch(url.toString(), {
      // No retries — keep it cheap. Caller can re-run if needed.
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      logger.error('Geocoding HTTP error', { status: response.status })
      return null
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results?.length) {
      logger.warn('Geocoding returned no results', { status: data.status })
      return null
    }

    const result = data.results[0]
    const loc = result.geometry?.location
    if (!loc?.lat || !loc?.lng) return null

    return {
      latitude: loc.lat,
      longitude: loc.lng,
      place_id: result.place_id,
    }
  } catch (error) {
    logger.error('Geocoding failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
