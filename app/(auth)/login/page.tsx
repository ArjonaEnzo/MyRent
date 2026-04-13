import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Iniciar Sesión | MyRent',
  description: 'Ingresá a tu cuenta de MyRent para gestionar tus propiedades y alquileres.',
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
