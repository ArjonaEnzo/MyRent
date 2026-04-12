"use client"

import * as React from "react"
import { motion, useMotionTemplate, useMotionValue } from "framer-motion"

import { cn } from "@/lib/utils"

interface MagicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  gradientSize?: number
  gradientColor?: string
  gradientOpacity?: number
  gradientFrom?: string
  gradientTo?: string
}

export function MagicCard({
  children,
  className,
  gradientSize = 220,
  gradientColor = "rgba(56,189,248,0.18)",
  gradientOpacity = 0.85,
  gradientFrom = "#38bdf8",
  gradientTo = "#0ea5e9",
  ...props
}: MagicCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = cardRef.current
      if (!el) return
      const { left, top } = el.getBoundingClientRect()
      mouseX.set(e.clientX - left)
      mouseY.set(e.clientY - top)
    },
    [mouseX, mouseY],
  )

  const handleMouseLeave = React.useCallback(() => {
    mouseX.set(-gradientSize)
    mouseY.set(-gradientSize)
  }, [mouseX, mouseY, gradientSize])

  React.useEffect(() => {
    mouseX.set(-gradientSize)
    mouseY.set(-gradientSize)
  }, [mouseX, mouseY, gradientSize])

  const spotlight = useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 70%)`
  const border = useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientFrom}, ${gradientTo}, transparent 100%)`

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("group relative rounded-[inherit]", className)}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: border, mixBlendMode: "overlay" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: spotlight, opacity: gradientOpacity }}
        aria-hidden
      />
      <div className="relative h-full w-full">{children}</div>
    </div>
  )
}
