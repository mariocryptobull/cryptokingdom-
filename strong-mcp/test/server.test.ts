import { describe, expect, it, vi } from "vitest";
import { DataStore, newestCsv } from "../src/data.ts";
import type { DriveClient, DriveFile } from "../src/drive.ts";
import { handleMcp } from "../src/mcp.ts";
import worker from "../src/index.ts";
import { SAMPLE } from "./helpers.ts";

const f = (id: string, name: string, t: string, mimeType = "text/csv"): DriveFile => ({ id, name, mimeType, modifiedTime: t, createdTime: t });

function fakeDrive(files: DriveFile[], contents: Record<string, string>) {
  const d: DriveClient = {
    findFolder: vi.fn(async () => "folder1"),
    listFolder: vi.fn(async () => files),
    download: vi.fn(async (file: DriveFile) => contents[file.id]),
  };
  return d;
}

describe("DataStore", () => {
  it("picks the newest CSV, caches, and refreshes when a newer file appears", async () => {
    const files = [f("old", "strong.csv", "2026-10-01T00:00:00Z"), f("new", "strong (1).csv", "2026-11-10T00:00:00Z")];
    const short = SAMPLE.split("\n").slice(0, 5).join("\n");
    const drive = fakeDrive(files, { old: short, new: SAMPLE });
    let now = 0;
    const store = new DataStore(drive, { folderName: "Strong Exports", now: () => now });

    const a = await store.get();
    expect(a.csvFile.name).toBe("strong (1).csv");
    expect(a.parsed.workouts).toHaveLength(11);
    expect(a.configSource).toMatch(/bundled default/);

    await store.get(); // within 60s: no Drive calls
    expect(drive.listFolder).toHaveBeenCalledTimes(1);

    now = 61_000; // same files: metadata checked, no re-download
    await store.get();
    expect(drive.listFolder).toHaveBeenCalledTimes(2);
    expect(drive.download).toHaveBeenCalledTimes(1);

    files.push(f("newer", "strong (2).csv", "2026-11-11T00:00:00Z"));
    files.push(f("map", "muscle-map.json", "2026-11-01T00:00:00Z", "application/json"));
    (drive as any).download = vi.fn(async (file: DriveFile) =>
      file.id === "map" ? '{"exercises":{"Tibialis Raise":{"primary":["calves"]}}}' : short,
    );
    now = 130_000;
    const b = await store.get();
    expect(b.csvFile.name).toBe("strong (2).csv");
    expect(b.parsed.workouts.length).toBeLessThan(11);
    expect(b.configSource).toBe("Drive: muscle-map.json");
    expect(Object.keys(b.config.exercises)).toEqual(["Tibialis Raise"]);
  });

  it("falls back to the bundled map when the Drive map is invalid", async () => {
    const drive = fakeDrive(
      [f("c", "s.csv", "2026-11-10T00:00:00Z"), f("m", "muscle-map", "2026-11-10T00:00:00Z", "application/vnd.google-apps.document")],
      { c: SAMPLE, m: "{ not json" },
    );
    const s = await new DataStore(drive, { folderName: "x" }).get();
    expect(s.configSource).toMatch(/failed to parse/);
    expect(s.configWarnings).toHaveLength(1);
  });

  it("newestCsv ignores non-CSV files and accepts Google Sheets", () => {
    expect(newestCsv([f("j", "notes.txt", "2026-12-01T00:00:00Z", "text/plain"), f("s", "Strong", "2026-11-01T00:00:00Z", "application/vnd.google-apps.spreadsheet")])?.id).toBe("s");
  });
});

describe("MCP protocol", () => {
  const drive = fakeDrive([f("c", "s.csv", "2026-11-10T00:00:00Z")], { c: SAMPLE });
  const store = new DataStore(drive, { folderName: "x" });
  const call = async (body: unknown) => {
    const res = await handleMcp(new Request("https://x/mcp", { method: "POST", body: JSON.stringify(body) }), () => store.get(), "America/New_York");
    return { status: res.status, body: (res.status === 202 ? null : await res.json()) as any };
  };

  it("initialize negotiates version and returns instructions", async () => {
    const { body } = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } });
    expect(body.result.protocolVersion).toBe("2025-03-26");
    expect(body.result.capabilities.tools).toBeDefined();
    expect(body.result.instructions).toMatch(/Upper Arms → Lower/);
  });
  it("notifications get 202", async () => {
    expect((await call({ jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202);
  });
  it("lists all tools as read-only", async () => {
    const { body } = await call({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    expect(body.result.tools.map((t: any) => t.name)).toEqual([
      "get_recent_workouts", "exercise_history", "weekly_volume", "personal_records",
      "progression_check", "rotation_status", "session_summary", "data_status",
    ]);
    expect(body.result.tools.every((t: any) => t.annotations.readOnlyHint)).toBe(true);
  });
  it("calls a tool", async () => {
    const { body } = await call({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "data_status", arguments: {} } });
    const data = JSON.parse(body.result.content[0].text);
    expect(data.workouts).toBe(11);
    expect(Object.keys(data.unmappedExercises)).toEqual(["Tibialis Raise"]);
  });
  it("tool-level errors are isError results; unknown methods are RPC errors", async () => {
    const r = await call({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "exercise_history", arguments: { name: "zzz" } } });
    expect(r.body.result.isError).toBe(true);
    const u = await call({ jsonrpc: "2.0", id: 5, method: "nope" });
    expect(u.body.error.code).toBe(-32601);
  });
  it("rejects GET", async () => {
    const res = await handleMcp(new Request("https://x/mcp"), () => store.get(), "UTC");
    expect(res.status).toBe(405);
  });
});

describe("worker auth", () => {
  const env = { GOOGLE_SERVICE_ACCOUNT_JSON: "{}", MCP_PATH_SECRET: "s".repeat(32) };
  it("404s without the secret path", async () => {
    expect((await worker.fetch(new Request("https://x/mcp"), env)).status).toBe(404);
    expect((await worker.fetch(new Request(`https://x/mcp/${"s".repeat(31)}`), env)).status).toBe(404);
  });
  it("refuses to run with a short or missing secret", async () => {
    expect((await worker.fetch(new Request("https://x/mcp/abc"), { ...env, MCP_PATH_SECRET: "abc" })).status).toBe(500);
  });
});
