import type { Config, Muscle, Workout } from "../types.ts";
import { MUSCLES } from "../types.ts";
import { lookupExercise, mainLiftConfig, muscleCredits } from "../config.ts";
import {
  addDays, allExerciseNames, daysBetween, e1rm, fmtSet, isHard, resolveExercise, weekStart, workingSets,
} from "./common.ts";

export interface Ctx {
  workouts: Workout[]; // oldest → newest
  config: Config;
  today: string; // YYYY-MM-DD in user's timezone
}

const PRIORITY: Muscle[] = ["side_delts", "rear_delts", "front_delts", "biceps", "triceps", "forearms"];
const LOWER: Muscle[] = ["quads", "hamstrings", "glutes", "calves"];
const r1 = (n: number) => Math.round(n * 10) / 10;

function hardSetCount(w: Workout) {
  return w.exercises.reduce((n, e) => n + e.sets.filter(isHard).length, 0);
}

function muscleSets(ctx: Ctx, ws: Workout[]) {
  const sets: Partial<Record<Muscle, number>> = {};
  const unmapped: Record<string, number> = {};
  for (const w of ws)
    for (const e of w.exercises) {
      const hard = e.sets.filter(isHard).length;
      if (!hard) continue;
      const credits = muscleCredits(ctx.config, e.name);
      if (!credits) {
        unmapped[e.name] = (unmapped[e.name] ?? 0) + hard;
        continue;
      }
      for (const [m, c] of Object.entries(credits) as [Muscle, number][]) sets[m] = (sets[m] ?? 0) + c * hard;
    }
  return { sets, unmapped };
}

function compactWorkout(ctx: Ctx, w: Workout) {
  return {
    date: w.date,
    time: w.start.slice(11, 16),
    name: w.name,
    durationMin: w.durationMin,
    hardSets: hardSetCount(w),
    ...(w.notes ? { notes: w.notes } : {}),
    exercises: w.exercises.map((e) => ({
      name: e.name,
      sets: e.sets.map(fmtSet),
      ...(muscleCredits(ctx.config, e.name) ? {} : { unmapped: true }),
      ...(e.sets.some((s) => s.notes) ? { notes: e.sets.map((s) => s.notes).filter(Boolean) } : {}),
    })),
  };
}

// ---------------------------------------------------------------- get_recent_workouts
export function getRecentWorkouts(ctx: Ctx, days = 7) {
  const from = addDays(ctx.today, -(Math.max(1, days) - 1));
  const ws = ctx.workouts.filter((w) => w.date >= from && w.date <= ctx.today);
  return {
    range: { from, to: ctx.today },
    legend: "Sets: weight x reps (lb). W=warm-up, D=drop/rest-pause, F=failure, BW=bodyweight, @=RPE.",
    sessions: ws.reverse().map((w) => compactWorkout(ctx, w)),
  };
}

// ---------------------------------------------------------------- exercise_history
export function exerciseHistory(ctx: Ctx, name: string, limit = 10) {
  const res = resolveExercise(ctx.workouts, name);
  if ("error" in res) return res;
  const out: any[] = [];
  for (let i = ctx.workouts.length - 1; i >= 0 && out.length < limit; i--) {
    const w = ctx.workouts[i];
    for (const e of w.exercises) {
      if (!res.names.includes(e.name)) continue;
      const hard = e.sets.filter(isHard);
      let best = { e1rm: 0, set: "" };
      for (const s of hard) {
        const v = e1rm(s.weight, s.reps);
        if (v > best.e1rm) best = { e1rm: v, set: fmtSet(s) };
      }
      out.push({
        date: w.date,
        workout: w.name,
        ...(res.names.length > 1 ? { exercise: e.name } : {}),
        sets: e.sets.map(fmtSet),
        bestE1RM: best.e1rm || null,
        bestSet: best.set || null,
      });
    }
  }
  return { exercise: res.names.length === 1 ? res.names[0] : res.names, formula: "Epley: w*(1+reps/30)", sessions: out };
}

