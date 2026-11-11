import { generateKeyPairSync, createVerify } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDriveClient } from "../src/drive.ts";

afterEach(() => vi.unstubAllGlobals());

describe("drive client", () => {
  it("signs a valid RS256 JWT with drive.readonly scope and only issues GETs to Drive", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const sa = { client_email: "bot@proj.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };
    const calls: { url: string; method: string; body?: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      calls.push({ url, method: init.method ?? "GET", body: init.body as string });
      if (url.includes("oauth2")) return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }));
      if (url.includes("alt=media")) return new Response("csv-bytes");
      return new Response(JSON.stringify({ files: [{ id: "F1" }] }));
    });

    const d = createDriveClient(JSON.stringify(sa));
    expect(await d.findFolder("Strong Exports")).toBe("F1");
    expect(await d.download({ id: "x", name: "s.csv", mimeType: "text/csv", modifiedTime: "", createdTime: "" })).toBe("csv-bytes");

    const tokenCall = calls.find((c) => c.url.includes("oauth2"))!;
    const jwt = new URLSearchParams(tokenCall.body).get("assertion")!;
    const [h, p, s] = jwt.split(".");
    const claims = JSON.parse(Buffer.from(p, "base64url").toString());
    expect(claims).toMatchObject({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/drive.readonly" });
    const ok = createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(s, "base64url"));
    expect(ok).toBe(true);
    expect(calls.filter((c) => c.url.includes("googleapis.com/drive")).every((c) => c.method === "GET")).toBe(true);
  });
});
