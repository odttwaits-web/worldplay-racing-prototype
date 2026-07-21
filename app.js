import {
  leaderboard,
  melbourneCupRunners,
  meetings,
  runnerById,
  survivorOpeningRunners,
  survivorGame,
  topTenGame,
  weeklyGameById,
  weeklyGames
} from "./data.js";
import {
  emptyWeeklyEntry,
  entryIsOpen,
  moveRankedSelection,
  normalizePrototypeState,
  normalizeWeeklyEntries,
  weeklyEntryIsComplete
} from "./game-logic.js";

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
  survivorEditing: false,
  weeklyEntries: Object.fromEntries(Object.keys(weeklyGames).map((id) => [id, emptyWeeklyEntry()]))
};

let state = loadState();
let dragPayload = null;
let dashboardSport = "all";

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
    loaded.weeklyEntries = normalizeWeeklyEntries(loaded.weeklyEntries, weeklyGames);
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
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12M6 12h12M6 16h12"/></svg>'
  };
  return icons[name] || "";
}

function header() {
  return `
    <header class="site-header">
      <button class="brand" data-route="/dashboard" aria-label="WorldPlay dashboard">
        <img src="./assets/worldplay-logo.svg" alt="" />
      </button>
      <button class="profile-button" data-action="toggle-menu" aria-expanded="false">
        <strong>Oscar</strong><span aria-hidden="true">${icon("menu")}</span>
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

function weeklyEntry(gameId) {
  return state.weeklyEntries[gameId] || emptyWeeklyEntry();
}

function weeklyProgress(game) {
  const entry = weeklyEntry(game.id);
  return Math.min(Object.keys(entry.picks).length, game.fixtures.length);
}

function weeklyRoute(game) {
  const entry = weeklyEntry(game.id);
  return entry.submitted && !entry.editing ? `/${game.id}/submitted` : `/${game.id}`;
}

function dashboard() {
  const aflGame = weeklyGames["afl-round"];
  const nflGame = weeklyGames["nfl-pick6"];
  const aflEntry = weeklyEntry(aflGame.id);
  const nflEntry = weeklyEntry(nflGame.id);
  const aflProgress = weeklyProgress(aflGame);
  const nflProgress = weeklyProgress(nflGame);
  const top10Route = state.top10Submitted && !state.top10Editing ? "/top10/submitted" : "/top10";
  const survivorRoute = state.survivorSubmitted && !state.survivorEditing ? "/survivor/submitted" : "/survivor";
  const top10Progress = Math.min(state.top10.length, 10);
  const survivorSelection = runnerById(state.survivorSubmittedPick || state.survivorPick);
  const playerGames = [
    { sport: "racing", html: dashboardGameCard("racing", "PICK THE TOP 10", state.top10Submitted ? "ENTRY SUBMITTED" : `${top10Progress}/10 SELECTED`, "Melbourne Cup · $100K", "4 NOV · 2:55PM", top10Progress * 10, top10Route, state.top10Submitted ? "View entry" : "Make picks") },
    { sport: "racing", html: dashboardGameCard("survivor", "SPRING SURVIVOR", state.survivorSubmitted ? "PICK SUBMITTED" : survivorSelection ? "PICK SAVED" : "ROUND 1 OPEN", survivorSelection ? survivorSelection.name : "Makybe Diva Stakes Day", "6 SEP · 3:55PM", survivorSelection ? 100 : 0, survivorRoute, state.survivorSubmitted ? "View pick" : "Choose horse") },
    { sport: "afl", html: dashboardGameCard("afl", "AFL ROUND CARD", aflEntry.submitted ? "ENTRY SUBMITTED" : `${aflProgress}/9 TIPPED`, "Round 24 · $10K weekly", "21 AUG · 7:10PM", Math.round(aflProgress / 9 * 100), weeklyRoute(aflGame), aflEntry.submitted ? "View entry" : "Make tips") },
    { sport: "nfl", html: dashboardGameCard("nfl", "NFL WEEKLY PICK 6", nflEntry.submitted ? "ENTRY SUBMITTED" : `${nflProgress}/6 PICKED`, "Week 1 · $25K weekly", "11 SEP · 10:15AM", Math.round(nflProgress / 6 * 100), weeklyRoute(nflGame), nflEntry.submitted ? "View entry" : "Make picks") }
  ];
  const dashboardFilter = dashboardSport;
  const visibleGames = dashboardSport === "all" ? playerGames : playerGames.filter((game) => game.sport === dashboardFilter);
  const schedule = [
    { sport: "afl", args: ["21", "AUG", "AFL · ROUND 24", "Round Card", "Tips close 7:10PM", "action", "/afl-round"] },
    { sport: "racing", args: ["06", "SEP", "SURVIVOR · ROUND 1", "Makybe Diva Stakes Day", "Picks close 3:55PM", "action", "/survivor"] },
    { sport: "nfl", args: ["11", "SEP", "NFL · WEEK 1", "Weekly Pick 6", "Picks close 10:15AM", "action", "/nfl-pick6"] },
    { sport: "afl", args: ["12", "SEP", "AFL FINALS", "Semi-final selections", "Picks close 7:20PM", "live"] },
    { sport: "racing", args: ["20", "SEP", "SURVIVOR · ROUND 2", "Underwood Stakes Day", "Advancing players only", "upcoming", "/racing"] },
    { sport: "nrl", args: ["26", "SEP", "NRL FINALS", "Preliminary final picks", "Picks close 7:40PM", "upcoming"] },
    { sport: "nfl", args: ["05", "OCT", "NFL WEEKLY PICKS", "Week 5 selections", "Opens Monday 9:00AM", "upcoming", "/nfl-pick6"] },
    { sport: "community", args: ["18", "OCT", "PUNT ROAD LEGENDS", "League rivalry round", "24 members competing", "upcoming"] },
    { sport: "racing", args: ["04", "NOV", "PICK THE TOP 10", "Melbourne Cup", "Picks close 2:55PM", "upcoming", "/top10"] }
  ];
  const visibleSchedule = (dashboardSport === "all" ? schedule.slice(0, 4) : schedule.filter((item) => item.sport === dashboardFilter)).slice(0,4);
  const news = [
    { sport: "racing", args: ["feature", "RACING", "Five horses to watch this Spring Carnival", "6 min read"] },
    { sport: "racing", args: ["analysis", "ANALYSIS", "How the Top 10 scoring system rewards bold calls", "4 min read"] },
    { sport: "afl", args: ["afl-news", "AFL", "The finals matchups that could break your bracket", "5 min read"] },
    { sport: "afl", args: ["analysis", "AFL ANALYSIS", "Three calls separating the leading predictors", "4 min read"] },
    { sport: "nrl", args: ["nrl-news", "NRL", "Form guide: the road to the preliminary finals", "5 min read"] },
    { sport: "nrl", args: ["analysis", "NRL ANALYSIS", "Where this week's margins may be won", "3 min read"] },
    { sport: "nfl", args: ["nfl-news", "NFL", "Early playoff contenders to keep on your radar", "6 min read"] },
    { sport: "nfl", args: ["analysis", "NFL ANALYSIS", "The matchups shaping the weekly picks", "4 min read"] },
    { sport: "community", args: ["community", "COMMUNITY", "Inside Punt Road Legends: the league to beat", "3 min read"] },
    { sport: "community", args: ["community", "LEAGUE STORIES", "How Office Footy Tips keeps the rivalry alive", "4 min read"] }
  ];
  const visibleNews = dashboardSport === "all" ? [news[0], news[2], news[8]] : news.filter((item) => item.sport === dashboardFilter);
  const sportNames = { all: "ALL", racing: "RACING", afl: "AFL", nrl: "NRL", nfl: "NFL", community: "COMMUNITY" };
  const activeSportName = sportNames[dashboardSport] || "ALL";
  const scheduleRoutes = { racing: "/racing", afl: "/afl-round", nfl: "/nfl-pick6" };
  const scheduleAction = scheduleRoutes[dashboardSport] ? `data-route="${scheduleRoutes[dashboardSport]}"` : 'data-action="show-coming-soon"';
  const scheduleLabel = dashboardSport === "all" ? "View all deadlines" : `${activeSportName} calendar`;
  let nextAction = {
    label: "MELBOURNE CUP", count: `${top10Progress}/10`, title: top10Progress === 10 ? "YOUR TOP 10 IS READY" : `${10 - top10Progress} PICKS LEFT TO MAKE`,
    copy: top10Progress === 10 ? "Review your order before the field locks." : "Finish ranking the field before selections close.", progress: top10Progress * 10,
    closes: "CLOSES 4 NOV · 2:55PM AEDT", route: top10Route, cta: state.top10Submitted ? "View entry" : "Continue picking"
  };
  if (dashboardSport === "afl") nextAction = {
    label: "AFL ROUND 24", count: `${aflProgress}/9`, title: aflEntry.submitted ? "ROUND CARD SUBMITTED" : `${9 - aflProgress} MATCHES LEFT TO TIP`,
    copy: "Complete the round and add your featured-match margin.", progress: Math.round(aflProgress / 9 * 100), closes: "CLOSES 21 AUG · 7:10PM AEST",
    route: weeklyRoute(aflGame), cta: aflEntry.submitted ? "View entry" : "Continue tipping"
  };
  if (dashboardSport === "nfl") nextAction = {
    label: "NFL WEEK 1", count: `${nflProgress}/6`, title: nflEntry.submitted ? "PICK 6 SUBMITTED" : `${6 - nflProgress} PICKS LEFT TO MAKE`,
    copy: "Choose six winners and assign your confidence points.", progress: Math.round(nflProgress / 6 * 100), closes: "CLOSES 11 SEP · 10:15AM AEST",
    route: weeklyRoute(nflGame), cta: nflEntry.submitted ? "View entry" : "Continue picking"
  };
  if (dashboardSport === "nrl") nextAction = {
    label: "NRL FINALS", count: "SOON", title: "ROUND 1 OPENS IN 12 DAYS", copy: "The next NRL competition is being prepared for launch.", progress: 0,
    closes: "OPENING SOON", route: null, cta: "Preview NRL"
  };
  if (dashboardSport === "community") nextAction = {
    label: "YOUR LEAGUES", count: "3", title: "PUNT ROAD LEGENDS IS HEATING UP", copy: "See the latest movement across your private and community leagues.", progress: 72,
    closes: "NEXT DEADLINE · FRIDAY", route: null, cta: "View leagues"
  };
  return `
    ${header()}
    ${sportsRail()}
    <main id="app-main" class="dashboard-home">
      <section class="home-command-hero">
        <div class="home-command-inner">
          <div class="home-welcome">
            <p class="eyebrow red">YOUR WORLDPLAY</p>
            <h1>GOOD AFTERNOON,<br><span>OSCAR.</span></h1>
            <p>Everything you are playing, following and competing in—one place.</p>
            <div class="home-quick-stats"><span><strong>4</strong> ACTIVE GAMES</span><span><strong>#24</strong> BEST GAME RANK</span><span><strong>3</strong> LEAGUES</span></div>
          </div>
          <article class="next-action-card">
            <div class="next-action-top"><span class="live-dot"></span><small>NEXT ACTION · ${nextAction.label}</small><span>${nextAction.count}</span></div>
            <h2>${nextAction.title}</h2>
            <p>${nextAction.copy}</p>
            <div class="action-progress"><span style="width:${nextAction.progress}%"></span></div>
            <div class="next-action-footer"><small>${nextAction.closes}</small><button class="primary-button small" ${nextAction.route ? `data-route="${nextAction.route}"` : 'data-action="show-coming-soon"'}>${nextAction.cta}${icon("arrow")}</button></div>
          </article>
        </div>
      </section>

      <section class="page-section dashboard-content-grid">
        <div class="dashboard-main-column">
          <section class="dashboard-module your-games-module" aria-labelledby="your-games-heading">
            <div class="module-heading"><div><p class="eyebrow red">${dashboardSport === "all" ? "YOUR COMPETITIONS" : `${activeSportName} COMPETITIONS`}</p><h2 id="your-games-heading">YOUR GAMES</h2></div><button class="text-button" data-action="scroll-arena">Find another game →</button></div>
            <div class="active-games-grid">
              ${visibleGames.length ? visibleGames.map((game) => game.html).join("") : emptySportState()}
            </div>
            ${visibleGames.length > 1 ? `<p class="mobile-swipe-hint">Swipe to view more games →</p>` : ""}
          </section>

          <section class="dashboard-module upcoming-module" id="upcoming" aria-labelledby="upcoming-heading">
            <div class="module-heading"><div><p class="eyebrow red">YOUR SCHEDULE</p><h2 id="upcoming-heading">COMING UP</h2></div><button class="text-button" ${scheduleAction}>${scheduleLabel} →</button></div>
            <div class="upcoming-list">
              ${visibleSchedule.length ? visibleSchedule.map((item) => upcomingItem(...item.args)).join("") : emptyScheduleState()}
            </div>
          </section>

          <section class="dashboard-module news-module" aria-labelledby="news-heading">
            <div class="module-heading"><div><p class="eyebrow red">NEWS & INSIGHTS</p><h2 id="news-heading">WHAT TO KNOW</h2></div><button class="text-button" data-action="show-coming-soon">View all news →</button></div>
            <div class="dashboard-news-grid">
              ${visibleNews.map((item) => newsCard(...item.args)).join("")}
            </div>
          </section>

          <section class="dashboard-module social-strip-card" aria-labelledby="social-heading">
            <div class="module-heading"><div><p class="eyebrow red">SOCIAL FEED</p><h2 id="social-heading">FROM WORLDPLAY</h2></div><span class="x-mark">𝕏</span></div>
            <div class="social-strip-post"><div><strong>@WorldPlay</strong><small>· 18m</small></div><p>The Spring Carnival is coming. Two new games, ten meetings and plenty of bragging rights.</p><span>12 replies · 34 reposts · 186 likes</span><button class="outline-button small" data-action="show-coming-soon">View on X${icon("arrow")}</button></div>
          </section>
        </div>

        <aside class="dashboard-sidebar" aria-label="Leagues and rankings">
          <section class="sidebar-card rank-summary-card">
            <div class="sidebar-heading"><p class="eyebrow red">TOP 10 RANK</p><span>MELBOURNE CUP</span></div>
            <div class="rank-lockup"><strong>#24</strong><span><b>↑ 7</b> THIS WEEK<br>OF 96,441 IN THIS GAME</span></div>
            <div class="rank-bar"><span></span></div>
            <button class="outline-button full small" data-action="show-coming-soon">View leaderboard${icon("arrow")}</button>
          </section>

          <section class="sidebar-card leagues-card">
            <div class="sidebar-heading"><div><p class="eyebrow red">SOCIAL</p><h2>MY LEAGUES</h2></div><button class="icon-button" data-action="show-coming-soon" aria-label="Create a league">+</button></div>
            <div class="league-list">
              ${leagueRow("PR", "Punt Road Legends", "24 members", "#3", "2 NEW")}
              ${leagueRow("OF", "Office Footy Tips", "58 members", "#12", "FRI")}
              ${leagueRow("SC", "Spring Carnival", "18 members", "#7", "LIVE")}
            </div>
            <button class="outline-button full small" data-action="show-coming-soon">Explore community leagues</button>
          </section>

          <section class="sidebar-card activity-card">
            <div class="sidebar-heading"><div><p class="eyebrow red">LEAGUE FEED</p><h2>LATEST ACTIVITY</h2></div></div>
            <ul>
              <li><span class="activity-avatar">BK</span><p><strong>@sarah_k</strong> moved into 1st in Punt Road Legends.<small>12 min ago</small></p></li>
              <li><span class="activity-avatar red">OT</span><p>Your Survivor pick was saved.<small>1 hr ago</small></p></li>
              <li><span class="activity-avatar">MC</span><p><strong>@mcg_oracle</strong> joined Spring Carnival.<small>3 hrs ago</small></p></li>
            </ul>
          </section>

        </aside>
      </section>

      <section class="page-section arena-section" id="arena">
        <div class="section-heading">
          <div><p class="eyebrow red">DISCOVER</p><h2>FIND YOUR NEXT GAME</h2></div>
          <button class="text-button" data-action="show-coming-soon">View all competitions →</button>
        </div>
        <div class="sport-arena-grid">
          ${sportCard("racing", "RACING", "Melbourne Cup Top 10 + Spring Survivor", "$150K PRIZES", "/racing")}
          ${sportCard("afl", "AFL", "Round Card + Finals Predictor", "$10K WEEKLY", "/afl-round")}
          ${sportCard("nfl", "NFL", "Weekly Pick 6 + Playoff Predictor", "$25K WEEKLY", "/nfl-pick6")}
          ${sportCard("community", "COMMUNITY", "Create a league and play your way.", "FREE TO JOIN", null)}
          ${sportCard("nrl", "NRL", "Finals predictor", "$5M + $150K", null)}
        </div>
      </section>

      <section class="page-section platform-stats">
        <div><strong>1.2M+</strong><span>PREDICTIONS MADE</span></div><div><strong>420K+</strong><span>PLAYERS</span></div><div><strong>412,806</strong><span>BRACKETS SO FAR</span></div><div><strong>85</strong><span>COUNTRIES</span></div>
      </section>
    </main>
    ${footer()}
  `;
}

function sportsRail() {
  const sports = [
    ["all", "ALL GAMES"], ["racing", "RACING"], ["afl", "AFL"], ["nrl", "NRL"], ["nfl", "NFL"]
  ];
  return `<nav class="sports-rail" aria-label="Games by sport"><div class="sports-rail-inner">
    ${sports.map(([id, label]) => `<button class="${dashboardSport === id ? "active" : ""}" data-action="sport-filter" data-sport="${id}" ${dashboardSport === id ? 'aria-current="page"' : ""}>${label}</button>`).join("")}
    <details class="sports-more ${dashboardSport === "community" ? "active" : ""}">
      <summary ${dashboardSport === "community" ? 'aria-current="page"' : ""}>MORE</summary>
      <div class="sports-more-menu">
        <button data-action="sport-filter" data-sport="community">COMMUNITY &amp; LEAGUES</button>
        <button data-action="show-coming-soon">CRICKET <span>COMING SOON</span></button>
        <button data-action="show-coming-soon">BASKETBALL <span>COMING SOON</span></button>
      </div>
    </details>
  </div></nav>`;
}

function emptySportState() {
  return `<div class="empty-dashboard-state"><span>${icon("trophy")}</span><div><h3>NO ACTIVE GAMES HERE YET</h3><p>Explore upcoming competitions and join your next challenge.</p></div><button class="outline-button small" data-action="scroll-arena">Browse games</button></div>`;
}

function emptyScheduleState() {
  return `<div class="empty-schedule-state"><strong>YOU'RE ALL CLEAR</strong><span>No upcoming deadlines in this category.</span></div>`;
}

