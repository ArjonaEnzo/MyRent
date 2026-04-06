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
        className="h-9 px-3 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center gap-2 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/20 dark:hover:to-teal-900/20 transition-all duration-300 shadow-sm border border-slate-200 dark:border-slate-700"
        aria-label="Change language"
      >
        <Languages className="h-4 w-4 text-slate-700 dark:text-slate-300" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
              className="absolute right-0 top-12 z-50 w-48 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden"
            >
              {languages.map((lang) => (
                <motion.button
                  key={lang.code}
                  whileHover={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                  onClick={() => {
                    setLocale(lang.code)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-sm transition-colors ${
                    locale === lang.code
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 text-emerald-700 dark:text-emerald-400 font-medium'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {locale === lang.code && (
                    <motion.div
                      layoutId="activeLanguage"
                      className="ml-auto h-2 w-2 rounded-full bg-emerald-500"
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
