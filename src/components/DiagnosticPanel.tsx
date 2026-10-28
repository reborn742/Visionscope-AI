import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Cpu, Sliders, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { DiagnosticData, BaseModelType } from '../services/detector';

interface DiagnosticPanelProps {
  data: DiagnosticData;
  onSwitchBaseModel: (base: BaseModelType) => void;
  isSwitchingModel: boolean;
}

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  data,
  onSwitchBaseModel,
  isSwitchingModel,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-950 border border-slate-800/90 rounded-xl overflow-hidden text-xs font-mono">
      {/* Header bar / Toggle */}
      <div
        className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between cursor-pointer select-none hover:bg-slate-850 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200">
            Pipeline Diagnostics & Model Telemetry
          </span>
          <span className="text-[10px] bg-cyan-950/60 text-cyan-400 border border-cyan-800/50 px-1.5 py-0.2 rounded">
            {data.baseModel}
          </span>
          {data.rawPredictionsCount > 0 && (
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              · {data.filteredCount} / {data.rawPredictionsCount} visible (≥{Math.round(data.uiThreshold * 100)}%)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-[10px] text-slate-500 hidden md:inline">
            {isExpanded ? 'Click to collapse' : 'Click to inspect raw pipeline'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded telemetry */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-slate-950/80">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-slate-900/60 border border-slate-800/70 p-2.5 rounded-lg space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Model Architecture
              </span>
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">{data.modelName}</span>
                <select
                  value={data.baseModel}
                  disabled={isSwitchingModel}
                  onChange={(e) => onSwitchBaseModel(e.target.value as BaseModelType)}
                  className="bg-slate-800 border border-slate-700 text-[11px] text-cyan-300 rounded px-1.5 py-0.5 focus:outline-hidden"
                >
                  <option value="mobilenet_v2">mobilenet_v2 (Higher Accuracy)</option>
                  <option value="lite_mobilenet_v2">lite_mobilenet_v2 (Faster)</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/70 p-2.5 rounded-lg space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                TF Backend & Time
              </span>
              <div className="text-white font-semibold">
                {data.backend} {data.inferenceTimeMs !== null ? `· ${data.inferenceTimeMs}ms` : ''}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/70 p-2.5 rounded-lg space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Inference Image Dims
              </span>
              <div className="text-white font-semibold">
                {data.imageDimensions
                  ? `${data.imageDimensions.width} × ${data.imageDimensions.height} px`
                  : 'No active image'}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/70 p-2.5 rounded-lg space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Threshold & Filter
              </span>
              <div className="text-white font-semibold">
                ≥{(data.uiThreshold * 100).toFixed(0)}% · {data.filteredCount} kept of {data.rawPredictionsCount}
              </div>
            </div>
          </div>

          {/* Raw Model Predictions Table */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-slate-300">
                Complete Raw Model Detections (Before UI Filter):
              </span>
              <span className="text-[11px] text-slate-500">
                Total: {data.rawPredictions.length} raw box proposals
              </span>
            </div>

            {data.rawPredictions.length === 0 ? (
              <div className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-lg text-slate-500 text-center">
                No raw detections yet. Run inference on an image or webcam.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto overflow-x-auto border border-slate-800/70 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                      <th className="py-1.5 px-3">#</th>
                      <th className="py-1.5 px-3">Class</th>
                      <th className="py-1.5 px-3">Raw Score</th>
                      <th className="py-1.5 px-3">Bounding Box [x, y, w, h]</th>
                      <th className="py-1.5 px-3">Filter Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {data.rawPredictions.map((pred, i) => {
                      const passes = pred.score >= data.uiThreshold;
                      return (
                        <tr
                          key={i}
                          className={`hover:bg-slate-900/50 ${
                            passes ? 'text-slate-200' : 'text-slate-500 line-through'
                          }`}
                        >
                          <td className="py-1 px-3 text-slate-500">{i + 1}</td>
                          <td className="py-1 px-3 font-semibold capitalize text-cyan-300">
                            {pred.class}
                          </td>
                          <td className="py-1 px-3 tabular-nums">
                            {(pred.score * 100).toFixed(2)}% ({pred.score.toFixed(4)})
                          </td>
                          <td className="py-1 px-3 text-slate-400 font-mono text-[11px]">
                            [{pred.bbox.join(', ')}]
                          </td>
                          <td className="py-1 px-3">
                            {passes ? (
                              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3 h-3" /> Displayed
                              </span>
                            ) : (
                              <span className="text-amber-500/80 text-[11px]">
                                Below {Math.round(data.uiThreshold * 100)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Error Message */}
          {data.error && (
            <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{data.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
