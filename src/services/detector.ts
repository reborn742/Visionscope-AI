import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { Detection } from '../types/detection';

// 80 standard COCO category index map (1-indexed matching COCO dataset IDs)
const COCO_CLASSES: Record<number, string> = {
  1: 'person', 2: 'bicycle', 3: 'car', 4: 'motorcycle', 5: 'airplane',
  6: 'bus', 7: 'train', 8: 'truck', 9: 'boat', 10: 'traffic light',
  11: 'fire hydrant', 13: 'stop sign', 14: 'parking meter', 15: 'bench',
  16: 'bird', 17: 'cat', 18: 'dog', 19: 'horse', 20: 'sheep',
  21: 'cow', 22: 'elephant', 23: 'bear', 24: 'zebra', 25: 'giraffe',
  27: 'backpack', 28: 'umbrella', 31: 'handbag', 32: 'tie', 33: 'suitcase',
  34: 'frisbee', 35: 'skis', 36: 'snowboard', 37: 'sports ball', 38: 'kite',
  39: 'baseball bat', 40: 'baseball glove', 41: 'skateboard', 42: 'surfboard',
  43: 'tennis racket', 44: 'bottle', 46: 'wine glass', 47: 'cup', 48: 'fork',
  49: 'knife', 50: 'spoon', 51: 'bowl', 52: 'banana', 53: 'apple',
  54: 'sandwich', 55: 'orange', 56: 'broccoli', 57: 'carrot', 58: 'hot dog',
  59: 'pizza', 60: 'donut', 61: 'cake', 62: 'chair', 63: 'couch',
  64: 'potted plant', 65: 'bed', 67: 'dining table', 70: 'toilet', 72: 'tv',
  73: 'laptop', 74: 'mouse', 75: 'remote', 76: 'keyboard', 77: 'cell phone',
  78: 'microwave', 79: 'oven', 80: 'toaster', 81: 'sink', 82: 'refrigerator',
  84: 'book', 85: 'clock', 86: 'vase', 87: 'scissors', 88: 'teddy bear',
  89: 'hair drier', 90: 'toothbrush'
};

// Everyday object synonyms for user-friendly recognition
const OBJECT_DISPLAY_NAMES: Record<string, string> = {
  'person': 'Person',
  'dog': 'Dog',
  'cat': 'Cat',
  'cell phone': 'Smartphone',
  'scissors': 'Scissors',
  'hair drier': 'Hair Drier',
  'clock': 'Wristwatch',
  'toothbrush': 'Toothbrush',
  'bottle': 'Bottle',
  'cup': 'Cup / Mug',
  'book': 'Book',
};

export type BaseModelType = 'mobilenet_v2' | 'lite_mobilenet_v2';

export interface DiagnosticData {
  modelName: string;
  baseModel: BaseModelType;
  backend: string;
  imageDimensions: { width: number; height: number } | null;
  rawPredictionsCount: number;
  rawPredictions: Array<{ class: string; score: number; bbox: [number, number, number, number] }>;
  uiThreshold: number;
  filteredCount: number;
  inferenceTimeMs: number | null;
  error: string | null;
}

interface RawCandidateBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  score: number;
  class: string;
}

/**
 * Pure-JavaScript Non-Maximum Suppression with tightness preference.
 */
