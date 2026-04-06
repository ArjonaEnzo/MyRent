'use client'

import Link from 'next/link'
import { Building2, FileText, Mail, DollarSign, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useLanguage } from '@/components/providers/language-provider'

export default function HomePage() {
  const { t } = useLanguage()

  const features = [
    {
      icon: Building2,
      title: t.home.features.property,
      description: t.home.features.propertyDesc,
    },
    {
      icon: FileText,
      title: t.home.features.receipts,
      description: t.home.features.receiptsDesc,
    },
    {
      icon: Mail,
      title: t.home.features.email,
      description: t.home.features.emailDesc,
    },
    {
      icon: DollarSign,
      title: t.home.features.currency,
      description: t.home.features.currencyDesc,
    },
  ]

  return (
    <div className="flex min-h-screen flex-col overflow-hidden dark:bg-slate-950">
      {/* Hero Section */}
      <section className="relative flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-950 px-4 py-24 text-center text-white overflow-hidden">
        {/* Toggles en esquina superior derecha */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-4 right-4 flex items-center gap-2 z-20"
        >
          <ThemeToggle />
          <LanguageToggle />
        </motion.div>

        {/* Animated background elements */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-20 left-20 w-64 h-64 bg-emerald-400/20 dark:bg-emerald-400/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-20 right-20 w-80 h-80 bg-cyan-400/20 dark:bg-cyan-400/10 rounded-full blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-4xl space-y-8 relative z-10"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.home.badge}</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="text-6xl font-extrabold tracking-tight sm:text-7xl md:text-8xl"
          >
            My<span className="text-emerald-200 dark:text-emerald-300">Rent</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-xl sm:text-2xl text-emerald-50 dark:text-emerald-100 max-w-2xl mx-auto leading-relaxed"
          >
            {t.home.subtitle}
            <span className="block mt-2 font-medium">{t.home.description}</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-6"
          >
            {/* Botón principal de Registro - más destacado */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button asChild size="lg" className="text-base sm:text-lg px-8 py-6 bg-white text-emerald-600 hover:bg-emerald-50 shadow-2xl shadow-emerald-900/50 dark:shadow-emerald-950/80 font-semibold group">
                <Link href="/signup" className="flex items-center gap-2">
                  {t.home.cta}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </motion.div>

            {/* Botón secundario de Login */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button asChild size="lg" variant="outline" className="text-base sm:text-lg px-8 py-6 border-2 border-white text-white hover:bg-white hover:text-emerald-600 font-medium transition-colors">
                <Link href="/login">{t.home.login}</Link>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-white to-emerald-50/30 dark:from-slate-950 dark:to-emerald-950/20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              {t.home.features.title}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {t.home.features.subtitle}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -8, transition: { duration: 0.15 } }}
                className="group"
              >
                <div className="text-center space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 h-full">
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/50 transition-shadow"
                  >
                    <feature.icon className="h-8 w-8 text-white" />
                  </motion.div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{feature.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-900 dark:to-teal-950 relative overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/30 dark:bg-emerald-400/10 rounded-full blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl mx-auto text-center space-y-8 relative z-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {t.home.cta2.title}
          </h2>
          <p className="text-xl text-emerald-50 dark:text-emerald-100 max-w-xl mx-auto">
            {t.home.cta2.subtitle}
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button asChild size="lg" className="text-lg px-10 py-7 bg-white text-emerald-600 hover:bg-emerald-50 shadow-2xl dark:shadow-emerald-950/80 font-semibold group">
              <Link href="/signup" className="flex items-center gap-2">
                {t.home.cta2.button}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-900 dark:bg-slate-950 text-center text-sm text-slate-400 dark:text-slate-500">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {t.home.footer}
        </motion.p>
      </footer>
    </div>
  )
}
