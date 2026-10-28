import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, Download, Trash2, RefreshCw, AlertCircle, Sparkles, Loader2, Zap } from 'lucide-react';
import type { Detection } from '../types/detection';
import { DetectionOverlay } from './DetectionOverlay';
import { detector } from '../services/detector';
import { exportAnnotatedImage } from '../utils/imageExport';
import { SAMPLE_PRESETS } from '../utils/sampleImages';

interface ImageWorkspaceProps {
  modelReady: boolean;
  confidenceThreshold: number;
  detections: Detection[];
  rawDetectionsCount: number;
  onInferenceComplete: (raw: Detection[], inferenceTimeMs: number) => void;
  onClear: () => void;
  highlightedId: string | null;
  onSelectDetection: (id: string | null) => void;
}

export const ImageWorkspace: React.FC<ImageWorkspaceProps> = ({
  modelReady,
  confidenceThreshold,
  detections,
  rawDetectionsCount,
  onInferenceComplete,
  onClear,
  highlightedId,
  onSelectDetection,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'instant_ready' | 'enriching' | 'ai_ready' | 'local_ready'>('idle');
  const [stageMetrics, setStageMetrics] = useState<{ localMs?: number; aiMs?: number }>({});

  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const processedSrcRef = useRef<string | null>(null);
  const currentInferenceIdRef = useRef<number>(0);

  // Parallel Accelerated Inference Pipeline:
  // Kicks off both Instant Local Detection (30-40ms) and Precision Vision AI concurrently.
  // Displays instant speculative boxes with zero lag while Vision AI generates exact names in parallel.
  const runInference = useCallback(async (imgElement: HTMLImageElement) => {
    const inferenceId = ++currentInferenceIdRef.current;
    setIsProcessing(true);
    setErrorMessage(null);
    setPipelineStatus('enriching');

    let localSuccess = false;
    let localDuration = 0;

    // Immediately kick off Vision AI in parallel (0 delay waiting for local detector)
    const aiPromise = detector.detectWithVisionAI(imgElement, confidenceThreshold, false);

    // Concurrently run instant local detection for immediate 30ms speculative display
    try {
      if (modelReady) {
        const localResult = await detector.detectLocal(imgElement, confidenceThreshold, 25, 0.12, false);
        if (currentInferenceIdRef.current === inferenceId) {
          localDuration = localResult.inferenceTimeMs;
          setStageMetrics({ localMs: localDuration });
          if (localResult.detections && localResult.detections.length > 0) {
            onInferenceComplete(localResult.detections, localResult.inferenceTimeMs);
            localSuccess = true;
            setPipelineStatus('instant_ready');
          }
        }
      }
    } catch (localErr) {
      console.warn('Phase 1 instant local scan issue (proceeding to AI):', localErr);
    }

    // Await the concurrently in-flight Vision AI result
    try {
      const aiResult = await aiPromise;
      if (currentInferenceIdRef.current === inferenceId) {
        if (aiResult.detections && aiResult.detections.length > 0) {
          setStageMetrics({ localMs: localDuration, aiMs: aiResult.inferenceTimeMs });
          onInferenceComplete(aiResult.detections, aiResult.inferenceTimeMs);
          setPipelineStatus('ai_ready');
        } else if (localSuccess) {
          setPipelineStatus('local_ready');
        }
      }
    } catch (err: any) {
      if (currentInferenceIdRef.current === inferenceId) {
        console.warn('Phase 2 AI refinement deferred to local detections:', err);
        if (localSuccess) {
          setPipelineStatus('local_ready');
        } else {
          console.warn('Detection failed:', err);
          setErrorMessage('Failed to detect objects in image. Please try again.');
        }
      }
    } finally {
      if (currentInferenceIdRef.current === inferenceId) {
        setIsProcessing(false);
      }
    }
  }, [modelReady, confidenceThreshold, onInferenceComplete]);

  // Validate and load image file.
  // file.type is just the filename extension as reported by the OS and is trivially
  // spoofable, so we also verify the real magic bytes before decoding anything.
  const sniffIsSupportedImage = async (file: File): Promise<boolean> => {
    try {
      const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
      const isPng =
        head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 &&
        head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a;
      const isWebp =
        head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
        head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
      return isJpeg || isPng || isWebp;
    } catch {
      return false;
    }
  };

  const handleFile = async (file: File) => {
    setErrorMessage(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Unsupported file format. Please upload a JPG, JPEG, PNG, or WebP image.');
      return;
    }

    // Limit to 20MB
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 20MB limit. Please choose a smaller image.');
      return;
    }

    if (!(await sniffIsSupportedImage(file))) {
      setErrorMessage('This file does not look like a valid JPG, PNG, or WebP image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result;
      if (typeof src === 'string' && src.startsWith('data:image/')) {
        processedSrcRef.current = null;
        setImageSrc(src);
      } else {
        setErrorMessage('Failed to read selected image file.');
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read selected image file.');
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Image load event: sets dimensions and triggers real inference once per unique image
  const handleImageLoad = () => {
    if (!imageRef.current || !imageSrc) return;
    const width = imageRef.current.naturalWidth;
    const height = imageRef.current.naturalHeight;

    // Guard against decompression bombs: a small file can decode to a gigantic bitmap
    // (e.g. 30000x30000 px) and exhaust browser memory when drawn to canvas / tensors.
    const MAX_SIDE = 10000;
    const MAX_PIXELS = 64_000_000;
    if (width <= 0 || height <= 0 || width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) {
      processedSrcRef.current = null;
      setImageSrc(null);
      setImageDimensions({ width: 0, height: 0 });
      setErrorMessage('Image dimensions are too large to process. Please use an image under 64 megapixels.');
      onClear();
      return;
    }
    setImageDimensions({ width, height });

    if (processedSrcRef.current === imageSrc) {
      return; // Already processed this image; prevent infinite loop and memory crash
    }
    processedSrcRef.current = imageSrc;
    runInference(imageRef.current);
  };

  // Preset loader
  const loadPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setErrorMessage(null);
    processedSrcRef.current = null;
    const dataUrl = preset.getDataUrl();
    setImageSrc(dataUrl);
  };

  // Export full-res annotated image
  const handleExport = async () => {
    if (!imageRef.current) return;
    setIsExporting(true);
    try {
      await exportAnnotatedImage(imageRef.current, detections, 'visionscope_detected.png');
    } catch (err: any) {
      console.warn('Export failed:', err);
      setErrorMessage('Failed to export annotated image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Reset workspace
  const handleClear = () => {
    processedSrcRef.current = null;
    setImageSrc(null);
    setImageDimensions({ width: 0, height: 0 });
    setErrorMessage(null);
    onClear();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>

          {imageSrc && (
            <>
              <button
                type="button"
                onClick={() => imageRef.current && runInference(imageRef.current)}
                disabled={isProcessing || !modelReady}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Re-detect</span>
              </button>

              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || detections.length === 0}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 bg-emerald-950/40 border border-emerald-800/40 hover:bg-emerald-900/40 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                title="Download annotated image with bounding boxes at original resolution"
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Export PNG</span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                title="Remove image"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Remove</span>
              </button>
            </>
          )}

          {/* Real-time Engine Status Badge */}
          {pipelineStatus === 'ai_ready' ? (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-600/50 text-xs text-emerald-300 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Exact AI Names {stageMetrics.aiMs ? `(${stageMetrics.aiMs}ms)` : ''}</span>
            </div>
          ) : pipelineStatus === 'enriching' ? (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/50 text-xs text-cyan-300 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
              <span>Instant Active {stageMetrics.localMs ? `(${stageMetrics.localMs}ms)` : ''} · Refining AI...</span>
            </div>
          ) : pipelineStatus === 'instant_ready' || pipelineStatus === 'local_ready' ? (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-xs text-amber-300 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Instant Neural Active {stageMetrics.localMs ? `(${stageMetrics.localMs}ms)` : ''}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Ultra-Fast Vision AI (Exact Names)</span>
              <span className="inline sm:hidden">Exact Names AI</span>
            </div>
          )}
        </div>

        {/* Quick Sample Presets - Smooth horizontal scroll on mobile */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] text-slate-500 shrink-0 hidden md:inline">Quick Test:</span>
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => loadPreset(preset)}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 hover:text-cyan-300 rounded-md border border-slate-700/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {preset.title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-950/50 border border-rose-800/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Notice: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Main Workspace Viewport */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative min-h-[300px] sm:min-h-[420px] lg:min-h-[540px] max-h-[65vh] sm:max-h-[720px] bg-slate-950/90 border rounded-2xl flex items-center justify-center overflow-hidden transition-colors ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/20'
            : 'border-slate-800/90'
        }`}
      >
        {imageSrc ? (
          <div className="relative inline-block max-w-full max-h-[65vh] sm:max-h-[720px] select-none">
            {/* The Image Element */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Object detection source"
              onLoad={handleImageLoad}
              className="max-w-full max-h-[65vh] sm:max-h-[720px] object-contain rounded-lg block"
            />

            {/* Bounding Box SVG Overlay — renders ALL detections */}
            {imageDimensions.width > 0 && imageDimensions.height > 0 && (
              <DetectionOverlay
                detections={detections}
                viewWidth={imageDimensions.width}
                viewHeight={imageDimensions.height}
                highlightedId={highlightedId}
                onSelectDetection={onSelectDetection}
              />
            )}

            {/* Non-blocking AI Refinement pill when instant boxes are already visible */}
            {isProcessing && detections.length > 0 && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-cyan-500/50 rounded-full shadow-lg text-xs font-medium text-cyan-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Refining exact AI labels...</span>
              </div>
            )}

            {/* Initial rapid spinner only if 0 detections exist yet */}
            {isProcessing && detections.length === 0 && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs flex flex-col items-center justify-center rounded-lg z-30">
                <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-900/90 border border-cyan-500/40 rounded-xl shadow-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span className="text-xs font-medium text-slate-200">
                    Instant Neural Scan...
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty / Drag & Drop Dropzone */
          <div className="max-w-md p-4 sm:p-8 text-center space-y-3 sm:space-y-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-100">
                Drag and drop an image or click to browse
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Supports JPG, JPEG, PNG, and WebP (up to 20MB)
              </p>
            </div>

            <div className="pt-1 sm:pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Select Local File
              </button>
            </div>

            <div className="pt-3 sm:pt-4 border-t border-slate-800/70 text-left">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold text-slate-300">Or try a test scene instantly:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => loadPreset(preset)}
                    className="p-2 sm:p-2.5 text-left rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-colors group cursor-pointer"
                  >
                    <div className="font-medium text-xs text-slate-200 group-hover:text-cyan-300">
                      {preset.title}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                      {preset.expectedObjects.join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Specs Footer */}
      {imageSrc && imageDimensions.width > 0 && (
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 px-2 font-mono">
          <span>
            Native Resolution: {imageDimensions.width} × {imageDimensions.height} px
          </span>
          <span>
            Displayed Objects: {detections.length} ({rawDetectionsCount} candidate boxes detected)
          </span>
        </div>
      )}
    </div>
  );
};
