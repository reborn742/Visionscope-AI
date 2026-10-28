import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  createOriginGuard,
  createRateLimiter,
  envInt,
  imageCacheKey,
  parseImagePayload,
  sanitizeDetections,
  securityHeaders,
} from './server/security';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production is the default. Dev mode (Vite middleware) must be requested
// explicitly, so a missing NODE_ENV on the host can never expose the dev server.
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

/* ------------------------------ Configuration ----------------------------- */
const PORT = envInt('PORT', 3000, 1, 65535);
const MAX_IMAGE_BYTES = envInt('MAX_IMAGE_BYTES', 4 * 1024 * 1024); // decoded size
const RATE_LIMIT_PER_IP_PER_MIN = envInt('RATE_LIMIT_PER_IP_PER_MIN', 20);
const RATE_LIMIT_GLOBAL_PER_MIN = envInt('RATE_LIMIT_GLOBAL_PER_MIN', 120);
const MAX_CONCURRENT_DETECTIONS = envInt('MAX_CONCURRENT_DETECTIONS', 8);
const MAX_MODEL_ATTEMPTS = envInt('MAX_MODEL_ATTEMPTS', 3, 1, 10);
const PER_MODEL_TIMEOUT_MS = 20_000;
const TOTAL_DEADLINE_MS = 45_000;
// Number of reverse proxies in front of the app (Cloud Run / Render / Fly / Heroku = 1).
// Set to 0 if the app is exposed directly. Wrong values let clients spoof their IP.
const TRUST_PROXY_HOPS = envInt('TRUST_PROXY_HOPS', isDev ? 0 : 1, 0, 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',');
const FRAME_ANCESTORS = process.env.FRAME_ANCESTORS || "'none'";
const CSP_REPORT_ONLY = process.env.CSP_REPORT_ONLY === 'true';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
  console.warn(
    '[config] GEMINI_API_KEY is not set. Vision AI is disabled; the client will use the local TensorFlow.js detector.'
  );
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY_HOPS);
app.use(securityHeaders({ csp: !isDev, cspReportOnly: CSP_REPORT_ONLY, frameAncestors: FRAME_ANCESTORS }));

const ai = apiKey && apiKey !== 'MY_GEMINI_API_KEY'
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Candidate models prioritized for maximum availability, zero 503 demand spikes, and ultra-fast latency
const VISION_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

// Dynamic cooldown tracking to immediately bypass models experiencing temporary 503 demand spikes
const modelCooldownUntil = new Map<string, number>();

function getAvailableVisionModels(): string[] {
  const now = Date.now();
  const ready: string[] = [];
  const coolingDown: string[] = [];

  for (const m of VISION_MODELS) {
    const until = modelCooldownUntil.get(m) || 0;
    if (now < until) {
      coolingDown.push(m);
    } else {
      ready.push(m);
    }
  }

  return [...ready, ...coolingDown];
}

// Fast in-memory cache for recent detection requests to eliminate duplicate calls and avoid 429 quota exhaustion.
// Keyed by SHA-256 of the full image so different images can never collide.
interface CacheEntry {
  timestamp: number;
  detections: any[];
}
const detectionCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 50;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ultra-resilient JSON parser for vision detection responses.
 * Never throws SyntaxError. Gracefully repairs:
 * - Markdown fences (```json ... ```)
 * - Leading/trailing non-JSON commentary or notes
 * - Truncated responses (token cuts mid-object or mid-array)
 * - Trailing commas before brackets/braces
 * - Unclosed brackets or braces
 * - Regex extraction of individual valid detections as a safety net
 */
