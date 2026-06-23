import { SCORING_CONFIG } from "./scoring-config";
import { participants, Participant } from "./sweepstake-data";
import { Match, Standings, TeamStats } from "./football-api";

export interface TeamScore {
  teamName: string;
  matchPoints: number;
  goalPoints: number;
  progressionPoints: number;
  totalPoints: number;
  goalsScored: number;
  stats?: TeamStats;
}

export interface ParticipantScore {
  participant: Participant;
  teams: TeamScore[];
  totalPoints: number;
  totalGoals: number;
  teamsAlive: number;
  teamsQualified: number;
}

function stageProgressionPoints(stage: string): number {
  if (stage.includes("FINAL") && !stage.includes("SEMI") && !stage.includes("QUARTER")) {
    return SCORING_CONFIG.final;
  }
  if (stage.includes("SEMI")) return SCORING_CONFIG.semiFinal;
  if (stage.includes("QUARTER")) return SCORING_CONFIG.quarterFinal;
  if (stage.includes("LAST_16") || stage.includes("ROUND_OF_16")) return SCORING_CONFIG.roundOf16;
  if (stage.includes("LAST_32") || stage.includes("ROUND_OF_32")) return SCORING_CONFIG.qualifyGroupStage;
  return 0;
}

export function calculateTeamScore(
  teamName: string,
  matches: Match[],
  allStandings: Standings[]
): TeamScore {
  const teamMatches = matches.filter(
    (m) =>
      (m.homeTeam === teamName || m.awayTeam === teamName) &&
      m.status === "FINISHED" &&
      m.homeScore !== null &&
      m.awayScore !== null
  );

  let matchPoints = 0;
  let goalPoints = 0;
  let goalsScored = 0;

  for (const match of teamMatches) {
    const isHome = match.homeTeam === teamName;
    const scored = isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0);
    const conceded = isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0);

    goalsScored += scored;
    goalPoints += scored * SCORING_CONFIG.goalScored;

    if (scored > conceded) matchPoints += SCORING_CONFIG.win;
    else if (scored === conceded) matchPoints += SCORING_CONFIG.draw;
  }

  // Progression points — only awarded once a team is knocked out or wins
  const knockoutMatches = matches.filter(
    (m) =>
      (m.homeTeam === teamName || m.awayTeam === teamName) &&
      !m.stage.includes("GROUP")
  );

  let progressionPoints = 0;

  // Find the finished knockout matches where the team was knocked out or won
  const finishedKnockout = knockoutMatches.filter((m) => m.status === "FINISHED");

  // Group stage qualification bonus: earned once they have played a finished knockout match
  if (finishedKnockout.length > 0) {
    progressionPoints = SCORING_CONFIG.qualifyGroupStage;
  }

  for (const m of finishedKnockout) {
    const isHome = m.homeTeam === teamName;
    const scored = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const conceded = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
    const won = scored > conceded;

    if (won && m.stage.includes("FINAL") && !m.stage.includes("SEMI") && !m.stage.includes("QUARTER")) {
      // Won the final — tournament winner
      progressionPoints = SCORING_CONFIG.winTournament;
    } else if (!won) {
      // Knocked out here — award points for this stage if it's the highest
      const pts = stageProgressionPoints(m.stage);
      if (pts > progressionPoints) {
        progressionPoints = pts;
      }
    }
  }

  // Find team stats from standings
  let stats: TeamStats | undefined;
  for (const standing of allStandings) {
    const found = standing.teams.find((t) => t.name === teamName);
    if (found) {
      stats = { ...found };
      break;
    }
  }

  // Teams in knockout rounds are definitively qualified regardless of group-stage maths
  if (stats && knockoutMatches.length > 0) {
    stats.status = "qualified";
  }

  return {
    teamName,
    matchPoints,
    goalPoints,
    progressionPoints,
    totalPoints: matchPoints + goalPoints + progressionPoints,
    goalsScored,
    stats,
  };
}

export function calculateParticipantScores(
  matches: Match[],
  standings: Standings[]
): ParticipantScore[] {
  return participants.map((participant) => {
    const teams = participant.teams.map((teamName) =>
      calculateTeamScore(teamName, matches, standings)
    );

    const totalPoints = teams.reduce((sum, t) => sum + t.totalPoints, 0);
    const totalGoals = teams.reduce((sum, t) => sum + t.goalsScored, 0);
    const teamsAlive = teams.filter(
      (t) => t.stats?.status !== "eliminated"
    ).length;
    const teamsQualified = teams.filter(
      (t) => t.stats?.status === "qualified"
    ).length;

    return {
      participant,
      teams,
      totalPoints,
      totalGoals,
      teamsAlive,
      teamsQualified,
    };
  });
}
