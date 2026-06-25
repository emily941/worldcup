"use client";

import { Match } from "@/lib/football-api";
import { ParticipantScore } from "@/lib/scoring";
import { teamToParticipant } from "@/lib/sweepstake-data";
import { useMemo } from "react";

interface FunStatsProps {
  scores: ParticipantScore[];
  fixtures: Match[];
}

export function FunStats({ scores, fixtures }: FunStatsProps) {
  const finished = useMemo(
    () => fixtures.filter((m) => m.status === "FINISHED"),
    [fixtures]
  );

  // Most Boring Owner — fewest total goals across their teams' matches
  const boringOwners = useMemo(() => {
    const ownerGoals = new Map<string, number>();
    for (const s of scores) ownerGoals.set(s.participant.name, 0);

    for (const m of finished) {
      const total = (m.homeScore ?? 0) + (m.awayScore ?? 0);
      const homeOwner = teamToParticipant[m.homeTeam];
      const awayOwner = teamToParticipant[m.awayTeam];
      if (homeOwner) ownerGoals.set(homeOwner, (ownerGoals.get(homeOwner) ?? 0) + total);
      if (awayOwner && awayOwner !== homeOwner)
        ownerGoals.set(awayOwner, (ownerGoals.get(awayOwner) ?? 0) + total);
    }

    return [...ownerGoals.entries()]
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([name, goals]) => ({ name, value: goals }));
  }, [scores, finished]);

  // Biggest Rivalry — pairs of owners whose teams have faced each other most
  const rivalries = useMemo(() => {
    const pairCount = new Map<string, number>();
    for (const m of finished) {
      const homeOwner = teamToParticipant[m.homeTeam];
      const awayOwner = teamToParticipant[m.awayTeam];
      if (!homeOwner || !awayOwner || homeOwner === awayOwner) continue;
      const key = [homeOwner, awayOwner].sort().join(" vs ");
      pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
    }
    return [...pairCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pair, count]) => ({ name: pair, value: count }));
  }, [finished]);

  // Unluckiest Owner — most goals conceded
  const unluckiest = useMemo(() => {
    const conceded = new Map<string, number>();
    for (const s of scores) conceded.set(s.participant.name, 0);

    for (const m of finished) {
      const homeOwner = teamToParticipant[m.homeTeam];
      const awayOwner = teamToParticipant[m.awayTeam];
      if (homeOwner)
        conceded.set(homeOwner, (conceded.get(homeOwner) ?? 0) + (m.awayScore ?? 0));
      if (awayOwner)
        conceded.set(awayOwner, (conceded.get(awayOwner) ?? 0) + (m.homeScore ?? 0));
    }

    return [...conceded.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, goals]) => ({ name, value: goals }));
  }, [scores, finished]);

  // Goal Goblin — most goals scored
  const goalGoblins = useMemo(() => {
    return scores
      .map((s) => ({ name: s.participant.name, value: s.totalGoals }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [scores]);

  const cards: { emoji: string; title: string; entries: { name: string; value: number }[]; unit: string }[] = [
    { emoji: "😴", title: "Most Boring", entries: boringOwners, unit: "goals in matches" },
    { emoji: "⚔️", title: "Biggest Rivalry", entries: rivalries, unit: "clashes" },
    { emoji: "😭", title: "Unluckiest", entries: unluckiest, unit: "conceded" },
    { emoji: "👺", title: "Goal Goblin", entries: goalGoblins, unit: "scored" },
  ];

  if (finished.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ emoji, title, entries, unit }) => (
        <div
          key={title}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {title}
            </span>
          </div>
          <div className="space-y-2">
            {entries.map(({ name, value }, i) => (
              <div key={name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg font-bold leading-none shrink-0">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </span>
                  <span className="text-sm font-semibold truncate">{name}</span>
                </div>
                <span className="text-sm text-muted-foreground shrink-0">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