function safeParseDetections(rawText: string): any[] {
  if (!rawText || typeof rawText !== 'string') return [];

  // Hard cap: model output is untrusted; bound the work the repair heuristics can do.
  let text = rawText.slice(0, 200_000).trim();

  // 1. Remove markdown code fences if wrapped
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  } else if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // 2. Isolate outermost array boundaries [ ... ]
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');

  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    let candidate = text.substring(firstBracket, lastBracket + 1);
    // Sanitize trailing commas before closing brackets or braces
    candidate = candidate.replace(/,\s*([\]}])/g, '$1');
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Continue to repair logic below
    }
  }

  // 3. Attempt repair of truncated JSON array (e.g. truncated mid-token at token limit)
  if (firstBracket !== -1) {
    const fromStart = text.substring(firstBracket);
    const lastCurly = fromStart.lastIndexOf('}');
    if (lastCurly !== -1) {
      let repaired = fromStart.substring(0, lastCurly + 1);
      // Clean any trailing commas before closing the array
      repaired = repaired.replace(/,\s*$/, '').trim() + ']';
      // Clean internal trailing commas
      repaired = repaired.replace(/,\s*([\]}])/g, '$1');
      try {
        const parsed = JSON.parse(repaired);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.warn(`[SafeJSON] Successfully repaired truncated JSON array with ${parsed.length} items`);
          return parsed;
        }
      } catch {
        // Fallback to regex extraction
      }
    }
  }

  // 4. Fallback: regex extraction of individual object blocks
  const extracted: any[] = [];
  const objectRegex = /\{[^{}]*?"label"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"[^{}]*?\}/g;
  let match: RegExpExecArray | null;

  while ((match = objectRegex.exec(text)) !== null) {
    const rawObjStr = match[0].replace(/,\s*}/g, '}');
    try {
      const obj = JSON.parse(rawObjStr);
      if (obj && typeof obj.label === 'string') {
        extracted.push(obj);
      }
    } catch {
      // Manual regex field extraction if individual object is also slightly malformed
      try {
        const labelMatch = rawObjStr.match(/"label"\s*:\s*"([^"]+)"/i);
        const confMatch = rawObjStr.match(/"confidence"\s*:\s*([\d.]+)/i);
        const boxMatch = rawObjStr.match(/"box_2d"\s*:\s*\[\s*([\d.\s,]+)\s*\]/i);
        if (labelMatch) {
          const coords = boxMatch
            ? boxMatch[1].split(',').map((n) => parseFloat(n.trim())).filter((n) => !isNaN(n))
            : [0, 0, 1000, 1000];
          extracted.push({
            label: labelMatch[1],
            confidence: confMatch ? parseFloat(confMatch[1]) : 0.95,
            box_2d: coords.length === 4 ? coords : [0, 0, 1000, 1000],
          });
        }
      } catch {
        // Ignore unparseable fragment
      }
    }
  }

  if (extracted.length > 0) {
    console.warn(`[SafeJSON] Recovered ${extracted.length} objects via regex extraction`);
    return extracted;
  }

  // 5. If input was a single object wrapping detections or a single item
  const firstCurly = text.indexOf('{');
  const lastCurly = text.lastIndexOf('}');
  if (firstCurly !== -1 && lastCurly > firstCurly) {
    try {
      const obj = JSON.parse(text.substring(firstCurly, lastCurly + 1).replace(/,\s*}/g, '}'));
      if (obj && obj.label) return [obj];
      if (Array.isArray(obj?.detections)) return obj.detections;
    } catch {
      // Return empty
    }
  }

  console.warn('[SafeJSON] Could not parse any detection objects from model response');
  return [];
}
    const systemInstruction = `You are an expert high-precision Computer Vision model. Detect ALL objects, fruits, animals, and people in the photo with their EXACT SPECIFIC NAMES and tight bounding boxes.

CRITICAL OBJECT DETECTION RULES:
1. SPECIFIC NAMES FOR ALL FRUITS & PRODUCE (MANDATORY):
   - You MUST identify each specific fruit and vegetable with its exact common name:
     * e.g. "Apple", "Red Apple", "Green Apple", "Banana", "Mango", "Orange", "Strawberry", "Watermelon", "Grapes", "Pineapple", "Kiwi", "Lemon", "Lime", "Peach", "Plum", "Pomegranate", "Avocado", "Papaya", "Blueberries", "Tomato", "Carrot", etc.
   - Detect every individual fruit or fruit bunch visible with its own tight box.
   - NEVER lump fruits together as just "Fruit" or "Food" when specific fruits can be seen.

2. SPECIFIC NAMES FOR ALL ANIMALS & BIRDS (MANDATORY):
   - You MUST detect EVERY animal and bird with its exact specific name or breed:
     * "Dog" (or specific breed like "Golden Retriever Dog", "Labrador Dog", "German Shepherd Dog", "Pug", "Husky")
     * "Cat" (or specific breed like "Persian Cat", "Siamese Cat", "Tabby Cat", "Black Cat")
     * "Bird" (or species like "Parrot", "Scarlet Macaw", "Toucan", "Eagle", "Sparrow", "Pigeon", "Owl")
     * "Horse", "Cow", "Sheep", "Elephant", "Tiger", "Lion", "Rabbit", "Duck", "Fish", "Bear", "Deer", etc.
   - Do not omit any animal in the image.

3. PERSON WITH ANIMALS / PETS (PERSON + DOG, PERSON + CAT, PERSON + DOG + CAT) - STRICT SEPARATION:
   - When a photo contains a person AND one or more animals (such as a Dog, Cat, Bird, or pet):
     * YOU MUST DETECT BOTH THE PERSON AND EVERY ANIMAL AS SEPARATE DETECTIONS.
     * If there is a person, a dog, AND a cat, you MUST return THREE separate boxes: "Person", "Dog", and "Cat".
     * The "Person" box covers the human body.
     * The "Dog" box covers the dog.
     * The "Cat" box covers the cat.
     * Even if the person is cuddling, holding, petting, or sitting right next to the animal, DETECT EACH AS A DISTINCT BOUNDING BOX.
     * NEVER omit the animal, and NEVER omit the person.

4. HANDHELD OBJECTS & WEARING ACCESSORIES (STRICT SEPARATION):
   - When a person holds or wears an item (wristwatch, smartwatch, trimmer, phone, mug, keys):
     * DETECT BOTH the person AND each item as separate bounding boxes.
     * Wristwatch / Smartwatch: MUST be labeled "Wristwatch" or "Smartwatch".
     * STRICT PROHIBITION: NEVER label a wristwatch, wrist, or hand as "Person".
     * Electric Trimmer / Shaver / Clipper: MUST be labeled "Electric Trimmer" (NEVER identify as "Smartphone" or "Remote Control").
     * Phone: MUST be labeled "Smartphone" or "Mobile Phone".
     * Everyday items: "Water Bottle", "Coffee Mug", "Keys", "Book", "Eyeglasses", "Headphones", "Backpack", "Laptop", "Chair".

5. PREVENT FALSE DETECTIONS:
   - Do NOT classify room walls, doors, closets, desks, or partitions as "Refrigerator".
   - Do NOT label smartphones as "Remote Control".

6. PERSON LABELING:
   - ONLY label "Person" if human head/torso/body is visible. Never label an isolated hand or wrist as "Person".

7. RESPONSE FORMAT:
   Return a JSON array of all detected objects:
   [{"label": string, "confidence": number, "box_2d": [ymin, xmin, ymax, xmax]}]
   where coordinates are 0-1000 integers. Output ONLY the JSON array.`;

    const prompt = `Perform complete, exhaustive object detection in this image. Detect EVERY person, every animal (especially dogs, cats, pets, birds with exact names), every fruit (exact names like Apple, Banana, Mango, Orange, Strawberry, Grapes), every tool, device, and accessory with its exact specific name and tight bounding box [ymin, xmin, ymax, xmax]. If a person is with a dog, a cat, or both, detect the person, the dog, and the cat separately. Return JSON array: [{"label": string, "confidence": number, "box_2d": [ymin, xmin, ymax, xmax]}].`;

