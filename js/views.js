import { h, store, uid, ymd, parse, addDays, DAYS, MONTHS, ago, money, sgn, clock, dayShort, spark, lineChart, barChart, ring, donut, heat, card, toast, modal, weekStart } from "./core.js";
import { JOKES, FACTS } from "./assets.js";
import { hero3d, confetti, chime } from "./fx.js";

const WX = (c) => (c === 0 ? "☀️" : c <= 2 ? "🌤️" : c === 3 ? "☁️" : c <= 48 ? "🌫️" : c <= 57 ? "🌦️" : c <= 67 ? "🌧️" : c <= 77 ? "🌨️" : c <= 82 ? "🌦️" : c <= 86 ? "🌨️" : "⛈️");
const today = () => ymd();
const lvl = (x) => Math.floor(Math.sqrt(x / 40)) + 1;
export function addXP(n) { const o = store.get("xp", 0), x = o + n; store.set("xp", x); if (lvl(x) > lvl(o)) { toast("Level up! 🎉 Level " + lvl(x)); confetti(140); } }
function finish(t, all) { t.status = "done"; t.doneAt = today(); addXP(10); confetti(); if (t.rep && t.due) { const d = parse(t.due), n = t.rep === "daily" ? addDays(d, 1) : t.rep === "weekly" ? addDays(d, 7) : new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()); all.unshift({ ...t, id: uid(), status: "todo", doneAt: "", due: ymd(n) }); } }
const NAMEDAY = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
export function parseTask(txt) {
  const t = { id: uid(), pri: "med", due: "", list: "Personal", status: "todo", rep: "" }; let s = " " + txt + " ";
  s = s.replace(/ !(high|med|low) /i, (_, p) => { t.pri = p.toLowerCase(); return " "; });
  s = s.replace(/ @(\w+) /, (_, l) => { const m = ["Personal", "Money", "Health", "School", "Home", "Ideas"].find((x) => x.toLowerCase() === l.toLowerCase()); if (m) t.list = m; return " "; });
  s = s.replace(/ every (day|week|month) /i, (_, r) => { t.rep = { day: "daily", week: "weekly", month: "monthly" }[r.toLowerCase()]; return " "; });
  const now = new Date();
  s = s.replace(/ (today|tomorrow|tmrw) /i, (_, w) => { t.due = ymd(addDays(now, /^t[o]?m|tomorrow/i.test(w) && w.toLowerCase() !== "today" ? 1 : 0)); return " "; });
  s = s.replace(/ (?:on |by )?(sun|mon|tue|wed|thu|fri|sat)[a-z]* /i, (_, d) => { let n = (NAMEDAY[d.toLowerCase()] - now.getDay() + 7) % 7 || 7; t.due = ymd(addDays(now, n)); return " "; });
  s = s.replace(/ (\d{1,2})\/(\d{1,2}) /, (_, m, d) => { t.due = `${now.getFullYear()}-${pad2(m)}-${pad2(d)}`; return " "; });
  if (t.rep && !t.due) t.due = today();
  t.title = s.replace(/\s+/g, " ").trim() || txt; return t;
}
const pad2 = (n) => String(n).padStart(2, "0");
export function quickAdd(render) {
  const i = h("input", { type: "text", class: "grow", style: { width: "100%" }, placeholder: "call Bob fri !high @money every week" });
  const m = modal("Quick add task", h("div", {}, i, h("div", { class: "src", style: { marginTop: "8px" } }, "Understands: today/tomorrow/fri/11/20 · !high !low · @money @home · every day/week/month")), [{ t: "Add", fn: () => add() }]);
  const add = () => { if (!i.value.trim()) return false; const all = store.get("tasks", []); all.unshift(parseTask(i.value)); store.set("tasks", all); toast("Task added"); render(); };
  i.addEventListener("keydown", (e) => { if (e.key === "Enter") { if (add() !== false) m.remove(); } }); setTimeout(() => i.focus(), 30);
}
export { lvl };
const greeting = () => { const hr = new Date().getHours(); return hr < 5 ? "Burning the midnight oil" : hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening"; };
const empty = (t) => h("div", { class: "empty" }, t);
const done = (cb, on) => h("input", { type: "checkbox", class: "check", checked: on, onchange: (e) => cb(e.target.checked) });
const mount = (x) => { const d = h("div"); d.append(x); return d; };

/* ===================== HAPPY (home) ===================== */
function happy(ctx) {
  const { D, go, render } = ctx;
  const now = new Date(), tasks = store.get("tasks", []), open = tasks.filter((t) => t.status !== "done");
  const top1 = [...open].sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.pri] - { high: 0, med: 1, low: 2 }[b.pri]) || (a.due || "9").localeCompare(b.due || "9"))[0];
  const dueSoon = open.filter((t) => t.due && t.due <= today()).length;
  const cv = h("canvas", { class: "hero3d" }); setTimeout(() => cv.isConnected && hero3d(cv), 0);
  const dstr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const w = D.weather;
  const hello = h("div", { class: "hello" }, cv, h("div", { class: "sub" }, dstr), h("h1", {}, "Happy " + DAYS[now.getDay()]),
    h("div", { class: "row" }, h("span", { class: "chip" }, greeting() + ", Wyatt"), w ? h("span", { class: "chip" }, `${WX(w.current.code)} ${w.current.temp}° ${w.current.desc}`) : null, w && w.hourly.slice(0, 12).some((x) => x.rain >= 50) ? h("span", { class: "chip warn" }, "☂️ Rain likely today") : null, top1 ? h("span", { class: "chip" }, "Focus: " + top1.title.slice(0, 40)) : null,
      open.length ? h("span", { class: "chip " + (dueSoon ? "warn" : "") }, `${open.length} open task${open.length > 1 ? "s" : ""}${dueSoon ? ` · ${dueSoon} due` : ""}`) : h("span", { class: "chip ok" }, "inbox zero ✓")));
  const g = h("div", { class: "grid" });
  // weather
  g.append(weatherCard(w, "w2"));
  // tasks
  const tc = card("Today", "✓", open.length ? h("ul", { class: "list" }, open.sort((a, b) => (a.due || "9") < (b.due || "9") ? -1 : 1).slice(0, 6).map((t) => h("li", {}, h("label", { class: "row", style: { flex: 1, cursor: "pointer" } }, done((v) => { v ? finish(t, tasks) : (t.status = "todo"); store.set("tasks", tasks); render(); }, false), h("span", {}, t.title)), t.due ? h("span", { class: "chip " + (t.due < today() ? "bad" : "") }, t.due.slice(5)) : null))) : empty("Nothing open. Enjoy it."),
    h("div", { class: "row", style: { marginTop: "10px" } }, h("button", { class: "btn sm ghost", onclick: () => go("tasks") }, "All tasks →")));
  g.append(tc);
  // markets
  const q = D.quotes?.items;
  g.append(card("Markets", "📈", q ? h("ul", { class: "list" }, q.slice(0, 6).map((i) => h("li", {}, h("div", {}, h("b", {}, i.sym), h("div", { class: "src" }, i.name)), spark(i.closes.slice(-30), { w: 80, h: 26 }), h("div", { style: { textAlign: "right" } }, h("div", { class: "mono" }, i.price.toLocaleString(undefined, { maximumFractionDigits: 2 })), h("div", { class: "mono " + (i.pct >= 0 ? "gain" : "loss") }, sgn(i.pct) + "%"))))) : empty("Waiting for market data…"), h("button", { class: "btn sm ghost", onclick: () => go("money") }, "Money →")));
  // sports
  const sp = D.sports?.leagues;
  g.append(card("Boston sports", "🏟️", sp ? h("ul", { class: "list" }, Object.values(sp).map((l) => { const nx = l.live || l.next?.[0] || l.slate?.[0]; return h("li", {}, h("div", {}, h("b", {}, `${l.emoji} ${l.teamName}`), h("div", { class: "src" }, l.record || "")), nx ? gameMini(nx) : h("span", { class: "src" }, "offseason")); })) : empty("Loading scores…"), h("button", { class: "btn sm ghost", onclick: () => go("sports") }, "Sports →")));
  // news
  const nw = D.news?.sections;
  const top = nw ? [...(nw.trending || []).slice(0, 3), ...(nw.business || []).slice(0, 2)] : [];
  g.append(card("Headlines", "📰", top.length ? h("ul", { class: "list news" }, top.map(newsLi)) : empty("Loading headlines…"), h("button", { class: "btn sm ghost", onclick: () => go("news") }, "News →")));
  // net worth
  const ac = store.get("accts", []), nw0 = ac.reduce((a, x) => a + (x.debt ? -x.bal : x.bal), 0), hist = store.get("nw", []);
  g.append(card("Net worth", "💰", ac.length ? h("div", {}, h("div", { class: "big mono" }, money(nw0)), hist.length > 1 ? lineChart(hist.slice(-20).map((x) => ({ x: x.d, y: x.total })), { h: 110, xlabel: (p) => p.x.slice(5), yfmt: (v) => "$" + Math.round(v / 100) / 10 + "k", ticks: 4 }) : h("div", { class: "src" }, "Save snapshots weekly to see the trend.")) : empty("Add accounts in Money to track net worth."), h("button", { class: "btn sm ghost", onclick: () => go("money") }, "Money →")));
  g.append(levelCard(), reviewCard(D), nextUpCard());
  g.append(habitsToday(render));
  // upcoming
  g.append(upcomingCard(go));
  // fun
  const f = D.fun, day = Math.floor(Date.now() / 864e5);
  g.append(card("Daily spark", "✨", h("p", { class: "q" }, "“" + (f?.quote?.text || "Make it count.") + "”"), f?.quote?.author ? h("div", { class: "src" }, "— " + f.quote.author) : null, h("hr", { style: { border: 0, borderTop: "1px solid var(--line)", margin: "12px 0" } }),
    h("div", {}, h("b", {}, "Joke  "), f?.joke || JOKES[day % JOKES.length]), h("div", { style: { marginTop: "10px" } }, h("b", {}, "Fact  "), f?.fact || FACTS[day % FACTS.length])));
  const hide = store.get("hide", []); [...g.children].forEach((c) => hide.includes(c.dataset.t) && c.remove());
  const R = (id) => (c) => wyTabs.find((t) => t.id === id).render(c);
  const FEED = [["tasks", "Tasks", "✅"], ["news", "News", "📰"], ["sports", "Sports", "🏟️"], ["money", "Money", "💰"], ["calendar", "Calendar", "📅"], ["goals", "Goals", "🎯"], ["habits", "Habits", "🔥"], ["notes", "Notes", "📝"]].map(([id, l, ic]) => [id, l, ic, R(id)]);
  const jump = h("div", { class: "jump" }, FEED.map(([id, l, ic]) => h("button", { class: "chipbtn", onclick: () => document.getElementById("sec-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" }) }, ic + " " + l)), h("button", { class: "chipbtn", onclick: () => scrollTo({ top: 0, behavior: "smooth" }) }, "↑ Top"));
  const wrap = h("div"); wrap.append(hello, jump, g);
  FEED.forEach(([id, l, ic, f]) => { let body; try { body = f({ ...ctx, compact: true }); } catch (e) { body = h("div", { class: "card" }, "Error: " + e.message); } wrap.append(h("section", { class: "feed-sec", id: "sec-" + id }, h("div", { class: "feed-h" }, h("span", { class: "feed-ic" }, ic), h("h2", {}, l), h("button", { class: "chipbtn", onclick: () => go(id) }, "Open ›")), body)); });
  wrap.append(h("div", { class: "end" }, "That's everything ✦ ", h("button", { class: "chipbtn", onclick: () => scrollTo({ top: 0, behavior: "smooth" }) }, "Back to top")));
  return wrap;
}
function levelCard() {
  const x = store.get("xp", 0), l = lvl(x), lo = 40 * (l - 1) ** 2, hi = 40 * l ** 2;
  return card("Level", "⚡", h("div", { class: "row", style: { gap: "16px" } }, ring((x - lo) / (hi - lo), { size: 92, label: "L" + l }), h("div", {}, h("div", { class: "big mono", style: { fontSize: "28px" } }, x + " XP"), h("div", { class: "src" }, `${hi - x} XP to level ${l + 1}`), h("div", { class: "src" }, "+10 task · +5 habit · +20 focus"))));
}
function reviewCard(D) {
  const ws = ymd(weekStart()), tk = store.get("tasks", []).filter((t) => t.doneAt >= ws).length, log = store.get("hlog", {}), hb = store.get("habits", []), fo = store.get("focus", {});
  let hd = 0, ht = 0, fc = 0; for (let i = 0; i < 7; i++) { const d = ymd(addDays(weekStart(), i)); if (d > today()) break; ht += hb.length; hd += hb.filter((x) => log[d]?.[x.id]).length; fc += fo[d] || 0; }
  return card("This week", "🗒️", h("div", { class: "ring-wrap" }, ring(ht ? hd / ht : 0, { size: 84, label: ht ? Math.round((hd / ht) * 100) + "%" : "—", sub: "habits" }), h("div", { class: "ringl" }, h("b", {}, tk), "tasks done"), h("div", { class: "ringl" }, h("b", {}, fc), "focus blocks")));
}
function nextUpCard() {
  const t = today(), ev = allEvents().filter((e) => e.date >= t && e.kind !== "task").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const n = (d) => Math.round((parse(d) - parse(t)) / 864e5);
  return card("Next up", "⏳", ev.length ? h("ul", { class: "list" }, ev.map((e) => h("li", {}, h("span", {}, e.title), h("span", { class: "chip " + (n(e.date) <= 2 ? "warn" : "") }, n(e.date) === 0 ? "today" : n(e.date) === 1 ? "tomorrow" : "in " + n(e.date) + "d")))) : empty("Nothing coming up."));
}
function gameMini(e) {
  const t = e.teams || [], a = t.find((x) => !x.home), hm = t.find((x) => x.home);
  return h("div", { style: { textAlign: "right", fontSize: "13px" } }, h("div", {}, e.state === "in" ? h("span", { class: "live" }, "● LIVE ") : null, `${a?.abbr || ""} @ ${hm?.abbr || ""}`), h("div", { class: "src mono" }, e.state === "pre" ? e.detail : e.state === "in" ? `${a?.score}-${hm?.score} ${e.detail}` : `${e.detail} ${a?.score}-${hm?.score}`));
}
function weatherCard(w, cls) {
  const c = card("Weather · Stoneham", "🌡️", w ? wxScene(w.current.code, w.current.isDay) : null, w ? h("div", { style: { position: "relative" } },
    h("div", { class: "row", style: { gap: "18px", marginBottom: "8px" } }, h("div", { style: { fontSize: "54px" } }, WX(w.current.code)), h("div", {}, h("div", { class: "big" }, w.current.temp + "°"), h("div", { class: "src" }, `${w.current.desc} · feels ${w.current.feels}° · ${w.current.wind} mph · ${w.current.humidity}% humidity`))),
    lineChart(w.hourly.map((x) => ({ x: x.t, y: x.temp })), { h: 150, xlabel: (p) => new Date(p.x).toLocaleTimeString("en-US", { hour: "numeric" }).replace(" ", "").toLowerCase(), yfmt: (v) => Math.round(v) + "°", bars: w.hourly.map((x) => x.rain), ticks: 6 }),
    h("div", { class: "src" }, "Line = temperature, bars = chance of rain"),
    h("div", { class: "row", style: { marginTop: "10px", gap: "8px", justifyContent: "space-between", flexWrap: "nowrap", overflow: "auto" } }, w.daily.map((d) => h("div", { style: { textAlign: "center", minWidth: "58px", fontSize: "12px" } }, h("div", { class: "muted" }, new Date(d.d + "T12:00").toLocaleDateString("en-US", { weekday: "short" })), h("div", { style: { fontSize: "22px" } }, WX(d.code)), h("div", { class: "mono" }, d.hi + "°"), h("div", { class: "mono muted" }, d.lo + "°"), d.rain > 20 ? h("div", { class: "src" }, d.rain + "%") : null)))) : empty("Weather loading…"));
  if (cls) c.classList.add(cls); return c;
}
function wxScene(code, day) {
  const rain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95, snow = (code >= 71 && code <= 77) || code === 85 || code === 86, cloud = code >= 2;
  const drops = rain || snow ? Array.from({ length: 22 }, (_, i) => `<i style="left:${(i * 4.7) % 100}%;animation-delay:${(i * 0.13) % 1.6}s;animation-duration:${(snow ? 3 : 0.9) + (i % 3) * 0.3}s"></i>`).join("") : "";
  return h("div", { class: "scene " + (day ? "day" : "night") + (rain ? " rain" : "") + (snow ? " snow" : ""), html: (day ? '<div class="sun"></div>' : '<div class="moon"></div>') + (cloud ? '<div class="cl c1"></div><div class="cl c2"></div>' : "") + '<div class="drops">' + drops + "</div>" });
}
const newsLi = (n) => h("li", {}, h("a", { class: "t", href: n.url, target: "_blank", rel: "noopener" }, n.t), h("div", { class: "meta" }, n.lean ? h("span", { class: "chip " + n.lean }, { L: "Left", C: "Center", R: "Right" }[n.lean]) : null, n.src, n.ts ? " · " + ago(new Date(n.ts).toISOString()) : ""));

