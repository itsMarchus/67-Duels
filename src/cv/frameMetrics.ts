import type { PlayerId, RepDiagnostics, TrackingMetrics } from "./types";

const METRICS_WINDOW_MS = 1000;
const MAX_INFERENCE_SAMPLES = 60;

export type FrameMetricsContext = Pick<
  TrackingMetrics,
  "cameraWidth" | "cameraHeight" | "runtimeMode" | "performanceProfile"
>;

const DEFAULT_CONTEXT: FrameMetricsContext = {
  cameraWidth: 0,
  cameraHeight: 0,
  runtimeMode: "main-thread",
  performanceProfile: "balanced"
};

export function shouldProcessVideoFrame(currentTime: number, lastVideoTime: number): boolean {
  return currentTime !== lastVideoTime;
}

export class FrameMetricsTracker {
  private videoFrameTimestamps: number[] = [];
  private processedFrameTimestamps: number[] = [];
  private inferenceSamples: number[] = [];
  private detectedHands = 0;
  private duplicateFramesSkipped = 0;
  private busyFramesSkipped = 0;

  recordVideoFrame(timestamp: number): void {
    this.videoFrameTimestamps.push(timestamp);
    this.videoFrameTimestamps = recentSamples(this.videoFrameTimestamps, timestamp);
  }

  recordFrame(timestamp: number, inferenceMs: number, detectedHands: number): void {
    this.processedFrameTimestamps.push(timestamp);
    this.processedFrameTimestamps = recentSamples(this.processedFrameTimestamps, timestamp);
    this.inferenceSamples.push(inferenceMs);
    this.inferenceSamples = this.inferenceSamples.slice(-MAX_INFERENCE_SAMPLES);
    this.detectedHands = detectedHands;
  }

  recordDuplicateFrame(): void {
    this.duplicateFramesSkipped += 1;
  }

  recordBusyFrame(): void {
    this.busyFramesSkipped += 1;
  }

  recordSkippedFrame(): void {
    this.recordDuplicateFrame();
  }

  snapshot(
    cameraFps: number,
    diagnostics: Record<PlayerId, RepDiagnostics>,
    context: FrameMetricsContext = DEFAULT_CONTEXT
  ): TrackingMetrics {
    const sampleWindowMs = elapsedWindow(this.videoFrameTimestamps);
    const averageInferenceMs = this.inferenceSamples.length > 0
      ? this.inferenceSamples.reduce((total, sample) => total + sample, 0) / this.inferenceSamples.length
      : 0;

    return {
      processedFps: rollingFps(this.processedFrameTimestamps),
      observedCameraFps: rollingFps(this.videoFrameTimestamps),
      averageInferenceMs,
      detectedHands: this.detectedHands,
      cameraFps,
      cameraWidth: context.cameraWidth,
      cameraHeight: context.cameraHeight,
      sampleWindowMs,
      duplicateFramesSkipped: this.duplicateFramesSkipped,
      busyFramesSkipped: this.busyFramesSkipped,
      runtimeMode: context.runtimeMode,
      performanceProfile: context.performanceProfile,
      diagnostics
    };
  }

  reset(): void {
    this.videoFrameTimestamps = [];
    this.processedFrameTimestamps = [];
    this.inferenceSamples = [];
    this.detectedHands = 0;
    this.duplicateFramesSkipped = 0;
    this.busyFramesSkipped = 0;
  }
}

function recentSamples(samples: number[], latestTimestamp: number): number[] {
  return samples.filter((sample) => latestTimestamp - sample <= METRICS_WINDOW_MS);
}

function elapsedWindow(samples: number[]): number {
  const firstTimestamp = samples[0];
  const lastTimestamp = samples[samples.length - 1];
  return lastTimestamp !== undefined && firstTimestamp !== undefined ? lastTimestamp - firstTimestamp : 0;
}

function rollingFps(samples: number[]): number {
  const elapsed = elapsedWindow(samples);
  return elapsed > 0 ? ((samples.length - 1) * 1000) / elapsed : 0;
}
