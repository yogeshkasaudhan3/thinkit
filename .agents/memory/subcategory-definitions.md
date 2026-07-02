---
    name: Subcategory definitions architecture
    description: Master subcategory table (subcategory_definitions) for canonical per-category subcategory lists, independent of product assignments.
    ---

    ## What changed
    - New `subcategory_definitions` table stores the canonical subcategory list per category
    - Separate from the `subcategory` text field on `products` (used for filtering)
    - 11 categories seeded with 55 subcategory definitions in total

    ## DB schema
    ```
    subcategory_definitions: id, category_id → categories.id (CASCADE), name, display_order, created_at, updated_at
    UNIQUE INDEX on (category_id, name)
    ```

    ## API routes
    - `GET /api/categories/:id/subcategories` → returns `string[]` (names only) from master table
    - `GET /api/admin/categories/:catId/subcategories` → returns full objects `{id, categoryId, name, displayOrder, ...}`
    - `POST /api/admin/categories/:catId/subcategories` → create
    - `PATCH /api/admin/subcategories/:id` → update name / displayOrder
    - `DELETE /api/admin/subcategories/:id` → delete

    Route file: `artifacts/api-server/src/routes/admin/subcategories.ts`
    Registered in: `artifacts/api-server/src/routes/admin/index.ts`

    ## Admin panel
    - Categories page has inline SubcategoryManager per row (expand "Subcategories" link)
    - Tag chips with hover edit/delete; "Add subcategory" input at bottom
    - Error state shown separately from empty state

    ## Customer app
    - SubcategoryPage fetches subcategories from `/api/categories/:id/subcategories`
    - Tabs appear from master list even if no products are yet assigned to that subcategory
    - Product filtering still uses `product.subcategory?.trim() === activeSubcat`

    ## Product form
    - `useSubcategoryOptions` maps objects to strings (`.name`) for backward compat
    - Falls back to "custom" input mode when product subcategory not in master list

    **Why:** Tabs must show canonical subcategories regardless of product stock; subcategory editing must be admin-controlled, not derived from product data.
    