import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { ImageWorkspace } from './components/ImageWorkspace';
import { ConfidenceSlider } from './components/ConfidenceSlider';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { TaxonomyModal } from './components/TaxonomyModal';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { detector } from './services/detector';
import type { BaseModelType, DiagnosticData } from './services/detector';
import type { Detection, ModelStatus, PerformanceMetrics } from './types/detection';

export default function App() {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('initializing');
  const [modelError, setModelError] = useState<string | null>(null);

  // Default 20% threshold to recognize objects confidently (e.g. person, dog, and cat)
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.20);

  // Active detections & performance metrics
  const [rawDetections, setRawDetections] = useState<Detection[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    inferenceTimeMs: null,
    fps: null,
    lastTimestamp: null,
  });

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isTaxonomyOpen, setIsTaxonomyOpen] = useState(false);
  const [isSwitchingModel, setIsSwitchingModel] = useState(false);

  // Transparent diagnostics telemetry
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData>(detector.getDiagnosticData());

  // Load the model once on application mount
  const initModel = useCallback(async () => {
    try {
      setModelStatus('loading');
      setModelError(null);
      await detector.initialize();
      setModelStatus('ready');
      setDiagnosticData(detector.getDiagnosticData());
    } catch (err: any) {
      console.error('Failed to load COCO-SSD model:', err);
      setModelStatus('error');
      setModelError(
        err?.message || 'Failed to download or initialize TensorFlow.js COCO-SSD model weights.'
      );
      setDiagnosticData(detector.getDiagnosticData());
    }
  }, []);

  useEffect(() => {
    initModel();
  }, [initModel]);

  // Handle switching base architecture between mobilenet_v2 and lite_mobilenet_v2
  const handleSwitchBaseModel = async (base: BaseModelType) => {
    setIsSwitchingModel(true);
    setModelStatus('loading');
    try {
      await detector.setBaseModel(base);
      setModelStatus('ready');
      setDiagnosticData(detector.getDiagnosticData());
    } catch (err: any) {
      setModelStatus('error');
      setModelError(err?.message || 'Failed to switch base model architecture');
    } finally {
      setIsSwitchingModel(false);
    }
  };

  // Derived filtered detections: Single source of truth guaranteeing multi-object rendering
  const filteredDetections = useMemo(() => {
    return rawDetections.filter((d) => d.score >= confidenceThreshold);
  }, [rawDetections, confidenceThreshold]);

  // Handler for inference results
  const handleImageInference = useCallback(
    (raw: Detection[], inferenceTimeMs: number) => {
      setRawDetections(raw);
      setPerformanceMetrics({
        inferenceTimeMs,
        fps: null,
        lastTimestamp: Date.now(),
      });
      setDiagnosticData(detector.getDiagnosticData());
    },
    []
  );

  const handleClear = useCallback(() => {
    setRawDetections([]);
    setPerformanceMetrics({
      inferenceTimeMs: null,
      fps: null,
      lastTimestamp: null,
    });
    setHighlightedId(null);
    setDiagnosticData(detector.getDiagnosticData());
  }, []);

  const handleThresholdChange = (newVal: number) => {
    setConfidenceThreshold(newVal);
    setDiagnosticData((prev) => ({
      ...prev,
      uiThreshold: newVal,
      filteredCount: rawDetections.filter((d) => d.score >= newVal).length,
    }));
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        modelStatus={modelStatus}
        modelError={modelError}
        onRetryModel={initModel}
        onOpenTaxonomy={() => setIsTaxonomyOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6">
        {/* Workspace and Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* Left: Dominant Workspace Area (7 cols on lg, 8 cols on xl) */}
          <section className="lg:col-span-7 xl:col-span-8 space-y-4">
            <ImageWorkspace
              modelReady={modelStatus === 'ready'}
              confidenceThreshold={confidenceThreshold}
              detections={filteredDetections}
              rawDetectionsCount={rawDetections.length}
              onInferenceComplete={handleImageInference}
              onClear={handleClear}
              highlightedId={highlightedId}
              onSelectDetection={setHighlightedId}
            />
          </section>

          {/* Right: Confidence Threshold & Detection Analytics (5 cols on lg, 4 cols on xl) */}
          <aside className="lg:col-span-5 xl:col-span-4 space-y-4">
            {/* Confidence Slider Control */}
            <ConfidenceSlider
              threshold={confidenceThreshold}
              onChange={handleThresholdChange}
              filteredCount={filteredDetections.length}
              totalRawCount={rawDetections.length}
            />

            {/* Comprehensive Analytics & Manifest */}
            <AnalyticsPanel
              detections={filteredDetections}
              rawDetectionsCount={rawDetections.length}
              metrics={performanceMetrics}
              isLive={false}
              highlightedId={highlightedId}
              onSelectDetection={setHighlightedId}
            />
          </aside>
        </div>

        {/* RULE 6: Developer Diagnostic Telemetry Panel */}
        <section className="pt-2">
          <DiagnosticPanel
            data={diagnosticData}
            onSwitchBaseModel={handleSwitchBaseModel}
            isSwitchingModel={isSwitchingModel}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d15] py-4 px-3 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
            <span className="font-semibold text-slate-400">VisionScope AI</span>
            <span>·</span>
            <span>Precision Vision AI & Object Detection</span>
            <span>·</span>
            <span className="hidden sm:inline">Exact Open-Vocabulary Labels</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsTaxonomyOpen(true)}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              80 Class Taxonomy & Limitations
            </button>
            <span>·</span>
            <span>Local detection + server-side Vision AI (images are sent to the server for AI refinement)</span>
          </div>
        </div>
      </footer>

      {/* 80 Classes Taxonomy & Limitations Modal */}
      <TaxonomyModal
        isOpen={isTaxonomyOpen}
        onClose={() => setIsTaxonomyOpen(false)}
      />
    </div>
  );
}
