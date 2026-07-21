import type { DetectionSettings, HandObservation } from "./types";

export type TrackingDelegate = "GPU" | "CPU";

export type TrackingWorkerRequest =
  | {
      type: "initialize";
      modelAssetUrl: string;
      wasmRootUrl: string;
      settings: DetectionSettings;
    }
  | {
      type: "frame";
      frameId: number;
      timestamp: number;
      bitmap: ImageBitmap;
    };

export type TrackingWorkerResponse =
  | {
      type: "ready";
      delegate: TrackingDelegate;
    }
  | {
      type: "result";
      frameId: number;
      timestamp: number;
      inferenceMs: number;
      observations: HandObservation[];
    }
  | {
      type: "error";
      frameId?: number;
      message: string;
    };
