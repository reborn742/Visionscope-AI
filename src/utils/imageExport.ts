import type { Detection } from '../types/detection';
import { getClassColor } from '../types/detection';

export async function exportAnnotatedImage(
  sourceImage: HTMLImageElement,
  detections: Detection[],
  filename = 'visionscope_detected.png'
): Promise<void> {
  const canvas = document.createElement('canvas');
  const naturalWidth = sourceImage.naturalWidth || sourceImage.width;
  const naturalHeight = sourceImage.naturalHeight || sourceImage.height;

  canvas.width = naturalWidth;
  canvas.height = naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not acquire 2D canvas context');
  }

  // 1. Draw source image at original native resolution
  ctx.drawImage(sourceImage, 0, 0, naturalWidth, naturalHeight);

  // 2. Draw bounding boxes and labels
  const scale = Math.max(1, naturalWidth / 1000);
  const lineWidth = Math.max(2, Math.round(3 * scale));
  const fontSize = Math.max(14, Math.round(15 * scale));
  ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;

  for (const det of detections) {
    const [x, y, w, h] = det.bbox;
    const color = getClassColor(det.class);

    // Box outline
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, w, h);

    // Box subtle tint fill
    ctx.fillStyle = color.bg;
    ctx.fillRect(x, y, w, h);

    // Label text & pill
    const label = `${det.class} ${(det.score * 100).toFixed(0)}%`;
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const paddingX = 8 * scale;
    const tagHeight = fontSize + 8 * scale;
    const tagY = Math.max(0, y - tagHeight);

    // Label background
    ctx.fillStyle = color.solid;
    ctx.fillRect(x, tagY, textWidth + paddingX * 2, tagHeight);

    // Label text
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + paddingX, tagY + tagHeight / 2);
  }

  // 3. Subtle watermark banner at bottom-right
  const watermarkText = 'VisionScope AI • TensorFlow.js COCO-SSD';
  ctx.font = `500 ${Math.max(11, Math.round(12 * scale))}px "JetBrains Mono", monospace`;
  const wmMetrics = ctx.measureText(watermarkText);
  const wmWidth = wmMetrics.width + 16 * scale;
  const wmHeight = 22 * scale;
  const wmX = naturalWidth - wmWidth - 12 * scale;
  const wmY = naturalHeight - wmHeight - 12 * scale;

  ctx.fillStyle = 'rgba(11, 15, 23, 0.75)';
  ctx.fillRect(wmX, wmY, wmWidth, wmHeight);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.textBaseline = 'middle';
  ctx.fillText(watermarkText, wmX + 8 * scale, wmY + wmHeight / 2);

  // 4. Download file
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas serialization failed'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      resolve();
    }, 'image/png');
  });
}
