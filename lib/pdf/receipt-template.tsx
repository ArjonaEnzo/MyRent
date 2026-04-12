import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#333',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #2563eb',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    color: '#6b7280',
    fontSize: 10,
  },
  value: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  amountBox: {
    backgroundColor: '#eff6ff',
    padding: 20,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
  },
  lineItemsTable: {
    marginTop: 10,
    marginBottom: 10,
  },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottom: '1 solid #f3f4f6',
  },
  lineItemLabel: {
    fontSize: 11,
    color: '#374151',
    flex: 1,
  },
  lineItemAmount: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    textAlign: 'right',
    width: 120,
  },
  lineItemType: {
    fontSize: 8,
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    marginTop: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTop: '2 solid #2563eb',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    textAlign: 'right',
    width: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'center',
  },
})

interface LineItem {
  label: string
  amount: number
  item_type: string
}

interface ReceiptPDFProps {
  recipientName: string
  recipientAddress: string | null
  amount: number
  currency: string
  period: string
  date: string
  receiptId: string
  description?: string | null
  lineItems?: LineItem[]
}

function formatCurrency(amount: number, currency: string) {
  if (currency === 'ARS') {
    return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
  }
  return `US$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  rent: 'Alquiler',
  expensas: 'Expensas',
  extra: 'Extra',
  discount: 'Descuento',
  tax: 'Impuesto',
}

export function ReceiptPDF({
  recipientName,
  recipientAddress,
  amount,
  currency,
  period,
  date,
  receiptId,
  description,
  lineItems,
}: ReceiptPDFProps) {
  const hasLineItems = lineItems && lineItems.length > 0
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Recibo de Alquiler</Text>
          <Text style={styles.subtitle}>MyRent - Gestión de Propiedades</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del recibo</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Período</Text>
            <Text style={styles.value}>{period}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha de emisión</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>N° de recibo</Text>
            <Text style={styles.value}>{receiptId.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destinatario</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>{recipientName}</Text>
          </View>
          {recipientAddress && (
            <View style={styles.row}>
              <Text style={styles.label}>Dirección</Text>
              <Text style={styles.value}>{recipientAddress}</Text>
            </View>
          )}
        </View>

        {hasLineItems ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalle</Text>
            <View style={styles.lineItemsTable}>
              {lineItems.map((item, i) => (
                <View key={i} style={styles.lineItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineItemLabel}>{item.label}</Text>
                    <Text style={styles.lineItemType}>
                      {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
                    </Text>
                  </View>
                  <Text style={styles.lineItemAmount}>
                    {formatCurrency(item.amount, currency)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalAmount}>{formatCurrency(amount, currency)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>MONTO TOTAL</Text>
              <Text style={styles.amountValue}>{formatCurrency(amount, currency)}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Concepto</Text>
              {description ? (
                <Text style={styles.value}>{description}</Text>
              ) : (
                <Text style={styles.value}>Alquiler correspondiente al período {period}</Text>
              )}
            </View>
          </>
        )}

        {hasLineItems && description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observaciones</Text>
            <Text style={styles.value}>{description}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Recibo generado automáticamente por MyRent | ID: {receiptId}
        </Text>
      </Page>
    </Document>
  )
}
