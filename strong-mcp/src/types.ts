export type SetType = "normal" | "warmup" | "drop" | "failure";

export interface WorkoutSet {
  order: number; // position within the exercise as logged (1-based, all set types)
  rawOrder: string; // Strong's Set Order value: "1", "W", "D", "F"
  type: SetType;
  weight: number; // lb (0 for bodyweight / unloaded)
  reps: number;
  seconds: number;
  distance: number;
  rpe: number | null;
  notes: string;
}

export interface ExerciseEntry {
  name: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string; // "YYYY-MM-DD HH:MM:SS|Workout Name"
  start: string; // naive local timestamp "YYYY-MM-DDTHH:MM:SS"
  date: string; // "YYYY-MM-DD"
  name: string;
  durationMin: number | null;
  notes: string;
  exercises: ExerciseEntry[];
}

export interface ParseResult {
  workouts: Workout[]; // sorted oldest → newest
  warnings: string[];
  columns: string[];
}

export const MUSCLES = [
  "chest",
  "back",
  "side_delts",
  "rear_delts",
  "front_delts",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
] as const;
export type Muscle = (typeof MUSCLES)[number];

export interface MuscleMapEntry {
  primary: Muscle[];
  secondary?: Muscle[];
}

export interface MainLiftConfig {
  repRange: [number, number];
}

export interface Config {
  exercises: Record<string, MuscleMapEntry>;
  ignore: string[]; // cardio etc.: no volume, never flagged
  mainLifts: Record<string, MainLiftConfig>;
  flags: { maxDurationMin: number; maxDropSets: number };
}
