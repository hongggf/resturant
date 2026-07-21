import { Ban, CheckCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CashierRound, RoundLine, RoundStatus } from "../types"

const statusBadges: Record<RoundStatus, string> = {
  SENT: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  READY: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  COMPLETED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "bg-destructive/10 text-destructive",
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
})

interface RoundCardProps {
  round: CashierRound
  markingReady: boolean
  onMarkReady: (round: CashierRound) => void
  onCancel: (round: CashierRound) => void
  onVoidLine: (round: CashierRound, line: RoundLine) => void
}

export function RoundCard({
  round,
  markingReady,
  onMarkReady,
  onCancel,
  onVoidLine,
}: RoundCardProps) {
  const status: RoundStatus = round.status ?? "SENT"
  const open = status === "SENT" || status === "READY"
  const cancelled = status === "CANCELLED"

  return (
    <Card className={cn("gap-3 py-4", cancelled && "opacity-70")}>
      <CardHeader className="flex flex-row items-center gap-2 px-4">
        <span className="font-semibold">Round #{round.roundNumber}</span>
        {round.sentAt && (
          <span className="text-muted-foreground text-xs">
            {timeFormat.format(new Date(round.sentAt))}
          </span>
        )}
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-medium",
            statusBadges[status]
          )}
        >
          {status}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {status === "SENT" && (
            <Button
              size="sm"
              variant="outline"
              disabled={markingReady}
              onClick={() => onMarkReady(round)}
            >
              {markingReady ? <Spinner /> : <CheckCheck />}
              Mark ready
            </Button>
          )}
          {open && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onCancel(round)}
                >
                  <Ban />
                  <span className="sr-only">Cancel round</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cancel round</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <ul className="space-y-2">
          {round.lines?.map((line) => (
            <li key={line.id} className="flex items-start gap-2">
              <div
                className={cn(
                  "min-w-0 flex-1",
                  line.voided && "text-muted-foreground line-through"
                )}
              >
                <p className="text-sm font-medium">
                  {line.quantity}× {line.nameEn}
                </p>
                {line.selections && line.selections.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {line.selections
                      .map((s) =>
                        (s.quantity ?? 1) > 1
                          ? `${s.quantity}× ${s.nameEn}`
                          : s.nameEn
                      )
                      .join(" · ")}
                  </p>
                )}
                {line.remark && (
                  <p className="text-muted-foreground text-xs italic">
                    “{line.remark}”
                  </p>
                )}
                {line.voided && line.voidReason && (
                  <p className="text-destructive text-xs no-underline">
                    Voided: {line.voidReason}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "text-sm tabular-nums",
                  line.voided && "text-muted-foreground line-through"
                )}
              >
                {formatPrice(line.lineTotal)}
              </span>
              {open && !line.voided && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground -my-1"
                      onClick={() => onVoidLine(round, line)}
                    >
                      <Ban />
                      <span className="sr-only">Void item</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Void item</TooltipContent>
                </Tooltip>
              )}
            </li>
          ))}
        </ul>
        {cancelled && round.cancelReason && (
          <p className="text-destructive mt-2 text-xs">
            Cancelled: {round.cancelReason}
          </p>
        )}
      </CardContent>
      {!cancelled && (
        <>
          <Separator />
          <CardFooter className="text-muted-foreground justify-end gap-4 px-4 text-xs tabular-nums">
            <span>Subtotal {formatPrice(round.subtotal)}</span>
            <span>VAT {formatPrice(round.vatAmount)}</span>
            <span className="text-foreground text-sm font-medium">
              {formatPrice(round.grandTotal)}
            </span>
          </CardFooter>
        </>
      )}
    </Card>
  )
}
