import { h, store, uid, ymd, parse, addDays, dayShort, lineChart, barChart, heat, ring, card, toast, weekStart } from "./core.js?v=BUILD";
import { confetti, chime } from "./fx.js?v=BUILD";
import { addXP } from "./views.js?v=BUILD";

/* 4-day upper/lower, ~45 min, supersets (same letter = alternate sets). Legs are single-leg / hinge based: no heavy back squats. */
const E = (n, s, r, g, note = "") => ({ n, s, r, g, note });
export const PLAN = [
  { id: "UA", wd: 1, name: "Upper A", tag: "Push focus", ex: [
    E("Incline DB press", 4, "8-10", "A", "30° bench"), E("Seated cable row", 4, "10-12", "A", "neutral grip"),
    E("Flat bench (barbell or Smith)", 3, "6-8", "B"), E("Lat pulldown", 3, "10-12", "B"),
    E("Cable lateral raise", 3, "12-15", "C"), E("Rope pushdown", 3, "10-12", "C"),
    E("Cable crunch", 3, "12-15", "D", "abs"), E("Hanging knee/leg raise", 3, "10-12", "D", "abs")] },
  { id: "LA", wd: 2, name: "Lower A", tag: "Single-leg + hinge", ex: [
    E("Rear-foot split squat (DB)", 3, "8-10", "A", "each leg, pain-free depth"), E("Cable pull-through", 3, "12", "A"),
    E("Romanian deadlift (barbell)", 3, "8-10", "B"), E("Standing calf raise (Smith)", 4, "12", "B"),
    E("DB step-up (low box)", 3, "10", "C", "each leg"), E("Farmer carry", 3, "40 yd", "C", "heavy, athletic"),
    E("Pallof press", 3, "10", "D", "abs, each side"), E("Plank", 3, "45 sec", "D", "abs")] },
  { id: "UB", wd: 4, name: "Upper B", tag: "Pull focus", ex: [
    E("DB overhead press", 3, "8-10", "A"), E("Pull-up (or wide pulldown)", 4, "6-10", "A"),
    E("Low-to-high cable fly", 3, "12-15", "B"), E("Single-arm cable row", 3, "10-12", "B", "each arm"),
    E("Face pull", 3, "15", "C"), E("DB / cable curl", 3, "10-12", "C"),
    E("Cable woodchop", 3, "12", "D", "abs, each side"), E("Hanging leg raise", 3, "10-12", "D", "abs")] },
  { id: "LB", wd: 5, name: "Lower B", tag: "Glutes + athletic", ex: [
    E("Barbell hip thrust", 4, "8-10", "A"), E("Single-leg RDL (DB)", 3, "8", "A", "each leg"),
    E("Smith reverse lunge", 3, "8", "B", "each leg, short step"), E("Calf raise", 3, "12-15", "B"),
    E("Suitcase carry", 3, "40 yd", "C", "each side, athletic"), E("Back extension", 3, "12", "C"),
    E("Ab wheel / bench rollout", 3, "8-10", "D", "abs"), E("Side plank", 3, "30 sec", "D", "abs, each side")] },
];
const byId = (id) => PLAN.find((p) => p.id === id);
const topReps = (r) => { const m = String(r).match(/\d+/g); return m ? +m[m.length - 1] : 0; };
const numeric = (r) => /^\d+(-\d+)?$/.test(String(r));
const vol = (ex) => ex.reduce((a, e) => a + e.sets.reduce((b, s) => b + (s.done && s.w && s.r ? +s.w * +s.r : 0), 0), 0);
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
let tick = null;

function lastOf(day) { const l = store.get("liftLog", []).filter((s) => s.day === day).sort((a, b) => b.d.localeCompare(a.d) || b.id.localeCompare(a.id))[0]; const m = {}; if (l) for (const e of l.ex) m[e.n] = e.sets; return m; }
function nextDay() { const l = store.get("liftLog", []).slice().sort((a, b) => b.d.localeCompare(a.d))[0]; if (!l) { const wd = new Date().getDay(); return (PLAN.find((p) => p.wd >= wd) || PLAN[0]).id; } const i = PLAN.findIndex((p) => p.id === l.day); return PLAN[(i + 1) % 4].id; }

