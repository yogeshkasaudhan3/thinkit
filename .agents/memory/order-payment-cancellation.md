---
name: Order payment & cancellation schema
description: New columns on the orders table for admin cancellation reasons and post-delivery payment collection; migration pattern and API design
---

## New columns (all nullable)
- `cancellation_reason TEXT` — set by admin when cancelling; customers see this
- `payment_status TEXT` — 'paid' | 'unpaid'; set when admin marks delivered
- `payment_collection_method TEXT` — 'cash' | 'upi' | 'mixed'; required when paid
- `cash_amount INTEGER` — for mixed payments
- `upi_amount INTEGER` — for mixed payments

## API endpoints
- `PATCH /api/admin/orders/:id/cancel` — dedicated admin cancel endpoint (not the status update route); requires `{ cancellationReason: string }`; blocks cancelling delivered/already-cancelled orders
- `PATCH /api/admin/orders/:id/status` — when status='delivered', requires `{ paymentStatus, paymentCollectionMethod?, cashAmount?, upiAmount? }`; server validates cash+upi === grandTotal for mixed

## Dashboard sales rule
- `todaySales` only counts `status='delivered' AND payment_status='paid'`; cancelled and unpaid orders are excluded

## Migration pattern
- `drizzle-kit push` requires interactive TTY and will prompt for unrelated constraints — use `executeSql({ sqlQuery: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS ...' })` via CodeExecution for non-interactive column additions

## TypeScript gotcha (admin panel)
- `useGetAdminOrder` returns the generated API schema type which lacks the new fields; cast `order as unknown as Record<string, unknown>` to access them
- When rendering `Record<string, unknown>` values in JSX: use `!!field` in conditionals (not `field &&`) to avoid `unknown` being inferred as `ReactNode`; cast numeric fields with `Number(field)` before rendering

**Why:** The generated Orval client types are frozen and don't auto-update when the DB schema changes; the safe cast pattern avoids regenerating the whole API client for minor field additions.
