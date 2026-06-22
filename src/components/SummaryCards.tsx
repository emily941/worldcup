"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ParticipantScore } from "@/lib/scoring";
import { Match } from "@/lib/football-api";
import { getFlag } from "@/lib/flags";

interface SummaryCardsProps {
  scores: ParticipantScore[];
  fixtures: Match[];
}

export function SummaryCards({ scores, fixtures }: SummaryCardsProps) {
  const sorted = [...scores].sort((a, b) => b.totalPoints - a.totalPoints);
  const leader = sorted[0];
  const mostTeams = [...scores].sort((a, b) => b.teamsAlive - a.teamsAlive)[0];
  const mostGoals = [...scores].sort((a, b) => b.totalGoals - a.totalGoals)[0];

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const allTeams = scores.flatMap((s) => s.participant.teams);
  const todayMatches = fixtures.filter((m) => {
    const matchDay = new Date(m.kickoff).toISOString().slice(0, 10);
    const hasSweepstakeTeam = allTeams.includes(m.homeTeam) || allTeams.includes(m.awayTeam);
    return matchDay === todayStr && hasSweepstakeTeam;
  });

  const liveMatches = fixtures.filter((m) => m.status === "LIVE");

  const cards = [
    {
      icon: "🏆",
      label: "Current Leader",
      value: leader ? leader.participant.name : "—",
      sub: leader ? `${leader.totalPoints} pts` : "",
      accent: "from-yellow-500/20 to-amber-500/10 border-yellow-500/30",
    },
    {
      icon: "⚽",
      label: "Most Goals",
      value: mostGoals ? mostGoals.participant.name : "—",
      sub: mostGoals ? `${mostGoals.totalGoals} goals` : "",
      accent: "from-blue-500/20 to-cyan-500/10 border-blue-500/30",
    },
    {
      icon: "🛡️",
      label: "Most Teams Alive",
      value: mostTeams ? mostTeams.participant.name : "—",
      sub: mostTeams ? `${mostTeams.teamsAlive} teams` : "",
      accent: "from-emerald-500/20 to-green-500/10 border-emerald-500/30",
    },
    {
      icon: liveMatches.length > 0 ? "🟢" : "📅",
      label: liveMatches.length > 0 ? "Live Now" : "Matches Today",
      value: liveMatches.length > 0 ? `${liveMatches.length} match${liveMatches.length !== 1 ? "es" : ""}` : `${todayMatches.length} match${todayMatches.length !== 1 ? "es" : ""}`,
      sub: liveMatches.length > 0
        ? liveMatches.slice(0, 2).map((m) => `${m.homeTeam} ${m.homeScore}–${m.awayScore} ${m.awayTeam}`).join(" · ")
        : todayMatches.slice(0, 2).map((m) => `${getFlag(m.homeTeam)}${m.homeTeam} vs ${getFlag(m.awayTeam)}${m.awayTeam}`).join(" · "),
      accent: liveMatches.length > 0
        ? "from-green-500/20 to-emerald-500/10 border-green-500/30"
        : "from-purple-500/20 to-violet-500/10 border-purple-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={`bg-gradient-to-br ${card.accent} border`}
        >
          <CardContent className="p-4">
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              {card.label}
            </div>
            <div className="text-xl font-bold truncate">{card.value}</div>
            {card.sub && (
              <div className="text-xs text-muted-foreground mt-1 truncate">{card.sub}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
