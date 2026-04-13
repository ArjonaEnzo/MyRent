'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ExpandableListProps {
  items: ReactNode[]
  initialCount: number
  showMoreLabel: string
  showLessLabel: string
}

export function ExpandableList({
  items,
  initialCount,
  showMoreLabel,
  showLessLabel,
}: ExpandableListProps) {
  const [expanded, setExpanded] = useState(false)

  const hasMore = items.length > initialCount
  const visibleItems = expanded ? items : items.slice(0, initialCount)

  return (
    <>
      {visibleItems}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border/40 px-5 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              {showLessLabel}
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              {showMoreLabel} ({items.length - initialCount} restantes)
            </>
          )}
        </button>
      )}
    </>
  )
}
