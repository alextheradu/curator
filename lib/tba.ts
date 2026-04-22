import "server-only";

import { parseSeasonYearsFromText } from "@/lib/seasons";
import type { Citation } from "@/lib/db/schema";
import { callTbaTool } from "@/lib/tba-mcp-client";

type TbaContext = {
  contextBlock: string;
  citations: Citation[];
  directAnswer?: string;
};

interface TbaStatusOptions {
  onStatus?: (message: string) => void;
  userTeamNumber?: number | null;
}

const TEAM_PATTERN = /\b(?:team|frc)\s*#?\s*(\d{1,5})\b/i;
const EVENT_KEY_PATTERN = /\b(20\d{2}[a-z0-9]{4,})\b/i;
const MATCH_KEY_PATTERN = /\b(20\d{2}[a-z0-9]{4,}_(?:qm|ef|qf|sf|f)\d+m\d+)\b/i;

const TBA_HINTS = [
  "the blue alliance",
  "tba",
  "winner",
  "won",
  "champion",
  "champions",
  "ranking",
  "rankings",
  "record",
  "schedule",
  "match",
  "matches",
  "event",
  "district",
  "regional",
  "dcmp",
  "alliance selection",
  "playoffs",
  "qualifications",
  "qualified",
  "wins",
  "losses",
];

export function shouldRunTbaLookup(query: string) {
  const lower = query.toLowerCase();

  if (MATCH_KEY_PATTERN.test(query) || EVENT_KEY_PATTERN.test(query)) {
    return true;
  }

  if (TEAM_PATTERN.test(query) && TBA_HINTS.some((hint) => lower.includes(hint))) {
    return true;
  }

  if (TBA_HINTS.some((hint) => lower.includes(hint))) {
    return true;
  }

  if (/\bfma\b|\bdcmp\b|\bregional\b|\bdistrict championship\b|\bchampionship\b/.test(lower)) {
    return true;
  }

  return lower.includes("the blue alliance") || lower.includes(" tba ");
}

export function isTbaMcpEnabled() {
  const raw = process.env.TBA_MCP_ENABLED?.trim().toLowerCase();

  if (!raw) {
    return false;
  }

  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function getTeamKey(teamNumber: number) {
  return `frc${teamNumber}`;
}

function getTeamUrl(teamNumber: number) {
  return `https://www.thebluealliance.com/team/${getTeamKey(teamNumber)}`;
}

function getEventUrl(eventKey: string) {
  return `https://www.thebluealliance.com/event/${eventKey}`;
}

function getMatchUrl(matchKey: string) {
  return `https://www.thebluealliance.com/match/${matchKey}`;
}

function stripFrcPrefix(value: string) {
  return value.replace(/^frc/i, "");
}

function formatTeamKey(value: unknown) {
  return typeof value === "string" ? stripFrcPrefix(value) : "unknown";
}

function normalizeNickname(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const nickname = value.trim();
  if (!nickname) {
    return "";
  }

  const hasLetters = /[A-Z]/.test(nickname);
  if (hasLetters && nickname === nickname.toUpperCase()) {
    return nickname
      .toLowerCase()
      .replace(/\b([a-z])/g, (_, letter: string) => letter.toUpperCase());
  }

  return nickname;
}

function formatTeamDisplay(team: { key?: unknown; team_number?: unknown; nickname?: unknown }) {
  const teamNumber = typeof team.team_number === "number"
    ? String(team.team_number)
    : formatTeamKey(team.key);
  const nickname = normalizeNickname(team.nickname);

  return nickname ? `${teamNumber} ${nickname}` : teamNumber;
}

function formatDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate) {
    return "Date unavailable";
  }

  if (!endDate || endDate === startDate) {
    return startDate;
  }

  return `${startDate} to ${endDate}`;
}

function summarizeTeam(team: Record<string, unknown>) {
  const location = [team.city, team.state_prov, team.country].filter(Boolean).join(", ");

  return [
    `Key: ${team.key ?? "unknown"}`,
    `Nickname: ${team.nickname ?? "unknown"}`,
    `Location: ${location || "unknown"}`,
    `Rookie year: ${team.rookie_year ?? "unknown"}`,
    `Website: ${team.website ?? "none"}`,
  ].join("\n");
}

