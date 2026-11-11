import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONFIG } from "../src/config.ts";
import { parseStrongCsv } from "../src/parse.ts";
import type { Ctx } from "../src/analysis/index.ts";
import type { Config } from "../src/types.ts";

export const SAMPLE = readFileSync(fileURLToPath(new URL("./fixtures/sample.csv", import.meta.url)), "utf8");
export const sampleCtx = (config: Config = DEFAULT_CONFIG): Ctx => ({
  workouts: parseStrongCsv(SAMPLE).workouts,
  config,
  today: "2026-11-11",
});
