'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Building2, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Database } from '@/types/database.types'
import { motion } from 'framer-motion'
import Image from 'next/image'

type Property = Pick<Database['public']['Tables']['properties']['Row'], 'id' | 'name' | 'address' | 'created_at' | 'cover_image_url'>

interface Props {
  properties: Property[]
  total: number
  currentPage: number
  limit: number
  isArchived?: boolean
}

export function PropertiesGridClient({ properties, total, currentPage, limit, isArchived = false }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')

  const totalPages = Math.ceil(total / limit)

  const handleSearch = (value: string) => {
    setSearch(value)
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set('q', value)
        params.set('page', '1')
      } else {
        params.delete('q')
      }
      router.push(`/properties?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', page.toString())
      router.push(`/properties?${params.toString()}`)
    })
  }

  return (
    <>
      {!isArchived && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o dirección..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
            disabled={isPending}
          />
        </div>
      )}

      <motion.div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isPending ? 'opacity-50' : ''}`}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05
            }
          }
        }}
      >
        {properties.map((property) => (
          <motion.div
            key={property.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <Link href={`/properties/${property.id}`}>
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Card className="hover:shadow-lg transition-shadow group cursor-pointer h-full overflow-hidden">
                  {/* Imagen de portada */}
                  <div className="relative h-40 bg-muted">
                    {property.cover_image_url ? (
                      <Image
                        src={property.cover_image_url}
                        alt={property.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <Building2 className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-4 pb-4">
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {property.name}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{property.address}</span>
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Agregada el {new Date(property.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {properties.length === 0 && search && (
        <p className="text-center text-muted-foreground py-8">
          No se encontraron propiedades para &quot;{search}&quot;
        </p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages} ({total} propiedades en total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isPending}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isPending}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
