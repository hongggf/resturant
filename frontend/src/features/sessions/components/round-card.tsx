import { useMemo } from "react"
import { Ban, CheckCheck, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useItemModifierGroups } from "@/features/orders/hooks/use-manual-order"
import type { AttachedModifierGroup } from "@/features/modifiers/types"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CashierRound, RoundLine, RoundStatus } from "../types"

type RoundSelection = NonNullable<RoundLine["selections"]>[number]

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
function buildGroupLookup(groups: AttachedModifierGroup[]) {
  const lookup = new Map<string, { nameEn?: string; order: number }>()
  groups.forEach((attached, index) => {
    const order = attached.sortOrder ?? index
    for (const option of attached.group?.options ?? []) {
      if (option.id) lookup.set(option.id, { nameEn: attached.group?.nameEn, order })
    }
  })
  return lookup
}

/** Selections bucketed by modifier group, in group display order. Selections
 *  whose option no longer belongs to any attached group (deleted/reconfigured
 *  since send-time) fall into a single trailing, unlabeled bucket. */
function groupSelections(
  selections: RoundSelection[],
  lookup: Map<string, { nameEn?: string; order: number }>
) {
  const groups: {
    key: string
    nameEn?: string
    order: number
    items: RoundSelection[]
  }[] = []
  selections.forEach((selection, index) => {
    const info = selection.modifierOptionId
      ? lookup.get(selection.modifierOptionId)
      : undefined
    const key = info?.nameEn ?? "__ungrouped__"
    let bucket = groups.find((g) => g.key === key)
    if (!bucket) {
      bucket = {
        key,
        nameEn: info?.nameEn,
        order: info?.order ?? Number.MAX_SAFE_INTEGER + index,
        items: [],
      }
      groups.push(bucket)
    }
    bucket.items.push(selection)
  })
  return groups.sort((a, b) => a.order - b.order)
}

interface RoundLineItemProps {
  line: RoundLine
}

function RoundLineItem({ line }: RoundLineItemProps) {
  const { data: attachedGroups } = useItemModifierGroups(
    line.menuItemId ?? undefined
  )
  const lookup = useMemo(
    () => buildGroupLookup(attachedGroups ?? []),
    [attachedGroups]
  )
  const groups = line.selections?.length
    ? groupSelections(line.selections, lookup)
    : []

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
      {groups.length > 0 && (
        <div className="col-span-2 space-y-1">
          {groups.map((group) => (
            <div key={group.key}>
              {group.nameEn && (
                <p className="text-muted-foreground text-[11px] font-medium">
                  {group.nameEn}
                </p>
              )}
              <ul className="text-muted-foreground text-xs">
                {group.items.map((s) => {
                  const price = (s.unitPrice ?? 0) * (s.quantity ?? 1)
                  return (
                    <li
                      key={s.modifierOptionId ?? s.nameEn}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>
                        •{" "}
                        {(s.quantity ?? 1) > 1
                          ? `${s.nameEn} ×${s.quantity}`
                          : s.nameEn}
                      </span>
                      {price > 0 && (
                        <span className="tabular-nums">
                          {formatPrice(price)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
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
}

export function RoundCard({
  round,
  markingReady,
  onMarkReady,
  onCancel,
  onEditLine,
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditLine(round, editableLines[0])}
                >
                  <Pencil />
                  Edit
                </Button>
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
                      <DropdownMenuItem
                        key={line.id}
                        onClick={() => onEditLine(round, line)}
                      >
                        {line.quantity}× {line.nameEn}
                      </DropdownMenuItem>
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
