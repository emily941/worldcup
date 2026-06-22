export interface TeamStats {
  name: string;
  group?: string;
  position?: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  status: "active" | "qualified" | "eliminated";
  currentStage?: string;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED" | "TIMED";
  kickoff: string;
  stage: string;
  group?: string;
  minute?: number;
}

export interface Standings {
  group: string;
  teams: TeamStats[];
}

export interface FootballApiProvider {
  getFixtures(): Promise<Match[]>;
  getLiveMatches(): Promise<Match[]>;
  getTeamMatches(teamName: string): Promise<Match[]>;
  getStandings(): Promise<Standings[]>;
  getMatchById(matchId: string): Promise<Match | null>;
}

// Normalise team names from API to our sweepstake names
const teamNameMap: Record<string, string> = {
  "Côte d'Ivoire": "Ivory Coast",
  "DR Congo": "DRC",
  "Korea Republic": "South Korea",
  "Czech Republic": "Czechia",
  "United States": "USA",
  "Curaçao": "Curacao",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Cape Verde Islands": "Cape Verde",
  "Cabo Verde": "Cape Verde",
  "Congo DR": "DRC",
  "DR Congo": "DRC",
};

export function normaliseTeamName(name: string): string {
  return teamNameMap[name] ?? name;
}

// Real API implementation using football-data.org
class FootballDataOrgProvider implements FootballApiProvider {
  private baseUrl: string;
  private apiKey: string;
  // FIFA World Cup 2026 competition code (to be updated once confirmed)
  private competitionCode = "WC";

  constructor() {
    this.baseUrl = process.env.FOOTBALL_API_BASE_URL ?? "https://api.football-data.org/v4";
    this.apiKey = process.env.FOOTBALL_API_KEY ?? "";
  }

  private async fetch<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { "X-Auth-Token": this.apiKey },
      next: { revalidate: 60 },
    });

    // Respect throttling headers as requested by football-data.org
    const remaining = res.headers.get("X-Requests-Available-Minute");
    const reset = res.headers.get("X-RequestCounter-Reset");
    if (remaining !== null && Number(remaining) <= 1 && reset) {
      const waitMs = (Number(reset) + 1) * 1000;
      console.warn(`[football-api] Rate limit close — waiting ${waitMs}ms before next call`);
      await new Promise((r) => setTimeout(r, waitMs));
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("X-RequestCounter-Reset") ?? 60);
      throw new Error(`Rate limited — retry after ${retryAfter}s`);
    }

    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  }

  async getFixtures(): Promise<Match[]> {
    const data = await this.fetch<{ matches: RawMatch[] }>(
      `/competitions/${this.competitionCode}/matches`
    );
    return data.matches.map(mapMatch);
  }

  async getLiveMatches(): Promise<Match[]> {
    const data = await this.fetch<{ matches: RawMatch[] }>(
      `/competitions/${this.competitionCode}/matches?status=LIVE`
    );
    return data.matches.map(mapMatch);
  }

  async getTeamMatches(teamName: string): Promise<Match[]> {
    const all = await this.getFixtures();
    return all.filter(
      (m) => normaliseTeamName(m.homeTeam) === teamName || normaliseTeamName(m.awayTeam) === teamName
    );
  }

  async getStandings(): Promise<Standings[]> {
    const data = await this.fetch<{ standings: RawStandings[] }>(
      `/competitions/${this.competitionCode}/standings`
    );
    // Status is set to "active" here; the API route will override it after
    // running full scenario enumeration against the fixtures.
    return data.standings.map((s) => ({
      group: s.group ?? s.stage,
      teams: s.table.map((t) => ({
        name: normaliseTeamName(t.team.name),
        group: s.group ?? s.stage,
        position: t.position,
        played: t.playedGames,
        won: t.won,
        drawn: t.draw,
        lost: t.lost,
        goalsFor: t.goalsFor,
        goalsAgainst: t.goalsAgainst,
        points: t.points,
        status: "active" as TeamStats["status"],
      })),
    }));
  }

  async getMatchById(matchId: string): Promise<Match | null> {
    try {
      const data = await this.fetch<{ match: RawMatch }>(`/matches/${matchId}`);
      return mapMatch(data.match);
    } catch {
      return null;
    }
  }
}

// Raw API types
interface RawMatch {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: { fullTime: { home: number | null; away: number | null } };
  status: string;
  utcDate: string;
  stage: string;
  group?: string;
  minute?: number;
}

interface RawStandings {
  stage: string;
  group?: string;
  table: {
    position: number;
    team: { name: string };
    playedGames: number;
    won: number;
    draw: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }[];
}

