function normalizeAdminEmail(email: string) {
  return email.trim().normalize("NFKC").toLowerCase();
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeAdminEmail)
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return getAdminEmails().includes(normalizeAdminEmail(email));
}
