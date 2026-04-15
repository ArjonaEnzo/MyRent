'use server'

import { getCurrentUserWithAccount, requireRole } from '@/lib/supabase/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { propertySchema, type PropertyInput } from '@/lib/validations/property'
import type { Database } from '@/types/database.types'

type Property = Database['public']['Tables']['properties']['Row']

export type PropertyWithActiveLease = Pick<Property, 'id' | 'name' | 'address' | 'created_at' | 'cover_image_url'> & {
  active_lease: {
    id: string
    rent_amount: number
    currency: string
    tenant_name: string | null
  } | null
}
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { logger, logError } from '@/lib/utils/logger'
import { z } from 'zod'
import { propertyRateLimit } from '@/lib/utils/rate-limit'
import { validateId } from '@/lib/validations/common'
import { checkQuota } from '@/lib/subscriptions/plan-limits'

export async function createProperty(formData: PropertyInput) {
  try {
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    await propertyRateLimit.limit(user.id)

    const quota = await checkQuota(accountId, 'property')
    if (!quota.allowed) {
      return { success: false, error: quota.reason ?? 'Límite de plan alcanzado' }
    }

    const validated = propertySchema.parse(formData)

    const { error } = await supabase.from('properties').insert({
      account_id: accountId,
      name: validated.name,
      address: validated.address,
    })

    if (error) {
      logger.error('Failed to create property', { error: error.message })
      return { success: false, error: 'Error al crear la propiedad' }
    }

    logger.info('Property created', { userId: user.id, accountId })
    revalidatePath('/properties')
    redirect('/properties')
  } catch (error) {
    if (isRedirectError(error)) throw error

    logError(error, { action: 'createProperty' })

    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos inválidos', errors: error.errors }
    }

    return { success: false, error: 'Error al crear la propiedad' }
  }
}

export async function updateProperty(id: string, formData: PropertyInput) {
  try {
    const validId = validateId(id)

    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])
    const validated = propertySchema.parse(formData)

    const { error } = await supabase
      .from('properties')
      .update({
        name: validated.name,
        address: validated.address,
      })
      .eq('id', validId)
      .eq('account_id', accountId)

    if (error) {
      logger.error('Failed to update property', { error: error.message })
      return { success: false, error: 'Error al actualizar la propiedad' }
    }

    logger.info('Property updated', { propertyId: validId, userId: user.id })
    revalidatePath('/properties')
    redirect('/properties')
  } catch (error) {
    if (isRedirectError(error)) throw error

    logError(error, { action: 'updateProperty' })

    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos inválidos', errors: error.errors }
    }

    return { success: false, error: 'Error al actualizar la propiedad' }
  }
}

export async function deleteProperty(id: string) {
  try {
    const validId = validateId(id)

    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    // Verificar que no tenga contratos activos
    const { count } = await supabase
      .from('leases')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', validId)
      .eq('account_id', accountId)
      .eq('status', 'active')

    if (count && count > 0) {
      return {
        success: false,
        error: 'No puedes archivar una propiedad que tiene contratos activos',
      }
    }

    const { error } = await supabase.rpc('archive_property', {
      p_actor_user_id: user.id,
      p_account_id: accountId,
      p_property_id: validId,
    })

    if (error) {
      logger.error('Failed to archive property', { error: error.message })
      return { success: false, error: 'Error al eliminar la propiedad' }
    }

    logger.info('Property archived', { propertyId: validId, userId: user.id })
    revalidatePath('/properties')
    return { success: true }
  } catch (error) {
    logError(error, { action: 'deleteProperty' })
    return { success: false, error: 'Error al eliminar la propiedad' }
  }
}

