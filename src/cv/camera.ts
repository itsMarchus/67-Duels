export function cameraSupportError(
  secureContext: boolean,
  hostname: string,
  mediaDevices: MediaDevices | undefined
): string | undefined {
  const localHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (!secureContext && !localHost) {
    return "Camera access requires HTTPS. Open the secure deployed URL and try again.";
  }

  if (!mediaDevices?.getUserMedia) {
    return "This browser cannot access a webcam. Use a current version of Chrome or Edge.";
  }

  return undefined;
}

export function cameraErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return error instanceof Error ? error.message : "Camera or hand model setup failed.";
  }

  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera permission was blocked. Allow camera access for this site, then try again.";
    case "NotFoundError":
      return "No webcam was found. Connect a camera and try again.";
    case "NotReadableError":
      return "The webcam is busy or unavailable. Close other camera apps and try again.";
    case "OverconstrainedError":
      return "The webcam could not provide a compatible video mode.";
    case "AbortError":
      return "Camera startup was interrupted. Please try again.";
    default:
      return error.message || "Camera or hand model setup failed.";
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
