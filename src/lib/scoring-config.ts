export const SCORING_CONFIG = {
  win: 3,
  draw: 1,
  loss: 0,
  goalScored: 1,
  qualifyGroupStage: 5,    // qualify for Round of 32 (pass group)
  roundOf16: 10,
  quarterFinal: 15,
  semiFinal: 50,
  final: 100,
  winTournament: 150,
} as const;

export type ScoringConfig = typeof SCORING_CONFIG;

export const STAGE_LABELS: Record<string, string> = {
  GROUP: "Group Stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter Final",
  SEMI_FINALS: "Semi Final",
  FINAL: "Final",
  WINNER: "Champion",
};
