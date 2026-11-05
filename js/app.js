import { $, $$, h, svg, store, load, ago, DAYS, download, toast, modal, debounce, sgn } from "./core.js?v=BUILD";
import { LOGOS, ALKU_A } from "./assets.js?v=BUILD";
import { startBackground, hero3d } from "./fx.js?v=BUILD";
import { ico } from "./icons.js?v=BUILD";
import { wyTabs, quickAdd, parseTask } from "./views.js?v=BUILD";
import { liveWeather, liveSports, liveNews } from "./live.js?v=BUILD";
import { alTabs } from "./alku.js?v=BUILD";

const D = { weather: null, quotes: null, sports: null, news: null, fun: null, meta: null };
const ctx = { D, mode: null, tab: null, go, render, openPalette, settings };
let tabs = [];
const ACCENTS = [["blue", "#4f8cff"], ["teal", "#14b8a6"], ["violet", "#8b5cf6"], ["rose", "#f43f5e"], ["amber", "#f59e0b"], ["mono", "#e5e7eb"]];

/* ---------- boot + choose ---------- */
const logo = (k = "3a") => LOGOS[k]?.svg || "";
function chooseScreen() {
  const el = h("div", { id: "choose" },
    h("button", { class: "ch alku", onclick: () => enter("alku") }, h("img", { class: "lg", src: ALKU_A, alt: "ALKU" }), "ALKU", h("small", {}, "Work")),
    h("button", { class: "ch wy", onclick: () => enter("wyatt") }, h("div", { class: "lg", html: logo(store.get("logo", "3a")) }), "Wyatt", h("small", {}, "Personal HQ")));
  document.body.append(el); return el;
}
function enter(mode) {
  $("#choose")?.remove(); ctx.mode = mode;
  document.body.classList.toggle("mode-alku", mode === "alku"); document.body.classList.toggle("mode-wyatt", mode === "wyatt");
  applyTheme(); tabs = mode === "alku" ? alTabs : wyTabs;
  const saved = store.get("order:" + mode, null);
  if (saved) tabs = [tabs[0], ...saved.map((id) => tabs.find((t) => t.id === id)).filter(Boolean), ...tabs.slice(1).filter((t) => !saved.includes(t.id))];
  ctx.tab = tabs[0].id; shell(); render();
}
function applyTheme() {
  const b = document.body; [...b.classList].filter((c) => c.startsWith("th-")).forEach((c) => b.classList.remove(c));
  if (ctx.mode === "wyatt") {
    const a = store.get("accent", "blue"); if (a !== "blue") b.classList.add("th-" + a);
    const m = store.get("themeMode", store.get("light", false) ? "light" : "dark"), light = m === "light" || (m === "auto" && matchMedia("(prefers-color-scheme: light)").matches);
    b.classList.toggle("light", light);
  } else b.classList.remove("light");
  b.classList.toggle("compact", !!store.get("compact", false));
}
const cycleTheme = () => { const m = store.get("themeMode", "dark"); store.set("themeMode", m === "dark" ? "light" : m === "light" ? "auto" : "dark"); applyTheme(); toast("Theme: " + store.get("themeMode")); };

