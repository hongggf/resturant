import { apiFetch } from "@/lib/api/client"
import type { CashierRound, RoundStatus } from "@/features/sessions/types"

/**
 * The kitchen's own endpoints. They return the same payload as the cashier's
 * `/rounds`, but sit behind ADMIN/CHEF rather than ADMIN/CASHIER so a kitchen
 * tablet can't reach cancel, void or payment actions.
 */
export function getKitchenQueue(status: RoundStatus) {
  return apiFetch<CashierRound[]>(`/kitchen/rounds?status=${status}`)
}

export function markKitchenRoundReady(roundId: string) {
  return apiFetch<CashierRound>(`/kitchen/rounds/${roundId}/ready`, {
    method: "PUT",
  })
}
