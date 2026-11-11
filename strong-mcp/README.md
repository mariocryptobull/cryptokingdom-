# strong-mcp

A remote MCP server that lets Claude (claude.ai web + mobile) read and analyze your **Strong** app workout log.
Data comes from Strong's CSV export, saved to a Google Drive folder. It runs on the Cloudflare Workers free plan and only reads data (it never writes to Drive).

```
Strong app ──export CSV──► Google Drive "Strong Exports"
                                   │  (read-only service account)
claude.ai ──MCP/HTTPS──► Cloudflare Worker ──► parse + cache ──► 8 analysis tools
```

## Tools

| Tool | What it returns |
|---|---|
| `get_recent_workouts(days=7)` | Sessions in the last N days with every exercise and set |
| `exercise_history(name, limit=10)` | Every set per session, plus the best Epley e1RM per session. Partial names work: "lateral raise" matches all its variants |
| `weekly_volume(weeks=4)` | Hard sets per muscle per Mon–Sun week. Warm-ups are excluded, D/F sets count, primary = 1 set and secondary = 0.5 |
| `personal_records(exercise?)` | Heaviest weight, most reps and best e1RM. For a single exercise it also lists the best reps at each weight |
| `progression_check()` | Lifts to **add weight** to (both working sets at the top of the rep range) and lifts that have **stalled** (no e1RM gain in 3+ sessions) |
| `rotation_status()` | Recent sessions classified as Arms/Chest/Back/Lower, off-rotation sessions flagged, and what's **next** |
| `session_summary(date="latest")` | Duration, hard sets, sets per muscle, PRs against all earlier history, and flags (>2 h, too many rest-pauses, singles/max tests, unmapped exercises) |
| `data_status()` | Which export is loaded, the date range, parse warnings, and every **unmapped exercise** |

How sets are counted: `W` = warm-up (never counted as volume). `D` = drop/rest-pause and `F` = failure each count as one hard set. The 2 *working sets* of an exercise are its first two sets that are neither warm-up nor drop sets.

The server also sends Claude your training context: the rotation, the set scheme, shoulders and arms as priorities, and your bulk targets (~3,000 kcal, 170 g protein).

---

## Setup (one time, ~20 min)

You need: a Google account, a free Cloudflare account, and Node.js 20+ on a computer.

### 1. Google service account (read-only Drive access)

1. Go to <https://console.cloud.google.com/> → create a project (e.g. `strong-mcp`).
2. **APIs & Services → Library** → search for **Google Drive API** → **Enable**.
3. **IAM & Admin → Service Accounts → Create service account**. Name it `strong-reader` and skip roles and grants.
4. Open the new account → **Keys → Add key → Create new key → JSON**. A `.json` file downloads. Keep it private.
5. Copy the account's email address (`strong-reader@<project>.iam.gserviceaccount.com`).

### 2. Drive folder

1. In Google Drive, create a folder named exactly **`Strong Exports`**.
2. **Share** it with the service-account email as a **Viewer**. The server can only see what is shared with it.
3. Upload a copy of [`src/default-muscle-map.json`](src/default-muscle-map.json) into the folder, renamed to **`muscle-map.json`**. (This step is optional. Without the file, the bundled default map is used.)
4. Optional: copy the folder ID from its URL (`drive.google.com/drive/folders/<ID>`). See step 3.

### 3. Deploy to Cloudflare

```bash
cd strong-mcp
npm install
npx wrangler login                     # opens a browser

npx wrangler deploy                    # creates the worker; prints https://strong-mcp.<you>.workers.dev

# Secrets — never commit these
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON < path/to/key.json

openssl rand -hex 32                   # copy this output; it is your connector password
npx wrangler secret put MCP_PATH_SECRET   # paste it
```

Optional settings in `wrangler.toml` under `[vars]`. Redeploy after changing them:
- `DRIVE_FOLDER_ID`: use this exact folder instead of searching by name (recommended once you know the ID).
- `TIMEZONE`: default `America/New_York`. It decides what "today" and "this week" mean.

Check that it works (replace both placeholders):

```bash
curl -s https://strong-mcp.<you>.workers.dev/mcp/<SECRET> \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"data_status","arguments":{}}}'
```

### 4. Add the connector in claude.ai

