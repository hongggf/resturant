import { useState } from "react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { GuestItemDialog } from "@/features/guest/components/guest-item-dialog"
import { GuestMenuBrowser } from "@/features/guest/components/guest-menu-browser"
import type { MenuItem } from "@/features/guest/types"

export function GuestMenuPage() {
  const [picked, setPicked] = useState<MenuItem | null>(null)

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Menu</h1>
        <Button variant="outline" size="sm" asChild>
          <Link to="/guest/cart">Cart</Link>
        </Button>
      </div>

      <GuestMenuBrowser onPick={setPicked} />

      {picked && (
        <GuestItemDialog
          key={picked.id}
          item={picked}
          onOpenChange={(open) => !open && setPicked(null)}
        />
      )}
    </>
  )
}
