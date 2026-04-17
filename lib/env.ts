import { z } from 'zod'

// Trim whitespace/newlines that sometimes leak in from Vercel dashboard env input
const trimmed = z.string().transform((s) => s.trim())
const trimmedOptional = z
  .string()
  .optional()
  .transform((s) => s?.trim())

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: trimmed.pipe(z.string().url()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: trimmed.pipe(z.string().min(1)),
  SUPABASE_SERVICE_ROLE_KEY: trimmed.pipe(z.string().min(1)),
  RESEND_API_KEY: trimmed.pipe(z.string().min(1)),
  RESEND_FROM_EMAIL: trimmed.pipe(z.string().email()),
  NEXT_PUBLIC_APP_URL: trimmed.pipe(z.string().url()),
  // HelloSign (Dropbox Sign) - Opcional (solo si usas firmas digitales)
  HELLOSIGN_API_KEY: trimmedOptional,
  HELLOSIGN_CLIENT_ID: trimmedOptional,
  // Mercado Pago - Opcional (habilita pagos online de inquilinos)
  // Access Token: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/credentials
  MERCADOPAGO_ACCESS_TOKEN: trimmedOptional,
  // Webhook Secret: generado en Tus integraciones → Webhooks → agregar URL
  MERCADOPAGO_WEBHOOK_SECRET: trimmedOptional,
  // Mercado Pago OAuth — habilita que cada cuenta conecte su propio MP
  // App ID y Client Secret se obtienen en https://www.mercadopago.com.ar/developers/panel/app
  MERCADOPAGO_APP_ID: trimmedOptional,
  MERCADOPAGO_CLIENT_SECRET: trimmedOptional,
  // Cron Secret — protege la ruta /api/cron/* (Vercel lo envía automáticamente)
  CRON_SECRET: trimmedOptional,
  // Google Maps server-side key — usado para Geocoding API + Static Maps
  // (restringida por IP en Google Cloud Console, NO por HTTP referrer).
  // La key client-side (autocomplete) es NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
  GOOGLE_MAPS_SERVER_KEY: trimmedOptional,
})

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  HELLOSIGN_API_KEY: process.env.HELLOSIGN_API_KEY,
  HELLOSIGN_CLIENT_ID: process.env.HELLOSIGN_CLIENT_ID,
  MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
  MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET,
  MERCADOPAGO_APP_ID: process.env.MERCADOPAGO_APP_ID,
  MERCADOPAGO_CLIENT_SECRET: process.env.MERCADOPAGO_CLIENT_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
  GOOGLE_MAPS_SERVER_KEY: process.env.GOOGLE_MAPS_SERVER_KEY,
})
