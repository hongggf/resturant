import { LayoutGrid } from "lucide-react"
import { useNavigate } from "react-router"

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
import { TableBoardCard } from "@/features/sessions/components/table-board-card"
import {
  useOpenSession,
  useTablesOverview,
} from "@/features/sessions/hooks/use-tables-overview"
import type { TableOverview } from "@/features/sessions/types"

const gridClass =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"

export function TableBoardPage() {
  const navigate = useNavigate()
  const { data, isPending, isError, error, refetch } = useTablesOverview()
  const openSession = useOpenSession()

  const tables = data ?? []
  const occupied = tables.filter((t) => t.state !== "IDLE").length
  const openRounds = tables.reduce((n, t) => n + (t.openRoundCount ?? 0), 0)

  function handleTableClick(table: TableOverview) {
    // Pass the table number along so a just-opened, empty session can
    // still title itself before any rounds exist.
    const state = { tableNumber: table.tableNumber }
    if (table.sessionId) {
      navigate(`/cashier/sessions/${table.sessionId}`, { state })
      return
    }
    if (!table.tableId || openSession.isPending) return
    openSession.mutate(table.tableId, {
      onSuccess: (session) => {
        if (session.sessionId) {
          navigate(`/cashier/sessions/${session.sessionId}`, { state })
        }
      },
    })
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tables</h1>
          <p className="text-muted-foreground text-sm">
            Tap an occupied table to review its session, or an idle one to
            seat guests.
          </p>
        </div>
        {tables.length > 0 && (
          <p className="text-muted-foreground text-sm tabular-nums">
            {occupied} of {tables.length} occupied ·{" "}
            {openRounds === 1 ? "1 open round" : `${openRounds} open rounds`}
          </p>
        )}
      </div>

      {isPending ? (
        <div className={gridClass}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load the table board</AlertTitle>
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
      ) : tables.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayoutGrid />
            </EmptyMedia>
            <EmptyTitle>No tables configured</EmptyTitle>
            <EmptyDescription>
              Ask an administrator to add tables in the back office before
              taking orders.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className={gridClass}>
          {tables.map((table) => (
            <TableBoardCard
              key={table.tableId}
              table={table}
              busy={
                openSession.isPending &&
                openSession.variables === table.tableId
              }
              onClick={handleTableClick}
            />
          ))}
        </div>
      )}
    </>
  )
}
