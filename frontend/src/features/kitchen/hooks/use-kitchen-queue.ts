import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { ApiError } from "@/lib/api/client"
import type { RoundStatus } from "@/features/sessions/types"
import { getKitchenQueue, markKitchenRoundReady } from "../api/kitchen"

// Same cadence the cashier's round list uses: guests keep sending rounds while
// this screen sits open on a kitchen tablet all service.
const QUEUE_REFETCH_MS = 5000

function queueKey(status: RoundStatus) {
  return ["kitchen", "rounds", status] as const
}

export function useKitchenQueue(
  status: RoundStatus,
  refetchMs: number = QUEUE_REFETCH_MS
) {
  return useQuery({
    queryKey: queueKey(status),
    queryFn: () => getKitchenQueue(status),
    refetchInterval: refetchMs,
  })
}

export function useMarkKitchenRoundReady() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markKitchenRoundReady,
    onSuccess: (round) => {
      // Refresh both lists: the ticket leaves SENT and lands in READY.
      queryClient.invalidateQueries({ queryKey: ["kitchen", "rounds"] })
      toast.success(
        `Table ${round.tableNumber ?? "?"} · round #${round.roundNumber} ready`
      )
    },
    onError: (error: ApiError) => toast.error(error.message),
  })
}
