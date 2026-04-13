'use client'

import { useState, useCallback } from 'react'
import type { ZodSchema, ZodError } from 'zod'

type FieldErrors = Record<string, string>

/**
 * Hook para validación client-side con Zod.
 * Valida campos individuales on blur y el form completo on submit.
 */
export function useFormValidation<T>(schema: ZodSchema<T>) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  /** Valida un campo individual. Llamar en onBlur. */
  const validateField = useCallback(
    (name: string, _value: unknown, allValues?: Record<string, unknown>) => {
      // Para campos con refine/superRefine, necesitamos validar el objeto completo
      // pero solo mostrar el error del campo actual
      if (allValues) {
        const result = schema.safeParse(allValues)
        if (!result.success) {
          const fieldError = result.error.errors.find((e) => e.path[0] === name)
          setFieldErrors((prev) => {
            if (fieldError) return { ...prev, [name]: fieldError.message }
            const { [name]: _, ...rest } = prev
            return rest
          })
          return
        }
      }

      setFieldErrors((prev) => {
        const { [name]: _, ...rest } = prev
        return rest
      })
    },
    [schema],
  )

  /** Valida todos los datos. Devuelve los datos parseados o null si hay errores. */
  const validateAll = useCallback(
    (data: unknown): T | null => {
      const result = schema.safeParse(data)
      if (result.success) {
        setFieldErrors({})
        return result.data
      }

      const errors: FieldErrors = {}
      for (const err of (result.error as ZodError).errors) {
        const key = String(err.path[0])
        if (!errors[key]) errors[key] = err.message
      }
      setFieldErrors(errors)
      return null
    },
    [schema],
  )

  /** Limpia todos los errores. */
  const clearErrors = useCallback(() => setFieldErrors({}), [])

  /** Limpia el error de un campo específico. */
  const clearFieldError = useCallback(
    (name: string) =>
      setFieldErrors((prev) => {
        const { [name]: _, ...rest } = prev
        return rest
      }),
    [],
  )

  return { fieldErrors, validateField, validateAll, clearErrors, clearFieldError }
}