function syncCal(on) {
  let ev = store.get("events", []).filter((e) => !String(e.id).startsWith("lift-"));
  if (on) for (const p of PLAN) { const now = new Date(); const diff = (p.wd - now.getDay() + 7) % 7; ev.push({ id: "lift-" + p.id, title: `🏋️ Gym AM · ${p.name}`, date: ymd(addDays(now, diff)), kind: "gym", rep: "weekly" }); }
  store.set("events", ev); store.set("liftCal", on);
}

function weeksStreak(log) {
  let n = 0, w = weekStart(); const cnt = (a) => log.filter((s) => s.d >= ymd(a) && s.d <= ymd(addDays(a, 6))).length;
  if (cnt(w) < 3) w = addDays(w, -7); // current week still in progress
  while (cnt(w) >= 3 && n < 520) { n++; w = addDays(w, -7); }
  return n;
}

export function liftToday() { const p = PLAN.find((x) => x.wd === new Date().getDay()); if (!p) return null; return store.get("liftLog", []).some((s) => s.d === ymd()) ? null : p; }

export function lift({ render }) {
  if (tick) { clearInterval(tick); tick = null; }
  const log = store.get("liftLog", []), act = store.get("liftActive", null), ws = ymd(weekStart()), mo = ymd().slice(0, 7);
  const kp = (l, v, s) => h("div", { class: "kpi" }, h("div", { class: "kpi-l" }, l), h("div", { class: "kpi-v" }, v), h("div", { class: "kpi-s" }, s));
  const wk = log.filter((s) => s.d >= ws), mn = log.filter((s) => s.d.startsWith(mo));
  const kpis = h("div", { class: "kpis", style: { gridTemplateColumns: "repeat(4,minmax(0,1fr))" } }, kp("This week", `${wk.length}/4`, "sessions"), kp("This month", String(mn.length), "sessions"), kp("Streak", String(weeksStreak(log)), "weeks of 3+"), kp("Volume (wk)", fmt(wk.reduce((a, s) => a + (s.vol || 0), 0)), "lb lifted"));
  return h("div", {}, kpis, act ? session(act, render) : home(log, render), h("div", { style: { height: "14px" } }), progress(log, render));
}

function home(log, render) {
  const nx = nextDay(), calOn = store.get("liftCal", false), wdn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const start = (p) => { const last = lastOf(p.id); store.set("liftActive", { day: p.id, start: Date.now(), ex: p.ex.map((e) => ({ n: e.n, sets: Array.from({ length: e.s }, (_, i) => ({ w: last[e.n]?.[i]?.w ?? last[e.n]?.[0]?.w ?? "", r: last[e.n]?.[i]?.r ?? "", done: false })) })) }); render(); };
  const row = (p) => h("div", { class: "card", style: { margin: "0", padding: "14px", border: p.id === nx ? "1px solid var(--accent)" : "" } }, h("div", { class: "row", style: { justifyContent: "space-between" } }, h("div", {}, h("b", {}, p.name), h("div", { class: "src" }, `${wdn[p.wd]} · ${p.tag} · ~45 min`)), h("button", { class: p.id === nx ? "btn" : "btn ghost", onclick: () => start(p) }, p.id === nx ? "Start ▶" : "Start")),
    h("div", { class: "src", style: { marginTop: "8px", lineHeight: "1.5" } }, p.ex.map((e) => `${e.n} ${e.s}×${e.r}`).join(" · ")));
  return h("div", {}, card("Next up · " + byId(nx).name, "🏋️", h("div", { class: "src", style: { marginBottom: "10px" } }, "Mon Upper A · Tue Lower A · Thu Upper B · Fri Lower B. Lettered pairs are supersets: alternate sets with ~60 s rest, so each session fits in 45 minutes."), h("div", { class: "grid" }, PLAN.map(row)),
    h("div", { class: "row", style: { marginTop: "12px" } }, h("button", { class: "btn sm ghost", onclick: () => { syncCal(!calOn); toast(calOn ? "Gym blocks removed from Calendar" : "Gym blocks added to Calendar (weekly, AM)"); render(); } }, calOn ? "Remove gym blocks from Calendar" : "Add AM gym blocks to Calendar"), calOn ? h("span", { class: "chip ok" }, "On calendar: Mon/Tue/Thu/Fri AM") : null)),
    h("div", { style: { height: "14px" } }), card("How to progress", "📈", h("ul", { class: "list" }, [
      "Double progression: when every set hits the top of the rep range, add 5 lb (barbell) or 2.5–5 lb per DB next time.",
      "Knees: choose a depth that is pain-free, control the way down, add reps before weight. No heavy back squats in this plan.",
      "Last 1–2 reps of each set should feel hard but clean. Rest 60–90 s; 2 min on the first lift of the day.",
      "Athletic: carries and Pallof/woodchops build the core and grip without bulk. Eat roughly 250–300 kcal above maintenance and aim for ~0.7–1 g protein per lb to gain lean."].map((t) => h("li", {}, h("span", {}, t))))));
}

