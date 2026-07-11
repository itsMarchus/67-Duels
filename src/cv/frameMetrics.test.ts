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

  it("reports rolling FPS, inference latency, hands, and rep diagnostics", () => {
    const tracker = new FrameMetricsTracker();
    tracker.recordFrame(0, 10, 2);
    tracker.recordFrame(100, 20, 3);
    tracker.recordFrame(200, 30, 4);
    tracker.recordSkippedFrame();

    expect(tracker.snapshot(30, diagnostics)).toEqual({
      processedFps: 10,
      averageInferenceMs: 20,
      detectedHands: 4,
      cameraFps: 30,
      duplicateFramesSkipped: 1,
      diagnostics
    });
  });

  it("resets all rolling samples", () => {
    const tracker = new FrameMetricsTracker();
    tracker.recordFrame(0, 12, 4);
    tracker.recordSkippedFrame();
    tracker.reset();

    expect(tracker.snapshot(60, diagnostics)).toMatchObject({
      processedFps: 0,
      averageInferenceMs: 0,
      detectedHands: 0,
      duplicateFramesSkipped: 0
    });
  });
});