export async function getProperties(options?: {
  page?: number
  limit?: number
  search?: string
}): Promise<{ properties: PropertyWithActiveLease[]; total: number }> {
  const { accountId, supabase } = await getCurrentUserWithAccount()

  const page = options?.page ?? 1
  const limit = options?.limit ?? 50
  const safePage = Math.max(1, Math.floor(page))
  const safeLimit = Math.min(Math.max(1, limit), 100)
  const from = (safePage - 1) * safeLimit
  const to = from + safeLimit - 1

  let query = supabase
    .from('properties')
    .select('id, name, address, created_at, cover_image_url', { count: 'exact' })
    .eq('account_id', accountId)
    .is('deleted_at', null)

  if (options?.search) {
    // Sanitizar caracteres especiales del parser de PostgREST (.or string)
    // , ( ) tienen significado especial y romperían el filtro si vienen del usuario.
    const safeSearch = options.search.replace(/[,()\\._%;:]/g, ' ').trim()
    if (safeSearch) {
      query = query.or(`name.ilike.%${safeSearch}%,address.ilike.%${safeSearch}%`)
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    logger.error('Failed to fetch properties', { error: error.message })
    return { properties: [], total: 0 }
  }

  // Fetch active leases for these properties in a single query
  const leaseByProperty = new Map<string, { id: string; rent_amount: number; currency: string; tenant_name: string | null }>()
  if (data.length > 0) {
    const propertyIds = data.map((p) => p.id)
    const { data: activeLeases } = await supabase
      .from('leases')
      .select('id, property_id, rent_amount, currency, tenants(full_name)')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .in('property_id', propertyIds)

    activeLeases?.forEach((l) => {
      const tenants = l.tenants as { full_name: string | null } | null
      leaseByProperty.set(l.property_id, {
        id: l.id,
        rent_amount: l.rent_amount,
        currency: l.currency,
        tenant_name: tenants?.full_name ?? null,
      })
    })
  }

  const properties: PropertyWithActiveLease[] = data.map((p) => ({
    ...p,
    active_lease: leaseByProperty.get(p.id) ?? null,
  }))

  return { properties, total: count ?? 0 }
}

export async function reactivateProperty(id: string) {
  try {
    const validId = validateId(id)
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    const { error } = await supabase
      .from('properties')
      .update({ deleted_at: null, deleted_by: null, delete_reason: null })
      .eq('id', validId)
      .eq('account_id', accountId)

    if (error) {
      logger.error('Failed to reactivate property', { error: error.message })
      return { success: false, error: 'Error al reactivar la propiedad' }
    }

    logger.info('Property reactivated', { propertyId: validId, userId: user.id })
    revalidatePath('/properties')
    return { success: true }
  } catch (error) {
    logError(error, { action: 'reactivateProperty' })
    return { success: false, error: 'Error al reactivar la propiedad' }
  }
}

export async function getArchivedProperties(): Promise<PropertyWithActiveLease[]> {
  const { accountId, supabase } = await getCurrentUserWithAccount()

  const { data, error } = await supabase
    .from('properties')
    .select('id, name, address, created_at, cover_image_url')
    .eq('account_id', accountId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) {
    logger.error('Failed to fetch archived properties', { error: error.message })
    return []
  }
  return data.map((p) => ({ ...p, active_lease: null }))
}

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB per image

export async function uploadPropertyImages(
  propertyId: string,
  files: { name: string; type: string; buffer: number[] }[]
) {
  try {
    const validId = validateId(propertyId)
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])
    const adminSupabase = createAdminClient()

    const safeFiles = files.filter((f) => {
      if (!ALLOWED_IMAGE_MIME.has(f.type)) return false
      if (f.buffer.length > MAX_IMAGE_BYTES) return false
      return true
    })

    if (safeFiles.length === 0) {
      return { success: false, error: 'Formato o tamaño de imagen inválido (solo JPG/PNG/WebP hasta 5 MB)' }
    }

    const { count } = await supabase
      .from('property_images')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', validId)
      .eq('account_id', accountId)

    const current = count ?? 0
    const remaining = 6 - current
    if (remaining <= 0) {
      return { success: false, error: 'Ya tiene el máximo de 6 imágenes' }
    }

    const toUpload = safeFiles.slice(0, remaining)
    const uploaded: { url: string; storage_path: string }[] = []

    for (const file of toUpload) {
      const ext = MIME_TO_EXT[file.type] ?? 'jpg'
      const path = `${accountId}/${validId}/${crypto.randomUUID()}.${ext}`
      const buffer = Buffer.from(file.buffer)

      const { error: uploadError } = await adminSupabase.storage
        .from('property-images')
        .upload(path, buffer, { contentType: file.type, upsert: false })

      if (uploadError) {
        logger.error('Failed to upload property image', { error: uploadError.message })
        continue
      }

      const { data: signedData } = await adminSupabase.storage
        .from('property-images')
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5)

      if (signedData?.signedUrl) {
        uploaded.push({ url: signedData.signedUrl, storage_path: path })
      }
    }

    if (uploaded.length === 0) {
      return { success: false, error: 'No se pudieron subir las imágenes' }
    }

    const isFirstBatch = current === 0
    const rows = uploaded.map((img, i) => ({
      account_id: accountId,
      property_id: validId,
      storage_path: img.storage_path,
      url: img.url,
      is_cover: isFirstBatch && i === 0,
      position: current + i,
    }))

    const { error: insertError } = await supabase.from('property_images').insert(rows)
    if (insertError) {
      logger.error('Failed to insert property images', { error: insertError.message })
      return { success: false, error: 'Error al guardar las imágenes' }
    }

    if (isFirstBatch) {
      await supabase
        .from('properties')
        .update({ cover_image_url: uploaded[0].url })
        .eq('id', validId)
        .eq('account_id', accountId)
    }

    revalidatePath(`/properties/${validId}`)
    return { success: true, count: uploaded.length }
  } catch (error) {
    logError(error, { action: 'uploadPropertyImages' })
    return { success: false, error: 'Error al subir las imágenes' }
  }
}

