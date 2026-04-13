'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { OccupancyCard } from './OccupancyCard'
import { OperationalAlerts, type LeaseAlert } from './OperationalAlerts'

interface OccupancyAlertsSectionProps {
  occupancy: {
    totalProperties: number
    occupiedProperties: number
  }
  alerts: LeaseAlert[]
}

export function OccupancyAlertsSection({ occupancy, alerts }: OccupancyAlertsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="grid grid-cols-1 gap-4 lg:grid-cols-3"
    >
      <div>
        <OccupancyCard {...occupancy} />
      </div>
      <div className="lg:col-span-2">
        {alerts.length > 0 ? (
          <OperationalAlerts alerts={alerts} />
        ) : (
          <Card className="border border-border shadow-sm p-5 h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Sin alertas</p>
              <p className="text-xs text-muted-foreground mt-1">
                No hay contratos próximos a vencer ni ajustes pendientes
              </p>
            </div>
          </Card>
        )}
      </div>
    </motion.div>
  )
}
