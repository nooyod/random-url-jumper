/**
 * URL 생성 유틸리티
 */
export function buildUrl(base = "", value = "", suffix = "") {
  return `${base || ""}${value ?? ""}${suffix || ""}`;
}
