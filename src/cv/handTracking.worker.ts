import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { observationsFromResult } from "./handObservations";
import type { DetectionSettings } from "./types";
import type {
  TrackingDelegate,
  TrackingWorkerRequest,
  TrackingWorkerResponse
} from "./trackingWorkerProtocol";

type WorkerScope = {
  onmessage: ((event: MessageEvent<TrackingWorkerRequest>) => void) | null;
  postMessage(message: TrackingWorkerResponse): void;
};

const workerScope = globalThis as unknown as WorkerScope;
let tracker: HandLandmarker | undefined;

workerScope.onmessage = (event) => {
  const message = event.data;

  if (message.type === "initialize") {
    void initialize(message.modelAssetUrl, message.wasmRootUrl, message.settings);
    return;
  }

  if (message.type === "frame") {
    processFrame(message.frameId, message.timestamp, message.bitmap);
  }
};

async function initialize(
  modelAssetUrl: string,
  wasmRootUrl: string,
  settings: DetectionSettings
): Promise<void> {
  try {
    const vision = await FilesetResolver.forVisionTasks(wasmRootUrl, true);
    let delegate: TrackingDelegate = "GPU";

    try {
      tracker = await createTracker("GPU", vision, modelAssetUrl, settings);
    } catch (gpuError) {
      console.warn("MediaPipe worker GPU delegate failed, falling back to CPU", gpuError);
      delegate = "CPU";
      tracker = await createTracker("CPU", vision, modelAssetUrl, settings);
    }

    workerScope.postMessage({ type: "ready", delegate });
  } catch (error) {
    workerScope.postMessage({ type: "error", message: errorMessage(error) });
  }
}

function processFrame(frameId: number, timestamp: number, bitmap: ImageBitmap): void {
  try {
    if (!tracker) {
      throw new Error("Hand tracker worker received a frame before initialization.");
    }

    const startedAt = performance.now();
    const result = tracker.detectForVideo(bitmap, timestamp);
    const inferenceMs = performance.now() - startedAt;

    workerScope.postMessage({
      type: "result",
      frameId,
      timestamp,
      inferenceMs,
      observations: observationsFromResult(result, false)
    });
  } catch (error) {
    workerScope.postMessage({ type: "error", frameId, message: errorMessage(error) });
  } finally {
    bitmap.close();
  }
}

function createTracker(
  delegate: TrackingDelegate,
  vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  modelAssetUrl: string,
  settings: DetectionSettings
): Promise<HandLandmarker> {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: modelAssetUrl,
      delegate
    },
    runningMode: "VIDEO",
    numHands: 4,
    minHandDetectionConfidence: settings.modelDetectionConfidence,
    minHandPresenceConfidence: settings.modelPresenceConfidence,
    minTrackingConfidence: settings.modelTrackingConfidence
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Hand tracking worker failed.";
}