function habitsToday(render) {
  const hb = store.get("habits", []), log = store.get("hlog", {}), t = today();
  return card("Habits", "🔥", hb.length ? h("ul", { class: "list" }, hb.map((x) => h("li", {}, h("label", { class: "row", style: { cursor: "pointer", flex: 1 } }, done((v) => { (log[t] ||= {})[x.id] = v; v && addXP(5); store.set("hlog", log); render(); }, !!log[t]?.[x.id]), x.name), h("span", { class: "chip" }, "🔥 " + streak(x.id, log))))) : empty("Add habits in the Habits tab."));
}
function streak(id, log) { let n = 0, d = new Date(); if (!log[ymd(d)]?.[id]) d = addDays(d, -1); while (log[ymd(d)]?.[id]) { n++; d = addDays(d, -1); } return n; }
function allEvents() {
  const ev = store.get("events", []).map((e) => ({ ...e })), out = [], now = new Date(), end = addDays(now, 120);
  for (const e of ev) { if (!e.rep) { out.push(e); continue; } let d = parse(e.date); let i = 0; while (d <= end && i++ < 400) { if (d >= addDays(now, -40)) out.push({ ...e, date: ymd(d) }); d = e.rep === "weekly" ? addDays(d, 7) : e.rep === "biweekly" ? addDays(d, 14) : new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()); } }
  const b = store.get("budget", { bills: [] }).bills || [];
  for (let m = -1; m < 5; m++) { const base = new Date(now.getFullYear(), now.getMonth() + m, 1); for (const x of b) { const dd = new Date(base.getFullYear(), base.getMonth(), Math.min(x.day || 1, 28)); out.push({ id: x.id + ymd(dd), title: `${x.name} ${money(x.amt)}`, date: ymd(dd), kind: "bill" }); } }
  for (const t of store.get("tasks", [])) if (t.due && t.status !== "done") out.push({ id: "t" + t.id, title: t.title, date: t.due, kind: "task" });
  return out;
}
function upcomingCard(go) {
  const t = today(), ev = allEvents().filter((e) => e.date >= t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7);
  return card("Upcoming", "📅", ev.length ? h("ul", { class: "list" }, ev.map((e) => h("li", {}, h("span", {}, e.title), h("span", { class: "chip " + (e.kind === "bill" ? "warn" : e.kind === "pay" ? "ok" : "") }, dayShort(e.date + "T12:00"))))) : empty("No upcoming events. Add dates in Calendar."), h("button", { class: "btn sm ghost", onclick: () => go("calendar") }, "Calendar →"));
}

