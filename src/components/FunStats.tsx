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

  // Most Boring Owner — fewest goals scored across all their teams
  const boringOwners = useMemo(() => {
    return scores
      .map((s) => ({ name: s.participant.name, value: s.totalGoals }))
      .sort((a, b) => a.value - b.value)
      .slice(0, 3);
  }, [scores]);

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

  // Biggest Self-Own — matches where both teams belong to the same owner
  const selfOwns = useMemo(() => {
    const count = new Map<string, number>();
    for (const m of finished) {
      const homeOwner = teamToParticipant[m.homeTeam];
      const awayOwner = teamToParticipant[m.awayTeam];
      if (homeOwner && homeOwner === awayOwner) {
        count.set(homeOwner, (count.get(homeOwner) ?? 0) + 1);
      }
    }
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, c]) => ({ name, value: c }));
  }, [finished]);

  // Deft Defence — fewest goals conceded
  const deftDefence = useMemo(() => {
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
      .sort((a, b) => a[1] - b[1])
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

  const cards: { emoji: string; title: string; desc: string; entries: { name: string; value: number }[] }[] = [
    { emoji: "😴", title: "Most Boring", desc: "Fewest goals scored across all their teams", entries: boringOwners },
    { emoji: "⚔️", title: "Biggest Rivalry", desc: "Owners whose teams have faced each other the most", entries: rivalries },
    { emoji: "😭", title: "Unluckiest", desc: "Most goals conceded across all their teams", entries: unluckiest },
    { emoji: "🛡️", title: "Deft Defence", desc: "Fewest goals conceded across all their teams", entries: deftDefence },
    { emoji: "👺", title: "Goal Goblin", desc: "Most goals scored across all their teams", entries: goalGoblins },
    ...(selfOwns.length > 0 ? [{ emoji: "🤦", title: "Biggest Self-Own", desc: "Times their own teams have played each other", entries: selfOwns }] : []),
  ];

  if (finished.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ emoji, title, desc, entries }) => (
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
          <p className="text-xs text-muted-foreground -mt-1">{desc}</p>
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
