'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import {
  updateProfileSchema,
  updateEmailSchema,
  updatePasswordSchema,
  type UpdateProfileInput,
  type UpdateEmailInput,
  type UpdatePasswordInput,
} from '@/lib/validations/profile'
import { logger, logError } from '@/lib/utils/logger'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ValidationError, DatabaseError } from '@/lib/utils/errors'

/**
 * Obtiene el perfil del usuario autenticado
 */
export async function getProfile() {
  try {
    const user = await getCurrentUser()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Perfil no existe, crearlo
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id, full_name: '' })
          .select()
          .single()

        if (insertError) {
          throw new DatabaseError('Error al crear el perfil', insertError.message)
        }

        return {
          success: true,
          data: {
            ...newProfile,
            email: user.email || '',
          },
        }
      }
      throw new DatabaseError('Error al obtener el perfil', error.message)
    }

    return {
      success: true,
      data: {
        ...data,
        email: user.email || '',
      },
    }
  } catch (error) {
    logError(error, { action: 'getProfile' })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener el perfil',
    }
  }
}

/**
 * Actualiza el nombre del usuario
 */
export async function updateProfile(formData: UpdateProfileInput) {
  try {
    const validatedData = updateProfileSchema.parse(formData)
    const user = await getCurrentUser()
    const supabase = await createClient()

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: validatedData.fullName })
      .eq('id', user.id)

    if (error) {
      throw new DatabaseError('Error al actualizar el perfil', error.message)
    }

    logger.info('Profile updated successfully', {
      userId: user.id,
    })

    revalidatePath('/account')

    return {
      success: true,
      message: 'Nombre actualizado correctamente',
    }
  } catch (error) {
    logError(error, { action: 'updateProfile' })

    if (error instanceof z.ZodError) {
      throw new ValidationError('Datos inválidos', error.errors)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar el perfil',
    }
  }
}

/**
 * Actualiza el email del usuario
 * Requiere confirmar con contraseña actual
 */
export async function updateEmail(formData: UpdateEmailInput) {
  try {
    const validatedData = updateEmailSchema.parse(formData)
    const user = await getCurrentUser()
    const supabase = await createClient()

    // Verificar que la contraseña es correcta
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: validatedData.password,
    })

    if (signInError) {
      logger.error('Password verification failed for email update', {
        userId: user.id,
        error: signInError.message,
      })
      return {
        success: false,
        error: 'Contraseña incorrecta',
      }
    }

    // Actualizar el email (Supabase manejará el error si el email ya está en uso)
    const { error: updateError } = await supabase.auth.updateUser({
      email: validatedData.email,
    })

    if (updateError) {
      logger.error('Email update failed', {
        userId: user.id,
        error: updateError.message,
      })

      // Manejar errores específicos
      if (updateError.message.includes('already been taken') || updateError.message.includes('already exists')) {
        return {
          success: false,
          error: 'Este email ya está en uso',
        }
      }

      return {
        success: false,
        error: updateError.message,
      }
    }

    logger.info('Email updated successfully', {
      userId: user.id,
      newEmail: validatedData.email,
    })

    revalidatePath('/account')

    return {
      success: true,
      message: 'Se ha enviado un email de confirmación a tu nueva dirección. Por favor, verifica tu email.',
    }
  } catch (error) {
    logError(error, { action: 'updateEmail' })

    if (error instanceof z.ZodError) {
      throw new ValidationError('Datos inválidos', error.errors)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar el email',
    }
  }
}

/**
 * Actualiza la contraseña del usuario
 * Requiere confirmar con contraseña actual
 */
export async function updatePassword(formData: UpdatePasswordInput) {
  try {
    const validatedData = updatePasswordSchema.parse(formData)
    const user = await getCurrentUser()
    const supabase = await createClient()

    // Verificar que la contraseña actual es correcta
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: validatedData.currentPassword,
    })

    if (signInError) {
      logger.error('Password verification failed for password update', {
        userId: user.id,
        error: signInError.message,
      })
      return {
        success: false,
        error: 'Contraseña actual incorrecta',
      }
    }

    // Actualizar la contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: validatedData.newPassword,
    })

    if (updateError) {
      logger.error('Password update failed', {
        userId: user.id,
        error: updateError.message,
      })
      return {
        success: false,
        error: updateError.message,
      }
    }

    logger.info('Password updated successfully', {
      userId: user.id,
    })

    return {
      success: true,
      message: 'Contraseña actualizada correctamente',
    }
  } catch (error) {
    logError(error, { action: 'updatePassword' })

    if (error instanceof z.ZodError) {
      throw new ValidationError('Datos inválidos', error.errors)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar la contraseña',
    }
  }
}
