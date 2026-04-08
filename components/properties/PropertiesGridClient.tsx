'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Building2, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { PropertyWithActiveLease } from '@/lib/actions/properties'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Property = PropertyWithActiveLease

interface Props {
  properties: Property[]
  total: number
  currentPage: number
  limit: number
  isArchived?: boolean
}

// ─── Visual card (shared between inline and overlay) ─────────────────────────

function PropertyCard({ property, isOverlay = false }: { property: Property; isOverlay?: boolean }) {
  return (
    <Card
      className={`transition-all group h-full overflow-hidden ${
        isOverlay
          ? 'shadow-2xl ring-2 ring-primary/30 cursor-grabbing'
          : 'hover:shadow-lg cursor-grab'
      }`}
    >
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
        {property.active_lease && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
            Activo
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
        {property.active_lease ? (
          <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">{property.active_lease.tenant_name ?? 'Inquilino activo'}</span>
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground/60">
            Sin contrato activo
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Agregada el {new Date(property.created_at).toLocaleDateString('es-AR')}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Sortable wrapper per card ────────────────────────────────────────────────

function SortablePropertyCard({ property, isArchived }: { property: Property; isArchived: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: property.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  const card = <PropertyCard property={property} />

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {isArchived ? card : (
        <Link href={`/properties/${property.id}`} draggable={false}>
          {card}
        </Link>
      )}
    </div>
  )
}

// ─── Main grid component ──────────────────────────────────────────────────────

export function PropertiesGridClient({ properties, total, currentPage, limit, isArchived = false }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [items, setItems] = useState<Property[]>(properties)
  const [activeId, setActiveId] = useState<string | null>(null)

  const activeProp = items.find((p) => p.id === activeId) ?? null
  const totalPages = Math.ceil(total / limit)

  // Long press activation: 250ms hold starts drag, short press = click/navigate
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((p) => p.id === active.id)
        const newIndex = prev.findIndex((p) => p.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((p) => p.id)} strategy={rectSortingStrategy}>
          <motion.div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isPending ? 'opacity-50' : ''}`}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
            }}
          >
            {items.map((property) => (
              <motion.div
                key={property.id}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                layout
              >
                <SortablePropertyCard property={property} isArchived={isArchived} />
              </motion.div>
            ))}
          </motion.div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeProp ? (
            <motion.div
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: 1.05, rotate: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <PropertyCard property={activeProp} isOverlay />
            </motion.div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {items.length === 0 && search && (
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
