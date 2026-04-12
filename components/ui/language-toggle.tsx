'use client'

import { Languages } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo, memo } from 'react'

const languages = [
  { code: 'es' as const, label: 'Español', flag: '🇦🇷' },
  { code: 'en' as const, label: 'English', flag: '🇺🇸' },
] as const

export const LanguageToggle = memo(function LanguageToggle() {
  const { locale, setLocale } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  const currentLanguage = useMemo(
    () => languages.find((lang) => lang.code === locale),
    [locale]
  )

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 rounded-lg bg-muted flex items-center gap-2 hover:bg-primary/10 transition-all duration-300 shadow-sm border border-border/60"
        aria-label="Change language"
      >
        <Languages className="h-4 w-4 text-foreground" />
        <span className="text-sm font-medium text-foreground">
          {currentLanguage?.flag}
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-12 z-50 w-48 rounded-lg bg-popover border border-border shadow-xl overflow-hidden"
            >
              {languages.map((lang) => (
                <motion.button
                  key={lang.code}
                  whileHover={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}
                  onClick={() => {
                    setLocale(lang.code)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-sm transition-colors ${
                    locale === lang.code
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {locale === lang.code && (
                    <motion.div
                      layoutId="activeLanguage"
                      className="ml-auto h-2 w-2 rounded-full bg-primary"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
})
