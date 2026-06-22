"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { participants } from "@/lib/sweepstake-data";

// ── Types ──────────────────────────────────────────────────────────────────
type Zone = "TL" | "TC" | "TR" | "BL" | "BC" | "BR";
type KeeperDive = "left" | "center" | "right";
type Phase = "welcome" | "game" | "result";
type ShotOutcome = "goal" | "saved" | "miss";

interface ShotRecord {
  zone: Zone;
  outcome: ShotOutcome;
  keeperDive: KeeperDive;
  message: string;
  achievement?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const NAMES = participants.map((p) => p.name);

const GOAL_MESSAGES = [
  "GOOOOOAAALLLL! 🎉",
  "Top bins! 📐",
  "He's done a Panenka! 🪄",
  "Keeper had no chance!",
  "Scenes in the stadium! 🏟️",
  "Absolute worldie!",
  "Net buster! 🕸️",
  "Ice cold finish! 🧊",
  "Class! Sheer class!",
];

const SAVE_MESSAGES = [
  "VAR says absolutely not. 📺",
  "Straight at the keeper.",
  "My nan could've saved that.",
  "That's why you didn't get Brazil.",
  "Big hands! Big gloves!",
  "The keeper's having a great tournament.",
  "Shocking penalty. Truly shocking.",
  "A kipper has been placed in the net.",
];

const FAMILY_GOAL = () => {
  const n = NAMES[Math.floor(Math.random() * NAMES.length)];
  const msgs = [
    `${n} is nervous.`,
    `Emily's Brazil scouts are impressed.`,
    `Dave is already checking the leaderboard.`,
    `Sophie is claiming she would've scored from further out.`,
    `Colin said that was lucky.`,
    `Olive applauds from the terraces.`,
    `${n} spills their tea in excitement.`,
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
};

const FAMILY_MISS = () => {
  const n = NAMES[Math.floor(Math.random() * NAMES.length)];
  const msgs = [
    `Dan W liked that one on Facebook.`,
    `Kate says pressure got to you.`,
    `George has seen better penalties at five-a-side.`,
    `${n} is filming that for the group chat.`,
    `Tom is already planning his speech.`,
    `Pandy has concerns about your technique.`,
    `Ali texts "😂" immediately.`,
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
};

const ACHIEVEMENTS: Record<string, string> = {
  ice_cold: "🧊 Ice Cold Finisher",
  top_bins: "📐 Top Bins Merchant",
  var_survivor: "📺 VAR Survivor",
  sunday_league: "⚽ Sunday League Legend",
  golden_boot: "🥾 Golden Boot Contender",
};

// Which keeper positions save which zones (and with what probability)
const KEEPER_SAVES: Record<KeeperDive, Partial<Record<Zone, number>>> = {
  left:   { BL: 0.92, TL: 0.55, BC: 0.25, TC: 0.10 },
  center: { BC: 0.90, TC: 0.60, BL: 0.20, BR: 0.20 },
  right:  { BR: 0.92, TR: 0.55, BC: 0.25, TC: 0.10 },
};

function computeOutcome(zone: Zone, dive: KeeperDive): ShotOutcome {
  const saveChance = KEEPER_SAVES[dive][zone] ?? 0;
  return Math.random() < saveChance ? "saved" : "goal";
}

function keeperDiveFromZone(zone: Zone): KeeperDive {
  // Keeper has 50% chance to guess right, otherwise random
  const correct: KeeperDive = zone.endsWith("L") ? "left" : zone.endsWith("R") ? "right" : "center";
  if (Math.random() < 0.50) return correct;
  const opts: KeeperDive[] = ["left", "center", "right"];
  return opts[Math.floor(Math.random() * opts.length)];
}

function dragToZone(dx: number, dy: number): Zone {
  // dy is screen delta (negative = dragged UP toward goal)
  const aimUp = -dy; // positive = aiming upward
  const horizontal = dx;

  let col: "L" | "C" | "R";
  if (horizontal < -40) col = "L";
  else if (horizontal > 40) col = "R";
  else col = "C";

  // High shot if strong upward drag magnitude
  const magnitude = Math.sqrt(dx * dx + dy * dy);
  const row: "T" | "B" = aimUp > 60 && magnitude > 90 ? "T" : "B";

  return `${row}${col}` as Zone;
}

function getAchievement(shots: ShotRecord[]): string | undefined {
  const goals = shots.filter((s) => s.outcome === "goal");
  const topBins = goals.filter((s) => s.zone === "TL" || s.zone === "TR");
  if (shots.every((s) => s.outcome === "goal")) return "ice_cold";
  if (topBins.length >= 2) return "top_bins";
  if (shots.slice(0, 1).length === 1 && goals.length === 1 && shots.length === 1) return "golden_boot";
  const consecutive = shots.reduce((max, s, i) => {
    if (s.outcome !== "goal") return max;
    let run = 1;
    while (shots[i - run]?.outcome !== "goal" && i - run >= 0) run++;
    return Math.max(max, run);
  }, 0);
  if (shots.filter((s) => s.outcome !== "goal").length >= 3) return "sunday_league";
  return undefined;
}

// ── Firework particle ───────────────────────────────────────────────────────
function Fireworks() {
  const particles = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    x: 20 + Math.random() * 60,
    y: 10 + Math.random() * 50,
    color: ["#FFD700", "#FF4444", "#44FF88", "#4488FF", "#FF88FF", "#FF8844"][Math.floor(Math.random() * 6)],
    delay: Math.random() * 1.5,
    angle: (i / 36) * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full firework-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            "--angle": `${p.angle}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
interface LandingPageProps {
  onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [shots, setShots] = useState<ShotRecord[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragCurrent, setDragCurrent] = useState({ x: 0, y: 0 });
  const [ballPos, setBallPos] = useState<{ x: number; y: number } | null>(null);
  const [keeperDive, setKeeperDive] = useState<KeeperDive | null>(null);
  const [shotZone, setShotZone] = useState<Zone | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [varPending, setVarPending] = useState(false);
  const [keeperSlip, setKeeperSlip] = useState(false);
  const [newAchievement, setNewAchievement] = useState<string | null>(null);
  const ballRef = useRef<HTMLDivElement>(null);

  const goals = shots.filter((s) => s.outcome === "goal").length;
  const missed = shots.filter((s) => s.outcome !== "goal").length;
  const totalShots = shots.length;
  const maxShots = 5;
  const neededGoals = 3;
  const canStillWin = goals >= neededGoals || (totalShots < maxShots && maxShots - totalShots + goals >= neededGoals);

  // Load achievements
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("wcm_achievements") || "[]") as string[];
      setAchievements(saved);
    } catch {}
  }, []);

  const saveAchievement = useCallback((key: string) => {
    setAchievements((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      localStorage.setItem("wcm_achievements", JSON.stringify(next));
      setNewAchievement(key);
      setTimeout(() => setNewAchievement(null), 3000);
      return next;
    });
  }, []);

  const playSound = useCallback((type: "goal" | "miss" | "whistle" | "crowd") => {
    try {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      if (type === "whistle") {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(2200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "goal") {
        // Crowd cheer: burst of noise
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / data.length);
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 800;
        filter.Q.value = 0.5;
        src.connect(filter);
        filter.connect(gain);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        src.start();
      } else if (type === "miss") {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {}
  }, []);

  const takeShot = useCallback(async (zone: Zone) => {
    if (isAnimating || totalShots >= maxShots) return;
    setIsAnimating(true);

    // Easter egg: 0.5% keeper slip
    const slip = Math.random() < 0.005;
    setKeeperSlip(slip);

    const dive = slip ? "center" : keeperDiveFromZone(zone);
    setKeeperDive(dive);
    setShotZone(zone);

    // Animate ball
    const goalPos = getZonePosition(zone);
    setBallPos(goalPos);

    await delay(600);

    let outcome: ShotOutcome = slip ? "goal" : computeOutcome(zone, dive);

    // Easter egg: 1% VAR review
    const varCheck = !slip && Math.random() < 0.01;
    if (varCheck) {
      setVarPending(true);
      setCurrentMessage("⚙️ Penalty reviewed by VAR...");
      await delay(2000);
      setVarPending(false);
      outcome = "goal"; // VAR always awards it
    }

    const isGoal = outcome === "goal";
    const msg = isGoal
      ? `${GOAL_MESSAGES[Math.floor(Math.random() * GOAL_MESSAGES.length)]} ${FAMILY_GOAL()}`
      : `${SAVE_MESSAGES[Math.floor(Math.random() * SAVE_MESSAGES.length)]} ${FAMILY_MISS()}`;

    if (varCheck) saveAchievement("var_survivor");
    if (isGoal) playSound("goal");
    else playSound("miss");

    const newShot: ShotRecord = { zone, outcome, keeperDive: dive, message: msg };
    const newShots = [...shots, newShot];
    setShots(newShots);
    setCurrentMessage(msg);

    // Check achievements
    const ach = getAchievement(newShots);
    if (ach) saveAchievement(ach);

    const newGoals = newShots.filter((s) => s.outcome === "goal").length;
    const remaining = maxShots - newShots.length;

    await delay(1500);

    // Reset ball position
    setBallPos(null);
    setKeeperDive(null);
    setShotZone(null);
    setKeeperSlip(false);
    setIsAnimating(false);

    // Check game over conditions
    if (newGoals >= neededGoals) {
      await delay(300);
      setShowUnlock(true);
    } else if (newShots.length >= maxShots || remaining + newGoals < neededGoals) {
      // Failed - game over but allow retry
      await delay(300);
      setCurrentMessage(`${newGoals} goal${newGoals !== 1 ? "s" : ""} out of ${newShots.length}. So close! Try again?`);
    }
  }, [isAnimating, totalShots, shots, playSound, saveAchievement]);

  // Drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (isAnimating || showUnlock || totalShots >= maxShots) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragStart({ x, y });
    setDragCurrent({ x, y });
    setIsDragging(true);
    playSound("whistle");
  }, [isAnimating, showUnlock, totalShots, playSound]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isDragging]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const dx = endX - dragStart.x;
    const dy = endY - dragStart.y;
    const zone = dragToZone(dx, dy);
    void takeShot(zone);
  }, [isDragging, dragStart, takeShot]);

  const resetGame = () => {
    setShots([]);
    setCurrentMessage("");
    setBallPos(null);
    setKeeperDive(null);
    setShotZone(null);
    setIsAnimating(false);
    setShowUnlock(false);
    setVarPending(false);
  };

  const handleEnter = () => {
    localStorage.setItem("wcm_unlocked", "1");
    onEnter();
  };

  const dx = dragCurrent.x - dragStart.x;
  const dy = dragCurrent.y - dragStart.y;
  const dragMagnitude = Math.sqrt(dx * dx + dy * dy);
  const dragAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  // ── Welcome ───────────────────────────────────────────────────────────────
  if (phase === "welcome") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden stadium-bg">
        <style>{`
          .stadium-bg {
            background: radial-gradient(ellipse at 50% 120%, #1a4a1a 0%, #0a1a0a 40%, #050c1a 70%, #000510 100%);
          }
          .floodlight {
            position: absolute;
            border-radius: 50%;
            filter: blur(60px);
            opacity: 0.15;
            animation: flicker 4s ease-in-out infinite;
          }
          @keyframes flicker {
            0%, 100% { opacity: 0.15; }
            50% { opacity: 0.22; }
          }
          .title-glow {
            text-shadow: 0 0 40px rgba(255,215,0,0.5), 0 0 80px rgba(255,215,0,0.2);
          }
          .pulse-btn {
            animation: pulsate 2s ease-in-out infinite;
          }
          @keyframes pulsate {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,215,0,0.4); }
            50% { transform: scale(1.03); box-shadow: 0 0 0 12px rgba(255,215,0,0); }
          }
          .pitch-lines {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 35%;
            background: repeating-linear-gradient(
              90deg,
              rgba(255,255,255,0.03) 0px,
              rgba(255,255,255,0.03) 1px,
              transparent 1px,
              transparent 60px
            );
            border-top: 1px solid rgba(255,255,255,0.08);
          }
        `}</style>

        {/* Floodlights */}
        <div className="floodlight w-96 h-96 bg-white" style={{ top: "-5%", left: "-5%" }} />
        <div className="floodlight w-96 h-96 bg-white" style={{ top: "-5%", right: "-5%" }} />
        <div className="floodlight w-64 h-64 bg-yellow-200" style={{ top: "10%", left: "20%" }} />
        <div className="floodlight w-64 h-64 bg-yellow-200" style={{ top: "10%", right: "20%" }} />

        {/* Pitch lines */}
        <div className="pitch-lines" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
          <div className="text-7xl animate-bounce">🏆</div>

          <div>
            <h1 className="title-glow text-5xl sm:text-7xl font-black tracking-tight text-white leading-none">
              WORLD CUP<br />
              <span className="text-yellow-400">MADNESS</span>
            </h1>
          </div>

          <div className="space-y-1 text-gray-300 text-lg font-medium">
            <p>{participants.length} Managers.</p>
            <p>{participants.reduce((sum, p) => sum + p.teams.length, 0)} Teams.</p>
            <p className="text-yellow-400 font-bold">One Champion.</p>
          </div>

          <button
            onClick={() => setPhase("game")}
            className="pulse-btn mt-4 px-10 py-4 bg-yellow-400 text-black font-black text-xl rounded-full uppercase tracking-widest hover:bg-yellow-300 transition-colors"
          >
            ⚽ TAKE THE PENALTY
          </button>

          {achievements.length > 0 && (
            <div className="text-xs text-gray-500 mt-2">
              {achievements.length} achievement{achievements.length !== 1 ? "s" : ""} earned
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Unlock screen ─────────────────────────────────────────────────────────
  if (showUnlock) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-black">
        <Fireworks />
        <style>{`
          @keyframes trophy-in {
            0% { transform: scale(0) rotate(-10deg); opacity: 0; }
            60% { transform: scale(1.2) rotate(3deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes fade-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .trophy-anim { animation: trophy-in 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards; }
          .fade-up-1 { animation: fade-up 0.6s 0.8s ease forwards; opacity: 0; }
          .fade-up-2 { animation: fade-up 0.6s 1.2s ease forwards; opacity: 0; }
          .fade-up-3 { animation: fade-up 0.6s 1.6s ease forwards; opacity: 0; }
          .title-glow { text-shadow: 0 0 40px rgba(255,215,0,0.6), 0 0 80px rgba(255,215,0,0.3); }
        `}</style>

        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6">
          <div className="trophy-anim text-8xl">🏆</div>

          <div className="fade-up-1">
            <p className="text-yellow-400 font-black text-2xl uppercase tracking-widest">
              ⭐ QUALIFIED FOR THE TOURNAMENT ⭐
            </p>
          </div>

          <div className="fade-up-2">
            <h2 className="title-glow text-4xl font-black text-white">
              Welcome to<br />World Cup Madness
            </h2>
            <p className="text-gray-400 mt-2">{goals} goal{goals !== 1 ? "s" : ""} scored. Not bad.</p>
          </div>

          {newAchievement && (
            <div className="fade-up-2 bg-yellow-400/20 border border-yellow-400/40 rounded-full px-6 py-2 text-yellow-300 font-bold text-sm">
              Achievement unlocked: {ACHIEVEMENTS[newAchievement]}
            </div>
          )}

          <div className="fade-up-3">
            <button
              onClick={handleEnter}
              className="px-10 py-4 bg-yellow-400 text-black font-black text-xl rounded-full uppercase tracking-widest hover:bg-yellow-300 transition-colors"
            >
              ENTER THE SWEEPSTAKE →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Game ──────────────────────────────────────────────────────────────────
  const gameOver = totalShots >= maxShots && goals < neededGoals;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between overflow-hidden penalty-bg py-6 px-4 select-none">
      <style>{`
        .penalty-bg {
          background: radial-gradient(ellipse at 50% 110%, #1a5a1a 0%, #0d2d0d 35%, #050f1a 65%, #000810 100%);
        }
        .goal-post { background: rgba(255,255,255,0.95); }
        .keeper { font-size: 2.5rem; transition: transform 0.3s cubic-bezier(0.34,1.2,0.64,1); }
        .keeper-left  { transform: translateX(-110%) rotate(-30deg); }
        .keeper-right { transform: translateX(110%) rotate(30deg); }
        .keeper-slip  { transform: translateY(40%) rotate(90deg); }
        .ball { font-size: 1.8rem; transition: all 0.5s cubic-bezier(0.25,0.46,0.45,0.94); }
        .ball-shooting { transform: scale(0.6); }
        .pitch-arc {
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 180px;
          height: 60px;
          border: 2px solid rgba(255,255,255,0.2);
          border-bottom: none;
          border-radius: 90px 90px 0 0;
        }
        .shot-indicator {
          position: absolute;
          width: 2px;
          background: rgba(255,255,255,0.5);
          transform-origin: bottom center;
          border-radius: 1px;
        }
        .firework-particle {
          animation: burst 1s ease-out forwards;
        }
        @keyframes burst {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(calc(cos(var(--angle)) * 80px), calc(sin(var(--angle)) * 80px)) scale(0); opacity: 0; }
        }
        .zone-flash { animation: zone-in 0.3s ease; }
        @keyframes zone-in {
          0% { opacity: 0.5; transform: scale(1.3); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes keeper-anim {
          from { opacity: 0.5; }
          to { opacity: 1; }
        }
        .drag-arrow {
          position: absolute;
          pointer-events: none;
          z-index: 20;
        }
        .title-glow { text-shadow: 0 0 20px rgba(255,215,0,0.4); }
      `}</style>

      {/* Header */}
      <div className="text-center z-10">
        <h2 className="title-glow text-xl font-black text-yellow-400 uppercase tracking-widest">
          PENALTY SHOOTOUT
        </h2>
        <p className="text-gray-400 text-sm mt-1">Score {neededGoals} out of {maxShots} to enter</p>
      </div>

      {/* Score tracker */}
      <div className="flex gap-3 z-10">
        {Array.from({ length: maxShots }, (_, i) => {
          const shot = shots[i];
          return (
            <div
              key={i}
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-lg transition-all ${
                !shot
                  ? "border-white/20 text-white/20"
                  : shot.outcome === "goal"
                  ? "border-green-400 bg-green-400/20 text-green-400 zone-flash"
                  : "border-red-400 bg-red-400/20 text-red-400"
              }`}
            >
              {!shot ? "○" : shot.outcome === "goal" ? "⚽" : "✕"}
            </div>
          );
        })}
      </div>

      {/* Goal area */}
      <div className="relative w-full max-w-sm z-10 flex flex-col items-center gap-4">

        {/* Goal structure */}
        <div className="relative w-full" style={{ height: 200 }}>

          {/* Crossbar */}
          <div className="goal-post absolute top-0 left-4 right-4 h-2 rounded-sm" />
          {/* Left post */}
          <div className="goal-post absolute top-0 left-4 w-2 bottom-0 rounded-sm" />
          {/* Right post */}
          <div className="goal-post absolute top-0 right-4 w-2 bottom-0 rounded-sm" />

          {/* Net lines (horizontal) */}
          {[30, 60, 90, 130, 165].map((y) => (
            <div key={y} className="absolute left-6 right-6 h-px bg-white/10" style={{ top: y }} />
          ))}
          {/* Net lines (vertical) */}
          {[0.25, 0.5, 0.75].map((x) => (
            <div key={x} className="absolute top-2 bottom-0 w-px bg-white/10" style={{ left: `calc(${x * 100}% )` }} />
          ))}

          {/* Keeper */}
          <div
            className={`keeper absolute z-20 ${
              keeperSlip
                ? "keeper-slip"
                : keeperDive === "left"
                ? "keeper-left"
                : keeperDive === "right"
                ? "keeper-right"
                : ""
            }`}
            style={{
              bottom: 8,
              left: "50%",
              transform: keeperSlip
                ? "translateX(-50%) translateY(40%) rotate(90deg)"
                : keeperDive === "left"
                ? "translateX(calc(-50% - 80px)) rotate(-30deg)"
                : keeperDive === "right"
                ? "translateX(calc(-50% + 80px)) rotate(30deg)"
                : "translateX(-50%)",
              transition: "transform 0.25s cubic-bezier(0.34,1.2,0.64,1)",
            }}
          >
            🧤
          </div>

          {/* Ball in flight */}
          {ballPos && (
            <div
              className="ball zone-flash absolute z-30"
              style={{
                left: `${ballPos.x}%`,
                top: `${ballPos.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              ⚽
            </div>
          )}

          {/* Zone flash on shot */}
          {shotZone && (
            <div
              className="absolute zone-flash text-3xl opacity-60 pointer-events-none"
              style={getZoneStyle(shotZone)}
            >
              {shots[shots.length - 1]?.outcome === "goal" ? "✨" : "❌"}
            </div>
          )}
        </div>

        {/* Message */}
        <div className="h-12 text-center px-4">
          {currentMessage && (
            <p className="text-white font-semibold text-sm leading-snug zone-flash">
              {currentMessage}
            </p>
          )}
          {varPending && (
            <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm font-bold mt-1">
              <span className="animate-spin">⚙️</span> Checking...
            </div>
          )}
        </div>

        {/* Drag / shoot area */}
        {!gameOver && goals < neededGoals && (
          <div
            className="relative w-32 h-32 flex items-end justify-center cursor-pointer touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {/* Pitch arc */}
            <div className="pitch-arc" />

            {/* Drag direction arrow */}
            {isDragging && dragMagnitude > 10 && (
              <div
                className="drag-arrow absolute bottom-8 left-1/2 origin-bottom"
                style={{
                  height: Math.min(dragMagnitude * 0.7, 80),
                  width: 3,
                  background: "rgba(255,255,255,0.7)",
                  borderRadius: 2,
                  transformOrigin: "bottom center",
                  transform: `translateX(-50%) rotate(${dragAngle + 90}deg)`,
                  boxShadow: "0 0 8px rgba(255,255,255,0.5)",
                }}
              />
            )}

            {/* Ball at spot */}
            {!ballPos && !isAnimating && (
              <div className="ball text-3xl mb-1 z-10">
                {isDragging ? "🏃" : "⚽"}
              </div>
            )}

            {!isDragging && !isAnimating && (
              <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-xs whitespace-nowrap">
                drag to aim ↑
              </p>
            )}
          </div>
        )}

        {/* Game over / retry */}
        {gameOver && (
          <button
            onClick={resetGame}
            className="mt-2 px-8 py-3 bg-yellow-400 text-black font-black rounded-full uppercase tracking-wide hover:bg-yellow-300"
          >
            TRY AGAIN 🔄
          </button>
        )}
      </div>

      {/* Achievement toast */}
      {newAchievement && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-yellow-400/20 border border-yellow-400/40 rounded-full px-6 py-2 text-yellow-300 font-bold text-sm animate-bounce">
          {ACHIEVEMENTS[newAchievement]}
        </div>
      )}

      {/* Footer */}
      <div className="text-center z-10">
        <p className="text-gray-600 text-xs">
          {goals} scored · {missed} missed · {maxShots - totalShots} shot{maxShots - totalShots !== 1 ? "s" : ""} left
        </p>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getZonePosition(zone: Zone): { x: number; y: number } {
  const positions: Record<Zone, { x: number; y: number }> = {
    TL: { x: 25, y: 20 },
    TC: { x: 50, y: 15 },
    TR: { x: 75, y: 20 },
    BL: { x: 25, y: 75 },
    BC: { x: 50, y: 78 },
    BR: { x: 75, y: 75 },
  };
  return positions[zone];
}

function getZoneStyle(zone: Zone): React.CSSProperties {
  const pos = getZonePosition(zone);
  return {
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    transform: "translate(-50%, -50%)",
  };
}
