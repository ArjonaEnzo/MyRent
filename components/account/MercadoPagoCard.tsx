'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wallet, ExternalLink, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { initiateMPOAuth, disconnectMercadoPago } from '@/lib/actions/mp-oauth'
import { useLanguage } from '@/components/providers/language-provider'

interface MercadoPagoCardProps {
  initialStatus: {
    connected: boolean
    providerUserId: string | null
    connectedAt: string | null
  }
  mpOAuthEnabled: boolean
}

export function MercadoPagoCard({ initialStatus, mpOAuthEnabled }: MercadoPagoCardProps) {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState(initialStatus)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Show toast feedback based on URL search params
  useEffect(() => {
    const mp = searchParams.get('mp')
    if (mp === 'connected') {
      toast.success(t.account.mercadopago.successToast)
    } else if (mp === 'error') {
      toast.error(t.account.mercadopago.errorToast)
    }
  }, [searchParams, t])

  const handleConnect = useCallback(async () => {
    setIsConnecting(true)
    try {
      const result = await initiateMPOAuth()
      if (result.success) {
        window.location.href = result.authUrl
        return
      }
      toast.error(result.error)
    } catch {
      toast.error(t.account.mercadopago.errorToast)
    } finally {
      setIsConnecting(false)
    }
  }, [t])

  const handleDisconnect = useCallback(async () => {
    const confirmed = window.confirm(t.account.mercadopago.disconnectConfirm)
    if (!confirmed) return

    setIsDisconnecting(true)
    try {
      const result = await disconnectMercadoPago()
      if (result.success) {
        setStatus({ connected: false, providerUserId: null, connectedAt: null })
        toast.success(t.account.mercadopago.disconnectSuccess)
      } else if (!result.success) {
        toast.error(result.error || t.account.mercadopago.disconnectError)
      }
    } catch {
      toast.error(t.account.mercadopago.disconnectError)
    } finally {
      setIsDisconnecting(false)
    }
  }, [t])

  const formattedDate = status.connectedAt
    ? new Date(status.connectedAt).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-lg ${
              status.connected
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-blue-100 dark:bg-blue-900/30'
            }`}
          >
            <Wallet
              className={`h-5 w-5 ${
                status.connected
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle>{t.account.mercadopago.title}</CardTitle>
              {status.connected && (
                <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                  {t.account.mercadopago.connected}
                </Badge>
              )}
            </div>
            <CardDescription>{t.account.mercadopago.subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!mpOAuthEnabled ? (
          <p className="text-sm text-muted-foreground">
            {t.account.mercadopago.notConfigured}
          </p>
        ) : status.connected ? (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              {status.providerUserId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t.account.mercadopago.connectedAs}
                  </span>
                  <span className="font-mono">{status.providerUserId}</span>
                </div>
              )}
              {formattedDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t.account.mercadopago.connectedSince}
                  </span>
                  <span>{formattedDate}</span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-destructive hover:text-destructive"
            >
              <Unplug className="h-4 w-4 mr-2" />
              {isDisconnecting
                ? t.account.mercadopago.disconnecting
                : t.account.mercadopago.disconnect}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-[#009ee3] hover:bg-[#007eb5] text-white"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {isConnecting
              ? t.account.mercadopago.connecting
              : t.account.mercadopago.connect}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
