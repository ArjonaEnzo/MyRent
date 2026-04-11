'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Building2, FileText, Mail, DollarSign, ArrowRight,
  CheckCircle2, AlertCircle, Home, Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useLanguage } from '@/components/providers/language-provider'
import { signup, tenantLogin } from '@/lib/actions/auth'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

type Panel = 'owner' | 'tenant'

// ── Sub-components ───────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </motion.div>
  )
}

function FormInput({
  id, name, label, type = 'text', placeholder, autoComplete,
}: {
  id: string; name: string; label: string; type?: string; placeholder: string; autoComplete?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id} name={name} type={type} autoComplete={autoComplete} required placeholder={placeholder}
        className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20"
      />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { t } = useLanguage()
  const [activePanel, setActivePanel] = useState<Panel>('owner')
  const [ownerLoading, setOwnerLoading] = useState(false)
  const [ownerError, setOwnerError] = useState('')
  const [tenantLoading, setTenantLoading] = useState(false)
  const [tenantError, setTenantError] = useState('')

  async function handleOwnerSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setOwnerError('')
    setOwnerLoading(true)
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value
    try {
      const result = await signup({ email, password, confirmPassword })
      if (result && !result.success) { setOwnerError(result.error ?? 'Error al crear la cuenta'); setOwnerLoading(false) }
    } catch (err) {
      if (isRedirectError(err)) throw err
      setOwnerError('Error al crear la cuenta. Intenta de nuevo.')
      setOwnerLoading(false)
    }
  }

  async function handleTenantSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTenantError('')
    setTenantLoading(true)
    const form = e.currentTarget
    try {
      const result = await tenantLogin({
        email: (form.elements.namedItem('email') as HTMLInputElement).value,
        password: (form.elements.namedItem('password') as HTMLInputElement).value,
      })
      if (result && !result.success) { setTenantError(result.error ?? 'Email o contraseña incorrectos'); setTenantLoading(false) }
    } catch (err) {
      if (isRedirectError(err)) throw err
      setTenantError('Error al iniciar sesión. Intenta de nuevo.')
      setTenantLoading(false)
    }
  }

  const features = [
    { icon: Building2, title: t.home.features.property, description: t.home.features.propertyDesc },
    { icon: FileText, title: t.home.features.receipts, description: t.home.features.receiptsDesc },
    { icon: Mail, title: t.home.features.email, description: t.home.features.emailDesc },
    { icon: DollarSign, title: t.home.features.currency, description: t.home.features.currencyDesc },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="MyRent inicio">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white text-xs font-bold select-none">M</span>
            <span className="text-sm font-semibold tracking-tight">My<span className="text-emerald-600">Rent</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <Link href="/tenant/login" className="hidden sm:inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">Soy inquilino</Link>
            <Link href="/login" className="hidden sm:inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">{t.home.login}</Link>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 rounded-md">
              <Link href="/signup">{t.home.cta}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="flex flex-1 items-center px-4 py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-20">

            {/* Left: copy */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex-1 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-5">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                {t.home.badge}
              </div>
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-balance text-foreground leading-[1.1] mb-4">
                My<span className="text-emerald-600">Rent</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed text-balance max-w-sm mx-auto lg:mx-0 mb-6">
                {t.home.subtitle}{' '}{t.home.description}
              </p>
              <ul aria-label="Beneficios" className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-muted-foreground">
                {['Gratis para comenzar', 'Sin tarjeta de crédito', 'Configura en minutos'].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Right: single form + toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="w-full lg:w-[400px] lg:shrink-0"
            >
              {/*
                Form card.
                Fixed `height` (not min-height) is what makes this stable:
                absolutely-positioned children don't participate in flow, so the
                card height is driven purely by the CSS property — never by the
                form content. The hero section height (and the divider below it)
                stays locked regardless of which form is active or its height.
              */}
              <div
                className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5"
                style={{ height: '430px' }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePanel}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                    className="absolute inset-0 p-6"
                  >
                    {/* Card header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                        {activePanel === 'owner'
                          ? <Shield className="h-4 w-4 text-emerald-500" aria-hidden />
                          : <Home className="h-4 w-4 text-emerald-500" aria-hidden />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {activePanel === 'owner' ? 'Propietario' : 'Inquilino'}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                          {activePanel === 'owner' ? 'Gestiona tus alquileres' : 'Accedé al portal'}
                        </p>
                      </div>
                    </div>

                    {/* Owner form */}
                    {activePanel === 'owner' && (
                      <form onSubmit={handleOwnerSubmit} className="space-y-3" aria-label="Registro de propietario">
                        {ownerError && <ErrorBanner message={ownerError} />}
                        <FormInput id="o-email" name="email" label="Email" type="email" placeholder="vos@empresa.com" autoComplete="email" />
                        <FormInput id="o-password" name="password" label="Contraseña" type="password" placeholder="Mín. 6 caracteres" autoComplete="new-password" />
                        <FormInput id="o-confirm" name="confirmPassword" label="Confirmar contraseña" type="password" placeholder="Repetí la contraseña" autoComplete="new-password" />
                        <Button type="submit" disabled={ownerLoading} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg mt-1">
                          {ownerLoading
                            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                            : <><span>Crear cuenta gratis</span><ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden /></>
                          }
                        </Button>
                        <p className="text-center text-[11px] text-muted-foreground pt-0.5">
                          ¿Ya tenés cuenta?{' '}
                          <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">Iniciá sesión</Link>
                        </p>
                      </form>
                    )}

                    {/* Tenant form */}
                    {activePanel === 'tenant' && (
                      <form onSubmit={handleTenantSubmit} className="space-y-3" aria-label="Acceso de inquilino">
                        {tenantError && <ErrorBanner message={tenantError} />}
                        <p className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground leading-relaxed">
                          Tu cuenta es configurada por tu propietario. Iniciá sesión con el email y contraseña que te asignaron.
                        </p>
                        <FormInput id="t-email" name="email" label="Email" type="email" placeholder="tu@email.com" autoComplete="email" />
                        <FormInput id="t-password" name="password" label="Contraseña" type="password" placeholder="••••••••" autoComplete="current-password" />
                        <Button type="submit" disabled={tenantLoading} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg mt-1">
                          {tenantLoading
                            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                            : <><span>Acceder al portal</span><ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden /></>
                          }
                        </Button>
                      </form>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Toggle below the card */}
              <div className="mt-4 flex items-center justify-center">
                <div
                  className="flex items-center gap-0.5 rounded-full border border-border/50 bg-muted/20 p-1"
                  role="tablist"
                  aria-label="Tipo de acceso"
                >
                  {([
                    { id: 'owner' as Panel, label: 'Propietario', Icon: Shield },
                    { id: 'tenant' as Panel, label: 'Inquilino', Icon: Home },
                  ] as const).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={activePanel === id}
                      onClick={() => setActivePanel(id)}
                      className="relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                    >
                      {activePanel === id && (
                        <motion.span
                          layoutId="toggleActiveBg"
                          className="absolute inset-0 rounded-full bg-background shadow-sm"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                          aria-hidden
                        />
                      )}
                      <span
                        className="relative flex items-center gap-1.5 transition-colors duration-150"
                        style={{ color: activePanel === id ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-muted/30 dark:bg-muted/10 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="mb-10 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-2">Funcionalidades</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance">{t.home.features.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto text-balance">{t.home.features.subtitle}</p>
          </motion.div>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">{t.home.cta2.title}</h2>
          <p className="text-sm text-slate-400 leading-relaxed text-balance">{t.home.cta2.subtitle}</p>
          <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 rounded-md group">
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
