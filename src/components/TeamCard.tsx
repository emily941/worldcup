"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamScore } from "@/lib/scoring";
import { Match } from "@/lib/football-api";
import { getFlag } from "@/lib/flags";
import { cn } from "@/lib/utils";

interface TeamCardProps {
  teamScore: TeamScore;
  nextMatch?: Match;
  lastResult?: Match;
  liveMatch?: Match;
}

const STATUS = {
  active:     { label: "Active",      cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  qualified:  { label: "Qualified ✓", cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  eliminated: { label: "Eliminated",  cls: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function TeamCard({ teamScore, nextMatch, lastResult, liveMatch }: TeamCardProps) {
  const { teamName, stats, totalPoints, matchPoints, goalPoints, progressionPoints, goalsScored } = teamScore;
  const status = STATUS[stats?.status ?? "active"];

  function fmt(iso: string) {
    const d = new Date(iso);
    const isToday = d.toDateString() === new Date().toDateString();
    if (isToday) return `Today ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
      + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Card className={cn(
      "border transition-all",
      stats?.status === "eliminated" && "opacity-60",
      liveMatch && "ring-2 ring-green-500 shadow-green-500/20 shadow-xl"
    )}>
      <CardContent className="p-5 space-y-4">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-5xl leading-none">{getFlag(teamName)}</span>
            <div>
              <div className="text-xl font-extrabold leading-tight">{teamName}</div>
              {stats?.group && (
                <div className="text-sm text-muted-foreground mt-0.5">
                  {stats.group.replace(/GROUP_?/, "Group ")} · Position {stats.position}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge className={cn("text-sm font-semibold border px-3 py-1", status.cls)}>
              {status.label}
            </Badge>
            <div className="text-3xl font-black text-primary leading-none">{totalPoints}<span className="text-base font-semibold text-muted-foreground ml-1">pts</span></div>
          </div>
        </div>

        {/* Live match */}
        {liveMatch && (
          <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 font-bold text-sm">
                LIVE {liveMatch.minute ? `— ${liveMatch.minute}'` : ""}
              </span>
            </div>
            <div className="text-center text-xl font-bold">
              {liveMatch.homeTeam}{" "}
              <span className="text-green-400 text-3xl font-black mx-2">
                {liveMatch.homeScore}–{liveMatch.awayScore}
              </span>{" "}
              {liveMatch.awayTeam}
            </div>
          </div>
        )}

        {/* Record grid */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Played", value: stats.played },
              { label: "Won",    value: stats.won },
              { label: "Drawn",  value: stats.drawn },
              { label: "Lost",   value: stats.lost },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-muted/50 py-2">
                <div className="text-2xl font-black">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        )}

        {stats && (
          <div className="flex justify-around text-center text-sm">
            <div>
              <div className="text-lg font-bold">{stats.goalsFor}</div>
              <div className="text-xs text-muted-foreground">Goals For</div>
            </div>
            <div>
              <div className="text-lg font-bold">{stats.goalsAgainst}</div>
              <div className="text-xs text-muted-foreground">Against</div>
            </div>
            <div>
              <div className={cn("text-lg font-bold", stats.goalsFor - stats.goalsAgainst > 0 ? "text-emerald-400" : stats.goalsFor - stats.goalsAgainst < 0 ? "text-red-400" : "")}>
                {stats.goalsFor - stats.goalsAgainst > 0 ? "+" : ""}{stats.goalsFor - stats.goalsAgainst}
              </div>
              <div className="text-xs text-muted-foreground">Goal Diff</div>
            </div>
          </div>
        )}

        {/* Points breakdown */}
        <div className="rounded-xl bg-muted/30 divide-y divide-border/50 text-sm overflow-hidden">
          <div className="flex justify-between px-3 py-2">
            <span className="text-muted-foreground">Match results</span>
            <span className="font-semibold">{matchPoints} pts</span>
          </div>
          <div className="flex justify-between px-3 py-2">
            <span className="text-muted-foreground">{goalsScored} goal{goalsScored !== 1 ? "s" : ""} scored</span>
            <span className="font-semibold">{goalPoints} pts</span>
          </div>
          {progressionPoints > 0 && (
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground">Progression bonus</span>
              <span className="font-semibold text-blue-400">{progressionPoints} pts</span>
            </div>
          )}
          <div className="flex justify-between px-3 py-2.5 font-bold bg-muted/20">
            <span>Total</span>
            <span className="text-primary">{totalPoints} pts</span>
          </div>
        </div>

        {/* Last result / next match */}
        {!liveMatch && lastResult && (
          <div className="text-sm">
            <span className="text-muted-foreground font-medium">Last result: </span>
            <span className="font-semibold">
              {lastResult.homeTeam} {lastResult.homeScore}–{lastResult.awayScore} {lastResult.awayTeam}
            </span>
          </div>
        )}
        {!liveMatch && nextMatch && (
          <div className="text-sm">
            <span className="text-muted-foreground font-medium">Next: </span>
            <span className="font-semibold">{nextMatch.homeTeam} vs {nextMatch.awayTeam}</span>
            <div className="text-muted-foreground mt-0.5">{fmt(nextMatch.kickoff)}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
