const LOOKUP_HINTS = [
  "what is",
  "what are",
  "what does",
  "what do",
  "stand for",
  "stands for",
  "mean",
  "means",
  "meaning",
  "abbreviation",
  "acronym",
  "full form",
];

const SEASON_HINTS = /\b(this year|this season|current season|latest|recent|current|today|yesterday|week\s+\d+)\b/i;
const YEAR_PATTERN = /\b20\d{2}\b/;
const FRC_SCOPE_PATTERN = /\b(frc|first robotics|first robotics competition|first inspires)\b/i;
const ACRONYM_TOKEN_PATTERN = /^[a-z0-9-]{2,8}$/i;

function tokenizeQuery(query: string) {
  return query
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ""))
    .filter(Boolean);
}

function isAcronymLikeToken(token: string) {
  return ACRONYM_TOKEN_PATTERN.test(token)
    && /[a-z]/i.test(token)
    && token.length <= 6;
}

function isAcronymLikeQuery(query: string) {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return false;
  }

  if (tokens.length === 1) {
    return isAcronymLikeToken(tokens[0]);
  }

  return tokens.some(isAcronymLikeToken)
    && LOOKUP_HINTS.some((hint) => query.toLowerCase().includes(hint));
}

// Rules/dimension wording, including the common "hight" misspelling of
// "height" that testers actually hit.
const RULES_VERIFICATION_PATTERN = /\b(rules?|rule\s*book|game\s*manual|legal(ity)?|h[ei]{1,2}ght|weight|width|length|dimension|size)\s*(of|for|limit|max(imum)?|allowed|in)?\b/i;
const CURRENT_GAME_PATTERN = /\b(current|new|this|latest)\s+(frc\s+)?(game|season)\b/i;

/**
 * True when a question needs live verification against official FRC sources
 * rather than the model's static training data - season-specific rules,
 * dimensions/limits, or "what's this year's game" style questions. Used to
 * grant web_search even in "fast" search mode, where it's normally disabled,
 * so an unrecognized-but-real game name (e.g. a new season's game) doesn't
 * get waved off as fictional just because fast mode has no way to check.
 */
export function needsCurrentFrcVerification(query: string, seasonYear?: number): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;

  if (RULES_VERIFICATION_PATTERN.test(trimmed)) return true;
  if (CURRENT_GAME_PATTERN.test(trimmed)) return true;
  if (SEASON_HINTS.test(trimmed) && /\b(game|rules?|season)\b/i.test(trimmed)) return true;

  const yearMatch = trimmed.match(YEAR_PATTERN);
  if (yearMatch && seasonYear && Number(yearMatch[0]) >= seasonYear) return true;

  return false;
}

export function buildWebSearchQuery(query: string, seasonYear?: number) {
  const trimmed = query.trim();
  if (!trimmed) {
    return trimmed;
  }

  const scopedQueryBase = FRC_SCOPE_PATTERN.test(trimmed)
    ? trimmed
    : `FIRST Robotics Competition (FRC) ${trimmed}`;
  const scopedQuery = isAcronymLikeQuery(trimmed) && !LOOKUP_HINTS.some((hint) => trimmed.toLowerCase().includes(hint))
    ? `${scopedQueryBase} abbreviation meaning`
    : scopedQueryBase;

  if (!seasonYear || YEAR_PATTERN.test(trimmed) || !SEASON_HINTS.test(trimmed)) {
    return scopedQuery;
  }

  return `${scopedQuery} ${seasonYear}`;
}
