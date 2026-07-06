// Input normalization for TBA MCP tool arguments.
// Kept dependency-free so both the MCP server script and unit tests can import it.

export function normalizeTeamKey(value) {
  const trimmed = String(value).trim().toLowerCase();

  if (/^frc\d+$/.test(trimmed)) {
    return trimmed;
  }

  const numberMatch = trimmed.match(/\d+/);
  if (!numberMatch) {
    throw new Error(`Invalid team identifier: ${value}`);
  }

  return `frc${numberMatch[0]}`;
}

export function normalizeEventKey(value) {
  const trimmed = String(value).trim().toLowerCase();

  if (!/^20\d{2}[a-z0-9]+$/.test(trimmed)) {
    throw new Error(`Invalid event key: ${value}`);
  }

  return trimmed;
}

export function normalizeMatchKey(value) {
  const trimmed = String(value).trim().toLowerCase();

  // Quals are `qm<n>` with no set number; playoff keys are `<level><set>m<match>`.
  if (!/^20\d{2}[a-z0-9]+_(?:qm\d+|(?:ef|qf|sf|f)\d+m\d+)$/.test(trimmed)) {
    throw new Error(`Invalid match key: ${value}`);
  }

  return trimmed;
}
