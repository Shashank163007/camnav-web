import { Detection } from '../hooks/useYolo';

export const DANGER_LABELS = ['person', 'car', 'bus', 'truck'];
export const CONFIDENCE_THRESHOLD = 0.50;
export const AREA_THRESHOLD = 0.35;
export const DANGER_ZONE_START = 0.5;

export function scaleBoundingBox(
  detection: Detection,
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number
): Detection['bbox'] {
  const scaleX = canvasWidth / videoWidth;
  const scaleY = canvasHeight / videoHeight;

  return {
    x: detection.bbox.x * canvasWidth,
    y: detection.bbox.y * canvasHeight,
    width: detection.bbox.width * canvasWidth,
    height: detection.bbox.height * canvasHeight,
  };
}

export function isInDangerZone(
  bbox: ReturnType<typeof scaleBoundingBox>,
  canvasHeight: number
): boolean {
  const boxCenterY = bbox.y + bbox.height / 2;
  const dangerZoneStart = canvasHeight * DANGER_ZONE_START;
  return boxCenterY >= dangerZoneStart;
}

export function isHighRiskDetection(
  detection: Detection,
  scaledBbox: ReturnType<typeof scaleBoundingBox>,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  const isDangerLabel = DANGER_LABELS.includes(detection.label.toLowerCase());
  const isHighConfidence = detection.confidence > CONFIDENCE_THRESHOLD;

  const boxArea = scaledBbox.width * scaledBbox.height;
  const canvasArea = canvasWidth * canvasHeight;
  const areaRatio = boxArea / canvasArea;

  const isLargeObject = areaRatio > (AREA_THRESHOLD * AREA_THRESHOLD);

  return isDangerLabel && isHighConfidence && isLargeObject;
}

export function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  bbox: ReturnType<typeof scaleBoundingBox>,
  detection: Detection,
  isDanger: boolean
): void {
  ctx.strokeStyle = isDanger ? '#ef4444' : '#22c55e';
  ctx.lineWidth = isDanger ? 6 : 3;
  ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

  ctx.fillStyle = isDanger ? '#ef4444' : '#22c55e';
  const text = `${detection.label} ${(detection.confidence * 100).toFixed(0)}%`;
  const fontSize = Math.max(12, Math.min(20, bbox.width / 8));
  ctx.font = `bold ${fontSize}px sans-serif`;

  const textMetrics = ctx.measureText(text);
  const textHeight = fontSize * 1.4;

  ctx.fillRect(bbox.x, bbox.y - textHeight - 4, textMetrics.width + 8, textHeight + 8);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, bbox.x + 4, bbox.y - 2);
}

export function triggerAudioAlert(message: string): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.2;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export function triggerVibration(): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(200);
  }
}

export function triggerScreenFlash(
  canvas: HTMLCanvasElement,
  duration: number = 150
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  setTimeout(() => {
    ctx.restore();
  }, duration);
}
