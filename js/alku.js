// ALKU (work) mode: black / red / white, narrow, work-safe. DBAs + pipelines only.
import { h, store, uid, ymd, addDays, weekStart, parse, quarterOf, ago, ring, barChart, card, toast, MONTHS } from "./core.js?v=BUILD";
import { newsLi } from "./views.js?v=BUILD";

const TARGET = { dba: 6, pipe: 2 };
let wk = weekStart();
const empty = (t) => h("div", { class: "empty" }, t);
const getW = (d) => store.get("alku", {})[ymd(d)] || { dba: 0, pipe: 0 };
function setW(d, k, v) { const a = store.get("alku", {}); const w = a[ymd(d)] || { dba: 0, pipe: 0 }; w[k] = Math.max(0, v); a[ymd(d)] = w; store.set("alku", a); }

function tracker({ render }) {
  let qd = 0, qp = 0, weeks = 0; const cur = getW(wk), isNow = ymd(wk) === ymd(weekStart()), q = quarterOf(wk), a = store.get("alku", {});
  // weeks in this quarter up to now
  for (let d = weekStart(q.start); d <= q.end; d = addDays(d, 7)) { if (d > new Date()) break; const w = a[ymd(d)]; weeks++; qd += w?.dba || 0; qp += w?.pipe || 0; }
  let streak = 0; for (let d = addDays(weekStart(), -7); ; d = addDays(d, -7)) { const w = a[ymd(d)]; if (w && w.dba >= TARGET.dba && w.pipe >= TARGET.pipe) streak++; else break; if (streak > 200) break; }
  const dow = new Date().getDay(), daysLeft = isNow ? Math.max(1, dow === 0 || dow === 6 ? 0 : 6 - dow) : 0, needD = Math.max(0, TARGET.dba - cur.dba), needP = Math.max(0, TARGET.pipe - cur.pipe);
  const names = (k) => [...new Set(store.get("alkulog", []).filter((e) => e.kind === k && e.d >= ymd(wk) && e.d <= ymd(addDays(wk, 6))).map((e) => e.company))].join(", "); const report = () => navigator.clipboard?.writeText(`ALKU week of ${ymd(wk)}: ${cur.dba}/${TARGET.dba} DBAs, ${cur.pipe}/${TARGET.pipe} pipelines. Q${q.q} ${q.y}: ${qd} DBAs, ${qp} pipelines (${paceD}/${paceP} per week).` + (names("dba") ? `\nDBAs: ${names("dba")}` : "") + (names("pipe") ? `\nPipelines: ${names("pipe")}` : "")).then(() => toast("Report copied"));
  const paceD = weeks ? (qd / weeks).toFixed(1) : "0.0", paceP = weeks ? (qp / weeks).toFixed(1) : "0.0";
  const wkLabel = `${wk.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(wk, 6).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  const step = (k, label) => h("div", { class: "ringl" }, ring(cur[k] / TARGET[k], { size: 118, label: `${cur[k]}/${TARGET[k]}`, sub: label, color: cur[k] >= TARGET[k] ? "var(--ink)" : "var(--accent)" }),
    h("div", { class: "stepper", style: { marginTop: "8px" } }, h("button", { onclick: () => { setW(wk, k, cur[k] - 1); render(); } }, "−"), h("button", { onclick: () => { setW(wk, k, cur[k] + 1); render(); } }, "+")));
  const bars = Array.from({ length: 13 }, (_, i) => { const d = addDays(weekStart(), (i - 12) * 7), w = a[ymd(d)] || { dba: 0, pipe: 0 }; return { l: `${d.getMonth() + 1}/${d.getDate()}`, v: w.dba, dim: ymd(d) !== ymd(wk), color: w.dba >= TARGET.dba ? "#ededed" : "var(--accent)" }; });
  const pbars = Array.from({ length: 13 }, (_, i) => { const d = addDays(weekStart(), (i - 12) * 7), w = a[ymd(d)] || { pipe: 0 }; return { l: `${d.getMonth() + 1}/${d.getDate()}`, v: w.pipe, dim: ymd(d) !== ymd(wk), color: w.pipe >= TARGET.pipe ? "#ededed" : "var(--accent)" }; });
    return h("div", { class: "grid" },
    card(`Week · ${wkLabel}`, "", h("div", { class: "row", style: { justifyContent: "space-between", marginBottom: "10px" } }, h("button", { class: "btn sm ghost", onclick: () => { wk = addDays(wk, -7); render(); } }, "‹ Prev"), isNow ? h("span", { class: "chip" }, "This week") : h("button", { class: "btn sm ghost", onclick: () => { wk = weekStart(); render(); } }, "This week"), h("button", { class: "btn sm ghost", onclick: () => { wk = addDays(wk, 7); render(); } }, "Next ›")),
      h("div", { class: "ring-wrap" }, step("dba", "DBAs"), step("pipe", "Pipelines"))),
    card(`Q${q.q} ${q.y} · ${MONTHS[q.start.getMonth()].slice(0, 3)}–${MONTHS[q.end.getMonth()].slice(0, 3)}`, "", h("div", { class: "ring-wrap" }, h("div", { class: "ringl" }, h("b", {}, qd), "DBAs"), h("div", { class: "ringl" }, h("b", {}, qp), "Pipelines"), h("div", { class: "ringl" }, h("b", {}, `${paceD} / ${paceP}`), "avg per week")),
      h("div", { class: "src", style: { marginTop: "10px" } }, `Target ${TARGET.dba} DBAs + ${TARGET.pipe} pipelines per week · quarter pace ${Math.round(weeks ? (qd / (weeks * TARGET.dba)) * 100 : 0)}% / ${Math.round(weeks ? (qp / (weeks * TARGET.pipe)) * 100 : 0)}%`),
      h("div", { class: "bar", style: { marginTop: "8px" } }, h("i", { style: { width: Math.min(100, weeks ? (qd / (weeks * TARGET.dba)) * 100 : 0) + "%" } }))),
    card("Streak & pace", "", h("div", { class: "ring-wrap" }, h("div", { class: "ringl" }, h("b", {}, "🔥 " + streak), "week streak"), h("div", { class: "ringl" }, h("b", {}, isNow ? (daysLeft ? `${(needD / daysLeft).toFixed(1)} / ${(needP / daysLeft).toFixed(1)}` : "—") : "—"), "needed per working day")), h("div", { class: "src", style: { margin: "8px 0" } }, isNow ? (needD || needP ? `Still need ${needD} DBAs + ${needP} pipelines this week.` : "Weekly targets hit ✓") : "Viewing another week"), h("button", { class: "btn sm", onclick: report }, "Copy weekly report")),
    card("DBAs · last 13 weeks", "", barChart(bars, { target: TARGET.dba, max: 10 })), card("Pipelines · last 13 weeks", "", barChart(pbars, { target: TARGET.pipe, max: 5 })));
}

function todo({ render }) {
  const ts = store.get("alkutasks", []), save = () => { store.set("alkutasks", ts); render(); }, n = h("input", { type: "text", class: "grow", id: "atask", placeholder: "Work to-do — Enter to add" });
  const add = () => { if (n.value.trim()) { ts.unshift({ id: uid(), t: n.value.trim(), done: false }); save(); setTimeout(() => document.getElementById("atask")?.focus(), 30); } };
  n.addEventListener("keydown", (e) => e.key === "Enter" && add());
  const open = ts.filter((x) => !x.done), dn = ts.filter((x) => x.done);
  return h("div", {}, card("Add", "", h("div", { class: "form" }, n, h("button", { class: "btn", onclick: add }, "Add"))), h("div", { style: { height: "14px" } }),
    card(`To do · ${open.length}`, "", open.length ? h("ul", { class: "list" }, open.map(row)) : empty("Clear.")), dn.length ? h("div", { style: { marginTop: "14px" } }, card(`Done · ${dn.length}`, "", h("ul", { class: "list" }, dn.map(row)), h("button", { class: "btn sm ghost", onclick: () => { store.set("alkutasks", ts.filter((x) => !x.done)); render(); } }, "Clear done"))) : null);
  function row(x) { return h("li", {}, h("label", { class: "row", style: { flex: 1, cursor: "pointer" } }, h("input", { type: "checkbox", class: "check", checked: x.done, onchange: (e) => { x.done = e.target.checked; save(); } }), h("span", { style: { opacity: x.done ? 0.5 : 1, textDecoration: x.done ? "line-through" : "" } }, x.t)), h("button", { class: "x", onclick: () => { ts.splice(ts.indexOf(x), 1); save(); } }, "✕")); }
}

function staffNews({ D }) {
  const s = D.news?.sections?.staffing || [];
  return card("Staffing & hiring news", "", s.length ? h("ul", { class: "list news" }, s.slice(0, 25).map((n) => { const li = newsLi(n); li.querySelector(".chip")?.remove(); return li; })) : empty(D.news ? "No items." : "Loading…"), h("div", { class: "src" }, D.news ? "Updated " + ago(D.news.updated) : ""));
}

function workNotes({ render }) {
  const ns = store.get("alkunotes", []), ta = h("textarea", { placeholder: "Call notes, candidate/client reminders…" });
  return h("div", {}, card("Notes", "", ta, h("div", { style: { marginTop: "10px" } }, h("button", { class: "btn", onclick: () => { if (ta.value.trim()) { ns.unshift({ d: new Date().toISOString(), t: ta.value.trim() }); store.set("alkunotes", ns); render(); } } }, "Save"))), h("div", { style: { height: "14px" } }),
    ns.map((n) => h("div", { style: { marginBottom: "12px" } }, card(new Date(n.d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), "", h("div", { style: { whiteSpace: "pre-wrap" } }, n.t), h("button", { class: "x", onclick: () => { ns.splice(ns.indexOf(n), 1); store.set("alkunotes", ns); render(); } }, "Delete")))));
}


const STAGES = ["Reached out", "Replied", "Meeting set", "Proposal", "Won", "Lost"];
let lq = "", lk = "all";
function log({ render }) {
  const all = store.get("alkulog", []), save = () => { store.set("alkulog", all); render(); }, t0 = ymd(new Date());
  const kind = h("select", {}, h("option", { value: "dba" }, "DBA"), h("option", { value: "pipe" }, "Pipeline")), co = h("input", { type: "text", class: "grow", id: "lco", placeholder: "Company" }), ct = h("input", { type: "text", placeholder: "Contact" }), st = h("select", {}, STAGES.map((s) => h("option", {}, s))), fu = h("input", { type: "date", title: "Follow-up date" }), nt = h("input", { type: "text", class: "grow", placeholder: "Note" });
  const add = () => { if (!co.value.trim()) return; const e = { id: uid(), d: t0, kind: kind.value, company: co.value.trim(), contact: ct.value.trim(), stage: st.value, fu: fu.value, note: nt.value.trim() }; all.unshift(e); setW(weekStart(), e.kind, getW(weekStart())[e.kind] + 1); save(); toast("Logged · week count +1"); setTimeout(() => document.getElementById("lco")?.focus(), 40); };
  [co, ct, nt].forEach((i) => i.addEventListener("keydown", (e) => e.key === "Enter" && add()));
  const due = all.filter((e) => e.fu && e.fu <= t0), vis = all.filter((e) => (lk === "all" || e.kind === lk) && (!lq || (e.company + " " + e.contact + " " + e.note).toLowerCase().includes(lq)));
  const row = (e) => h("li", {}, h("div", { style: { flex: 1, minWidth: 0 } }, h("div", {}, h("b", {}, e.company), e.contact ? " · " + e.contact : ""), h("div", { class: "src" }, `${e.kind === "dba" ? "DBA" : "Pipeline"} · ${e.d.slice(5)}${e.note ? " · " + e.note : ""}`)),
    h("div", { class: "row", style: { gap: "6px", flexWrap: "nowrap" } }, h("select", { style: { fontSize: "12px", padding: "3px" }, onchange: (x) => { e.stage = x.target.value; save(); } }, STAGES.map((s) => h("option", { selected: s === e.stage }, s))), e.fu ? h("span", { class: "chip " + (e.fu <= t0 ? "bad" : "") }, "↻ " + e.fu.slice(5)) : null, h("button", { class: "x", onclick: () => { const w = getW(weekStart(parse(e.d))); setW(weekStart(parse(e.d)), e.kind, w[e.kind] - 1); all.splice(all.indexOf(e), 1); save(); } }, "✕")));
  const sq = h("input", { type: "text", class: "grow", placeholder: "Search company or contact…", value: lq, oninput: (x) => { lq = x.target.value.toLowerCase(); render(); const el = document.querySelector("#lsq"); el?.focus(); el?.setSelectionRange(el.value.length, el.value.length); } }); sq.id = "lsq";
  return h("div", {}, card("Log activity", "", h("div", { class: "form" }, kind, co, ct, st, fu, nt, h("button", { class: "btn", onclick: add }, "Log")), h("div", { class: "src", style: { marginTop: "8px" } }, "Each entry adds 1 to this week's DBA / pipeline count.")), h("div", { style: { height: "14px" } }),
    due.length ? h("div", { style: { marginBottom: "14px" } }, card(`Follow-ups due · ${due.length}`, "", h("ul", { class: "list" }, due.map((e) => h("li", {}, h("div", {}, h("b", {}, e.company), h("div", { class: "src" }, `${e.contact || "—"} · ${e.stage}`)), h("button", { class: "btn sm ghost", onclick: () => { e.fu = ""; save(); } }, "Done")))))) : null,
    card(`History · ${vis.length}`, "", h("div", { class: "row", style: { marginBottom: "10px" } }, sq, ["all", "dba", "pipe"].map((k) => h("button", { class: "btn sm " + (lk === k ? "" : "ghost"), onclick: () => { lk = k; render(); } }, k === "all" ? "All" : k === "dba" ? "DBAs" : "Pipelines"))), vis.length ? h("ul", { class: "list" }, vis.slice(0, 60).map(row)) : empty("Nothing logged yet.")));
}

export const alTabs = [
  { id: "tracker", label: "Tracker", render: tracker }, { id: "todo", label: "To-do", render: todo }, { id: "log", label: "Log", render: log }, { id: "news", label: "News", render: staffNews }, { id: "notes", label: "Notes", render: workNotes },
];
