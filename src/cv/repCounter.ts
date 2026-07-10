import type { DetectionSettings, HandCenter, PlayerId, RepEvent, SwapState } from "./types";

export class RepCounter {
  private swapState: SwapState = "unknown";
  private lastRepAt = Number.NEGATIVE_INFINITY;

  constructor(
    public readonly playerId: PlayerId,
    public readonly settings: DetectionSettings
  ) {}

  update(handCenters: HandCenter[], timestamp: number): RepEvent | undefined {
    if (handCenters.length < 2) {
      this.swapState = "unknown";
      return undefined;
    }

    const [firstHand, secondHand] = [...handCenters].sort((a, b) => a.x - b.x);
    const nextState = classifySwapState(firstHand, secondHand, this.settings.verticalThreshold);

    if (nextState === "neutral") {
      return undefined;
    }

    const previousState = this.swapState;
    this.swapState = nextState;

    const changedDirection =
      previousState !== "unknown" && previousState !== "neutral" && previousState !== nextState;
    const outsideDebounce = timestamp - this.lastRepAt >= this.settings.debounceMs;

    if (!changedDirection || !outsideDebounce) {
      return undefined;
    }

    this.lastRepAt = timestamp;

    return {
      playerId: this.playerId,
      timestamp,
      previousState,
      nextState
    };
  }

  getState(): SwapState {
    return this.swapState;
  }

  reset(): void {
    this.swapState = "unknown";
    this.lastRepAt = Number.NEGATIVE_INFINITY;
  }
}

function classifySwapState(leftHand: HandCenter, rightHand: HandCenter, threshold: number): SwapState {
  const verticalDelta = leftHand.y - rightHand.y;

  if (Math.abs(verticalDelta) < threshold) {
    return "neutral";
  }

  return verticalDelta < 0 ? "left-high" : "right-high";
}
