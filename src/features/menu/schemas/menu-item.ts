import { z } from "zod"

export const menuItemSchema = z.object({
  nameEn: z.string().min(1, "English name is required"),
  nameKm: z.string().min(1, "Khmer name is required"),
  descriptionEn: z.string(),
  descriptionKm: z.string(),
  price: z
    .number("Price must be a number")
    .min(0, "Price can't be negative"),
  currencyCode: z.string().min(1, "Currency is required"),
  categoryId: z.string().min(1, "Category is required"),
  available: z.boolean(),
})

export type MenuItemValues = z.infer<typeof menuItemSchema>
