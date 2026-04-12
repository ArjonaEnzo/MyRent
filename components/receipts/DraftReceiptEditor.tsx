'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus,
  Trash2,
  Send,
  Loader2,
  FileText,
  DollarSign,
} from 'lucide-react'
import { addLineItem, updateLineItem, removeLineItem, finalizeReceipt } from '@/lib/actions/receipts'
import { LINE_ITEM_TYPES } from '@/lib/validations/receipt'
import type { Database } from '@/types/database.types'
import { toast } from 'sonner'

type Receipt = Database['public']['Tables']['receipts']['Row']
type ReceiptLineItem = Database['public']['Tables']['receipt_line_items']['Row']

const ITEM_TYPE_LABELS: Record<string, string> = {
  rent: 'Alquiler',
  expensas: 'Expensas',
  extra: 'Extra',
  discount: 'Descuento',
  tax: 'Impuesto',
}

interface DraftReceiptEditorProps {
  receipt: Receipt
  lineItems: ReceiptLineItem[]
  tenantName: string
  tenantEmail: string | null
}

export function DraftReceiptEditor({
  receipt,
  lineItems: initialLineItems,
  tenantName,
  tenantEmail,
}: DraftReceiptEditorProps) {
  const router = useRouter()
  const [lineItems, setLineItems] = useState(initialLineItems)
  const [isPending, startTransition] = useTransition()
  const [finalizing, setFinalizing] = useState(false)

  // New item form state
  const [newLabel, setNewLabel] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newType, setNewType] = useState<string>('expensas')
  const [addingItem, setAddingItem] = useState(false)

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0)

  function formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  async function handleAddItem() {
    const amount = parseFloat(newAmount)
    if (!newLabel.trim() || isNaN(amount) || amount === 0) {
      toast.error('Completá la descripción y el monto')
      return
    }

    setAddingItem(true)
    const result = await addLineItem({
      receipt_id: receipt.id,
      label: newLabel.trim(),
      amount: newType === 'discount' ? -Math.abs(amount) : amount,
      item_type: newType as typeof LINE_ITEM_TYPES[number],
    })

    if (result.success && result.data) {
      setLineItems((prev) => [...prev, result.data!])
      setNewLabel('')
      setNewAmount('')
      setNewType('expensas')
      toast.success('Concepto agregado')
    } else {
      toast.error(result.error ?? 'Error al agregar concepto')
    }
    setAddingItem(false)
  }

  async function handleUpdateAmount(item: ReceiptLineItem, newVal: string) {
    const amount = parseFloat(newVal)
    if (isNaN(amount) || amount === 0) return

    startTransition(async () => {
      const result = await updateLineItem({
        id: item.id,
        amount: item.item_type === 'discount' ? -Math.abs(amount) : amount,
      })
      if (result.success) {
        setLineItems((prev) =>
          prev.map((li) =>
            li.id === item.id
              ? { ...li, amount: item.item_type === 'discount' ? -Math.abs(amount) : amount }
              : li
          )
        )
      } else {
        toast.error(result.error ?? 'Error al actualizar')
      }
    })
  }

  async function handleUpdateLabel(item: ReceiptLineItem, newLabel: string) {
    if (!newLabel.trim()) return

    startTransition(async () => {
      const result = await updateLineItem({ id: item.id, label: newLabel.trim() })
      if (result.success) {
        setLineItems((prev) =>
          prev.map((li) => (li.id === item.id ? { ...li, label: newLabel.trim() } : li))
        )
      }
    })
  }

  async function handleRemoveItem(itemId: string) {
    startTransition(async () => {
      const result = await removeLineItem(itemId)
      if (result.success) {
        setLineItems((prev) => prev.filter((li) => li.id !== itemId))
        toast.success('Concepto eliminado')
      } else {
        toast.error(result.error ?? 'Error al eliminar')
      }
    })
  }

  async function handleFinalize() {
    setFinalizing(true)
    const result = await finalizeReceipt(receipt.id)
    if (result.success) {
      toast.success('Recibo finalizado y enviado')
      router.push(`/receipts/${receipt.id}`)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Error al finalizar')
      setFinalizing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Receipt summary */}
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Inquilino</p>
              <p className="font-semibold text-foreground">{tenantName}</p>
              {tenantEmail && (
                <p className="text-xs text-muted-foreground">{tenantEmail}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Período</p>
              <p className="font-semibold capitalize text-foreground">{receipt.period}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Conceptos
          </h3>
        </div>

        <div className="space-y-2">
          {lineItems.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                    {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
                  </span>
                </div>
                <Input
                  defaultValue={item.label}
                  onBlur={(e) => handleUpdateLabel(item, e.target.value)}
                  className="mt-1 h-8 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
                  disabled={isPending}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{receipt.snapshot_currency}</span>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={Math.abs(item.amount)}
                    onBlur={(e) => handleUpdateAmount(item, e.target.value)}
                    className="h-8 w-28 text-right text-sm font-semibold tabular-nums"
                    disabled={isPending}
                  />
                </div>

                {item.item_type !== 'rent' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add item form */}
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <div>
              <Label htmlFor="new-label" className="text-xs">Descripción</Label>
              <Input
                id="new-label"
                placeholder="Ej: Expensas, ABL, Cochera..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="mt-1"
                disabled={addingItem}
              />
            </div>
            <div>
              <Label htmlFor="new-type" className="text-xs">Tipo</Label>
              <select
                id="new-type"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                disabled={addingItem}
              >
                {LINE_ITEM_TYPES.filter((t) => t !== 'rent').map((type) => (
                  <option key={type} value={type}>
                    {ITEM_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="new-amount" className="text-xs">Monto</Label>
              <Input
                id="new-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="mt-1 w-28"
                disabled={addingItem}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddItem}
                disabled={addingItem || !newLabel.trim() || !newAmount}
                size="sm"
                variant="outline"
                className="gap-1.5"
              >
                {addingItem ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Total + Finalize */}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="text-2xl font-extrabold tabular-nums text-foreground">
                {receipt.snapshot_currency} {formatAmount(total)}
              </p>
            </div>
          </div>

          <Button
            onClick={handleFinalize}
            disabled={finalizing || lineItems.length === 0}
            className="gap-2"
            size="lg"
          >
            {finalizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Finalizar y enviar
          </Button>
        </div>
        {tenantEmail && (
          <p className="mt-2 text-xs text-muted-foreground">
            Se generará el PDF y se enviará al inquilino ({tenantEmail})
          </p>
        )}
      </div>
    </div>
  )
}
