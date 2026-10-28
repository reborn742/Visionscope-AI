import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/* -------------------------------------------------------------------------- */
/*  Config helpers                                                            */
/* -------------------------------------------------------------------------- */

export function envInt(name: string, fallback: number, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

/* -------------------------------------------------------------------------- */
/*  In-memory rate limiter (no external dependency)                           */
/*  NOTE: state is per-process. If you run several instances, each has its    */
/*  own budget — set the limits with that in mind (or use a shared store).    */
/* -------------------------------------------------------------------------- */

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyFn: (req: Request) => string;
  maxKeys?: number;
}

export function createRateLimiter(opts: RateLimiterOptions) {
  const buckets = new Map<string, Bucket>();
  const maxKeys = opts.maxKeys ?? 10_000;

  const sweep = () => {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  };
  const timer = setInterval(sweep, Math.max(10_000, opts.windowMs));
  timer.unref();

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    const key = opts.keyFn(req);
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      // Bound memory: if the table is full, purge expired, then evict oldest.
      if (buckets.size >= maxKeys) {
        sweep();
        if (buckets.size >= maxKeys) {
          const oldest = buckets.keys().next().value;
          if (oldest !== undefined) buckets.delete(oldest);
        }
      }
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, opts.max - bucket.count);
    res.setHeader('RateLimit-Limit', String(opts.max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil((bucket.resetAt - now) / 1000)));

    if (bucket.count > opts.max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });
      return;
    }
    next();
  };
}

/* -------------------------------------------------------------------------- */
/*  Origin guard — blocks other websites from driving the paid endpoint        */
/* -------------------------------------------------------------------------- */

export function createOriginGuard(extraAllowedOrigins: string[]) {
  const allowed = new Set(extraAllowedOrigins.map((o) => o.trim().toLowerCase()).filter(Boolean));
  return function originGuard(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin;
    if (!origin) return next(); // same-origin navigations / non-browser clients (still rate limited)
    try {
      const o = new URL(origin);
      const host = req.headers.host?.toLowerCase();
      if (o.host.toLowerCase() === host || allowed.has(o.origin.toLowerCase())) return next();
    } catch {
      /* fall through to reject */
    }
    res.status(403).json({ error: 'Forbidden' });
  };
}

/* -------------------------------------------------------------------------- */
/*  Security headers                                                          */
/* -------------------------------------------------------------------------- */

export function buildCsp(frameAncestors: string): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    // React/Tailwind use inline style attributes; Google Fonts CSS is external.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    // storage.googleapis.com / tfhub / kaggle: only used if the bundled model
    // weights are missing and coco-ssd falls back to its default CDN.
    "connect-src 'self' https://storage.googleapis.com https://tfhub.dev https://www.kaggle.com",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join('; ');
}

export function securityHeaders(opts: { csp: boolean; cspReportOnly: boolean; frameAncestors: string }) {
  const csp = buildCsp(opts.frameAncestors);
  const cspHeader = opts.cspReportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  const frameOptions = opts.frameAncestors === "'none'" ? 'DENY' : opts.frameAncestors === "'self'" ? 'SAMEORIGIN' : null;

  return function headers(req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    if (frameOptions) res.setHeader('X-Frame-Options', frameOptions);
    if (opts.csp) res.setHeader(cspHeader, csp);
    // Only meaningful (and only safe) over HTTPS; req.secure honours `trust proxy`.
    if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    next();
  };
}

/* -------------------------------------------------------------------------- */
/*  Image payload validation                                                  */
/* -------------------------------------------------------------------------- */

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

/** Identify the real image type from magic bytes — never trust the client's claim. */
export function sniffImageMime(buf: Buffer): ImageMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) return 'image/webp';
  return null;
}

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const DATA_URL_PREFIX_RE = /^data:image\/(?:jpeg|jpg|png|webp);base64,/i;

export type ImagePayloadResult =
  | { ok: true; base64: string; mime: ImageMime; bytes: number }
  | { ok: false; status: number; error: string };

export function parseImagePayload(body: unknown, maxImageBytes: number): ImagePayloadResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Invalid request body.' };
  }
  const raw = (body as Record<string, unknown>).imageBase64;
  if (typeof raw !== 'string' || raw.length === 0) {
    return { ok: false, status: 400, error: 'imageBase64 must be a non-empty string.' };
  }
  // Upper bound on the *encoded* size before doing any work on it.
  if (raw.length > Math.ceil((maxImageBytes * 4) / 3) + 128) {
    return { ok: false, status: 413, error: 'Image is too large.' };
  }

  const base64 = raw.startsWith('data:') ? raw.replace(DATA_URL_PREFIX_RE, '') : raw;
  if (base64.startsWith('data:') || base64.length % 4 !== 0 || !BASE64_RE.test(base64)) {
    return { ok: false, status: 400, error: 'imageBase64 is not valid base64 image data.' };
  }

  const buf = Buffer.from(base64, 'base64');
  if (buf.length === 0 || buf.length > maxImageBytes) {
    return { ok: false, status: 413, error: 'Image is too large.' };
  }
  const mime = sniffImageMime(buf);
  if (!mime) {
    return { ok: false, status: 415, error: 'Unsupported image type. Use JPEG, PNG or WebP.' };
  }
  return { ok: true, base64, mime, bytes: buf.length };
}

/** Collision-resistant cache key over the full image content. */
export function imageCacheKey(base64: string): string {
  return crypto.createHash('sha256').update(base64).digest('hex');
}

/* -------------------------------------------------------------------------- */
/*  Model output sanitisation — LLM output is untrusted input                  */
/* -------------------------------------------------------------------------- */

export interface CleanDetection {
  label: string;
  confidence: number;
  box_2d: [number, number, number, number];
}

const MAX_LABEL_LEN = 60;
const MAX_DETECTIONS = 50;

function cleanLabel(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LABEL_LEN);
}

function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

export function sanitizeDetections(rawList: unknown[]): CleanDetection[] {
  const out: CleanDetection[] = [];
  for (const item of rawList) {
    if (out.length >= MAX_DETECTIONS) break;
    if (!item || typeof item !== 'object') continue;
    const d = item as Record<string, unknown>;

    const label = cleanLabel(d.label);
    if (!label) continue;

    let box: [number, number, number, number] = [0, 0, 1000, 1000];
    if (Array.isArray(d.box_2d) && d.box_2d.length === 4) {
      const nums = d.box_2d.map(toNumber);
      const allUnit = nums.every((n) => n >= 0 && n <= 1);
      const scaled = nums.map((n) => Math.max(0, Math.min(1000, Math.round(allUnit ? n * 1000 : n))));
      box = scaled as [number, number, number, number];
    }
    // Reject degenerate / inverted boxes rather than rendering garbage.
    if (box[2] <= box[0] || box[3] <= box[1]) continue;

    const conf = typeof d.confidence === 'number' && Number.isFinite(d.confidence) ? d.confidence : 0.95;
    out.push({
      label,
      confidence: Math.round(Math.max(0, Math.min(1, conf)) * 100) / 100,
      box_2d: box,
    });
  }
  return out;
}
