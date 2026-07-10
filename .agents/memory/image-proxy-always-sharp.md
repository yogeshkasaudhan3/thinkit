---
name: Image proxy always-Sharp rule
description: The /uploads/ image route always runs Sharp even without ?w=; pino-http strips query strings from logs.
---

## Rule

`serveImage()` in `storage.ts` accepts a `knownImage` flag. When `true` (set only for the `/storage/objects/*path` route serving product uploads), Sharp is always applied — even when no `?w=` query parameter is present. The default width is 1200 px (`DEFAULT_KNOWN_WIDTH`), which forces WebP encoding without downscaling reasonable display sizes.

**Why:** Original uploads can be multi-MB unoptimised JPEGs. Without this default, a request missing `?w=` (e.g. old bookmark, missing frontend param, admin preview) would stream the raw file, taking 15–60 s on a slow mobile connection.

**How to apply:** The flag is already set at the call site:
```ts
await serveImage(req, res, objectFile, /* knownImage */ true);
```
Any new route that serves known-image uploads should pass `true`. Public-objects routes pass the default `false` and only run Sharp when `?w=` is explicit.

## pino-http query-string stripping

`app.ts` configures pino-http with a custom serializer:
```ts
req(req) {
  return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
}
```

This strips `?w=360` (and all other query params) from every logged URL. Server logs will NEVER show `?w=` even when the browser sends it. Do not use log absence of `?w=` as evidence that the parameter is missing.
