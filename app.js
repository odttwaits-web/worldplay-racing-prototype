import {
  leaderboard,
  melbourneCupRunners,
  meetings,
  runnerById,
  survivorOpeningRunners,
  survivorGame,
  topTenGame
} from "./data.js";
import { entryIsOpen, moveRankedSelection, normalizePrototypeState } from "./game-logic.js";

const STORAGE_KEY = "worldplay-racing-prototype-v1";
const app = document.querySelector("#app");
const toastRoot = document.querySelector("#toast-root");

const defaultState = {
  top10: [],
  top10Submitted: false,
  top10SubmittedPicks: [],
  top10Editing: false,
  survivorPick: null,
  survivorSubmitted: false,
  survivorSubmittedPick: null,
  survivorEditing: false
};

let state = loadState();
let dragPayload = null;

function loadState() {
  try {
    const loaded = normalizePrototypeState(
      JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
      defaultState,
      melbourneCupRunners,
      survivorOpeningRunners
    );
    if (loaded.top10Submitted && !loaded.top10SubmittedPicks.length) loaded.top10SubmittedPicks = [...loaded.top10];
    if (loaded.survivorSubmitted && !loaded.survivorSubmittedPick) loaded.survivorSubmittedPick = loaded.survivorPick;
    return loaded;
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function go(route) {
  if (currentRoute() === route) render();
  else window.location.hash = route;
}

function currentRoute() {
  return window.location.hash.replace(/^#/, "") || "/dashboard";
}

function requireOpenEntry(game) {
  if (entryIsOpen(game)) return true;
  toast(`Selections closed at ${game.closes}`);
  return false;
}

function icon(name) {
  const icons = {
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M12 12v5M8 20h8M6 6H3v1a4 4 0 0 0 4 4M18 6h3v1a4 4 0 0 1-4 4"/></svg>',
    horse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 20v-7l3-3 1-5 4 2 3 5-3 2-2-2-3 3v5M15 7l2-3M5 20h5M13 20h5"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>'
  };
  return icons[name] || "";
}

function header() {
  return `
    <header class="site-header">
      <button class="brand" data-route="/dashboard" aria-label="WorldPlay dashboard">
        <img src="./assets/worldplay-logo.svg" alt="" />
        <span class="brand-word">WORLDPLAY</span>
      </button>
      <nav class="desktop-nav" aria-label="Primary">
        <button data-route="/dashboard">Competitions</button>
        <button data-action="show-rules">How It Works</button>
        <button data-action="show-coming-soon">Leaderboards</button>
        <button data-action="show-coming-soon">Community</button>
      </nav>
      <button class="profile-button" data-action="toggle-menu" aria-expanded="false">
        <strong>Oscar</strong><span>OT</span>${icon("user")}
      </button>
    </header>
    <div class="account-drawer" aria-hidden="true">
      <button class="drawer-backdrop" data-action="toggle-menu" aria-label="Close menu"></button>
      <aside>
        <div class="drawer-header"><span class="avatar">OT</span><div><small>WELCOME BACK</small><strong>Oscar</strong></div></div>
        <button data-route="/dashboard">Dashboard</button>
        <button data-route="/racing">Flemington games</button>
        <button data-action="show-rules">How to play</button>
        <button data-action="reset-demo" class="danger-link">Reset prototype data</button>
      </aside>
    </div>
    <div class="prototype-banner" role="note"><strong>CONCEPT PROTOTYPE</strong><span>Sample schedule, fields and prizes · Not a live competition</span></div>
  `;
}

function footer() {
  return `
    <footer class="site-footer">
      <div><img src="./assets/worldplay-logo.svg" alt="" /><strong>WORLDPLAY</strong></div>
      <p>© 2026 WorldPlay concept · Internal prototype · Free to play</p>
      <nav><button data-action="show-rules">How it works</button><button data-route="/dashboard">Dashboard</button></nav>
    </footer>
  `;
}

function gameStatus(game) {
  if (game === "top10") {
    if (state.top10Editing) return ["CHANGES TO SUBMIT", "progress"];
    if (state.top10Submitted) return ["ENTRY SUBMITTED", "success"];
    if (state.top10.length) return [`${state.top10.length}/10 PICKED`, "progress"];
    return ["OPEN", "open"];
  }
  if (state.survivorEditing) return ["CHANGES TO SUBMIT", "progress"];
  if (state.survivorSubmitted) return ["PICK SUBMITTED", "success"];
  if (state.survivorPick) return ["PICK SAVED", "progress"];
  return ["ROUND 1 OPEN", "open"];
}

function gameMiniCard(game) {
  const isTop10 = game.id === "top10";
  const isEditing = isTop10 ? state.top10Editing : state.survivorEditing;
  const [status, statusClass] = gameStatus(game.id);
  const route = isTop10
    ? state.top10Submitted && !state.top10Editing ? "/top10/submitted" : "/top10"
    : state.survivorSubmitted && !state.survivorEditing ? "/survivor/submitted" : "/survivor";
  return `
    <article class="game-mini-card ${isTop10 ? "top10-card" : "survivor-card"}">
      <div class="game-card-top">
        <span class="status-badge ${statusClass}">${status}</span>
        <span class="game-icon">${icon(isTop10 ? "list" : "horse")}</span>
      </div>
      <p class="eyebrow">${game.eyebrow}</p>
      <h3>${isTop10 ? "PICK THE<br><em>TOP 10</em>" : "SURVIVOR<br><em>LAST ONE STANDING</em>"}</h3>
      <p>${game.subtitle}</p>
      <div class="mini-meta"><span>PRIZE <strong>${game.prize}</strong></span><span>${game.closes}</span></div>
      <button class="outline-button full" data-route="${route}">${isEditing ? "Continue editing" : statusClass === "success" ? "View entry" : "Play now"}${icon("arrow")}</button>
    </article>
  `;
}

function dashboard() {
  return `
    ${header()}
    <main id="app-main">
      <section class="hero dashboard-hero worldplay-hero">
        <div class="hero-content">
          <p class="hero-kicker">THE FINAL WHISTLE BLEW.</p>
          <h1>THE NEXT GAME<br><span>DOESN'T WAIT.</span></h1>
          <p class="hero-copy">Free-to-play prediction games across the world's biggest sporting moments.</p>
          <div class="hero-actions">
            <button class="primary-button" data-action="scroll-arena">Explore sports${icon("arrow")}</button>
            <button class="ghost-button" data-action="show-rules">How It Works</button>
          </div>
        </div>
        <div class="hero-live-chip"><span></span><strong>LIVE COMPETITIONS</strong><small>5 AVAILABLE</small></div>
      </section>

      <section class="page-section arena-section" id="arena">
        <div class="section-heading">
          <div><p class="eyebrow red">FEATURED SPORTS</p><h2>CHOOSE YOUR ARENA</h2></div>
          <button class="text-button" data-action="show-coming-soon">View all competitions →</button>
        </div>
        <div class="sport-arena-grid">
          ${sportCard("community", "COMMUNITY", "Create a league and play your way.", "FREE TO JOIN", false)}
          ${sportCard("afl", "AFL", "Finals predictor", "$10M + $250K", false)}
          ${sportCard("nrl", "NRL", "Finals predictor", "$5M + $150K", false)}
          ${sportCard("nfl", "NFL", "Playoff predictor", "$20M + $500K", false)}
          ${sportCard("racing", "RACING", "Melbourne Cup Top 10 + Spring Survivor", "$150K PRIZES", true)}
        </div>
      </section>

      <section class="dashboard-app-promo">
        <div class="page-section dashboard-app-promo-inner">
          <div>
            <img src="./assets/worldplay-logo.svg" alt="" />
            <p class="eyebrow">WORLDPLAY APP</p>
            <h2>THE GAME IN<br>YOUR HANDS</h2>
            <p>Build your picks, follow live results and climb the leaderboard from anywhere.</p>
            <button class="primary-button" data-action="show-coming-soon">Download the app${icon("arrow")}</button>
          </div>
          <div class="app-promo-device"><span>WP</span><strong>LIVE PICKS</strong><small>TRACK EVERY RESULT</small></div>
        </div>
      </section>

      <section class="page-section closing-section">
        <div class="section-heading"><div><p class="eyebrow red">LIVE COMPETITIONS</p><h2>BRACKETS CLOSING SOON</h2></div></div>
        <div class="closing-grid">
          ${closingCard("AFL FINALS SERIES", "4D 06H 56M", "412,806", "$10M + $250K IN CASH")}
          ${closingCard("NRL FINALS SERIES", "54D 21H 56M", "88,120", "$5M + $150K IN CASH")}
          ${closingCard("NFL FINALS SERIES", "62D 21H 56M", "96,441", "$20M + $500K IN CASH")}
        </div>
      </section>

      <section class="page-section platform-stats">
        <div><strong>1.2M+</strong><span>PREDICTIONS MADE</span></div><div><strong>420K+</strong><span>PLAYERS</span></div><div><strong>412,806</strong><span>BRACKETS SO FAR</span></div><div><strong>85</strong><span>COUNTRIES</span></div>
      </section>
    </main>
    ${footer()}
  `;
}

function sportCard(kind, title, subtitle, prize, active) {
  return `<article class="sport-card ${kind} ${active ? "active" : ""}">
    <div class="sport-card-art"><span>${kind === "community" ? "WP" : title}</span></div>
    <div class="sport-card-body"><span class="sport-tag">${active ? "NEW · FREE TO PLAY" : kind === "community" ? "FREE TO JOIN" : "FREE TO PLAY"}</span><h3>${title}</h3><p>${subtitle}</p><strong>${prize}</strong><button class="sport-card-button" ${active ? 'data-route="/racing"' : 'data-action="show-coming-soon"'}>${active ? "EXPLORE RACING" : "EXPLORE MORE"}${icon("arrow")}</button></div>
  </article>`;
}

function closingCard(title, closes, players, prize) {
  return `<article class="closing-card"><h3>${title}</h3><dl><div><dt>BRACKET CLOSES IN</dt><dd>${closes}</dd></div><div><dt>PLAYERS JOINED</dt><dd>${players}</dd></div><div><dt>PRIZES</dt><dd class="red-copy">${prize}</dd></div></dl><button class="outline-button full" data-action="show-coming-soon">View competition</button></article>`;
}

function racingHub() {
  return `
    ${header()}
    <main id="app-main">
      <section class="compact-hero">
        <button class="back-link" data-route="/dashboard">← Back to dashboard</button>
        <p class="eyebrow red">SPRING CARNIVAL · 2026</p>
        <h1>CHOOSE YOUR GAME</h1>
        <p>Every selection is free. Pick your challenge and prove you know the field.</p>
      </section>
      <section class="page-section hub-grid">${gameMiniCard(topTenGame)}${gameMiniCard(survivorGame)}</section>
      <section class="page-section meetings-section">
        <div class="section-heading"><div><p class="eyebrow red">THE SPRING CAMPAIGN</p><h2>TEN FEATURED MEETINGS</h2></div></div>
        <div class="meeting-timeline">${meetingTimeline()}</div>
      </section>
    </main>
    ${footer()}
  `;
}

function meetingTimeline() {
  return meetings.map((meeting, index) => `
    <article class="meeting ${index === 0 ? "current" : ""}">
      <span class="meeting-number">${String(index + 1).padStart(2, "0")}</span>
      <small>${meeting.date}</small><strong>${meeting.name}</strong>
      <span class="meeting-status">${meeting.status === "open" ? "PICKS OPEN" : "UPCOMING"}</span>
    </article>
  `).join("");
}

function gameHero(game, variant) {
  return `
    <section class="game-hero ${variant}">
      <button class="back-link" data-route="/racing">← All racing games</button>
      <div class="game-hero-grid">
        <div>
          <p class="eyebrow red">${game.eyebrow}</p>
          <h1>${variant === "top10" ? "PICK THE <span>TOP 10</span>" : "SURVIVE <span>THE SPRING</span>"}</h1>
          <p>${game.subtitle}</p>
          <div class="game-meta"><span><small>PRIZE POOL</small><strong>${game.prize}</strong></span><span><small>PICKS CLOSE</small><strong>${game.closes}</strong></span></div>
        </div>
        <div class="how-panel">
          <p class="eyebrow">HOW IT WORKS</p>
          ${variant === "top10" ? `
            <ol><li><span>1</span>Rank ten horses</li><li><span>2</span>Review your order</li><li><span>3</span>Submit before jump</li></ol>
            <p>10 points for the winner, down to 1 point for tenth. Exact positions score.</p>
          ` : `
            <ol><li><span>1</span>Pick one winner</li><li><span>2</span>Win and advance</li><li><span>3</span>Lose and you're out</li></ol>
            <p>Survive all ten featured Spring Carnival meetings to share the grand prize.</p>
          `}
        </div>
      </div>
    </section>
  `;
}

function silk(runner, compact = false) {
  return `<span class="silks ${runner.silks} ${compact ? "compact" : ""}" aria-hidden="true"><i></i></span>`;
}

function runnerFacts(runner) {
  return `<span>J: ${runner.jockey}</span><span>T: ${runner.trainer}</span><span>FORM ${runner.form}</span>`;
}

function runnerStatus(runner) {
  if (runner.status === "scratched") return `<span class="runner-status scratched">SCRATCHED</span>`;
  if (runner.status === "emergency") return `<span class="runner-status emergency">EMERGENCY</span>`;
  return "";
}

function top10Screen() {
  const selected = new Set(state.top10);
  const gameOpen = entryIsOpen(topTenGame);
  return `
    ${header()}
    <main id="app-main">
      ${gameHero(topTenGame, "top10")}
      <section class="game-workspace">
        <div class="workspace-heading">
          <div><p class="eyebrow red">${topTenGame.race}</p><h2>BUILD YOUR FINISHING ORDER</h2><p>Select ten runners, then arrange them from first to tenth.</p></div>
          <div class="selection-meter"><strong>${state.top10.length}</strong><span>/ 10 SELECTED</span></div>
        </div>
        ${state.top10Editing ? `<div class="edit-notice">${icon("clock")}<div><strong>EDITING SUBMITTED ENTRY</strong><span>Make your changes, then resubmit before ${topTenGame.closes}.</span></div><button class="text-button" data-action="cancel-top10-edit">Cancel edits</button></div>` : ""}
        <div class="workspace-tools"><button class="ghost-button small" data-action="quick-pick" ${!gameOpen ? "disabled" : ""}>Demo quick pick</button><button class="text-button" data-action="clear-top10" ${!gameOpen ? "disabled" : ""}>Clear all</button></div>
        <div class="top10-layout">
          <section class="field-panel">
            <div class="panel-heading"><h3>THE SAMPLE FIELD</h3><span>${melbourneCupRunners.length} runners</span></div>
            <div class="runner-list">
              ${melbourneCupRunners.map(runner => {
                const selectedIndex = state.top10.indexOf(runner.id);
                const isSelected = selectedIndex !== -1;
                const unavailable = runner.status === "scratched";
                return `<article class="runner-row ${isSelected ? "selected" : ""} ${unavailable ? "unavailable" : ""}" draggable="${!isSelected && !unavailable}" data-runner-id="${runner.id}">
                  <span class="runner-number">${runner.number}</span>${silk(runner, true)}
                  <div class="runner-copy"><strong>${runner.name}</strong><small><span>${runner.jockey}</span><span>FORM ${runner.form}</span></small>${runnerStatus(runner)}</div>
                  <span class="barrier">B${runner.barrier}</span>
                  <button class="runner-action ${isSelected ? "ranked" : ""}" data-action="add-top10" data-id="${runner.id}" ${isSelected || unavailable || state.top10.length === 10 || !gameOpen ? "disabled" : ""} aria-label="${isSelected ? `${runner.name} ranked ${selectedIndex + 1}` : unavailable ? `${runner.name} scratched` : `Add ${runner.name}`}">${isSelected ? `<small>YOUR</small><strong>#${selectedIndex + 1}</strong>` : unavailable ? "OUT" : "PICK"}</button>
                </article>`;
              }).join("")}
            </div>
          </section>
          <details class="mobile-picks-drawer" ${state.top10.length ? "open" : ""}>
            <summary><span>YOUR TOP 10</span><strong>${state.top10.length}/10</strong></summary>
            <div class="rank-list">${Array.from({ length: 10 }, (_, index) => rankSlot(index)).join("")}</div>
          </details>
          <section class="ranking-panel">
            <div class="panel-heading"><h3>YOUR TOP 10</h3><span>Use arrows or drag to reorder</span></div>
            <div class="rank-list">
              ${Array.from({ length: 10 }, (_, index) => rankSlot(index)).join("")}
            </div>
          </section>
        </div>
      </section>
      <div class="sticky-action"><div><small>${state.top10Editing ? "UNSUBMITTED CHANGES" : "ENTRY PROGRESS"}</small><strong>${!gameOpen ? "Selections closed" : state.top10.length === 10 ? state.top10Editing ? "Ready to resubmit" : "Ready to review" : `${10 - state.top10.length} picks remaining`}</strong></div><button class="primary-button" data-route="/top10/review" ${state.top10.length !== 10 || !gameOpen ? "disabled" : ""}>${state.top10Editing ? "Review changes" : "Review entry"}${icon("arrow")}</button></div>
    </main>
  `;
}

function rankSlot(index) {
  const runner = runnerById(state.top10[index]);
  const points = 10 - index;
  const gameOpen = entryIsOpen(topTenGame);
  return `
    <div class="rank-slot ${runner ? "filled" : ""}" data-rank-index="${index}" draggable="${Boolean(runner)}">
      <div class="rank-position"><strong>${index + 1}</strong><small>${index === 0 ? "WINNER" : `${points} PTS`}</small></div>
      ${runner ? `${silk(runner, true)}<div class="rank-runner"><strong>${runner.name}</strong><small>B${runner.barrier} · ${runner.jockey}</small></div><div class="rank-controls"><button data-action="move-up" data-index="${index}" ${index === 0 || !gameOpen ? "disabled" : ""} aria-label="Move ${runner.name} up">↑</button><button data-action="move-down" data-index="${index}" ${index === state.top10.length - 1 || !gameOpen ? "disabled" : ""} aria-label="Move ${runner.name} down">↓</button><button data-action="remove-top10" data-id="${runner.id}" ${!gameOpen ? "disabled" : ""} aria-label="Remove ${runner.name}">×</button></div>` : `<div class="empty-slot"><span>Choose a runner from the field</span></div>`}
    </div>
  `;
}

function top10Review() {
  if (state.top10.length !== 10) return top10Screen();
  const gameOpen = entryIsOpen(topTenGame);
  return `
    ${header()}
    <main id="app-main" class="review-page">
      <section class="review-header"><button class="back-link" data-route="/top10">← Edit selections</button><p class="eyebrow red">PICK THE TOP 10</p><h1>${state.top10Editing ? "REVIEW YOUR CHANGES" : "REVIEW YOUR ENTRY"}</h1><p>Check the order carefully. You can revise a submitted entry until picks close.</p></section>
      <section class="review-grid">
        <div class="review-card">
          <div class="panel-heading"><h2>YOUR FINISHING ORDER</h2><span>10/10 complete</span></div>
          ${state.top10.map((id, index) => {
            const runner = runnerById(id);
            return `<div class="review-row"><span class="review-rank">${index + 1}</span>${silk(runner, true)}<div><strong>${runner.name}</strong><small>Barrier ${runner.barrier} · ${runner.jockey}</small></div><span class="points-pill">${10-index} PTS</span></div>`;
          }).join("")}
        </div>
        <aside class="submit-card">
          <p class="eyebrow red">ENTRY SUMMARY</p><h2>MELBOURNE CUP</h2><dl><div><dt>MEETING</dt><dd>Flemington · 4 Nov</dd></div><div><dt>RACE</dt><dd>Race 7 · 3200m</dd></div><div><dt>PICKS CLOSE</dt><dd>2:55pm AEDT</dd></div><div><dt>MAX SCORE</dt><dd>55 points</dd></div></dl>
          <div class="confirm-note">${icon("info")}<p>${state.top10Editing ? "Resubmitting replaces your previous entry." : "Submitting saves this entry."} You can edit again until ${topTenGame.closes}.</p></div>
          <button class="primary-button full" data-action="submit-top10" ${!gameOpen ? "disabled" : ""}>${state.top10Editing ? "Resubmit Top 10" : "Submit Top 10"}${icon("arrow")}</button>
          <button class="ghost-button full" data-route="/top10">Back to edit</button>
        </aside>
      </section>
    </main>
    ${footer()}
  `;
}

function successScreen(game) {
  const top10 = game === "top10";
  const gameData = top10 ? topTenGame : survivorGame;
  const submittedTop10 = state.top10SubmittedPicks.length ? state.top10SubmittedPicks : state.top10;
  const selectedRunner = runnerById(state.survivorSubmittedPick || state.survivorPick);
  const canEdit = entryIsOpen(gameData);
  return `
    ${header()}
    <main id="app-main" class="success-page">
      <section class="success-card">
        <div class="success-icon">${icon("check")}</div>
        <p class="eyebrow red">ENTRY CONFIRMED</p>
        <h1>${top10 ? "YOUR TOP 10 IS IN" : "YOUR SURVIVOR PICK IS IN"}</h1>
        <p>${top10 ? "Your Melbourne Cup finishing order has been submitted." : `Your Round 1 pick is ${selectedRunner?.name}. Win and you advance to Underwood Stakes Day.`} ${canEdit ? "You can revise it any time before selections close." : "Selections are now closed."}</p>
        <div class="entry-ticket">
          <div><small>ENTRY</small><strong>${top10 ? "TOP10-002841" : "SURV-009174"}</strong></div>
          <div><small>STATUS</small><strong class="green">SUBMITTED</strong></div>
          <div><small>CLOSES</small><strong>${top10 ? "4 NOV · 2:55PM" : "6 SEP · 3:55PM"}</strong></div>
        </div>
        ${top10 ? `<div class="podium-preview">${submittedTop10.slice(0,3).map((id,index)=>{const r=runnerById(id); return `<div class="podium p${index+1}"><span>${index+1}</span>${silk(r)}<strong>${r.name}</strong></div>`}).join("")}</div>` : `<div class="survivor-ticket">${silk(selectedRunner)}<div><small>ROUND 1 PICK</small><strong>${selectedRunner?.name}</strong><span>${selectedRunner?.jockey} · Barrier ${selectedRunner?.barrier}</span></div></div>`}
        <div class="edit-window ${canEdit ? "open" : "closed"}">${icon("clock")}<div><small>${canEdit ? "EDIT WINDOW OPEN" : "EDIT WINDOW CLOSED"}</small><strong>${canEdit ? `Revise until ${gameData.closes}` : "This entry can no longer be changed"}</strong></div></div>
        <div class="success-actions">${canEdit ? `<button class="primary-button" data-action="${top10 ? "edit-top10" : "edit-survivor"}">Edit selections${icon("arrow")}</button>` : ""}<button class="ghost-button" data-route="/dashboard">Return to dashboard</button></div>
      </section>
    </main>
    ${footer()}
  `;
}

function survivorScreen() {
  const picked = runnerById(state.survivorPick);
  const gameOpen = entryIsOpen(survivorGame);
  return `
    ${header()}
    <main id="app-main">
      ${gameHero(survivorGame, "survivor")}
      <section class="page-section survivor-progress-section">
        <div class="section-heading"><div><p class="eyebrow red">YOUR SURVIVOR RUN</p><h2>TEN MEETINGS. ONE LIFE.</h2></div><span class="status-badge open">ROUND 1 OPEN</span></div>
        <div class="survivor-track">${meetings.map((meeting,index)=>`<article class="survivor-round ${index===0?"current":"locked"}"><span>${index+1}</span><div><small>${meeting.date}</small><strong>${meeting.name}</strong><em>${index===0?(picked?"PICK SAVED":"CHOOSE A WINNER"):"LOCKED"}</em></div></article>`).join("")}</div>
      </section>
      <section class="game-workspace survivor-workspace">
        <div class="workspace-heading"><div><p class="eyebrow red">ROUND 1 · ${survivorGame.race}</p><h2>CHOOSE ONE WINNER</h2><p>If your horse wins, you survive to the next meeting. Every other result means elimination.</p></div><div class="selection-meter"><strong>${picked ? "1" : "0"}</strong><span>/ 1 SELECTED</span></div></div>
        ${state.survivorEditing ? `<div class="edit-notice">${icon("clock")}<div><strong>EDITING SUBMITTED PICK</strong><span>Select a replacement, then resubmit before ${survivorGame.closes}.</span></div><button class="text-button" data-action="cancel-survivor-edit">Cancel edits</button></div>` : ""}
        <div class="survivor-layout">
          <div class="survivor-field">
            ${survivorOpeningRunners.map(runner=>`<article class="survivor-runner ${state.survivorPick===runner.id?"selected":""} ${runner.status === "scratched" ? "unavailable" : ""}">
              <div class="survivor-runner-main"><span class="runner-number large">${runner.number}</span>${silk(runner)}<div><strong>${runner.name}</strong><small><span>${runner.jockey}</span><span>${runner.trainer}</span><span>FORM ${runner.form}</span></small></div><span class="barrier">B${runner.barrier}</span></div>
              <p>${runner.note} ${runnerStatus(runner)}</p>
              <button class="${state.survivorPick===runner.id?"selected-button":"outline-button"}" data-action="pick-survivor" data-id="${runner.id}" ${!gameOpen || runner.status === "scratched" ? "disabled" : ""}>${runner.status === "scratched" ? "Unavailable" : state.survivorPick===runner.id?`${icon("check")} Your pick`:`Select horse`}</button>
            </article>`).join("")}
          </div>
          <aside class="survivor-selection-card">
            <p class="eyebrow red">YOUR ROUND 1 PICK</p>
            ${picked ? `${silk(picked)}<h2>${picked.name}</h2><p>${picked.note}</p><dl><div><dt>JOCKEY</dt><dd>${picked.jockey}</dd></div><div><dt>TRAINER</dt><dd>${picked.trainer}</dd></div><div><dt>BARRIER</dt><dd>${picked.barrier}</dd></div><div><dt>FORM</dt><dd>${picked.form}</dd></div></dl><button class="text-button" data-action="clear-survivor" ${!gameOpen ? "disabled" : ""}>Remove selection</button>` : `<div class="empty-pick">${icon("horse")}<h2>No horse selected</h2><p>Choose one runner from the field to continue.</p></div>`}
          </aside>
        </div>
      </section>
      <div class="sticky-action"><div><small>${state.survivorEditing ? "UNSUBMITTED CHANGES" : "SURVIVOR ROUND 1"}</small><strong>${!gameOpen ? "Selections closed" : picked ? `${picked.name} selected` : "Choose one winner"}</strong></div><button class="primary-button" data-route="/survivor/review" ${!picked || !gameOpen ? "disabled" : ""}>${state.survivorEditing ? "Review changes" : "Review pick"}${icon("arrow")}</button></div>
    </main>
  `;
}

function survivorReview() {
  const picked = runnerById(state.survivorPick);
  if (!picked) return survivorScreen();
  const gameOpen = entryIsOpen(survivorGame);
  return `
    ${header()}
    <main id="app-main" class="review-page">
      <section class="review-header"><button class="back-link" data-route="/survivor">← Change selection</button><p class="eyebrow red">SURVIVOR · ROUND 1</p><h1>${state.survivorEditing ? "REVIEW YOUR CHANGE" : "LOCK IN YOUR PICK"}</h1><p>Your submitted pick can be revised until selections close.</p></section>
      <section class="survivor-review-card">
        <div class="survivor-review-visual">${silk(picked)}<span class="runner-number giant">${picked.number}</span></div>
        <div class="survivor-review-copy"><span class="status-badge progress">YOUR SELECTION</span><h2>${picked.name}</h2><p>${picked.note}</p><dl><div><dt>JOCKEY</dt><dd>${picked.jockey}</dd></div><div><dt>TRAINER</dt><dd>${picked.trainer}</dd></div><div><dt>BARRIER</dt><dd>${picked.barrier}</dd></div><div><dt>RECENT FORM</dt><dd>${picked.form}</dd></div></dl></div>
        <aside class="survival-rule"><p class="eyebrow red">THE RULE</p><div><strong>WIN</strong><span>You advance to Underwood Stakes Day</span></div><div><strong>LOSE</strong><span>Your Survivor campaign ends</span></div><button class="primary-button full" data-action="submit-survivor" ${!gameOpen ? "disabled" : ""}>${state.survivorEditing ? "Resubmit Survivor pick" : "Submit Survivor pick"}${icon("arrow")}</button><button class="ghost-button full" data-route="/survivor">Back to field</button></aside>
      </section>
    </main>
    ${footer()}
  `;
}

function rulesDialog() {
  return `
    <div class="modal-shell" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <button class="modal-backdrop" data-action="close-modal" aria-label="Close"></button>
      <section class="rules-modal">
        <button class="modal-close" data-action="close-modal" aria-label="Close">×</button>
        <p class="eyebrow red">WORLDPLAY RACING</p><h2 id="rules-title">TWO WAYS TO PLAY</h2>
        <article><span>01</span><div><h3>PICK THE TOP 10</h3><p>Rank ten runners in exact finishing order. Correct positions score from 10 points for first down to 1 point for tenth.</p></div></article>
        <article><span>02</span><div><h3>SURVIVOR</h3><p>Pick one winner at each of ten featured meetings. A win moves you forward; an incorrect pick eliminates the entry.</p></div></article>
        <button class="primary-button full" data-action="close-modal">Got it</button>
      </section>
    </div>
  `;
}

function render({ preserveScroll = false } = {}) {
  const route = currentRoute();
  let html;
  if (route === "/dashboard") html = dashboard();
  else if (route === "/racing") html = racingHub();
  else if (route === "/top10/review") html = top10Review();
  else if (route === "/top10/submitted") html = successScreen("top10");
  else if (route === "/top10") html = state.top10Submitted && !state.top10Editing ? successScreen("top10") : top10Screen();
  else if (route === "/survivor/review") html = survivorReview();
  else if (route === "/survivor/submitted") html = successScreen("survivor");
  else if (route === "/survivor") html = state.survivorSubmitted && !state.survivorEditing ? successScreen("survivor") : survivorScreen();
  else html = dashboard();
  app.innerHTML = html;
  if (!preserveScroll) window.scrollTo({ top: 0, behavior: "instant" });
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  toastRoot.append(node);
  setTimeout(() => node.remove(), 2600);
}

function toggleMenu(force) {
  const drawer = document.querySelector(".account-drawer");
  const button = document.querySelector(".profile-button");
  if (!drawer || !button) return;
  const open = force ?? !drawer.classList.contains("open");
  drawer.classList.toggle("open", open);
  drawer.setAttribute("aria-hidden", String(!open));
  button.setAttribute("aria-expanded", String(open));
}

function showRules() {
  document.body.insertAdjacentHTML("beforeend", rulesDialog());
  document.body.classList.add("modal-open");
}

function closeModal() {
  document.querySelector(".modal-shell")?.remove();
  document.body.classList.remove("modal-open");
}

function addTop10(id) {
  if (!requireOpenEntry(topTenGame)) return;
  const runner = melbourneCupRunners.find((candidate) => candidate.id === id);
  if (!runner || runner.status === "scratched") return;
  if (!state.top10.includes(id) && state.top10.length < 10) {
    state.top10.push(id);
    saveState();
    render({ preserveScroll: true });
    toast(`${runner.name} added to your Top 10`);
  }
}

function insertTop10(id, index) {
  if (!requireOpenEntry(topTenGame)) return;
  const current = state.top10.indexOf(id);
  if (current >= 0) state.top10.splice(current, 1);
  if (state.top10.length >= 10 && current < 0) return;
  state.top10.splice(index, 0, id);
  state.top10 = state.top10.slice(0, 10);
  saveState();
  render({ preserveScroll: true });
}

function moveTop10(index, delta) {
  if (!requireOpenEntry(topTenGame)) return;
  state.top10 = moveRankedSelection(state.top10, index, delta);
  saveState();
  render({ preserveScroll: true });
}

document.addEventListener("click", (event) => {
  const routeTarget = event.target.closest("[data-route]");
  if (routeTarget && !routeTarget.disabled) {
    toggleMenu(false);
    go(routeTarget.dataset.route);
    return;
  }
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  const { action, id } = target.dataset;
  if (action === "toggle-menu") toggleMenu();
  if (action === "show-rules") { toggleMenu(false); showRules(); }
  if (action === "show-coming-soon") toast("This competition is shown for context — racing is the active prototype.");
  if (action === "scroll-arena") document.querySelector("#arena")?.scrollIntoView({ behavior: "smooth" });
  if (action === "close-modal") closeModal();
  if (action === "add-top10") addTop10(id);
  if (action === "remove-top10") {
    if (!requireOpenEntry(topTenGame)) return;
    state.top10 = state.top10.filter((runnerId) => runnerId !== id);
    saveState(); render({ preserveScroll: true });
  }
  if (action === "move-up") moveTop10(Number(target.dataset.index), -1);
  if (action === "move-down") moveTop10(Number(target.dataset.index), 1);
  if (action === "quick-pick") {
    if (!requireOpenEntry(topTenGame)) return;
    state.top10 = melbourneCupRunners.filter((runner) => runner.status !== "scratched").slice(0,10).map((runner) => runner.id);
    saveState(); render({ preserveScroll: true }); toast("Demo Top 10 completed");
  }
  if (action === "clear-top10") {
    if (!requireOpenEntry(topTenGame)) return;
    state.top10 = [];
    if (!state.top10Editing) state.top10Submitted = false;
    saveState(); render({ preserveScroll: true });
  }
  if (action === "submit-top10") {
    if (!requireOpenEntry(topTenGame) || state.top10.length !== 10) return;
    state.top10Submitted = true;
    state.top10SubmittedPicks = [...state.top10];
    state.top10Editing = false;
    saveState(); go("/top10/submitted"); toast("Top 10 entry submitted");
  }
  if (action === "edit-top10") {
    if (!requireOpenEntry(topTenGame)) return;
    state.top10 = [...(state.top10SubmittedPicks.length ? state.top10SubmittedPicks : state.top10)];
    state.top10Editing = true;
    saveState(); go("/top10"); toast("Top 10 reopened for editing");
  }
  if (action === "cancel-top10-edit") {
    state.top10 = [...state.top10SubmittedPicks];
    state.top10Editing = false;
    saveState(); go("/top10/submitted"); toast("Edits cancelled");
  }
  if (action === "pick-survivor") {
    if (!requireOpenEntry(survivorGame)) return;
    const runner = survivorOpeningRunners.find((candidate) => candidate.id === id);
    if (!runner || runner.status === "scratched") return;
    state.survivorPick = id; saveState(); render({ preserveScroll: true }); toast(`${runnerById(id).name} selected`);
  }
  if (action === "clear-survivor") {
    if (!requireOpenEntry(survivorGame)) return;
    state.survivorPick = null;
    if (!state.survivorEditing) state.survivorSubmitted = false;
    saveState(); render({ preserveScroll: true });
  }
  if (action === "submit-survivor") {
    if (!requireOpenEntry(survivorGame) || !state.survivorPick) return;
    state.survivorSubmitted = true;
    state.survivorSubmittedPick = state.survivorPick;
    state.survivorEditing = false;
    saveState(); go("/survivor/submitted"); toast("Survivor pick submitted");
  }
  if (action === "edit-survivor") {
    if (!requireOpenEntry(survivorGame)) return;
    state.survivorPick = state.survivorSubmittedPick || state.survivorPick;
    state.survivorEditing = true;
    saveState(); go("/survivor"); toast("Survivor pick reopened for editing");
  }
  if (action === "cancel-survivor-edit") {
    state.survivorPick = state.survivorSubmittedPick;
    state.survivorEditing = false;
    saveState(); go("/survivor/submitted"); toast("Edits cancelled");
  }
  if (action === "reset-demo") {
    state = { ...defaultState, top10: [], top10SubmittedPicks: [] }; saveState(); toggleMenu(false); go("/dashboard"); render(); toast("Prototype data reset");
  }
});

document.addEventListener("dragstart", (event) => {
  if (!entryIsOpen(topTenGame)) { dragPayload = null; return; }
  const rank = event.target.closest("[data-rank-index]");
  const runner = event.target.closest("[data-runner-id]");
  if (rank && state.top10[Number(rank.dataset.rankIndex)]) dragPayload = { type: "rank", index: Number(rank.dataset.rankIndex) };
  else if (runner) dragPayload = { type: "runner", id: runner.dataset.runnerId };
  else dragPayload = null;
});

document.addEventListener("dragover", (event) => {
  if (event.target.closest("[data-rank-index]")) event.preventDefault();
});

document.addEventListener("drop", (event) => {
  if (!entryIsOpen(topTenGame)) return;
  const slot = event.target.closest("[data-rank-index]");
  if (!slot || !dragPayload) return;
  event.preventDefault();
  const index = Number(slot.dataset.rankIndex);
  if (dragPayload.type === "runner") insertTop10(dragPayload.id, index);
  if (dragPayload.type === "rank") {
    const [moved] = state.top10.splice(dragPayload.index, 1);
    state.top10.splice(index, 0, moved);
    saveState(); render({ preserveScroll: true });
  }
  dragPayload = null;
});

window.addEventListener("hashchange", () => render());
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { closeModal(); toggleMenu(false); }
});

if (!window.location.hash) window.location.hash = "/dashboard";
render();

export { currentRoute, loadState };
