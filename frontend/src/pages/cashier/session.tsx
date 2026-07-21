import { useState } from "react"
import { ArrowLeft, Plus, ReceiptText, UtensilsCrossed } from "lucide-react"
import { Link, useLocation, useNavigate, useParams } from "react-router"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ReasonDialog } from "@/features/sessions/components/reason-dialog"
import { RoundCard } from "@/features/sessions/components/round-card"
import {
  useCancelRound,
  useMarkRoundReady,
  useSessionRounds,
  useVoidLine,
} from "@/features/sessions/hooks/use-session-rounds"
import type { CashierRound, RoundLine } from "@/features/sessions/types"
import { formatPrice } from "@/lib/format"

export function SessionPage() {
  const { sessionId = "" } = useParams()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { tableNumber?: string } }

  const { data, isPending, isError, error, refetch } =
    useSessionRounds(sessionId)
  const markReady = useMarkRoundReady(sessionId)
  const cancelRound = useCancelRound(sessionId)
  const voidLine = useVoidLine(sessionId)

  const [cancelling, setCancelling] = useState<CashierRound | null>(null)
  const [voiding, setVoiding] = useState<{
    round: CashierRound
    line: RoundLine
  } | null>(null)

  const rounds = [...(data ?? [])].sort(
    (a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0)
  )
  const tableNumber =
    rounds[0]?.tableNumber ?? location.state?.tableNumber ?? null
  const total = rounds
    .filter((r) => r.status !== "CANCELLED")
    .reduce((sum, r) => sum + (r.grandTotal ?? 0), 0)

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" asChild>
            <Link to="/cashier">
              <ArrowLeft />
              <span className="sr-only">Back to tables</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {tableNumber ? `Table ${tableNumber}` : "Session"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {rounds.length === 1 ? "1 round" : `${rounds.length} rounds`} this
              session
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Running total</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatPrice(total)}
          </p>
        </div>
      </div>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load this session</AlertTitle>
          <AlertDescription>
            <p>{error.message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : rounds.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UtensilsCrossed />
            </EmptyMedia>
            <EmptyTitle>No orders yet</EmptyTitle>
            <EmptyDescription>
              Guests can scan the table QR to order from their phones, or you
              can take their order here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              onClick={() =>
                navigate(`/cashier/sessions/${sessionId}/order`, {
                  state: { tableNumber },
                })
              }
            >
              <Plus />
              Add order
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3 pb-20">
          {rounds.map((round) => (
            <RoundCard
              key={round.id}
              round={round}
              markingReady={
                markReady.isPending && markReady.variables === round.id
              }
              onMarkReady={(r) => r.id && markReady.mutate(r.id)}
              onCancel={setCancelling}
              onVoidLine={(r, line) => setVoiding({ round: r, line })}
            />
          ))}
        </div>
      )}

      {rounds.length > 0 && (
        <div className="bg-background/95 fixed inset-x-0 bottom-0 border-t p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl justify-between gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                navigate(`/cashier/sessions/${sessionId}/order`, {
                  state: { tableNumber },
                })
              }
            >
              <Plus />
              Add order
            </Button>
            <Button
              className="flex-1"
              onClick={() =>
                navigate(`/cashier/sessions/${sessionId}/bill`, {
                  state: { tableNumber },
                })
              }
            >
              <ReceiptText />
              View bill
            </Button>
          </div>
        </div>
      )}

      <ReasonDialog
        key={`cancel-${cancelling?.id ?? "none"}`}
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={`Cancel round #${cancelling?.roundNumber}?`}
        description="Every item in this round will be removed from the bill. This can't be undone."
        confirmLabel="Cancel round"
        pendingLabel="Cancelling…"
        pending={cancelRound.isPending}
        onConfirm={(reason) => {
          if (!cancelling?.id) return
          cancelRound.mutate(
            { roundId: cancelling.id, reason },
            { onSuccess: () => setCancelling(null) }
          )
        }}
      />
      <ReasonDialog
        key={`void-${voiding?.line.id ?? "none"}`}
        open={!!voiding}
        onOpenChange={(open) => !open && setVoiding(null)}
        title={`Void ${voiding?.line.quantity}× ${voiding?.line.nameEn}?`}
        description="The item stays on the ticket crossed out, but is taken off the bill. This can't be undone."
        confirmLabel="Void item"
        pendingLabel="Voiding…"
        pending={voidLine.isPending}
        onConfirm={(reason) => {
          if (!voiding?.round.id || !voiding.line.id) return
          voidLine.mutate(
            { roundId: voiding.round.id, lineId: voiding.line.id, reason },
            { onSuccess: () => setVoiding(null) }
          )
        }}
      />
    </>
  )
}
