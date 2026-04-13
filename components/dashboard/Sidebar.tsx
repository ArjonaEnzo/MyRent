'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import Image from 'next/image'
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  ScrollText,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/components/providers/language-provider'

interface SidebarProps {
  userEmail: string
  avatarUrl?: string | null
}

export const Sidebar = memo(function Sidebar({ userEmail, avatarUrl }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { t } = useLanguage()

  const navItems = useMemo(
    () => [
      { href: '/dashboard', label: t.sidebar.dashboard, icon: LayoutDashboard },
      { href: '/properties', label: t.sidebar.properties, icon: Building2 },
      { href: '/tenants', label: t.sidebar.tenants, icon: Users },
      { href: '/leases', label: t.sidebar.leases, icon: ScrollText },
      { href: '/receipts', label: t.sidebar.receipts, icon: FileText },
    ],
    [t]
  )

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  const toggleCollapsed = useCallback(() => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }, [collapsed])

  const initials = useMemo(
    () => userEmail.split('@')[0].slice(0, 2).toUpperCase(),
    [userEmail]
  )

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'hidden lg:flex flex-col bg-gradient-to-b from-card to-background text-foreground border-r border-border/60 transition-all duration-300 shadow-sm',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      <div className={cn('flex items-center h-16 px-4 border-b border-border/60', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            MyRent
          </Link>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </motion.button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative overflow-hidden group',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/5',
                  collapsed && 'justify-center px-2'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                </motion.div>
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          )
        })}
      </nav>

      <div className={cn('border-t border-border/60 p-3', collapsed ? 'flex justify-center' : '')}>
        <Link href="/account">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
            className={cn('flex items-center gap-3 rounded-lg p-1.5 hover:bg-muted transition-colors', collapsed && 'justify-center')}
          >
            <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0 shadow-md ring-1 ring-border">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={`Avatar de ${userEmail}`} fill className="object-cover" unoptimized />
              ) : (
                <div className="h-full w-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                  {initials}
                </div>
              )}
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-muted-foreground font-medium overflow-hidden whitespace-nowrap"
                >
                  Mi cuenta
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </Link>
      </div>
    </motion.aside>
  )
})
