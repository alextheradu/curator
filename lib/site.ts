export const SITE_NAME = "Curator";
export const SITE_TITLE = "Curator | FRC AI Assistant for FIRST Robotics Competition";
export const SITE_DESCRIPTION =
  "Curator is an AI assistant for FIRST Robotics Competition teams. Get help with FRC rules, game manuals, scouting, match results, rankings, current event context, and team research.";
const DEVELOPMENT_SITE_URL = "http://localhost:3000";
const PRODUCTION_SITE_URL = "https://curatorfrc.com";

function resolveSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!raw) {
    return process.env.NODE_ENV === "production" ? PRODUCTION_SITE_URL : DEVELOPMENT_SITE_URL;
  }

  try {
    const parsed = new URL(raw);
    const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

    if (process.env.NODE_ENV === "production" && isLocalhost) {
      return PRODUCTION_SITE_URL;
    }

    return parsed.origin;
  } catch {
    return process.env.NODE_ENV === "production" ? PRODUCTION_SITE_URL : DEVELOPMENT_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();
export const SITE_OG_IMAGE = `${SITE_URL}/opengraph.png`;
