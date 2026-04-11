import type { Metadata } from 'next'
import { Inter, Inter_Tight, Caveat } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import '@/lib/env'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { LanguageProvider } from '@/components/providers/language-provider'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-display', weight: ['600', '700', '800', '900'] })
const caveat = Caveat({ subsets: ['latin'], variable: '--font-script', weight: ['600', '700'] })

export const metadata: Metadata = {
  title: 'MyRent - Gestión de Alquileres',
  description: 'Administra tus propiedades e inquilinos de forma simple y profesional',
  keywords: ['alquileres', 'propiedades', 'inquilinos', 'recibos', 'gestión'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${interTight.variable} ${caveat.variable}`}>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <LanguageProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
