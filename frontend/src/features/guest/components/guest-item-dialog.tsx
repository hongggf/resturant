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
import { resolveItemImage } from "@/features/menu/lib/food-image"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useGuestMenuItemDetail } from "../hooks/use-guest-menu"
import { useAddCartLine } from "../hooks/use-guest-cart"
import { useGuestSession } from "../hooks/use-guest-session"
import {
  BUILD_MINIMUM,
  buildMinimumProgress,
  formatGroupList,
} from "../lib/build-minimum"
import type { MenuItem, ModifierOption } from "../types"

interface Selection {
  option: ModifierOption
  quantity: number
}

interface GuestItemDialogProps {
  item: MenuItem
  onOpenChange: (open: boolean) => void
}

export function GuestItemDialog({ item, onOpenChange }: GuestItemDialogProps) {
  const { data, isPending, isError } = useGuestMenuItemDetail(item.id)
  const addLine = useAddCartLine()
  const session = useGuestSession()
  const spent = session.status === "spent"

  const [quantity, setQuantity] = useState(1)
  const [remark, setRemark] = useState("")
  const [selected, setSelected] = useState<Record<string, Selection>>({})

  const groups = (data?.modifierGroups ?? [])
    .filter((attached) => attached.group?.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  function groupOptions(groupIndex: number): ModifierOption[] {
    return (groups[groupIndex].group?.options ?? []).filter(
      (option) => option.available !== false
    )
  }

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

  // A build has to carry at least BUILD_MINIMUM of meat/veg/noodles before it
  // can be ordered; flavour alone is free.
  const minimum = buildMinimumProgress(groups, selected)
  const belowMinimum = minimum.applies && minimum.shortfall > 0

  const selections = Object.values(selected)
  const unitPrice =
    (item.price ?? 0) +
    selections.reduce((sum, s) => sum + (s.option.unitPrice ?? 0) * s.quantity, 0)

  function handleAdd() {
    addLine.mutate(
      {
        menuItemId: item.id!,
        quantity,
        remark: remark.trim() || undefined,
        selections: selections.map((s) => ({
          modifierOptionId: s.option.id!,
          quantity: s.quantity,
        })),
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  const heroImage = resolveItemImage(item.nameEn, item.imageUrl, "hero")

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col overflow-hidden p-0">
        {heroImage && (
          <div className="relative aspect-[16/7] w-full shrink-0 overflow-hidden bg-muted">
            <img src={heroImage} alt={item.nameEn} className="size-full object-cover" />
          </div>
        )}
        <div className="p-6 pt-4 pb-0">
          <DialogHeader>
            <DialogTitle>{item.nameEn}</DialogTitle>
            <DialogDescription>
              {formatPrice(item.price, item.currencyCode)}
              {item.nameKm ? ` · ${item.nameKm}` : ""}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-2">
          {isPending ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : isError ? (
            <p className="text-destructive text-sm">
              Couldn&apos;t load this item&apos;s options. Close and try again.
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
                      const optionImg = resolveItemImage(option.nameEn, option.imageUrl, "thumb")
                      if (single) {
                        return (
                          <Label
                            key={option.id}
                            className={cn(
                              "hover:bg-muted/50 flex items-center gap-2.5 rounded-md border p-2 font-normal cursor-pointer",
                              qty > 0 && "border-primary bg-primary/5"
                            )}
                          >
                            <Checkbox
                              checked={qty > 0}
                              onCheckedChange={() => toggle(index, option)}
                            />
                            {optionImg && (
                              <img
                                src={optionImg}
                                alt={option.nameEn}
                                className="size-8 shrink-0 rounded object-cover"
                              />
                            )}
                            <span className="flex-1 text-sm">{option.nameEn}</span>
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
                            "flex items-center gap-2.5 rounded-md border p-2",
                            qty > 0 && "border-primary bg-primary/5"
                          )}
                        >
                          {optionImg && (
                            <img
                              src={optionImg}
                              alt={option.nameEn}
                              className="size-8 shrink-0 rounded object-cover"
                            />
                          )}
                          <span className="flex-1 text-sm">{option.nameEn}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon-xs"
                              variant="outline"
                              disabled={qty === 0}
                              onClick={() => changeOptionQuantity(option, -1)}
                            >
                              <Minus />
                              <span className="sr-only">Fewer {option.nameEn}</span>
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
                              <span className="sr-only">More {option.nameEn}</span>
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
            <Label htmlFor="guest-order-remark" className="text-sm font-medium">
              Note for the kitchen
            </Label>
            <Textarea
              id="guest-order-remark"
              value={remark}
              maxLength={200}
              rows={2}
              placeholder="e.g. No onions, sauce on the side…"
              onChange={(event) => setRemark(event.target.value)}
            />
          </div>
        </div>

        {belowMinimum && (
          <p
            role="status"
            className="text-muted-foreground shrink-0 border-t px-6 pt-3 text-sm"
          >
            Add{" "}
            <span className="text-foreground font-medium">
              {formatPrice(minimum.shortfall, item.currencyCode)}
            </span>{" "}
            more from {formatGroupList(minimum.groupNames)} to reach the{" "}
            {formatPrice(BUILD_MINIMUM, item.currencyCode)} minimum.
          </p>
        )}

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
            disabled={
              isPending ||
              isError ||
              spent ||
              violations.length > 0 ||
              belowMinimum ||
              addLine.isPending
            }
            onClick={handleAdd}
          >
            {addLine.isPending ? (
              <Spinner />
            ) : (
              `Add · ${formatPrice(unitPrice * quantity, item.currencyCode)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
