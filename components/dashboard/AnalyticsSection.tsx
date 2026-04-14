'use client'

import { motion } from 'framer-motion'
import { MonthlyRevenueChart, type MonthlyRevenueData } from './MonthlyRevenueChart'
import { CollectionPanel } from './CollectionPanel'

interface AnalyticsSectionProps {
  revenueData: MonthlyRevenueData[]
  revenueCurrency: string
  collectionRate: {
    totalReceipts: number
    paidReceipts: number
    totalExpected: number
    totalCollected: number
    currency: string
    previousCollected?: number
  }
}

export function AnalyticsSection({ revenueData, revenueCurrency, collectionRate }: AnalyticsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.08 }}
      className="grid grid-cols-1 gap-4 lg:grid-cols-3"
    >
      <div className="lg:col-span-2">
        <MonthlyRevenueChart
          data={revenueData}
          currency={revenueCurrency}
        />
      </div>
      <div>
        <CollectionPanel {...collectionRate} />
      </div>
    </motion.div>
  )
}
