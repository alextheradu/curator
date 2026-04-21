const EXPLICIT_WEB_SEARCH_HINTS = [
  "look up",
  "search the web",
  "search online",
  "check online",
  "google",
  "web search",
];

const FRESHNESS_HINTS = [
  "latest",
  "recent",
  "current",
  "currently",
  "today",
  "yesterday",
  "this week",
  "this month",
  "this year",
  "this season",
  "right now",
  "as of",
  "update",
  "updates",
  "news",
];

const LIVE_INFO_HINTS = [
  "who won",
  "won",
  "winner",
  "results",
  "ranking",
  "rankings",
  "standing",
  "standings",
  "schedule",
  "record",
  "awards",
  "alliance",
  "captain",
  "qualified",
  "qualify",
  "einstein",
  "championship",
  "cmp",
];

const FRC_WEB_SEARCH_PATTERNS = [
  /\bteam\s+\d+\b/i,
  /\bfrc\s+\d+\b/i,
  /\bfirst robotics\b/i,
  /\bfirst robotics competition\b/i,
  /\bdistrict\b/i,
  /\bregional\b/i,
  /\bchampionship\b/i,
  /\beinstein\b/i,
  /\bweek\s+\d+\b/i,
  /\bevent\b/i,
  /\bmatch\b/i,
  /\bpit scouting\b/i,
  /\bscouting\b/i,
];

const SEASON_HINTS = /\b(this year|this season|current season|latest|recent|current|today|yesterday|week\s+\d+)\b/i;
const YEAR_PATTERN = /\b20\d{2}\b/;
const FRC_SCOPE_PATTERN = /\b(frc|first robotics|first robotics competition|first inspires)\b/i;

export function shouldRunWebSearch(query: string, ragHitCount: number, bestScore: number) {
  const normalized = query.toLowerCase();
  const asksForWeb = EXPLICIT_WEB_SEARCH_HINTS.some((hint) => normalized.includes(hint));
  const asksForFreshInfo = FRESHNESS_HINTS.some((hint) => normalized.includes(hint));
  const asksForLiveInfo = LIVE_INFO_HINTS.some((hint) => normalized.includes(hint));
  const frcSpecific = FRC_WEB_SEARCH_PATTERNS.some((pattern) => pattern.test(query));

  if (asksForWeb || asksForFreshInfo) {
    return true;
  }

  if (ragHitCount === 0) {
    return true;
  }

  if (frcSpecific && asksForLiveInfo) {
    return true;
  }

  if (frcSpecific && bestScore < 0.35) {
    return true;
  }

  return false;
}

export function buildWebSearchQuery(query: string, seasonYear?: number) {
  const trimmed = query.trim();
  if (!trimmed) {
    return trimmed;
  }

  const scopedQuery = FRC_SCOPE_PATTERN.test(trimmed)
    ? trimmed
    : `FIRST Robotics Competition (FRC) ${trimmed}`;

  if (!seasonYear || YEAR_PATTERN.test(trimmed) || !SEASON_HINTS.test(trimmed)) {
    return scopedQuery;
  }

  return `${scopedQuery} ${seasonYear}`;
}
