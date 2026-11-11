/**
 * Usage: npm run check-map -- path/to/strong.csv [path/to/muscle-map.json]
 * Prints every exercise in the export that the muscle map doesn't cover, plus a JSON stub to paste in.
 */
import { readFileSync } from "node:fs";
import { DEFAULT_CONFIG, loadConfig, lookupExercise } from "../src/config.ts";
import { parseStrongCsv } from "../src/parse.ts";

const [csvPath, mapPath] = process.argv.slice(2);
if (!csvPath) {
  console.error("Usage: npm run check-map -- <strong.csv> [muscle-map.json]");
  process.exit(1);
}
const config = mapPath ? loadConfig(readFileSync(mapPath, "utf8")).config : DEFAULT_CONFIG;
const { workouts, warnings } = parseStrongCsv(readFileSync(csvPath, "utf8"));
const counts = new Map<string, number>();
for (const w of workouts) for (const e of w.exercises) counts.set(e.name, (counts.get(e.name) ?? 0) + 1);

const unmapped = [...counts.keys()].filter((n) => !lookupExercise(config, n)).sort();
console.log(`${workouts.length} workouts, ${counts.size} exercises, ${unmapped.length} unmapped.`);
for (const w of warnings) console.log(`warning: ${w}`);
if (unmapped.length) {
  console.log("\nAdd these to \"exercises\" in muscle-map.json:\n");
  console.log(JSON.stringify(Object.fromEntries(unmapped.map((n) => [n, { primary: [], secondary: [] }])), null, 2));
}