/* -------------------------------------------------------------------------- */
/*  API: /api/detect                                                          */
/* -------------------------------------------------------------------------- */

const detectOriginGuard = createOriginGuard(ALLOWED_ORIGINS);
const perIpLimiter = createRateLimiter({
  windowMs: 60_000,
  max: RATE_LIMIT_PER_IP_PER_MIN,
  keyFn: (req) => req.ip || 'unknown',
});
const globalLimiter = createRateLimiter({
  windowMs: 60_000,
  max: RATE_LIMIT_GLOBAL_PER_MIN,
  keyFn: () => 'global',
  maxKeys: 1,
});

// Small body limit: the client sends a <=1024px JPEG (a few hundred KB).
// The default 50 MB limit let anyone tie up memory with a single request.
const detectBodyParser = express.json({ limit: Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4096, type: 'application/json' });

let inFlightDetections = 0;

const fallbackPayload = (rateLimited = false) => ({
  detections: [] as any[],
  fallbackToLocal: true,
  rateLimited,
  message: rateLimited
    ? 'Vision AI API rate limit reached. Seamlessly delegating to local neural detector.'
    : 'Vision AI temporarily unavailable. Seamlessly delegating to local neural detector.',
});

// Endpoint for high-precision vision object detection
app.post(
  '/api/detect',
  detectOriginGuard,
  perIpLimiter,
  globalLimiter,
  detectBodyParser,
  async (req: Request, res: Response) => {
    if (inFlightDetections >= MAX_CONCURRENT_DETECTIONS) {
      res.setHeader('Retry-After', '2');
      return res.status(503).json({ error: 'Server is busy. Please retry shortly.' });
    }

    inFlightDetections += 1;
    try {
      const parsedPayload = parseImagePayload(req.body, MAX_IMAGE_BYTES);
      if (!parsedPayload.ok) {
        return res.status(parsedPayload.status).json({ error: parsedPayload.error });
      }
      // Trust the sniffed type, never the client-supplied mimeType.
      const { base64: cleanBase64, mime: mimeType } = parsedPayload;

      if (!ai) {
        return res.json(fallbackPayload(false));
      }

      const fingerprint = imageCacheKey(cleanBase64);

      // Check recent cache
      const cached = detectionCache.get(fingerprint);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json({ detections: cached.detections, fromCache: true });
      }


      let responseText = '';
      let isRateLimited = false;

      // Dynamically retrieve candidate models, automatically bypassing any in cooldown.
      // Capped attempts + an overall deadline bound the cost one request can cause.
      const candidateModels = getAvailableVisionModels().slice(0, MAX_MODEL_ATTEMPTS);
      const deadline = Date.now() + TOTAL_DEADLINE_MS;

      for (let attempt = 0; attempt < candidateModels.length; attempt++) {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 1000) break;

        const modelName = candidateModels[attempt];
        const timeoutMs = Math.min(PER_MODEL_TIMEOUT_MS, remainingMs);
        let timer: NodeJS.Timeout | undefined;
        try {
          const generatePromise = ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      data: cleanBase64,
                      mimeType,
                    },
                  },
                ],
              },
            ],
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                description: 'List of detected objects with specific labels, confidence score, and 0-1000 integer bounding boxes',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: {
                      type: Type.STRING,
                      description: 'Specific name of the object, animal breed, fruit variety, or person',
                    },
                    confidence: {
                      type: Type.NUMBER,
                      description: 'Confidence score from 0.0 to 1.0',
                    },
                    box_2d: {
                      type: Type.ARRAY,
                      description: 'Normalized bounding box [ymin, xmin, ymax, xmax] from 0 to 1000',
                      items: {
                        type: Type.INTEGER,
                      },
                    },
                  },
                  required: ['label', 'box_2d'],
                },
              },
              temperature: 0.1,
              maxOutputTokens: 8192,
            },
          });

          const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Model ${modelName} timed out after ${timeoutMs}ms`)), timeoutMs);
          });

          const response = await Promise.race([generatePromise, timeoutPromise]);

          if (response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          const status = err?.status || err?.statusCode || 0;
          const msg = String(err?.message || '');
          console.warn(`[VisionAI] Model ${modelName} attempt failed (status: ${status}): ${msg.slice(0, 150)}`);

          if (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
            isRateLimited = true;
            modelCooldownUntil.set(modelName, Date.now() + 15000); // 15s cooldown
          }
          if (status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
            modelCooldownUntil.set(modelName, Date.now() + 15000); // 15s cooldown
          }

          // Silent, smooth failover to next model
          if (attempt < candidateModels.length - 1 && isRateLimited) {
            await sleep(100);
          }
        } finally {
          if (timer) clearTimeout(timer);
        }
      }

      if (!responseText) {
        // Graceful fallback: the client-side local neural engine takes over.
        console.warn('Vision AI models unavailable or rate limited, responding with graceful local fallback signal');
        return res.json(fallbackPayload(isRateLimited));
      }

      // Safely parse detections using fault-tolerant parser that repairs truncated or malformed JSON
      const parsedList = safeParseDetections(responseText);

      // Model output is untrusted (it can be steered by text inside the image):
      // validate types, clamp ranges, cap counts, strip control characters.
      const rawList = sanitizeDetections(parsedList);

      if (rawList.length === 0) {
        console.warn('No detection objects could be parsed from model output; delegating smoothly to local neural engine');
        return res.json({
          detections: [],
          fallbackToLocal: true,
        });
      }

      // Post-processing & validation:
      // 1. Standardize specific labels while preserving breeds and fruit varieties
      // 2. Prevent spurious false-positive detections
      const detections = rawList
        .map((d) => {
          let label = d.label;

          // Convert multi-word labels cleanly into Title Case (e.g. "german shepherd dog" -> "German Shepherd Dog")
          label = label.replace(/\b[a-z]/g, (char) => char.toUpperCase());

          // Standardize known classes without erasing specific breeds/varieties
          if (/^person$/i.test(label)) {
            label = 'Person';
          } else if (/^dog$/i.test(label)) {
            label = 'Dog';
          } else if (/^cat$/i.test(label)) {
            label = 'Cat';
          } else if (/wristwatch|smartwatch|wrist watch|apple watch|galaxy watch|timepiece/i.test(label)) {
            label = /smart/i.test(label) ? 'Smartwatch' : 'Wristwatch';
          } else if (/trimmer|shaver|clipper|razor|groomer|hair cutter|beard trimmer/i.test(label)) {
            label = 'Electric Trimmer';
          } else if (/cell phone|mobile phone|smartphone|iphone|android phone/i.test(label)) {
            label = 'Smartphone';
          }

          return { label, confidence: d.confidence, box_2d: d.box_2d };
        })
        .filter((d) => {
          const [ymin, xmin, ymax, xmax] = d.box_2d;
          const boxW = (xmax - xmin) / 1000;
          const boxH = (ymax - ymin) / 1000;
          const boxArea = boxW * boxH;

          // Eliminate false-positive refrigerator detections on room walls, doors, closets
          if (d.label.toLowerCase() === 'refrigerator') {
            if (d.confidence < 0.90 || boxArea < 0.20) {
              return false;
            }
          }

          // Prevent isolated tiny wrist/hand patch mistakenly labeled "Person" when a watch/item is worn
          if (d.label.toLowerCase() === 'person') {
            const hasHandheldOrWatch = rawList.some((other) => {
              const l = other.label.toLowerCase();
              return (
                l.includes('watch') ||
                l.includes('trimmer') ||
                l.includes('phone') ||
                l.includes('key')
              );
            });
            // Only drop if it is an extremely tiny sliver (e.g. wrist/hand < 2% area and < 8% height)
            if (boxArea < 0.02 && boxH < 0.08 && hasHandheldOrWatch) {
              return false;
            }
          }
          return true;
        });

      // Cache successful response
      if (detectionCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = detectionCache.keys().next().value;
        if (firstKey) detectionCache.delete(firstKey);
      }
      detectionCache.set(fingerprint, {
        timestamp: Date.now(),
        detections,
      });

      return res.json({ detections });
    } catch (err: any) {
      // Log details server-side only; never return internal error text to clients.
      console.warn('Vision detection route handled exception, activating local detector:', err?.message || err);
      return res.json({ detections: [], fallbackToLocal: true });
    } finally {
      inFlightDetections -= 1;
    }
  }
);

// Unknown /api routes must be JSON 404s, never the SPA shell.
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

/* -------------------------------------------------------------------------- */
/*  Static / SPA serving                                                      */
/* -------------------------------------------------------------------------- */

// Dev-only: silences Vite HMR WebSocket noise inside the AI Studio container.
// Kept out of index.html so production serves zero inline scripts (strict CSP).
const DEV_ONLY_HEAD_SCRIPT = `<script>
  window.addEventListener('error', function(event) {
    if (event.message && (
      event.message.includes('WebSocket') ||
      event.message.includes('@vite/client') ||
      event.message.includes('createWebSocketModuleRunnerTransport')
    )) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && String(event.reason).includes('WebSocket')) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
</script>`;

// Only serve the SPA shell for real page navigations — not for missing assets,
// model files, or API clients. (Previously a missing /models/*.json returned
// index.html with HTTP 200, which silently broke model loading.)
const looksLikeAssetRequest = (p: string) => p.startsWith('/models/') || p.startsWith('/assets/') || /\.[a-z0-9]{1,8}$/i.test(p);

function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;
  const status = Number(err?.status || err?.statusCode) || 500;
  if (status === 413) return void res.status(413).json({ error: 'Request body too large.' });
  if (status >= 400 && status < 500) return void res.status(status).json({ error: 'Bad request.' });
  console.error('[unhandled]', err?.message || err);
  res.status(500).json({ error: 'Internal server error' });
}

async function startServer() {
  const server = http.createServer(app);

  if (isDev) {
    // Vite is a dev-time dependency: imported lazily so production never loads it.
    const { createServer: createViteServer } = await import('vite');
    // Disable HMR WebSockets to conform to AI Studio container constraints
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    // Serve transformed SPA HTML
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        // Remove @vite/client script tag per AI Studio constraint: "HMR: Disabled. Ignore WebSocket errors."
        template = template.replace(/\s*<script\b[^>]*src=["']\/@vite\/client["'][^>]*><\/script>/gi, '');
        template = template.replace('</head>', `${DEV_ONLY_HEAD_SCRIPT}\n</head>`);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
      console.error('[fatal] dist/index.html not found. Run "npm run build" before "npm start".');
      process.exit(1);
    }

    // Hashed build output is immutable; everything else revalidates.
    app.use(
      '/assets',
      express.static(path.join(distDir, 'assets'), { dotfiles: 'ignore', index: false, immutable: true, maxAge: '1y' })
    );
    app.use(express.static(distDir, { dotfiles: 'ignore', index: false, maxAge: '1h' }));

    app.get('*', (req, res) => {
      if (looksLikeAssetRequest(req.path)) {
        return void res.status(404).type('text/plain').send('Not found');
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'), { dotfiles: 'deny' });
    });
  }

  app.use(errorHandler);

  // Tighten Node's slow-request limits (slowloris).
  server.headersTimeout = 20_000;
  server.requestTimeout = 60_000;
  server.keepAliveTimeout = 5_000;

  server.listen(PORT, () => {
    console.log(`VisionScope AI Server running on port ${PORT} (${isDev ? 'development' : 'production'})`);
  });

  // Graceful shutdown (Cloud Run / Docker send SIGTERM).
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason instanceof Error ? reason.message : reason);
});

startServer().catch((err) => {
  console.error('[fatal] failed to start server:', err?.message || err);
  process.exit(1);
});
