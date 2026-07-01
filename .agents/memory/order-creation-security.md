---
name: Order creation security
description: Server-side price recomputation for POST /api/orders; zod unavailable in api-server.
---

## Rule
`POST /api/orders` (customer-facing) **never persists client-supplied prices or totals**. The server always fetches `price` from `productsTable` by ID, validates `enabled=true` and `inStock=true`, and recomputes `subtotal / smallCartFee / deliveryFee / handlingFee / grandTotal` using the same pricing model as the customer app.

Client payload only trusts: `items[].productId` (string), `items[].qty` (int 1–100), `paymentMethod` ("cod"|"upi"), `orderNote` (string ≤500 chars).

**Why:** Without server-side recomputation, a malicious client can submit ₹1 prices and get orders accepted at those prices.

**How to apply:** Any future checkout variant (e.g. UPI flow, bulk order) must go through the same server-side price resolution before insert. Do not add a `price` trust path.

## Zod in api-server
`zod` is NOT a direct dependency of `@workspace/api-server`. esbuild bundles the server and cannot resolve `zod` or `zod/v4` as an import. Use hand-written type-guard functions for validation in api-server routes. The `@workspace/api-zod` package has its own compiled validators — use those for routes that already import from it.

## Pricing constants (must stay in sync with CheckoutPage.tsx)
- HANDLING_FEE = 5
- smallCartFee = subtotal < 100 ? 20 : 0
- deliveryFee = subtotal >= 150 ? 0 : 20
