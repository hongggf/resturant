import { Spinner } from "@/components/ui/spinner"
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
    <button
      type="button"
      disabled={busy}
      onClick={() => onClick(table)}
      className={cn(
        "flex flex-col items-stretch gap-3 rounded-xl border-2 p-4 text-left transition-colors disabled:opacity-60",
        styles.card
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-lg font-semibold tracking-tight">
          {table.tableNumber}
        </span>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-medium",
            styles.badge
          )}
        >
          {state}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-xl font-semibold tabular-nums">
          {state === "IDLE" ? "—" : formatPrice(table.runningTotal ?? 0)}
        </span>
        {busy ? (
          <Spinner className="size-4" />
        ) : state === "IDLE" ? (
          <span className="text-muted-foreground text-xs">Tap to open</span>
        ) : (
          <span className="text-muted-foreground text-xs">
            {rounds === 1 ? "1 open round" : `${rounds} open rounds`}
          </span>
        )}
      </div>
    </button>
  )
}
