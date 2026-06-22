"use client";

import { useState, useEffect, useCallback } from "react";
import { Match, Standings } from "@/lib/football-api";
import { ParticipantScore } from "@/lib/scoring";

export interface FootballData {
  fixtures: Match[];
  standings: Standings[];
  liveMatches: Match[];
  participantScores: ParticipantScore[];
  updatedAt: string;
}

export function useFootballData(refreshIntervalMs = 60_000) {
  const [data, setData] = useState<FootballData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/football", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as FootballData;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(fetchData, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchData, refreshIntervalMs]);

  return { data, loading, error, refetch: fetchData };
}
