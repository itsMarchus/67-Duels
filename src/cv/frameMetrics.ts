import type { PlayerId, RepDiagnostics, TrackingMetrics } from "./types";

const METRICS_WINDOW_MS = 1000;
const MAX_INFERENCE_SAMPLES = 60;

export function shouldProcessVideoFrame(currentTime: number, lastVideoTime: number): boolean {
  return currentTime !== lastVideoTime;
}

export class FrameMetricsTracker {
  private frameTimestamps: number[] = [];
  private inferenceSamples: number[] = [];
  private detectedHands = 0;
  private duplicateFramesSkipped = 0;

  recordFrame(timestamp: number, inferenceMs: number, detectedHands: number): void {
    this.frameTimestamps.push(timestamp);
    this.frameTimestamps = this.frameTimestamps.filter((sample) => timestamp - sample <= METRICS_WINDOW_MS);
    this.inferenceSamples.push(inferenceMs);
    this.inferenceSamples = this.inferenceSamples.slice(-MAX_INFERENCE_SAMPLES);
    this.detectedHands = detectedHands;
  }

  recordSkippedFrame(): void {
    this.duplicateFramesSkipped += 1;
  }

  snapshot(cameraFps: number, diagnostics: Record<PlayerId, RepDiagnostics>): TrackingMetrics {
    const firstTimestamp = this.frameTimestamps[0];
    const lastTimestamp = this.frameTimestamps[this.frameTimestamps.length - 1];
    const elapsed = lastTimestamp !== undefined && firstTimestamp !== undefined ? lastTimestamp - firstTimestamp : 0;
    const processedFps = elapsed > 0 ? ((this.frameTimestamps.length - 1) * 1000) / elapsed : 0;
    const averageInferenceMs = this.inferenceSamples.length > 0
      ? this.inferenceSamples.reduce((total, sample) => total + sample, 0) / this.inferenceSamples.length
      : 0;

    return {
      processedFps,
      averageInferenceMs,
      detectedHands: this.detectedHands,
      cameraFps,
      duplicateFramesSkipped: this.duplicateFramesSkipped,
      diagnostics
    };
  }

  reset(): void {
    this.frameTimestamps = [];
    this.inferenceSamples = [];
    this.detectedHands = 0;
    this.duplicateFramesSkipped = 0;
  }
}
