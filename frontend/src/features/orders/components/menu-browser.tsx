import { useState } from "react"
import { ChevronLeft, ChevronRight, ImageOff, UtensilsCrossed } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useCategoryOptions,
  useMenuItems,
} from "@/features/menu/hooks/use-menu-items"
import type { MenuItem } from "@/features/menu/types"
import { assetUrl } from "@/lib/api/client"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

interface MenuBrowserProps {
  onPick: (item: MenuItem) => void
}

export function MenuBrowser({ onPick }: MenuBrowserProps) {
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(0)

  const categories = useCategoryOptions()
  const { data, isPending, isError, error, refetch } = useMenuItems({
    page,
    categoryId,
    available: true,
  })

  const items = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  function pickCategory(id: string | undefined) {
    setCategoryId(id)
    setPage(0)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Badge
          asChild
          variant={categoryId === undefined ? "default" : "outline"}
        >
          <button type="button" onClick={() => pickCategory(undefined)}>
            All
          </button>
        </Badge>
        {categories.data?.map((category) => (
          <Badge
            key={category.id}
            asChild
            variant={categoryId === category.id ? "default" : "outline"}
          >
            <button type="button" onClick={() => pickCategory(category.id)}>
              {category.nameEn}
            </button>
          </Badge>
        ))}
      </div>

      {isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load the menu</AlertTitle>
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
      ) : items.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UtensilsCrossed />
            </EmptyMedia>
            <EmptyTitle>Nothing available here</EmptyTitle>
            <EmptyDescription>
              No available menu items in this category.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const image = assetUrl(item.imageUrl)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item)}
                className={cn(
                  "bg-card hover:border-primary/50 flex flex-col overflow-hidden rounded-xl border text-left",
                  "transition-colors"
                )}
              >
                <div className="bg-muted relative aspect-[4/3] w-full">
                  {image ? (
                    <img
                      src={image}
                      alt={item.nameEn}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-muted-foreground/50 flex size-full items-center justify-center">
                      <ImageOff className="size-6" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 p-2">
                  <span className="line-clamp-2 text-sm font-medium">
                    {item.nameEn}
                  </span>
                  <span className="text-muted-foreground mt-auto text-sm tabular-nums">
                    {formatPrice(item.price, item.currencyCode)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft />
            Previous
          </Button>
          <span className="text-muted-foreground text-sm tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  )
}
