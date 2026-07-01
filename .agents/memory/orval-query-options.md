---
name: Orval hook query options
description: Orval-generated hooks require full UseQueryOptions including queryKey — must pass query key helper explicitly
---

## Rule
When passing `query` options to Orval-generated `useGet*` hooks, always include the `queryKey` from the corresponding `getGet*QueryKey()` helper.

## Why
Orval generates the `query` option as `UseQueryOptions<...>` (full type), not `Omit<UseQueryOptions, 'queryKey' | 'queryFn'>`. TanStack Query v5 requires `queryKey` on `UseQueryOptions`. TypeScript will error: "Property 'queryKey' is missing".

## How to apply
BAD:
```tsx
const { data } = useGetAdminMe({ query: { retry: false } });
const { data } = useGetAdminOrder(id, { query: { enabled: !!id } });
```

GOOD:
```tsx
const { data } = useGetAdminMe({ query: { queryKey: getGetAdminMeQueryKey(), retry: false } });
const { data } = useGetAdminOrder(id, { query: { queryKey: getGetAdminOrderQueryKey(id), enabled: !!id } });
```

Always import the `getGet*QueryKey` helper alongside the hook when customizing query options.