// ---------------------------------------------------------------- weekly_volume
export function weeklyVolume(ctx: Ctx, weeks = 4) {
  const thisWeek = weekStart(ctx.today);
  const starts = Array.from({ length: Math.max(1, weeks) }, (_, i) => addDays(thisWeek, -7 * (weeks - 1 - i)));
  const muscles: Record<string, number[]> = Object.fromEntries(MUSCLES.map((m) => [m, starts.map(() => 0)]));
  const totals = starts.map(() => 0);
  const sessions = starts.map(() => 0);
  const unmapped: Record<string, number> = {};
  starts.forEach((ws, i) => {
    const we = addDays(ws, 6);
    const inWeek = ctx.workouts.filter((w) => w.date >= ws && w.date <= we);
    sessions[i] = inWeek.length;
    totals[i] = inWeek.reduce((n, w) => n + hardSetCount(w), 0);
    const { sets, unmapped: u } = muscleSets(ctx, inWeek);
    for (const [m, v] of Object.entries(sets)) muscles[m][i] = r1(v!);
    for (const [k, v] of Object.entries(u)) unmapped[k] = (unmapped[k] ?? 0) + v;
  });
  const complete = starts.length > 1 ? starts.slice(0, -1).length : 0;
  const avg = Object.fromEntries(
    MUSCLES.map((m) => [m, complete ? r1(muscles[m].slice(0, -1).reduce((a, b) => a + b, 0) / complete) : null]),
  );
  return {
    weekStarts: starts,
    note: `Hard sets (warm-ups excluded; D/F sets count 1). Primary=1, secondary=0.5. Week starting ${thisWeek} is in progress. Priority muscles marked *.`,
    sessions,
    totalHardSets: totals,
    setsPerMuscle: Object.fromEntries(MUSCLES.map((m) => [PRIORITY.includes(m) ? `${m}*` : m, muscles[m]])),
    avgCompletedWeeks: avg,
    unmappedHardSets: unmapped,
  };
}

// ---------------------------------------------------------------- personal_records
function recordsFor(ctx: Ctx, name: string, detailed: boolean) {
  let heaviest: any = null, mostReps: any = null, bestE1: any = null;
  const byWeight = new Map<number, { reps: number; date: string }>();
  for (const w of ctx.workouts)
    for (const e of w.exercises) {
      if (e.name !== name) continue;
      for (const s of e.sets) {
        if (!isHard(s) || s.reps <= 0) continue;
        if (s.weight > 0 && (!heaviest || s.weight > heaviest.weight)) heaviest = { weight: s.weight, reps: s.reps, date: w.date };
        if (!mostReps || s.reps > mostReps.reps) mostReps = { reps: s.reps, weight: s.weight, date: w.date };
        const v = e1rm(s.weight, s.reps);
        if (v > 0 && (!bestE1 || v > bestE1.e1rm)) bestE1 = { e1rm: v, weight: s.weight, reps: s.reps, date: w.date };
        const bw = byWeight.get(s.weight);
        if (!bw || s.reps > bw.reps) byWeight.set(s.weight, { reps: s.reps, date: w.date });
      }
    }
  return {
    exercise: name,
    heaviest,
    mostReps,
    bestE1RM: bestE1,
    ...(detailed
      ? {
          repPRsByWeight: [...byWeight.entries()]
            .sort((a, b) => b[0] - a[0])
            .slice(0, 15)
            .map(([weight, v]) => ({ weight, ...v })),
        }
      : {}),
  };
}

export function personalRecords(ctx: Ctx, exercise?: string) {
  if (exercise) {
    const res = resolveExercise(ctx.workouts, exercise);
    if ("error" in res) return res;
    return { records: res.names.map((n) => recordsFor(ctx, n, true)) };
  }
  return { records: allExerciseNames(ctx.workouts).map((n) => recordsFor(ctx, n, false)).filter((r) => r.mostReps) };
}

// ---------------------------------------------------------------- progression_check
function inferRepRange(reps: number[]): [number, number] {
  const s = [...reps].sort((a, b) => a - b);
  const med = s[Math.floor(s.length / 2)] ?? 8;
  if (med <= 5) return [3, 5];
  if (med <= 8) return [6, 8];
  if (med <= 12) return [8, 12];
  if (med <= 15) return [12, 15];
  return [15, 20];
}