/* ===================== TASKS ===================== */
let tview = store.get("tview", "list"), tlist = "All";
function tasks({ render }) {
  const all = store.get("tasks", []), save = () => { store.set("tasks", all); render(); };
  const lists = ["Personal", "Money", "Health", "School", "Home", "Ideas"];
  const title = h("input", { type: "text", class: "grow", id: "newtask", placeholder: "New task — press Enter" }), pri = h("select", {}, ["med", "high", "low"].map((p) => h("option", { value: p }, p))), due = h("input", { type: "date" }), lst = h("select", {}, lists.map((l) => h("option", {}, l))), rp = h("select", {}, [["", "No repeat"], ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]].map(([v, l]) => h("option", { value: v }, l)));
  const add = () => { if (!title.value.trim()) return; all.unshift({ id: uid(), title: title.value.trim(), pri: pri.value, due: due.value || (rp.value ? today() : ""), list: lst.value, status: "todo", rep: rp.value }); save(); setTimeout(() => document.getElementById("newtask")?.focus(), 30); };
  title.addEventListener("keydown", (e) => e.key === "Enter" && add());
  const vis = all.filter((t) => tlist === "All" || t.list === tlist);
  const row = (t) => h("li", { class: "pri-" + t.pri }, h("label", { class: "row", style: { flex: 1, cursor: "pointer" } }, done((v) => { v ? finish(t, all) : (t.status = "todo"); save(); }, t.status === "done"), h("span", { style: { textDecoration: t.status === "done" ? "line-through" : "", opacity: t.status === "done" ? 0.5 : 1 } }, t.title)), h("span", { class: "chip" }, t.list), t.due ? h("span", { class: "chip " + (t.due < today() && t.status !== "done" ? "bad" : "") }, t.due.slice(5)) : null, h("button", { class: "x", onclick: () => { all.splice(all.indexOf(t), 1); save(); } }, "✕"));
  let body;
  if (tview === "board") {
    body = h("div", { class: "board" }, [["todo", "To do"], ["doing", "Doing"], ["done", "Done"]].map(([k, l]) => { const col = h("div", { class: "col", ondragover: (e) => { e.preventDefault(); col.classList.add("over"); }, ondragleave: () => col.classList.remove("over"), ondrop: (e) => { e.preventDefault(); const t = all.find((x) => x.id === e.dataTransfer.getData("text")); if (t) { t.status = k; save(); } } }, h("h4", {}, `${l} · ${vis.filter((t) => t.status === k).length}`));
      vis.filter((t) => t.status === k).forEach((t) => col.append(h("div", { class: "tk pri-" + t.pri + (k === "done" ? " done" : ""), draggable: "true", ondragstart: (e) => e.dataTransfer.setData("text", t.id) }, h("b", {}, t.title), h("div", { class: "src" }, t.list + (t.due ? " · " + t.due : ""))))); return col; }));
  } else if (tview === "plan") {
    const t0 = today(), wk = ymd(addDays(new Date(), 7)), op = vis.filter((t) => t.status !== "done");
    const bucket = [["Overdue", op.filter((t) => t.due && t.due < t0)], ["Today", op.filter((t) => t.due === t0)], ["This week", op.filter((t) => t.due > t0 && t.due <= wk)], ["Later", op.filter((t) => t.due > wk)], ["Someday", op.filter((t) => !t.due)]];
    body = h("div", { class: "grid" }, bucket.map(([l, a]) => card(`${l} · ${a.length}`, "", a.length ? h("ul", { class: "list" }, a.map(row)) : empty("—"))));
  } else body = card("Tasks", "", vis.length ? h("ul", { class: "list" }, vis.sort((a, b) => (a.status === "done") - (b.status === "done")).map(row)) : empty("No tasks yet — add one above."));
  const dn = vis.filter((t) => t.status === "done").length;
  return h("div", {}, card("Add", "＋", h("div", { class: "form" }, title, pri, due, lst, rp, h("button", { class: "btn", onclick: add }, "Add"))),
    h("div", { class: "subtabs", style: { marginTop: "14px" } }, ["list", "board", "plan"].map((v) => h("button", { class: "chipbtn" + (tview === v ? " on" : ""), onclick: () => { tview = v; store.set("tview", v); render(); } }, v[0].toUpperCase() + v.slice(1))), h("span", { class: "spacer" }), ["All", ...lists].map((l) => h("button", { class: "chipbtn" + (tlist === l ? " on" : ""), onclick: () => { tlist = l; render(); } }, l))),
    h("div", { class: "bar", style: { marginBottom: "14px" } }, h("i", { style: { width: (vis.length ? (dn / vis.length) * 100 : 0) + "%" } })), body);
}