function runPureJsNMS(
  candidates: RawCandidateBox[],
  iouThreshold = 0.45,
  maxBoxes = 10
): RawCandidateBox[] {
  candidates.sort((a, b) => {
    const penaltyA = a.class === 'person' && (a.xmax - a.xmin) > 0.65 ? 0.08 : 0;
    const penaltyB = b.class === 'person' && (b.xmax - b.xmin) > 0.65 ? 0.08 : 0;
    return (b.score - penaltyB) - (a.score - penaltyA);
  });

  const selected: RawCandidateBox[] = [];

  for (const box of candidates) {
    if (selected.length >= maxBoxes) break;

    let suppress = false;
    for (const kept of selected) {
      const yA = Math.max(box.ymin, kept.ymin);
      const xA = Math.max(box.xmin, kept.xmin);
      const yB = Math.min(box.ymax, kept.ymax);
      const xB = Math.min(box.xmax, kept.xmax);

      const interW = Math.max(0, xB - xA);
      const interH = Math.max(0, yB - yA);
      const interArea = interW * interH;

      if (interArea > 0) {
        const areaBox = (box.xmax - box.xmin) * (box.ymax - box.ymin);
        const areaKept = (kept.xmax - kept.xmin) * (kept.ymax - kept.ymin);
        const unionArea = areaBox + areaKept - interArea;
        const iou = unionArea > 0 ? interArea / unionArea : 0;

        if (iou > iouThreshold) {
          suppress = true;
          break;
        }
      }
    }

    if (!suppress) {
      selected.push(box);
    }
  }

  return selected;
}

class VisionScopeEngine {
  private model: cocoSsd.ObjectDetection | null = null;
  private loadingPromise: Promise<cocoSsd.ObjectDetection> | null = null;
  private backendInitialized = false;
  private videoCanvas: HTMLCanvasElement | null = null;

  private currentBase: BaseModelType = 'mobilenet_v2';

  private latestDiagnostic: DiagnosticData = {
    modelName: 'VisionScope High-Precision AI',
    baseModel: 'mobilenet_v2',
    backend: 'pending',
    imageDimensions: null,
    rawPredictionsCount: 0,
    rawPredictions: [],
    uiThreshold: 0.20,
    filteredCount: 0,
    inferenceTimeMs: null,
    error: null,
  };

  private liveExportCanvas: HTMLCanvasElement | null = null;

  public getDiagnosticData(): DiagnosticData {
    return { ...this.latestDiagnostic };
  }

  public getBaseModel(): BaseModelType {
    return this.currentBase;
  }

  public async setBaseModel(base: BaseModelType): Promise<void> {
    if (this.currentBase === base && this.model) {
      return;
    }
    this.currentBase = base;
    this.dispose();
    await this.initialize();
  }

