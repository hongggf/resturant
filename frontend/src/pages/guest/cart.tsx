import { ShoppingCart } from "lucide-react"
import { Link, useNavigate } from "react-router"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { DualPrice } from "@/features/guest/components/dual-price"
import { GuestCartLine } from "@/features/guest/components/guest-cart-line"
import { useGuestCart, useSendCart } from "@/features/guest/hooks/use-guest-cart"
import { useGuestSession } from "@/features/guest/hooks/use-guest-session"

export function GuestCartPage() {
  const navigate = useNavigate()
  const session = useGuestSession()
  const spent = session.status === "spent"
  const { data: cart, isPending, isError, error, refetch } = useGuestCart()
  const sendCart = useSendCart()

  const lines = cart?.lines ?? []

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Your cart</h1>
        <Button variant="outline" size="sm" asChild>
          <Link to="/guest/menu">Menu</Link>
        </Button>
      </div>

      {spent && (
        <Alert>
          <AlertTitle>Order already sent</AlertTitle>
          <AlertDescription>
            Scan the table QR code again to start another round.
          </AlertDescription>
        </Alert>
      )}

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load your cart</AlertTitle>
          <AlertDescription>
            <p>{error.message}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : lines.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingCart />
            </EmptyMedia>
            <EmptyTitle>Your cart is empty</EmptyTitle>
            <EmptyDescription>
              Browse the menu and add items to get started.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ul className="space-y-3">
            {lines.map((line) => (
              <GuestCartLine key={line.id} line={line} disabled={spent} />
            ))}
          </ul>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Total</span>
            <DualPrice usd={cart?.grandTotal} khr={cart?.grandTotalKhr} className="font-semibold" />
          </div>

          <Button
            className="w-full"
            disabled={spent || sendCart.isPending}
            onClick={() =>
              sendCart.mutate(undefined, {
                onSuccess: () => navigate("/guest/orders"),
              })
            }
          >
            {sendCart.isPending && <Spinner />}
            {sendCart.isPending ? "Sending…" : "Send order"}
          </Button>
        </>
      )}
    </>
  )
}
