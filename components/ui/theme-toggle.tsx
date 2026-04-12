'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState, memo } from 'react'
import { motion } from 'framer-motion'

export const ThemeToggle = memo(function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
    )
  }

  const isDark = theme === 'dark'

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 transition-all duration-300 shadow-sm border border-border/60"
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{
          scale: isDark ? 0 : 1,
          rotate: isDark ? 90 : 0,
          opacity: isDark ? 0 : 1,
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Sun className="h-4 w-4 text-amber-600" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          scale: isDark ? 1 : 0,
          rotate: isDark ? 0 : -90,
          opacity: isDark ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Moon className="h-4 w-4 text-foreground" />
      </motion.div>
    </motion.button>
  )
})
