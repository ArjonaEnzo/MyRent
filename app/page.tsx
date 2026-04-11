'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  Building2, FileText, Mail, DollarSign, ArrowRight,
  CheckCircle2, AlertCircle, Home, Shield,
  AlertTriangle, TrendingUp, Instagram, Pause, Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useLanguage } from '@/components/providers/language-provider'
import { signup, tenantLogin } from '@/lib/actions/auth'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

type Panel = 'owner' | 'tenant'

// Cloudinary transcodifica al vuelo cambiando la extensión.
const HERO_VIDEO_PUBLIC =
  'https://res.cloudinary.com/ddtjwx08b/video/upload/v1775931376/0_Animation_Network_Connection_1920x1080_aalpnm'
const HERO_VIDEO_SRC = `${HERO_VIDEO_PUBLIC}.mp4`
const HERO_VIDEO_POSTER = `${HERO_VIDEO_PUBLIC}.jpg`

// ── Sub-components ───────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300"
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
      <label htmlFor={id} className="block text-xs font-medium text-slate-300">
        {label}
      </label>
      <input
        id={id} name={name} type={type} autoComplete={autoComplete} required placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-sky-400/60 focus:bg-white/10 focus:ring-1 focus:ring-sky-400/20"
      />
    </div>
  )
}

