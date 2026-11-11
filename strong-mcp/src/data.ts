import { DEFAULT_CONFIG, loadConfig } from "./config.ts";
import type { DriveClient, DriveFile } from "./drive.ts";
import { parseStrongCsv } from "./parse.ts";
import type { Config, ParseResult } from "./types.ts";

export interface DataSnapshot {
  parsed: ParseResult;
  csvFile: { name: string; modified: string };
  config: Config;
  configSource: string;
  configWarnings: string[];
}

const CHECK_INTERVAL_MS = 60_000;
const MAP_NAMES = ["muscle-map.json", "muscle-map"];

/** In-memory cache, per Worker isolate. Re-checks Drive metadata at most once a minute. */
export class DataStore {
  private snap: DataSnapshot | null = null;
  private checkedAt = 0;
  private folderId: string | null;
  private csvKey = "";
  private mapKey = "";

  constructor(
    private drive: DriveClient,
    private opts: { folderId?: string; folderName: string; now?: () => number },
  ) {
    this.folderId = opts.folderId || null;
  }

  async get(force = false): Promise<DataSnapshot> {
    const now = (this.opts.now ?? Date.now)();
    if (this.snap && !force && now - this.checkedAt < CHECK_INTERVAL_MS) return this.snap;

    if (!this.folderId) {
      this.folderId = await this.drive.findFolder(this.opts.folderName);
      if (!this.folderId)
        throw new Error(
          `Drive folder "${this.opts.folderName}" not found. Share it with the service account email (Viewer), or set DRIVE_FOLDER_ID.`,
        );
    }
    const files = await this.drive.listFolder(this.folderId);
    const csv = newestCsv(files);
    if (!csv) throw new Error(`No CSV export found in "${this.opts.folderName}". Export from Strong and save it there.`);
    const mapFile = files.find((f) => MAP_NAMES.includes(f.name.toLowerCase()));

    const next: DataSnapshot = this.snap
      ? { ...this.snap }
      : { parsed: { workouts: [], warnings: [], columns: [] }, csvFile: { name: "", modified: "" }, config: DEFAULT_CONFIG, configSource: "bundled default", configWarnings: [] };

    const csvKey = fileKey(csv);
    if (csvKey !== this.csvKey) {
      next.parsed = parseStrongCsv(await this.drive.download(csv));
      next.csvFile = { name: csv.name, modified: stamp(csv) };
      this.csvKey = csvKey;
    }

    const mapKey = mapFile ? fileKey(mapFile) : "default";
    if (mapKey !== this.mapKey) {
      if (mapFile) {
        try {
          const { config, warnings } = loadConfig(await this.drive.download(mapFile));
          Object.assign(next, { config, configSource: `Drive: ${mapFile.name}`, configWarnings: warnings });
        } catch (e) {
          Object.assign(next, {
            config: DEFAULT_CONFIG,
            configSource: "bundled default (Drive muscle-map failed to parse)",
            configWarnings: [`${mapFile.name}: ${(e as Error).message}`],
          });
        }
      } else Object.assign(next, { config: DEFAULT_CONFIG, configSource: "bundled default (no muscle-map.json in Drive folder)", configWarnings: [] });
      this.mapKey = mapKey;
    }

    this.snap = next;
    this.checkedAt = now;
    return next;
  }
}

const stamp = (f: DriveFile) => (f.createdTime > f.modifiedTime ? f.createdTime : f.modifiedTime);
const fileKey = (f: DriveFile) => `${f.id}|${f.modifiedTime}|${f.md5Checksum ?? ""}`;

export function newestCsv(files: DriveFile[]): DriveFile | null {
  const csvs = files.filter(
    (f) =>
      f.name.toLowerCase().endsWith(".csv") ||
      f.mimeType.includes("csv") ||
      f.mimeType === "application/vnd.google-apps.spreadsheet",
  );
  csvs.sort((a, b) => stamp(b).localeCompare(stamp(a)));
  return csvs[0] ?? null;
}
