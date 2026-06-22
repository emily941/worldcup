import { NextResponse } from "next/server";
import { getFootballProvider } from "@/lib/football-api";
import { calculateParticipantScores } from "@/lib/scoring";
import { computeGroupStatuses } from "@/lib/group-status";

interface CachedPayload {
  fixtures: Awaited<ReturnType<ReturnType<typeof getFootballProvider>["getFixtures"]>>;
  standings: Awaited<ReturnType<ReturnType<typeof getFootballProvider>["getStandings"]>>;
  liveMatches: CachedPayload["fixtures"];
  participantScores: ReturnType<typeof calculateParticipantScores>;
  updatedAt: string;
}

// In-memory cache — persists across requests within the same server process
let cache: { data: CachedPayload; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // re-fetch at most once per minute

export async function GET() {
  const now = Date.now();

  // Return cached data if still fresh
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  try {
    const provider = getFootballProvider();
    const [fixtures, standings] = await Promise.all([
      provider.getFixtures(),
      provider.getStandings(),
    ]);

    const liveMatches = fixtures.filter((m) => m.status === "LIVE");

    // Enumerate all remaining match outcomes to classify group-stage status correctly
    const groupStatuses = computeGroupStatuses(standings, fixtures);

    // Merge computed statuses back into standings (mutate copies, not the originals)
    const standingsWithStatus = standings.map((group) => ({
      ...group,
      teams: group.teams.map((team) => ({
        ...team,
        status: groupStatuses.get(team.name) ?? team.status,
      })),
    }));

    const participantScores = calculateParticipantScores(fixtures, standingsWithStatus);

    const data: CachedPayload = {
      fixtures,
      standings: standingsWithStatus,
      liveMatches,
      participantScores,
      updatedAt: new Date().toISOString(),
    };

    cache = { data, fetchedAt: now };
    return NextResponse.json(data);
  } catch (err) {
    console.error("Football API error:", err);

    // Return stale cache rather than a hard 500 if we have it
    if (cache) {
      console.warn("Returning stale cache due to API error");
      return NextResponse.json(cache.data);
    }

    return NextResponse.json({ error: "Failed to fetch football data" }, { status: 500 });
  }
}