/* ---------- shell ---------- */
const META = {
  happy: ["home", "Overview", "Your day at a glance"], tasks: ["tasks", "Tasks", "Capture, plan and finish"], calendar: ["calendar", "Calendar", "Paydays, bills and events"], goals: ["goals", "Goals", "Targets and progress"], habits: ["habits", "Habits", "Streaks and consistency"], focus: ["focus", "Focus", "Deep-work timer"],
  money: ["money", "Money", "Net worth, budget, markets"], news: ["news", "News", "Balanced headlines across the spectrum"], sports: ["sports", "Sports", "Boston teams, live"], study: ["study", "Study", "Spaced-repetition flashcards"], notes: ["notes", "Notes", "Quick capture"],
};
const GROUPS = [["Overview", ["happy"]], ["Plan", ["tasks", "calendar", "goals", "habits", "focus"]], ["Money", ["money"]], ["Discover", ["news", "sports"]], ["Mind", ["study", "notes"]]];
function shell() {
  const app = $("#app"); app.innerHTML = ""; const alku = ctx.mode === "alku";
  const pill = h("div", { class: "pill", id: "pill", title: "Live data status" }, h("i", { class: "dot" }), h("span", {}, "loading…"));
  const brand = h("div", { class: "brand", title: "Switch screen", onclick: () => location.reload() },
    alku ? h("img", { class: "logo", src: ALKU_A, alt: "" }) : h("div", { class: "logo", html: logo(store.get("logo", "3a")) }),
    alku ? h("span", {}, "ALKU ", h("small", {}, "Work")) : h("span", {}, "Wyatt ", h("small", {}, "HQ")));
  if (alku) {
    app.append(h("header", { class: "top" }, brand, h("div", { class: "spacer" }), pill, h("button", { class: "iconbtn", title: "Command palette", onclick: openPalette }, "⌘"), h("button", { class: "iconbtn", title: "Settings", onclick: settings }, "⚙")), h("div", { id: "tape" }), h("nav", { class: "tabs", id: "tabs" }), h("main", { id: "view" }));
    drawTabs(); drawPill(); return;
  }
  document.body.classList.add("layout-on");
  const sw = h("div", { class: "swatches" }, ACCENTS.map(([k, c]) => h("button", { class: "sw" + (store.get("accent", "blue") === k ? " on" : ""), style: { background: c }, title: k, onclick: () => { store.set("accent", k); applyTheme(); shell(); render(); } })));
  const side = h("aside", { id: "side" }, brand,
    h("button", { class: "search-btn", onclick: openPalette }, h("span", { html: ico("search", 16) }), "Search or jump to…", h("kbd", {}, "⌘K")),
    h("nav", { id: "nav" }),
    h("div", { class: "side-foot" }, h("button", { class: "nav-i", onclick: () => quickAdd(render) }, h("span", { html: ico("plus") }), "Quick add task", h("kbd", {}, "N")), h("div", { class: "row", style: { justifyContent: "space-between", padding: "4px 6px" } }, sw, h("div", { class: "row", style: { gap: "4px" } }, h("button", { class: "iconbtn sm", title: "Theme: dark / light / auto", onclick: cycleTheme, html: ico("moon", 16) }), h("button", { class: "iconbtn sm", title: "Settings", onclick: settings, html: ico("settings", 16) })))));
  const main = h("div", { class: "main" }, h("header", { class: "topbar" }, h("div", { class: "mbrand", onclick: () => location.reload() }, h("div", { class: "logo", html: logo(store.get("logo", "3a")) })), h("div", { id: "crumb" }), h("div", { class: "spacer" }), pill,
    h("button", { class: "iconbtn", title: "Search", onclick: openPalette, html: ico("search", 17) }), h("button", { class: "iconbtn mob", title: "Settings", onclick: settings, html: ico("settings", 17) })), h("div", { id: "tape" }), h("main", { id: "view" }));
  app.append(h("div", { class: "layout" }, side, main), h("nav", { id: "bottom" }));
  drawTabs(); drawTape(); drawPill();
}
export function tabLabel(t) { return typeof t.label === "function" ? t.label() : t.label; }
const openTasks = () => store.get("tasks", []).filter((t) => t.status !== "done").length;
function drawTabs() {
  if (ctx.mode === "alku") {
    const nav = $("#tabs"); if (!nav) return; nav.innerHTML = ""; tabs.forEach((t, i) => nav.append(h("button", { class: "tab" + (t.id === ctx.tab ? " on" : "") + (i === 0 ? " pin" : ""), "data-id": t.id, onclick: () => go(t.id) }, tabLabel(t)))); return;
  }
  const nav = $("#nav"); if (!nav) return; nav.innerHTML = "";
  for (const [g, ids] of GROUPS) {
    const list = ids.map((id) => tabs.find((t) => t.id === id)).filter(Boolean).sort((a, b) => tabs.indexOf(a) - tabs.indexOf(b)); if (!list.length) continue;
    const box = h("div", { class: "nav-g" }, g === "Overview" ? null : h("div", { class: "nav-gl" }, g));
    list.forEach((t) => { const n = t.id === "tasks" ? openTasks() : 0; box.append(h("button", { class: "nav-i" + (t.id === ctx.tab ? " on" : ""), "data-id": t.id, onclick: (e) => { if (nav.dataset.dragged) return; go(t.id); } }, h("span", { html: ico(META[t.id]?.[0] || "more") }), h("span", { class: "nl" }, tabLabel(t)), n ? h("span", { class: "nbadge" }, n) : null)); });
    nav.append(box);
  }
  enableNavDrag(nav);
  const bar = $("#bottom"); if (bar) { bar.innerHTML = ""; ["happy", "tasks", "money", "news"].forEach((id) => { const t = tabs.find((x) => x.id === id); bar.append(h("button", { class: "bt" + (id === ctx.tab ? " on" : ""), onclick: () => go(id) }, h("span", { html: ico(META[id][0], 22) }), id === "happy" ? "Home" : META[id][1])); }); bar.append(h("button", { class: "bt" + (!["happy", "tasks", "money", "news"].includes(ctx.tab) ? " on" : ""), onclick: moreSheet }, h("span", { html: ico("more", 22) }), "More")); }
  const cr = $("#crumb"); if (cr) cr.textContent = ctx.tab === "happy" ? "" : META[ctx.tab]?.[1] || "";
}
function moreSheet() {
  const m = modal("All pages", h("div", { class: "sheet-grid" }, tabs.map((t) => h("button", { class: "sheet-i", onclick: () => { m.remove(); go(t.id); } }, h("span", { html: ico(META[t.id]?.[0] || "more", 24) }), tabLabel(t)))), [{ t: "Settings", ghost: true, fn: () => { settings(); } }, { t: "Close" }]);
}
function enableNavDrag(nav) {
  $$(".nav-i[data-id]", nav).forEach((el) => {
    if (el.dataset.id === "happy") return;
    el.addEventListener("pointerdown", (e) => {
      if (e.button) return; const sy = e.clientY; let moved = false; const group = $$(".nav-i[data-id]", el.parentElement), rects = group.map((k) => k.getBoundingClientRect()), idx = group.indexOf(el); if (group.length < 2) return;
      const mv = (ev) => {
        const dy = ev.clientY - sy; if (!moved && Math.abs(dy) < 8) return;
        if (!moved) { moved = true; el.classList.add("drag"); group.forEach((k) => k !== el && k.classList.add("shift")); }
        const lo = rects[0].top - rects[idx].top, hi = rects.at(-1).top - rects[idx].top, d = Math.max(lo, Math.min(hi, dy)); el.style.transform = `translateY(${d}px)`;
        const cy = rects[idx].top + rects[idx].height / 2 + d; let to = idx;
        for (let k = 0; k < rects.length; k++) { const mid = rects[k].top + rects[k].height / 2; if (k < idx && cy < mid) { to = k; break; } if (k > idx && cy > mid) to = k; }
        group.forEach((k, ki) => { if (k === el) return; let sh = 0; if (to < idx && ki >= to && ki < idx) sh = rects[idx].height; if (to > idx && ki > idx && ki <= to) sh = -rects[idx].height; k.style.transform = sh ? `translateY(${sh}px)` : ""; }); el._to = to;
      };
      const up = () => {
        removeEventListener("pointermove", mv); removeEventListener("pointerup", up);
        if (moved) { nav.dataset.dragged = "1"; setTimeout(() => delete nav.dataset.dragged, 80); const to = el._to ?? idx; if (to !== idx) { const from = tabs.findIndex((t) => t.id === el.dataset.id), tgt = tabs.findIndex((t) => t.id === group[to].dataset.id); const [m] = tabs.splice(from, 1); tabs.splice(tgt, 0, m); store.set("order:" + ctx.mode, tabs.slice(1).map((t) => t.id)); } drawTabs(); }
      };
      addEventListener("pointermove", mv); addEventListener("pointerup", up);
    });
  });
}
function go(id) { ctx.tab = id; drawTabs(); render(); scrollTo({ top: 0, behavior: "smooth" }); }
function render() {
  const v = $("#view"); if (!v) return; const t = tabs.find((x) => x.id === ctx.tab) || tabs[0];
  v.innerHTML = "";
  if (ctx.mode === "wyatt" && t.id !== "happy") { const m = META[t.id] || ["more", t.label, ""]; v.append(h("div", { class: "page-head" }, h("div", { class: "ph-ic", html: ico(m[0], 22) }), h("div", {}, h("h1", {}, m[1]), h("p", {}, m[2])))); }
  try { v.append(t.render(ctx)); } catch (e) { console.error(e); v.append(h("div", { class: "card" }, "This page hit an error: " + e.message)); }
  const lbl = $(".nav-i[data-id=happy] .nl, .tab.pin"); if (lbl) lbl.textContent = tabLabel(tabs[0]);
  const nb = $(".nav-i[data-id=tasks] .nbadge"); if (nb) nb.textContent = openTasks() || "";
}
function drawPill() {
  const p = $("#pill"); if (!p) return;
  const stamps = ["weather", "sports", "news", "quotes"].map((k) => D[k]?.updated).filter(Boolean);
  if (!stamps.length) { p.className = "pill off"; p.lastChild.textContent = "offline — showing last saved"; return; }
  const q = D.quotes?.updated, qAge = q ? (Date.now() - new Date(q)) / 60000 : 1e9, liveNow = D.weather?.live;
  p.className = "pill" + (qAge > 600 ? " stale" : "");
  p.lastChild.textContent = (liveNow ? "Live" : "Updated " + ago(D.weather?.updated)) + (qAge > 90 ? ` · markets ${ago(q)}` : "");
  p.title = "Weather & sports refresh live in your browser. Markets & news refresh via GitHub every ~15–30 min. Markets: " + ago(q) + ", news: " + ago(D.news?.updated);
}
function drawTape() {
  const t = $("#tape"); if (!t) return; t.innerHTML = ""; const q = D.quotes?.items; if (!q) return;
  const row = () => q.map((i) => h("span", {}, h("b", {}, i.sym), " ", h("span", { class: "mono" }, i.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })), " ", h("span", { class: "mono " + (i.pct >= 0 ? "gain" : "loss") }, (i.pct >= 0 ? "▲" : "▼") + Math.abs(i.pct).toFixed(2) + "%")));
  t.append(h("div", { class: "track" }, row(), row()));
}

