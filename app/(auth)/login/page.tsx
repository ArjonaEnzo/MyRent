'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from '@/lib/actions/auth'
import { Building2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useLanguage } from '@/components/providers/language-provider'

export default function LoginPage() {
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const result = await login(data)

    if (result && !result.success) {
      setError(result.error || 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-background">
      {/* Left Panel - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12 relative overflow-hidden"
      >
        {/* Toggles en esquina superior izquierda */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-4 left-4 flex items-center gap-2 z-20"
        >
          <ThemeToggle />
          <LanguageToggle />
        </motion.div>

        {/* Animated background */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 180],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [180, 90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-20 right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"
        />

        <div className="max-w-md text-primary-foreground space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
              className="rounded-xl bg-white/20 backdrop-blur-sm p-3 shadow-lg"
            >
              <Building2 className="h-8 w-8" />
            </motion.div>
            <h1 className="text-4xl font-bold">MyRent</h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-xl text-primary-foreground/90 leading-relaxed"
          >
            {t.home.subtitle}
          </motion.p>

          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-4 text-primary-foreground/90"
          >
            {t.auth.login.features.map((item, index) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                  className="h-2 w-2 rounded-full bg-primary-foreground/70 shadow-lg shadow-primary-foreground/30"
                />
                <span className="text-base">{item}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-primary/5 to-background relative">
        {/* Toggles para mobile (solo visible en pantallas pequeñas) */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:hidden absolute top-4 right-4 flex items-center gap-2 z-20"
        >
          <ThemeToggle />
          <LanguageToggle />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-2xl border-border/60 backdrop-blur-sm">
            <CardHeader className="text-center space-y-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="lg:hidden flex justify-center mb-4"
              >
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary p-2">
                    <Building2 className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h1 className="text-2xl font-bold text-primary">
                    MyRent
                  </h1>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex items-center justify-center gap-2"
              >
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl">{t.auth.login.title}</CardTitle>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-sm text-muted-foreground"
              >
                {t.auth.login.subtitle}
              </motion.p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="space-y-2"
                >
                  <Label htmlFor="email">{t.auth.login.email}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="tu@email.com"
                    className="transition-all focus:scale-[1.02]"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="space-y-2"
                >
                  <Label htmlFor="password">{t.auth.login.password}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder={t.auth.login.passwordPlaceholder}
                    className="transition-all focus:scale-[1.02]"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full shadow-lg shadow-primary/30"
                  >
                    {loading ? t.auth.login.submitting : t.auth.login.submit}
                  </Button>
                </motion.div>
              </form>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="mt-6 space-y-2 text-center text-sm text-muted-foreground"
              >
                <p>
                  {t.auth.login.noAccount}{' '}
                  <Link href="/signup" className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors">
                    {t.auth.login.signup}
                  </Link>
                </p>
                <p className="pt-2 border-t border-border/60">
                  ¿Sos inquilino?{' '}
                  <Link href="/tenant/login" className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors">
                    Accedé al portal
                  </Link>
                </p>
                <p>
                  <Link href="/" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
                    ← Volver al inicio
                  </Link>
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
