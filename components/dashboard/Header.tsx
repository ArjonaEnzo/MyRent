'use client'

import { logout } from '@/lib/actions/auth'
import { useState, useMemo, useCallback, memo } from 'react'
import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MobileSidebar } from './MobileSidebar'
import { motion } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useLanguage } from '@/components/providers/language-provider'

interface HeaderProps {
  userEmail: string
}

export const Header = memo(function Header({ userEmail }: HeaderProps) {
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()

  const handleLogout = useCallback(async () => {
    setLoading(true)
    await logout()
  }, [])

  const initials = useMemo(
    () => userEmail.split('@')[0].slice(0, 2).toUpperCase(),
    [userEmail]
  )

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-card/80 backdrop-blur-sm px-4 sm:px-6 shadow-sm"
    >
      <MobileSidebar />

      <div className="flex-1" />

      {/* Theme and Language toggles */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" className="gap-2 hover:bg-primary/5">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground shadow-md">
                {initials}
              </div>
              <span className="hidden sm:inline text-sm text-foreground font-medium">
                {userEmail}
              </span>
            </Button>
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium text-foreground">{userEmail}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/account" className="w-full flex items-center cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              {t.header.account}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <button className="w-full" onClick={handleLogout} disabled={loading}>
              <LogOut className="mr-2 h-4 w-4" />
              {loading ? t.header.loggingOut : t.header.logout}
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.header>
  )
})
