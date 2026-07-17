# WorldPlay Racing Prototype

Private, local interactive concept that places two Flemington prediction games inside a WorldPlay-style multi-sport dashboard:

- **Pick the Top 10** — rank the Melbourne Cup Top 10 in exact finishing order.
- **Survivor** — select one winner across ten featured Spring Carnival meetings and remain alive.

The prototype is dependency-free and stores selections in browser `localStorage`, so gameplay and seed data can be changed quickly without configuring a database.

> **Internal concept only:** all racing fields, schedules, prizes, results and user records are sample data. Nothing in this build is a live WorldPlay competition or wagering product.

## Run locally

```bash
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Project structure

- `index.html` — application shell
- `app.js` — screens, interactions, routing, and local persistence
- `game-logic.js` — tested deadline, state-migration and ranking helpers
- `data.js` — meetings, runners, game rules, and leaderboard seed data
- `styles.css` — responsive WorldPlay visual system using the Graphik font family
- `assets/worldplay-logo.svg` — WorldPlay brand mark used by the shared navigation
- `assets/fonts/` — local Graphik, Graphik Condensed, Compact, and X Condensed web fonts
- `assets/worldplay-*` — dashboard imagery captured from the supplied WorldPlay experience
- `assets/racing-hero.png` — original racing campaign image used by the two playable games
- `server.mjs` — small local static server
- `tests/` — seed-data integrity tests
- `docs/` — demo-readiness and brand/asset approval checklists

## Verify a build

```bash
npm test
```

For hosted preview environments, set `HOST=0.0.0.0` and provide the platform's `PORT`. The preview must remain access-controlled while sample data, brand permissions and competition rules are under review.

For a portable password-protected preview, set `PREVIEW_PASSWORD` and optionally `PREVIEW_USER` before starting the server. The `/health` endpoint remains available to hosting health checks without exposing the application.

The AFL, NRL, NFL, and community competition tiles are presentation context only. Racing is the active prototype journey, reached exclusively through its tile in the dashboard sports section. This project does not connect to WorldPlay production systems. Local deadlines and entry persistence are browser-controlled and are therefore demonstration mechanics, not production security.
