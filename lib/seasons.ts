const FIRST_FRC_SEASON_YEAR = 2002;

export function getSeasonYears() {
  const currentYear = new Date().getFullYear();
  return Array.from(
    { length: currentYear - FIRST_FRC_SEASON_YEAR + 1 },
    (_, index) => currentYear - index,
  );
}

export function getDefaultSeasonYear() {
  return getSeasonYears()[0];
}

export function isValidSeasonYear(year: number) {
  return Number.isInteger(year) && year >= FIRST_FRC_SEASON_YEAR && year <= getDefaultSeasonYear();
}

export function parseSeasonYearsFromText(text: string) {
  const matches = text.match(/\b20\d{2}\b/g) ?? [];
  return [...new Set(matches.map(Number).filter(isValidSeasonYear))];
}
