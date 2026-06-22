"use client";

import { ParticipantScore } from "@/lib/scoring";
import { Match } from "@/lib/football-api";
import { TeamCard } from "./TeamCard";
import { FixturesView } from "./FixturesView";

interface PersonTabProps {
  score: ParticipantScore;
  fixtures: Match[];
}

export function PersonTab({ score, fixtures }: PersonTabProps) {
  const { participant, teams, totalPoints, totalGoals, teamsAlive, teamsQualified } = score;

  function getNextMatch(teamName: string) {
    return fixtures
      .filter(m => (m.homeTeam === teamName || m.awayTeam === teamName) && (m.status === "SCHEDULED" || m.status === "TIMED"))
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())[0];
  }
  function getLastResult(teamName: string) {
    return fixtures
      .filter(m => (m.homeTeam === teamName || m.awayTeam === teamName) && m.status === "FINISHED")
      .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())[0];
  }
  function getLiveMatch(teamName: string) {
    return fixtures.find(m => (m.homeTeam === teamName || m.awayTeam === teamName) && m.status === "LIVE");
  }

  const stats = [
    { label: "Total Points", value: totalPoints, highlight: true },
    { label: "Teams Alive",  value: teamsAlive },
    { label: "Goals Scored", value: totalGoals },
    { label: "Qualified",    value: teamsQualified },
  ];

  return (
    <div className="space-y-8">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value, highlight }) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-card p-4 text-center"
          >
            <div className={`text-4xl font-black leading-none ${highlight ? "text-primary" : ""}`}>
              {value}
            </div>
            <div className="text-sm text-muted-foreground mt-1 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Team cards */}
      <div>
        <h3 className="text-base font-bold text-muted-foreground uppercase tracking-wide mb-4">
          Teams ({participant.teams.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {teams.map(teamScore => (
            <TeamCard
              key={teamScore.teamName}
              teamScore={teamScore}
              nextMatch={getNextMatch(teamScore.teamName)}
              lastResult={getLastResult(teamScore.teamName)}
              liveMatch={getLiveMatch(teamScore.teamName)}
            />
          ))}
        </div>
      </div>

      {/* Fixtures for this person */}
      <div>
        <h3 className="text-base font-bold text-muted-foreground uppercase tracking-wide mb-4">
          Fixtures &amp; Results
        </h3>
        <FixturesView fixtures={fixtures} defaultParticipant={participant.name} />
      </div>
    </div>
  );
}