function session(act, render) {
  const p = byId(act.day), last = lastOf(act.day), save = () => store.set("liftActive", act);
  let rest = 0; const bar = h("div", { class: "restbar" }, h("b", { class: "mono" }, "Rest"), h("span", { class: "mono rt" }, "—"), h("button", { class: "x", onclick: () => { rest = 0; paint(); } }, "Skip"), h("button", { class: "x", onclick: () => { rest += 15; paint(); } }, "+15s"));
  const paint = () => { bar.querySelector(".rt").textContent = rest > 0 ? mmss(rest) : "—"; bar.classList.toggle("on", rest > 0); };
  tick = setInterval(() => { if (!bar.isConnected) { clearInterval(tick); tick = null; return; } if (rest > 0) { rest--; paint(); if (rest === 0) { try { chime(); } catch {} } } }, 1000);
  const doneCount = () => act.ex.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0), total = act.ex.reduce((a, e) => a + e.sets.length, 0);
  const prog = h("div", { class: "bar", style: { margin: "8px 0" } }, h("i", { style: { width: "0%" } })), lab = h("span", { class: "src" });
  const upd = () => { prog.firstChild.style.width = (doneCount() / total) * 100 + "%"; lab.textContent = `${doneCount()}/${total} sets · ${fmt(vol(act.ex))} lb · ${Math.max(1, Math.round((Date.now() - act.start) / 60000))} min`; };
  const exCard = (e, i) => {
    const pe = p.ex[i], nm = numeric(pe.r), lastSets = last[e.n], hit = nm && lastSets && lastSets.length && lastSets.every((s) => s.done && +s.r >= topReps(pe.r));
    const rows = e.sets.map((s, si) => {
      const w = h("input", { type: "number", inputmode: "decimal", step: "0.5", placeholder: "lb", value: s.w }), r = h("input", { type: "number", inputmode: "numeric", placeholder: nm ? pe.r.split("-")[0] : pe.r.split(" ")[0], value: s.r });
      const ck = h("button", { class: "ck" + (s.done ? " on" : ""), onclick: () => { s.done = !s.done; s.w = w.value; s.r = r.value; ck.classList.toggle("on", s.done); ck.parentNode.classList.toggle("done", s.done); if (s.done) { rest = 75; paint(); } save(); upd(); } }, "✓");
      w.addEventListener("change", () => { s.w = w.value; save(); upd(); }); r.addEventListener("change", () => { s.r = r.value; save(); upd(); });
      return h("div", { class: "ls" + (s.done ? " done" : "") }, h("span", { class: "mono" }, si + 1), w, r, ck);
    });
    return card(`${pe.g}${p.ex.filter((x) => x.g === pe.g).indexOf(pe) + 1}  ${e.n}`, "", h("div", { class: "row", style: { justifyContent: "space-between" } }, h("span", { class: "chip" }, `${pe.s}×${pe.r}`), pe.note ? h("span", { class: "src" }, pe.note) : null),
      lastSets && lastSets.length ? h("div", { class: "src", style: { margin: "6px 0" } }, "Last: " + lastSets.filter((s) => s.done).map((s) => `${s.w || "–"}×${s.r || "–"}`).join(", ") + (hit ? "  ↑ add weight" : "")) : null, h("div", { class: "src ls", style: { margin: "4px 0 0" } }, h("span", {}, "#"), h("span", {}, "Weight"), h("span", {}, "Reps"), h("span", {})), rows,
      h("div", { class: "row", style: { marginTop: "4px" } }, h("button", { class: "x", onclick: () => { e.sets.push({ w: e.sets[e.sets.length - 1]?.w ?? "", r: "", done: false }); save(); render(); } }, "+ set"), e.sets.length > 1 ? h("button", { class: "x", onclick: () => { e.sets.pop(); save(); render(); } }, "− set") : null));
  };
  const finish = () => {
    if (!doneCount()) return toast("Check off at least one set");
    const ex = act.ex.map((e) => ({ n: e.n, sets: e.sets.filter((s) => s.done).map((s) => ({ w: +s.w || 0, r: +s.r || 0, done: true })) })).filter((e) => e.sets.length);
    const rec = { id: uid(), d: ymd(), day: act.day, name: p.name, mins: Math.max(1, Math.round((Date.now() - act.start) / 60000)), ex, vol: vol(ex.map((e) => ({ ...e, sets: e.sets }))) };
    const prev = bests(store.get("liftLog", [])), prs = []; for (const e of ex) { const b = Math.max(0, ...e.sets.map((s) => s.w)); if (b > 0 && b > (prev[e.n]?.w || 0)) prs.push(e.n); }
    const l = store.get("liftLog", []); l.unshift(rec); store.set("liftLog", l); store.set("liftActive", null); addXP(25); confetti(prs.length ? 160 : 90); toast(prs.length ? `Saved · new PR: ${prs.slice(0, 2).join(", ")} 🏆` : "Workout saved 💪"); render();
  };
  upd();
  return h("div", {}, bar, card(`${p.name} · ${p.tag}`, "🏋️", h("div", { class: "row", style: { justifyContent: "space-between" } }, lab, h("div", { class: "row" }, h("button", { class: "btn", onclick: finish }, "Finish ✓"), h("button", { class: "btn ghost sm", onclick: () => { if (confirm("Discard this workout?")) { store.set("liftActive", null); render(); } } }, "Discard"))), prog),
    h("div", { class: "grid", style: { marginTop: "12px" } }, act.ex.map(exCard)));
}

