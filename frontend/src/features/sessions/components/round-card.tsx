import { Ban, CheckCheck, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatPrice } from "@/lib/format"
import { ModifierBreakdown } from "./modifier-breakdown"
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

/** Maps a modifier option id to the group it belongs to today. */


interface RoundLineItemProps {
  line: RoundLine
}

function RoundLineItem({ line }: RoundLineItemProps) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-start gap-x-2 gap-y-1">
      <p
        className={cn(
          "text-sm font-medium",
          line.voided && "text-muted-foreground line-through"
        )}
      >
        {line.quantity}× {line.nameEn}
      </p>
      <span
        className={cn(
          "text-sm tabular-nums",
          line.voided && "text-muted-foreground line-through"
        )}
      >
        {formatPrice(line.lineTotal)}
      </span>
      <div className="col-span-2">
        <ModifierBreakdown
          menuItemId={line.menuItemId}
          selections={line.selections}
        />
      </div>
      {line.remark && (
        <p className="text-muted-foreground col-span-2 text-xs italic">
          “{line.remark}”
        </p>
      )}
      {line.voided && line.voidReason && (
        <p className="text-destructive col-span-2 text-xs no-underline">
          Voided: {line.voidReason}
        </p>
      )}
    </li>
  )
}

interface RoundCardProps {
  round: CashierRound
  markingReady: boolean
  onMarkReady: (round: CashierRound) => void
  onCancel: (round: CashierRound) => void
  onEditLine: (round: CashierRound, line: RoundLine) => void
  onVoidLine: (round: CashierRound, line: RoundLine) => void
}

export function RoundCard({
  round,
  markingReady,
  onMarkReady,
  onCancel,
  onEditLine,
  onVoidLine,
}: RoundCardProps) {
  const status: RoundStatus = round.status ?? "SENT"
  const open = status === "SENT" || status === "READY"
  const cancelled = status === "CANCELLED"
  const editableLines = (round.lines ?? []).filter(
    (l) => !l.voided && l.menuItemId
  )

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
      </CardHeader>
      <CardContent className="px-4">
        <ul className="space-y-3">
          {round.lines?.map((line) => (
            <RoundLineItem key={line.id} line={line} />
          ))}
        </ul>
        {cancelled && round.cancelReason && (
          <p className="text-destructive mt-2 text-xs">
            Cancelled: {round.cancelReason}
          </p>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="flex-col gap-3 px-4">
        <div className="text-muted-foreground flex w-full justify-end gap-4 text-xs tabular-nums">
          <span>Subtotal {formatPrice(round.subtotal)}</span>
          <span>VAT {formatPrice(round.vatAmount)}</span>
          <span className="text-foreground text-sm font-medium">
            {formatPrice(round.grandTotal)}
          </span>
        </div>
        {!cancelled && (
          <div className="flex w-full justify-end gap-2">
            {open &&
              (editableLines.length === 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button size="sm" variant="outline" disabled>
                        <Pencil />
                        Edit
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>No editable items in this round</TooltipContent>
                </Tooltip>
              ) : editableLines.length === 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Pencil />
                      Edit
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onEditLine(round, editableLines[0])}
                    >
                      Change options...
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onVoidLine(round, editableLines[0])}
                    >
                      Void item...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Pencil />
                      Edit
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {editableLines.map((line) => (
                      <DropdownMenuSub key={line.id}>
                        <DropdownMenuSubTrigger>
                          {line.quantity}× {line.nameEn}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem
                            onClick={() => onEditLine(round, line)}
                          >
                            Change options...
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onVoidLine(round, line)}
                          >
                            Void item...
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
            {open && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => onCancel(round)}
              >
                <Ban />
                Cancel
              </Button>
            )}
            {status === "SENT" && (
              <Button
                size="sm"
                disabled={markingReady}
                onClick={() => onMarkReady(round)}
              >
                {markingReady ? <Spinner /> : <CheckCheck />}
                Mark ready
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
