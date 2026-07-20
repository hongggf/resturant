import { createBrowserRouter, Navigate } from "react-router"

import { AdminLayout } from "@/layouts/admin-layout"
import { CashierLayout } from "@/layouts/cashier-layout"
import { CategoriesPage } from "@/pages/admin/categories"
import { MenuItemsPage } from "@/pages/admin/menu-items"
import { ModifierGroupsPage } from "@/pages/admin/modifier-groups"
import { OverviewPage } from "@/pages/admin/overview"
import { TablesPage } from "@/pages/admin/tables"
import { UsersPage } from "@/pages/admin/users"
import { BillPage } from "@/pages/cashier/bill"
import { ManualOrderPage } from "@/pages/cashier/manual-order"
import { ReceiptPage } from "@/pages/cashier/receipt"
import { SessionPage } from "@/pages/cashier/session"
import { TableBoardPage } from "@/pages/cashier/table-board"
import { LoginPage } from "@/pages/login"
import { RequireAuth } from "./require-auth"
import { RoleLanding } from "./role-landing"

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/", element: <RoleLanding /> },
  {
    element: <RequireAuth roles={["ADMIN"]} />,
    children: [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <OverviewPage /> },
          { path: "categories", element: <CategoriesPage /> },
          { path: "menu-items", element: <MenuItemsPage /> },
          { path: "modifier-groups", element: <ModifierGroupsPage /> },
          { path: "tables", element: <TablesPage /> },
          { path: "users", element: <UsersPage /> },
        ],
      },
    ],
  },
  {
    // Admins can run the till too, e.g. covering a shift.
    element: <RequireAuth roles={["CASHIER", "ADMIN"]} />,
    children: [
      {
        path: "/cashier",
        element: <CashierLayout />,
        children: [
          { index: true, element: <TableBoardPage /> },
          { path: "sessions/:sessionId", element: <SessionPage /> },
          { path: "sessions/:sessionId/order", element: <ManualOrderPage /> },
          { path: "sessions/:sessionId/bill", element: <BillPage /> },
          { path: "sessions/:sessionId/receipt", element: <ReceiptPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
])
