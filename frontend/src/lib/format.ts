export function formatPrice(price?: number, currencyCode?: string) {
  if (price == null) return ""
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "USD",
    }).format(price)
  } catch {
    return `${price} ${currencyCode ?? ""}`
  }
}
