---
name: Product variants (pack sizes) pattern
description: How opt-in product variants (alternate pack sizes) were layered onto Thinkit without touching non-variant product behavior; consult before extending variants further.
---

## Additive, not replacing
Variants are alternate pack sizes **in addition to** a product's own price/weight/mrp — the base product fields are never removed or reinterpreted as "variant 0". Every read path (listing, search, cart line default, order line default) falls back to the base product fields when no variant is selected, so a product with zero variant rows behaves byte-for-byte like before this feature.

**Why:** the feature was explicitly required to be opt-in and backward-compatible with existing localStorage carts and order history that predate variants.

**How to apply:** when adding new variant-aware logic, always write it as `variant?.field ?? product.field`, never restructure the base product schema to route through variants.

## Cart line identity
Cart item id = `productId` alone (no variant), or `` `${productId}::v${variantId}` `` when a variant is selected. Any `cart.find` meant to match only the base-product card must add `&& !item.variant`, or it will also match variant lines and show wrong add-to-cart state on product cards/grids.

**Why:** preserves old localStorage cart shape for existing users while giving variant lines a distinct, stable identity.

## Stock decrement
No stock-decrement logic existed anywhere before this feature. It was introduced **only** for variant order lines: an atomic conditional `UPDATE ... WHERE stockQty >= qty` inside the same DB transaction as the order insert, to prevent overselling under concurrency. Base/non-variant product stock is intentionally left untouched — do not extend base-product decrement logic as a side effect of variant work without a separate explicit decision.

## Orval-generated names must be grepped, not guessed
For a newly added resource, the generated zod/hook names don't reliably match the OpenAPI schema name. Confirmed pattern is `<Verb><Resource>Body`/`<Verb><Resource>Params` for zod (in `lib/api-zod/src/generated/api.ts`) and `use<Verb><Resource>` for react-query hooks (in `lib/api-client-react/src/generated/api.ts`), but the react-query mutation *input* type is a separate schema (`<Resource>Input`/`<Resource>Update` in `api.schemas.ts`), not the zod body type.

**Why:** assuming names from the OpenAPI schema caused a wrong-import build failure caught only by `tsc`.

**How to apply:** always `grep` the actual generated files for the resource name before importing, in both `lib/api-zod` (server-side validation) and `lib/api-client-react` (client hooks) — they diverge.
