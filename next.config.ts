import type { NextConfig } from "next";

// Security headers aplicados a todas las rutas
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requiere unsafe-inline/eval para dev
      "style-src 'self' 'unsafe-inline'", // Tailwind requiere unsafe-inline
      "img-src 'self' data: https://*.supabase.co https://res.cloudinary.com",
      "media-src 'self' https://res.cloudinary.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://res.cloudinary.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Aumentado para soportar upload de imágenes de propiedades
    },
    // Optimizar compilación y Fast Refresh
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    // Partial Prerendering (solo disponible en Next.js canary)
    // Descomentar cuando actualices a canary: ppr: 'incremental',
  },

  // Optimización de imágenes
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
    formats: ["image/avif", "image/webp"], // Formatos modernos más eficientes
  },

  // Evitar que dependencias server-only se incluyan en el bundle del cliente
  // @react-pdf/renderer y resend son pesadas y solo se usan en el servidor
  serverExternalPackages: ["@react-pdf/renderer"],

  // Security headers
  async headers() {
    return [
      {
        // Aplicar headers a todas las rutas
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