/* ---------- data refresh ---------- */
let liveBusy = false, lastNews = 0;
const newer = (a, b) => !a || !a.updated || (b && new Date(b.updated) > new Date(a.updated));
async function liveRefresh() {
  if (liveBusy) return false; liveBusy = true; let ch = false;
  try {
    const [w, sp] = await Promise.allSettled([liveWeather(), liveSports(D.sports)]);
    if (w.status === "fulfilled") { D.weather = w.value; ch = true; } if (sp.status === "fulfilled") { D.sports = sp.value; ch = true; }
    const age = D.news ? (Date.now() - new Date(D.news.updated)) / 60000 : 1e9;
    if (age > 45 && Date.now() - lastNews > 15 * 60000) { lastNews = Date.now(); try { D.news = await liveNews(D.news); ch = true; } catch {} }
  } finally { liveBusy = false; }
  return ch;
}
const idle = () => ctx.mode && !document.activeElement?.matches?.("input,textarea,select") && !$(".modal") && !$("#pal.open");
async function refresh() {
  const names = Object.keys(D); const res = await Promise.all(names.map(load));
  names.forEach((n, i) => { if (res[i] && newer(D[n], res[i])) D[n] = res[i]; });
  drawPill(); drawTape(); if (idle()) render();
  liveRefresh().then((ch) => { drawPill(); drawTape(); if (ch && idle()) render(); });
  return !!res[0];
}

