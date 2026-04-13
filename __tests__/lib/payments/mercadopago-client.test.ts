import { describe, it, expect, vi } from 'vitest'
import { createHmac } from 'crypto'

// Mock @/lib/env before importing the module under test
vi.mock('@/lib/env', () => ({
  env: {
    MERCADOPAGO_ACCESS_TOKEN: 'TEST-fake-token',
    MERCADOPAGO_WEBHOOK_SECRET: 'test-secret',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}))

// Mock mercadopago SDK (not used in the functions we test, but imported at module level)
vi.mock('mercadopago', () => ({
  MercadoPagoConfig: vi.fn(),
  Payment: vi.fn(),
}))

import { verifyWebhookSignature, mapMPStatus } from '@/lib/payments/mercadopago-client'

// ─── Helper para generar firmas válidas ────────────────────────────────────────

function buildSignatureAndTs(params: {
  dataId: string
  requestId: string
  secret: string
  ts?: string
}): { xSignature: string; ts: string } {
  const ts = params.ts ?? Date.now().toString()
  const template = `id:${params.dataId};request-id:${params.requestId};ts:${ts};`
  const hash = createHmac('sha256', params.secret).update(template).digest('hex')
  return { xSignature: `ts=${ts},v1=${hash}`, ts }
}

const TEST_SECRET = 'test-webhook-secret-12345'
const TEST_DATA_ID = '12345678'
const TEST_REQUEST_ID = 'req-abc-123'

describe('verifyWebhookSignature', () => {
  it('acepta una firma válida', () => {
    const { xSignature } = buildSignatureAndTs({
      dataId: TEST_DATA_ID,
      requestId: TEST_REQUEST_ID,
      secret: TEST_SECRET,
    })

    const result = verifyWebhookSignature({
      xSignature,
      xRequestId: TEST_REQUEST_ID,
      dataId: TEST_DATA_ID,
      secret: TEST_SECRET,
    })

    expect(result).toBe(true)
  })

  it('rechaza una firma inválida', () => {
    const result = verifyWebhookSignature({
      xSignature: `ts=${Date.now()},v1=invalidsignaturehash`,
      xRequestId: TEST_REQUEST_ID,
      dataId: TEST_DATA_ID,
      secret: TEST_SECRET,
    })

    expect(result).toBe(false)
  })

  it('rechaza cuando falta x-signature (string vacio)', () => {
    const result = verifyWebhookSignature({
      xSignature: '',
      xRequestId: TEST_REQUEST_ID,
      dataId: TEST_DATA_ID,
      secret: TEST_SECRET,
    })

    expect(result).toBe(false)
  })

  it('rechaza cuando falta ts= en el header', () => {
    const result = verifyWebhookSignature({
      xSignature: 'v1=somehashvalue',
      xRequestId: TEST_REQUEST_ID,
      dataId: TEST_DATA_ID,
      secret: TEST_SECRET,
    })

    expect(result).toBe(false)
  })

  it('rechaza cuando falta v1= en el header', () => {
    const result = verifyWebhookSignature({
      xSignature: `ts=${Date.now()}`,
      xRequestId: TEST_REQUEST_ID,
      dataId: TEST_DATA_ID,
      secret: TEST_SECRET,
    })

    expect(result).toBe(false)
  })

  it('rechaza un timestamp demasiado antiguo (replay attack)', () => {
    const oldTs = (Date.now() - 2 * 60 * 60 * 1000).toString() // 2 hours ago
    const { xSignature } = buildSignatureAndTs({
      dataId: TEST_DATA_ID,
      requestId: TEST_REQUEST_ID,
      secret: TEST_SECRET,
      ts: oldTs,
    })

    const result = verifyWebhookSignature({
      xSignature,
      xRequestId: TEST_REQUEST_ID,
      dataId: TEST_DATA_ID,
      secret: TEST_SECRET,
    })

    expect(result).toBe(false)
  })

  it('rechaza cuando el secret es incorrecto', () => {
    const { xSignature } = buildSignatureAndTs({
      dataId: TEST_DATA_ID,
      requestId: TEST_REQUEST_ID,
      secret: TEST_SECRET,
    })

    const result = verifyWebhookSignature({
      xSignature,
      xRequestId: TEST_REQUEST_ID,
      dataId: TEST_DATA_ID,
      secret: 'wrong-secret',
    })

    expect(result).toBe(false)
  })
})

describe('mapMPStatus', () => {
  it('mapea approved a paid', () => {
    expect(mapMPStatus('approved')).toBe('paid')
  })

  it('mapea in_process a processing', () => {
    expect(mapMPStatus('in_process')).toBe('processing')
  })

  it('mapea authorized a processing', () => {
    expect(mapMPStatus('authorized')).toBe('processing')
  })

  it('mapea pending a processing', () => {
    expect(mapMPStatus('pending')).toBe('processing')
  })

  it('mapea in_mediation a processing', () => {
    expect(mapMPStatus('in_mediation')).toBe('processing')
  })

  it('mapea rejected a failed', () => {
    expect(mapMPStatus('rejected')).toBe('failed')
  })

  it('mapea cancelled a cancelled', () => {
    expect(mapMPStatus('cancelled')).toBe('cancelled')
  })

  it('mapea refunded a refunded', () => {
    expect(mapMPStatus('refunded')).toBe('refunded')
  })

  it('mapea charged_back a refunded', () => {
    expect(mapMPStatus('charged_back')).toBe('refunded')
  })

  it('mapea un status desconocido a processing (default)', () => {
    expect(mapMPStatus('unknown_status')).toBe('processing')
  })
})