function dashboardGameCard(kind, title, status, detail, deadline, progress, route, cta) {
  const action = route ? `data-route="${route}"` : 'data-action="show-coming-soon"';
  return `<article class="dashboard-game-card ${kind}">
    <div class="dashboard-game-top"><span class="game-sport">${kind === "racing" || kind === "survivor" ? "RACING" : kind.toUpperCase()}</span><span class="game-state">${status}</span></div>
    <h3>${title}</h3>
    <div class="dashboard-game-meta"><p>${detail}</p><span><small>PICKS CLOSE</small><strong>${deadline}</strong></span></div>
    <div class="game-progress"><span style="width:${progress}%"></span></div>
    <button class="text-button" ${action}>${cta} →</button>
  </article>`;
}

function upcomingItem(day, month, game, title, meta, status, route) {
  const action = route ? `data-route="${route}"` : 'data-action="show-coming-soon"';
  return `<article class="upcoming-item"><time><strong>${day}</strong><span>${month}</span></time><span class="schedule-line ${status}"></span><div><small>${game}</small><h3>${title}</h3><p>${meta}</p></div><button class="round-arrow" ${action} aria-label="Open ${title}">${icon("arrow")}</button></article>`;
}

function newsCard(kind, category, title, meta) {
  return `<article class="dashboard-news-card ${kind}"><div class="news-art"></div><div><small>${category}</small><h3>${title}</h3><p>${meta}</p><button data-action="show-coming-soon" aria-label="Read ${title}">${icon("arrow")}</button></div></article>`;
}

