import { useRef, useCallback } from 'react';
import * as ort from 'onnxruntime-web';

export interface Detection {
  bbox: { x: number; y: number; width: number; height: number };
  classId: number;
  confidence: number;
  label: string;
}

const INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.5;
const IOU_THRESHOLD = 0.45;

const LABELS = [
  'person', 'bicycle', 'car', 'motorcycle', 'bus', 'truck',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter',
  'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant',
  'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag',
  'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife',
  'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli',
  'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven',
  'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors',
  'teddy bear', 'hair drier', 'toothbrush'
];

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function calculateIoU(box1: Detection['bbox'], box2: Detection['bbox']): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = box1.width * box1.height + box2.width * box2.height - intersection;

  return union === 0 ? 0 : intersection / union;
}

function nms(detections: Detection[]): Detection[] {
  if (detections.length === 0) return [];

  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const result: Detection[] = [];

  while (sorted.length > 0) {
    const current = sorted.shift()!;
    result.push(current);

    for (let i = sorted.length - 1; i >= 0; i--) {
      if (calculateIoU(current.bbox, sorted[i].bbox) > IOU_THRESHOLD) {
        sorted.splice(i, 1);
      }
    }
  }

  return result;
}

export function useYolo() {
  const sessionRef = useRef<ort.InferenceSession | null>(null);
  const isInitializedRef = useRef(false);

  const initialize = useCallback(async (modelPath: string): Promise<void> => {
    if (isInitializedRef.current) return;

    try {
      const backends = ort.env.wasm.wasmPaths;
      
      sessionRef.current = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['webgpu', 'wasm'],
      });

      isInitializedRef.current = true;
    } catch (error) {
      console.error('Failed to initialize YOLO session:', error);
      throw error;
    }
  }, []);

  const runInference = useCallback(async (
    image: HTMLImageElement | HTMLVideoElement
  ): Promise<Detection[]> => {
    if (!sessionRef.current) {
      throw new Error('Session not initialized');
    }

    const canvas = document.createElement('canvas');
    canvas.width = INPUT_SIZE;
    canvas.height = INPUT_SIZE;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.drawImage(image, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
    const pixels = imageData.data;

    const channels = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
    const numPixels = INPUT_SIZE * INPUT_SIZE;

    for (let i = 0; i < numPixels; i++) {
      const offset = i * 4;
      channels[i] = pixels[offset] / 255.0;
      channels[numPixels + i] = pixels[offset + 1] / 255.0;
      channels[2 * numPixels + i] = pixels[offset + 2] / 255.0;
    }

    const inputTensor = new ort.Tensor('float32', channels, [1, 3, INPUT_SIZE, INPUT_SIZE]);

    const feeds: Record<string, ort.Tensor> = {};
    feeds[sessionRef.current.inputNames[0]] = inputTensor;

    const results = await sessionRef.current.run(feeds);
    const outputTensor = results[sessionRef.current.outputNames[0]];
    const outputData = outputTensor.data as Float32Array;

    const [batch, channels_out, anchors] = outputTensor.dims;
    const detections: Detection[] = [];

    for (let i = 0; i < anchors; i++) {
      const baseIdx = i;

      const x_center = outputData[baseIdx];
      const y_center = outputData[baseIdx + anchors];
      const width = outputData[baseIdx + 2 * anchors];
      const height = outputData[baseIdx + 3 * anchors];

      let maxScore = 0;
      let maxClass = 0;

      for (let c = 0; c < 80; c++) {
        const score = sigmoid(outputData[baseIdx + (4 + c) * anchors]);
        if (score > maxScore) {
          maxScore = score;
          maxClass = c;
        }
      }

      if (maxScore > CONFIDENCE_THRESHOLD) {
        const x = (x_center - width / 2) / INPUT_SIZE;
        const y = (y_center - height / 2) / INPUT_SIZE;
        const w = width / INPUT_SIZE;
        const h = height / INPUT_SIZE;

        detections.push({
          bbox: { x, y, width: w, height: h },
          classId: maxClass,
          confidence: maxScore,
          label: LABELS[maxClass] || 'unknown',
        });
      }
    }

    return nms(detections);
  }, []);

  const isInitialized = useCallback((): boolean => {
    return isInitializedRef.current;
  }, []);

  return { initialize, runInference, isInitialized };
}
