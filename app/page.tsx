"use client";

import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { useYolo } from '../hooks/useYolo';
import { 
  scaleBoundingBox, 
  isInDangerZone, 
  isHighRiskDetection, 
  drawBoundingBox,
  triggerAudioAlert,
  triggerVibration
} from '../utils/yoloHelpers';

export default function CamNavPage() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Initializing AI...");
  const { initialize, runInference, isInitialized } = useYolo();

  useEffect(() => {
    // Load the model from your public folder
    initialize('/yolov8n.onnx')
      .then(() => setStatus("System Active"))
      .catch((err) => setStatus("Error loading model: " + err.message));
  }, [initialize]);

  const frameLoop = async () => {
    if (
      webcamRef.current && 
      webcamRef.current.video && 
      webcamRef.current.video.readyState === 4 &&
      isInitialized()
    ) {
      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const detections = await runInference(video);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let dangerDetected = false;

      detections.forEach(det => {
        const scaledBbox = scaleBoundingBox(
          det, 
          video.videoWidth, 
          video.videoHeight, 
          canvas.width, 
          canvas.height
        );

        const isDanger = isInDangerZone(scaledBbox, canvas.height) && 
                         isHighRiskDetection(det, scaledBbox, canvas.width, canvas.height);

        if (isDanger) dangerDetected = true;
        drawBoundingBox(ctx, scaledBbox, det, isDanger);
      });

      if (dangerDetected) {
        triggerAudioAlert("STOP: Obstacle Ahead");
        triggerVibration();
      }
    }
    requestAnimationFrame(frameLoop);
  };

  useEffect(() => {
    const interval = requestAnimationFrame(frameLoop);
    return () => cancelAnimationFrame(interval);
  }, [isInitialized]);

  return (
    <main className="relative flex h-screen w-screen flex-col items-center justify-center bg-black overflow-hidden">
      <div className="absolute top-0 z-20 w-full bg-black/60 p-4 text-center">
        <h1 className="text-xl font-bold tracking-widest text-white uppercase">CamNav v1.0</h1>
        <p className={`text-sm ${status === "System Active" ? "text-green-400" : "text-yellow-400"}`}>
          {status}
        </p>
      </div>

      <div className="relative h-full w-full max-w-4xl border-x border-zinc-800">
        <Webcam
          ref={webcamRef}
          audio={false}
          className="h-full w-full object-cover"
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "environment" }}
        />
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="absolute top-0 left-0 h-full w-full pointer-events-none"
        />
      </div>

      <div className="absolute bottom-0 w-full h-1/2 border-t-2 border-dashed border-red-500/20 pointer-events-none z-10 flex items-center justify-center">
        <span className="text-red-500/20 font-bold uppercase tracking-tighter text-4xl">Collision Zone</span>
      </div>
    </main>
  );
}