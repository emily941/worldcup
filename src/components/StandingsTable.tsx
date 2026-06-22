"use client";

import { Standings } from "@/lib/football-api";
import { getFlag } from "@/lib/flags";
import { teamToParticipant } from "@/lib/sweepstake-data";
import { cn } from "@/lib/utils";

interface StandingsTableProps {
  standings: Standings[];
}

export function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {standings.map((group) => (
        <div key={group.group} className="rounded-2xl border border-border overflow-hidden">
          <div className="bg-muted/40 px-4 py-3 font-bold text-base border-b border-border">
            {group.group.replace(/GROUP_?/, "Group ")}
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 text-sm text-muted-foreground">
                <th className="px-3 py-2 text-left w-6">#</th>
                <th className="px-3 py-2 text-left">Team</th>
                <th className="px-2 py-2 text-center">P</th>
                <th className="px-2 py-2 text-center">W</th>
                <th className="px-2 py-2 text-center">D</th>
                <th className="px-2 py-2 text-center">L</th>
                <th className="px-2 py-2 text-center">GD</th>
                <th className="px-2 py-2 text-center font-bold text-foreground">Pts</th>
              </tr>
            </thead>
            <tbody>
              {group.teams.map((team, i) => {
                const owner = teamToParticipant[team.name];
                const isQualified  = team.status === "qualified";
                const isEliminated = team.status === "eliminated";
                return (
                  <tr
                    key={team.name}
                    className={cn(
                      "border-b border-border/30 last:border-0",
                      i < 2 && !isEliminated && "bg-blue-500/5",
                      isEliminated && "opacity-50"
                    )}
                  >
                    <td className="px-3 py-3 text-sm text-muted-foreground font-medium">{i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getFlag(team.name)}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold leading-tight">{team.name}</div>
                          {owner && (
                            <div className="text-xs text-muted-foreground">{owner}</div>
                          )}
                        </div>
                        {isQualified && (
                          <span className="text-blue-400 text-xs font-bold shrink-0">✓</span>
                        )}
                        {isEliminated && (
                          <span className="text-red-400 text-xs shrink-0">✕</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center text-sm text-muted-foreground">{team.played}</td>
                    <td className="px-2 py-3 text-center text-sm font-medium">{team.won}</td>
                    <td className="px-2 py-3 text-center text-sm">{team.drawn}</td>
                    <td className="px-2 py-3 text-center text-sm">{team.lost}</td>
                    <td className="px-2 py-3 text-center text-sm">
                      <span className={cn(
                        team.goalsFor - team.goalsAgainst > 0 && "text-emerald-400",
                        team.goalsFor - team.goalsAgainst < 0 && "text-red-400"
                      )}>
                        {team.goalsFor - team.goalsAgainst > 0 ? "+" : ""}
                        {team.goalsFor - team.goalsAgainst}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center text-base font-black">{team.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
