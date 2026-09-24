# FC26CareerExport — export your FC 26 Career at any point + web UI

Export **any EA SPORTS FC 26 Career Mode save at any point in the season** (early, mid-season, run-in, or end of season) and turn it into a broadcast-style **Season Review Show** in your browser: league tables, cups with real knockout brackets, transfers, Golden Boot race, Team of the Season, wonderkids/flops, and a full deep-dive on your club.

No servers. No build step. No API keys. One Lua script + static HTML/JS files.

---

## Table of contents

- [What it does](#what-it-does)
- [How it works (the 2 stages)](#how-it-works-the-2-stages)
- [Requirements](#requirements)
- [Setup — Part 1: get FC 26 Live Editor](#setup--part-1-get-fc-26-live-editor)
- [Setup — Part 2: run the Lua export (Lua section)](#setup--part-2-run-the-lua-export-lua-section)
- [Setup — Part 3: use the UI and upload your export](#setup--part-3-use-the-ui-and-upload-your-export)
- [What you get in the UI](#what-you-get-in-the-ui)
- [Sample files in this repo](#sample-files-in-this-repo)
- [Use your export with NotebookLM](#use-your-export-with-notebooklm)
- [Internet, photos & privacy](#internet-photos--privacy)

---

## What it does

1. **`ExportCareer.lua`** runs inside the **FC 26 Live Editor** while your Career save is loaded. It reads live standings, fixtures, player stats, transfers, cups and your club from game memory + the career database, and writes one plain-text file: `fc26_season_export.txt`.
2. **`index.html` + `app.js`** (this repo's web UI) parses that text file and renders the whole Season Review Show: sortable tables, form charts, cup bracket trees, transfer lists, awards, photos and crests.

You can export **mid-season** (it frames everything as "so far", no fake champions) or **end of season** (it crowns champions, cups, awards). The script auto-detects the phase from the in-game date + games played.

---

## How it works (the 2 stages)

```
FC 26 (Career save loaded)
   └─ FC 26 Live Editor → Lua section → Run ExportCareer.lua
        └─ writes fc26_season_export.txt (Desktop / Documents / C:\FC 26 Live Editor\)
             └─ open index.html → "Load report file" / drag & drop
                  └─ Season Review Show in your browser
```

- **Stage A — data extraction (Lua):** 100% local, inside Live Editor. Reads DB tables (`career_users`, `leagues`, `players`, `teamplayerlinks`, `career_playermatchratinghistory`, …), live standings/fixtures from game memory, and the live `TransferManager` (real fees, including pre-contract January deals). Output is human-readable text, so you can inspect it before uploading anywhere.
- **Stage B — visualisation (browser):** 100% client-side parsing (`parseReport()` in `app.js`) + rendering. Uploaded files never leave your machine except for crest/photo hotlinks (see [Internet, photos & privacy](#internet-photos--privacy)). Uploads are also archived in `localStorage` under "Saved Seasons" (max 12).

---

## Requirements

| Need | Details |
|---|---|
| **Game** | EA SPORTS FC 26 on **PC**, with a Career Mode save (Manager Career). |
| **FC 26 Live Editor** | Required. Get it here: **<https://www.patreon.com/collection/1744907?view=expanded>** (It's free) |
| **This repo** | `ExportCareer.lua` + `index.html`, `app.js`, `styles.css`, `team-logos.js`, `embedded.js`. No install needed for the UI. |
| **Browser** | Any modern Chromium / Edge / Firefox / Safari. Internet needed for crests + player photos (falls back to generated initials avatars offline). |
| **Disk** | The export lands as `fc26_season_export.txt` (~100–200 KB). |

---

## Setup — Part 1: get FC 26 Live Editor

1. Open **<https://www.patreon.com/collection/1744907?view=expanded>**
2. Start **FC 26**, then start the **Live Editor**.
3. Load your **Manager Career save**

---

## Setup — Part 2: run the Lua export (Lua section)

1. In Live Editor, go to the **Lua** section / script runner.
2. Load/open **`ExportCareer.lua`** from this repo and **Execute** it while your career is loaded.
3. Wait for it to finish (it logs `Live memory read: X standings records, Y fixtures` on success). If live memory read fails, it still exports what it can from the DB and logs the reason.
4. Find the output file — the script tries these locations in order and reports the path:
   - `%USERPROFILE%\Desktop\fc26_season_export.txt`
   - `%USERPROFILE%\OneDrive\Desktop\fc26_season_export.txt`
   - `%USERPROFILE%\Documents\fc26_season_export.txt`
   - `C:\FC 26 Live Editor\fc26_season_export.txt`
   - current working directory (fallback)
5. Run it **whenever you want a snapshot** — pre-season, December, run-in, or after the final. Each run overwrites the same filename, so rename copies you want to keep (e.g. `season1-mid.txt`, `season1-final.txt`).

What gets exported: your manager/club/league/season header, live league tables (+ form, title-race gaps, biggest wins), compact world-leagues roundup, European Swiss-phase tables, full knockout cups (rounds, legs, pens, winners), completed transfers (yours + world top list from the live TransferManager), pending January pre-contracts, league stat leaders, story hooks (heroes/flops/veterans/teens/defenders), Golden Boot / playmakers / TOTS / bench / signings, season-vs-last-season comparison, your squad + every match with scorers + next fixtures, manager moves.

---

## Setup — Part 3: use the UI and upload your export

1. Download/clone this repo.
2. Double-click **`index.html`** — it opens with built-in example data.
3. Click **"Load report file"** (top right) and pick your `fc26_season_export.txt`, **or drag & drop the file anywhere on the page**.
4. Click **Enter →** when the preloader says ready. (Untick *"Fast load"* first if you want it to pre-fetch all ~400 player photos before entering — default ON streams them as you scroll.)

---

## What you get in the UI

- **Hero** — club crest, league logo, record tiles (P/W/D/L/GF/GA), last-5 form, next fixtures, headlines ticker, Golden Boot snapshot.
- **Headline Stories** — title race gap, boot leader, record transfer, your story, wonderkid, cold streak.
- **League Tables** — all simulated top flights in your save, zones, W/D/L form pills, season pulse (goals/game, home/draw/away %), biggest wins, per-league top scorers.
- **My Club Deep Dive** — running-points chart (bars = pts per match, line = running total), results timeline with Top-3/Goals/Assists details, sortable squad table with OVR tiers (`<68 / 68–76 / 77–83 / 84+`), next fixtures.
- **Europe** — Swiss league-phase tables with Top-8 / 9–24 cut lines + continental top scorers/assists/ratings.
- **Transfers** — your club's SIGNED/SOLD deals, world top-20 marquee moves with fee bars, agreed January pre-contracts, manager merry-go-round.
- **Stars** — Golden Boot race bars, TOTS pitch (4-3-3) + bench, per-league stat tabs, heroes/flops/veterans/teens/defensive elite cards, then-vs-now season comparison with droughts + improvers.
- **Cups** — real single-elimination bracket trees (winners feed forward, SVG connectors), aggregate + pens + legs, champion banner, search any club.
- **World** — compact cards for MLS, Sweden, Norway, China, Korea, Championship, LaLiga Hypermotion, Saudi league, etc.

---

## Sample files in this repo

| File | What it is |
|---|---|
| `results.txt` | Full **end-of-season** sample export (also baked into `embedded.js` so the page works with zero uploads). |
| `embedded.js` | Same data as `results.txt`, embedded so `index.html` works offline / on Pages. |

Open `results.txt` in any text editor to see exactly what the Lua script produces before you run it yourself.

---

## Use your export with NotebookLM

Your export (`fc26_season_export.txt`) is plain human-readable text, so you can also drop it straight into [NotebookLM](https://notebooklm.google.com/) as a source — no reformatting needed.

1. Go to NotebookLM → New Notebook → upload your export `.txt` (rename keeps seasons tidy, e.g. `season1-mid.txt`, `season1-final.txt`).
2. Ask questions about your career ("Summarise my season", "Who won the Golden Boot?", "Which wonderkids broke through?"), generate reports / briefing docs / FAQs / timelines, or get an audio overview of your season.
3. Have it turn your tables, cups, transfers and awards into infographics, charts and other visuals.

Upload snapshots from multiple seasons to compare year-over-year and track your club's story over time. Heads-up: uploading to NotebookLM sends your export to Google, so only share what you're comfortable with.

---

## Internet, photos & privacy

- Your export file is parsed **locally** — it is never uploaded anywhere by this app.
- The page does fetch **public hotlinks**: club/competition crests from `football-logos.cc`, player photos from `Wikipedia / Wikimedia / Wikidata / TheSportsDB`. Player *names* from your save are therefore sent to those public search APIs as queries (that's how name→photo resolution works).
- Photo results are cached in your own browser only. Use the app offline and you'll get generated initial-avatars instead of photos — everything else still works.

---