/* ===================== MONEY ===================== */
let msub = "overview";
const BILLCOL = ["#4f8cff", "#8b5cf6", "#14b8a6", "#f59e0b", "#f43f5e", "#22d3ee", "#a3e635", "#fb923c"];
function moneyTab({ D, render }) {
  const subs = [["overview", "Net worth"], ["budget", "Budget & bills"], ["markets", "Markets"], ["grow", "Growth projector"]];
  const bar = h("div", { class: "subtabs" }, subs.map(([k, l]) => h("button", { class: "chipbtn" + (msub === k ? " on" : ""), onclick: () => { msub = k; render(); } }, l)));
  const f = { overview: overview, budget: budget, markets: markets, grow: grow }[msub];
  return h("div", {}, bar, f(D, render));
}
function overview(D, render) {
  const ac = store.get("accts", []), hist = store.get("nw", []), save = () => { store.set("accts", ac); render(); };
  const total = ac.reduce((a, x) => a + (x.debt ? -x.bal : x.bal), 0), assets = ac.filter((x) => !x.debt).reduce((a, x) => a + x.bal, 0), debt = ac.filter((x) => x.debt).reduce((a, x) => a + x.bal, 0);
  const nm = h("input", { type: "text", placeholder: "Account name", class: "grow" }), bal = h("input", { type: "number", placeholder: "Balance", step: "0.01" }), dbt = h("select", {}, h("option", { value: "" }, "Asset"), h("option", { value: "1" }, "Debt"));
  const row = (x) => h("li", {}, h("span", {}, x.name, x.debt ? h("span", { class: "chip bad", style: { marginLeft: "8px" } }, "debt") : null), h("div", { class: "row" }, h("input", { type: "number", value: x.bal, step: "0.01", style: { width: "120px", textAlign: "right" }, onchange: (e) => { x.bal = +e.target.value; save(); } }), h("button", { class: "x", onclick: () => { ac.splice(ac.indexOf(x), 1); save(); } }, "✕")));
  const parts = ac.filter((x) => !x.debt && x.bal > 0).map((x, i) => ({ l: x.name, v: x.bal, color: BILLCOL[i % 8] }));
  const snap = () => { const d = today(); const i = hist.findIndex((x) => x.d === d); const e = { d, total, accts: ac.map((a) => ({ n: a.name, b: a.bal, debt: !!a.debt })) }; i >= 0 ? (hist[i] = e) : hist.push(e); store.set("nw", hist); toast("Snapshot saved"); render(); };
  const chg = hist.length > 1 ? total - hist[hist.length - 2].total : 0;
  return h("div", { class: "grid" },
    card("Net worth", "💰", h("div", { class: "big mono" }, money(total)), hist.length > 1 ? h("div", { class: "mono " + (chg >= 0 ? "gain" : "loss") }, `${chg >= 0 ? "▲" : "▼"} ${money(Math.abs(chg))} since last snapshot`) : null,
      h("div", { class: "row", style: { marginTop: "10px" } }, h("span", { class: "chip ok" }, "Assets " + money(assets)), debt ? h("span", { class: "chip bad" }, "Debt " + money(debt)) : null), h("div", { style: { marginTop: "12px" } }, h("button", { class: "btn sm", onclick: snap }, "Save snapshot"))),
    card("Where it sits", "🍩", parts.length ? h("div", { class: "row", style: { gap: "18px" } }, donut(parts), h("div", { class: "src" }, parts.map((p) => h("div", {}, h("span", { style: { color: p.color } }, "● "), `${p.l} ${Math.round((p.v / assets) * 100)}%`)))) : empty("Add accounts to see the split.")),
    card("Accounts", "🏦", ac.length ? h("ul", { class: "list" }, ac.map(row)) : empty("No accounts yet."), h("div", { class: "form", style: { marginTop: "10px" } }, nm, bal, dbt, h("button", { class: "btn sm", onclick: () => { if (!nm.value || bal.value === "") return; ac.push({ id: uid(), name: nm.value, bal: +bal.value, debt: !!dbt.value }); save(); } }, "Add"))),
    (() => { const c = card("History", "📉", hist.length > 1 ? lineChart(hist.slice(-40).map((x) => ({ x: x.d, y: x.total })), { xlabel: (p) => p.x.slice(5), yfmt: (v) => "$" + Math.round(v).toLocaleString() }) : empty("Save a snapshot each week to build the curve.")); c.classList.add("w2"); return c; })());
}
function budget(D, render) {
  const b = store.get("budget", { income: 0, bills: [] }), save = () => { store.set("budget", b); render(); }, tot = b.bills.reduce((a, x) => a + x.amt, 0);
  const nm = h("input", { type: "text", placeholder: "Bill / subscription", class: "grow" }), am = h("input", { type: "number", placeholder: "$ / mo", step: "0.01", style: { width: "100px" } }), dy = h("input", { type: "number", placeholder: "Day", min: 1, max: 28, style: { width: "70px" } });
  return h("div", { class: "grid" },
    card("Monthly picture", "🧮", h("div", { class: "form" }, h("label", { class: "src" }, "Income / mo"), h("input", { type: "number", value: b.income || "", style: { width: "120px" }, onchange: (e) => { b.income = +e.target.value; save(); } })),
      h("div", { class: "big mono", style: { marginTop: "10px" } }, money(b.income - tot)), h("div", { class: "src" }, `left after ${money(tot)} recurring`), h("div", { class: "bar", style: { marginTop: "10px" } }, h("i", { style: { width: Math.min(100, b.income ? (tot / b.income) * 100 : 0) + "%" } }))),
    card("Recurring", "🔁", b.bills.length ? h("ul", { class: "list" }, b.bills.sort((x, y) => x.day - y.day).map((x) => h("li", {}, h("span", {}, x.name, h("span", { class: "src" }, ` · day ${x.day}`)), h("div", { class: "row" }, h("span", { class: "mono" }, money(x.amt, 2)), h("button", { class: "x", onclick: () => { b.bills.splice(b.bills.indexOf(x), 1); save(); } }, "✕"))))) : empty("No recurring charges tracked."), h("div", { class: "form", style: { marginTop: "10px" } }, nm, am, dy, h("button", { class: "btn sm", onclick: () => { if (nm.value && am.value) { b.bills.push({ id: uid(), name: nm.value, amt: +am.value, day: +dy.value || 1 }); save(); } } }, "Add"))),
    b.bills.length ? card("Bill mix", "🍩", h("div", { class: "row", style: { gap: "18px" } }, donut(b.bills.map((x, i) => ({ l: x.name, v: x.amt, color: BILLCOL[i % 8] }))), h("div", { class: "src" }, b.bills.map((x, i) => h("div", {}, h("span", { style: { color: BILLCOL[i % 8] } }, "● "), x.name))))) : null);
}
function markets(D) {
  const q = D.quotes; if (!q) return card("Markets", "", empty("No market data yet."));
  return h("div", { class: "grid" }, q.items.map((i) => { const c = h("div", { class: "card" }, h("h3", {}, i.name, h("span", { class: "asof" }, i.sym + (i.stale ? " · stale" : ""))), h("div", { class: "row", style: { justifyContent: "space-between" } }, h("div", { class: "big mono" }, i.price.toLocaleString(undefined, { maximumFractionDigits: 2 })), h("span", { class: "chip " + (i.pct >= 0 ? "ok" : "bad") }, sgn(i.pct) + "%")), lineChart(i.closes.map((y, k) => ({ x: k, y })), { h: 120, color: i.closes.at(-1) >= i.closes[0] ? "var(--gain)" : "var(--loss)", xlabel: (p) => (p.x === 0 ? "90d ago" : p.x === i.closes.length - 1 ? "now" : ""), ticks: 2 })); return c; }));
}
function grow(D, render) {
  const s = store.get("proj", { start: 5000, monthly: 200, rate: 8, years: 30 }), age = store.get("age", 25), yr0 = new Date().getFullYear();
  const f = (k, l, st = 1) => h("label", { class: "src", style: { display: "grid", gap: "4px" } }, l, h("input", { type: "number", value: s[k], step: st, onchange: (e) => { s[k] = +e.target.value; store.set("proj", s); render(); } }));
  const pts = []; let v = s.start; for (let y = 0; y <= s.years; y++) { pts.push({ x: y, y: v }); v = v * (1 + s.rate / 100) + s.monthly * 12 * (1 + s.rate / 200); }
  const contrib = s.start + s.monthly * 12 * s.years, end = pts.at(-1).y;
  return h("div", { class: "grid" }, card("Assumptions", "🎛️", h("div", { class: "form" }, f("start", "Starting $"), f("monthly", "Monthly $"), f("rate", "Return %", 0.5), f("years", "Years"))),
    card("Projected", "🚀", h("div", { class: "big mono" }, money(end)), h("div", { class: "src" }, `${money(contrib)} contributed · ${money(end - contrib)} growth`)),
    (() => { const c = card("Growth by age", "📊", lineChart(pts, { w: 700, h: 230, xlabel: (p) => `Age ${age + p.x} (${yr0 + p.x})`, yfmt: (v) => "$" + (v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.round(v / 1000) + "k"), ticks: 5 }), h("div", { class: "src" }, "Illustrative only — not financial advice. Set your age in Settings.")); c.classList.add("wall"); return c; })());
}