function bests(log) { const b = {}; for (const s of log) for (const e of s.ex) for (const st of e.sets) { if (!st.w) continue; if (!b[e.n] || st.w > b[e.n].w || (st.w === b[e.n].w && st.r > b[e.n].r)) b[e.n] = { w: st.w, r: st.r, d: s.d }; } return b; }

function progress(log, render) {
  if (!log.length) return h("div", {}, card("Progress", "📊", h("div", { class: "src" }, "Finish your first workout and your charts, PRs and body weight trend show up here.")), bodyCard(render));
  const names = [...new Set(log.flatMap((s) => s.ex.filter((e) => e.sets.some((x) => x.w)).map((e) => e.n)))], sel = h("select", {}, names.map((n) => h("option", { value: n }, n))), chart = h("div", {});
  const draw = () => { chart.innerHTML = ""; const pts = log.slice().sort((a, b) => a.d.localeCompare(b.d)).map((s) => { const e = s.ex.find((x) => x.n === sel.value); return e ? { x: s.d, y: Math.max(...e.sets.map((t) => t.w || 0)) } : null; }).filter((p) => p && p.y > 0); chart.append(pts.length > 1 ? lineChart(pts.slice(-30), { h: 170, xlabel: (p) => p.x.slice(5), yfmt: (v) => Math.round(v) + " lb" }) : h("div", { class: "src" }, pts.length ? `Top set: ${pts[0].y} lb. Log it again to see the trend.` : "No data yet.")); };
  sel.addEventListener("change", draw); draw();
  const wkBars = Array.from({ length: 12 }, (_, i) => { const a = addDays(weekStart(), (i - 11) * 7), b = ymd(addDays(a, 6)); const v = log.filter((s) => s.d >= ymd(a) && s.d <= b).reduce((x, s) => x + (s.vol || 0), 0); return { l: `${a.getMonth() + 1}/${a.getDate()}`, v: Math.round(v / 100) / 10, dim: i < 11 }; });
  const map = {}; for (const s of log) map[s.d] = (map[s.d] || 0) + 1;
  const pr = Object.entries(bests(log)).sort((a, b) => b[1].d.localeCompare(a[1].d)).slice(0, 8);
  const hist = log.slice().sort((a, b) => b.d.localeCompare(a.d)).slice(0, 8);
  return h("div", {}, h("div", { class: "grid" }, card("Top set by session", "📈", sel, chart), card("Volume · last 12 weeks (k lb)", "📊", barChart(wkBars, { max: Math.max(1, ...wkBars.map((b) => b.v)) })),
    card("Consistency", "🔥", heat(map, { weeks: 18 }), h("div", { class: "src", style: { marginTop: "8px" } }, `${log.length} sessions logged · ${fmt(log.reduce((a, s) => a + (s.vol || 0), 0))} lb lifted all-time`)),
    card("Personal records", "🏆", h("ul", { class: "list" }, pr.map(([n, b]) => h("li", {}, h("div", {}, h("b", {}, n), h("div", { class: "src" }, dayShort(b.d + "T12:00"))), h("b", { class: "mono" }, `${b.w} × ${b.r}`)))))),
    h("div", { style: { height: "14px" } }), h("div", { class: "grid" }, bodyCard(render), card("History", "🗒️", h("ul", { class: "list" }, hist.map((s) => h("li", {}, h("div", {}, h("b", {}, s.name), h("div", { class: "src" }, `${dayShort(s.d + "T12:00")} · ${s.mins} min · ${fmt(s.vol || 0)} lb`)), h("button", { class: "x", onclick: () => { if (confirm("Delete this session?")) { store.set("liftLog", store.get("liftLog", []).filter((x) => x.id !== s.id)); render(); } } }, "✕")))))));
}

