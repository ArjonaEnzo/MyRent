import { MapPin } from 'lucide-react'

interface PropertyMapProps {
  latitude: number
  longitude: number
  address: string
  apiKey: string | undefined
}

/**
 * Server-rendered Static Map from Google Maps.
 * Uses GOOGLE_MAPS_SERVER_KEY (not the public autocomplete key) because
 * Static Maps is cheap and billed per-load on the server.
 *
 * Falls back to a plain address display when no API key is configured.
 */
export function PropertyMap({ latitude, longitude, address, apiKey }: PropertyMapProps) {
  if (!apiKey) {
    return (
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Ubicación</p>
          <p className="text-sm text-muted-foreground">{address}</p>
        </div>
      </div>
    )
  }

  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: '15',
    size: '640x320',
    scale: '2',
    markers: `color:red|${latitude},${longitude}`,
    key: apiKey,
  })

  const src = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{address}</p>
      </div>
      <a
        href={directionsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg border hover:opacity-90 transition-opacity"
      >
        <img
          src={src}
          alt={`Mapa de ${address}`}
          width={640}
          height={320}
          className="w-full h-auto"
          loading="lazy"
        />
      </a>
      <p className="text-xs text-muted-foreground">
        Click en el mapa para abrir en Google Maps
      </p>
    </div>
  )
}
