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
