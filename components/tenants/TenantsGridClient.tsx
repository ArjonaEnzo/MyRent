'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Users, Search, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
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

interface TenantRow {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  created_at: string
}

interface Props {
  tenants: TenantRow[]
  total: number
  currentPage: number
  limit: number
  isArchived?: boolean
}

// ─── Visual card (shared between inline and overlay) ─────────────────────────

function TenantCard({ tenant, isOverlay = false }: { tenant: TenantRow; isOverlay?: boolean }) {
  return (
    <Card
      className={`transition-all group h-full ${
        isOverlay
          ? 'shadow-2xl ring-2 ring-primary/30 cursor-grabbing'
          : 'hover:shadow-lg cursor-grab'
      }`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {tenant.full_name}
            </h3>
          </div>
          <div className="rounded-full bg-primary/10 p-2 ml-3 shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          {tenant.email && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tenant.email}</span>
            </p>
          )}
          {tenant.phone && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tenant.phone}</span>
            </p>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Agregado el {new Date(tenant.created_at).toLocaleDateString('es-AR')}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Sortable wrapper per card ────────────────────────────────────────────────

function SortableTenantCard({ tenant, isArchived }: { tenant: TenantRow; isArchived: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tenant.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  const card = <TenantCard tenant={tenant} />

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {isArchived ? card : (
        <Link href={`/tenants/${tenant.id}`} draggable={false}>
          {card}
        </Link>
      )}
    </div>
  )
}

// ─── Main grid component ──────────────────────────────────────────────────────

export function TenantsGridClient({ tenants, total, currentPage, limit, isArchived = false }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [items, setItems] = useState<TenantRow[]>(tenants)
  const [activeId, setActiveId] = useState<string | null>(null)

  const activeTenant = items.find((t) => t.id === activeId) ?? null
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
        const oldIndex = prev.findIndex((t) => t.id === active.id)
        const newIndex = prev.findIndex((t) => t.id === over.id)
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
      router.push(`/tenants?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', page.toString())
      router.push(`/tenants?${params.toString()}`)
    })
  }

  return (
    <>
      {!isArchived && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
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
        <SortableContext items={items.map((t) => t.id)} strategy={rectSortingStrategy}>
          <motion.div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isPending ? 'opacity-50' : ''}`}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
            }}
          >
            {items.map((tenant) => (
              <motion.div
                key={tenant.id}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                layout
              >
                <SortableTenantCard tenant={tenant} isArchived={isArchived} />
              </motion.div>
            ))}
          </motion.div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTenant ? (
            <motion.div
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: 1.05, rotate: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <TenantCard tenant={activeTenant} isOverlay />
            </motion.div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {items.length === 0 && search && (
        <p className="text-center text-muted-foreground py-8">
          No se encontraron inquilinos para &quot;{search}&quot;
        </p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages} ({total} inquilinos en total)
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