function bodyCard(render) {
  const bw = store.get("liftBW", []), i = h("input", { type: "number", step: "0.1", placeholder: "180", style: { width: "100px" } });
  const add = () => { if (!i.value) return; const a = store.get("liftBW", []).filter((x) => x.d !== ymd()); a.push({ d: ymd(), w: +i.value }); a.sort((x, y) => x.d.localeCompare(y.d)); store.set("liftBW", a); toast("Weight logged"); render(); };
  const l = bw[bw.length - 1], f = bw[0];
  return card("Body weight", "⚖️", h("div", { class: "row" }, i, h("span", { class: "src" }, "lb"), h("button", { class: "btn sm", onclick: add }, "Log")), l ? h("div", { class: "src", style: { margin: "8px 0" } }, `Now ${l.w} lb${bw.length > 1 ? ` · ${l.w - f.w >= 0 ? "+" : ""}${(l.w - f.w).toFixed(1)} lb since ${f.d}` : ""}`) : h("div", { class: "src", style: { margin: "8px 0" } }, "Weigh in the same time each week (morning). Aim for +0.25–0.5 lb/week for lean gain."), bw.length > 1 ? lineChart(bw.slice(-30).map((x) => ({ x: x.d, y: x.w })), { h: 150, xlabel: (p) => p.x.slice(5), yfmt: (v) => v.toFixed(1) }) : null);
}
