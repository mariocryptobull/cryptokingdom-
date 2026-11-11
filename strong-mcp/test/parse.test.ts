import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/csv.ts";
import { parseDuration, parseStrongCsv } from "../src/parse.ts";
import { SAMPLE } from "./helpers.ts";

describe("csv", () => {
  it("handles quotes, embedded commas/newlines, CRLF, BOM, semicolons", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\r\n')).toEqual([["a", "b"], ["x, y", 'he said "hi"']]);
    expect(parseCsv('a;b\n1;"2\n3"\n')).toEqual([["a", "b"], ["1", "2\n3"]]);
  });
});

describe("parseDuration", () => {
  it.each([
    ["1h 15m", "", 75],
    ["45m", "", 45],
    ["2h", "", 120],
    ["30s", "", 0.5],
    ["01:05:00", "", 65],
    ["3900", "sec", 65],
    ["", "", null],
  ])("%s → %s", (s, u, want) => expect(parseDuration(s, u)).toBe(want));
});

describe("parseStrongCsv (sample)", () => {
  const { workouts, warnings } = parseStrongCsv(SAMPLE);

  it("groups rows into workouts, oldest first", () => {
    expect(workouts).toHaveLength(11);
    expect(workouts[0]).toMatchObject({ date: "2026-10-19", name: "Upper Arms", durationMin: 75, notes: "felt good, slept 8h" });
    expect(workouts.at(-1)!.date).toBe("2026-11-10");
  });

  it("types W/D/F/numeric sets and keeps log order", () => {
    const curl = workouts[0].exercises[0];
    expect(curl.name).toBe("Bicep Curl (Barbell)");
    expect(curl.sets.map((s) => s.type)).toEqual(["warmup", "normal", "normal", "drop"]);
    expect(curl.sets[1]).toMatchObject({ weight: 75, reps: 10, rpe: 8, rawOrder: "1" });
    const squat = workouts.at(-1)!.exercises[0];
    expect(squat.sets.map((s) => s.rawOrder)).toEqual(["W", "F", "1"]);
  });

  it("skips rest-timer rows and treats blank weight as 0", () => {
    expect(warnings.some((w) => w.includes("Skipped 1"))).toBe(true);
    const dl = workouts.find((w) => w.date === "2026-11-04")!.exercises[1];
    expect(dl.sets).toHaveLength(2);
    const pu = workouts.find((w) => w.date === "2026-11-07")!.exercises[1];
    expect(pu.sets[0]).toMatchObject({ weight: 0, reps: 8 });
  });

  it("supports the newer header variant (Workout #, Duration (sec), Weight (kg))", () => {
    const csv = [
      "Workout #;Date;Workout Name;Duration (sec);Exercise Name;Set Order;Weight (kg);Reps;RPE;Distance (meters);Seconds;Notes;Workout Notes",
      "1;2026-11-01 10:00:00;Upper Arms;3600;Bicep Curl (Barbell);1;30;10;;0;0;;",
    ].join("\n");
    const r = parseStrongCsv(csv);
    expect(r.workouts[0].durationMin).toBe(60);
    expect(r.workouts[0].exercises[0].sets[0].weight).toBe(66.1);
    expect(r.warnings[0]).toMatch(/kg/);
  });

  it("rejects files that are not Strong exports", () => {
    expect(() => parseStrongCsv("foo,bar\n1,2")).toThrow(/missing column/);
  });
});
