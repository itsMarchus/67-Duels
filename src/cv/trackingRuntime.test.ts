import { describe, expect, it } from "vitest";
import { supportsWorkerTracking } from "./trackingRuntime";

describe("tracking runtime support", () => {
  it("requires both workers and ImageBitmap capture", () => {
    const supported = {
      Worker: function Worker() {},
      createImageBitmap: function createImageBitmap() {}
    } as unknown as typeof globalThis;
    const missingBitmap = {
      Worker: function Worker() {},
      createImageBitmap: undefined
    } as unknown as typeof globalThis;

    expect(supportsWorkerTracking(supported)).toBe(true);
    expect(supportsWorkerTracking(missingBitmap)).toBe(false);
  });
});
