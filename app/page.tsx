'use client'

import Link from 'next/link'
import { Building2, FileText, Mail, DollarSign, ArrowRight, CheckCircle2 } from 'lucide-react'
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="MyRent inicio">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white text-xs font-bold select-none">
              M
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              My<span className="text-emerald-600">Rent</span>
            </span>
          </Link>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              {t.home.login}
            </Link>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 rounded-md">
              <Link href="/signup">{t.home.cta}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-20 sm:py-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl space-y-6"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {t.home.badge}
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-balance text-foreground leading-[1.1]">
            My<span className="text-emerald-600">Rent</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed text-balance max-w-lg mx-auto">
            {t.home.subtitle}
            {' '}{t.home.description}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-7 rounded-md group"
            >
              <Link href="/signup" className="flex items-center gap-2">
                {t.home.cta}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto font-semibold px-7 rounded-md"
            >
              <Link href="/login">{t.home.login}</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-muted/30 dark:bg-muted/10 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          {/* Section label */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="mb-10 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-2">
              Funcionalidades
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance">
              {t.home.features.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto text-balance">
              {t.home.features.subtitle}
            </p>
          </motion.div>

          {/* Feature cards — left-aligned icon + text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.07 }}
              >
                <div className="flex gap-4 rounded-xl border border-border bg-card p-5 h-full hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm transition-all duration-200">
                  <div className="mt-0.5 shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <feature.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-slate-950 dark:bg-slate-900 px-4 py-14 sm:py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="mx-auto max-w-xl space-y-5"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
            {t.home.cta2.title}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed text-balance">
            {t.home.cta2.subtitle}
          </p>
          <Button
            asChild
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 rounded-md group"
          >
            <Link href="/signup" className="flex items-center gap-2">
              {t.home.cta2.button}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-slate-950 dark:bg-slate-900 px-4 py-5 text-center text-xs text-slate-500">
        {t.home.footer}
      </footer>

    </div>
  )
}