export function progressionCheck(ctx: Ctx) {
  const recentFrom = addDays(ctx.today, -42);
  const autoFrom = addDays(ctx.today, -56);
  const configured = Object.keys(ctx.config.mainLifts).length > 0;
  const candidates = allExerciseNames(ctx.workouts).filter((n) => {
    if (configured) return !!mainLiftConfig(ctx.config, n);
    const recent = ctx.workouts.filter((w) => w.date >= autoFrom && w.exercises.some((e) => e.name === n));
    return recent.length >= 4;
  });

  const addWeight: any[] = [], stalled: any[] = [], onTrack: any[] = [];
  for (const name of candidates) {
    const hist: { date: string; perf: number; sets: string[]; ws: { weight: number; reps: number }[] }[] = [];
    for (const w of ctx.workouts)
      for (const e of w.exercises) {
        if (e.name !== name) continue;
        const ws = workingSets(e);
        if (!ws.length) continue;
        const bodyweight = ws.every((s) => s.weight <= 0);
        const perf = Math.max(...ws.map((s) => (bodyweight ? s.reps : e1rm(s.weight, s.reps))));
        hist.push({ date: w.date, perf, sets: ws.map(fmtSet), ws: ws.map((s) => ({ weight: s.weight, reps: s.reps })) });
      }
    if (!hist.length || hist[hist.length - 1].date < recentFrom) continue;
    const cfg = mainLiftConfig(ctx.config, name);
    const range = cfg?.repRange ?? inferRepRange(hist.slice(-6).flatMap((h) => h.ws.map((s) => s.reps)));
    const last = hist[hist.length - 1];
    let bestIdx = 0;
    hist.forEach((h, i) => { if (h.perf > hist[bestIdx].perf) bestIdx = i; });
    const sinceBest = hist.length - 1 - bestIdx;
    const metric = last.ws.every((s) => s.weight <= 0) ? "reps" : "e1RM";
    const row = {
      exercise: name,
      repRange: `${range[0]}-${range[1]}${cfg ? "" : " (inferred)"}`,
      lastSession: { date: last.date, workingSets: last.sets },
      [`recent${metric}`]: hist.slice(-5).map((h) => h.perf),
      sessionsSinceBest: sinceBest,
    };
    const topped = last.ws.length === 2 && last.ws.every((s) => s.reps >= range[1]) && last.ws[0].weight === last.ws[1].weight;
    if (topped) {
      const lower = muscleCredits(ctx.config, name);
      const isLower = lower && LOWER.some((m) => lower[m] === 1);
      addWeight.push({ ...row, suggestion: `Both working sets at/above ${range[1]} reps → add ${isLower ? "10" : "5"} lb (or the smallest jump available).` });
    } else if (sinceBest >= 3) {
      stalled.push({ ...row, bestWas: { date: hist[bestIdx].date, value: hist[bestIdx].perf } });
    } else onTrack.push(row);
  }
  return {
    source: configured ? "mainLifts in muscle-map.json" : "auto: exercises done 4+ times in the last 8 weeks (set mainLifts in muscle-map.json to control this)",
    rules: "Working sets = first 2 non-warm-up, non-drop sets. Stalled = no e1RM (or reps, if bodyweight) improvement in 3+ sessions.",
    addWeight,
    stalled,
    onTrack,
  };
}

// ---------------------------------------------------------------- rotation_status
type Day = "Arms" | "Chest" | "Back" | "Lower" | "Unknown";
const UPPER: Day[] = ["Arms", "Chest", "Back"];

