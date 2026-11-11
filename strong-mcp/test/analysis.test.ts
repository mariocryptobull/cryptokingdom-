import { describe, expect, it } from "vitest";
import * as A from "../src/analysis/index.ts";
import { addDays, e1rm, resolveExercise, weekStart } from "../src/analysis/common.ts";
import { DEFAULT_CONFIG, loadConfig, muscleCredits } from "../src/config.ts";
import { sampleCtx } from "./helpers.ts";

const ctx = sampleCtx();

describe("helpers", () => {
  it("Epley e1RM", () => {
    expect(e1rm(225, 8)).toBe(285);
    expect(e1rm(315, 1)).toBe(315);
    expect(e1rm(0, 10)).toBe(0);
  });
  it("weeks start Monday", () => {
    expect(weekStart("2026-11-11")).toBe("2026-11-09");
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
    expect(weekStart("2026-11-15")).toBe("2026-11-09");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
  });
  it("resolves exercise names", () => {
    expect(resolveExercise(ctx.workouts, "lateral raise")).toEqual({ names: ["Lateral Raise (Dumbbell)"] });
    expect(resolveExercise(ctx.workouts, "squat")).toEqual({ names: ["Squat (Barbell)"] });
    expect(resolveExercise(ctx.workouts, "zzz")).toHaveProperty("error");
  });
  it("muscle map: base-name fallback, primary 1, secondary 0.5", () => {
    expect(muscleCredits(DEFAULT_CONFIG, "Incline Bench Press (Dumbbell)")).toEqual({ chest: 1, front_delts: 0.5, triceps: 0.5 });
    expect(muscleCredits(DEFAULT_CONFIG, "Tibialis Raise")).toBeNull();
    expect(muscleCredits(DEFAULT_CONFIG, "Running")).toEqual({});
  });
  it("muscle map JSON: smart quotes tolerated, bad muscles warned", () => {
    const { config, warnings } = loadConfig('{ “exercises”: { "X": { "primary": ["biceps", "lats"] } } }');
    expect(config.exercises.X.primary).toEqual(["biceps"]);
    expect(warnings[0]).toMatch(/lats/);
  });
});

describe("get_recent_workouts", () => {
  it("returns sessions in the window, newest first, with compact sets", () => {
    const r = A.getRecentWorkouts(ctx, 5);
    expect(r.sessions.map((s) => s.date)).toEqual(["2026-11-10", "2026-11-07"]);
    expect(r.sessions[0].exercises[0].sets).toEqual(["W 135x5", "F 225x7", "225x6"]);
    expect(r.sessions[1].exercises[1].sets).toEqual(["BWx8", "BWx7"]);
    expect(r.sessions[0].exercises[1].sets).toEqual(["60s"]);
  });
});

describe("exercise_history", () => {
  it("lists sessions newest first with best e1RM", () => {
    const r = A.exerciseHistory(ctx, "bicep curl", 2) as any;
    expect(r.exercise).toBe("Bicep Curl (Barbell)");
    expect(r.sessions).toHaveLength(2);
    expect(r.sessions[0]).toMatchObject({ date: "2026-11-02", bestE1RM: 106.7, bestSet: "80x10" });
  });
});

describe("weekly_volume", () => {
  const r = A.weeklyVolume(ctx, 4);
  it("buckets Mon–Sun weeks ending with the current week", () => {
    expect(r.weekStarts).toEqual(["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"]);
    expect(r.sessions).toEqual([4, 2, 4, 1]);
  });
  it("excludes warm-ups, counts D/F, weights secondary 0.5", () => {
    // wk1: curls 2N+1D = 3 biceps; pushdown 2 + incline DB 3*0.5 = 3.5 triceps
    expect(r.setsPerMuscle["biceps*"][0]).toBe(3);
    expect(r.setsPerMuscle["triceps*"][0]).toBe(3.5);
    expect(r.setsPerMuscle["side_delts*"][0]).toBe(4);
    // current week: squat F + normal = 2 quads; plank 1 abs
    expect(r.setsPerMuscle.quads[3]).toBe(2);
    expect(r.setsPerMuscle.abs[3]).toBe(1);
  });
  it("reports unmapped exercises", () => {
    expect(r.unmappedHardSets).toEqual({ "Tibialis Raise": 2 });
  });
});

