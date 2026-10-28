import React from 'react';
import { Image as ImageIcon, HelpCircle, RefreshCw, Cpu, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import type { ModelStatus } from '../types/detection';

interface HeaderProps {
  modelStatus: ModelStatus;
  modelError: string | null;
  onRetryModel: () => void;
  onOpenTaxonomy: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  modelStatus,
  modelError,
  onRetryModel,
  onOpenTaxonomy,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#0b0f17]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
                VisionScope AI
              </span>
              <span className="hidden sm:inline-block text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-cyan-400/90 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                Vision AI
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400">
              High-Precision Computer Vision & Image Object Detection
            </p>
          </div>
        </div>

        {/* Studio Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs font-medium shrink-0">
          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Precision Studio</span>
          <span className="inline sm:hidden">Studio</span>
        </div>

        {/* Model Status & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Status Badge */}
          <div className="flex items-center text-xs">
            {modelStatus === 'ready' && (
              <div
                className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-2 sm:px-2.5 py-1 rounded-md"
                title="Model Ready"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-mono text-[11px] hidden sm:inline">Model Ready</span>
              </div>
            )}
            {modelStatus === 'loading' && (
              <div
                className="flex items-center gap-1.5 text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 px-2 sm:px-2.5 py-1 rounded-md"
                title="Loading Weights..."
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                <span className="font-mono text-[11px] hidden sm:inline">Loading...</span>
              </div>
            )}
            {modelStatus === 'initializing' && (
              <div
                className="flex items-center gap-1.5 text-amber-400 bg-amber-950/30 border border-amber-800/40 px-2 sm:px-2.5 py-1 rounded-md"
                title="Initializing..."
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                <span className="font-mono text-[11px] hidden sm:inline">Initializing...</span>
              </div>
            )}
            {modelStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-rose-400 bg-rose-950/30 border border-rose-800/40 px-2 sm:px-2.5 py-1 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="font-mono text-[11px] hidden sm:inline">Error</span>
                <button
                  type="button"
                  onClick={onRetryModel}
                  className="hover:underline flex items-center gap-1 text-[11px] text-rose-300 ml-0.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}
          </div>

          {/* Model Taxonomy & Docs Button */}
          <button
            type="button"
            onClick={onOpenTaxonomy}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md border border-slate-800 hover:border-slate-700 bg-slate-900/60 transition-colors whitespace-nowrap cursor-pointer"
            title="Supported Object Classes & Capabilities"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Taxonomy</span>
          </button>
        </div>
      </div>
      {modelError && (
        <div className="bg-rose-950/40 border-t border-rose-800/40 px-3 sm:px-4 py-2 text-xs text-rose-300 flex items-center justify-between">
          <span className="truncate">{modelError}</span>
          <button
            type="button"
            onClick={onRetryModel}
            className="underline hover:text-white ml-2 shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}
    </header>
  );
};
