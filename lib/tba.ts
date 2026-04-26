import "server-only";

export function isTbaMcpEnabled() {
  const raw = process.env.TBA_MCP_ENABLED?.trim().toLowerCase();

  if (!raw) {
    return false;
  }

  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}
