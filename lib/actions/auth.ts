'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/supabase/tenant-auth'
import { signupSchema, loginSchema, type SignupInput, type LoginInput } from '@/lib/validations/auth'
import { redirect } from 'next/navigation'
import { logger, logError } from '@/lib/utils/logger'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { z } from 'zod'

export async function signup(formData: SignupInput) {
  try {
    const validatedData = signupSchema.parse(formData)
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (error) {
      logger.error('Signup failed', { error: error.message })
      return {
        success: false,
        error: error.message
      }
    }

    // Provisioning (accounts + account_users + profiles) is handled by the
    // handle_new_user() DB trigger on auth.users INSERT, or as a fallback by
    // getCurrentUserWithAccount() the first time the user hits any protected page.

    logger.info('User signed up successfully', {
      userId: data.user?.id,
      email: validatedData.email
    })

    redirect('/dashboard')

  } catch (error) {
    if (isRedirectError(error)) throw error

    logError(error, { action: 'signup' })

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Datos inválidos',
        errors: error.errors
      }
    }

    return {
      success: false,
      error: 'Error al crear la cuenta. Intenta de nuevo.'
    }
  }
}

export async function login(formData: LoginInput) {
  try {
    const validatedData = loginSchema.parse(formData)
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    })

    if (error) {
      logger.error('Login failed', { error: error.message })
      
      if (error.message.includes('Invalid login credentials')) {
        return { 
          success: false, 
          error: 'Email o contraseña incorrectos' 
        }
      }
      
      if (error.message.includes('Email not confirmed')) {
        return { 
          success: false, 
          error: 'Debes confirmar tu email antes de iniciar sesión' 
        }
      }
      
      return { 
        success: false, 
        error: error.message 
      }
    }

    logger.info('User logged in successfully', { 
      userId: data.user?.id,
      email: validatedData.email 
    })

    redirect('/dashboard')

  } catch (error) {
    if (isRedirectError(error)) throw error

    logError(error, { action: 'login' })

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Datos inválidos',
        errors: error.errors
      }
    }

    return {
      success: false,
      error: 'Error al iniciar sesión. Intenta de nuevo.'
    }
  }
}

/**
 * Login para inquilinos — redirige a /tenant/dashboard en lugar del dashboard de propietario.
 * Idéntico al flujo de `login` pero con destino diferente.
 */
export async function tenantLogin(formData: LoginInput) {
  try {
    const validatedData = loginSchema.parse(formData)
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    })

    if (error) {
      logger.error('Tenant login failed', { error: error.message })

      if (error.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Email o contraseña incorrectos' }
      }
      if (error.message.includes('Email not confirmed')) {
        return { success: false, error: 'Debes confirmar tu email antes de iniciar sesión' }
      }
      return { success: false, error: error.message }
    }

    logger.info('Tenant logged in successfully', {
      userId: data.user?.id,
      email: validatedData.email,
    })

    redirect('/tenant/dashboard')

  } catch (error) {
    if (isRedirectError(error)) throw error

    logError(error, { action: 'tenantLogin' })

    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos inválidos', errors: error.errors }
    }

    return { success: false, error: 'Error al iniciar sesión. Intenta de nuevo.' }
  }
}

export async function changeTenantPassword(formData: {
  currentPassword: string
  newPassword: string
}) {
  try {
    const { user, supabase } = await getCurrentTenant()

    if (!formData.newPassword || formData.newPassword.length < 8) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres' }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: formData.currentPassword,
    })

    if (signInError) {
      return { success: false, error: 'La contraseña actual es incorrecta' }
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: formData.newPassword,
    })

    if (updateError) {
      logger.error('Tenant password change failed', { error: updateError.message, userId: user.id })
      return { success: false, error: 'No se pudo actualizar la contraseña' }
    }

    logger.info('Tenant password changed', { userId: user.id })
    return { success: true }
  } catch (error) {
    logError(error, { action: 'changeTenantPassword' })
    return { success: false, error: 'Error al cambiar la contraseña' }
  }
}

export async function logout() {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      logger.error('Logout failed', { error: error.message })
      return { success: false, error: error.message }
    }
    
    logger.info('User logged out successfully')
    
    redirect('/login')
    
  } catch (error) {
    if (isRedirectError(error)) throw error

    logError(error, { action: 'logout' })
    return {
      success: false,
      error: 'Error al cerrar sesión'
    }
  }
}
