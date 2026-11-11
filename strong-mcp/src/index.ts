import { DataStore } from "./data.ts";
import { createDriveClient } from "./drive.ts";
import { handleMcp } from "./mcp.ts";

export interface Env {
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  MCP_PATH_SECRET: string;
  DRIVE_FOLDER_ID?: string;
  DRIVE_FOLDER_NAME?: string;
  TIMEZONE?: string;
}

let store: DataStore | null = null;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const secret = env.MCP_PATH_SECRET ?? "";
    if (secret.length < 24) return new Response("Server not configured: MCP_PATH_SECRET missing or too short.", { status: 500 });
    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    if (!timingSafeEqual(path, `/mcp/${secret}`)) return new Response("Not found", { status: 404 });

    store ??= new DataStore(createDriveClient(env.GOOGLE_SERVICE_ACCOUNT_JSON ?? ""), {
      folderId: env.DRIVE_FOLDER_ID,
      folderName: env.DRIVE_FOLDER_NAME || "Strong Exports",
    });
    return handleMcp(req, () => store!.get(), env.TIMEZONE || "America/New_York");
  },
};

function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