function SectionEyebrow({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'light' }) {
  const color = tone === 'light'
    ? 'text-sky-300'
    : 'text-sky-600 dark:text-sky-400'
  const line = tone === 'light' ? 'bg-sky-300/60' : 'bg-sky-600/60 dark:bg-sky-400/60'
  return (
    <p className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${color}`}>
      <span className={`h-px w-6 ${line}`} aria-hidden />
      {children}
    </p>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

// Card con glow border reactivo al cursor (inspirado en olimpo.lat).
// Lee la posición del mouse y la inyecta como CSS vars --glow-x / --glow-y,
// que alimentan un radial-gradient en una capa absoluta por encima del card.
function GlowCard({
  children,
  className = '',
  glow = 'rgba(56,189,248,0.18)',
}: {
  children: React.ReactNode
  className?: string
  glow?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--glow-x', `${e.clientX - rect.left}px`)
    el.style.setProperty('--glow-y', `${e.clientY - rect.top}px`)
  }
  return (
    <div ref={ref} onMouseMove={handleMove} className={`group/glow relative ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/glow:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--glow-x, 50%) var(--glow-y, 50%), ${glow}, transparent 42%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
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
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const [videoPlaying, setVideoPlaying] = useState(true)

  function toggleVideo() {
    const v = heroVideoRef.current
    if (!v) return
    if (v.paused) { v.play(); setVideoPlaying(true) }
    else { v.pause(); setVideoPlaying(false) }
  }

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

  const bestServiceIcons = [FileText, Home, TrendingUp]

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header className="absolute inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="MyRent inicio">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white text-sm font-bold select-none shadow-lg shadow-sky-500/30">M</span>
            <span className="text-base font-semibold tracking-tight text-white">My<span className="text-sky-400">Rent</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#services" className="hover:text-white transition-colors">{t.home.bestServices.eyebrow}</a>
            <a href="#about" className="hover:text-white transition-colors">{t.home.aboutUs.eyebrow}</a>
            <a href="#why" className="hover:text-white transition-colors">{t.home.whyUs.eyebrow}</a>
            <a href="#instagram" className="hover:text-white transition-colors">{t.home.instagram.eyebrow}</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <Link href="/login" className="hidden sm:inline-flex items-center text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-1.5">{t.home.login}</Link>
            <Button asChild size="sm" className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-4 rounded-md shadow-lg shadow-sky-500/20">
              <Link href="/signup">{t.home.cta}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero — H1 slogan + 2 CTAs + form ─────────────────────── */}
      <section className="relative isolate overflow-hidden min-h-[780px] flex items-center pt-28 pb-24 sm:pt-32 sm:pb-32">
        <div aria-hidden className="absolute inset-0 -z-30 bg-slate-950" />
        <video
          ref={heroVideoRef}
          src={HERO_VIDEO_SRC}
          poster={HERO_VIDEO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950/85 via-slate-900/70 to-sky-950/55"
        />

        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">

            {/* Left: copy + CTAs */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }}
              className="lg:col-span-7 text-center lg:text-left"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 backdrop-blur-sm px-3 py-1 text-xs font-medium text-sky-200 mb-7 uppercase tracking-[0.18em]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                </span>
                {t.home.badge}
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-[family-name:var(--font-display)] text-white tracking-[-0.03em] leading-[0.95] text-[clamp(2.5rem,6.5vw,5.5rem)] font-extrabold mb-6"
              >
                Cobrá tu alquiler{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 font-[family-name:var(--font-script)] italic text-sky-400 font-bold">
                    sin perseguir
                  </span>
                </span>{' '}
                a nadie.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-9"
              >
                {t.home.description}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <Button asChild size="lg" className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-7 h-12 rounded-md group shadow-xl shadow-sky-500/25">
                  <Link href="/signup" className="flex items-center gap-2">
                    {t.home.cta}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white font-semibold h-12 rounded-md backdrop-blur-sm">
                  <a href="#how">{t.home.how.eyebrow}</a>
                </Button>
              </motion.div>

              <motion.ul
                variants={fadeUp}
                aria-label="Beneficios"
                className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-slate-400"
              >
                {t.home.heroBullets.map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" aria-hidden />
                    {item}
                  </li>
                ))}
              </motion.ul>
            </motion.div>

            {/* Right: form card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none relative"
            >
              <div
                className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900/70 backdrop-blur-xl shadow-2xl shadow-sky-950/50"
                style={{ height: '450px' }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePanel}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                    className="absolute inset-0 p-6 sm:p-7"
                  >
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/20">
                        {activePanel === 'owner'
                          ? <Shield className="h-4 w-4 text-sky-300" aria-hidden />
                          : <Home className="h-4 w-4 text-sky-300" aria-hidden />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {activePanel === 'owner' ? 'Propietario' : 'Inquilino'}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                          {activePanel === 'owner' ? 'Empezá gratis en minutos' : 'Accedé al portal'}
                        </p>
                      </div>
                    </div>

                    {activePanel === 'owner' && (
                      <form onSubmit={handleOwnerSubmit} className="space-y-3" aria-label="Registro de propietario">
                        {ownerError && <ErrorBanner message={ownerError} />}
                        <FormInput id="o-email" name="email" label="Email" type="email" placeholder="vos@empresa.com" autoComplete="email" />
                        <FormInput id="o-password" name="password" label="Contraseña" type="password" placeholder="Mín. 8 caracteres" autoComplete="new-password" />
                        <FormInput id="o-confirm" name="confirmPassword" label="Confirmar contraseña" type="password" placeholder="Repetí la contraseña" autoComplete="new-password" />
                        <Button type="submit" disabled={ownerLoading} size="sm" className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg mt-1 shadow-lg shadow-sky-500/20">
                          {ownerLoading
                            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                            : <><span>Crear cuenta gratis</span><ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden /></>
                          }
                        </Button>
                        <p className="text-center text-[11px] text-slate-400 pt-0.5">
                          ¿Ya tenés cuenta?{' '}
                          <Link href="/login" className="text-sky-400 hover:text-sky-300 hover:underline font-medium">Iniciá sesión</Link>
                        </p>
                      </form>
                    )}

                    {activePanel === 'tenant' && (
                      <form onSubmit={handleTenantSubmit} className="space-y-3" aria-label="Acceso de inquilino">
                        {tenantError && <ErrorBanner message={tenantError} />}
                        <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] text-slate-400 leading-relaxed">
                          Tu cuenta es configurada por tu propietario. Iniciá sesión con el email y contraseña que te asignaron.
                        </p>
                        <FormInput id="t-email" name="email" label="Email" type="email" placeholder="tu@email.com" autoComplete="email" />
                        <FormInput id="t-password" name="password" label="Contraseña" type="password" placeholder="••••••••" autoComplete="current-password" />
                        <Button type="submit" disabled={tenantLoading} size="sm" className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg mt-1 shadow-lg shadow-sky-500/20">
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

              <div className="mt-4 flex items-center justify-center">
                <div
                  className="flex items-center gap-0.5 rounded-full border border-white/15 bg-slate-900/60 backdrop-blur-md p-1"
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
                      className="relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1"
                    >
                      {activePanel === id && (
                        <motion.span
                          layoutId="toggleActiveBg"
                          className="absolute inset-0 rounded-full bg-sky-500 shadow-lg shadow-sky-500/30"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                          aria-hidden
                        />
                      )}
                      <span
                        className="relative flex items-center gap-1.5 transition-colors duration-150"
                        style={{ color: activePanel === id ? '#fff' : 'rgb(148 163 184)' }}
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

        {/* Play/pause control */}
        <motion.button
          type="button"
          onClick={toggleVideo}
          aria-label={videoPlaying ? 'Pausar video de fondo' : 'Reproducir video de fondo'}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="hidden md:flex absolute bottom-8 left-8 z-20 h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-slate-900/60 backdrop-blur-xl text-white hover:bg-slate-900/80 hover:border-white/40 transition-colors"
        >
          {videoPlaying
            ? <Pause className="h-4 w-4" aria-hidden />
            : <Play className="h-4 w-4 ml-0.5" aria-hidden />}
        </motion.button>
      </section>

      {/* ── Best Services — attached to hero (no top spacing) ─────── */}
      <section id="services-top" className="relative -mt-16 sm:-mt-20 px-4 z-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {t.home.bestServices.items.map((s, i) => {
              const Icon = bestServiceIcons[i] ?? FileText
              return (
                <motion.div
                  key={s.title}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-80px' }}
                >
                  <GlowCard
                    glow="rgba(56,189,248,0.22)"
                    className="h-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-sky-950/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/40"
                  >
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 transition-colors group-hover/glow:bg-sky-500/25">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <h3 className="mb-1.5 text-base font-semibold text-white">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-400">{s.body}</p>
                  </GlowCard>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Welcome / Bienvenida ─────────────────────────────────── */}
      <section className="px-4 pt-24 sm:pt-32 pb-16 sm:pb-20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <SectionEyebrow>{t.home.welcome.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground text-balance leading-[1.05]">
              {t.home.welcome.title}
            </h2>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed text-balance max-w-2xl mx-auto">
              {t.home.welcome.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── How it works — timeline animada con widget de progreso ── */}
      <section id="how" className="border-t border-border/60 px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-16 max-w-2xl"
          >
            <SectionEyebrow>{t.home.how.eyebrow}</SectionEyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance leading-tight">
              {t.home.how.title}
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed text-balance">
              {t.home.how.subtitle}
            </p>
          </motion.div>

          {/* Timeline widget */}
          <div className="relative grid grid-cols-1 gap-10 pt-10 md:grid-cols-3 md:gap-6 lg:gap-8">
            {/* Línea conectora animada (desktop) — corre detrás de los badges */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-10 hidden h-[2px] -translate-y-1/2 rounded-full bg-border/70 md:block"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '-120px' }}
                transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.55)]"
              />
            </div>

            {t.home.how.steps.map((step, i) => (
              <motion.div
                key={step.n}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-80px' }}
                className="relative"
              >
                <GlowCard className="h-full rounded-2xl border border-border/60 bg-card px-7 pt-12 pb-7 transition-colors hover:border-sky-500/40">
                  {/* Badge numerado — cortado por encima del card con ring de fondo */}
                  <div
                    aria-hidden
                    className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/40 ring-8 ring-background"
                  >
                    <span className="absolute inset-0 rounded-full bg-sky-400/40 animate-ping" />
                    <span className="relative text-sm font-bold tracking-wider">{step.n}</span>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.body}</p>

                  {/* Widget: barra de progreso animada */}
                  <div className="mt-6 h-1 overflow-hidden rounded-full bg-border/60">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, margin: '-100px' }}
                      transition={{
                        duration: 1.2,
                        delay: i * 0.25 + 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="h-full origin-left rounded-full bg-gradient-to-r from-sky-400 to-sky-600"
                    />
                  </div>

                  {/* Microtexto "paso N de 3" */}
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Paso {i + 1} de {t.home.how.steps.length}
                  </p>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pain points + Solution ───────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20 border-t border-border/60">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-12 max-w-2xl"
          >
            <SectionEyebrow>{t.home.pain.eyebrow}</SectionEyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance leading-tight">
              {t.home.pain.title}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {t.home.pain.symptoms.map((sym, i) => (
              <motion.div
                key={sym.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="relative rounded-2xl border border-border/60 bg-card p-6"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <AlertTriangle className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{sym.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{sym.body}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-2"
            >
              <h3 className="text-2xl font-bold tracking-tight text-foreground mb-5">
                {t.home.pain.outcomesTitle}
              </h3>
              <ul className="space-y-3">
                {t.home.pain.outcomes.map((o) => (
                  <li key={o} className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    {o}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:col-span-3 rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/[0.04] to-transparent p-8 sm:p-10"
            >
              <SectionEyebrow>{t.home.solution.eyebrow}</SectionEyebrow>
              <h3 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance leading-tight mb-6">
                {t.home.solution.title}
              </h3>
              <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                <p>{t.home.solution.empathy}</p>
                <p>{t.home.solution.authority}</p>
                <p className="text-foreground font-medium">{t.home.solution.promise}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── About Us ─────────────────────────────────────────────── */}
      <section id="about" className="border-t border-border/60 bg-muted/20 dark:bg-muted/10 px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 max-w-2xl"
          >
            <SectionEyebrow>{t.home.aboutUs.eyebrow}</SectionEyebrow>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground text-balance leading-[1.05]">
              {t.home.aboutUs.title}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-start">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-3 space-y-5 text-base text-muted-foreground leading-relaxed"
            >
              <p>{t.home.aboutUs.paragraph1}</p>
              <p>{t.home.aboutUs.paragraph2}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-2 grid grid-cols-3 lg:grid-cols-1 gap-4"
            >
              {t.home.aboutUs.stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-border/60 bg-card p-5 text-center lg:text-left"
                >
                  <p className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold">
                    {s.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── All Services (features grid) ─────────────────────────── */}
      <section id="services" className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-12 max-w-2xl"
          >
            <SectionEyebrow>{t.home.features.title}</SectionEyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance leading-tight">
              {t.home.features.subtitle}
            </h2>
          </motion.div>
          {/* Bento grid: hero card (2x2) + 1 wide + 2 small */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-4 md:grid-rows-[repeat(2,minmax(200px,1fr))]">
            {features.map((feature, index) => {
              const bentoSpans = [
                'md:col-span-2 md:row-span-2',
                'md:col-span-2 md:row-span-1',
                'md:col-span-1 md:row-span-1',
                'md:col-span-1 md:row-span-1',
              ]
              const isHero = index === 0
              return (
                <motion.div
                  key={feature.title}
                  custom={index}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  className={bentoSpans[index]}
                >
                  <GlowCard
                    glow="rgba(14,165,233,0.15)"
                    className="h-full overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors hover:border-sky-500/40"
                  >
                    <div className={`flex h-full flex-col ${isHero ? 'p-8 sm:p-10' : 'p-7'}`}>
                      <div
                        className={`mb-5 inline-flex items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/15 ${
                          isHero ? 'h-14 w-14' : 'h-11 w-11'
                        }`}
                      >
                        <feature.icon
                          className={`text-sky-600 dark:text-sky-400 ${isHero ? 'h-7 w-7' : 'h-5 w-5'}`}
                          aria-hidden
                        />
                      </div>
                      <h3
                        className={`mb-2 text-foreground text-balance leading-tight ${
                          isHero ? 'text-2xl sm:text-3xl font-bold tracking-tight' : 'text-lg font-semibold'
                        }`}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className={`text-muted-foreground leading-relaxed ${
                          isHero ? 'text-base' : 'text-sm'
                        }`}
                      >
                        {feature.description}
                      </p>
                      {isHero && (
                        <div className="mt-auto flex items-center gap-1.5 pt-6 text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                          Incluido desde el día 1
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </div>
                      )}
                    </div>
                  </GlowCard>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Why us ──────────────────────────────────────────────── */}
      <section id="why" className="border-t border-border/60 bg-muted/20 dark:bg-muted/10 px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-12 max-w-2xl"
          >
            <SectionEyebrow>{t.home.whyUs.eyebrow}</SectionEyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance leading-tight">
              {t.home.whyUs.title}
            </h2>
          </motion.div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {t.home.whyUs.items.map((item, i) => (
              <motion.li
                key={item}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-sm text-foreground leading-relaxed">{item}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Instagram ───────────────────────────────────────────── */}
      <section id="instagram" className="relative isolate overflow-hidden border-t border-white/5 bg-slate-950 px-4 py-20 sm:py-28 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.sky.500/18%),transparent_65%)]"
        />
        <div className="relative mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-3"
            >
              <SectionEyebrow tone="light">{t.home.instagram.eyebrow}</SectionEyebrow>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-extrabold tracking-tight text-balance leading-[1.05]">
                {t.home.instagram.title}
              </h2>
              <p className="mt-5 text-base sm:text-lg text-slate-400 leading-relaxed text-balance max-w-xl">
                {t.home.instagram.subtitle}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 hover:brightness-110 text-white font-semibold h-12 px-6 rounded-md shadow-xl shadow-pink-500/25"
                >
                  <a
                    href="https://instagram.com/myrent.ar"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-2"
                  >
                    <Instagram className="h-4 w-4" aria-hidden />
                    {t.home.instagram.handle}
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white font-semibold h-12 rounded-md backdrop-blur-sm"
                >
                  <a href="https://instagram.com/myrent.ar" target="_blank" rel="noreferrer noopener">
                    {t.home.instagram.cta}
                  </a>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-2 relative mx-auto"
            >
              <div className="relative aspect-square w-full max-w-[320px] rounded-3xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 p-[2px] shadow-2xl shadow-pink-500/30">
                <div className="flex h-full w-full flex-col items-center justify-center rounded-3xl bg-slate-950 p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 text-white mb-4">
                    <Instagram className="h-8 w-8" aria-hidden />
                  </div>
                  <p className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
                    {t.home.instagram.handle}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                    Instagram
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-slate-950 px-4 py-12 text-slate-400">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5" aria-label="MyRent inicio">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white text-sm font-bold select-none">M</span>
                <span className="text-base font-semibold tracking-tight text-white">My<span className="text-sky-400">Rent</span></span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
                {t.home.footer.tagline}
              </p>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-300">{t.home.footer.product}</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#services" className="hover:text-sky-400 transition-colors">{t.home.footer.productLinks[0]}</a></li>
                <li><a href="#about" className="hover:text-sky-400 transition-colors">{t.home.footer.productLinks[1]}</a></li>
                <li><a href="#instagram" className="hover:text-sky-400 transition-colors">{t.home.footer.productLinks[2]}</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-300">{t.home.footer.company}</p>
              <ul className="space-y-2 text-sm">
                {t.home.footer.companyLinks.map((label) => (
                  <li key={label}><span className="text-slate-500">{label}</span></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-slate-500 sm:flex-row">
            <span>{t.home.footer.rights}</span>
            <span>{t.home.footer.legal}</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
