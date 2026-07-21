# WorldPlay Multi-Sport Prototype

Interactive concept that places reusable racing and weekly-prediction games inside a WorldPlay-style multi-sport dashboard:

- **Pick the Top 10** — rank the Melbourne Cup Top 10 in exact finishing order.
- **Survivor** — select one winner across ten featured Spring Carnival meetings and remain alive.
- **AFL Round Card** — tip all nine matches and enter a featured-match margin.
- **NFL Weekly Pick 6** — pick six winners and assign unique confidence points.

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

For hosted preview environments, set `HOST=0.0.0.0` and provide the platform's `PORT`. The public stakeholder preview is published through GitHub Pages at `https://odttwaits-web.github.io/worldplay-racing-prototype/`.

For a portable password-protected preview, set `PREVIEW_PASSWORD` and optionally `PREVIEW_USER` before starting the server. The `/health` endpoint remains available to hosting health checks without exposing the application.

## Adding another weekly game

The AFL and NFL journeys use one shared renderer and submission flow. To prototype another sport, add a game object to `weeklyGames` in `data.js` with its sport, deadline, scoring mode, and fixtures. The shared UI automatically provides selection progress, review, submission, edit-before-deadline, persistence, responsive layouts, and dashboard status.

Use `one-point` scoring for a straight winners card or `confidence` when every fixture needs a unique points value. Add `featuredFixtureId` when the format also requires a margin tiebreaker. Keep sport schedules and live competition rules server-controlled in production.

The NRL and community competition tiles remain presentation context only. This project does not connect to WorldPlay production systems. Local deadlines and entry persistence are browser-controlled and are therefore demonstration mechanics, not production security.
