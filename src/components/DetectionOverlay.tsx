import React from 'react';
import type { Detection } from '../types/detection';
import { getClassColor } from '../types/detection';

interface DetectionOverlayProps {
  detections: Detection[];
  viewWidth: number;
  viewHeight: number;
  highlightedId: string | null;
  onSelectDetection?: (id: string | null) => void;
  showLabels?: boolean;
}

interface PlacedLabel {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detections,
  viewWidth,
  viewHeight,
  highlightedId,
  onSelectDetection,
  showLabels = true,
}) => {
  if (viewWidth <= 0 || viewHeight <= 0) {
    return null;
  }

  // Calculate dynamic stroke scale relative to resolution
  const strokeScale = Math.max(1, viewWidth / 800);
  const baseStroke = 2 * strokeScale;
  const activeStroke = 3.5 * strokeScale;
  const fontSize = Math.max(12, Math.round(13 * strokeScale));
  const tagHeight = fontSize + 8 * strokeScale;

  // Track label positions to prevent overlapping label tags
  const placedLabels: PlacedLabel[] = [];

  const checkLabelOverlap = (x: number, y: number, w: number, h: number): boolean => {
    return placedLabels.some((placed) => {
      return (
        x < placed.x + placed.w &&
        x + w > placed.x &&
        y < placed.y + placed.h &&
        y + h > placed.y
      );
    });
  };

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      preserveAspectRatio="none"
      aria-label="Object detection bounding boxes overlay"
    >
      <defs>
        <filter id="box-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.4" />
        </filter>
      </defs>

      {detections.map((item) => {
        const [rawX, rawY, rawW, rawH] = item.bbox;
        const x = Math.max(0, Math.min(viewWidth - 4, rawX));
        const y = Math.max(0, Math.min(viewHeight - 4, rawY));
        const w = Math.max(4, Math.min(viewWidth - x, rawW));
        const h = Math.max(4, Math.min(viewHeight - y, rawH));

        const color = getClassColor(item.class);
        const isHighlighted = highlightedId === item.id;
        const labelText = `${item.class} ${(item.score * 100).toFixed(0)}%`;
        const approxTextWidth = Math.max(72, labelText.length * (fontSize * 0.68) + 18 * strokeScale);

        // Smart non-overlapping label placement
        let tagX = x;
        let tagY = y > tagHeight ? y - tagHeight : y;

        // If top position overlaps an existing label, try placing at bottom of box
        if (checkLabelOverlap(tagX, tagY, approxTextWidth, tagHeight)) {
          if (y + h + tagHeight <= viewHeight) {
            tagY = y + h;
          } else {
            // Shift right or inside
            tagX = Math.min(viewWidth - approxTextWidth, x + 8 * strokeScale);
            tagY = Math.min(viewHeight - tagHeight, y + 4 * strokeScale);
          }
        }

        placedLabels.push({ x: tagX, y: tagY, w: approxTextWidth, h: tagHeight });

        return (
          <g
            key={item.id}
            className="pointer-events-auto cursor-pointer transition-opacity duration-150"
            onMouseEnter={() => onSelectDetection?.(item.id)}
            onMouseLeave={() => onSelectDetection?.(null)}
            onClick={() => onSelectDetection?.(item.id)}
            style={{ opacity: highlightedId && !isHighlighted ? 0.35 : 1 }}
          >
            {/* Box Fill */}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={isHighlighted ? color.bg.replace('0.18', '0.32') : color.bg}
              rx={2 * strokeScale}
              ry={2 * strokeScale}
            />

            {/* Box Border */}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="none"
              stroke={color.stroke}
              strokeWidth={isHighlighted ? activeStroke : baseStroke}
              strokeLinejoin="round"
              rx={2 * strokeScale}
              ry={2 * strokeScale}
              filter={isHighlighted ? 'url(#box-glow)' : undefined}
            />

            {/* Corner Brackets for technical precision aesthetic */}
            {isHighlighted && (
              <>
                {/* Top-Left */}
                <path
                  d={`M ${x} ${y + 12 * strokeScale} L ${x} ${y} L ${x + 12 * strokeScale} ${y}`}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={activeStroke}
                />
                {/* Bottom-Right */}
                <path
                  d={`M ${x + w} ${y + h - 12 * strokeScale} L ${x + w} ${y + h} L ${x + w - 12 * strokeScale} ${y + h}`}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={activeStroke}
                />
              </>
            )}

            {/* Label Banner */}
            {showLabels && (
              <g>
                <rect
                  x={tagX}
                  y={tagY}
                  width={approxTextWidth}
                  height={tagHeight}
                  fill={isHighlighted ? color.solid : color.stroke}
                  rx={3 * strokeScale}
                  ry={3 * strokeScale}
                />
                <text
                  x={tagX + 6 * strokeScale}
                  y={tagY + tagHeight / 2 + 1}
                  fill="#ffffff"
                  fontSize={fontSize}
                  fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
                  fontWeight="600"
                  dominantBaseline="middle"
                >
                  {labelText}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
