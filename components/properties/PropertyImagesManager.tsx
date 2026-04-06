'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { uploadPropertyImages, setCoverImage, deletePropertyImage } from '@/lib/actions/properties'
import { Button } from '@/components/ui/button'
import { Upload, Star, Trash2, ImageIcon } from 'lucide-react'
import type { PropertyImage } from '@/types/database.types'
import Image from 'next/image'

const MAX_IMAGES = 6
const ACCEPTED = 'image/jpeg,image/png,image/webp'

export function PropertyImagesManager({
  propertyId,
  images,
}: {
  propertyId: string
  images: PropertyImage[]
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remaining = MAX_IMAGES - images.length

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setError(null)
    setUploading(true)

    // Serializar a arrays de bytes para pasar al server action
    const serialized = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        type: f.type,
        buffer: Array.from(new Uint8Array(await f.arrayBuffer())),
      }))
    )

    const result = await uploadPropertyImages(propertyId, serialized)
    setUploading(false)

    if (!result.success) {
      setError(result.error ?? 'Error al subir')
    } else {
      router.refresh()
    }

    // Reset input
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleSetCover(imageId: string) {
    await setCoverImage(propertyId, imageId)
    router.refresh()
  }

  async function handleDelete(imageId: string) {
    await deletePropertyImage(propertyId, imageId)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Imágenes ({images.length}/{MAX_IMAGES})
        </p>
        {remaining > 0 && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              className="hidden"
              onChange={handleFiles}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Subiendo...' : 'Subir fotos'}
            </Button>
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {images.length === 0 ? (
        <div
          onClick={() => remaining > 0 && inputRef.current?.click()}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-10 gap-2 text-muted-foreground cursor-pointer hover:border-muted-foreground/50 transition-colors"
        >
          <ImageIcon className="h-8 w-8" />
          <p className="text-sm">Hacé clic para subir fotos</p>
          <p className="text-xs">JPG, PNG o WebP — máx. 6 fotos</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-video rounded-lg overflow-hidden border bg-muted">
              <Image
                src={img.url}
                alt="Foto de propiedad"
                fill
                className="object-cover"
                unoptimized
              />
              {img.is_cover && (
                <span className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                  <Star className="h-3 w-3" /> Portada
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!img.is_cover && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => handleSetCover(img.id)}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    Portada
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={() => handleDelete(img.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {remaining > 0 && (
            <div
              onClick={() => inputRef.current?.click()}
              className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 text-muted-foreground cursor-pointer hover:border-muted-foreground/50 transition-colors"
            >
              <Upload className="h-5 w-5" />
              <span className="text-xs">Agregar</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
