'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
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
 * Sube una foto de perfil al bucket "avatars" y guarda la URL en profiles
 */
export async function uploadAvatar(
  formData: FormData
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  try {
    const file = formData.get('avatar') as File | null
    if (!file || file.size === 0) return { success: false, error: 'No se seleccionó archivo' }

    if (file.size > 2 * 1024 * 1024)
      return { success: false, error: 'La imagen no puede superar 2 MB' }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      return { success: false, error: 'Formato no válido. Usar JPG, PNG o WebP' }

    const user = await getCurrentUser()
    const adminSupabase = createAdminClient()
    const supabase = await createClient()

    // Ensure the avatars bucket exists (creates it if not, safe to call always)
    await adminSupabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 2 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    })
    // Ignore error — it just means the bucket already exists

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`
    const bytes = await file.arrayBuffer()

    const { error: uploadError } = await adminSupabase.storage
      .from('avatars')
      .upload(path, bytes, { contentType: file.type, upsert: true })

    if (uploadError) {
      logger.error('Avatar upload failed', { error: uploadError.message })
      return { success: false, error: 'Error al subir la imagen' }
    }

    const { data: { publicUrl } } = adminSupabase.storage.from('avatars').getPublicUrl(path)

    // Cache-bust so the browser replaces the old image immediately
    const avatarUrl = `${publicUrl}?t=${Date.now()}`

    // Try to save to profiles.avatar_url (requires migration to be applied).
    // If the column doesn't exist yet, fall back to user metadata so the
    // avatar still works without needing a DB migration.
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)

    if (updateError) {
      // Fallback: store in auth user metadata
      await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } })
      logger.warn('Saved avatar to user metadata (profiles.avatar_url not available yet)', { userId: user.id })
    } else {
      logger.info('Avatar uploaded', { userId: user.id })
    }

    revalidatePath('/account')
    revalidatePath('/', 'layout')
    return { success: true, avatarUrl }
  } catch (error) {
    logError(error, { action: 'uploadAvatar' })
    return { success: false, error: 'Error al subir la foto de perfil' }
  }
}

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
            avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
            email: user.email || '',
          },
        }
      }
      throw new DatabaseError('Error al obtener el perfil', error.message)
    }

    // If avatar_url column doesn't exist yet (migration pending), fall back
    // to the value stored in auth user metadata
    const avatar_url =
      data.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? null

    return {
      success: true,
      data: {
        ...data,
        avatar_url,
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