export async function setCoverImage(propertyId: string, imageId: string) {
  try {
    const validPropertyId = validateId(propertyId)
    const validImageId = validateId(imageId)
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    await supabase
      .from('property_images')
      .update({ is_cover: false })
      .eq('property_id', validPropertyId)
      .eq('account_id', accountId)

    const { data: img, error } = await supabase
      .from('property_images')
      .update({ is_cover: true })
      .eq('id', validImageId)
      .eq('account_id', accountId)
      .select('url')
      .single()

    if (error) return { success: false, error: 'Error al actualizar la portada' }

    await supabase
      .from('properties')
      .update({ cover_image_url: img.url })
      .eq('id', validPropertyId)
      .eq('account_id', accountId)

    revalidatePath(`/properties/${validPropertyId}`)
    revalidatePath('/properties')
    return { success: true }
  } catch (error) {
    logError(error, { action: 'setCoverImage' })
    return { success: false, error: 'Error al actualizar la portada' }
  }
}

export async function deletePropertyImage(propertyId: string, imageId: string) {
  try {
    const validPropertyId = validateId(propertyId)
    const validImageId = validateId(imageId)
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])
    const adminSupabase = createAdminClient()

    const { data: img } = await supabase
      .from('property_images')
      .select('storage_path, is_cover')
      .eq('id', validImageId)
      .eq('account_id', accountId)
      .maybeSingle()

    if (!img) return { success: false, error: 'Imagen no encontrada' }

    await adminSupabase.storage.from('property-images').remove([img.storage_path])
    await supabase.from('property_images').delete().eq('id', validImageId)

    if (img.is_cover) {
      const { data: next } = await supabase
        .from('property_images')
        .select('id, url')
        .eq('property_id', validPropertyId)
        .eq('account_id', accountId)
        .order('position')
        .limit(1)
        .maybeSingle()

      if (next) {
        await supabase.from('property_images').update({ is_cover: true }).eq('id', next.id)
        await supabase.from('properties').update({ cover_image_url: next.url }).eq('id', validPropertyId)
      } else {
        await supabase.from('properties').update({ cover_image_url: null }).eq('id', validPropertyId)
      }
    }

    revalidatePath(`/properties/${validPropertyId}`)
    revalidatePath('/properties')
    return { success: true }
  } catch (error) {
    logError(error, { action: 'deletePropertyImage' })
    return { success: false, error: 'Error al eliminar la imagen' }
  }
}

export async function getPropertyImages(propertyId: string) {
  const validId = validateId(propertyId)
  const { accountId, supabase } = await getCurrentUserWithAccount()

  const { data, error } = await supabase
    .from('property_images')
    .select('*')
    .eq('property_id', validId)
    .eq('account_id', accountId)
    .order('position')

  if (error) return []
  return data
}

export async function getProperty(id: string): Promise<Property | null> {
  const validId = validateId(id)

  const { accountId, supabase } = await getCurrentUserWithAccount()

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', validId)
    .eq('account_id', accountId)
    .single()

  if (error) {
    return null
  }

  return data
}
