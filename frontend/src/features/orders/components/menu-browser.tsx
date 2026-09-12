import { useState } from "react"
import { ChevronLeft, ChevronRight, ImageOff, UtensilsCrossed, Ban } from "lucide-react"

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
  useUpdateMenuItemAvailability,
} from "@/features/menu/hooks/use-menu-items"
import { resolveItemImage } from "@/features/menu/lib/food-image"
import type { MenuItem } from "@/features/menu/types"
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
  })
  const updateAvailability = useUpdateMenuItemAvailability()

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
          className="h-8 px-4 text-sm"
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
            className="h-8 px-4 text-sm"
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
            const image = resolveItemImage(item.nameEn, item.imageUrl, "card")
            return (
              <div
                key={item.id}
                className={cn(
                  "bg-card hover:border-primary/50 flex flex-col overflow-hidden rounded-xl border text-left relative",
                  "transition-colors",
                  !item.available && "opacity-50 cursor-not-allowed"
                )}
              >
                <button
                  type="button"
                  onClick={() => onPick(item)}
                  disabled={!item.available}
                  className="absolute inset-0 z-0 text-left"
                >
                  <span className="sr-only">Select {item.nameEn}</span>
                </button>
                <div className="bg-muted relative aspect-[4/3] w-full pointer-events-none">
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
                  {!item.available && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px]">
                      <Badge variant="destructive" className="font-semibold pointer-events-none">Sold out / អស់</Badge>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 p-2 pointer-events-none">
                  <span className="line-clamp-2 text-sm font-medium">
                    {item.nameEn}
                  </span>
                  <span className="text-muted-foreground mt-auto text-sm tabular-nums">
                    {formatPrice(item.price, item.currencyCode)}
                  </span>
                </div>
                {item.available && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 size-8 shadow-md z-10 text-destructive bg-background/80 hover:bg-background/90"
                    onClick={() => updateAvailability.mutate({ id: item.id, available: false })}
                    disabled={updateAvailability.isPending}
                    title="86 / Sold out"
                  >
                    <Ban className="size-4" />
                  </Button>
                )}
              </div>
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