function summarizeTeamEvents(events: Array<Record<string, unknown>>) {
  if (events.length === 0) {
    return "No events found.";
  }

  return events.slice(0, 8).map((event, index) => {
    const location = [event.city, event.state_prov, event.country].filter(Boolean).join(", ");
    return `${index + 1}. ${event.name ?? event.key} (${event.key}) - ${formatDateRange(
      event.start_date as string | null | undefined,
      event.end_date as string | null | undefined,
    )} - ${location || "location unavailable"}`;
  }).join("\n");
}

function summarizeEvent(event: Record<string, unknown>) {
  const location = [
    event.city,
    event.state_prov,
    event.country,
  ].filter(Boolean).join(", ");

  return [
    `Key: ${event.key ?? "unknown"}`,
    `Name: ${event.name ?? "unknown"}`,
    `Dates: ${formatDateRange(
      event.start_date as string | null | undefined,
      event.end_date as string | null | undefined,
    )}`,
    `Week: ${event.week ?? "unknown"}`,
    `Event type: ${event.event_type_string ?? event.event_type ?? "unknown"}`,
    `Location: ${location || "unknown"}`,
  ].join("\n");
}

function summarizeWinningAlliance(alliances: Array<Record<string, unknown>>) {
  const winner = alliances.find((alliance) => {
    const status = alliance.status as Record<string, unknown> | undefined;
    return status?.status === "won";
  });

  if (!winner) {
    return "No winning alliance available.";
  }

  const picks = Array.isArray(winner.picks)
    ? winner.picks.map((teamKey) => formatTeamKey(teamKey)).join(", ")
    : "unknown teams";
  const status = winner.status as Record<string, unknown> | undefined;
  const record = status?.record as Record<string, unknown> | undefined;
  const recordLabel = record
    ? `${record.wins ?? 0}-${record.losses ?? 0}-${record.ties ?? 0}`
    : "record unavailable";

  return [
    `Winning alliance: ${winner.name ?? "unknown"}`,
    `Teams: ${picks}`,
    `Playoff record: ${recordLabel}`,
  ].join("\n");
}

function summarizeRankings(data: Record<string, unknown>, targetTeamKey?: string) {
  const rankings = Array.isArray(data.rankings) ? data.rankings as Array<Record<string, unknown>> : [];

  if (rankings.length === 0) {
    return "No rankings available.";
  }

  const topRows = rankings.slice(0, 10).map((row) => {
    const record = row.record as { wins?: number; losses?: number; ties?: number } | undefined;
    const recordLabel = record
      ? `${record.wins ?? 0}-${record.losses ?? 0}-${record.ties ?? 0}`
      : "record unavailable";

    return `${row.rank}. ${formatTeamKey(row.team_key)} (${recordLabel})`;
  });

  const targetRow = targetTeamKey
    ? rankings.find((row) => row.team_key === targetTeamKey)
    : null;

  const targetSummary = targetRow
    ? `\nTarget team: ${targetRow.rank}. ${formatTeamKey(targetRow.team_key)}`
    : "";

  return `Top rankings:\n${topRows.join("\n")}${targetSummary}`;
}

