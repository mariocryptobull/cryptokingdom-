import defaultMap from "./default-muscle-map.json";
import { MUSCLES, type Config, type MainLiftConfig, type Muscle, type MuscleMapEntry } from "./types.ts";

const MUSCLE_SET = new Set<string>(MUSCLES);

export const DEFAULT_CONFIG: Config = loadConfig(JSON.stringify(defaultMap)).config;

/** Parse + validate a muscle-map JSON. Invalid muscles are dropped with a warning. */
export function loadConfig(text: string): { config: Config; warnings: string[] } {
  const warnings: string[] = [];
  // Google Docs / phone editors love smart quotes.
  const cleaned = text.replace(/[“”„‟]/g, '"').replace(/[‘’]/g, "'");
  const raw = JSON.parse(cleaned) as Record<string, unknown>;

  const exercises: Record<string, MuscleMapEntry> = {};
  for (const [name, v] of Object.entries((raw.exercises ?? {}) as Record<string, any>)) {
    const clean = (list: unknown, field: string): Muscle[] =>
      (Array.isArray(list) ? list : []).filter((m) => {
        const ok = MUSCLE_SET.has(String(m));
        if (!ok) warnings.push(`"${name}".${field}: unknown muscle "${m}"`);
        return ok;
      }) as Muscle[];
    exercises[name] = { primary: clean(v?.primary, "primary"), secondary: clean(v?.secondary, "secondary") };
  }

  const mainLifts: Record<string, MainLiftConfig> = {};
  for (const [name, v] of Object.entries((raw.mainLifts ?? {}) as Record<string, any>)) {
    const rr = v?.repRange;
    if (Array.isArray(rr) && rr.length === 2 && rr.every((n) => Number.isFinite(n)) && rr[0] <= rr[1]) {
      mainLifts[name] = { repRange: [rr[0], rr[1]] };
    } else warnings.push(`mainLifts."${name}": repRange must be [low, high]`);
  }

  const f = (raw.flags ?? {}) as Record<string, unknown>;
  return {
    config: {
      exercises,
      ignore: Array.isArray(raw.ignore) ? raw.ignore.map(String) : [],
      mainLifts,
      flags: {
        maxDurationMin: Number(f.maxDurationMin) || 120,
        maxDropSets: Number(f.maxDropSets) || 3,
      },
    },
    warnings,
  };
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
export const baseName = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim();

export type Lookup = { entry: MuscleMapEntry; matchedKey: string } | { ignored: true } | null;

export function lookupExercise(config: Config, name: string): Lookup {
  const n = norm(name);
  const b = norm(baseName(name));
  if (config.ignore.some((i) => norm(i) === n || norm(i) === b)) return { ignored: true };
  let fallback: Lookup = null;
  for (const [key, entry] of Object.entries(config.exercises)) {
    const k = norm(key);
    if (k === n) return { entry, matchedKey: key };
    if (!fallback && k === b) fallback = { entry, matchedKey: key };
  }
  return fallback;
}

/** Muscle → set credit for one hard set of this exercise. */
export function muscleCredits(config: Config, name: string): Partial<Record<Muscle, number>> | null {
  const l = lookupExercise(config, name);
  if (!l) return null;
  if ("ignored" in l) return {};
  const out: Partial<Record<Muscle, number>> = {};
  for (const m of l.entry.primary) out[m] = 1;
  for (const m of l.entry.secondary ?? []) out[m] = Math.max(out[m] ?? 0, 0.5);
  return out;
}

export function mainLiftConfig(config: Config, name: string): MainLiftConfig | undefined {
  const n = norm(name);
  const b = norm(baseName(name));
  const hit =
    Object.entries(config.mainLifts).find(([k]) => norm(k) === n) ??
    Object.entries(config.mainLifts).find(([k]) => norm(k) === b);
  return hit?.[1];
}
