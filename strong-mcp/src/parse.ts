import { parseCsv } from "./csv.ts";
import type { ParseResult, SetType, Workout, WorkoutSet } from "./types.ts";

const KG_TO_LB = 2.2046226218;

/** Canonical column → header aliases (matched case-insensitively, units in parentheses stripped). */
const COLUMNS = {
  date: ["date"],
  workoutName: ["workout name"],
  duration: ["duration"],
  exercise: ["exercise name"],
  setOrder: ["set order"],
  weight: ["weight"],
  reps: ["reps"],
  distance: ["distance"],
  seconds: ["seconds"],
  notes: ["notes"],
  workoutNotes: ["workout notes"],
  rpe: ["rpe"],
} as const;
type Col = keyof typeof COLUMNS;

const REQUIRED: Col[] = ["date", "workoutName", "exercise", "setOrder", "weight", "reps"];

export function parseStrongCsv(text: string): ParseResult {
  const rows = parseCsv(text);
  const warnings: string[] = [];
  if (!rows.length) return { workouts: [], warnings: ["CSV is empty"], columns: [] };

  const header = rows[0].map((h) => h.trim());
  const idx = {} as Record<Col, number>;
  const unit = { weight: "lb", distance: "", duration: "" };
  header.forEach((h, i) => {
    const base = h.replace(/\(.*?\)/g, "").trim().toLowerCase();
    const paren = (h.match(/\((.*?)\)/)?.[1] ?? "").toLowerCase();
    for (const [col, aliases] of Object.entries(COLUMNS) as [Col, readonly string[]][]) {
      if (aliases.includes(base) && idx[col] === undefined) {
        idx[col] = i;
        if (col === "weight" && paren) unit.weight = paren;
        if (col === "duration" && paren) unit.duration = paren;
        if (col === "distance" && paren) unit.distance = paren;
      }
    }
  });
  const missing = REQUIRED.filter((c) => idx[c] === undefined);
  if (missing.length) {
    throw new Error(
      `Unrecognized Strong CSV: missing column(s) ${missing.join(", ")}. Header was: ${header.join(" | ")}`,
    );
  }
  const weightFactor = unit.weight.startsWith("kg") ? KG_TO_LB : 1;
  if (weightFactor !== 1) warnings.push("Weights exported in kg; converted to lb.");

  const get = (r: string[], c: Col) => (idx[c] === undefined ? "" : (r[idx[c]] ?? "").trim());
  const byId = new Map<string, Workout>();
  let skipped = 0;

  for (let ri = 1; ri < rows.length; ri++) {
    const r = rows[ri];
    const rawOrder = get(r, "setOrder");
    const type = setType(rawOrder);
    const exercise = get(r, "exercise");
    const rawDate = get(r, "date");
    if (!type || !exercise || !rawDate) {
      skipped++;
      continue;
    }
    const start = normalizeDate(rawDate);
    if (!start) {
      warnings.push(`Row ${ri + 1}: unparseable date "${rawDate}"`);
      continue;
    }
    const name = get(r, "workoutName");
    const id = `${start}|${name}`;
    let w = byId.get(id);
    if (!w) {
      w = {
        id,
        start,
        date: start.slice(0, 10),
        name,
        durationMin: parseDuration(get(r, "duration"), unit.duration),
        notes: get(r, "workoutNotes"),
        exercises: [],
      };
      byId.set(id, w);
    }
    let ex = w.exercises[w.exercises.length - 1];
    if (!ex || ex.name !== exercise) {
      ex = w.exercises.find((e) => e.name === exercise) ?? { name: exercise, sets: [] };
      if (!w.exercises.includes(ex)) w.exercises.push(ex);
    }
    const set: WorkoutSet = {
      order: ex.sets.length + 1,
      rawOrder,
      type,
      weight: round(num(get(r, "weight")) * weightFactor, 1),
      reps: Math.round(num(get(r, "reps"))),
      seconds: num(get(r, "seconds")),
      distance: num(get(r, "distance")),
      rpe: get(r, "rpe") === "" ? null : num(get(r, "rpe")) || null,
      notes: get(r, "notes"),
    };
    ex.sets.push(set);
  }
  if (skipped) warnings.push(`Skipped ${skipped} non-set row(s) (e.g. rest timers / notes).`);

  const workouts = [...byId.values()].sort((a, b) => a.start.localeCompare(b.start));
  return { workouts, warnings, columns: header };
}

function setType(raw: string): SetType | null {
  const s = raw.toUpperCase();
  if (/^\d+$/.test(s)) return "normal";
  if (s === "W") return "warmup";
  if (s === "D") return "drop";
  if (s === "F") return "failure";
  return null;
}

function num(s: string): number {
  if (!s) return 0;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function round(n: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Accepts "2026-11-10 18:05:12", "2026-11-10T18:05:12", "2026-11-10 18:05". */
function normalizeDate(s: string): string | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4].padStart(2, "0")}:${m[5]}:${m[6] ?? "00"}`;
  const d = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (d) return `${d[1]}-${d[2]}-${d[3]}T00:00:00`;
  return null;
}

/** "1h 5m", "45m", "1h", "50s", "01:05:00", or plain seconds when the header says "(sec)". */
export function parseDuration(s: string, unitHint = ""): number | null {
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    return unitHint.startsWith("sec") || n > 600 ? round(n / 60, 1) : n;
  }
  const hms = s.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (hms) {
    const [h, m, sec] = hms[3] !== undefined ? [+hms[1], +hms[2], +hms[3]] : [0, +hms[1], +hms[2]];
    return round(h * 60 + m + sec / 60, 1);
  }
  let total = 0;
  let matched = false;
  for (const [, v, u] of s.matchAll(/(\d+(?:\.\d+)?)\s*([hms])/gi)) {
    matched = true;
    const n = Number(v);
    total += u.toLowerCase() === "h" ? n * 60 : u.toLowerCase() === "m" ? n : n / 60;
  }
  return matched ? round(total, 1) : null;
}
