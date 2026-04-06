'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Users, Search, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'

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

export function TenantsGridClient({ tenants, total, currentPage, limit, isArchived = false }: Props) {
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
        {tenants.map((tenant) => (
          <motion.div
            key={tenant.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <Link href={`/tenants/${tenant.id}`}>
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Card className="hover:shadow-lg transition-shadow group cursor-pointer h-full">
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
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {tenants.length === 0 && search && (
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