function leagueRow(initials, name, members, rank, signal) {
  return `<button class="league-row" data-action="show-coming-soon"><span class="league-mark">${initials}</span><span><strong>${name}</strong><small>${members}</small></span><span class="league-rank"><small>RANK</small><strong>${rank}</strong></span><em>${signal}</em></button>`;
}

function sportCard(kind, title, subtitle, prize, route) {
  return `<article class="sport-card ${kind} ${route ? "active" : ""}">
    <div class="sport-card-art"><span>${kind === "community" ? "WP" : title}</span></div>
    <div class="sport-card-body"><span class="sport-tag">${route ? "PLAYABLE PROTOTYPE" : kind === "community" ? "FREE TO JOIN" : "FREE TO PLAY"}</span><h3>${title}</h3><p>${subtitle}</p><strong>${prize}</strong><button class="sport-card-button" ${route ? `data-route="${route}"` : 'data-action="show-coming-soon"'}>${route ? `PLAY ${title}` : "EXPLORE MORE"}${icon("arrow")}</button></div>
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
      <section class="page-section survivor-progress-section">
        <div class="section-heading"><div><p class="eyebrow red">YOUR SURVIVOR RUN</p><h2>TEN MEETINGS. ONE LIFE.</h2></div><span class="status-badge open">ROUND 1 OPEN</span></div>
        <div class="survivor-track">${meetings.map((meeting,index)=>`<article class="survivor-round ${index===0?"current":"locked"}"><span>${index+1}</span><div><small>${meeting.date}</small><strong>${meeting.name}</strong><em>${index===0?(picked?"PICK SAVED":"CHOOSE A WINNER"):"LOCKED"}</em></div></article>`).join("")}</div>
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

function weeklyFixtureCard(game, fixture, entry) {
  const pick = entry.picks[fixture.id];
  const confidence = entry.confidence[fixture.id] || "";
  const usedConfidence = new Set(Object.entries(entry.confidence).filter(([id]) => id !== fixture.id).map(([, value]) => Number(value)));
  return `<article class="weekly-fixture ${pick ? "has-pick" : ""} ${fixture.featured ? "featured" : ""}">
    <div class="weekly-fixture-meta"><span>${fixture.time}</span><span>${fixture.venue}</span>${fixture.featured ? "<strong>FEATURED MARGIN</strong>" : ""}</div>
    <div class="team-choice-grid">
      ${[fixture.home, fixture.away].map((team) => `<button class="team-choice ${pick === team.code ? "selected" : ""}" data-action="pick-weekly" data-game="${game.id}" data-fixture="${fixture.id}" data-team="${team.code}">
        <span class="team-mark" style="--team-colour:${team.color}">${team.code}</span><span><strong>${team.name}</strong><small>${pick === team.code ? "YOUR PICK" : "SELECT"}</small></span>${pick === team.code ? icon("check") : ""}
      </button>`).join("")}
    </div>
    ${game.scoring === "confidence" ? `<label class="confidence-control"><span>CONFIDENCE POINTS</span><select data-weekly-confidence data-game="${game.id}" data-fixture="${fixture.id}" ${pick ? "" : "disabled"}><option value="">SET POINTS</option>${game.fixtures.map((_, index) => { const value = index + 1; return `<option value="${value}" ${Number(confidence) === value ? "selected" : ""} ${usedConfidence.has(value) ? "disabled" : ""}>${value} PT${value === 1 ? "" : "S"}</option>`; }).join("")}</select></label>` : ""}
    ${fixture.featured ? `<label class="margin-control"><span>YOUR WINNING MARGIN</span><span><input type="number" min="1" max="99" inputmode="numeric" placeholder="00" value="${entry.margin}" data-weekly-margin data-game="${game.id}" aria-label="Featured match winning margin" /> PTS</span></label>` : ""}
  </article>`;
}

function weeklySummary(game, entry) {
  const count = Object.keys(entry.picks).length;
  const usedConfidence = new Set(Object.values(entry.confidence).map(Number));
  const remainingConfidence = game.scoring === "confidence"
    ? game.fixtures.map((_, index) => index + 1).filter((value) => !usedConfidence.has(value))
    : [];
  const requiredCall = game.scoring === "confidence"
    ? `<div class="weekly-required-call ${remainingConfidence.length ? "" : "complete"}"><span>CONFIDENCE POINTS LEFT</span><strong>${remainingConfidence.join(" · ") || "COMPLETE"}</strong></div>`
    : `<div class="weekly-required-call ${entry.margin ? "complete" : ""}"><span>FEATURED MATCH MARGIN</span><strong>${entry.margin ? `${entry.margin} PTS` : "REQUIRED"}</strong></div>`;
  return `<aside class="weekly-summary-card">
    <div class="weekly-summary-head"><p class="eyebrow red">YOUR ENTRY</p><strong>${count}<small>/${game.fixtures.length}</small></strong></div>
    <div class="game-progress"><span style="width:${Math.round(count / game.fixtures.length * 100)}%"></span></div>
    ${requiredCall}
    <div class="weekly-summary-list">${game.fixtures.map((fixture) => {
      const code = entry.picks[fixture.id];
      const team = [fixture.home, fixture.away].find((candidate) => candidate.code === code);
      return `<div class="weekly-summary-row"><span>${fixture.home.code} v ${fixture.away.code}</span><strong>${team?.code || "—"}</strong>${game.scoring === "confidence" ? `<small>${entry.confidence[fixture.id] ? `${entry.confidence[fixture.id]} PTS` : "NO RANK"}</small>` : ""}</div>`;
    }).join("")}</div>
    <div class="weekly-rule">${game.scoring === "confidence" ? `<strong>HOW SCORING WORKS</strong><p>A correct pick earns its confidence value. Use every number from 1 to ${game.fixtures.length} once.</p>` : `<strong>HOW SCORING WORKS</strong><p>One point per correct tip. The featured-match margin breaks tied scores.</p>`}</div>
    <button class="text-button" data-action="clear-weekly" data-game="${game.id}">Clear entry</button>
  </aside>`;
}

function weeklyGameScreen(game) {
  const entry = weeklyEntry(game.id);
  const complete = weeklyEntryIsComplete(game, entry);
  const open = entryIsOpen(game);
  return `${header()}<main id="app-main" class="weekly-game-page ${game.sport.toLowerCase()}">
    <section class="weekly-game-hero">
      <div class="weekly-hero-inner"><button class="back-link" data-route="/dashboard">← Back to dashboard</button><p class="eyebrow red">${game.eyebrow}</p><h1>${game.title}</h1><p>${game.subtitle}</p>
        <div class="game-meta"><span><small>PRIZE</small><strong>${game.prize}</strong></span><span><small>PICKS CLOSE</small><strong>${game.closes}</strong></span><span><small>FORMAT</small><strong>${game.scoring === "confidence" ? "CONFIDENCE" : "WINNERS + MARGIN"}</strong></span></div>
      </div>
    </section>
    <section class="weekly-workspace">
      ${entry.editing ? `<div class="edit-notice">${icon("clock")}<div><strong>EDITING SUBMITTED ENTRY</strong><span>Update your picks and resubmit before ${game.closes}.</span></div><button class="text-button" data-action="cancel-weekly-edit" data-game="${game.id}">Cancel edits</button></div>` : ""}
      <div class="weekly-workspace-heading"><div><p class="eyebrow red">${game.kind === "round" ? "THIS ROUND" : "THIS WEEK"}</p><h2>MAKE YOUR PICKS</h2><p>${game.scoring === "confidence" ? "First pick all six winners. Then assign each confidence value from 1 to 6 once." : "Tip every match and enter the winning margin for the featured game."}</p></div><span>${Object.keys(entry.picks).length}/${game.fixtures.length} PICKS MADE</span></div>
      <div class="weekly-layout"><div class="weekly-fixture-list">${game.fixtures.map((fixture) => weeklyFixtureCard(game, fixture, entry)).join("")}</div>${weeklySummary(game, entry)}</div>
    </section>
    <div class="sticky-action"><div><small>${entry.editing ? "UNSUBMITTED CHANGES" : "ENTRY PROGRESS"}</small><strong>${!open ? "Selections closed" : complete ? "Ready to review" : "Complete every required pick"}</strong></div><button class="primary-button" data-route="/${game.id}/review" ${!complete || !open ? "disabled" : ""}>Review entry${icon("arrow")}</button></div>
  </main>${footer()}`;
}

function weeklyReviewScreen(game) {
  const entry = weeklyEntry(game.id);
  if (!weeklyEntryIsComplete(game, entry)) return weeklyGameScreen(game);
  return `${header()}<main id="app-main" class="review-page weekly-review-page">
    <section class="review-header"><button class="back-link" data-route="/${game.id}">← Edit selections</button><p class="eyebrow red">${game.eyebrow}</p><h1>${entry.editing ? "REVIEW YOUR CHANGES" : "REVIEW YOUR ENTRY"}</h1><p>Every pick can be revised until ${game.closes}.</p></section>
    <section class="weekly-review-grid"><div class="weekly-review-list">${game.fixtures.map((fixture) => {
      const code = entry.picks[fixture.id];
      const team = [fixture.home, fixture.away].find((candidate) => candidate.code === code);
      return `<article><span class="team-mark" style="--team-colour:${team.color}">${team.code}</span><div><small>${fixture.time} · ${fixture.venue}</small><strong>${team.name}</strong></div>${game.scoring === "confidence" ? `<em>${entry.confidence[fixture.id]} PTS</em>` : fixture.featured ? `<em>${entry.margin} PT MARGIN</em>` : icon("check")}</article>`;
    }).join("")}</div><aside class="submit-card"><p class="eyebrow red">ENTRY SUMMARY</p><h2>${game.fixtures.length} PICKS READY</h2><dl><div><dt>GAME</dt><dd>${game.title}</dd></div><div><dt>ROUND</dt><dd>${game.eyebrow.replace(`${game.sport} · `, "")}</dd></div><div><dt>DEADLINE</dt><dd>${game.closes}</dd></div></dl><div class="confirm-note">${icon("info")}<p>Submitting saves this entry. You can reopen it and make changes before selections close.</p></div><button class="primary-button full" data-action="submit-weekly" data-game="${game.id}">${entry.editing ? "Resubmit entry" : "Submit entry"}${icon("arrow")}</button></aside></section>
  </main>${footer()}`;
}

function weeklySuccessScreen(game) {
  const entry = weeklyEntry(game.id);
  const picks = entry.submittedPicks;
  return `${header()}<main id="app-main" class="success-page weekly-success-page"><section class="success-card"><span class="success-icon">${icon("check")}</span><p class="eyebrow red">ENTRY SUBMITTED</p><h1>${game.title}<br>IS LOCKED IN.</h1><p>Your ${game.sport} entry has been saved. You can revise it until ${game.closes}.</p><div class="weekly-success-picks">${game.fixtures.map((fixture) => {
    const code = picks[fixture.id]; const team = [fixture.home, fixture.away].find((candidate) => candidate.code === code);
    return `<span><b>${team?.code}</b>${game.scoring === "confidence" ? `${entry.submittedConfidence[fixture.id]} PTS` : fixture.featured ? `${entry.submittedMargin} MARGIN` : "PICKED"}</span>`;
  }).join("")}</div><div class="success-actions"><button class="primary-button" data-action="edit-weekly" data-game="${game.id}">Edit selections${icon("arrow")}</button><button class="ghost-button" data-route="/dashboard">Return to dashboard</button></div></section></main>${footer()}`;
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
  const weeklyMatch = route.match(/^\/(afl-round|nfl-pick6)(?:\/(review|submitted))?$/);
  const dashboardMatch = route.match(/^\/dashboard(?:\/(racing|afl|nrl|nfl|community))?$/);
  let html;
  if (weeklyMatch) {
    const game = weeklyGameById(weeklyMatch[1]);
    const phase = weeklyMatch[2];
    const entry = weeklyEntry(game.id);
    if (phase === "review") html = weeklyReviewScreen(game);
    else if (phase === "submitted" && entry.submitted) html = weeklySuccessScreen(game);
    else html = entry.submitted && !entry.editing ? weeklySuccessScreen(game) : weeklyGameScreen(game);
  }
  else if (dashboardMatch) {
    dashboardSport = dashboardMatch[1] || "all";
    html = dashboard();
  }
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
  if (action === "show-coming-soon") toast("This competition is shown for context — Racing, AFL and NFL prototypes are playable.");
  if (action === "sport-filter") {
    const sport = target.dataset.sport || "all";
    go(sport === "all" ? "/dashboard" : `/dashboard/${sport}`);
  }
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
  if (action === "pick-weekly") {
    const game = weeklyGameById(target.dataset.game);
    if (!game || !requireOpenEntry(game)) return;
    const fixture = game.fixtures.find((item) => item.id === target.dataset.fixture);
    if (!fixture || ![fixture.home.code, fixture.away.code].includes(target.dataset.team)) return;
    weeklyEntry(game.id).picks[fixture.id] = target.dataset.team;
    saveState(); render({ preserveScroll: true }); toast(`${target.dataset.team} selected`);
  }
  if (action === "clear-weekly") {
    const game = weeklyGameById(target.dataset.game);
    if (!game || !requireOpenEntry(game)) return;
    const entry = weeklyEntry(game.id);
    entry.picks = {}; entry.confidence = {}; entry.margin = "";
    saveState(); render({ preserveScroll: true });
  }
  if (action === "submit-weekly") {
    const game = weeklyGameById(target.dataset.game);
    const entry = game ? weeklyEntry(game.id) : null;
    if (!game || !entry || !requireOpenEntry(game) || !weeklyEntryIsComplete(game, entry)) return;
    entry.submitted = true;
    entry.submittedPicks = { ...entry.picks };
    entry.submittedConfidence = { ...entry.confidence };
    entry.submittedMargin = entry.margin;
    entry.editing = false;
    saveState(); go(`/${game.id}/submitted`); toast(`${game.title} submitted`);
  }
  if (action === "edit-weekly") {
    const game = weeklyGameById(target.dataset.game);
    if (!game || !requireOpenEntry(game)) return;
    const entry = weeklyEntry(game.id);
    entry.picks = { ...entry.submittedPicks };
    entry.confidence = { ...entry.submittedConfidence };
    entry.margin = entry.submittedMargin;
    entry.editing = true;
    saveState(); go(`/${game.id}`); toast(`${game.title} reopened for editing`);
  }
  if (action === "cancel-weekly-edit") {
    const game = weeklyGameById(target.dataset.game);
    if (!game) return;
    const entry = weeklyEntry(game.id);
    entry.picks = { ...entry.submittedPicks };
    entry.confidence = { ...entry.submittedConfidence };
    entry.margin = entry.submittedMargin;
    entry.editing = false;
    saveState(); go(`/${game.id}/submitted`); toast("Edits cancelled");
  }
  if (action === "reset-demo") {
    state = JSON.parse(JSON.stringify(defaultState)); saveState(); toggleMenu(false); go("/dashboard"); render(); toast("Prototype data reset");
  }
});

document.addEventListener("change", (event) => {
  const control = event.target.closest("[data-weekly-confidence]");
  if (!control) return;
  const game = weeklyGameById(control.dataset.game);
  if (!game || !requireOpenEntry(game)) return;
  const entry = weeklyEntry(game.id);
  if (control.value) entry.confidence[control.dataset.fixture] = Number(control.value);
  else delete entry.confidence[control.dataset.fixture];
  saveState(); render({ preserveScroll: true });
});

document.addEventListener("input", (event) => {
  const control = event.target.closest("[data-weekly-margin]");
  if (!control) return;
  const game = weeklyGameById(control.dataset.game);
  if (!game || !entryIsOpen(game)) return;
  const entry = weeklyEntry(game.id);
  entry.margin = control.value.replace(/\D/g, "").slice(0,2);
  const reviewButton = document.querySelector(`[data-route="/${game.id}/review"]`);
  if (reviewButton) reviewButton.disabled = !weeklyEntryIsComplete(game, entry);
  saveState();
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
