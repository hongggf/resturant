import { CheckCheck, Ban } from "lucide-react"
import { useUpdateMenuItemAvailability } from "@/features/menu/hooks/use-menu-items"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { CashierRound, RoundLine } from "@/features/sessions/types"
import { cn } from "@/lib/utils"
import {
  URGENT_AFTER_MIN,
  WARN_AFTER_MIN,
  minutesWaiting,
} from "../lib/ticket-age"

function TicketLine({ line }: { line: RoundLine }) {
  const updateAvailability = useUpdateMenuItemAvailability()
  // A voided line is still shown, struck through: the chef may already have
  // started it, and silently dropping it off the ticket hides that change.
  return (
    <li className={cn(line.voided && "opacity-60", "group relative")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tabular-nums">{line.quantity}×</span>
          <span
            className={cn(
              "text-lg leading-tight font-semibold",
              line.voided && "line-through"
            )}
          >
            {line.nameEn}
          </span>
        </div>
        {!line.voided && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            onClick={() => updateAvailability.mutate({ id: line.menuItemId, available: false })}
            disabled={updateAvailability.isPending}
          >
            <Ban className="size-3 mr-1" />
            86 / Sold out
          </Button>
        )}
      </div>
      {line.nameKm && (
        <p className="text-muted-foreground pl-8 text-sm">{line.nameKm}</p>
      )}
      {line.selections && line.selections.length > 0 && (
        <ul className="text-muted-foreground pl-8 text-sm">
          {line.selections.map((selection) => (
            <li key={selection.modifierOptionId ?? selection.nameEn}>
              •{" "}
              {(selection.quantity ?? 1) > 1
                ? `${selection.nameEn} ×${selection.quantity}`
                : selection.nameEn}
            </li>
          ))}
        </ul>
      )}
      {line.remark && (
        <p className="mt-1 ml-8 rounded bg-amber-500/15 px-2 py-1 text-sm font-medium text-amber-800 dark:text-amber-300">
          {line.remark}
        </p>
      )}
      {line.voided && (
        <p className="text-destructive pl-8 text-sm font-medium">
          VOIDED{line.voidReason ? ` — ${line.voidReason}` : ""} — do not cook
        </p>
      )}
    </li>
  )
}

interface KitchenTicketProps {
  round: CashierRound
  now: number
  marking: boolean
  onMarkReady: (round: CashierRound) => void
}

export function KitchenTicket({
  round,
  now,
  marking,
  onMarkReady,
}: KitchenTicketProps) {
  const waited = minutesWaiting(round.sentAt, now)
  const urgent = waited >= URGENT_AFTER_MIN
  const warn = !urgent && waited >= WARN_AFTER_MIN

  return (
    <Card
      className={cn(
        "gap-3 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500",
        warn && "border-amber-500",
        urgent && "border-destructive border-2"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
        <div>
          <p className="text-2xl leading-none font-bold">
            Table {round.tableNumber ?? "—"}
          </p>
          <p className="text-muted-foreground text-sm">
            Round #{round.roundNumber}
          </p>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-1 text-sm font-semibold tabular-nums",
            !warn && !urgent && "text-muted-foreground",
            warn && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
            urgent && "bg-destructive/15 text-destructive"
          )}
        >
          {waited}m
        </span>
      </CardHeader>
      <CardContent className="px-4">
        <ul className="space-y-3">
          {round.lines?.map((line) => (
            <TicketLine key={line.id} line={line} />
          ))}
        </ul>
      </CardContent>
      <CardFooter className="px-4">
        <Button
          size="lg"
          className="h-12 w-full text-base"
          disabled={marking}
          onClick={() => onMarkReady(round)}
        >
          {marking ? <Spinner /> : <CheckCheck />}
          Mark ready
        </Button>
      </CardFooter>
    </Card>
  )
}
