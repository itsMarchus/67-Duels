import { describe, expect, it } from "vitest";
import { cameraErrorMessage, cameraSupportError } from "./camera";

describe("camera production errors", () => {
  it("requires HTTPS away from a loopback host", () => {
    expect(cameraSupportError(false, "arcade.example", {} as MediaDevices)).toMatch(/HTTPS/);
    expect(cameraSupportError(false, "127.0.0.1", { getUserMedia: () => Promise.reject() } as MediaDevices)).toBeUndefined();
  });

  it("reports missing browser camera support", () => {
    expect(cameraSupportError(true, "arcade.example", undefined)).toMatch(/Chrome or Edge/);
  });

  it("turns common browser failures into useful instructions", () => {
    expect(cameraErrorMessage(new DOMException("Denied", "NotAllowedError"))).toMatch(/permission/i);
    expect(cameraErrorMessage(new DOMException("Busy", "NotReadableError"))).toMatch(/busy/i);
    expect(cameraErrorMessage(new DOMException("Missing", "NotFoundError"))).toMatch(/No webcam/i);
  });
});