/* ---------- command palette ---------- */
function openPalette() {
  const pal = $("#pal"); pal.classList.add("open"); const inp = $("input", pal), ul = $("ul", pal); inp.value = ""; let sel = 0, items = [];
  const base = () => {
    const a = tabs.map((t) => ({ l: "Go to " + tabLabel(t), r: "tab", f: () => go(t.id) }));
    a.push({ l: "Cycle theme (dark / light / auto)", r: "action", f: cycleTheme }, { l: "Keyboard shortcuts", r: "help", f: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "?" })) });
    a.push({ l: "Switch screen (ALKU / Wyatt)", r: "action", f: () => location.reload() });
    if (ctx.mode === "wyatt") {
      a.push({ l: "Toggle light / dark", r: "action", f: () => { store.set("light", !store.get("light", false)); applyTheme(); } });
      ACCENTS.forEach(([k]) => a.push({ l: "Accent: " + k, r: "theme", f: () => { store.set("accent", k); applyTheme(); shell(); render(); } }));
      a.push({ l: "Add task…", r: "action", f: () => { go("tasks"); setTimeout(() => $("#newtask")?.focus(), 80); } });
      for (const t of store.get("tasks", []).filter((t) => !t.done)) a.push({ l: "Task: " + t.title, r: "task", f: () => go("tasks") });
    }
    const q = $("#pal input").value.trim();
    if (q && ctx.mode === "wyatt") { a.unshift({ l: "Add task: " + q, r: "quick add", f: () => { const all = store.get("tasks", []); all.unshift(parseTask(q)); store.set("tasks", all); toast("Task added"); render(); }, always: 1 }); for (const n of store.get("notes", []).filter((n) => n.t.toLowerCase().includes(q.toLowerCase())).slice(0, 4)) a.push({ l: "Note: " + n.t.slice(0, 60), r: "note", f: () => go("notes") }); }
    a.push({ l: "Settings & backup", r: "action", f: settings }, { l: "Export my data (JSON)", r: "action", f: exportData }, { l: "Refresh live data now", r: "action", f: async () => { await refresh(); toast("Refreshed"); } });
    return a;
  };
  const draw = () => {
    const q = inp.value.toLowerCase().trim(); items = base().filter((i) => i.always || i.l.toLowerCase().includes(q)).slice(0, 30); sel = Math.min(sel, items.length - 1); ul.innerHTML = "";
    items.forEach((it, i) => ul.append(h("li", { class: i === sel ? "sel" : "", onclick: () => run(it) }, h("span", {}, it.l), h("span", {}, it.r))));
  };
  const run = (it) => { close(); it.f(); };
  const close = () => { pal.classList.remove("open"); inp.oninput = inp.onkeydown = null; };
  inp.oninput = () => { sel = 0; draw(); };
  inp.onkeydown = (e) => { if (e.key === "Escape") close(); else if (e.key === "ArrowDown") { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); } else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); } else if (e.key === "Enter" && items[sel]) run(items[sel]); };
  pal.onclick = (e) => e.target === pal && close(); draw(); inp.focus();
}
const exportData = () => { download(`wyatt-hq-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(store.all(), null, 1)); toast("Backup downloaded"); };
function settings() {
  const f = h("input", { type: "file", accept: "application/json", style: { display: "none" }, onchange: async (e) => { try { const o = JSON.parse(await e.target.files[0].text()); store.load(o); toast("Imported — reloading"); setTimeout(() => location.reload(), 700); } catch { toast("That file isn't valid JSON"); } } });
  const logos = h("div", { class: "row" }, ["3a", "3b", "3c", "1a", "1b", "1c", "7a", "7b", "7c", "C1", "C2", "C3", "C4", "C5", "C6", "C7"].filter((k) => LOGOS[k]).map((k) => h("button", { class: "iconbtn", style: { width: "44px", height: "44px", padding: "4px", borderColor: store.get("logo", "3a") === k ? "var(--accent)" : "" }, title: LOGOS[k].name, html: LOGOS[k].svg, onclick: () => { store.set("logo", k); toast("Logo set"); } })));
  const age = h("input", { type: "number", value: store.get("age", 25), style: { width: "80px" }, onchange: (e) => store.set("age", +e.target.value) });
  const city = h("div", { class: "src" }, "Weather location: Stoneham, MA (set in scripts/update.mjs).");
  modal("Settings & backup", h("div", { style: { display: "grid", gap: "14px" } },
    h("div", {}, h("b", {}, "Your data"), h("p", { class: "src" }, "Tasks, goals, money, habits and notes are stored only in this browser — never in the public repo. Export a backup to move devices."),
      h("div", { class: "row" }, h("button", { class: "btn sm", onclick: exportData }, "Export backup"), h("button", { class: "btn sm ghost", onclick: () => f.click() }, "Import backup"), f)),
    h("div", {}, h("b", {}, "Wyatt logo"), logos),
    h("div", {}, h("b", {}, "Home cards"), h("div", { class: "row" }, ["Weather · Stoneham", "Today", "Markets", "Boston sports", "Headlines", "Net worth", "Level", "This week", "Next up", "Habits", "Upcoming", "Daily spark"].map((n) => h("label", { class: "chip", style: { cursor: "pointer" } }, h("input", { type: "checkbox", checked: !store.get("hide", []).includes(n), onchange: (e) => { const hd = store.get("hide", []).filter((x) => x !== n); if (!e.target.checked) hd.push(n); store.set("hide", hd); render(); } }), " " + n)))),
    h("div", { class: "row" }, h("b", {}, "Appearance"), h("select", { onchange: (e) => { store.set("themeMode", e.target.value); applyTheme(); } }, ["dark", "light", "auto"].map((m) => h("option", { value: m, selected: store.get("themeMode", "dark") === m }, m))), h("label", { class: "chip", style: { cursor: "pointer" } }, h("input", { type: "checkbox", checked: !!store.get("compact", false), onchange: (e) => { store.set("compact", e.target.checked); applyTheme(); } }), " Compact density")),
    h("div", { class: "row" }, h("b", {}, "My age"), age, h("span", { class: "src" }, "(used for the growth projector's Age axis)")), city,
    h("div", { class: "src" }, "Live data: weather, markets, sports, news and fun refresh automatically every 30 min. Last: " + (D.meta ? ago(D.meta.updated) : "n/a"))), [{ t: "Done" }]);
}

/* ---------- init ---------- */
addEventListener("keydown", (e) => {
  const typing = e.target.matches?.("input,textarea,select") || $(".modal") || $("#pal.open");
  if (ctx.mode && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (/^[1-9]$/.test(e.key) && tabs[+e.key - 1]) { go(tabs[+e.key - 1].id); e.preventDefault(); }
    else if (e.key === "/") { openPalette(); e.preventDefault(); }
    else if (e.key === "?") { modal("Keyboard shortcuts", h("div", { class: "src", style: { display: "grid", gap: "8px", fontSize: "14px" } }, [["⌘/Ctrl K or /", "Search & commands"], ["N", "Quick add a task"], ["1–9", "Jump to a page"], ["?", "This help"], ["Esc", "Close dialogs"]].map(([k, d]) => h("div", { class: "row", style: { justifyContent: "space-between" } }, h("kbd", {}, k), d))), [{ t: "Close" }]); }
    else if (e.key.toLowerCase() === "n" && ctx.mode === "wyatt") { quickAdd(render); e.preventDefault(); }
  } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ctx.mode && openPalette(); } });
document.addEventListener("visibilitychange", () => !document.hidden && ctx.mode && refresh());
setInterval(() => ctx.mode && refresh(), 2 * 60000); addEventListener("focus", () => ctx.mode && refresh()); addEventListener("pageshow", () => ctx.mode && refresh()); addEventListener("online", () => ctx.mode && refresh()); setInterval(drawPill, 30000);
startBackground($("#bg"));
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js?v=BUILD", { updateViaCache: "none" }).catch(() => {}); let hadCtl = !!navigator.serviceWorker.controller; navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadCtl && !ctx.mode) location.reload(); hadCtl = true; });
refresh();
setTimeout(() => { $("#boot")?.classList.add("out"); chooseScreen(); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 60 : 650);
export { D, ctx, hero3d };