function mapMatch(m: RawMatch): Match {
  return {
    id: String(m.id),
    homeTeam: normaliseTeamName(m.homeTeam.name),
    awayTeam: normaliseTeamName(m.awayTeam.name),
    homeScore: m.score.fullTime.home,
    awayScore: m.score.fullTime.away,
    status: m.status as Match["status"],
    kickoff: m.utcDate,
    stage: m.stage,
    group: m.group,
    minute: m.minute,
  };
}

// Mock provider for development/demo when no API key is set
export class MockFootballProvider implements FootballApiProvider {
  private matches: Match[] = generateMockMatches();

  async getFixtures(): Promise<Match[]> {
    return this.matches;
  }

  async getLiveMatches(): Promise<Match[]> {
    return this.matches.filter((m) => m.status === "LIVE");
  }

  async getTeamMatches(teamName: string): Promise<Match[]> {
    return this.matches.filter(
      (m) => m.homeTeam === teamName || m.awayTeam === teamName
    );
  }

  async getStandings(): Promise<Standings[]> {
    return generateMockStandings();
  }

  async getMatchById(matchId: string): Promise<Match | null> {
    return this.matches.find((m) => m.id === matchId) ?? null;
  }
}

export function getFootballProvider(): FootballApiProvider {
  if (process.env.FOOTBALL_API_KEY) {
    return new FootballDataOrgProvider();
  }
  return new MockFootballProvider();
}

// ---- Mock data generation ----

function daysFromNow(d: number): string {
  const date = new Date();
  date.setDate(date.getDate() + d);
  return date.toISOString();
}

function generateMockMatches(): Match[] {
  const groups: Record<string, [string, string][]> = {
    "GROUP_A": [["Brazil", "Germany"], ["France", "Argentina"]],
    "GROUP_B": [["Spain", "Portugal"], ["England", "Netherlands"]],
    "GROUP_C": [["Morocco", "Senegal"], ["Ivory Coast", "Ghana"]],
    "GROUP_D": [["USA", "Mexico"], ["Canada", "Japan"]],
    "GROUP_E": [["Belgium", "Croatia"], ["Colombia", "Uruguay"]],
    "GROUP_F": [["South Korea", "Australia"], ["Egypt", "Morocco"]],
  };

  const matches: Match[] = [];
  let id = 1;

  const sweepstakeMatchups: [string, string, string, number, Match["status"], number | null, number | null][] = [
    ["Brazil", "Canada", "GROUP_A", -5, "FINISHED", 3, 0],
    ["Morocco", "Japan", "GROUP_A", -5, "FINISHED", 1, 1],
    ["Germany", "France", "GROUP_A", -3, "FINISHED", 2, 1],
    ["Spain", "Colombia", "GROUP_B", -3, "FINISHED", 2, 0],
    ["Ecuador", "Belgium", "GROUP_B", -2, "FINISHED", 0, 1],
    ["Portugal", "Sweden", "GROUP_C", -2, "FINISHED", 3, 1],
    ["England", "Netherlands", "GROUP_B", -1, "FINISHED", 1, 1],
    ["Argentina", "Switzerland", "GROUP_D", -1, "FINISHED", 2, 0],
    ["USA", "Uzbekistan", "GROUP_E", 0, "LIVE", 1, 0],
    ["Croatia", "Turkey", "GROUP_F", 0, "LIVE", 2, 1],
    ["Brazil", "Morocco", "GROUP_A", 1, "SCHEDULED", null, null],
    ["Japan", "Canada", "GROUP_A", 1, "SCHEDULED", null, null],
    ["Spain", "Ecuador", "GROUP_B", 2, "SCHEDULED", null, null],
    ["Belgium", "Colombia", "GROUP_B", 2, "SCHEDULED", null, null],
    ["Germany", "Argentina", "GROUP_A", 3, "SCHEDULED", null, null],
    ["France", "Brazil", "GROUP_A", 4, "SCHEDULED", null, null],
    ["South Korea", "Ghana", "GROUP_C", 4, "SCHEDULED", null, null],
    ["Scott and Iran", "Scotland", "GROUP_D", 5, "SCHEDULED", null, null],
    ["Norway", "DRC", "GROUP_C", 5, "SCHEDULED", null, null],
    ["Ivory Coast", "Senegal", "GROUP_C", 6, "SCHEDULED", null, null],
  ];

  for (const [home, away, group, dayOffset, status, homeScore, awayScore] of sweepstakeMatchups) {
    matches.push({
      id: String(id++),
      homeTeam: home,
      awayTeam: away,
      homeScore,
      awayScore,
      status,
      kickoff: daysFromNow(dayOffset),
      stage: "GROUP_STAGE",
      group,
      minute: status === "LIVE" ? 67 : undefined,
    });
  }

  return matches;
}