export function classify(ctx: Ctx, w: Workout): { type: Day; by: "name" | "muscles" } {
  const n = w.name.toLowerCase();
  if (/\blower\b|\blegs?\b/.test(n)) return { type: "Lower", by: "name" };
  if (/\barms?\b/.test(n)) return { type: "Arms", by: "name" };
  if (/\bchest\b|\bpush\b/.test(n)) return { type: "Chest", by: "name" };
  if (/\bback\b|\bpull\b/.test(n)) return { type: "Back", by: "name" };
  const { sets } = muscleSets(ctx, [w]);
  const g = (ms: Muscle[]) => ms.reduce((a, m) => a + (sets[m] ?? 0), 0);
  const lower = g(LOWER), total = Object.values(sets).reduce((a, b) => a + (b ?? 0), 0);
  if (!total) return { type: "Unknown", by: "muscles" };
  if (lower / total > 0.5) return { type: "Lower", by: "muscles" };
  const scores: [Day, number][] = [
    ["Arms", g(["biceps", "triceps", "forearms"])],
    ["Chest", g(["chest", "front_delts"])],
    ["Back", g(["back", "rear_delts"])],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  return { type: scores[0][0], by: "muscles" };
}

function expectedAfter(prev: Day, lastUpper: Day | null): Day {
  if (prev !== "Lower") return "Lower";
  return lastUpper ? UPPER[(UPPER.indexOf(lastUpper) + 1) % 3] : "Arms";
}

export function rotationStatus(ctx: Ctx, count = 12) {
  const recent = ctx.workouts.slice(-Math.max(count, 1) - 6); // extra lookback for context
  const classified = recent.map((w) => ({ w, ...classify(ctx, w) })).filter((c) => c.type !== "Unknown");
  let lastUpper: Day | null = null;
  const rows: any[] = [];
  classified.forEach((c, i) => {
    const expected = i === 0 ? null : expectedAfter(classified[i - 1].type, lastUpper);
    rows.push({
      date: c.w.date,
      name: c.w.name,
      type: c.type,
      classifiedBy: c.by,
      ...(expected && expected !== c.type ? { offRotation: `expected ${expected}` } : {}),
    });
    if (c.type !== "Lower") lastUpper = c.type;
  });
  const last = classified[classified.length - 1];
  return {
    rotation: "Upper Arms → Lower → Upper Chest → Lower → Upper Back → Lower → repeat",
    next: last ? expectedAfter(last.type, lastUpper) : "Arms",
    lastSession: last ? { date: last.w.date, type: last.type, daysAgo: daysBetween(last.w.date, ctx.today) } : null,
    lastUpper,
    sessions: rows.slice(-count).reverse(),
  };
}

// ---------------------------------------------------------------- session_summary
export function sessionSummary(ctx: Ctx, date?: string) {
  if (!ctx.workouts.length) return { error: "No workouts in data." };
  const target = !date || date === "latest" ? ctx.workouts[ctx.workouts.length - 1].date : date;
  const ws = ctx.workouts.filter((w) => w.date === target);
  if (!ws.length) {
    const before = ctx.workouts.filter((w) => w.date < target).slice(-3).map((w) => w.date);
    const after = ctx.workouts.filter((w) => w.date > target).slice(0, 3).map((w) => w.date);
    return { error: `No workout on ${target}.`, nearbyDates: [...before, ...after] };
  }
  return { sessions: ws.map((w) => summarize(ctx, w)) };
}

function summarize(ctx: Ctx, w: Workout) {
  const prior = ctx.workouts.filter((p) => p.start < w.start);
  const counts = { warmup: 0, normal: 0, drop: 0, failure: 0 };
  const prs: string[] = [];
  const firstTime: string[] = [];
  const singles: string[] = [];
  for (const e of w.exercises) {
    for (const s of e.sets) if (s.reps > 0 || s.seconds > 0 || s.distance > 0) counts[s.type]++;
    const hard = e.sets.filter((s) => isHard(s) && s.reps > 0);
    for (const s of hard) if (s.reps === 1 && s.weight > 0) singles.push(`${e.name} ${fmtSet(s)}`);
    const prev = prior.flatMap((p) => p.exercises.filter((x) => x.name === e.name).flatMap((x) => x.sets.filter((s) => isHard(s) && s.reps > 0)));
    if (!prev.length) {
      if (hard.length) firstTime.push(e.name);
      continue;
    }
    const pMax = Math.max(...prev.map((s) => s.weight));
    const pE1 = Math.max(...prev.map((s) => e1rm(s.weight, s.reps)));
    const topW = hard.reduce((m, s) => Math.max(m, s.weight), 0);
    const topE = hard.reduce((best, s) => (e1rm(s.weight, s.reps) > e1rm(best?.weight ?? 0, best?.reps ?? 0) ? s : best), hard[0]);
    if (topW > pMax && topW > 0) prs.push(`${e.name}: weight PR ${topW} lb (prev ${pMax})`);
    if (topE && e1rm(topE.weight, topE.reps) > pE1 && pE1 > 0)
      prs.push(`${e.name}: e1RM PR ${e1rm(topE.weight, topE.reps)} from ${fmtSet(topE)} (prev ${pE1})`);
    // rep PR: more reps than ever at this weight or heavier
    let repPr: string | null = null;
    for (const s of hard) {
      const best = Math.max(0, ...prev.filter((p) => p.weight >= s.weight).map((p) => p.reps));
      if (best > 0 && s.reps > best && (!repPr || s.weight > 0)) repPr = `${e.name}: rep PR ${fmtSet(s)} (prev best ${best} reps at ≥${s.weight || "BW"})`;
    }
    if (repPr) prs.push(repPr);
  }
  const { sets, unmapped } = muscleSets(ctx, [w]);
  const flags: string[] = [];
  if (w.durationMin && w.durationMin > ctx.config.flags.maxDurationMin) flags.push(`Long session: ${w.durationMin} min (> ${ctx.config.flags.maxDurationMin}).`);
  if (counts.drop > ctx.config.flags.maxDropSets) flags.push(`Many rest-pause/drop sets: ${counts.drop} (> ${ctx.config.flags.maxDropSets}).`);
  if (singles.length) flags.push(`Singles / max tests: ${singles.join("; ")}.`);
  if (Object.keys(unmapped).length) flags.push(`Unmapped exercises (not in volume): ${Object.keys(unmapped).join(", ")}.`);
  return {
    date: w.date,
    start: w.start.slice(11, 16),
    name: w.name,
    rotationDay: classify(ctx, w).type,
    durationMin: w.durationMin,
    hardSets: counts.normal + counts.drop + counts.failure,
    setBreakdown: counts,
    setsPerMuscle: Object.fromEntries(Object.entries(sets).map(([m, v]) => [m, r1(v!)])),
    prs,
    firstTimeExercises: firstTime,
    flags,
    exercises: compactWorkout(ctx, w).exercises,
  };
}

// ---------------------------------------------------------------- data_status
export function unmappedExercises(ctx: Ctx) {
  const out: Record<string, { hardSets: number; lastDone: string }> = {};
  for (const w of ctx.workouts)
    for (const e of w.exercises) {
      if (lookupExercise(ctx.config, e.name)) continue;
      const o = (out[e.name] ??= { hardSets: 0, lastDone: w.date });
      o.hardSets += e.sets.filter(isHard).length;
      o.lastDone = w.date;
    }
  return out;
}
