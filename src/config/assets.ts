export function joinBasePath(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  return normalizedBase + path.replace(/^\/+/, "");
}

export function publicAssetUrl(path: string): string {
  return joinBasePath(import.meta.env.BASE_URL, path);
}
