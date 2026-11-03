import { $, $$, h, svg, store, load, ago, DAYS, download, toast, modal, debounce, sgn } from "./core.js";
import { LOGOS, ALKU_A } from "./assets.js";
import { startBackground, hero3d, tilt } from "./fx.js";
import { wyTabs, quickAdd, parseTask } from "./views.js";
import { alTabs } from "./alku.js";

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
  if (ctx.mode === "wyatt") { const a = store.get("accent", "blue"); if (a !== "blue") b.classList.add("th-" + a); b.classList.toggle("light", store.get("light", false)); } else b.classList.remove("light");
}

/* ---------- shell ---------- */
function shell() {
  const app = $("#app"); app.innerHTML = "";
  const alku = ctx.mode === "alku";
  const brand = h("div", { class: "brand", title: "Switch screen", onclick: () => location.reload() },
    alku ? h("img", { class: "logo", src: ALKU_A, alt: "" }) : h("div", { class: "logo", html: logo(store.get("logo", "3a")) }),
    alku ? h("span", {}, "ALKU ", h("small", {}, "Work")) : h("span", {}, "Wyatt ", h("small", {}, "HQ")));
  const pill = h("div", { class: "pill", id: "pill", title: "Live data refreshes every 30 minutes via GitHub Actions" }, h("i", { class: "dot" }), h("span", {}, "loading…"));
  const sw = alku ? null : h("div", { class: "swatches" }, ACCENTS.map(([k, c]) => h("button", { class: "sw" + (store.get("accent", "blue") === k ? " on" : ""), style: { background: c }, title: k, onclick: () => { store.set("accent", k); applyTheme(); shell(); render(); } })));
  app.append(h("header", { class: "top" }, brand, h("div", { class: "spacer" }), pill, sw,
    h("button", { class: "iconbtn", title: "Command palette (Ctrl/⌘ K)", onclick: openPalette }, "⌘"),
    alku ? null : h("button", { class: "iconbtn", title: "Light / dark", onclick: () => { store.set("light", !store.get("light", false)); applyTheme(); } }, "◐"),
    h("button", { class: "iconbtn", title: "Settings, backup, import", onclick: settings }, "⚙")));
  app.append(h("div", { id: "tape" }), h("nav", { class: "tabs", id: "tabs" }), h("main", { id: "view" }));
  drawTabs(); drawTape(); drawPill();
}
export function tabLabel(t) { return typeof t.label === "function" ? t.label() : t.label; }
function drawTabs() {
  const nav = $("#tabs"); if (!nav) return; nav.innerHTML = "";
  tabs.forEach((t, i) => nav.append(h("button", { class: "tab" + (t.id === ctx.tab ? " on" : "") + (i === 0 ? " pin" : ""), "data-id": t.id, onclick: () => i === 0 || !nav.dataset.dragged ? go(t.id) : 0 }, tabLabel(t))));
  enableDrag(nav);
}
function enableDrag(nav) {
  $$(".tab", nav).forEach((el, idx) => {
    if (idx === 0) return;
    el.addEventListener("pointerdown", (e) => {
      if (e.button) return; const sx = e.clientX; let moved = false; const kids = $$(".tab", nav), startRects = kids.map((k) => k.getBoundingClientRect());
      const mv = (ev) => {
        const dx = ev.clientX - sx; if (!moved && Math.abs(dx) < 7) return;
        if (!moved) { moved = true; el.classList.add("drag"); kids.forEach((k) => k !== el && k.classList.add("shift")); try { el.setPointerCapture(e.pointerId); } catch {} }
        const minDx = startRects[1].left - startRects[idx].left; el.style.transform = `translateX(${Math.max(dx, minDx)}px)`;
        const cx = startRects[idx].left + startRects[idx].width / 2 + Math.max(dx, minDx); let to = idx;
        for (let k = 1; k < kids.length; k++) { const mid = startRects[k].left + startRects[k].width / 2; if (k < idx && cx < mid) { to = k; break; } if (k > idx && cx > mid) to = k; }
        kids.forEach((k, ki) => { if (k === el) return; let sh = 0; if (to < idx && ki >= to && ki < idx) sh = startRects[idx].width + 6; if (to > idx && ki > idx && ki <= to) sh = -(startRects[idx].width + 6); k.style.transform = sh ? `translateX(${sh}px)` : ""; });
        el._to = to;
      };
      const up = () => {
        removeEventListener("pointermove", mv); removeEventListener("pointerup", up);
        if (moved) { nav.dataset.dragged = "1"; setTimeout(() => delete nav.dataset.dragged, 60); const to = el._to ?? idx; if (to !== idx) { const [m] = tabs.splice(idx, 1); tabs.splice(to, 0, m); store.set("order:" + ctx.mode, tabs.slice(1).map((t) => t.id)); } drawTabs(); }
      };
      addEventListener("pointermove", mv); addEventListener("pointerup", up);
    });
  });
}
function go(id) { ctx.tab = id; drawTabs(); render(); scrollTo({ top: 0, behavior: "smooth" }); }
function render() {
  const v = $("#view"); if (!v) return; const t = tabs.find((x) => x.id === ctx.tab) || tabs[0];
  v.innerHTML = ""; try { v.append(t.render(ctx)); } catch (e) { console.error(e); v.append(h("div", { class: "card" }, "This tab hit an error: " + e.message)); }
  const lbl = $(".tab.pin"); if (lbl) lbl.textContent = tabLabel(tabs[0]);
}
function drawPill() {
  const p = $("#pill"); if (!p) return; const m = D.meta; const age = m ? (Date.now() - new Date(m.updated)) / 60000 : 1e9;
  const bad = m && Object.values(m.modules || {}).some((x) => !x.ok);
  p.className = "pill" + (!m ? " off" : age > 100 ? " stale" : bad ? " stale" : "");
  p.lastChild.textContent = !m ? "offline — showing last saved" : `updated ${ago(m.updated)}` + (age > 100 ? " · refresh delayed" : bad ? " · partial" : "");
}
function drawTape() {
  const t = $("#tape"); if (!t) return; t.innerHTML = ""; const q = D.quotes?.items; if (!q) return;
  const row = () => q.map((i) => h("span", {}, h("b", {}, i.sym), " ", h("span", { class: "mono" }, i.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })), " ", h("span", { class: "mono " + (i.pct >= 0 ? "gain" : "loss") }, (i.pct >= 0 ? "▲" : "▼") + Math.abs(i.pct).toFixed(2) + "%")));
  t.append(h("div", { class: "track" }, row(), row()));
}

