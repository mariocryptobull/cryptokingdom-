/**
 * Google Drive, read-only. Uses a service account (JWT bearer flow, scope drive.readonly).
 * Only GET requests are ever made; there is no code path that writes to Drive.
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  createdTime: string;
  md5Checksum?: string;
}

export interface DriveClient {
  listFolder(folderId: string): Promise<DriveFile[]>;
  findFolder(name: string): Promise<string | null>;
  download(file: DriveFile): Promise<string>;
}

const SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const API = "https://www.googleapis.com/drive/v3";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let tokenCache: { token: string; exp: number; email: string } | null = null;

export function createDriveClient(serviceAccountJson: string): DriveClient {
  let sa: ServiceAccount;
  try {
    sa = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
  if (!sa.client_email || !sa.private_key) throw new Error("Service account JSON missing client_email/private_key.");

  async function get(url: string): Promise<Response> {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${await token(sa)}` } });
    if (!res.ok) throw new Error(`Drive API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res;
  }

  const q = (s: string) => encodeURIComponent(s);
  const common = "supportsAllDrives=true&includeItemsFromAllDrives=true";

  return {
    async findFolder(name) {
      const query = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const res = await get(`${API}/files?q=${q(query)}&fields=files(id,name)&pageSize=10&${common}`);
      const data = (await res.json()) as { files: { id: string }[] };
      return data.files[0]?.id ?? null;
    },
    async listFolder(folderId) {
      const query = `'${folderId}' in parents and trashed = false`;
      const fields = "files(id,name,mimeType,modifiedTime,createdTime,md5Checksum)";
      const res = await get(`${API}/files?q=${q(query)}&fields=${q(fields)}&orderBy=modifiedTime desc&pageSize=200&${common}`);
      return ((await res.json()) as { files: DriveFile[] }).files;
    },
    async download(file) {
      const url =
        file.mimeType === "application/vnd.google-apps.spreadsheet"
          ? `${API}/files/${file.id}/export?mimeType=text/csv`
          : file.mimeType === "application/vnd.google-apps.document"
            ? `${API}/files/${file.id}/export?mimeType=text/plain`
            : `${API}/files/${file.id}?alt=media&supportsAllDrives=true`;
      return (await get(url)).text();
    },
  };
}

async function token(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.email === sa.client_email && tokenCache.exp - 60 > now) return tokenCache.token;
  const aud = sa.token_uri ?? "https://oauth2.googleapis.com/token";
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud, iat: now, exp: now + 3600 }));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const jwt = `${header}.${claims}.${b64url(new Uint8Array(sig))}`;
  const res = await fetch(aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`Google token exchange failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, exp: now + data.expires_in, email: sa.client_email };
  return data.access_token;
}

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\\n/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
