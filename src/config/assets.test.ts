import { describe, expect, it } from "vitest";
import { joinBasePath, publicAssetUrl } from "./assets";

describe("public asset URLs", () => {
  it("normalizes root asset paths", () => {
    expect(publicAssetUrl("models/hand.task")).toBe("/models/hand.task");
    expect(publicAssetUrl("/wasm/runtime.wasm")).toBe("/wasm/runtime.wasm");
  });

  it("supports deployments under a subpath", () => {
    expect(joinBasePath("/67-Duels/", "/models/hand.task")).toBe("/67-Duels/models/hand.task");
    expect(joinBasePath("/arcade", "memes/reaction.gif")).toBe("/arcade/memes/reaction.gif");
  });
});
