import React from 'react';
import { Sliders, Filter } from 'lucide-react';

interface ConfidenceSliderProps {
  threshold: number; // 0.10 to 0.90
  onChange: (val: number) => void;
  filteredCount: number;
  totalRawCount: number;
}

export const ConfidenceSlider: React.FC<ConfidenceSliderProps> = ({
  threshold,
  onChange,
  filteredCount,
  totalRawCount,
}) => {
  const percentage = Math.round(threshold * 100);

  const presets = [
    { label: 'Min (10%)', val: 0.10 },
    { label: 'All (20%)', val: 0.20 },
    { label: 'Standard (35%)', val: 0.35 },
    { label: 'Strict (60%)', val: 0.60 },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor="confidence-range"
          className="flex items-center gap-2 text-xs font-semibold text-slate-200"
        >
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Confidence Threshold</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-cyan-400 tabular-nums">
            {percentage}%
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            ({threshold.toFixed(2)})
          </span>
        </div>
      </div>

      {/* Range input */}
      <div className="relative flex items-center">
        <input
          id="confidence-range"
          type="range"
          min="10"
          max="90"
          step="1"
          value={percentage}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/50"
          aria-label="Confidence threshold percentage"
        />
      </div>

      {/* Preset pills & stats - Responsive for mobile, tablet, and PC */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 pt-1.5 border-t border-slate-800/60">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-0.5">Presets:</span>
          {presets.map((p) => {
            const isActive = Math.round(p.val * 100) === percentage;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange(p.val)}
                className={`text-[11px] px-2 py-0.5 rounded transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 self-end sm:self-auto shrink-0">
          <Filter className="w-3 h-3 text-slate-500" />
          <span className="text-white font-semibold tabular-nums">{filteredCount}</span>
          <span className="text-slate-500">/</span>
          <span className="tabular-nums">{totalRawCount}</span>
          <span className="text-slate-500">passed</span>
        </div>
      </div>
    </div>
  );
};
