import type { Metadata } from 'next'
import TenantLoginForm from './TenantLoginForm'

export const metadata: Metadata = {
  title: 'Portal del Inquilino | MyRent',
  description: 'Accedé al portal del inquilino para ver tus contratos, recibos y pagos.',
}

export default function TenantLoginPage() {
  return <TenantLoginForm />
}
