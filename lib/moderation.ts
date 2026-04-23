const MODERATION_RULES = [
  {
    category: "profanity",
    pattern: /\b(fuck(?:ing|ed|er|ers)?|shit(?:ty|ting|ted)?|bullshit|bitch(?:es|y)?|asshole|damn|bastard|dick(?:head)?|piss(?:ed|ing)?|crap)\b/gi,
  },
  {
    category: "sexual content",
    pattern: /\b(porn|porno|nudes?|naked|blowjob|handjob|cum(?:ming)?|horny|dildo|penis|vagina)\b/gi,
  },
  {
    category: "harassment",
    pattern: /\b(kill yourself|kys|stfu|shut the fuck up|piece of shit|go to hell|i hate you)\b/gi,
  },
  {
    category: "threats",
    pattern: /\b(i(?:'| a)?m going to kill|i will kill|i(?:'| a)?ll hurt you|beat your ass)\b/gi,
  },
];

export type ModerationResult = {
  flagged: boolean;
  categories: string[];
  matchedTerms: string[];
  reason: string | null;
};

function uniqueTerms(terms: string[]) {
  return [...new Set(terms.map((term) => term.toLowerCase()))];
}

export function scanMessageForModeration(content: string): ModerationResult {
  const categories = new Set<string>();
  const matchedTerms: string[] = [];

  for (const rule of MODERATION_RULES) {
    const matches = content.match(rule.pattern);
    if (!matches || matches.length === 0) {
      continue;
    }

    categories.add(rule.category);
    matchedTerms.push(...matches.map((match) => match.trim().toLowerCase()));
  }

  const dedupedTerms = uniqueTerms(matchedTerms).slice(0, 6);
  const dedupedCategories = [...categories];

  if (dedupedTerms.length === 0) {
    return {
      flagged: false,
      categories: [],
      matchedTerms: [],
      reason: null,
    };
  }

  const categoryLabel = dedupedCategories.join(", ");
  const termsLabel = dedupedTerms.join(", ");

  return {
    flagged: true,
    categories: dedupedCategories,
    matchedTerms: dedupedTerms,
    reason: `Automatic moderation flag: ${categoryLabel} detected (${termsLabel}).`,
  };
}
