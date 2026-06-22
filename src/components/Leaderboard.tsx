"use client";

import { ParticipantScore } from "@/lib/scoring";
import { Match } from "@/lib/football-api";
import { getFlag } from "@/lib/flags";
import { cn } from "@/lib/utils";

interface LeaderboardProps {
  scores: ParticipantScore[];
  fixtures: Match[];
  onSelectPerson?: (name: string) => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard({ scores, fixtures, onSelectPerson }: LeaderboardProps) {
  const sorted = [...scores].sort((a, b) => b.totalPoints - a.totalPoints);
  const now = new Date();

  function nextTeamPlaying(score: ParticipantScore) {
    return fixtures
      .filter((m) => {
        const relevant = score.participant.teams.some(t => m.homeTeam === t || m.awayTeam === t);
        return relevant && (m.status === "SCHEDULED" || m.status === "TIMED" || m.status === "LIVE");
      })
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())[0] ?? null;
  }

  function relativeTime(iso: string) {
    const diff = new Date(iso).getTime() - now.getTime();
    if (diff <= 0) return "Now";
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return `${Math.floor(diff / 60_000)}m`;
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {sorted.map((score, idx) => {
        const next = nextTeamPlaying(score);
        const nextTeam = next
          ? score.participant.teams.find(t => next.homeTeam === t || next.awayTeam === t)
          : null;
        const allEliminated = score.teamsAlive === 0;

        return (
          <button
            key={score.participant.name}
            onClick={() => onSelectPerson?.(score.participant.name)}
            className={cn(
              "w-full text-left border-b border-border/60 last:border-0 transition-colors",
              "px-4 py-4 flex items-center gap-4",
              onSelectPerson && "hover:bg-muted/40 active:bg-muted/60",
              idx === 0 && "bg-yellow-500/5"
            )}
          >
            {/* Rank */}
            <div className="w-9 text-center shrink-0">
              {idx < 3
                ? <span className="text-2xl">{MEDALS[idx]}</span>
                : <span className="text-xl font-bold text-muted-foreground">{idx + 1}</span>
              }
            </div>

            {/* Name + flags */}
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold leading-tight">{score.participant.name}</div>
              <div className="flex gap-0.5 mt-1 flex-wrap">
                {score.participant.teams.map(t => (
                  <span key={t} className="text-lg">{getFlag(t)}</span>
                ))}
              </div>
            </div>

            {/* Points */}
            <div className="text-right shrink-0">
              <div className={cn(
                "text-3xl font-black tabular-nums leading-none",
                idx === 0 ? "text-yellow-400" : "text-primary"
              )}>
                {score.totalPoints}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">pts</div>
            </div>

            {/* Teams alive + next */}
            <div className="text-right shrink-0 hidden sm:block min-w-[80px]">
              {allEliminated ? (
                <span className="text-sm font-semibold text-red-400">All out</span>
              ) : nextTeam ? (
                <>
                  <div className="text-xl leading-tight">{getFlag(nextTeam)}</div>
                  <div className="text-xs text-primary font-bold">{relativeTime(next!.kickoff)}</div>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">{score.teamsAlive} alive</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