  public async initialize(): Promise<cocoSsd.ObjectDetection> {
    if (this.model) {
      return this.model;
    }
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        if (!this.backendInitialized) {
          await tf.ready();
          this.backendInitialized = true;
        }

        const backend = tf.getBackend() || 'unknown';
        this.latestDiagnostic.backend = backend;
        this.latestDiagnostic.baseModel = this.currentBase;
        this.latestDiagnostic.error = null;

        const localModelPath =
          this.currentBase === 'mobilenet_v2'
            ? '/models/ssd_mobilenet_v2/model.json'
            : '/models/ssdlite_mobilenet_v2/model.json';

        let loadedModel: cocoSsd.ObjectDetection | null = null;

        try {
          loadedModel = await cocoSsd.load({
            base: this.currentBase,
            modelUrl: localModelPath,
          });
        } catch {
          // fallback
        }

        if (!loadedModel) {
          try {
            loadedModel = await cocoSsd.load({
              base: this.currentBase,
            });
          } catch {
            this.currentBase = 'lite_mobilenet_v2';
            this.latestDiagnostic.baseModel = 'lite_mobilenet_v2';
            loadedModel = await cocoSsd.load({
              base: 'lite_mobilenet_v2',
              modelUrl: '/models/ssdlite_mobilenet_v2/model.json',
            }).catch(() => cocoSsd.load({ base: 'lite_mobilenet_v2' }));
          }
        }

        if (!loadedModel) {
          throw new Error('Failed to load local weights.');
        }

        this.model = loadedModel;
        this.latestDiagnostic.error = null;
        return loadedModel;
      } catch (err: any) {
        this.loadingPromise = null;
        this.latestDiagnostic.error = err?.message || 'Failed to initialize model';
        throw err;
      }
    })();

    return this.loadingPromise;
  }

  public isReady(): boolean {
    return this.model !== null;
  }

  /**
   * High-Precision Vision AI object detection endpoint.
   * Can be used for static images or live camera frames.
   * Seamlessly delegates to local neural detector if API rate limit or service load occurs.
   */
  public async detectWithVisionAI(
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    uiThreshold = 0.20,
    isLive = false
  ): Promise<{
    detections: Detection[];
    rawResults: cocoSsd.DetectedObject[];
    inferenceTimeMs: number;
    diagnostics: DiagnosticData;
  }> {
    const nativeWidth =
      source instanceof HTMLImageElement
        ? source.naturalWidth || source.width
        : source instanceof HTMLVideoElement
        ? source.videoWidth || source.width
        : source.width;

    const nativeHeight =
      source instanceof HTMLImageElement
        ? source.naturalHeight || source.height
        : source instanceof HTMLVideoElement
        ? source.videoHeight || source.height
        : source.height;

    if (nativeWidth <= 0 || nativeHeight <= 0) {
      throw new Error('Invalid image dimensions');
    }

    const effectiveIsLive = isLive || source instanceof HTMLVideoElement;

    try {
      // 1024px delivers high-definition visual clarity for small items (fruits, berries, pets, dials, keys)
      // while maintaining Gemini's rapid inference window (~80KB JPEG)
      const maxExportDim = 1024;
      let exportW = nativeWidth;
      let exportH = nativeHeight;
      if (nativeWidth > maxExportDim || nativeHeight > maxExportDim) {
        const ratio = Math.min(maxExportDim / nativeWidth, maxExportDim / nativeHeight);
        exportW = Math.round(nativeWidth * ratio);
        exportH = Math.round(nativeHeight * ratio);
      }

      if (!this.liveExportCanvas) {
        this.liveExportCanvas = document.createElement('canvas');
      }
      const offCanvas = this.liveExportCanvas;
      offCanvas.width = exportW;
      offCanvas.height = exportH;
      const octx = offCanvas.getContext('2d', { willReadFrequently: true });
      if (!octx) {
        throw new Error('Could not create offscreen canvas context');
      }

      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'medium';
      octx.drawImage(source, 0, 0, exportW, exportH);
      const base64 = offCanvas.toDataURL('image/jpeg', 0.85);

      const tStart = performance.now();
      // Never let a stalled request hang the UI: abort after 30s and fall back to local.
      const abortCtl = new AbortController();
      const abortTimer = setTimeout(() => abortCtl.abort(), 30_000);
      let apiRes: Response;
      try {
        apiRes = await fetch('/api/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          signal: abortCtl.signal,
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: 'image/jpeg',
            isLive,
          }),
        });
      } finally {
        clearTimeout(abortTimer);
      }

      if (!apiRes.ok) {
        console.warn(`Vision AI API returned HTTP ${apiRes.status}, smoothly activating local neural fallback`);
        return await this.detectLocal(source, uiThreshold, 25, 0.12, true);
      }

      const data = await apiRes.json();
      const tEnd = performance.now();
      const inferenceTimeMs = Math.round(tEnd - tStart);

      // If server signaled fallbackToLocal (e.g. 429 quota exhausted or 503 service unavailable)
      if (data.fallbackToLocal) {
        console.warn('Vision AI signaled rate-limit / load, smoothly delegating to local neural engine:', data.message);
        return await this.detectLocal(source, uiThreshold, 25, 0.12, true);
      }

      const rawList: any[] = (Array.isArray(data.detections) ? data.detections : [])
        .filter((d: any) => d && typeof d === 'object')
        .slice(0, 50);
      if (rawList.length === 0 && data.rateLimited) {
        return await this.detectLocal(source, uiThreshold, 25, 0.12, true);
      }

      // Server responses are validated again here (defence in depth): never feed
      // NaN/Infinity/garbage into SVG attributes or canvas drawing.
      const toNorm = (v: any) => {
        const parsed = typeof v === 'number' ? v : parseFloat(v);
        const num = Number.isFinite(parsed) ? parsed : 0;
        return num > 1.0 ? num / 1000 : num;
      };

      const rawPredictions: cocoSsd.DetectedObject[] = rawList.map((d: any) => {
        const ymin = Math.max(0, Math.min(1.0, toNorm(d.box_2d?.[0] ?? 0)));
        const xmin = Math.max(0, Math.min(1.0, toNorm(d.box_2d?.[1] ?? 0)));
        const ymax = Math.max(0, Math.min(1.0, toNorm(d.box_2d?.[2] ?? 1000)));
        const xmax = Math.max(0, Math.min(1.0, toNorm(d.box_2d?.[3] ?? 1000)));

        const x = Math.max(0, Math.round(xmin * nativeWidth));
        const y = Math.max(0, Math.round(ymin * nativeHeight));
        const w = Math.min(nativeWidth - x, Math.max(4, Math.round((xmax - xmin) * nativeWidth)));
        const h = Math.min(nativeHeight - y, Math.max(4, Math.round((ymax - ymin) * nativeHeight)));

        return {
          class: String(d.label || 'object').trim().slice(0, 60),
          score:
            typeof d.confidence === 'number' && Number.isFinite(d.confidence)
              ? Math.max(0, Math.min(1, d.confidence))
              : 0.95,
          bbox: [x, y, w, h] as [number, number, number, number],
        };
      });

      rawPredictions.sort((a, b) => b.score - a.score);

      this.latestDiagnostic = {
        modelName: data.fromCache ? 'VisionScope Precision AI (Cached)' : 'VisionScope High-Precision AI',
        baseModel: this.currentBase,
        backend: 'Multimodal Vision Engine',
        imageDimensions: { width: nativeWidth, height: nativeHeight },
        rawPredictionsCount: rawPredictions.length,
        rawPredictions: rawPredictions.map((p) => ({
          class: p.class,
          score: p.score,
          bbox: p.bbox,
        })),
        uiThreshold,
        filteredCount: rawPredictions.filter((p) => p.score >= uiThreshold).length,
        inferenceTimeMs,
        error: null,
      };

      const detections: Detection[] = rawPredictions.map((item, idx) => ({
        id: `${item.class}-${idx}-${item.score.toFixed(4)}-${item.bbox[0]}_${item.bbox[1]}`,
        class: item.class,
        score: item.score,
        bbox: item.bbox,
      }));

      return {
        detections,
        rawResults: rawPredictions,
        inferenceTimeMs,
        diagnostics: this.latestDiagnostic,
      };
    } catch (err: any) {
      console.warn('Vision AI call failed, automatically delegating to local engine:', err?.message);
      return await this.detectLocal(source, uiThreshold, 25, 0.12, true);
    }
  }

  /**
   * Run high-speed local neural detection using browser TensorFlow.js COCO-SSD with custom NMS.
   */
  public async detectLocal(
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    uiThreshold = 0.20,
    maxBoxes = 25,
    minCandidateScore = 0.12,
    isFallback = false
  ): Promise<{
    detections: Detection[];
    rawResults: cocoSsd.DetectedObject[];
    inferenceTimeMs: number;
    diagnostics: DiagnosticData;
  }> {
    const nativeWidth =
      source instanceof HTMLImageElement
        ? source.naturalWidth || source.width
        : source instanceof HTMLVideoElement
        ? source.videoWidth || source.width
        : source.width;

    const nativeHeight =
      source instanceof HTMLImageElement
        ? source.naturalHeight || source.height
        : source instanceof HTMLVideoElement
        ? source.videoHeight || source.height
        : source.height;

    if (nativeWidth <= 0 || nativeHeight <= 0) {
      throw new Error('Invalid image dimensions');
    }

    if (!this.model) {
      await this.initialize();
    }
    if (!this.model) {
      throw new Error('Model failed to initialize');
    }

    let inferenceSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement = source;

    if (source instanceof HTMLVideoElement) {
      const targetW = 480;
      const aspect = nativeHeight / nativeWidth;
      const targetH = Math.round(targetW * aspect) || 360;

      if (!this.videoCanvas) {
        this.videoCanvas = document.createElement('canvas');
      }
      this.videoCanvas.width = targetW;
      this.videoCanvas.height = targetH;
      const vctx = this.videoCanvas.getContext('2d', { willReadFrequently: true });
      if (vctx) {
        vctx.drawImage(source, 0, 0, targetW, targetH);
        inferenceSource = this.videoCanvas;
      }
    } else if (
      source instanceof HTMLImageElement &&
      (nativeWidth > 1200 || nativeHeight > 1200)
    ) {
      try {
        const maxDim = 1024;
        const aspect = nativeWidth / nativeHeight;
        let targetW = maxDim;
        let targetH = Math.round(maxDim / aspect);
        if (nativeHeight > nativeWidth) {
          targetH = maxDim;
          targetW = Math.round(maxDim * aspect);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(source, 0, 0, targetW, targetH);
          inferenceSource = canvas;
        }
      } catch (scaleErr) {
        console.warn('Canvas pre-scaling fallback:', scaleErr);
        inferenceSource = source;
      }
    }

    const tStart = performance.now();

    const batched = tf.tidy(() => {
      const tensor = tf.browser.fromPixels(inferenceSource);
      return tf.expandDims(tensor);
    });

    const graphModel = (this.model as any).model;
    const result = (await graphModel.executeAsync(batched)) as tf.Tensor[];
    const [scoresData, boxesData] = await Promise.all([
      result[0].data(),
      result[1].data(),
    ]);
    const numBoxes = result[0].shape[1] || 1917;
    const numClasses = result[0].shape[2] || 90;

    batched.dispose();
    tf.dispose(result);

    const candidateBoxesByClass: RawCandidateBox[] = [];

    for (let c = 0; c < numClasses; c++) {
      const className = COCO_CLASSES[c + 1];
      if (!className) continue;

      const classCandidates: RawCandidateBox[] = [];

      for (let i = 0; i < numBoxes; i++) {
        const s = scoresData[i * numClasses + c];
        if (s >= minCandidateScore) {
          const ymin = boxesData[i * 4 + 0];
          const xmin = boxesData[i * 4 + 1];
          const ymax = boxesData[i * 4 + 2];
          const xmax = boxesData[i * 4 + 3];

          const w = xmax - xmin;
          const h = ymax - ymin;

          if (w >= 0.93 && h >= 0.93 && s < 0.70) {
            continue;
          }

          classCandidates.push({
            ymin,
            xmin,
            ymax,
            xmax,
            score: s,
            class: className,
          });
        }
      }

      if (classCandidates.length === 0) continue;

      const keptForClass = runPureJsNMS(classCandidates, 0.45, 8);
      candidateBoxesByClass.push(...keptForClass);
    }

    // Disambiguate Mobile vs TV, normalize remotes to Smartphone, and eliminate false-positive refrigerator and TV detections
    const disambiguatedBoxes: RawCandidateBox[] = [];

    for (const b of candidateBoxesByClass) {
      const w = b.xmax - b.xmin;
      const h = b.ymax - b.ymin;
      const area = w * h;

      // Suppress false-positive refrigerator on room doors, whiteboards, or plain walls
      if (b.class === 'refrigerator') {
        if (b.score < 0.88 || area > 0.65 || h < 0.35) {
          continue;
        }
      }

      if (b.class === 'tv') {
        if (w < 0.40 && h < 0.55) {
          b.class = 'cell phone';
        } else if ((area > 0.25 || h > 0.60) && b.score < 0.55) {
          continue;
        }
      }

      disambiguatedBoxes.push(b);
    }

    // Suppress tiny limb/hand false-positive "person" boxes without eliminating real persons with pets
    const filteredBoxes = disambiguatedBoxes.filter((b) => {
      if (b.class === 'person') {
        const area = (b.xmax - b.xmin) * (b.ymax - b.ymin);
        const h = b.ymax - b.ymin;
        // Only drop tiny fragments (e.g. isolated finger/wrist box with area < 0.02 or h < 0.12)
        if (area < 0.02 || h < 0.12) {
          return false;
        }
        // If an almost identical box already covers this person, drop the duplicate
        const hasDuplicateLarger = disambiguatedBoxes.some((other) => {
          if (other === b || other.class !== 'person') return false;
          const otherArea = (other.xmax - other.xmin) * (other.ymax - other.ymin);
          // Check overlap
          const xA = Math.max(b.xmin, other.xmin);
          const yA = Math.max(b.ymin, other.ymin);
          const xB = Math.min(b.xmax, other.xmax);
          const yB = Math.min(b.ymax, other.ymax);
          const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
          return interArea / area > 0.85 && otherArea > area;
        });
        if (hasDuplicateLarger) {
          return false;
        }
      }
      return true;
    });

    const rawPredictions: cocoSsd.DetectedObject[] = filteredBoxes.map((b) => {
      const x = Math.max(0, Math.round(b.xmin * nativeWidth));
      const y = Math.max(0, Math.round(b.ymin * nativeHeight));
      const w = Math.min(nativeWidth - x, Math.max(4, Math.round((b.xmax - b.xmin) * nativeWidth)));
      const h = Math.min(nativeHeight - y, Math.max(4, Math.round((b.ymax - b.ymin) * nativeHeight)));

      const mappedClass = OBJECT_DISPLAY_NAMES[b.class] || b.class;

      return {
        class: mappedClass,
        score: b.score,
        bbox: [x, y, w, h] as [number, number, number, number],
      };
    });

    rawPredictions.sort((a, b) => b.score - a.score);

    const tEnd = performance.now();
    const inferenceTimeMs = Math.round(tEnd - tStart);

    const filtered = rawPredictions.filter((p) => p.score >= uiThreshold);

    this.latestDiagnostic = {
      modelName: isFallback
        ? 'Local Neural Engine (Rate Limit Protected Fallback)'
        : 'COCO-SSD (High-Performance Engine)',
      baseModel: this.currentBase,
      backend: tf.getBackend() || 'unknown',
      imageDimensions: { width: nativeWidth, height: nativeHeight },
      rawPredictionsCount: rawPredictions.length,
      rawPredictions: rawPredictions.map((p) => ({
        class: p.class,
        score: p.score,
        bbox: p.bbox,
      })),
      uiThreshold,
      filteredCount: filtered.length,
      inferenceTimeMs,
      error: null,
    };

    const detections: Detection[] = rawPredictions.map((item, idx) => ({
      id: `${item.class}-${idx}-${item.score.toFixed(4)}-${item.bbox[0]}_${item.bbox[1]}`,
      class: item.class,
      score: item.score,
      bbox: item.bbox,
    }));

    return {
      detections,
      rawResults: rawPredictions,
      inferenceTimeMs,
      diagnostics: this.latestDiagnostic,
    };
  }

  /**
   * Run object detection.
   * Supports 'vision_ai' (server-side multimodal AI for exact animal/bird/fruit/handheld item names)
   * or 'local_tfjs' (client-side COCO-SSD for offline fast tracking).
   */
  public async detect(
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    uiThreshold = 0.20,
    maxBoxes = 25,
    minCandidateScore = 0.12,
    engine: 'auto' | 'vision_ai' | 'local_tfjs' = 'auto'
  ): Promise<{
    detections: Detection[];
    rawResults: cocoSsd.DetectedObject[];
    inferenceTimeMs: number;
    diagnostics: DiagnosticData;
  }> {
    if (engine === 'local_tfjs') {
      return this.detectLocal(source, uiThreshold, maxBoxes, minCandidateScore, false);
    }
    const isLive = source instanceof HTMLVideoElement;
    if (engine === 'vision_ai' || engine === 'auto') {
      return this.detectWithVisionAI(source, uiThreshold, isLive);
    }
    return this.detectLocal(source, uiThreshold, maxBoxes, minCandidateScore, false);
  }

  public dispose() {
    if (this.model) {
      try {
        this.model.dispose?.();
      } catch {
        // ignore
      }
      this.model = null;
      this.loadingPromise = null;
    }
  }
}

export const detector = new VisionScopeEngine();
