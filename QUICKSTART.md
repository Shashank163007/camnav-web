# CamNav - Quick Start Guide

## Setup Complete ✓

Files created:
- `hooks/useYolo.ts` - YOLO inference hook with WebGPU/WASM fallback
- `utils/yoloHelpers.ts` - Bounding box, NMS, and alert utilities
- `app/page.tsx` - Full-screen collision avoidance UI

## Required Step: Download YOLO Model

**You must download the model file before running:**

```powershell
# Run this in your terminal from C:\camnav-web
Invoke-WebRequest -Uri "https://github.com/ultralytics/assets/releases/download/v0.8.0/yolov8n.onnx" -OutFile "./public/yolov8n.onnx"
```

Or manually download from: https://github.com/ultralytics/assets/releases/tag/v0.8.0

## Run the App

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Features Implemented

✓ YOLOv8n ONNX model with WebGPU acceleration (WASM fallback)
✓ Real-time object detection on webcam feed
✓ NMS with IoU threshold 0.45
✓ Danger zone detection (bottom 50% of screen)
✓ Audio alerts: "STOP! OBSTACLE DETECTED"
✓ Vibration feedback (200ms)
✓ Red border flash on danger
✓ FPS counter for performance monitoring
✓ Targets: person, car, bus, truck
✓ Confidence threshold: 50%
✓ Area threshold: >35% screen width

## How It Works

1. **Model Loading**: Loads `yolov8n.onnx` from `/public` folder
2. **Inference Loop**: Runs detection on every frame using `requestAnimationFrame`
3. **Preprocessing**: Resizes to 640x640, normalizes to [0,1], creates Float32 tensor
4. **Post-processing**: Decodes 84x8400 output, applies sigmoid, NMS filtering
5. **Safety Logic**: Triggers alerts when large objects detected in danger zone

## Performance Tips

- Use Chrome/Edge for WebGPU support
- Close other tabs for better FPS
- Ensure good lighting for better detection
- Use external webcam for better quality
