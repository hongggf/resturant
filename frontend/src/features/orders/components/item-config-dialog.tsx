import { useState } from "react"
import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { choiceRule } from "@/features/modifiers/lib/choice-rule"
import type { ModifierOption } from "@/features/modifiers/types"
import type { MenuItem } from "@/features/menu/types"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useItemModifierGroups } from "../hooks/use-manual-order"
import type { DraftLine, DraftSelection } from "../types"

interface ItemConfigDialogProps {
  item: MenuItem
  onOpenChange: (open: boolean) => void
  onAdd: (line: Omit<DraftLine, "key">) => void
}

/** Configure one menu item — quantity, remark, modifiers — before adding it. */
export function ItemConfigDialog({
  item,
  onOpenChange,
  onAdd,
}: ItemConfigDialogProps) {
  const { data, isPending, isError } = useItemModifierGroups(item.id)

  const [quantity, setQuantity] = useState(1)
  const [remark, setRemark] = useState("")
  const [selected, setSelected] = useState<Record<string, DraftSelection>>({})

  const groups = (data ?? [])
    .filter((attached) => attached.group?.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  function groupOptions(groupIndex: number): ModifierOption[] {
    return (groups[groupIndex].group?.options ?? []).filter(
      (option) => option.available !== false
    )
  }

  /** Distinct options picked in a group — what min/max rules count. */
  function selectedCount(groupIndex: number) {
    return groupOptions(groupIndex).filter((o) => o.id! in selected).length
  }

  function toggle(groupIndex: number, option: ModifierOption) {
    setSelected((prev) => {
      const next = { ...prev }
      if (option.id! in next) {
        delete next[option.id!]
        return next
      }
      // Single-choice groups behave like radios: picking replaces.
      for (const o of groupOptions(groupIndex)) delete next[o.id!]
      next[option.id!] = { option, quantity: 1 }
      return next
    })
  }

  function changeOptionQuantity(option: ModifierOption, delta: number) {
    setSelected((prev) => {
      const next = { ...prev }
      const current = next[option.id!]?.quantity ?? 0
      const updated = current + delta
      if (updated <= 0) {
        delete next[option.id!]
      } else {
        next[option.id!] = { option, quantity: updated }
      }
      return next
    })
  }

  const violations = groups.filter((attached, index) => {
    const count = selectedCount(index)
    const min = attached.group?.minChoice ?? 0
    const max = attached.group?.maxChoice
    return count < min || (max != null && count > max)
  })

  const selections: DraftSelection[] = Object.values(selected)
  const unitPrice =
    (item.price ?? 0) +
    selections.reduce(
      (sum, s) => sum + (s.option.unitPrice ?? 0) * s.quantity,
      0
    )

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col">
        <DialogHeader>
          <DialogTitle>{item.nameEn}</DialogTitle>
          <DialogDescription>
            {formatPrice(item.price, item.currencyCode)}
            {item.nameKm ? ` · ${item.nameKm}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1">
          {isPending ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : isError ? (
            <p className="text-destructive text-sm">
              Couldn&apos;t load this item&apos;s modifiers. Close and try
              again.
            </p>
          ) : (
            groups.map((attached, index) => {
              const group = attached.group
              if (!group) return null
              const single = group.maxChoice === 1
              const atMax =
                !single &&
                group.maxChoice != null &&
                selectedCount(index) >= group.maxChoice
              return (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{group.nameEn}</p>
                    <p className="text-muted-foreground text-xs">
                      {choiceRule(group.minChoice, group.maxChoice)}
                    </p>
                  </div>
                  <div className="grid gap-1.5">
                    {groupOptions(index).map((option) => {
                      const qty = selected[option.id!]?.quantity ?? 0
                      const price = option.unitPrice ?? 0
                      if (single) {
                        return (
                          <Label
                            key={option.id}
                            className={cn(
                              "hover:bg-muted/50 flex items-center gap-2 rounded-md border p-2 font-normal",
                              qty > 0 && "border-primary bg-primary/5"
                            )}
                          >
                            <Checkbox
                              checked={qty > 0}
                              onCheckedChange={() => toggle(index, option)}
                            />
                            <span className="flex-1 text-sm">
                              {option.nameEn}
                            </span>
                            {price > 0 && (
                              <span className="text-muted-foreground text-xs tabular-nums">
                                +{formatPrice(price)}
                              </span>
                            )}
                          </Label>
                        )
                      }
                      return (
                        <div
                          key={option.id}
                          className={cn(
                            "flex items-center gap-2 rounded-md border p-2",
                            qty > 0 && "border-primary bg-primary/5"
                          )}
                        >
                          <span className="flex-1 text-sm">
                            {option.nameEn}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon-xs"
                              variant="outline"
                              disabled={qty === 0}
                              onClick={() =>
                                changeOptionQuantity(option, -1)
                              }
                            >
                              <Minus />
                              <span className="sr-only">
                                Fewer {option.nameEn}
                              </span>
                            </Button>
                            <span className="w-6 text-center text-sm font-medium tabular-nums">
                              {qty}
                            </span>
                            <Button
                              size="icon-xs"
                              variant="outline"
                              disabled={qty === 0 && atMax}
                              onClick={() => changeOptionQuantity(option, 1)}
                            >
                              <Plus />
                              <span className="sr-only">
                                More {option.nameEn}
                              </span>
                            </Button>
                          </div>
                          {price > 0 && (
                            <span className="text-muted-foreground w-14 text-right text-xs tabular-nums">
                              +{formatPrice(price)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}

          <div className="space-y-2">
            <Label htmlFor="order-remark" className="text-sm font-medium">
              Note for the kitchen
            </Label>
            <Textarea
              id="order-remark"
              value={remark}
              maxLength={200}
              rows={2}
              placeholder="e.g. No onions, sauce on the side…"
              onChange={(event) => setRemark(event.target.value)}
            />
          </div>
        </div>

        <Separator />
        <DialogFooter className="flex-row items-center sm:justify-between">
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => q - 1)}
            >
              <Minus />
              <span className="sr-only">Decrease quantity</span>
            </Button>
            <span className="w-8 text-center text-sm font-medium tabular-nums">
              {quantity}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setQuantity((q) => q + 1)}
            >
              <Plus />
              <span className="sr-only">Increase quantity</span>
            </Button>
          </div>
          <Button
            disabled={isPending || isError || violations.length > 0}
            onClick={() => {
              onAdd({ item, quantity, remark: remark.trim(), selections })
              onOpenChange(false)
            }}
          >
            Add · {formatPrice(unitPrice * quantity, item.currencyCode)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
