import { Match, Standings, TeamStats } from "./football-api";

interface TeamState {
  points: number;
  gd: number;
  gf: number;
}

function sortTable(entries: { name: string; state: TeamState }[]) {
  return [...entries].sort((a, b) => {
    if (b.state.points !== a.state.points) return b.state.points - a.state.points;
    if (b.state.gd !== a.state.gd) return b.state.gd - a.state.gd;
    return b.state.gf - a.state.gf;
  });
}

/**
 * For each group, enumerate every possible outcome of remaining matches
 * and tally how many scenarios each team finishes in the top 2.
 *
 * Result per team:
 *   "qualified"  – top 2 in every scenario
 *   "eliminated" – outside top 2 in every scenario
 *   "active"     – can finish either way depending on results
 */
export function computeGroupStatuses(
  standings: Standings[],
  fixtures: Match[]
): Map<string, TeamStats["status"]> {
  const result = new Map<string, TeamStats["status"]>();

  for (const group of standings) {
    // Normalise the group label so we can match it against fixture group fields
    // API returns e.g. "GROUP_A" or "Group A" – fixtures use "GROUP_A"
    const groupLabel = group.group;
    const groupTeamNames = new Set(group.teams.map((t) => t.name));

    // Remaining unplayed matches that belong to this group and involve these teams
    const remaining = fixtures.filter(
      (m) =>
        (m.status === "SCHEDULED" || m.status === "TIMED") &&
        groupTeamNames.has(m.homeTeam) &&
        groupTeamNames.has(m.awayTeam) &&
        (m.group === groupLabel ||
          m.group === groupLabel.replace("Group ", "GROUP_") ||
          m.group === groupLabel.replace("GROUP_", "Group "))
    );

    // Base state from current standings
    const base = new Map<string, TeamState>(
      group.teams.map((t) => [
        t.name,
        {
          points: t.points,
          gd: t.goalsFor - t.goalsAgainst,
          gf: t.goalsFor,
        },
      ])
    );

    const n = remaining.length;
    const totalScenarios = Math.pow(3, n); // 3 outcomes per match: home win / draw / away win

    // Count how many scenarios each team finishes in top 2
    const top2Count = new Map<string, number>(group.teams.map((t) => [t.name, 0]));

    for (let s = 0; s < totalScenarios; s++) {
      // Clone base state
      const state = new Map<string, TeamState>(
        [...base.entries()].map(([k, v]) => [k, { ...v }])
      );

      let encoded = s;
      for (const match of remaining) {
        const outcome = encoded % 3;
        encoded = Math.floor(encoded / 3);

        const home = state.get(match.homeTeam);
        const away = state.get(match.awayTeam);
        if (!home || !away) continue;

        // Use a representative scoreline so GD/GF tiebreakers are realistic
        if (outcome === 0) {
          // Home win 1–0
          home.points += 3;
          home.gd += 1; home.gf += 1;
          away.gd -= 1;
        } else if (outcome === 1) {
          // Draw 1–1
          home.points += 1; away.points += 1;
          home.gd += 0; home.gf += 1;
          away.gd += 0; away.gf += 1;
        } else {
          // Away win 0–1
          away.points += 3;
          away.gd += 1; away.gf += 1;
          home.gd -= 1;
        }
      }

      // Sort the final table for this scenario
      const sorted = sortTable(
        group.teams.map((t) => ({ name: t.name, state: state.get(t.name)! }))
      );

      // Credit the top 2 finishers
      sorted.slice(0, 2).forEach(({ name }) => {
        top2Count.set(name, (top2Count.get(name) ?? 0) + 1);
      });
    }

    // Classify each team
    for (const team of group.teams) {
      const inTop2 = top2Count.get(team.name) ?? 0;
      let status: TeamStats["status"];
      if (team.played === 0) {
        status = "active"; // haven't kicked off yet
      } else if (inTop2 === totalScenarios) {
        status = "qualified";
      } else if (inTop2 === 0) {
        status = "eliminated";
      } else {
        status = "active";
      }
      result.set(team.name, status);
    }
  }

  return result;
}