/* ===================== NEWS ===================== */
let nsec = "politics", nlean = "ALL";
const NSECS = [["politics", "Politics"], ["trending", "Trending"], ["business", "Business"], ["finance", "Finance"], ["boston", "Boston"]];
function news({ D, render, compact }) {
  const sec = D.news?.sections?.[nsec] || []; let items = nlean === "ALL" ? sec : sec.filter((n) => n.lean === nlean);
  const cnt = { L: 0, C: 0, R: 0 }; sec.forEach((n) => n.lean && cnt[n.lean]++); const tot = cnt.L + cnt.C + cnt.R || 1;
  return h("div", {}, h("div", { class: "subtabs" }, NSECS.map(([k, l]) => h("button", { class: "chipbtn" + (nsec === k ? " on" : ""), onclick: () => { nsec = k; nlean = "ALL"; render(); } }, l))),
    nsec === "politics" || nsec === "trending" ? h("div", { class: "card", style: { marginBottom: "14px" } }, h("h3", {}, "Source balance"), h("div", { class: "spectrum" }, [["L", "#60a5fa"], ["C", "#a78bfa"], ["R", "#fb7185"]].map(([k, c]) => h("i", { style: { width: (cnt[k] / tot) * 100 + "%", background: c } }))),
      h("div", { class: "row", style: { marginTop: "10px" } }, [["ALL", "All"], ["L", "Left"], ["C", "Center"], ["R", "Right"]].map(([k, l]) => h("button", { class: "chipbtn" + (nlean === k ? " on" : ""), onclick: () => { nlean = k; render(); } }, l + (k === "ALL" ? ` (${sec.length})` : ` (${cnt[k]})`))), h("span", { class: "src" }, "Headlines are mixed across outlets so no single side dominates."))) : null,
    card(NSECS.find((x) => x[0] === nsec)[1], "📰", items.length ? h("ul", { class: "list news" }, items.slice(0, compact ? 12 : 40).map((n) => { const li = newsLi(n); if (n.summary) li.append(h("div", { class: "src" }, n.summary.slice(0, 180))); return li; })) : empty(D.news ? "Nothing in this view." : "Loading…"), h("div", { class: "src" }, D.news ? "Updated " + ago(D.news.updated) : "")));
}

