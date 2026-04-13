import type { Metadata } from 'next'
import SignupForm from './SignupForm'

export const metadata: Metadata = {
  title: 'Crear Cuenta | MyRent',
  description: 'Registrate en MyRent para comenzar a gestionar tus propiedades y alquileres.',
}

export default function SignupPage() {
  return <SignupForm />
}
