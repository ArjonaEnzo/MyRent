"use client"

import * as React from "react"
import NumberFlow, { type Format } from "@number-flow/react"
import { useInView } from "framer-motion"

import { cn } from "@/lib/utils"

interface NumberTickerProps {
  value: number
  prefix?: string
  suffix?: string
  className?: string
  format?: Format
  locales?: string | string[]
}

export function NumberTicker({
  value,
  prefix,
  suffix,
  className,
  format,
  locales = "es-AR",
}: NumberTickerProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    if (inView) setDisplayValue(value)
  }, [inView, value])

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      <NumberFlow value={displayValue} locales={locales} format={format} />
      {suffix}
    </span>
  )
}
