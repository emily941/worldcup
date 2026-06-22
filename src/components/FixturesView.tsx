"use client";

import { useState, useMemo } from "react";
import { Match } from "@/lib/football-api";
import { participants } from "@/lib/sweepstake-data";
import { MatchRow } from "./MatchRow";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FixturesViewProps {
  fixtures: Match[];
  defaultParticipant?: string;
}

type FilterSection = "all" | "live" | "today" | "upcoming" | "completed";

export function FixturesView({ fixtures, defaultParticipant }: FixturesViewProps) {
  const [section, setSection] = useState<FilterSection>("all");
  const [participantFilter, setParticipantFilter] = useState(defaultParticipant ?? "all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const todayStr = new Date().toISOString().slice(0, 10);

  const groups = useMemo(() => {
    const set = new Set<string>();
    fixtures.forEach((m) => m.group && set.add(m.group));
    return Array.from(set).sort();
  }, [fixtures]);

  const stages = useMemo(() => {
    const set = new Set<string>();
    fixtures.forEach((m) => set.add(m.stage));
    return Array.from(set).sort();
  }, [fixtures]);

  const participantTeams = useMemo(() => {
    if (participantFilter === "all") return null;
    const p = participants.find((p) => p.name === participantFilter);
    return p?.teams ?? null;
  }, [participantFilter]);

  const filtered = useMemo(() => {
    return fixtures.filter((m) => {
      // Section filter
      const matchDay = new Date(m.kickoff).toISOString().slice(0, 10);
      if (section === "live" && m.status !== "LIVE") return false;
      if (section === "today" && matchDay !== todayStr) return false;
      if (section === "upcoming" && m.status !== "SCHEDULED" && m.status !== "TIMED") return false;
      if (section === "completed" && m.status !== "FINISHED") return false;

      // Participant filter
      if (participantTeams && !participantTeams.includes(m.homeTeam) && !participantTeams.includes(m.awayTeam)) return false;

      // Group filter
      if (groupFilter !== "all" && m.group !== groupFilter) return false;

      // Stage filter
      if (stageFilter !== "all" && m.stage !== stageFilter) return false;

      return true;
    });
  }, [fixtures, section, participantTeams, groupFilter, stageFilter, todayStr]);

  const liveCount = fixtures.filter((m) => m.status === "LIVE").length;
  const todayCount = fixtures.filter((m) => new Date(m.kickoff).toISOString().slice(0, 10) === todayStr).length;

  const sections: { key: FilterSection; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "live", label: "Live", count: liveCount },
    { key: "today", label: "Today", count: todayCount },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Results" },
  ];

  // Group by date for display
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of filtered.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())) {
      const day = new Date(m.kickoff).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(m);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const hasParticipantTeam = (m: Match) => {
    if (!participantTeams) {
      const allTeams = participants.flatMap((p) => p.teams);
      return allTeams.includes(m.homeTeam) || allTeams.includes(m.awayTeam);
    }
    return participantTeams.includes(m.homeTeam) || participantTeams.includes(m.awayTeam);
  };

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap">
        {sections.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`px-4 py-2.5 rounded-full text-base font-semibold transition-colors ${
              section === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={`ml-1.5 text-sm rounded-full px-1.5 ${section === key ? "bg-primary-foreground/20" : "bg-background/50"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={participantFilter} onValueChange={(v) => setParticipantFilter(v ?? "all")}>
          <SelectTrigger className="w-[150px] h-11 text-sm">
            <SelectValue placeholder="All players" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All players</SelectItem>
            {participants.map((p) => (
              <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v ?? "all")}>
          <SelectTrigger className="w-[130px] h-11 text-sm">
            <SelectValue placeholder="All groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g} value={g}>{g.replace("GROUP_", "Group ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stageFilter} onValueChange={(v) => setStageFilter(v ?? "all")}>
          <SelectTrigger className="w-[150px] h-11 text-sm">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {groupedByDate.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No matches found</div>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(([date, matches]) => (
            <div key={date}>
              <h3 className="text-base font-bold text-muted-foreground uppercase tracking-wide mb-3 px-1">
                {date}
              </h3>
              <div className="space-y-2">
                {matches.map((m) => (
                  <MatchRow key={m.id} match={m} highlight={hasParticipantTeam(m)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