describe("personal_records", () => {
  it("per exercise, with rep PRs by weight", () => {
    const r = A.personalRecords(ctx, "squat") as any;
    const sq = r.records[0];
    expect(sq.heaviest).toMatchObject({ weight: 225 });
    expect(sq.bestE1RM).toMatchObject({ e1rm: 285, date: "2026-10-21" });
    expect(sq.mostReps).toMatchObject({ reps: 10, weight: 185 });
    expect(sq.repPRsByWeight[0]).toMatchObject({ weight: 225, reps: 8 });
  });
  it("ignores warm-ups", () => {
    const r = A.personalRecords(ctx, "deadlift") as any;
    expect(r.records[0].mostReps.reps).toBe(1);
  });
  it("all exercises when no name given", () => {
    const r = A.personalRecords(ctx) as any;
    expect(r.records.length).toBeGreaterThan(10);
  });
});

describe("progression_check", () => {
  it("auto mode flags stalled squat, lateral raise on track", () => {
    const r = A.progressionCheck(ctx);
    expect(r.stalled.map((x) => x.exercise)).toEqual(["Squat (Barbell)"]);
    expect(r.stalled[0].sessionsSinceBest).toBe(4);
    expect(r.onTrack.map((x) => x.exercise)).toEqual(["Lateral Raise (Dumbbell)"]);
  });
  it("configured main lifts: both working sets at top of range → add weight", () => {
    const config = { ...DEFAULT_CONFIG, mainLifts: { "Triceps Pushdown": { repRange: [8, 12] as [number, number] }, "Squat (Barbell)": { repRange: [6, 8] as [number, number] } } };
    const r = A.progressionCheck(sampleCtx(config));
    expect(r.addWeight.map((x) => x.exercise)).toEqual(["Triceps Pushdown (Cable - Straight Bar)"]);
    expect(r.addWeight[0].suggestion).toMatch(/add 5 lb/);
    expect(r.stalled.map((x) => x.exercise)).toEqual(["Squat (Barbell)"]);
  });
});

describe("rotation_status", () => {
  const r = A.rotationStatus(ctx);
  it("classifies sessions and picks next day", () => {
    expect(r.next).toBe("Arms");
    expect(r.lastUpper).toBe("Back");
    expect(r.lastSession).toEqual({ date: "2026-11-10", type: "Lower", daysAgo: 1 });
  });
  it("flags off-rotation sessions", () => {
    const off = r.sessions.filter((s) => s.offRotation);
    expect(off).toEqual([expect.objectContaining({ date: "2026-11-07", offRotation: "expected Lower" })]);
  });
  it("falls back to muscle-based classification for unnamed workouts", () => {
    const w = { ...ctx.workouts[2], name: "Evening Workout" };
    expect(A.classify(ctx, w)).toEqual({ type: "Chest", by: "muscles" });
  });
});

describe("session_summary", () => {
  it("PRs and flags on a long, rest-pause-heavy arm day", () => {
    const r = A.sessionSummary(ctx, "2026-11-02") as any;
    const s = r.sessions[0];
    expect(s.rotationDay).toBe("Arms");
    expect(s.hardSets).toBe(10);
    expect(s.setBreakdown).toEqual({ warmup: 2, normal: 6, drop: 4, failure: 0 });
    expect(s.prs.join("\n")).toMatch(/Bicep Curl.*weight PR 80/);
    expect(s.prs.join("\n")).toMatch(/Bicep Curl.*e1RM PR 106.7/);
    expect(s.prs.join("\n")).toMatch(/Triceps Pushdown.*rep PR 60x12/);
    expect(s.flags.join("\n")).toMatch(/Long session: 135/);
    expect(s.flags.join("\n")).toMatch(/rest-pause\/drop sets: 4/);
  });
  it("flags singles and first-time exercises", () => {
    const s = (A.sessionSummary(ctx, "2026-11-04") as any).sessions[0];
    expect(s.flags.join("\n")).toMatch(/Singles.*Deadlift \(Barbell\) 315x1/);
    expect(s.firstTimeExercises).toEqual(["Deadlift (Barbell)"]);
  });
  it("latest by default; nearby dates on miss", () => {
    expect((A.sessionSummary(ctx) as any).sessions[0].date).toBe("2026-11-10");
    expect(A.sessionSummary(ctx, "2026-11-08")).toMatchObject({ error: expect.any(String), nearbyDates: expect.arrayContaining(["2026-11-07", "2026-11-10"]) });
  });
});

describe("unmapped", () => {
  it("lists every exercise not in the map", () => {
    expect(Object.keys(A.unmappedExercises(ctx))).toEqual(["Tibialis Raise"]);
  });
});
