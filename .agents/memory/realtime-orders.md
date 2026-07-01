---
name: Real-time orders pattern
description: How polling and cancellation are implemented across admin panel and customer app.
---

## Admin Panel Polling
- `useListAdminOrders({}, { query: { queryKey: getListAdminOrdersQueryKey(), refetchInterval: 5000 } })` — fetch all orders, filter client-side for Active/Completed/Cancelled tabs
- `useGetAdminOrder(id, { query: { queryKey: getGetAdminOrderQueryKey(id), enabled: !!id, refetchInterval: id ? 3000 : false } })` — slide-over stays live while open
- SSE still fires `queryClient.invalidateQueries` for instant new-order appearance; polling fills the gap for status changes

**Why:** SSE only emits `newOrder`; status changes from the admin panel need polling to propagate between sessions and to keep the slide-over up to date.

## Customer App Polling
- `useOrders` hook: `fetch('/api/orders')` on mount + `setInterval(fetchOrders, 5000)`; cleans up with `clearInterval` on unmount
- No TanStack Query in customer app — direct fetch with local state

## Atomic Cancellation
- `PATCH /api/orders/:id/cancel` uses a single `UPDATE … WHERE id=? AND customerId=? AND status IN ('new','accepted')` 
- Only reads the order for error diagnosis *after* the update returns 0 rows
- Prevents read-then-write race if admin changes status between a separate read and write

**How to apply:** Any future customer-facing state transition (e.g. rating an order) should use the same atomic WHERE pattern, not a read-check-then-update pattern.

## Customer hook name
The context hook in thinkit-app is `useApp()`, exported from `src/context/AppContext.tsx`. There is no `useAppContext` export.
