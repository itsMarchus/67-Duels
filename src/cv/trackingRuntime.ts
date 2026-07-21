import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { getSharedHandLandmarker, MODEL_PATH, WASM_PATH } from "./handTracker";
import { observationsFromResult } from "./handObservations";
import type { DetectionSettings, HandObservation } from "./types";
import type {
  TrackingDelegate,
  TrackingWorkerRequest,
  TrackingWorkerResponse
} from "./trackingWorkerProtocol";

const WORKER_STARTUP_TIMEOUT_MS = 15_000;

export type TrackingRuntimeMode = "worker-gpu" | "worker-cpu" | "main-thread";

export type ProcessedTrackingFrame = {
  timestamp: number;
  inferenceMs: number;
  observations: HandObservation[];
};

export interface HandTrackingRuntime {
  readonly mode: TrackingRuntimeMode;
  readonly busy: boolean;
  processFrame(video: HTMLVideoElement, timestamp: number): Promise<ProcessedTrackingFrame | undefined>;
  close(): void;
}

export async function createHandTrackingRuntime(settings: DetectionSettings, numHands = 4): Promise<HandTrackingRuntime> {
  if (supportsWorkerTracking()) {
    try {
      return await WorkerTrackingRuntime.create(settings, numHands);
    } catch (error) {
      console.warn("MediaPipe worker setup failed, falling back to main-thread tracking", error);
    }
  }

  return new MainThreadTrackingRuntime(await getSharedHandLandmarker(settings, numHands));
}

export function supportsWorkerTracking(scope: typeof globalThis = globalThis): boolean {
  return typeof scope.Worker === "function" && typeof scope.createImageBitmap === "function";
}

class MainThreadTrackingRuntime implements HandTrackingRuntime {
  readonly mode = "main-thread" as const;
  busy = false;

  constructor(private readonly tracker: HandLandmarker) {}

  processFrame(video: HTMLVideoElement, timestamp: number): Promise<ProcessedTrackingFrame> {
    this.busy = true;
    try {
      const startedAt = performance.now();
      const result = this.tracker.detectForVideo(video, timestamp);

      return Promise.resolve({
        timestamp,
        inferenceMs: performance.now() - startedAt,
        observations: observationsFromResult(result)
      });
    } finally {
      this.busy = false;
    }
  }

  close(): void {
    // The shared fallback model remains ready for camera restarts and rematches.
  }
}

class WorkerTrackingRuntime implements HandTrackingRuntime {
  readonly mode: TrackingRuntimeMode;
  busy = false;

  private nextFrameId = 1;
  private closed = false;
  private pending?: {
    frameId: number;
    resolve: (frame: ProcessedTrackingFrame) => void;
    reject: (error: Error) => void;
  };

  private constructor(
    private readonly worker: Worker,
    delegate: TrackingDelegate
  ) {
    this.mode = delegate === "GPU" ? "worker-gpu" : "worker-cpu";
    this.worker.addEventListener("message", this.handleMessage);
    this.worker.addEventListener("error", this.handleWorkerError);
  }

  static async create(settings: DetectionSettings, numHands: number): Promise<WorkerTrackingRuntime> {
    const worker = new Worker(new URL("./handTracking.worker.ts", import.meta.url), { type: "module" });

    try {
      const delegate = await initializeWorker(worker, settings, numHands);
      return new WorkerTrackingRuntime(worker, delegate);
    } catch (error) {
      worker.terminate();
      throw error;
    }
  }

  async processFrame(video: HTMLVideoElement, timestamp: number): Promise<ProcessedTrackingFrame | undefined> {
    if (this.closed || this.busy) {
      return undefined;
    }

    this.busy = true;
    let bitmap: ImageBitmap | undefined;

    try {
      bitmap = await createImageBitmap(video);
      if (this.closed) {
        bitmap.close();
        this.busy = false;
        return undefined;
      }

      const frameId = this.nextFrameId++;
      return await new Promise<ProcessedTrackingFrame>((resolve, reject) => {
        this.pending = { frameId, resolve, reject };
        const message: TrackingWorkerRequest = { type: "frame", frameId, timestamp, bitmap: bitmap! };
        this.worker.postMessage(message, [bitmap!]);
      });
    } catch (error) {
      bitmap?.close();
      this.busy = false;
      throw error;
    }
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.busy = false;
    this.pending?.reject(new Error("Hand tracking stopped."));
    this.pending = undefined;
    this.worker.removeEventListener("message", this.handleMessage);
    this.worker.removeEventListener("error", this.handleWorkerError);
    this.worker.terminate();
  }

  private readonly handleMessage = (event: MessageEvent<TrackingWorkerResponse>) => {
    const message = event.data;
    if (message.type === "ready") {
      return;
    }

    if (message.type === "error") {
      if (message.frameId === undefined || message.frameId === this.pending?.frameId) {
        this.rejectPending(new Error(message.message));
      }
      return;
    }

    if (message.frameId !== this.pending?.frameId) {
      return;
    }

    const resolve = this.pending.resolve;
    this.pending = undefined;
    this.busy = false;
    resolve({
      timestamp: message.timestamp,
      inferenceMs: message.inferenceMs,
      observations: message.observations
    });
  };

  private readonly handleWorkerError = (event: ErrorEvent) => {
    this.rejectPending(new Error(event.message || "Hand tracking worker stopped unexpectedly."));
  };

  private rejectPending(error: Error): void {
    const reject = this.pending?.reject;
    this.pending = undefined;
    this.busy = false;
    reject?.(error);
  }
}

function initializeWorker(worker: Worker, settings: DetectionSettings, numHands: number): Promise<TrackingDelegate> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Hand tracking worker startup timed out."));
    }, WORKER_STARTUP_TIMEOUT_MS);

    const handleMessage = (event: MessageEvent<TrackingWorkerResponse>) => {
      if (event.data.type === "ready") {
        cleanup();
        resolve(event.data.delegate);
      } else if (event.data.type === "error" && event.data.frameId === undefined) {
        cleanup();
        reject(new Error(event.data.message));
      }
    };

    const handleError = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message || "Hand tracking worker failed to start."));
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    const message: TrackingWorkerRequest = {
      type: "initialize",
      modelAssetUrl: new URL(MODEL_PATH, window.location.href).href,
      wasmRootUrl: new URL(WASM_PATH, window.location.href).href,
      settings,
      numHands
    };
    worker.postMessage(message);
  });
}
