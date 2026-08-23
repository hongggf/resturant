import { describe, it, expect } from 'vitest'
import { loginSchema } from './auth/schemas/login'
import { tableSchema } from './tables/schemas/table'
import { categorySchema } from './categories/schemas/category'
import { menuItemSchema } from './menu/schemas/menu-item'

describe('Form Validation Schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({
        username: 'admin',
        password: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty username or password', () => {
      const result = loginSchema.safeParse({ username: '', password: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('tableSchema', () => {
    it('validates correct table data', () => {
      const result = tableSchema.safeParse({
        tableNumber: 'Table 01',
        active: true,
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty table number', () => {
      const result = tableSchema.safeParse({
        tableNumber: '',
        active: true,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('categorySchema', () => {
    it('validates correct category data', () => {
      const result = categorySchema.safeParse({
        nameEn: 'Broth',
        nameKm: 'ទឹកស៊ុប',
        description: 'Flavorful base',
        sortOrder: 1,
        active: true,
      })
      expect(result.success).toBe(true)
    })

    it('rejects negative sort order', () => {
      const result = categorySchema.safeParse({
        nameEn: 'Broth',
        nameKm: 'ទឹកស៊ុប',
        description: '',
        sortOrder: -1,
        active: true,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('menuItemSchema', () => {
    it('validates correct menuItem data', () => {
      const result = menuItemSchema.safeParse({
        nameEn: 'Beef Slice',
        nameKm: 'សាច់គោបន្ទះ',
        descriptionEn: 'Fresh sliced beef',
        descriptionKm: 'សាច់គោស្រស់',
        price: 3.5,
        currencyCode: 'USD',
        categoryId: 'cat-123',
        available: true,
      })
      expect(result.success).toBe(true)
    })

    it('rejects negative price', () => {
      const result = menuItemSchema.safeParse({
        nameEn: 'Beef Slice',
        nameKm: 'សាច់គោបន្ទះ',
        descriptionEn: '',
        descriptionKm: '',
        price: -1,
        currencyCode: 'USD',
        categoryId: 'cat-123',
        available: true,
      })
      expect(result.success).toBe(false)
    })
  })
})
