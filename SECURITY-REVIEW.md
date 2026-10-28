# Security review — changes made

| # | Severity | Issue (before) | Fix |
|---|----------|----------------|-----|
| 1 | High | `/api/detect` is an unauthenticated proxy to a paid Gemini API with **no rate limit** — anyone could drain quota/billing. | Per-IP limit (20/min) + global limit (120/min) + max concurrent requests (8); all env-configurable. |
| 2 | High | One request could trigger up to **7 paid model calls × 25 s**. | Max 3 attempts, 20 s per model, 45 s overall deadline; timers cleared. |
| 3 | High | JSON body limit **50 MB** (memory-exhaustion DoS). | ~5.4 MB limit (4 MB decoded image), 413 on overflow. |
| 4 | High | Production defaulted to **dev mode** unless `NODE_ENV=production` (Vite dev server + Express stack-trace error pages exposed). | Production is now the default; dev requires `--dev` / `NODE_ENV=development`. Vite is imported lazily, dev-only. |
| 5 | Medium | Cache key = length + 3 short slices of the base64 → **different images could receive each other's results** (integrity / cross-user data leak). | Cache keyed by SHA-256 of the full image. |
| 6 | Medium | No validation of `imageBase64` / `mimeType`; client-claimed MIME forwarded to Gemini. | Type, charset, size checks; real type determined from magic bytes (JPEG/PNG/WebP only); client MIME ignored. |
| 7 | Medium | Internal error text (`err.message`) returned to clients. | Generic messages to clients; details logged server-side only. |
| 8 | Medium | **No security headers.** | CSP (no inline/eval scripts), X-Content-Type-Options, X-Frame-Options/frame-ancestors, Referrer-Policy, Permissions-Policy (camera/mic off), COOP/CORP, HSTS over HTTPS, `x-powered-by` removed. |
| 9 | Medium | Model output trusted as-is (it can be steered by text inside an uploaded image). | Server **and** client validate: types, finite numbers, clamped ranges, label length/control/bidi chars stripped, max 50 detections, degenerate boxes dropped. Regex repair parser input capped. |
| 10 | Medium | Missing `/models/*` or `/api/*` returned `index.html` with **HTTP 200** (silently broke model loading, confusing API clients). | Real 404s for assets and unknown API routes; SPA shell only for page navigations. |
| 11 | Low | Cross-site pages could drive the endpoint from users' browsers. | Origin guard (same-origin + optional `ALLOWED_ORIGINS`). |
| 12 | Low | Upload checked only `file.type` (spoofable); huge-dimension images could exhaust browser memory. | Magic-byte check; 64 MP / 10 000 px cap. |
| 13 | Low | Slowloris / hanging requests. | Header/request/keep-alive timeouts; client fetch aborts after 30 s. |
| 14 | Low | Inline script in `index.html` forced a weak CSP; it also swallowed unrelated errors. | Moved to dev-only injection; production serves no inline scripts. |
| 15 | Info | Footer claimed "100% in-browser", but images are sent to the server and Google Gemini. | Footer text corrected (privacy accuracy). |
| 16 | Info | `npm start` ran `node server.ts` (relies on experimental type stripping); README pointed at `.env.local` which wasn't loaded. | `build` bundles `server.js`; `start` runs it; `.env.local` and `.env` both loaded. Source maps explicitly off. |

## Not changed / things to know
- **No user authentication.** Rate limits bound abuse but don't prevent it. If this is public and the Gemini bill matters, also set a **quota/budget cap and key restrictions in Google Cloud**, or add auth.
- Rate limits are **per process** (in-memory). With N instances the effective budget is N×.
- `ssd_mobilenet_v2` model folder in `public/models` is **incomplete** (no `model.json`; only shards 10–16 of 17). The app falls back to downloading from Google's CDN (allowed in the CSP) or to `lite_mobilenet_v2`, which is complete. Add the missing files to be fully self-hosted, then remove the CDN hosts from `buildCsp` in `server/security.ts`.
- Dependencies are pinned by `bun.lock` at current versions (express 4.22.x, body-parser 1.20.8, etc.). I could not run `npm audit` offline — run `npm audit --omit=dev` before deploying.
