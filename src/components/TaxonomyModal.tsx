import React, { useState } from 'react';
import { X, Search, Info, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import { COCO_CLASSES } from '../types/detection';

interface TaxonomyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Group COCO classes logically for clear recruiter & developer scannability
const CATEGORY_GROUPS = [
  {
    name: 'People & Accessories',
    items: ['person', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase'],
  },
  {
    name: 'Vehicles & Transport',
    items: ['bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter'],
  },
  {
    name: 'Animals & Pets',
    items: ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'],
  },
  {
    name: 'Indoor & Furniture',
    items: ['chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'sink', 'refrigerator'],
  },
  {
    name: 'Electronics & Tools',
    items: ['laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'book', 'clock', 'vase', 'scissors', 'hair drier', 'toothbrush'],
  },
  {
    name: 'Food & Kitchenware',
    items: ['bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake'],
  },
  {
    name: 'Outdoor & Sports',
    items: ['bench', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'teddy bear'],
  },
];

export const TaxonomyModal: React.FC<TaxonomyModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredGroups = CATEGORY_GROUPS.map((group) => ({
    name: group.name,
    items: group.items.filter((item) =>
      item.toLowerCase().includes(searchQuery.toLowerCase().trim())
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Model Taxonomy & Architecture</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
              Exact Vision AI & 80 COCO Pretrained Classes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 text-xs text-slate-300">
          {/* Dual Engine Architecture Callout */}
          <div className="bg-cyan-950/40 border border-cyan-800/50 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-cyan-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>VisionScope Dual-Engine Detection Architecture</span>
            </div>
            <p className="text-slate-200 leading-relaxed">
              <strong>1. Precision Vision AI (Default):</strong> High-precision multimodal AI that recognizes open-vocabulary objects with their exact names — including <strong>electric trimmers, smartwatches, mobile phones, specific fruit varieties (mango, apple, banana, watermelon, grapes), bird species (scarlet macaw, toucan, bald eagle, kingfisher), and animal breeds/species</strong>.
            </p>
            <p className="text-slate-400 leading-relaxed">
              <strong>2. Local COCO-SSD Engine:</strong> Fast, offline client-side TensorFlow.js model running MobileNet v2 across the 80 standard COCO classes indexed below.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter supported classes (e.g., person, laptop, dog, car)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
            />
          </div>

          {/* Grouped Classes Grid */}
          <div className="space-y-4">
            {filteredGroups.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                No classes match &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.name} className="space-y-2">
                  <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {group.name} ({group.items.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((cls) => (
                      <span
                        key={cls}
                        className="font-mono text-[11px] bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-md text-slate-200 capitalize"
                      >
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Architecture note */}
          <div className="border-t border-slate-800 pt-4 space-y-2 text-slate-400">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Technical Architecture</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
              <li><strong className="text-slate-300">Model Backbone:</strong> MobileNet v2 with Single Shot MultiBox Detector (SSD)</li>
              <li><strong className="text-slate-300">Execution Backend:</strong> TensorFlow.js WebGL GPU acceleration with automatic CPU fallback</li>
              <li><strong className="text-slate-300">Privacy & Cost:</strong> 100% zero-backend execution — frames never leave local RAM</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Total vocabulary: 80 COCO classes
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