function generateMockStandings(): Standings[] {
  return [
    {
      group: "GROUP_A",
      teams: [
        { name: "Brazil", group: "GROUP_A", position: 1, played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 5, goalsAgainst: 1, points: 6, status: "active" },
        { name: "Germany", group: "GROUP_A", position: 2, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 3, goalsAgainst: 2, points: 3, status: "active" },
        { name: "France", group: "GROUP_A", position: 3, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 2, goalsAgainst: 3, points: 3, status: "active" },
        { name: "Morocco", group: "GROUP_A", position: 4, played: 2, won: 0, drawn: 1, lost: 1, goalsFor: 1, goalsAgainst: 4, points: 1, status: "active" },
        { name: "Japan", group: "GROUP_A", position: 5, played: 2, won: 0, drawn: 1, lost: 1, goalsFor: 1, goalsAgainst: 3, points: 1, status: "active" },
        { name: "Canada", group: "GROUP_A", position: 6, played: 2, won: 0, drawn: 1, lost: 1, goalsFor: 0, goalsAgainst: 4, points: 1, status: "active" },
      ],
    },
    {
      group: "GROUP_B",
      teams: [
        { name: "Spain", group: "GROUP_B", position: 1, played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 4, goalsAgainst: 1, points: 6, status: "active" },
        { name: "England", group: "GROUP_B", position: 2, played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 2, goalsAgainst: 1, points: 4, status: "active" },
        { name: "Netherlands", group: "GROUP_B", position: 3, played: 2, won: 0, drawn: 1, lost: 1, goalsFor: 1, goalsAgainst: 2, points: 1, status: "active" },
        { name: "Belgium", group: "GROUP_B", position: 4, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 2, goalsAgainst: 2, points: 3, status: "active" },
        { name: "Colombia", group: "GROUP_B", position: 5, played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 0, goalsAgainst: 3, points: 0, status: "active" },
        { name: "Ecuador", group: "GROUP_B", position: 6, played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 0, goalsAgainst: 2, points: 0, status: "active" },
      ],
    },
    {
      group: "GROUP_C",
      teams: [
        { name: "Portugal", group: "GROUP_C", position: 1, played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 5, goalsAgainst: 1, points: 6, status: "active" },
        { name: "Sweden", group: "GROUP_C", position: 2, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 2, goalsAgainst: 3, points: 3, status: "active" },
        { name: "Senegal", group: "GROUP_C", position: 3, played: 2, won: 0, drawn: 1, lost: 1, goalsFor: 1, goalsAgainst: 2, points: 1, status: "active" },
        { name: "Ivory Coast", group: "GROUP_C", position: 4, played: 2, won: 0, drawn: 1, lost: 1, goalsFor: 1, goalsAgainst: 3, points: 1, status: "active" },
      ],
    },
    {
      group: "GROUP_D",
      teams: [
        { name: "Argentina", group: "GROUP_D", position: 1, played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 4, goalsAgainst: 0, points: 6, status: "active" },
        { name: "USA", group: "GROUP_D", position: 2, played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 1, goalsAgainst: 1, points: 1, status: "active" },
        { name: "Switzerland", group: "GROUP_D", position: 3, played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 0, goalsAgainst: 4, points: 0, status: "active" },
        { name: "Uzbekistan", group: "GROUP_D", position: 4, played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 1, goalsAgainst: 1, points: 1, status: "active" },
      ],
    },
    {
      group: "GROUP_E",
      teams: [
        { name: "Croatia", group: "GROUP_E", position: 1, played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 2, goalsAgainst: 2, points: 1, status: "active" },
        { name: "Turkey", group: "GROUP_E", position: 2, played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 2, goalsAgainst: 2, points: 1, status: "active" },
        { name: "South Korea", group: "GROUP_E", position: 3, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 1, points: 0, status: "active" },
        { name: "Ghana", group: "GROUP_E", position: 4, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 1, goalsAgainst: 0, points: 3, status: "active" },
      ],
    },
    {
      group: "GROUP_F",
      teams: [
        { name: "Egypt", group: "GROUP_F", position: 1, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0, points: 3, status: "active" },
        { name: "Norway", group: "GROUP_F", position: 2, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 1, goalsAgainst: 0, points: 3, status: "active" },
        { name: "DRC", group: "GROUP_F", position: 3, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 1, points: 0, status: "active" },
        { name: "Haiti", group: "GROUP_F", position: 4, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 2, points: 0, status: "active" },
      ],
    },
  ];
}