function summarizeMatches(matches: Array<Record<string, unknown>>, targetTeamKey?: string) {
  if (matches.length === 0) {
    return "No matches available.";
  }

  const filteredMatches = targetTeamKey
    ? matches.filter((match) => {
        const alliances = match.alliances as
          | {
              blue?: { team_keys?: string[] };
              red?: { team_keys?: string[] };
            }
          | undefined;
        const teams = [
          ...(alliances?.blue?.team_keys ?? []),
          ...(alliances?.red?.team_keys ?? []),
        ];
        return teams.includes(targetTeamKey);
      })
    : matches;

  const sorted = [...filteredMatches].sort((a, b) => {
    const aTime = Number(a.predicted_time ?? a.time ?? a.actual_time ?? 0);
    const bTime = Number(b.predicted_time ?? b.time ?? b.actual_time ?? 0);
    return aTime - bTime;
  });

  return sorted.slice(0, 10).map((match) => {
    const alliances = match.alliances as
      | {
          blue?: { team_keys?: string[]; score?: number };
          red?: { team_keys?: string[]; score?: number };
        }
      | undefined;
    const label = `${String(match.comp_level).toUpperCase()} ${match.set_number ?? 1}-${match.match_number ?? "?"}`;
    const redTeams = (alliances?.red?.team_keys ?? []).map((teamKey) => formatTeamKey(teamKey)).join(", ");
    const blueTeams = (alliances?.blue?.team_keys ?? []).map((teamKey) => formatTeamKey(teamKey)).join(", ");
    return `${label}: red ${alliances?.red?.score ?? "?"} (${redTeams}) vs blue ${alliances?.blue?.score ?? "?"} (${blueTeams})`;
  }).join("\n");
}

function summarizeTeamEventStatus(status: Record<string, unknown>) {
  const qual = status.qual as Record<string, unknown> | undefined;
  const playoff = status.playoff as Record<string, unknown> | undefined;
  const alliance = playoff?.current_level_record as Record<string, unknown> | undefined;

  return [
    `Overall status: ${status.overall_status_str ?? "unknown"}`,
    `Qualification status: ${qual?.status ?? "unknown"}`,
    `Playoff status: ${playoff?.status ?? "unknown"}`,
    alliance
      ? `Current playoff record: ${alliance.wins ?? 0}-${alliance.losses ?? 0}-${alliance.ties ?? 0}`
      : null,
  ].filter(Boolean).join("\n");
}

function summarizeMatch(match: Record<string, unknown>) {
  const alliances = match.alliances as
    | {
        blue?: { team_keys?: string[]; score?: number };
        red?: { team_keys?: string[]; score?: number };
      }
    | undefined;

  return [
    `Key: ${match.key ?? "unknown"}`,
    `Event: ${match.event_key ?? "unknown"}`,
    `Level: ${String(match.comp_level).toUpperCase()} ${match.set_number ?? 1}-${match.match_number ?? "?"}`,
    `Red: ${alliances?.red?.score ?? "?"} (${(alliances?.red?.team_keys ?? []).map((teamKey) => formatTeamKey(teamKey)).join(", ")})`,
    `Blue: ${alliances?.blue?.score ?? "?"} (${(alliances?.blue?.team_keys ?? []).map((teamKey) => formatTeamKey(teamKey)).join(", ")})`,
  ].join("\n");
}

