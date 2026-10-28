export interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  id: string;
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export type ModelStatus = 'initializing' | 'loading' | 'ready' | 'error';

export interface PerformanceMetrics {
  inferenceTimeMs: number | null;
  fps: number | null;
  lastTimestamp: number | null;
}

export interface CategorySummary {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

// 80 classes recognized by the COCO-SSD model
export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
] as const;

// Curated distinctive color palette for bounding boxes by class hash
const PALETTE = [
  { stroke: '#06b6d4', bg: 'rgba(6, 182, 212, 0.18)', text: '#22d3ee', solid: '#0891b2' }, // Cyan
  { stroke: '#10b981', bg: 'rgba(16, 185, 129, 0.18)', text: '#34d399', solid: '#059669' }, // Emerald
  { stroke: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)', text: '#fbbf24', solid: '#d97706' }, // Amber
  { stroke: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.18)', text: '#a78bfa', solid: '#7c3aed' }, // Violet
  { stroke: '#ec4899', bg: 'rgba(236, 72, 153, 0.18)', text: '#f472b6', solid: '#db2777' }, // Pink
  { stroke: '#3b82f6', bg: 'rgba(59, 130, 246, 0.18)', text: '#60a5fa', solid: '#2563eb' }, // Blue
  { stroke: '#14b8a6', bg: 'rgba(20, 184, 166, 0.18)', text: '#2dd4bf', solid: '#0d9488' }, // Teal
  { stroke: '#f97316', bg: 'rgba(249, 115, 22, 0.18)', text: '#fb923c', solid: '#ea580c' }, // Orange
];

export function getClassColor(className: string) {
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = (hash << 5) - hash + className.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
