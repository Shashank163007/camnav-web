# Download YOLO Model Required

You need to download the `yolov8n.onnx` model file to the `/public` folder.

## Option 1: Direct Download (Recommended)

Download from Ultralytics releases:
```bash
# Windows PowerShell
Invoke-WebRequest -Uri "https://github.com/ultralytics/assets/releases/download/v0.8.0/yolov8n.onnx" -OutFile "./public/yolov8n.onnx"

# Or using curl (Linux/Mac)
curl -L "https://github.com/ultralytics/assets/releases/download/v0.8.0/yolov8n.onnx" -o "./public/yolov8n.onnx"
```

## Option 2: Manual Download

1. Go to: https://github.com/ultralytics/assets/releases/tag/v0.8.0
2. Download `yolov8n.onnx`
3. Place it in the `C:\camnav-web\public\` folder

## Option 3: Export from PyTorch

If you have Python installed:

```bash
pip install ultralytics
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='onnx')"
```

Then copy the generated `yolov8n.onnx` to the `/public` folder.