function makeContext(title: string, body: string) {
  return `\n\nCurrent The Blue Alliance data for this question (use this for live team, event, match, and rankings facts and cite it as [TBA 1]):\n[TBA 1] ${title}\n${body}`;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getQuerySeasonYear(query: string, fallbackYear: number) {
  return parseSeasonYearsFromText(query)[0] ?? fallbackYear;
}

function scoreEventMatch(query: string, event: Record<string, unknown>) {
  const normalizedQuery = normalizeText(query);
  const district = event.district as Record<string, unknown> | undefined;
  const haystack = normalizeText([
    event.key,
    event.name,
    event.event_code,
    district?.abbreviation,
    district?.display_name,
  ].filter(Boolean).join(" "));

  let score = 0;

  for (const token of normalizedQuery.split(/\s+/)) {
    if (!token) {
      continue;
    }

    if (haystack.includes(token)) {
      score += token.length <= 3 ? 2 : 4;
    }
  }

  if (/\bdcmp\b|district championship/.test(normalizedQuery)) {
    if (Number(event.event_type) === 2) {
      score += 8;
    }
    if (haystack.includes("district championship")) {
      score += 8;
    }
  }

  if (/\bcmp\b|championship/.test(normalizedQuery) && haystack.includes("championship")) {
    score += 4;
  }

  return score;
}

async function resolveEventKeyFromQuery(query: string, fallbackYear: number) {
  const year = getQuerySeasonYear(query, fallbackYear);
  const { data } = await callTbaTool<Array<Record<string, unknown>>>("get_events_by_year", { year });
  const scored = data
    .map((event) => ({ event, score: scoreEventMatch(query, event) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.event.key as string | undefined;
}

async function getTeamDisplays(teamKeys: string[]) {
  const teams = await Promise.all(teamKeys.map(async (teamKey) => {
    const { data } = await callTbaTool<Record<string, unknown>>("get_team", { team: teamKey });
    return {
      key: teamKey,
      display: formatTeamDisplay(data),
    };
  }));

  return teams;
}

function buildWinningAllianceSentence(
  eventName: string,
  winnerLabel: string | undefined,
  teamDisplays: string[],
) {
  if (teamDisplays.length === 0) {
    return `${eventName} was won by the winning alliance. [TBA 1]`;
  }

  const [captain, ...partners] = teamDisplays;
  const allianceText = winnerLabel?.trim() || "the winning alliance";
  const isAllianceLabel = /^alliance\s+\d+$/i.test(allianceText);

  if (partners.length === 0) {
    return isAllianceLabel
      ? `${eventName} was won by ${captain}, who captained ${allianceText}. [TBA 1]`
      : `${eventName} was won by ${captain} on ${allianceText}. [TBA 1]`;
  }

  const partnerText = partners.length === 1
    ? partners[0]
    : partners.length === 2
      ? `${partners[0]} and ${partners[1]}`
      : `${partners.slice(0, -1).join(", ")}, and ${partners.at(-1)}`;

  return isAllianceLabel
    ? `${eventName} was won by ${captain}, who led ${allianceText} with ${partnerText}. [TBA 1]`
    : `${eventName} was won by ${captain} with ${partnerText} on ${allianceText}. [TBA 1]`;
}

function parseTbaDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCurrentOrLatestTeamEvent(events: Array<Record<string, unknown>>) {
  if (events.length === 0) {
    return null;
  }

  const now = new Date();
  const current = events.find((event) => {
    const start = parseTbaDate(event.start_date as string | null | undefined);
    const end = parseTbaDate(event.end_date as string | null | undefined) ?? start;

    if (!start || !end) {
      return false;
    }

    return start <= now && end >= now;
  });

  if (current) {
    return current;
  }

  const past = [...events]
    .filter((event) => {
      const end = parseTbaDate(event.end_date as string | null | undefined);
      return end != null && end <= now;
    })
    .sort((a, b) => {
      const aTime = parseTbaDate(a.end_date as string | null | undefined)?.getTime() ?? 0;
      const bTime = parseTbaDate(b.end_date as string | null | undefined)?.getTime() ?? 0;
      return bTime - aTime;
    });

  if (past[0]) {
    return past[0];
  }

  return [...events].sort((a, b) => {
    const aTime = parseTbaDate(a.start_date as string | null | undefined)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = parseTbaDate(b.start_date as string | null | undefined)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  })[0] ?? null;
}

function summarizeCurrentTeamContext(
  event: Record<string, unknown>,
  status: Record<string, unknown>,
  rankings: Record<string, unknown>,
  matches: Array<Record<string, unknown>>,
  teamKey: string,
) {
  return [
    `Current event: ${event.name ?? event.key} (${event.key ?? "unknown"})`,
    `Dates: ${formatDateRange(
      event.start_date as string | null | undefined,
      event.end_date as string | null | undefined,
    )}`,
    "",
    summarizeTeamEventStatus(status),
    "",
    summarizeRankings(rankings, teamKey),
    "",
    `Recent and upcoming matches for ${formatTeamKey(teamKey)}:`,
    summarizeMatches(matches, teamKey),
  ].join("\n");
}

export async function buildTbaContext(
  query: string,
  seasonYear: number,
  options?: TbaStatusOptions,
): Promise<TbaContext> {
  const onStatus = options?.onStatus;

  if (!isTbaMcpEnabled() || !shouldRunTbaLookup(query)) {
    return { contextBlock: "", citations: [] };
  }

  const lower = query.toLowerCase();
  const teamMatch = query.match(TEAM_PATTERN);
  const eventMatch = query.match(EVENT_KEY_PATTERN);
  const matchKeyMatch = query.match(MATCH_KEY_PATTERN);

  const explicitTeamNumber = teamMatch ? Number(teamMatch[1]) : null;
  const teamNumber = explicitTeamNumber ?? options?.userTeamNumber ?? null;
  const teamKey = teamNumber ? getTeamKey(teamNumber) : null;
  let eventKey = eventMatch?.[1]?.toLowerCase() ?? null;
  const matchKey = matchKeyMatch?.[1]?.toLowerCase() ?? null;

  try {
    if (!eventKey && /district|regional|championship|dcmp|cmp|event/i.test(lower)) {
      onStatus?.(`Matching your question to a ${seasonYear} event on The Blue Alliance...`);
      eventKey = (await resolveEventKeyFromQuery(query, seasonYear)) ?? null;
    }

    if (!eventKey && explicitTeamNumber == null && teamNumber && !matchKey) {
      onStatus?.(`Finding team ${teamNumber}'s current ${seasonYear} event on The Blue Alliance...`);
      const { data: teamEvents } = await callTbaTool<Array<Record<string, unknown>>>("get_team_events", {
        team: String(teamNumber),
        year: seasonYear,
      });
      const currentEvent = getCurrentOrLatestTeamEvent(teamEvents);

      if (currentEvent?.key && teamKey) {
        const currentEventKey = String(currentEvent.key);
        onStatus?.(`Fetching current event context for team ${teamNumber}...`);
        const [{ data: status }, { data: rankings }, { data: matches }] = await Promise.all([
          callTbaTool<Record<string, unknown>>("get_team_event_status", {
            team: String(teamNumber),
            event: currentEventKey,
          }),
          callTbaTool<Record<string, unknown>>("get_event_rankings", { event: currentEventKey }),
          callTbaTool<Array<Record<string, unknown>>>("get_event_matches", { event: currentEventKey }),
        ]);

        return {
          contextBlock: makeContext(
            `Current event context for team ${teamNumber}`,
            summarizeCurrentTeamContext(currentEvent, status, rankings, matches, teamKey),
          ),
          citations: [{ type: "web", label: "thebluealliance.com", url: getEventUrl(currentEventKey) }],
        };
      }
    }

    if (matchKey) {
      onStatus?.(`Fetching match ${matchKey} from The Blue Alliance...`);
      const { data } = await callTbaTool<Record<string, unknown>>("get_match", { match: matchKey });
      return {
        contextBlock: makeContext(`Match ${matchKey}`, summarizeMatch(data)),
        citations: [{ type: "web", label: "thebluealliance.com", url: getMatchUrl(matchKey) }],
      };
    }

    if (teamNumber && eventKey) {
      if (lower.includes("rank")) {
        onStatus?.(`Fetching rankings for ${eventKey} from The Blue Alliance...`);
        const { data } = await callTbaTool<Record<string, unknown>>("get_event_rankings", { event: eventKey });
        return {
          contextBlock: makeContext(`Rankings for ${eventKey}`, summarizeRankings(data, teamKey ?? undefined)),
          citations: [{ type: "web", label: "thebluealliance.com", url: getEventUrl(eventKey) }],
        };
      }

      onStatus?.(`Fetching team ${teamNumber}'s status for ${eventKey} from The Blue Alliance...`);
      const { data } = await callTbaTool<Record<string, unknown>>("get_team_event_status", {
        team: String(teamNumber),
        event: eventKey,
      });

      return {
        contextBlock: makeContext(`Status for team ${teamNumber} at ${eventKey}`, summarizeTeamEventStatus(data)),
        citations: [{ type: "web", label: "thebluealliance.com", url: getEventUrl(eventKey) }],
      };
    }

    if (eventKey) {
      if (lower.includes("who won") || lower.includes("winner") || lower.includes("won ") || lower.includes("champion")) {
        onStatus?.(`Fetching playoff alliances for ${eventKey} from The Blue Alliance...`);
        const [{ data: alliances }, { data: event }] = await Promise.all([
          callTbaTool<Array<Record<string, unknown>>>("get_event_alliances", { event: eventKey }),
          callTbaTool<Record<string, unknown>>("get_event", { event: eventKey }),
        ]);
        const winner = alliances.find((alliance) => {
          const status = alliance.status as Record<string, unknown> | undefined;
          return status?.status === "won";
        });
        const winnerTeamKeys = Array.isArray(winner?.picks)
          ? winner.picks.filter((pick): pick is string => typeof pick === "string")
          : [];
        const winnerLabel = typeof winner?.name === "string" ? winner.name : "Winning alliance";
        const eventName = String(event.name ?? eventKey);
        onStatus?.("Resolving team names for the winning alliance...");
        const teamDisplays = await getTeamDisplays(winnerTeamKeys);

        return {
          contextBlock: makeContext(`Winning alliance for ${eventKey}`, summarizeWinningAlliance(alliances)),
          citations: [{ type: "web", label: "thebluealliance.com", url: getEventUrl(eventKey) }],
          directAnswer: buildWinningAllianceSentence(
            eventName,
            winnerLabel,
            teamDisplays.map((team) => team.display),
          ),
        };
      }

      if (lower.includes("rank")) {
        onStatus?.(`Fetching rankings for ${eventKey} from The Blue Alliance...`);
        const { data } = await callTbaTool<Record<string, unknown>>("get_event_rankings", { event: eventKey });
        return {
          contextBlock: makeContext(`Rankings for ${eventKey}`, summarizeRankings(data)),
          citations: [{ type: "web", label: "thebluealliance.com", url: getEventUrl(eventKey) }],
        };
      }

      if (lower.includes("match") || lower.includes("schedule")) {
        onStatus?.(`Fetching match schedule for ${eventKey} from The Blue Alliance...`);
        const { data } = await callTbaTool<Array<Record<string, unknown>>>("get_event_matches", { event: eventKey });
        return {
          contextBlock: makeContext(`Matches for ${eventKey}`, summarizeMatches(data)),
          citations: [{ type: "web", label: "thebluealliance.com", url: getEventUrl(eventKey) }],
        };
      }

      onStatus?.(`Fetching event details for ${eventKey} from The Blue Alliance...`);
      const { data } = await callTbaTool<Record<string, unknown>>("get_event", { event: eventKey });
      return {
        contextBlock: makeContext(`Event ${eventKey}`, summarizeEvent(data)),
        citations: [{ type: "web", label: "thebluealliance.com", url: getEventUrl(eventKey) }],
      };
    }

    if (teamNumber) {
      if (
        lower.includes("event")
        || lower.includes("schedule")
        || lower.includes("attending")
        || lower.includes("going to")
        || lower.includes("competing at")
      ) {
        onStatus?.(`Fetching team ${teamNumber}'s ${seasonYear} event list from The Blue Alliance...`);
        const { data } = await callTbaTool<Array<Record<string, unknown>>>("get_team_events", {
          team: String(teamNumber),
          year: seasonYear,
        });
        return {
          contextBlock: makeContext(`Events for team ${teamNumber} in ${seasonYear}`, summarizeTeamEvents(data)),
          citations: [{ type: "web", label: "thebluealliance.com", url: getTeamUrl(teamNumber) }],
        };
      }

      onStatus?.(`Fetching team ${teamNumber} from The Blue Alliance...`);
      const { data } = await callTbaTool<Record<string, unknown>>("get_team", { team: String(teamNumber) });
      return {
        contextBlock: makeContext(`Team ${teamNumber}`, summarizeTeam(data)),
        citations: [{ type: "web", label: "thebluealliance.com", url: getTeamUrl(teamNumber) }],
      };
    }
  } catch (error) {
    console.error("TBA lookup failed:", error);
  }

  return { contextBlock: "", citations: [] };
}
