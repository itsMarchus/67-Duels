import { describe, expect, it } from "vitest";
import { FrameMetricsTracker, shouldProcessVideoFrame } from "./frameMetrics";
import type { PlayerId, RepDiagnostics } from "./types";

const diagnostics: Record<PlayerId, RepDiagnostics> = {
  left: { acceptedReps: 3, debounceRejections: 1, graceDropouts: 2, graceActive: false },
  right: { acceptedReps: 4, debounceRejections: 0, graceDropouts: 1, graceActive: true }
};

describe("frame metrics", () => {
  it("deduplicates repeated decoded video frames", () => {
    expect(shouldProcessVideoFrame(1.25, 1.2)).toBe(true);
    expect(shouldProcessVideoFrame(1.25, 1.25)).toBe(false);
  });

  it("reports source and processed FPS independently", () => {
    const tracker = new FrameMetricsTracker();
    for (const timestamp of [0, 40, 80, 120, 160, 200]) {
      tracker.recordVideoFrame(timestamp);
    }
    tracker.recordFrame(0, 10, 2);
    tracker.recordFrame(100, 20, 3);
    tracker.recordFrame(200, 30, 4);
    tracker.recordDuplicateFrame();
    tracker.recordBusyFrame();

    expect(tracker.snapshot(30, diagnostics, {
      cameraWidth: 960,
      cameraHeight: 540,
      runtimeMode: "worker-gpu",
      performanceProfile: "balanced"
    })).toEqual({
      processedFps: 10,
      observedCameraFps: 25,
      averageInferenceMs: 20,
      detectedHands: 4,
      cameraFps: 30,
      cameraWidth: 960,
      cameraHeight: 540,
      sampleWindowMs: 200,
      duplicateFramesSkipped: 1,
      busyFramesSkipped: 1,
      runtimeMode: "worker-gpu",
      performanceProfile: "balanced",
      diagnostics
    });
  });

  it("resets all rolling samples and skip counters", () => {
    const tracker = new FrameMetricsTracker();
    tracker.recordVideoFrame(0);
    tracker.recordFrame(0, 12, 4);
    tracker.recordDuplicateFrame();
    tracker.recordBusyFrame();
    tracker.reset();

    expect(tracker.snapshot(60, diagnostics)).toMatchObject({
      processedFps: 0,
      observedCameraFps: 0,
      averageInferenceMs: 0,
      detectedHands: 0,
      duplicateFramesSkipped: 0,
      busyFramesSkipped: 0
    });
  });
});
