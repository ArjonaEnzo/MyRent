'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  error?: string
  hint?: string
}

/**
 * Campo de formulario con label, error inline y hint opcional.
 */
export function FormField({ label, name, error, hint, className, id, ...props }: FormFieldProps) {
  const fieldId = id ?? name
  const errorId = `${fieldId}-error`
  const hintId = hint ? `${fieldId}-hint` : undefined

  const describedBy = [error ? errorId : null, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        name={name}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
