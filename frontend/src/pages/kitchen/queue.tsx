import { useEffect, useState } from "react"
import { CookingPot } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { KitchenTicket } from "@/features/kitchen/components/kitchen-ticket"
import { minutesWaiting } from "@/features/kitchen/lib/ticket-age"
import {
  useKitchenQueue,
  useMarkKitchenRoundReady,
} from "@/features/kitchen/hooks/use-kitchen-queue"
import type { CashierRound } from "@/features/sessions/types"

const gridClass =
  "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start"

// Ticket age is derived from a clock, not from the data, so refetching alone
// would leave "12m" frozen when the queue itself hasn't changed.
const CLOCK_TICK_MS = 30_000

// The ready strip is reference information, not the working queue, so it polls
// lazily. Marking a ticket ready invalidates both lists, so it still updates
// immediately on the action that matters.
const READY_REFETCH_MS = 20_000

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(id)
  }, [])
  return now
}

export function KitchenQueuePage() {
  const now = useNow()
  const { data, isPending, isError, error, refetch } = useKitchenQueue("SENT")
  const { data: ready } = useKitchenQueue("READY", READY_REFETCH_MS)
  const markReady = useMarkKitchenRoundReady()

  const rounds = data ?? []
  const readyRounds = ready ?? []
  const oldest = rounds.reduce(
    (max, round) => Math.max(max, minutesWaiting(round.sentAt, now)),
    0
  )

  function handleMarkReady(round: CashierRound) {
    if (round.id) markReady.mutate(round.id)
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Cook queue</h1>
          <p className="text-muted-foreground text-sm">
            Oldest first. Marking a ticket ready sends it to the cashier.
          </p>
        </div>
        {rounds.length > 0 && (
          <p className="text-muted-foreground text-sm tabular-nums">
            {rounds.length === 1 ? "1 ticket" : `${rounds.length} tickets`} ·
            oldest {oldest}m
            {readyRounds.length > 0 && ` · ${readyRounds.length} ready`}
          </p>
        )}
      </div>

      {isPending ? (
        <div className={gridClass}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load the cook queue</AlertTitle>
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
              <CookingPot />
            </EmptyMedia>
            <EmptyTitle>Nothing to cook</EmptyTitle>
            <EmptyDescription>
              New rounds appear here automatically as guests and cashiers send
              them.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className={gridClass}>
          {rounds.map((round) => (
            <KitchenTicket
              key={round.id}
              round={round}
              now={now}
              marking={markReady.isPending && markReady.variables === round.id}
              onMarkReady={handleMarkReady}
            />
          ))}
        </div>
      )}

      {readyRounds.length > 0 && (
        <section className="mt-2">
          <h2 className="text-muted-foreground mb-2 text-sm font-medium">
            Ready, waiting to be served
          </h2>
          <ul className="flex flex-wrap gap-2">
            {readyRounds.map((round) => (
              <li
                key={round.id}
                className="text-muted-foreground rounded-md border px-3 py-1.5 text-sm"
              >
                Table {round.tableNumber ?? "—"} · #{round.roundNumber}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
