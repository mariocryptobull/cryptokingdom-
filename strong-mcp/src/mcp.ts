/**
 * Minimal stateless MCP server over Streamable HTTP (JSON responses, no sessions, no SSE).
 * Implements: initialize, ping, tools/list, tools/call, notifications/*.
 */
import * as A from "./analysis/index.ts";
import type { DataSnapshot } from "./data.ts";
import { todayIn } from "./analysis/common.ts";

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "strong-mcp", version: "0.1.0" };

export const INSTRUCTIONS = `Read-only access to the user's Strong app workout log (lb).
Training context: Upper/Lower "infinity" rotation that ignores weekdays: Upper Arms → Lower → Upper Chest → Lower → Upper Back → Lower → repeat.
Set scheme per exercise: 1–2 warm-ups (W, excluded from volume), 2 working sets, 1–2 back-offs. D = drop/rest-pause, F = failure; both count as hard sets.
Weak points / priorities: shoulders (side and rear delts) and arms.
Currently on a winter bulk: ~3,000 kcal and 170 g protein per day (not logged in Strong — use for context only).
Data comes from the newest CSV export in the user's Google Drive "Strong Exports" folder; call data_status if results look stale or exercises are unmapped.`;

type Json = Record<string, unknown>;
interface Tool {
  name: string;
  description: string;
  inputSchema: Json;
  run: (ctx: A.Ctx, args: Json, snap: DataSnapshot) => unknown;
}

const int = (v: unknown, def: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
};
const obj = (props: Json, required: string[] = []) => ({ type: "object", properties: props, required, additionalProperties: false });

export const TOOLS: Tool[] = [
  {
    name: "get_recent_workouts",
    description: "Workouts from the last N days (including today), newest first, with every exercise and set. Sets formatted 'weight x reps'; W=warm-up, D=drop/rest-pause, F=failure.",
    inputSchema: obj({ days: { type: "integer", minimum: 1, maximum: 365, default: 7, description: "How many days back" } }),
    run: (ctx, a) => A.getRecentWorkouts(ctx, int(a.days, 7, 1, 365)),
  },
  {
    name: "exercise_history",
    description: "Every set of one exercise over time (newest first), with the best Epley estimated 1RM per session. Accepts a partial name; a base name like 'Lateral Raise' includes all equipment variants.",
    inputSchema: obj(
      {
        name: { type: "string", description: "Exercise name as in Strong, or part of it" },
        limit: { type: "integer", minimum: 1, maximum: 200, default: 10, description: "Max sessions" },
      },
      ["name"],
    ),
    run: (ctx, a) => A.exerciseHistory(ctx, String(a.name ?? ""), int(a.limit, 10, 1, 200)),
  },
  {
    name: "weekly_volume",
    description: "Hard sets per muscle group per week (Mon–Sun), last N weeks including the current partial week. Warm-ups excluded; drop/failure sets count. Primary muscle = 1 set, secondary = 0.5.",
    inputSchema: obj({ weeks: { type: "integer", minimum: 1, maximum: 52, default: 4 } }),
    run: (ctx, a) => A.weeklyVolume(ctx, int(a.weeks, 4, 1, 52)),
  },
  {
    name: "personal_records",
    description: "Weight, rep, and estimated-1RM PRs. With an exercise: also best reps at each weight. Without: one line per exercise ever performed.",
    inputSchema: obj({ exercise: { type: "string", description: "Optional exercise name (partial ok)" } }),
    run: (ctx, a) => A.personalRecords(ctx, a.exercise ? String(a.exercise) : undefined),
  },
  {
    name: "progression_check",
    description: "Main lifts that should get more weight (both working sets at the top of the rep range) or have stalled (no e1RM improvement for 3+ sessions).",
    inputSchema: obj({}),
    run: (ctx) => A.progressionCheck(ctx),
  },
  {
    name: "rotation_status",
    description: "Classifies recent sessions as Arms/Chest/Back/Lower, flags off-rotation sessions, and says which day is next.",
    inputSchema: obj({ count: { type: "integer", minimum: 1, maximum: 50, default: 12 } }),
    run: (ctx, a) => A.rotationStatus(ctx, int(a.count, 12, 1, 50)),
  },
  {
    name: "session_summary",
    description: "Summary of the workout(s) on a date: duration, hard-set count, sets per muscle, PRs vs. all earlier history, and flags (>2h, too many rest-pauses, singles/max tests, unmapped exercises).",
    inputSchema: obj({ date: { type: "string", description: "YYYY-MM-DD, or 'latest' (default)" } }),
    run: (ctx, a) => A.sessionSummary(ctx, a.date ? String(a.date) : undefined),
  },
  {
    name: "data_status",
    description: "Which export file is loaded, date range, workout count, muscle-map source, parse warnings, and every exercise missing from the muscle map.",
    inputSchema: obj({}),
    run: (ctx, _a, snap) => ({
      file: snap.csvFile,
      columns: snap.parsed.columns,
      workouts: ctx.workouts.length,
      range: ctx.workouts.length ? { first: ctx.workouts[0].date, last: ctx.workouts[ctx.workouts.length - 1].date } : null,
      today: ctx.today,
      muscleMap: snap.configSource,
      configWarnings: snap.configWarnings,
      parseWarnings: snap.parsed.warnings,
      unmappedExercises: A.unmappedExercises(ctx),
    }),
  },
];

interface RpcMsg { jsonrpc: "2.0"; id?: string | number | null; method?: string; params?: Json }

export async function handleMcp(
  req: Request,
  load: () => Promise<DataSnapshot>,
  timezone: string,
): Promise<Response> {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }
  const msgs = (Array.isArray(body) ? body : [body]) as RpcMsg[];
  const out: unknown[] = [];
  for (const m of msgs) {
    if (!m || typeof m !== "object" || m.id === undefined || m.id === null) continue; // notification / response
    out.push(await dispatch(m, load, timezone));
  }
  if (!out.length) return new Response(null, { status: 202 });
  return json(Array.isArray(body) ? out : out[0]);
}

async function dispatch(m: RpcMsg, load: () => Promise<DataSnapshot>, tz: string) {
  const id = m.id!;
  switch (m.method) {
    case "initialize": {
      const requested = String((m.params as Json)?.protocolVersion ?? "");
      return rpcResult(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema, annotations: { readOnlyHint: true } })),
      });
    case "tools/call": {
      const name = String(m.params?.name ?? "");
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`);
      try {
        const snap = await load();
        const ctx: A.Ctx = { workouts: snap.parsed.workouts, config: snap.config, today: todayIn(tz) };
        const result = tool.run(ctx, (m.params?.arguments ?? {}) as Json, snap) as Json;
        const isError = !!result && typeof result === "object" && "error" in result;
        return rpcResult(id, { content: [{ type: "text", text: JSON.stringify(result) }], isError });
      } catch (e) {
        return rpcResult(id, { content: [{ type: "text", text: `Error: ${(e as Error).message}` }], isError: true });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${m.method}`);
  }
}

const rpcResult = (id: string | number | null, result: unknown) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id: string | number | null, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });
