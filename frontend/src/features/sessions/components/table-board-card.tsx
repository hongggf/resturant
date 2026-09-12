import { Spinner } from "@/components/ui/spinner"
import { Receipt } from "lucide-react"
import { Link } from "react-router"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { TableOverview, TableState } from "../types"

const stateStyles: Record<TableState, { card: string; badge: string }> = {
  IDLE: {
    card: "border-border bg-card hover:border-primary/40",
    badge: "bg-muted text-muted-foreground",
  },
  ORDERED: {
    card: "border-amber-500/50 bg-amber-500/5 hover:border-amber-500",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  SERVED: {
    card: "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
}

interface TableBoardCardProps {
  table: TableOverview
  busy?: boolean
  onClick: (table: TableOverview) => void
}

export function TableBoardCard({ table, busy, onClick }: TableBoardCardProps) {
  const state: TableState = table.state ?? "IDLE"
  const styles = stateStyles[state]
  const rounds = table.openRoundCount ?? 0

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={busy}
      onClick={(e) => {
        // Prevent clicking the card if we clicked a child link/button
        if ((e.target as HTMLElement).closest('a, button')) return
        if (!busy) onClick(table)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!busy) onClick(table)
        }
      }}
      className={cn(
        "relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 text-center transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-60",
        styles.card
      )}
    >
      {state === "IDLE" && table.lastClosedSessionHasReceipt && (
        <Link
          to={`/cashier/sessions/${table.lastClosedSessionId}/receipt`}
          className="absolute right-2 top-2 rounded-full bg-muted p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          title="View last receipt"
          onClick={(e) => e.stopPropagation()}
        >
          <Receipt className="size-3.5" />
        </Link>
      )}
      <span className="text-2xl font-semibold tracking-tight">
        {table.tableNumber}
      </span>
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
          styles.badge
        )}
      >
        {state}
      </span>
      <span className="text-sm font-semibold tabular-nums">
        {state === "IDLE" ? "—" : formatPrice(table.runningTotal ?? 0)}
      </span>
      {busy ? (
        <Spinner className="size-4" />
      ) : state === "IDLE" ? (
        <span className="text-muted-foreground text-[10px]">Tap to open</span>
      ) : (
        <span className="text-muted-foreground text-[10px]">
          {rounds === 1 ? "1 round" : `${rounds} rounds`}
        </span>
      )}
    </div>
  )
}