/* ===================== SPORTS ===================== */
function sports({ D }) {
  const L = D.sports?.leagues; if (!L) return card("Sports", "", empty("Loading scores…"));
  const g = (e) => { const t = e.teams || [], a = t.find((x) => !x.home) || t[0] || {}, hm = t.find((x) => x.home) || t[1] || {}; const side = (x, r) => h("div", { class: "t" + (r ? " r" : "") }, r ? null : x.logo ? h("img", { src: x.logo, alt: "", onerror: (e) => e.target.remove() }) : null, h("span", { style: { opacity: e.done && !x.winner ? 0.55 : 1 } }, x.abbr), r && x.logo ? h("img", { src: x.logo, alt: "", onerror: (e) => e.target.remove() }) : null);
    return h("div", { class: "game" }, side(a), h("div", { class: "sc" }, e.state === "pre" ? h("span", { class: "src" }, e.detail) : [e.state === "in" ? h("div", { class: "live" }, "LIVE") : null, `${a.score}–${hm.score}`, e.state === "in" ? h("div", { class: "src" }, e.detail) : null]), side(hm, true)); };
  return h("div", { class: "grid" }, Object.values(L).map((l) => card(`${l.emoji} ${l.teamName}`, "", h("div", { class: "row", style: { marginBottom: "8px" } }, h("span", { class: "chip" }, "Record " + (l.record || "—")), l.stale ? h("span", { class: "chip warn" }, "stale") : null, l.results?.slice().reverse().map((r) => { const me = r.teams.find((t) => t.abbr && l.teamName && (t.name || "").includes(l.teamName)); return me ? h("span", { class: "wl " + (me.winner ? "W" : "L") }, me.winner ? "W" : "L") : null; })),
    l.live ? g(l.live) : null, l.slate?.length ? h("div", {}, h("div", { class: "src" }, "League slate"), l.slate.slice(0, 5).map(g)) : null,
    h("div", { class: "src", style: { marginTop: "6px" } }, "Next"), l.next?.length ? l.next.slice(0, 4).map(g) : empty("No games scheduled"), h("div", { class: "src", style: { marginTop: "6px" } }, "Recent"), l.results?.length ? l.results.slice(0, 4).map(g) : empty("—"))));
}

