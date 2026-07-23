import { Minus, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"
import { useRemoveCartLine, useUpdateCartLine } from "../hooks/use-guest-cart"
import type { CartLine } from "../types"

interface GuestCartLineProps {
  line: CartLine
  disabled?: boolean
}

export function GuestCartLine({ line, disabled }: GuestCartLineProps) {
  const updateLine = useUpdateCartLine()
  const removeLine = useRemoveCartLine()
  const busy = updateLine.isPending || removeLine.isPending || disabled

  function changeQuantity(delta: number) {
    const quantity = (line.quantity ?? 1) + delta
    if (quantity < 1) return
    updateLine.mutate({
      lineId: line.id!,
      body: {
        quantity,
        remark: line.remark,
        selections: (line.selections ?? []).map((s) => ({
          modifierOptionId: s.modifierOptionId!,
          quantity: s.quantity ?? 1,
        })),
      },
    })
  }

  return (
    <li className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{line.nameEn}</p>
        {line.selections && line.selections.length > 0 && (
          <p className="text-muted-foreground text-xs">
            {line.selections
              .map((s) => (s.quantity && s.quantity > 1 ? `${s.quantity}× ${s.nameEn}` : s.nameEn))
              .join(" · ")}
          </p>
        )}
        {line.remark && (
          <p className="text-muted-foreground text-xs italic">“{line.remark}”</p>
        )}
        <div className="mt-1 flex items-center gap-1">
          <Button
            size="icon-xs"
            variant="outline"
            disabled={(line.quantity ?? 1) <= 1 || busy}
            onClick={() => changeQuantity(-1)}
          >
            <Minus />
            <span className="sr-only">Decrease quantity</span>
          </Button>
          <span className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
          <Button size="icon-xs" variant="outline" disabled={busy} onClick={() => changeQuantity(1)}>
            <Plus />
            <span className="sr-only">Increase quantity</span>
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-sm tabular-nums">{formatPrice(line.lineTotal)}</span>
        <Button
          size="icon-xs"
          variant="ghost"
          className="text-muted-foreground"
          disabled={busy}
          onClick={() => removeLine.mutate(line.id!)}
        >
          <Trash2 />
          <span className="sr-only">Remove line</span>
        </Button>
      </div>
    </li>
  )
}
