import React, { useMemo } from 'react';
import { Activity, Layers, Hash, Zap, Box, Eye, Check } from 'lucide-react';
import type { Detection, PerformanceMetrics } from '../types/detection';
import { getClassColor } from '../types/detection';

interface AnalyticsPanelProps {
  detections: Detection[];
  rawDetectionsCount: number;
  metrics: PerformanceMetrics;
  isLive?: boolean;
  highlightedId: string | null;
  onSelectDetection: (id: string | null) => void;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  detections,
  rawDetectionsCount,
  metrics,
  highlightedId,
  onSelectDetection,
}) => {
  // Category breakdown calculations
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of detections) {
      map.set(d.class, (map.get(d.class) || 0) + 1);
    }

    const total = detections.length;
    return Array.from(map.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: getClassColor(category),
      }))
      .sort((a, b) => b.count - a.count);
  }, [detections]);

  const distinctCategoriesCount = categoryStats.length;

  return (
    <div className="space-y-4">
      {/* 1. Summary Metrics Grid - 2 cols on mobile, 4 on tablet, 2 on lg desktop, 4 on xl */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-2.5">
        {/* Total Detected Objects */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Objects</span>
            <Box className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-white tabular-nums">
              {detections.length}
            </span>
            {rawDetectionsCount > detections.length && (
              <span className="text-[11px] font-mono text-slate-500">
                ({rawDetectionsCount} raw)
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Passing threshold</span>
        </div>

        {/* Distinct Categories */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Categories</span>
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-white tabular-nums">
              {distinctCategoriesCount}
            </span>
            <span className="text-[11px] font-mono text-slate-500">classes</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Distinct recognized</span>
        </div>

        {/* Inference Latency */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Inference</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            {metrics.inferenceTimeMs !== null ? (
              <>
                <span className="text-xl font-bold font-mono text-cyan-400 tabular-nums">
                  {metrics.inferenceTimeMs}
                </span>
                <span className="text-[11px] font-mono text-slate-400">ms</span>
              </>
            ) : (
              <span className="text-xl font-bold font-mono text-slate-600">—</span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Fast Speculative Execution</span>
        </div>

        {/* Engine Pipeline */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Pipeline</span>
            <Activity className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-emerald-400">
              Vision AI
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">
            High-Precision Neural
          </span>
        </div>
      </div>

      {/* 2. Category Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Category Distribution</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            {categoryStats.length} {categoryStats.length === 1 ? 'class' : 'classes'}
          </span>
        </div>

        {categoryStats.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No categories detected yet. Select a sample or upload an image.
          </div>
        ) : (
          <div className="space-y-2">
            {categoryStats.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: item.color.stroke }}
                    />
                    <span className="font-medium text-slate-200 capitalize">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    <span className="text-white font-semibold tabular-nums">{item.count}</span>
                    <span className="text-slate-600">·</span>
                    <span className="tabular-nums">{item.percentage}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color.stroke,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Detailed Detection List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <Hash className="w-3.5 h-3.5 text-cyan-400" />
            <span>Detection Manifest</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            Click to focus in viewport
          </span>
        </div>

        {detections.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No detections meeting the current threshold.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 select-none">
            {detections.map((det) => {
              const color = getClassColor(det.class);
              const isSelected = highlightedId === det.id;
              const [x, y, w, h] = det.bbox;

              return (
                <div
                  key={det.id}
                  onClick={() => onSelectDetection(isSelected ? null : det.id)}
                  onMouseEnter={() => onSelectDetection(det.id)}
                  onMouseLeave={() => onSelectDetection(null)}
                  className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500/60 shadow-xs'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color.stroke }}
                    />
                    <span className="font-medium text-slate-200 capitalize truncate">
                      {det.class}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                      [{x}, {y}, {w}×{h}]
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-cyan-400 font-semibold tabular-nums">
                      {(det.score * 100).toFixed(1)}%
                    </span>
                    {isSelected && (
                      <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
