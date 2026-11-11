import type { ExerciseEntry, Workout, WorkoutSet } from "../types.ts";
import { baseName } from "../config.ts";

export const isHard = (s: WorkoutSet) =>
  s.type !== "warmup" && (s.reps > 0 || s.seconds > 0 || s.distance > 0);

/** Epley. Singles return the weight itself. */
export function e1rm(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** The 2 working sets: first two non-warm-up, non-drop sets with reps. */
export const workingSets = (ex: ExerciseEntry) =>
  ex.sets.filter((s) => (s.type === "normal" || s.type === "failure") && s.reps > 0).slice(0, 2);

export function fmtSet(s: WorkoutSet): string {
  const prefix = s.type === "warmup" ? "W " : s.type === "drop" ? "D " : s.type === "failure" ? "F " : "";
  let body: string;
  if (s.reps > 0) body = `${s.weight > 0 ? s.weight : "BW"}x${s.reps}`;
  else if (s.seconds > 0) body = `${s.weight > 0 ? s.weight + "lb " : ""}${s.seconds}s`;
  else if (s.distance > 0) body = `${s.distance}dist`;
  else body = `${s.weight}x0`;
  return prefix + body + (s.rpe ? ` @${s.rpe}` : "");
}

// ---------- dates (all naive local wall-clock, compared as strings / UTC math) ----------
export function todayIn(tz: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
const toUtc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const addDays = (d: string, n: number) => new Date(toUtc(d) + n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / 86400000);
/** Monday of the week containing d. */
export const weekStart = (d: string) => addDays(d, -((new Date(toUtc(d)).getUTCDay() + 6) % 7));

// ---------- exercise name resolution ----------
export function allExerciseNames(workouts: Workout[]): string[] {
  const s = new Set<string>();
  for (const w of workouts) for (const e of w.exercises) s.add(e.name);
  return [...s].sort();
}

export type Resolved = { names: string[] } | { error: string; candidates: string[] };

/**
 * Exact (case-insensitive) name → that exercise. Otherwise a query matching one base name
 * ("Lateral Raise") returns all its equipment variants; otherwise substring candidates.
 */
export function resolveExercise(workouts: Workout[], query: string): Resolved {
  const all = allExerciseNames(workouts);
  const q = query.toLowerCase().trim();
  const exact = all.filter((n) => n.toLowerCase() === q);
  if (exact.length) return { names: exact };
  const byBase = all.filter((n) => baseName(n).toLowerCase() === q);
  if (byBase.length) return { names: byBase };
  const words = q.split(/\s+/).filter(Boolean);
  const contains = all.filter((n) => words.every((w) => n.toLowerCase().includes(w)));
  if (contains.length === 1) return { names: contains };
  if (contains.length > 1 && new Set(contains.map(baseName)).size === 1) return { names: contains };
  return {
    error: contains.length ? `"${query}" matches several exercises; pick one.` : `No exercise matching "${query}".`,
    candidates: contains.length ? contains : all,
  };
}
