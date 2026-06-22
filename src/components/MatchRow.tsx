"use client";

import { Match } from "@/lib/football-api";
import { getFlag } from "@/lib/flags";
import { teamToParticipant } from "@/lib/sweepstake-data";
import { cn } from "@/lib/utils";

interface MatchRowProps {
  match: Match;
  highlight?: boolean;
}

export function MatchRow({ match, highlight }: MatchRowProps) {
  const isLive     = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";
  const hasScore   = match.homeScore !== null && match.awayScore !== null;
  const homeOwner  = teamToParticipant[match.homeTeam];
  const awayOwner  = teamToParticipant[match.awayTeam];

  function fmtKickoff(iso: string) {
    const d = new Date(iso);
    const isToday = d.toDateString() === new Date().toDateString();
    if (isToday) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className={cn(
      "rounded-2xl border px-3 py-3 transition-colors",
      isLive    && "bg-green-500/5 border-green-500/30 ring-1 ring-green-500/20",
      !isLive && highlight && "bg-muted/30 border-border",
      !isLive && !highlight && "bg-muted/10 border-transparent"
    )}>
      {/* Group / stage label */}
      <div className="text-xs text-muted-foreground mb-2 font-medium">
        {match.group
          ? match.group.replace(/GROUP_?/, "Group ")
          : match.stage.replace(/_/g, " ")}
      </div>

      <div className="flex items-center gap-2">
        {/* Home */}
        <div className="flex-1 flex flex-col items-end gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold truncate text-right">{match.homeTeam}</span>
            <span className="text-2xl shrink-0">{getFlag(match.homeTeam)}</span>
          </div>
          {homeOwner && (
            <span className="text-xs text-muted-foreground">{homeOwner}</span>
          )}
        </div>

        {/* Score / time */}
        <div className="shrink-0 flex flex-col items-center gap-1 w-28">
          {isLive ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 text-xs font-bold">
                  {match.minute ? `${match.minute}'` : "LIVE"}
                </span>
              </div>
              <div className="text-3xl font-black tabular-nums text-green-300">
                {match.homeScore}–{match.awayScore}
              </div>
            </>
          ) : hasScore ? (
            <>
              <div className="text-xs text-muted-foreground font-semibold">FT</div>
              <div className="text-3xl font-black tabular-nums">
                {match.homeScore}–{match.awayScore}
              </div>
            </>
          ) : (
            <>
              <div className="text-base font-bold text-muted-foreground">vs</div>
              <div className="text-sm text-muted-foreground">{fmtKickoff(match.kickoff)}</div>
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex flex-col items-start gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl shrink-0">{getFlag(match.awayTeam)}</span>
            <span className="text-base font-bold truncate">{match.awayTeam}</span>
          </div>
          {awayOwner && (
            <span className="text-xs text-muted-foreground">{awayOwner}</span>
          )}
        </div>
      </div>
    </div>
  );
}
