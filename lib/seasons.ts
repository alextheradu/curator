const FIRST_FRC_SEASON_YEAR = 2002;
export const DEFAULT_SEASON_YEAR = 2026;

export function getSeasonYears() {
  const currentYear = Math.max(new Date().getFullYear(), DEFAULT_SEASON_YEAR);
  return Array.from(
    { length: currentYear - FIRST_FRC_SEASON_YEAR + 1 },
    (_, index) => currentYear - index,
  );
}

export function getDefaultSeasonYear() {
  return DEFAULT_SEASON_YEAR;
}

export function isValidSeasonYear(year: number) {
  return Number.isInteger(year) && year >= FIRST_FRC_SEASON_YEAR && year <= getDefaultSeasonYear();
}

export function parseSeasonYearsFromText(text: string) {
  const matches = text.match(/\b20\d{2}\b/g) ?? [];
  return [...new Set(matches.map(Number).filter(isValidSeasonYear))];
}
