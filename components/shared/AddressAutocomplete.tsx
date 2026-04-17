'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { AlertTriangle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Structured address parts parsed from a Google Places result.
 * All fields optional — some addresses (e.g. a plaza) have no street number.
 */
export interface AddressParts {
  formatted_address: string
  street_name?: string
  street_number?: string
  city?: string
  province?: string
  postal_code?: string
  country?: string
  latitude?: number
  longitude?: number
  google_place_id?: string
}

interface AddressAutocompleteProps {
  name: string
  label: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  error?: string
  onFocus?: () => void
  onAddressSelect?: (parts: AddressParts) => void
}

// Province normalization — Google returns short names we map to full names.
const PROVINCE_NORMALIZATIONS: Array<[string, string]> = [
  ['Buenos Aires', 'Provincia de Buenos Aires'],
  ['CABA', 'Ciudad Autónoma de Buenos Aires'],
]

function normalizeProvince(name: string): string {
  for (const [from, to] of PROVINCE_NORMALIZATIONS) {
    if (name === from) return to
  }
  return name
}

function buildFormattedAddress(parts: AddressParts, overrideNumber?: string): string {
  const num = overrideNumber ?? parts.street_number
  const streetPart = [parts.street_name, num].filter(Boolean).join(' ')
  return [streetPart, parts.city, parts.province].filter(Boolean).join(', ')
}

/**
 * Parses a Place (new Places API) into our structured parts.
 * The new API returns `addressComponents` (camelCase) instead of snake_case.
 */
function parseAddressComponents(place: google.maps.places.Place): AddressParts {
  const parts: AddressParts = {
    formatted_address: place.formattedAddress ?? '',
    google_place_id: place.id ?? undefined,
  }

  if (place.location) {
    parts.latitude = place.location.lat()
    parts.longitude = place.location.lng()
  }

  place.addressComponents?.forEach((c) => {
    const type = c.types?.[0]
    switch (type) {
      case 'street_number':
        parts.street_number = c.longText ?? undefined
        break
      case 'route':
        parts.street_name = c.longText ?? undefined
        break
      case 'locality':
      case 'administrative_area_level_2':
        if (!parts.city) parts.city = c.longText ?? undefined
        break
      case 'administrative_area_level_1':
        parts.province = c.longText ? normalizeProvince(c.longText) : undefined
        break
      case 'postal_code':
        parts.postal_code = c.longText ?? undefined
        break
      case 'country':
        parts.country = c.shortText ?? undefined
        break
    }
  })

  return parts
}

let configured = false
function ensureConfigured(): boolean {
  if (configured) return true
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return false
  setOptions({ key: apiKey })
  configured = true
  return true
}

export function AddressAutocomplete({
  name,
  label,
  defaultValue = '',
  placeholder,
  required,
  error,
  onFocus,
  onAddressSelect,
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)
  const [loaded, setLoaded] = useState(false)
  const [partsState, setPartsState] = useState<AddressParts | null>(null)
  const [manualNumber, setManualNumber] = useState('')
  const [missingNumber, setMissingNumber] = useState(false)

  const fieldId = name
  const errorId = `${fieldId}-error`

  const handlePlaceSelect = useCallback(
    async (place: google.maps.places.Place) => {
      // Fetch full details — the element only returns place_id + basic data by default.
      try {
        await place.fetchFields({
          fields: ['addressComponents', 'formattedAddress', 'location', 'id'],
        })
      } catch (err) {
        console.error('Failed to fetch place fields', err)
        return
      }

      const parts = parseAddressComponents(place)
      setPartsState(parts)
      setManualNumber('')

      const hasNumber = Boolean(parts.street_number)
      setMissingNumber(!hasNumber)

      const formatted = parts.formatted_address || buildFormattedAddress(parts)
      setValue(formatted)

      onAddressSelect?.({ ...parts, formatted_address: formatted })
    },
    [onAddressSelect],
  )

  const handleManualNumberChange = useCallback(
    (num: string) => {
      setManualNumber(num)
      if (!partsState) return
      const updated: AddressParts = {
        ...partsState,
        street_number: num || partsState.street_number,
        formatted_address: buildFormattedAddress(partsState, num || undefined),
      }
      setValue(updated.formatted_address)
      onAddressSelect?.(updated)
    },
    [partsState, onAddressSelect],
  )

  useEffect(() => {
    if (!ensureConfigured() || !containerRef.current) return

    let cancelled = false
    let element: google.maps.places.PlaceAutocompleteElement | null = null
    let placeSelectListener: google.maps.MapsEventListener | null = null

    importLibrary('places').then((placesLib) => {
      if (cancelled || !containerRef.current) return

      // `PlaceAutocompleteElement` is the new API (Web Component) replacing
      // the deprecated `google.maps.places.Autocomplete`.
      const { PlaceAutocompleteElement } = placesLib as unknown as {
        PlaceAutocompleteElement: new (
          options: google.maps.places.PlaceAutocompleteElementOptions,
        ) => google.maps.places.PlaceAutocompleteElement
      }

      element = new PlaceAutocompleteElement({
        includedRegionCodes: ['ar'],
      })

      // Inherit styles so the element matches our Input look.
      element.id = fieldId
      if (placeholder) element.setAttribute('placeholder', placeholder)
      element.className =
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm'

      if (defaultValue) {
        // Surface pre-existing address when editing.
        element.setAttribute('value', defaultValue)
      }

      const selectHandler = async (event: Event) => {
        const e = event as unknown as {
          placePrediction: google.maps.places.PlacePrediction
        }
        const place = e.placePrediction.toPlace()
        await handlePlaceSelect(place)
      }
      // Fallback: keep React state in sync with raw text when the user types
      // without picking a suggestion. Server-side geocoding fills lat/lng later.
      const inputHandler = (event: Event) => {
        const typed = (event.target as HTMLInputElement | null)?.value ?? ''
        setValue(typed)
      }
      element.addEventListener('gmp-select', selectHandler)
      element.addEventListener('input', inputHandler)
      placeSelectListener = {
        remove: () => {
          element?.removeEventListener('gmp-select', selectHandler)
          element?.removeEventListener('input', inputHandler)
        },
      } as google.maps.MapsEventListener

      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(element as unknown as Node)

      setLoaded(true)
    })

    return () => {
      cancelled = true
      if (placeSelectListener) placeSelectListener.remove()
      if (element && containerRef.current?.contains(element as unknown as Node)) {
        containerRef.current.removeChild(element as unknown as Node)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlePlaceSelect])

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div
        ref={containerRef}
        className={cn(error && '[&_input]:border-destructive')}
        onFocus={onFocus}
      />
      {/* Hidden input holds the address value for form submission */}
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        value={value}
        readOnly
        required={required}
      />

      {missingNumber && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              No encontramos el número de calle. Podés agregarlo manualmente.
            </p>
            <Input
              placeholder="ej. 1234"
              value={manualNumber}
              onChange={(e) => handleManualNumberChange(e.target.value)}
              className="h-8 text-sm"
              autoComplete="off"
            />
          </div>
        </div>
      )}

      {!loaded && !error && (
        <p className="text-xs text-muted-foreground">
          Cargando autocompletado…
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