/* ===================== STUDY ===================== */
const BANK = [["What does the Rule of 72 estimate?", "Years to double money ≈ 72 ÷ annual return %."], ["Roth IRA vs Traditional IRA?", "Roth: taxed now, tax-free growth/withdrawals. Traditional: deduct now, taxed on withdrawal."], ["What is dollar-cost averaging?", "Investing a fixed amount on a schedule regardless of price."], ["What is an expense ratio?", "Annual fund fee as a % of assets — lower is better."], ["What does a P/E ratio measure?", "Price per share ÷ earnings per share."], ["What is a 1099-NEC?", "Form reporting non-employee compensation (contractor income)."], ["Contingent vs retained search?", "Contingent: fee only on a successful hire. Retained: upfront engagement fee."], ["What is a W-2 vs 1099 worker?", "W-2: employee, taxes withheld. 1099: independent contractor."], ["What is a bill rate vs pay rate?", "Bill rate: what client pays the agency. Pay rate: what the worker gets."], ["What is gross margin in staffing?", "(Bill rate − pay rate − burden) ÷ bill rate."], ["Define compound interest.", "Interest earned on both principal and previously earned interest."], ["What is a recession (rule of thumb)?", "Two consecutive quarters of negative GDP growth (NBER uses a broader judgment)."]];
let flip = false, sidx = 0;
function study({ render }) {
  const cards = [...BANK.map((c, i) => ({ id: "b" + i, q: c[0], a: c[1] })), ...store.get("cards", [])], prog = store.get("sprog", {}), t = today();
  const pick = cards.filter((c) => (prog[c.id]?.due || "") <= t); const cur = pick[sidx % Math.max(1, pick.length)];
  const mark = (ok) => { prog[cur.id] = { box: ok ? Math.min(5, (prog[cur.id]?.box || 0) + 1) : 0, due: ymd(addDays(new Date(), ok ? [1, 2, 4, 8, 16, 30][Math.min(5, (prog[cur.id]?.box || 0) + 1)] : 0)) }; store.set("sprog", prog); const log = store.get("slog", {}); log[t] = (log[t] || 0) + 1; store.set("slog", log); flip = false; render(); };
  const q = h("input", { type: "text", class: "grow", placeholder: "Question" }), a = h("input", { type: "text", class: "grow", placeholder: "Answer" });
  const mastered = cards.filter((c) => (prog[c.id]?.box || 0) >= 3).length;
  return h("div", { class: "grid" },
    card(`Flashcards · ${pick.length} due`, "🧠", cur ? h("div", {}, h("div", { class: "card", style: { minHeight: "150px", display: "grid", placeItems: "center", textAlign: "center", cursor: "pointer", background: "var(--surface2)" }, onclick: () => { flip = !flip; render(); } }, h("div", { class: "q" }, flip ? cur.a : cur.q), h("div", { class: "src" }, flip ? "answer" : "tap to reveal")), flip ? h("div", { class: "row", style: { marginTop: "12px", justifyContent: "center" } }, h("button", { class: "btn ghost", onclick: () => mark(false) }, "Again"), h("button", { class: "btn", onclick: () => mark(true) }, "Got it")) : null) : empty("All caught up for today 🎉")),
    card("Progress", "📈", h("div", { class: "ring-wrap" }, ring(cards.length ? mastered / cards.length : 0, { label: mastered + "/" + cards.length, sub: "mastered" }), ring(Math.min(1, (store.get("slog", {})[t] || 0) / 10), { label: String(store.get("slog", {})[t] || 0), sub: "today / 10", color: "var(--a2)" }))),
    card("Add a card", "＋", h("div", { class: "form" }, q, a, h("button", { class: "btn sm", onclick: () => { if (q.value && a.value) { const c = store.get("cards", []); c.push({ id: uid(), q: q.value, a: a.value }); store.set("cards", c); render(); } } }, "Add"))));
}

/* ===================== CALENDAR ===================== */
let cm = new Date(), csel = today();
function calendar({ render }) {
  const first = new Date(cm.getFullYear(), cm.getMonth(), 1), start = addDays(first, -first.getDay()), ev = allEvents(), by = {}; ev.forEach((e) => (by[e.date] ||= []).push(e));
  const grid = h("div", { class: "cal" }, ["S", "M", "T", "W", "T", "F", "S"].map((d) => h("div", { class: "dow" }, d)));
  for (let i = 0; i < 42; i++) { const d = addDays(start, i), k = ymd(d); grid.append(h("div", { class: "cell" + (d.getMonth() !== cm.getMonth() ? " out" : "") + (k === today() ? " today" : "") + (k === csel ? " sel" : ""), onclick: () => { csel = k; render(); } }, h("div", { class: "d" }, d.getDate()), (by[k] || []).slice(0, 3).map((e) => h("span", { class: "ev " + (e.kind || "") }, e.title)), (by[k] || []).length > 3 ? h("span", { class: "src" }, "+" + (by[k].length - 3)) : null)); }
  const nm = h("input", { type: "text", class: "grow", placeholder: "Event title" }), kind = h("select", {}, [["", "Event"], ["pay", "Payday"], ["bill", "Bill"]].map(([v, l]) => h("option", { value: v }, l))), rep = h("select", {}, [["", "One time"], ["weekly", "Weekly"], ["biweekly", "Every 2 weeks"], ["monthly", "Monthly"]].map(([v, l]) => h("option", { value: v }, l)));
  const evs = store.get("events", []);
  return h("div", {}, h("div", { class: "row", style: { marginBottom: "12px" } }, h("button", { class: "iconbtn", onclick: () => { cm = new Date(cm.getFullYear(), cm.getMonth() - 1, 1); render(); } }, "‹"), h("h2", { style: { minWidth: "190px", textAlign: "center" } }, `${MONTHS[cm.getMonth()]} ${cm.getFullYear()}`), h("button", { class: "iconbtn", onclick: () => { cm = new Date(cm.getFullYear(), cm.getMonth() + 1, 1); render(); } }, "›"), h("button", { class: "btn sm ghost", onclick: () => { cm = new Date(); csel = today(); render(); } }, "Today")),
    grid, h("div", { style: { height: "14px" } }), h("div", { class: "grid" },
      card(dayShort(csel + "T12:00"), "📌", (by[csel] || []).length ? h("ul", { class: "list" }, by[csel].map((e) => h("li", {}, h("span", {}, e.title), e.kind === "task" || e.kind === "bill" || !evs.find((x) => x.id === e.id) ? h("span", { class: "chip" }, e.kind || "event") : h("button", { class: "x", onclick: () => { evs.splice(evs.findIndex((x) => x.id === e.id), 1); store.set("events", evs); render(); } }, "✕")))) : empty("Nothing on this day."),
        h("div", { class: "form", style: { marginTop: "10px" } }, nm, kind, rep, h("button", { class: "btn sm", onclick: () => { if (nm.value) { evs.push({ id: uid(), title: nm.value, date: csel, kind: kind.value, rep: rep.value }); store.set("events", evs); render(); } } }, "Add"))), upcomingCard(() => {})));
}

/* ===================== GOALS ===================== */
function goals({ render }) {
  const gl = store.get("goals", []), save = () => { store.set("goals", gl); render(); };
  const t = h("input", { type: "text", class: "grow", placeholder: "Goal (e.g. Save $10,000)" }), tg = h("input", { type: "number", placeholder: "Target", style: { width: "110px" } }), un = h("input", { type: "text", placeholder: "unit", style: { width: "80px" } }), dd = h("input", { type: "date" });
  return h("div", {}, card("New goal", "🎯", h("div", { class: "form" }, t, tg, un, dd, h("button", { class: "btn", onclick: () => { if (t.value && +tg.value) { gl.push({ id: uid(), title: t.value, target: +tg.value, cur: 0, unit: un.value, due: dd.value }); save(); } } }, "Add"))),
    h("div", { class: "grid", style: { marginTop: "14px" } }, gl.length ? gl.map((g) => { const p = Math.min(1, g.cur / g.target); return card(g.title, "", h("div", { class: "row", style: { gap: "16px" } }, ring(p, { size: 96, label: Math.round(p * 100) + "%" }), h("div", { style: { flex: 1 } }, h("div", { class: "mono" }, `${g.cur.toLocaleString()} / ${g.target.toLocaleString()} ${g.unit}`), g.due ? h("div", { class: "src" }, "Due " + g.due) : null, h("div", { class: "row", style: { marginTop: "8px" } }, h("input", { type: "number", value: g.cur, style: { width: "110px" }, onchange: (e) => { g.cur = +e.target.value; save(); } }), h("button", { class: "x", onclick: () => { gl.splice(gl.indexOf(g), 1); save(); } }, "✕"))))); }) : [card("Goals", "", empty("Add a goal to start tracking."))]));
}

