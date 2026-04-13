'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Building2, FileText, Mail, DollarSign, ArrowRight,
  CheckCircle2, AlertCircle, Home, Shield,
  AlertTriangle, TrendingUp, Instagram, Zap,
  MapPin, Star,
} from 'lucide-react'
import Balancer from 'react-wrap-balancer'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useLanguage } from '@/components/providers/language-provider'
import { signup, tenantLogin } from '@/lib/actions/auth'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { MagicCard } from '@/components/ui/magic-card'
import { BorderBeam } from '@/components/ui/border-beam'
import { Marquee } from '@/components/ui/marquee'
import { NumberTicker } from '@/components/ui/number-ticker'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from '@/components/ui/drawer'

type Panel = 'owner' | 'tenant'

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
      <label htmlFor={id} className="block text-xs font-medium text-slate-400">
        {label}
      </label>
      <input
        id={id} name={name} type={type} autoComplete={autoComplete} required placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-primary focus:bg-white/[0.07] focus:ring-1 focus:ring-primary/20"
      />
    </div>
  )
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
      <span className="h-px w-5 bg-primary/50" aria-hidden />
      {children}
    </p>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

const MOCK_PROPERTIES = [
  { name: 'Depto Palermo Soho', address: 'Cabrera 5200, CABA', price: 'ARS 520.000', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=640&q=70&auto=format&fit=crop', beds: 2, baths: 1, sqm: 65 },
  { name: 'Casa Pilar Golf', address: 'Pilar, BA', price: 'USD 2.400', img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=640&q=70&auto=format&fit=crop', beds: 4, baths: 3, sqm: 280 },
  { name: 'Loft Recoleta', address: 'Ayacucho 1900', price: 'ARS 380.000', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=640&q=70&auto=format&fit=crop', beds: 1, baths: 1, sqm: 42 },
  { name: 'PH Villa Crespo', address: 'Serrano 800', price: 'ARS 295.000', img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=640&q=70&auto=format&fit=crop', beds: 2, baths: 1, sqm: 58 },
  { name: 'Duplex Núñez', address: 'Av. Libertador 7200', price: 'ARS 610.000', img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=640&q=70&auto=format&fit=crop', beds: 3, baths: 2, sqm: 120 },
  { name: 'Depto Belgrano R', address: 'Virrey Loreto 2400', price: 'ARS 445.000', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=640&q=70&auto=format&fit=crop', beds: 2, baths: 1, sqm: 72 },
  { name: 'Casa Tigre', address: 'Nordelta', price: 'USD 3.100', img: 'https://images.unsplash.com/photo-1598228723793-52759bba239c?w=640&q=70&auto=format&fit=crop', beds: 5, baths: 4, sqm: 350 },
  { name: 'Studio San Telmo', address: 'Defensa 900', price: 'ARS 220.000', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=640&q=70&auto=format&fit=crop', beds: 1, baths: 1, sqm: 35 },
] as const

function PropertyCard({ name, address, price, img, beds, baths, sqm }: (typeof MOCK_PROPERTIES)[number]) {
  return (
    <figure className="relative w-72 shrink-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/80 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-white/10">
      <div
        className="h-40 w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${img})` }}
        aria-hidden
      />
      <figcaption className="p-4">
        <p className="text-sm font-semibold text-white leading-tight">{name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="h-3 w-3" aria-hidden />
          {address}
        </p>
        <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-600">
          <span>{sqm} m²</span>
          <span>{beds} hab</span>
          <span>{baths} baño{baths > 1 ? 's' : ''}</span>
        </div>
        <p className="mt-3 text-sm font-bold text-primary">{price}<span className="text-xs font-normal text-slate-500">/mes</span></p>
      </figcaption>
    </figure>
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
  const [videoLoaded, setVideoLoaded] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (shouldReduceMotion) return
    const timer = setTimeout(() => setVideoLoaded(true), 900)
    return () => clearTimeout(timer)
  }, [shouldReduceMotion])

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

  const navLinks = [
    { href: '#services', label: t.home.bestServices.eyebrow },
    { href: '#about', label: t.home.aboutUs.eyebrow },
    { href: '#why', label: t.home.whyUs.eyebrow },
    { href: '#faq', label: t.home.faq.eyebrow },
  ]

  return (
    <div className="dark flex min-h-screen flex-col bg-slate-950 text-white">

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.04] bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="MyRent inicio">
            <span className="text-lg font-semibold tracking-tight text-white">My<span className="text-primary">Rent</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[13px] text-slate-500">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-white transition-colors duration-200">{link.label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <Link href="/login" className="hidden sm:inline-flex items-center text-[13px] font-medium text-slate-500 hover:text-white transition-colors px-3 py-1.5">
              {t.home.login}
            </Link>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white text-[13px] font-medium px-5 rounded-full shadow-lg shadow-primary/15 transition-all duration-200">
              <Link href="/signup" className="flex items-center gap-1.5">
                {t.home.cta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col gap-1 p-2"
              aria-label="Abrir menú"
            >
              <span className={`h-0.5 w-5 bg-white transition-all duration-200 ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`h-0.5 w-5 bg-white transition-all duration-200 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`h-0.5 w-5 bg-white transition-all duration-200 ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-white/[0.04]"
            >
              <nav className="flex flex-col gap-1 px-4 py-3">
                {navLinks.map((link) => (
                  <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm text-slate-500 hover:text-white transition-colors">{link.label}</a>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero ────────────────────────────────���────────────────── */}
      <section className="relative isolate overflow-hidden min-h-[820px] flex items-center pt-32 pb-28 sm:pt-36 sm:pb-36">
        <div aria-hidden className="absolute inset-0 -z-30 bg-slate-950 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_VIDEO_POSTER})` }} />
        {videoLoaded && (
          <video ref={heroVideoRef} src={HERO_VIDEO_SRC} poster={HERO_VIDEO_POSTER} autoPlay muted loop playsInline preload="none" aria-hidden className="absolute inset-0 -z-20 h-full w-full object-cover opacity-40" />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950" />

        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">

            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }}
              className="lg:col-span-7 text-center lg:text-left"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium text-primary mb-7 uppercase tracking-[0.18em]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                {t.home.badge}
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-[family-name:var(--font-display)] text-white tracking-[-0.03em] leading-[0.92] text-[clamp(2.5rem,6.5vw,5.2rem)] font-extrabold mb-6"
              >
                <Balancer>
                  Cobrá tu alquiler{' '}
                  <span className="relative inline-block">
                    <span className="relative z-10 font-[family-name:var(--font-script)] italic text-primary font-bold">
                      sin perseguir
                    </span>
                  </span>{' '}
                  a nadie.
                </Balancer>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-9">
                {t.home.description}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 h-13 rounded-full group shadow-xl shadow-primary/20 transition-all duration-200">
                  <Link href="/signup" className="flex items-center gap-2">
                    {t.home.cta}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06] hover:text-white font-semibold h-13 rounded-full">
                  <a href="#how">{t.home.how.eyebrow}</a>
                </Button>
              </motion.div>

              <motion.ul variants={fadeUp} aria-label="Beneficios" className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-slate-600">
                {t.home.heroBullets.map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
                    {item}
                  </li>
                ))}
              </motion.ul>

              {/* Mobile drawer */}
              <motion.div variants={fadeUp} className="mt-8 md:hidden">
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-14 rounded-xl shadow-xl shadow-primary/20">
                      Empezar gratis
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[92vh] bg-slate-900 border-white/[0.06]">
                    <DrawerHeader>
                      <DrawerTitle className="text-white">Acceder a MyRent</DrawerTitle>
                      <DrawerDescription className="text-slate-500">Crea tu cuenta o ingresá como inquilino.</DrawerDescription>
                    </DrawerHeader>
                    <div className="flex items-center justify-center pb-2">
                      <div className="flex items-center gap-0.5 rounded-full border border-white/[0.06] bg-slate-800 p-1" role="tablist">
                        {([
                          { id: 'owner' as Panel, label: 'Propietario', Icon: Shield },
                          { id: 'tenant' as Panel, label: 'Inquilino', Icon: Home },
                        ] as const).map(({ id, label, Icon }) => (
                          <button
                            key={id} role="tab" aria-selected={activePanel === id}
                            onClick={() => setActivePanel(id)}
                            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${activePanel === id ? 'bg-primary text-white shadow' : 'text-slate-500'}`}
                          >
                            <Icon className="h-3 w-3" aria-hidden />{label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="px-4 pb-8">
                      {activePanel === 'owner' ? (
                        <form onSubmit={handleOwnerSubmit} className="space-y-3">
                          {ownerError && <ErrorBanner message={ownerError} />}
                          <div className="space-y-1.5">
                            <label htmlFor="m-o-email" className="block text-xs font-medium text-slate-400">Email</label>
                            <input id="m-o-email" name="email" type="email" required autoComplete="email" placeholder="vos@empresa.com" className="w-full rounded-lg border border-white/[0.06] bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="m-o-pass" className="block text-xs font-medium text-slate-400">Contraseña</label>
                            <input id="m-o-pass" name="password" type="password" required autoComplete="new-password" placeholder="Mín. 8 caracteres" className="w-full rounded-lg border border-white/[0.06] bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="m-o-conf" className="block text-xs font-medium text-slate-400">Confirmar contraseña</label>
                            <input id="m-o-conf" name="confirmPassword" type="password" required autoComplete="new-password" placeholder="Repetí la contraseña" className="w-full rounded-lg border border-white/[0.06] bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-primary" />
                          </div>
                          <Button type="submit" disabled={ownerLoading} className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-12 rounded-lg">
                            {ownerLoading ? 'Creando…' : 'Crear cuenta gratis'}
                          </Button>
                        </form>
                      ) : (
                        <form onSubmit={handleTenantSubmit} className="space-y-3">
                          {tenantError && <ErrorBanner message={tenantError} />}
                          <div className="space-y-1.5">
                            <label htmlFor="m-t-email" className="block text-xs font-medium text-slate-400">Email</label>
                            <input id="m-t-email" name="email" type="email" required autoComplete="email" placeholder="tu@email.com" className="w-full rounded-lg border border-white/[0.06] bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="m-t-pass" className="block text-xs font-medium text-slate-400">Contraseña</label>
                            <input id="m-t-pass" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className="w-full rounded-lg border border-white/[0.06] bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-primary" />
                          </div>
                          <Button type="submit" disabled={tenantLoading} className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-12 rounded-lg">
                            {tenantLoading ? 'Accediendo…' : 'Acceder al portal'}
                          </Button>
                        </form>
                      )}
                    </div>
                  </DrawerContent>
                </Drawer>
              </motion.div>
            </motion.div>

            {/* Right: form card (desktop) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="hidden md:block lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none relative"
            >
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/70 backdrop-blur-xl shadow-2xl" style={{ height: '450px' }}>
                <AnimatePresence mode="wait">
                  <motion.div key={activePanel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: 'easeInOut' }} className="absolute inset-0 p-6 sm:p-7">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                        {activePanel === 'owner'
                          ? <Shield className="h-4 w-4 text-primary" aria-hidden />
                          : <Home className="h-4 w-4 text-primary" aria-hidden />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{activePanel === 'owner' ? 'Propietario' : 'Inquilino'}</p>
                        <p className="text-[11px] text-slate-500 leading-none mt-0.5">{activePanel === 'owner' ? 'Empezá gratis en minutos' : 'Accedé al portal'}</p>
                      </div>
                    </div>

                    {activePanel === 'owner' && (
                      <form onSubmit={handleOwnerSubmit} className="space-y-3" aria-label="Registro de propietario">
                        {ownerError && <ErrorBanner message={ownerError} />}
                        <FormInput id="o-email" name="email" label="Email" type="email" placeholder="vos@empresa.com" autoComplete="email" />
                        <FormInput id="o-password" name="password" label="Contraseña" type="password" placeholder="Mín. 8 caracteres" autoComplete="new-password" />
                        <FormInput id="o-confirm" name="confirmPassword" label="Confirmar contraseña" type="password" placeholder="Repetí la contraseña" autoComplete="new-password" />
                        <Button type="submit" disabled={ownerLoading} size="sm" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg mt-1 shadow-lg shadow-primary/15">
                          {ownerLoading
                            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                            : <><span>Crear cuenta gratis</span><ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden /></>}
                        </Button>
                        <p className="text-center text-[11px] text-slate-500 pt-0.5">
                          ¿Ya tenés cuenta?{' '}
                          <Link href="/login" className="text-primary hover:text-primary hover:underline font-medium">Iniciá sesión</Link>
                        </p>
                      </form>
                    )}

                    {activePanel === 'tenant' && (
                      <form onSubmit={handleTenantSubmit} className="space-y-3" aria-label="Acceso de inquilino">
                        {tenantError && <ErrorBanner message={tenantError} />}
                        <p className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[11px] text-slate-500 leading-relaxed">
                          Tu cuenta es configurada por tu propietario. Iniciá sesión con el email y contraseña que te asignaron.
                        </p>
                        <FormInput id="t-email" name="email" label="Email" type="email" placeholder="tu@email.com" autoComplete="email" />
                        <FormInput id="t-password" name="password" label="Contraseña" type="password" placeholder="••••••••" autoComplete="current-password" />
                        <Button type="submit" disabled={tenantLoading} size="sm" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg mt-1 shadow-lg shadow-primary/15">
                          {tenantLoading
                            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                            : <><span>Acceder al portal</span><ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden /></>}
                        </Button>
                      </form>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center gap-0.5 rounded-full border border-white/[0.06] bg-slate-900/60 backdrop-blur-md p-1" role="tablist" aria-label="Tipo de acceso">
                  {([
                    { id: 'owner' as Panel, label: 'Propietario', Icon: Shield },
                    { id: 'tenant' as Panel, label: 'Inquilino', Icon: Home },
                  ] as const).map(({ id, label, Icon }) => (
                    <button
                      key={id} role="tab" aria-selected={activePanel === id}
                      onClick={() => setActivePanel(id)}
                      className="relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    >
                      {activePanel === id && (
                        <motion.span layoutId="toggleActiveBg" className="absolute inset-0 rounded-full bg-primary shadow-lg shadow-primary/20" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} aria-hidden />
                      )}
                      <span className="relative flex items-center gap-1.5 transition-colors duration-150" style={{ color: activePanel === id ? '#fff' : 'rgb(120 113 108)' }}>
                        <Icon className="h-3 w-3" aria-hidden />{label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

      </section>

      {/* ── Best Services ────────────────────────────────────────── */}
      <section id="services-top" className="relative -mt-20 px-4 z-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {t.home.bestServices.items.map((s, i) => {
              const Icon = bestServiceIcons[i] ?? FileText
              return (
                <motion.div key={s.title} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
                  <MagicCard
                    gradientColor="rgba(59,130,246,0.12)"
                    gradientFrom="hsl(217,55%,58%)"
                    gradientTo="hsl(217,55%,38%)"
                    className="h-full overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/10"
                  >
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <h3 className="mb-1.5 text-sm font-semibold text-white">{s.title}</h3>
                    <p className="text-[13px] leading-relaxed text-slate-500">{s.body}</p>
                  </MagicCard>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <section className="px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-16">
            <SectionEyebrow>{t.home.welcome.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl sm:text-[2.75rem] font-extrabold tracking-tight text-white leading-[1.05]">
              <Balancer>{t.home.welcome.title}</Balancer>
            </h2>
            <p className="mt-5 text-base text-slate-500 leading-relaxed max-w-2xl mx-auto">
              <Balancer>{t.home.welcome.description}</Balancer>
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: 98, suffix: '%', label: 'Satisfacción' },
              { value: 1200, suffix: '+', label: 'Recibos generados' },
              { value: 150, suffix: '+', label: 'Propietarios activos' },
              { value: 10, suffix: 'min', label: 'Para empezar' },
            ].map((stat, i) => (
              <motion.div key={stat.label} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6 text-center"
              >
                <p className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold text-white">
                  <NumberTicker value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-wider text-primary font-semibold">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how" className="border-t border-white/[0.04] px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mb-16 max-w-2xl">
            <SectionEyebrow>{t.home.how.eyebrow}</SectionEyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance leading-tight">{t.home.how.title}</h2>
            <p className="mt-4 text-base text-slate-500 leading-relaxed text-balance">{t.home.how.subtitle}</p>
          </motion.div>

          <div className="relative grid grid-cols-1 gap-10 pt-10 md:grid-cols-3 md:gap-6 lg:gap-8">
            <div aria-hidden className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-10 hidden h-px -translate-y-1/2 bg-white/[0.06] md:block">
              <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, margin: '-120px' }} transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0 origin-left bg-gradient-to-r from-primary to-primary/70" />
            </div>

            {t.home.how.steps.map((step, i) => (
              <motion.div key={step.n} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="relative">
                <MagicCard className="h-full rounded-2xl border border-white/[0.06] bg-slate-900/50 px-7 pt-14 pb-7 transition-colors hover:border-white/10">
                  <div aria-hidden className="absolute left-1/2 top-0 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 ring-8 ring-slate-950">
                    <span className="text-sm font-bold tracking-wider">{step.n}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">{step.body}</p>
                  <div className="mt-6 h-px overflow-hidden bg-white/[0.06]">
                    <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 1.2, delay: i * 0.25 + 0.4, ease: [0.16, 1, 0.3, 1] }} className="h-full origin-left bg-gradient-to-r from-primary to-primary/70" />
                  </div>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-primary">Paso {i + 1} de {t.home.how.steps.length}</p>
                </MagicCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Property Marquee ─────────────────────────────────────── */}
      <section aria-label="Propiedades gestionadas" className="border-t border-white/[0.04] py-16 sm:py-24">
        <div className="mx-auto mb-10 max-w-6xl px-4">
          <SectionEyebrow>Ya funcionando</SectionEyebrow>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
            <Balancer>Propietarios como vos ya usan MyRent para administrar sus alquileres.</Balancer>
          </h2>
        </div>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <Marquee pauseOnHover className="[--duration:45s]">
            {MOCK_PROPERTIES.map((p) => <PropertyCard key={p.name} {...p} />)}
          </Marquee>
          <Marquee reverse pauseOnHover className="[--duration:55s]">
            {MOCK_PROPERTIES.slice().reverse().map((p) => <PropertyCard key={`r-${p.name}`} {...p} />)}
          </Marquee>
        </div>
      </section>

      {/* ── Pain Points ──────────────────────────────────────────── */}
      <section className="relative px-4 py-20 sm:py-28 border-t border-white/[0.04]">
        <div className="relative mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mb-12 max-w-2xl">
            <SectionEyebrow>{t.home.pain.eyebrow}</SectionEyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance leading-tight">{t.home.pain.title}</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {t.home.pain.symptoms.map((sym, i) => (
              <motion.div key={sym.title} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/60 text-slate-400">
                  <AlertTriangle className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{sym.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{sym.body}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="lg:col-span-2">
              <h3 className="text-xl font-bold tracking-tight text-white mb-5">{t.home.pain.outcomesTitle}</h3>
              <ul className="space-y-3">
                {t.home.pain.outcomes.map((o) => (
                  <li key={o} className="flex items-start gap-3 text-[13px] text-slate-400 leading-relaxed">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="h-3 w-3" aria-hidden />
                    </span>
                    {o}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:col-span-3 rounded-2xl border border-primary/15 bg-primary/[0.03] p-8 sm:p-10"
            >
              <SectionEyebrow>{t.home.solution.eyebrow}</SectionEyebrow>
              <h3 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance leading-tight mb-6">{t.home.solution.title}</h3>
              <div className="space-y-4 text-[13px] sm:text-sm text-slate-400 leading-relaxed">
                <p>{t.home.solution.empathy}</p>
                <p>{t.home.solution.authority}</p>
                <p className="text-white font-medium">{t.home.solution.promise}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── About Us ─────────────────────────────────────────────── */}
      <section id="about" className="border-t border-white/[0.04] px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-12 max-w-2xl">
            <SectionEyebrow>{t.home.aboutUs.eyebrow}</SectionEyebrow>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-[2.75rem] font-extrabold tracking-tight text-white text-balance leading-[1.05]">{t.home.aboutUs.title}</h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-start">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-3 space-y-5 text-sm text-slate-400 leading-relaxed"
            >
              <p>{t.home.aboutUs.paragraph1}</p>
              <p>{t.home.aboutUs.paragraph2}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-2 grid grid-cols-3 lg:grid-cols-1 gap-4"
            >
              {t.home.aboutUs.stats.map((s) => {
                const match = /^(\d+)(.*)$/.exec(s.value)
                return (
                  <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-5 text-center lg:text-left">
                    <p className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                      {match ? <NumberTicker value={Number(match[1])} suffix={match[2]} /> : s.value}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-primary font-semibold">{s.label}</p>
                  </div>
                )
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features (Bento) ─────────────────────────────────────── */}
      <section id="services" className="border-t border-white/[0.04] px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mb-12 max-w-2xl">
            <SectionEyebrow>{t.home.features.title}</SectionEyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance leading-tight">{t.home.features.subtitle}</h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-4 md:grid-rows-[repeat(2,minmax(200px,1fr))]">
            {features.map((feature, index) => {
              const bentoSpans = ['md:col-span-2 md:row-span-2', 'md:col-span-2 md:row-span-1', 'md:col-span-1 md:row-span-1', 'md:col-span-1 md:row-span-1']
              const isHero = index === 0
              return (
                <motion.div key={feature.title} custom={index} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className={bentoSpans[index]}>
                  <MagicCard
                    gradientColor="rgba(59,130,246,0.08)"
                    gradientFrom="hsl(217,55%,58%)"
                    gradientTo="hsl(217,55%,38%)"
                    className="h-full overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/50 transition-colors hover:border-white/10"
                  >
                    <div className={`relative flex h-full flex-col ${isHero ? 'p-8 sm:p-10' : 'p-7'}`}>
                      {isHero && <BorderBeam size={220} duration={12} />}
                      <div className={`mb-5 inline-flex items-center justify-center rounded-xl bg-primary/10 ${isHero ? 'h-14 w-14' : 'h-10 w-10'}`}>
                        <feature.icon className={`text-primary ${isHero ? 'h-7 w-7' : 'h-5 w-5'}`} aria-hidden />
                      </div>
                      <h3 className={`mb-2 text-white leading-tight ${isHero ? 'text-2xl sm:text-3xl font-bold tracking-tight' : 'text-base font-semibold'}`}>
                        <Balancer>{feature.title}</Balancer>
                      </h3>
                      <p className={`text-slate-500 leading-relaxed text-pretty ${isHero ? 'text-sm' : 'text-[13px]'}`}>{feature.description}</p>
                      {isHero && (
                        <>
                          <div className="mt-6 grid grid-cols-3 gap-2">
                            {[0, 1, 2].map((n) => (
                              <div key={n} className="rounded-lg border border-white/[0.06] bg-slate-800/40 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-slate-600">{['Cobrado', 'Pendiente', 'Vencido'][n]}</p>
                                <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-white tabular-nums">
                                  <NumberTicker value={[1240000, 320000, 85000][n]} prefix="$" format={{ notation: 'compact' }} />
                                </p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-auto flex items-center gap-1.5 pt-6 text-[11px] font-semibold uppercase tracking-wider text-primary">
                            Incluido desde el día 1
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </div>
                        </>
                      )}
                      {index === 1 && (
                        <div className="mt-4 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            <Zap className="h-3 w-3" aria-hidden />
                            Envío auto
                          </span>
                        </div>
                      )}
                    </div>
                  </MagicCard>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section className="border-t border-white/[0.04] px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mb-12 text-center">
            <SectionEyebrow>{t.home.testimonials.eyebrow}</SectionEyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">{t.home.testimonials.title}</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {t.home.testimonials.items.map((item, i) => (
              <motion.div key={item.name} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-7"
              >
                <div className="mb-5 flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3 w-3 text-primary fill-primary" aria-hidden />
                  ))}
                </div>
                <p className="text-[13px] text-slate-400 leading-relaxed mb-6">&ldquo;{item.quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-5 border-t border-white/[0.04]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">{item.initials}</div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-600">{item.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Us ───────────────────────────────────────────────── */}
      <section id="why" className="border-t border-white/[0.04] px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mb-12 max-w-2xl">
            <SectionEyebrow>{t.home.whyUs.eyebrow}</SectionEyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance leading-tight">{t.home.whyUs.title}</h2>
          </motion.div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {t.home.whyUs.items.map((item, i) => (
              <motion.li key={item} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                <div className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-slate-900/50 p-5 transition-colors hover:border-white/10">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-[13px] font-medium text-slate-400 leading-relaxed">{item}</span>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="border-t border-white/[0.04] px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mb-12 text-center">
            <SectionEyebrow>{t.home.faq.eyebrow}</SectionEyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">{t.home.faq.title}</h2>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-2">
            {t.home.faq.items.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-2xl border border-white/[0.06] bg-slate-900/50 px-6 overflow-hidden data-[state=open]:border-primary/20">
                <AccordionTrigger className="py-5 text-left text-[13px] font-semibold text-white hover:no-underline [&[data-state=open]>svg]:text-primary">
                  <span className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-[10px] font-bold text-slate-600">{String(i + 1).padStart(2, '0')}</span>
                    {item.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[13px] text-slate-500 leading-relaxed">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.04] px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <SectionEyebrow>Empezá ahora</SectionEyebrow>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl sm:text-[2.75rem] font-extrabold tracking-tight text-white leading-[1.05]">
              <Balancer>{t.home.cta2.title}</Balancer>
            </h2>
            <p className="mt-5 text-base text-slate-500 leading-relaxed max-w-xl mx-auto">{t.home.cta2.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 h-13 rounded-full group shadow-xl shadow-primary/15 transition-all duration-200">
                <Link href="/signup" className="flex items-center gap-2">
                  {t.home.cta2.button}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06] hover:text-white font-semibold h-13 rounded-full">
                <Link href="/login">{t.home.login}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Instagram ───────────────────────────────────────────── */}
      <section id="instagram" className="border-t border-white/[0.04] px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="lg:col-span-3">
              <SectionEyebrow>{t.home.instagram.eyebrow}</SectionEyebrow>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl sm:text-[2.75rem] font-extrabold tracking-tight text-balance leading-[1.05] text-white">{t.home.instagram.title}</h2>
              <p className="mt-5 text-base text-slate-500 leading-relaxed text-balance max-w-xl">{t.home.instagram.subtitle}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="bg-slate-800 hover:bg-slate-700 text-white font-semibold h-12 px-6 rounded-full">
                  <a href="https://instagram.com/myrent.ar" target="_blank" rel="noreferrer noopener" className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" aria-hidden />
                    {t.home.instagram.handle}
                  </a>
                </Button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="lg:col-span-2 relative mx-auto">
              <div className="relative aspect-square w-full max-w-[280px] rounded-3xl border border-white/[0.06] bg-slate-900/50 p-[1px]">
                <div className="flex h-full w-full flex-col items-center justify-center rounded-3xl p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 mb-4">
                    <Instagram className="h-7 w-7" aria-hidden />
                  </div>
                  <p className="font-[family-name:var(--font-display)] text-lg font-bold text-white">{t.home.instagram.handle}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-600">Instagram</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-2">
              <Link href="/" className="flex items-center gap-2" aria-label="MyRent inicio">
                <span className="text-base font-semibold tracking-tight text-white">My<span className="text-primary">Rent</span></span>
              </Link>
              <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-slate-600">{t.home.footer.tagline}</p>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t.home.footer.product}</p>
              <ul className="space-y-2 text-[13px] text-slate-600">
                <li><a href="#services" className="hover:text-white transition-colors">{t.home.footer.productLinks[0]}</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">{t.home.footer.productLinks[1]}</a></li>
                <li><a href="#instagram" className="hover:text-white transition-colors">{t.home.footer.productLinks[2]}</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t.home.footer.company}</p>
              <ul className="space-y-2 text-[13px]">
                {t.home.footer.companyLinks.map((label) => (
                  <li key={label}><span className="text-slate-600">{label}</span></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.04] pt-6 text-[11px] text-slate-700 sm:flex-row">
            <span>{t.home.footer.rights}</span>
            <span>{t.home.footer.legal}</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
