"use client";

import { useState, useEffect } from "react";
import { useFootballData } from "@/hooks/useFootballData";
import { participants } from "@/lib/sweepstake-data";
import { getFlag } from "@/lib/flags";
import { Leaderboard } from "@/components/Leaderboard";
import { PersonTab } from "@/components/PersonTab";
import { FixturesView } from "@/components/FixturesView";
import { StandingsTable } from "@/components/StandingsTable";
import { LandingPage } from "@/components/LandingPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Section = "dashboard" | "fixtures" | "standings" | "player";

export default function Home() {
  const { data, loading, error } = useFootballData(90_000);
  const [section, setSection] = useState<Section>("dashboard");
  const [activePlayer, setActivePlayer] = useState<string>(participants[0].name);
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    setUnlocked(!!localStorage.getItem("wcm_unlocked"));
  }, []);

  if (unlocked === null) return null;
  if (!unlocked) return <LandingPage onEnter={() => setUnlocked(true)} />;

  const hasLive = data?.liveMatches && data.liveMatches.length > 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-6xl animate-bounce">⚽</div>
        <p className="text-muted-foreground text-xl font-medium">Loading match data…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-6xl">😬</div>
        <p className="text-muted-foreground text-lg">Failed to load data: {error}</p>
      </div>
    );
  }

  const personScore = data.participantScores.find(
    (s) => s.participant.name === activePlayer
  );

  function goToPlayer(name: string) {
    setActivePlayer(name);
    setSection("player");
  }

  const navItems: { key: Section; label: string; icon: string }[] = [
    { key: "dashboard", label: "Leaderboard", icon: "🏆" },
    { key: "fixtures",  label: "Fixtures",    icon: "📅" },
    { key: "standings", label: "Standings",   icon: "📊" },
    { key: "player",    label: "Players",     icon: "👤" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0">⚽</span>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight leading-tight truncate">
                World Cup Madness
              </h1>
              <p className="text-sm text-muted-foreground">Family Sweepstake 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {hasLive && (
              <div className="flex items-center gap-1.5 text-sm font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {data.liveMatches.length} LIVE
              </div>
            )}
            <div className="text-sm text-muted-foreground hidden sm:block">
              {new Date(data.updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <button
              onClick={() => { localStorage.removeItem("wcm_unlocked"); setUnlocked(false); }}
              className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded hidden md:block"
              title="Replay penalty shootout"
            >
              ⚽ Replay
            </button>
          </div>
        </div>
      </header>

      {/* ── Desktop tab bar (md+) ────────────────────────────────────── */}
      <div className="hidden md:block border-b border-border bg-background sticky top-[69px] z-40">
        <div className="max-w-screen-xl mx-auto">
          <ScrollArea className="w-full">
            <div className="flex">
              {navItems.slice(0, 3).map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-4 text-base font-semibold border-b-2 transition-colors whitespace-nowrap",
                    section === key
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {icon} {label}
                </button>
              ))}

              <div className="w-px bg-border self-stretch my-2 mx-2" />

              {participants.map((p) => (
                <button
                  key={p.name}
                  onClick={() => goToPlayer(p.name)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-4 text-base font-medium border-b-2 transition-colors whitespace-nowrap",
                    section === "player" && activePlayer === p.name
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {getFlag(p.teams[0])} {p.name}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="h-1.5" />
          </ScrollArea>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6 pb-28 md:pb-8 space-y-6">

        {/* Dashboard */}
        {section === "dashboard" && (
          <>
            {hasLive && (
              <section>
                <h2 className="section-heading flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  Live Now
                </h2>
                <div className="space-y-3">
                  {data.liveMatches.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl bg-green-500/5 border border-green-500/20">
                      <div>
                        <div className="text-lg font-bold">
                          {m.homeTeam}{" "}
                          <span className="text-green-400 text-2xl">{m.homeScore}–{m.awayScore}</span>{" "}
                          {m.awayTeam}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {m.group?.replace(/GROUP_?/, "Group ") ?? m.stage}
                        </div>
                      </div>
                      <div className="text-green-400 font-bold text-sm shrink-0 ml-4">
                        {m.minute ? `${m.minute}'` : "LIVE"}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="section-heading">Leaderboard</h2>
              <Leaderboard
                scores={data.participantScores}
                fixtures={data.fixtures}
                onSelectPerson={goToPlayer}
              />
            </section>

            {/* Mobile player picker — visible on small screens */}
            <section className="md:hidden">
              <h2 className="section-heading">👤 View a Player</h2>
              <div className="grid grid-cols-3 gap-3">
                {participants.map((p) => {
                  const score = data.participantScores.find(s => s.participant.name === p.name);
                  return (
                    <button
                      key={p.name}
                      onClick={() => goToPlayer(p.name)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-border bg-card hover:bg-muted/50 active:scale-95 transition-all"
                    >
                      <span className="text-2xl">{getFlag(p.teams[0])}</span>
                      <span className="text-base font-bold leading-tight">{p.name}</span>
                      <span className="text-primary font-extrabold text-lg leading-none">{score?.totalPoints ?? 0}pts</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* Fixtures */}
        {section === "fixtures" && (
          <section>
            <h2 className="section-heading">Fixtures &amp; Results</h2>
            <FixturesView fixtures={data.fixtures} />
          </section>
        )}

        {/* Standings */}
        {section === "standings" && (
          <section>
            <h2 className="section-heading">Group Standings</h2>
            <StandingsTable standings={data.standings} />
          </section>
        )}

        {/* Player tab */}
        {section === "player" && (
          <>
            {/* Player picker — show on mobile inside player section */}
            <div className="md:hidden">
              <label className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Switch Player
              </label>
              <select
                value={activePlayer}
                onChange={(e) => setActivePlayer(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-lg font-semibold appearance-none"
              >
                {participants.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {personScore ? (
              <PersonTab score={personScore} fixtures={data.fixtures} />
            ) : (
              <div className="text-muted-foreground py-12 text-center text-lg">Select a player above</div>
            )}
          </>
        )}
      </main>

      {/* ── Mobile bottom nav ────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/98 backdrop-blur">
        <div className="flex">
          {navItems.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => {
                if (key === "player" && section !== "player") {
                  setSection("player");
                } else {
                  setSection(key);
                }
              }}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors",
                section === key ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="text-2xl leading-none">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <style>{`
        .section-heading {
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-muted-foreground);
          margin-bottom: 0.875rem;
        }
      `}</style>
    </div>
  );
}