/* ---------- data refresh ---------- */
async function refresh() {
  const names = Object.keys(D); const res = await Promise.all(names.map(load));
  names.forEach((n, i) => { if (res[i]) D[n] = res[i]; });
  drawPill(); drawTape();
  if (ctx.mode && !document.activeElement?.matches?.("input,textarea,select") && !$(".modal") && !$("#pal.open")) render();
  return !!res[0];
}

/* ---------- command palette ---------- */
function openPalette() {
  const pal = $("#pal"); pal.classList.add("open"); const inp = $("input", pal), ul = $("ul", pal); inp.value = ""; let sel = 0, items = [];
  const base = () => {
    const a = tabs.map((t) => ({ l: "Go to " + tabLabel(t), r: "tab", f: () => go(t.id) }));
    a.push({ l: "Switch screen (ALKU / Wyatt)", r: "action", f: () => location.reload() });
    if (ctx.mode === "wyatt") {
      a.push({ l: "Toggle light / dark", r: "action", f: () => { store.set("light", !store.get("light", false)); applyTheme(); } });
      ACCENTS.forEach(([k]) => a.push({ l: "Accent: " + k, r: "theme", f: () => { store.set("accent", k); applyTheme(); shell(); render(); } }));
      a.push({ l: "Add task…", r: "action", f: () => { go("tasks"); setTimeout(() => $("#newtask")?.focus(), 80); } });
      for (const t of store.get("tasks", []).filter((t) => !t.done)) a.push({ l: "Task: " + t.title, r: "task", f: () => go("tasks") });
    }
    const q = $("#pal input").value.trim();
    if (q && ctx.mode === "wyatt") { a.unshift({ l: "Add task: " + q, r: "quick add", f: () => { const all = store.get("tasks", []); all.unshift(parseTask(q)); store.set("tasks", all); toast("Task added"); render(); }, always: 1 }); for (const n of store.get("notes", []).filter((n) => n.t.toLowerCase().includes(q.toLowerCase())).slice(0, 4)) a.push({ l: "Note: " + n.t.slice(0, 60), r: "note", f: () => go("notes") }); }
    for (const x of (store.get("phone", { apps: [], dock: [] }).apps.flatMap((a) => a.folder || [a]).concat(store.get("phone", { dock: [] }).dock)).filter((x) => x.u)) a.push({ l: "Open " + x.n, r: "link", f: () => window.open(x.u, "_blank", "noopener") });
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
    h("div", { class: "row" }, h("b", {}, "My age"), age, h("span", { class: "src" }, "(used for the growth projector's Age axis)")), city,
    h("div", { class: "src" }, "Live data: weather, markets, sports, news and fun refresh automatically every 30 min. Last: " + (D.meta ? ago(D.meta.updated) : "n/a"))), [{ t: "Done" }]);
}

/* ---------- init ---------- */
addEventListener("keydown", (e) => {
  const typing = e.target.matches?.("input,textarea,select") || $(".modal") || $("#pal.open");
  if (ctx.mode && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (/^[1-9]$/.test(e.key) && tabs[+e.key - 1]) { go(tabs[+e.key - 1].id); e.preventDefault(); }
    else if (e.key === "/") { openPalette(); e.preventDefault(); }
    else if (e.key.toLowerCase() === "n" && ctx.mode === "wyatt") { quickAdd(render); e.preventDefault(); }
  } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ctx.mode && openPalette(); } });
document.addEventListener("visibilitychange", () => !document.hidden && ctx.mode && refresh());
setInterval(() => ctx.mode && refresh(), 5 * 60000); setInterval(drawPill, 30000);
startBackground($("#bg")); tilt(document.body);
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});
refresh();
setTimeout(() => { $("#boot")?.classList.add("out"); chooseScreen(); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 1500);
export { D, ctx, hero3d };
