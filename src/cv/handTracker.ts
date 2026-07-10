import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult
} from "@mediapipe/tasks-vision";
import {
  PARTY_FORGIVING_SETTINGS,
  type DetectionSettings,
  type HandObservation,
  type PlayerTrackingState
} from "./types";
import { assignZone, centerOfPalmLandmarks } from "./zones";

export const MODEL_PATH = "/models/hand_landmarker.task";
export const WASM_PATH = "/wasm";

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17]
];

export async function createHandLandmarker(
  settings: DetectionSettings = PARTY_FORGIVING_SETTINGS
): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

  try {
    return await createWithDelegate("GPU", vision, settings);
  } catch (gpuError) {
    console.warn("MediaPipe GPU delegate failed, falling back to CPU", gpuError);
    return createWithDelegate("CPU", vision, settings);
  }
}

export function observationsFromResult(result: HandLandmarkerResult): HandObservation[] {
  return result.landmarks.map((landmarks, index) => {
    const mirroredLandmarks = landmarks.map((landmark) => ({
      x: 1 - landmark.x,
      y: landmark.y,
      z: landmark.z
    }));
    const center = centerOfPalmLandmarks(mirroredLandmarks);
    const handedness = result.handedness[index]?.[0];

    return {
      landmarks: mirroredLandmarks,
      worldLandmarks: result.worldLandmarks[index],
      handedness: handedness?.categoryName === "Left" || handedness?.categoryName === "Right" ? handedness.categoryName : "Unknown",
      handednessConfidence: handedness?.score ?? 0,
      zone: assignZone(center.x)
    };
  });
}

export function drawHandOverlay(
  canvas: HTMLCanvasElement,
  observations: HandObservation[],
  playerStates: Record<"left" | "right", PlayerTrackingState>,
  debugOverlay: boolean
): void {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = Math.max(3, canvas.width * 0.003);
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const observation of observations) {
    const color = observation.zone === "left" ? "#f43f5e" : observation.zone === "right" ? "#2563eb" : "#f59e0b";
    context.strokeStyle = color;
    context.fillStyle = color;

    for (const [start, end] of HAND_CONNECTIONS) {
      const startPoint = observation.landmarks[start];
      const endPoint = observation.landmarks[end];
      if (!startPoint || !endPoint) {
        continue;
      }

      context.beginPath();
      context.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
      context.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
      context.stroke();
    }

    for (const point of observation.landmarks) {
      context.beginPath();
      context.arc(point.x * canvas.width, point.y * canvas.height, Math.max(4, canvas.width * 0.004), 0, Math.PI * 2);
      context.fill();
    }
  }

  if (!debugOverlay) {
    return;
  }

  drawDebugText(context, canvas, playerStates.left, 24, "#f43f5e");
  drawDebugText(context, canvas, playerStates.right, canvas.width - 300, "#2563eb");
}

async function createWithDelegate(
  delegate: "CPU" | "GPU",
  vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  settings: DetectionSettings
) {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_PATH,
      delegate
    },
    runningMode: "VIDEO",
    numHands: 4,
    minHandDetectionConfidence: settings.modelDetectionConfidence,
    minHandPresenceConfidence: settings.modelPresenceConfidence,
    minTrackingConfidence: settings.modelTrackingConfidence
  });
}

function drawDebugText(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: PlayerTrackingState,
  x: number,
  color: string
): void {
  context.save();
  context.font = Math.max(14, canvas.width * 0.014) + "px ui-monospace, SFMono-Regular, Consolas, monospace";
  context.fillStyle = color;
  context.shadowColor = "white";
  context.shadowBlur = 4;
  context.fillText(
    state.playerId.toUpperCase() + " hands:" + state.visibleHands + " state:" + state.swapState,
    x,
    36
  );
  if (state.invalidReason) {
    context.fillText(state.invalidReason, x, 62);
  }
  context.restore();
}
