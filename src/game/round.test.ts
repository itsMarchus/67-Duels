import { describe, expect, it } from "vitest";
import {
  createInitialRoundState,
  finishRound,
  scoreRep,
  startCountdown,
  startPlaying,
  tickRound
} from "./round";

describe("round state", () => {
  it("starts at camera setup with zero scores and thirty seconds remaining", () => {
    expect(createInitialRoundState()).toEqual({
      phase: "cameraSetup",
      remainingTime: 30,
      scores: { left: 0, right: 0 }
    });
  });

  it("moves through countdown into a timed playing round", () => {
    const countdown = startCountdown(createInitialRoundState(), 1_000);
    expect(countdown).toMatchObject({ phase: "countdown", startedAt: 1_000 });

    const playing = startPlaying(countdown, 4_000);
    expect(playing).toMatchObject({ phase: "playing", remainingTime: 30, startedAt: 4_000 });
  });

  it("ticks down remaining time and finishes at zero", () => {
    const playing = startPlaying(startCountdown(createInitialRoundState(), 0), 1_000);

    expect(tickRound(playing, 6_250)).toMatchObject({ phase: "playing", remainingTime: 25 });
    expect(tickRound(playing, 31_000)).toMatchObject({ phase: "results", remainingTime: 0, endedAt: 31_000 });
  });

  it("scores reps only while playing", () => {
    const ready = startCountdown(createInitialRoundState(), 0);
    const playing = startPlaying(ready, 1_000);

    expect(scoreRep(ready, "left").scores.left).toBe(0);
    expect(scoreRep(scoreRep(playing, "left"), "right")).toMatchObject({
      scores: { left: 1, right: 1 }
    });
  });

  it("selects left, right, or tie winner from final scores", () => {
    expect(finishRound({ ...createInitialRoundState(), scores: { left: 7, right: 4 } }, 9_000).winner).toBe("left");
    expect(finishRound({ ...createInitialRoundState(), scores: { left: 1, right: 9 } }, 9_000).winner).toBe("right");
    expect(finishRound({ ...createInitialRoundState(), scores: { left: 6, right: 6 } }, 9_000).winner).toBe("tie");
  });
});