1. claude.ai → **Settings → Connectors → Add custom connector**.
2. Name: `Strong`. URL: `https://strong-mcp.<you>.workers.dev/mcp/<SECRET>`.
3. Leave the OAuth fields (under Advanced) **empty** and click **Add**.
4. In a chat, open the tools menu and make sure **Strong** is enabled.

Connectors sync to the iOS and Android apps automatically.

Try: *"What's my next workout?"*, *"Summarize my last session"*, *"Weekly volume for the last 6 weeks — am I hitting delts and arms enough?"*, *"What should I add weight to?"*

---

## Updating your data

1. Strong → **Profile → Settings → Export Strong Data**.
2. In the share sheet: **Save to Files → Google Drive → Strong Exports** (or upload it with the Drive app).
3. Done. The server uses the **newest CSV** in the folder and checks for a new one at most once a minute.

Old exports can stay in the folder. You never need to delete them.

## Editing the muscle map

`muscle-map.json` (in your Drive folder) controls three things:

```jsonc
{
  "exercises": {
    // Exact Strong name, or the base name without the equipment suffix:
    // "Lateral Raise" covers "Lateral Raise (Dumbbell)", "Lateral Raise (Cable)", ...
    "Lateral Raise": { "primary": ["side_delts"] },
    "Incline Bench Press": { "primary": ["chest"], "secondary": ["front_delts", "triceps"] }
  },
  "ignore": ["Running", "Cycling"],            // no volume, never flagged as unmapped
  "mainLifts": {                               // what progression_check watches (empty = auto-detect)
    "Incline Bench Press (Dumbbell)": { "repRange": [6, 10] },
    "Lateral Raise": { "repRange": [12, 20] }
  },
  "flags": { "maxDurationMin": 120, "maxDropSets": 3 }
}
```

Allowed muscles: `chest, back, side_delts, rear_delts, front_delts, biceps, triceps, forearms, quads, hamstrings, glutes, calves, abs`.
Primary = 1 set and secondary = 0.5 set, for each hard set.

To find gaps, ask Claude to *"run data_status"*, or run this locally:

```bash
npm run check-map -- ~/Downloads/strong.csv              # against the bundled map
npm run check-map -- ~/Downloads/strong.csv muscle-map.json
```

It prints a ready-to-fill JSON stub for every unmapped exercise. Changes in Drive are picked up within a minute, with no redeploy.
If the file has a JSON error, the server falls back to the bundled map, and `data_status` shows the error.
You can also store the map as a Google Doc named `muscle-map`; smart quotes are handled.

## Security

- Only reads data: the Google scope is `drive.readonly`, the service account can see only the folder you share with it, and the code makes only GET requests to the Drive API (there's a test for this).
- The connector URL **is the password**. Anyone who has it can read your workout data. To rotate it, run `npx wrangler secret put MCP_PATH_SECRET` with a new value and update the URL in claude.ai.
- No secrets are in the repo. `.dev.vars` and `*.csv` (except the test fixture) are git-ignored.

## Cost

$0. Cloudflare Workers free plan: 100k requests/day. Google Drive API: free quota. The server uses no KV, Durable Objects or databases. The cache is in memory per Worker instance, and a cold start re-downloads the CSV.

## Development

```bash
npm test            # vitest: parser, analysis, MCP protocol, Drive auth
npm run typecheck
printf 'MCP_PATH_SECRET=%s\nGOOGLE_SERVICE_ACCOUNT_JSON=%s\n' "$(openssl rand -hex 32)" "$(jq -c . key.json)" > .dev.vars
npm run dev         # local server on http://localhost:8787/mcp/<secret>
```

Layout:

```
src/index.ts      Worker entry: secret-path auth
src/mcp.ts        MCP JSON-RPC (stateless Streamable HTTP) + tool definitions
src/drive.ts      Service-account JWT + read-only Drive calls
src/data.ts       Newest-CSV selection + in-memory cache
src/parse.ts      Strong CSV → workouts (handles header variants, kg→lb, W/D/F)
src/config.ts     muscle-map loading + exercise lookup
src/analysis/     All tool logic (pure functions)
test/fixtures/sample.csv   Synthetic export with W/D/F, rest-timer, bodyweight, timed sets
```