/* ===================== HABITS ===================== */
function habits({ render }) {
  const hb = store.get("habits", []), log = store.get("hlog", {}), n = h("input", { type: "text", class: "grow", placeholder: "New habit (e.g. Workout)" }), t = today();
  const sum = {}; for (const d in log) sum[d] = Object.values(log[d]).filter(Boolean).length;
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 6));
  return h("div", { class: "grid" },
    card("This week", "🔥", hb.length ? h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" } }, h("tr", {}, h("th"), days.map((d) => h("th", { class: "muted", style: { padding: "4px" } }, DAYS[d.getDay()][0])), h("th")), hb.map((x) => h("tr", {}, h("td", { style: { padding: "6px 4px" } }, x.name), days.map((d) => h("td", { style: { textAlign: "center" } }, done((v) => { (log[ymd(d)] ||= {})[x.id] = v; v && addXP(5); store.set("hlog", log); render(); }, !!log[ymd(d)]?.[x.id]))), h("td", {}, h("span", { class: "chip" }, "🔥" + streak(x.id, log)), h("button", { class: "x", onclick: () => { hb.splice(hb.indexOf(x), 1); store.set("habits", hb); render(); } }, "✕"))))) : empty("No habits yet."), h("div", { class: "form", style: { marginTop: "10px" } }, n, h("button", { class: "btn sm", onclick: () => { if (n.value) { hb.push({ id: uid(), name: n.value }); store.set("habits", hb); render(); } } }, "Add"))),
    card("Consistency (18 weeks)", "🗓️", heat(sum), h("div", { class: "src" }, "Darker = more habits done that day")));
}

/* ===================== FOCUS ===================== */
const F = { mode: "focus", left: 25 * 60, run: false, int: null };
function focus({ render }) {
  const total = F.mode === "focus" ? 25 * 60 : 5 * 60, log = store.get("focus", {}), t = today();
  const wrap = h("div", { class: "grid" });
  const r = h("div", {}, ring(1 - F.left / total, { size: 190, stroke: 14, label: `${Math.floor(F.left / 60)}:${String(F.left % 60).padStart(2, "0")}`, sub: F.mode === "focus" ? "focus" : "break" }));
  const tick = () => { F.left--; if (F.left <= 0) { clearInterval(F.int); F.run = false; if (F.mode === "focus") { log[t] = (log[t] || 0) + 1; store.set("focus", log); addXP(20); confetti(100); } chime(); F.mode = F.mode === "focus" ? "break" : "focus"; F.left = F.mode === "focus" ? 1500 : 300; toast("Time! Switching to " + F.mode); try { navigator.vibrate?.(300); } catch {} } render(); };
  wrap.append(card("Pomodoro", "⏱️", h("div", { class: "row", style: { justifyContent: "center", flexDirection: "column", gap: "14px" } }, r, h("div", { class: "row" }, h("button", { class: "btn", onclick: () => { if (F.run) { clearInterval(F.int); F.run = false; } else { F.run = true; F.int = setInterval(tick, 1000); } render(); } }, F.run ? "Pause" : "Start"), h("button", { class: "btn ghost", onclick: () => { clearInterval(F.int); F.run = false; F.left = F.mode === "focus" ? 1500 : 300; render(); } }, "Reset"), h("button", { class: "btn ghost", onclick: () => { clearInterval(F.int); F.run = false; F.mode = F.mode === "focus" ? "break" : "focus"; F.left = F.mode === "focus" ? 1500 : 300; render(); } }, "Skip")))),
    card("Sessions", "📊", h("div", { class: "big" }, log[t] || 0), h("div", { class: "src" }, "focus blocks today"), barChart(Array.from({ length: 7 }, (_, i) => { const d = addDays(new Date(), i - 6); return { l: DAYS[d.getDay()].slice(0, 3), v: log[ymd(d)] || 0 }; }), { h: 140 })));
  return wrap;
}

/* ===================== NOTES ===================== */
function notes({ render }) {
  const ns = store.get("notes", []), ta = h("textarea", { placeholder: "Capture an idea, link or thought…" }), q = h("input", { type: "text", placeholder: "Search notes…", class: "grow" });
  let term = ""; q.oninput = () => { term = q.value.toLowerCase(); draw(); };
  const list = h("div", { class: "grid", style: { marginTop: "14px" } });
  const draw = () => { list.innerHTML = ""; ns.filter((n) => n.t.toLowerCase().includes(term)).forEach((n) => list.append(card(new Date(n.d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), "", h("div", { style: { whiteSpace: "pre-wrap" } }, n.t), h("div", { style: { marginTop: "8px" } }, h("button", { class: "x", onclick: () => { ns.splice(ns.indexOf(n), 1); store.set("notes", ns); render(); } }, "Delete"), h("button", { class: "x", onclick: () => { const t = store.get("tasks", []); t.unshift({ id: uid(), title: n.t.split("\n")[0].slice(0, 120), pri: "med", due: "", list: "Ideas", status: "todo" }); store.set("tasks", t); toast("Added as task"); } }, "→ Task"))))); if (!list.children.length) list.append(card("Notes", "", empty("Nothing yet."))); };
  draw();
  return h("div", {}, card("Quick capture", "📝", ta, h("div", { class: "row", style: { marginTop: "10px" } }, h("button", { class: "btn", onclick: () => { if (ta.value.trim()) { ns.unshift({ id: uid(), d: new Date().toISOString(), t: ta.value.trim() }); store.set("notes", ns); render(); } } }, "Save"), q)), list);
}

export const wyTabs = [
  { id: "happy", label: () => "Happy " + DAYS[new Date().getDay()], render: happy },
  { id: "tasks", label: "Tasks", render: tasks }, { id: "money", label: "Money", render: moneyTab }, { id: "news", label: "News", render: news }, { id: "sports", label: "Sports", render: sports },
  { id: "study", label: "Study", render: study }, { id: "calendar", label: "Calendar", render: calendar }, { id: "goals", label: "Goals", render: goals }, { id: "habits", label: "Habits", render: habits }, { id: "focus", label: "Focus", render: focus }, { id: "notes", label: "Notes", render: notes },
];
export { weatherCard, newsLi };
