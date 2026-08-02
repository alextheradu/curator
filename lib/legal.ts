// Bump whenever public/terms-of-service.md or public/privacy-policy.md
// changes in a way that needs re-acceptance. Use the later of the two
// documents' "Last updated" dates.
export const LEGAL_DOCS_UPDATED_AT = new Date("2026-08-02T00:00:00Z");

export function isLegalAcceptanceCurrent(acceptedAt: Date | string | null | undefined) {
  if (!acceptedAt) return false;
  return new Date(acceptedAt) >= LEGAL_DOCS_UPDATED_AT;
}
