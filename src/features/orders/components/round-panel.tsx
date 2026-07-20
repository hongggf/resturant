import { Minus, Plus, Send, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { formatPrice } from "@/lib/format"
import { draftTotal, lineTotal } from "../lib/draft"
import type { DraftLine } from "../types"

interface RoundPanelProps {
  lines: DraftLine[]
  submitting: boolean
  onChangeQuantity: (key: string, delta: number) => void
  onRemove: (key: string) => void
  onSubmit: () => void
}

export function RoundPanel({
  lines,
  submitting,
  onChangeQuantity,
  onRemove,
  onSubmit,
}: RoundPanelProps) {
  return (
    <Card className="flex h-fit flex-col gap-0 py-0 lg:sticky lg:top-20">
      <CardHeader className="px-4 py-3">
        <p className="font-semibold">Current round</p>
      </CardHeader>
      <Separator />
      <CardContent className="max-h-[50svh] overflow-y-auto px-4 py-3">
        {lines.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Tap menu items to add them to this round.
          </p>
        ) : (
          <ul className="space-y-3">
            {lines.map((line) => (
              <li key={line.key} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{line.item.nameEn}</p>
                  {line.selections.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {line.selections
                        .map((s) =>
                          s.quantity > 1
                            ? `${s.quantity}× ${s.option.nameEn}`
                            : s.option.nameEn
                        )
                        .join(" · ")}
                    </p>
                  )}
                  {line.remark && (
                    <p className="text-muted-foreground text-xs italic">
                      “{line.remark}”
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-1">
                    <Button
                      size="icon-xs"
                      variant="outline"
                      disabled={line.quantity <= 1 || submitting}
                      onClick={() => onChangeQuantity(line.key, -1)}
                    >
                      <Minus />
                      <span className="sr-only">Decrease quantity</span>
                    </Button>
                    <span className="w-6 text-center text-sm tabular-nums">
                      {line.quantity}
                    </span>
                    <Button
                      size="icon-xs"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => onChangeQuantity(line.key, 1)}
                    >
                      <Plus />
                      <span className="sr-only">Increase quantity</span>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm tabular-nums">
                    {formatPrice(lineTotal(line), line.item.currencyCode)}
                  </span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="text-muted-foreground"
                    disabled={submitting}
                    onClick={() => onRemove(line.key)}
                  >
                    <Trash2 />
                    <span className="sr-only">Remove line</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="flex-col gap-3 px-4 py-3">
        <div className="flex w-full items-center justify-between">
          <span className="text-muted-foreground text-sm">Total</span>
          <span className="font-semibold tabular-nums">
            {formatPrice(draftTotal(lines))}
          </span>
        </div>
        <Button
          className="w-full"
          disabled={lines.length === 0 || submitting}
          onClick={onSubmit}
        >
          {submitting ? <Spinner /> : <Send />}
          {submitting ? "Sending…" : "Send round"}
        </Button>
      </CardFooter>
    </Card>
  )
}
