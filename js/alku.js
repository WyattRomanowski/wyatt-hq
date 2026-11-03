// ALKU (work) mode: black / red / white, narrow, work-safe. DBAs + pipelines only.
import { h, store, uid, ymd, addDays, weekStart, parse, quarterOf, ago, ring, barChart, card, toast, MONTHS } from "./core.js";
import { newsLi } from "./views.js";

const TARGET = { dba: 6, pipe: 2 };
let wk = weekStart();
const empty = (t) => h("div", { class: "empty" }, t);
const getW = (d) => store.get("alku", {})[ymd(d)] || { dba: 0, pipe: 0 };
function setW(d, k, v) { const a = store.get("alku", {}); const w = a[ymd(d)] || { dba: 0, pipe: 0 }; w[k] = Math.max(0, v); a[ymd(d)] = w; store.set("alku", a); }

function tracker({ render }) {
  const cur = getW(wk), isNow = ymd(wk) === ymd(weekStart()), q = quarterOf(wk), a = store.get("alku", {});
  // weeks in this quarter up to now
  let qd = 0, qp = 0, weeks = 0;
  for (let d = weekStart(q.start); d <= q.end; d = addDays(d, 7)) { if (d > new Date()) break; const w = a[ymd(d)]; weeks++; qd += w?.dba || 0; qp += w?.pipe || 0; }
  const wkLabel = `${wk.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(wk, 6).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  const step = (k, label) => h("div", { class: "ringl" }, ring(cur[k] / TARGET[k], { size: 118, label: `${cur[k]}/${TARGET[k]}`, sub: label, color: cur[k] >= TARGET[k] ? "var(--ink)" : "var(--accent)" }),
    h("div", { class: "stepper", style: { marginTop: "8px" } }, h("button", { onclick: () => { setW(wk, k, cur[k] - 1); render(); } }, "−"), h("button", { onclick: () => { setW(wk, k, cur[k] + 1); render(); } }, "+")));
  const bars = Array.from({ length: 13 }, (_, i) => { const d = addDays(weekStart(), (i - 12) * 7), w = a[ymd(d)] || { dba: 0, pipe: 0 }; return { l: `${d.getMonth() + 1}/${d.getDate()}`, v: w.dba, dim: ymd(d) !== ymd(wk), color: w.dba >= TARGET.dba ? "#ededed" : "var(--accent)" }; });
  const pbars = Array.from({ length: 13 }, (_, i) => { const d = addDays(weekStart(), (i - 12) * 7), w = a[ymd(d)] || { pipe: 0 }; return { l: `${d.getMonth() + 1}/${d.getDate()}`, v: w.pipe, dim: ymd(d) !== ymd(wk), color: w.pipe >= TARGET.pipe ? "#ededed" : "var(--accent)" }; });
  const paceD = weeks ? (qd / weeks).toFixed(1) : "0.0", paceP = weeks ? (qp / weeks).toFixed(1) : "0.0";
  return h("div", { class: "grid" },
    card(`Week · ${wkLabel}`, "", h("div", { class: "row", style: { justifyContent: "space-between", marginBottom: "10px" } }, h("button", { class: "btn sm ghost", onclick: () => { wk = addDays(wk, -7); render(); } }, "‹ Prev"), isNow ? h("span", { class: "chip" }, "This week") : h("button", { class: "btn sm ghost", onclick: () => { wk = weekStart(); render(); } }, "This week"), h("button", { class: "btn sm ghost", onclick: () => { wk = addDays(wk, 7); render(); } }, "Next ›")),
      h("div", { class: "ring-wrap" }, step("dba", "DBAs"), step("pipe", "Pipelines"))),
    card(`Q${q.q} ${q.y} · ${MONTHS[q.start.getMonth()].slice(0, 3)}–${MONTHS[q.end.getMonth()].slice(0, 3)}`, "", h("div", { class: "ring-wrap" }, h("div", { class: "ringl" }, h("b", {}, qd), "DBAs"), h("div", { class: "ringl" }, h("b", {}, qp), "Pipelines"), h("div", { class: "ringl" }, h("b", {}, `${paceD} / ${paceP}`), "avg per week")),
      h("div", { class: "src", style: { marginTop: "10px" } }, `Target ${TARGET.dba} DBAs + ${TARGET.pipe} pipelines per week · quarter pace ${Math.round(weeks ? (qd / (weeks * TARGET.dba)) * 100 : 0)}% / ${Math.round(weeks ? (qp / (weeks * TARGET.pipe)) * 100 : 0)}%`),
      h("div", { class: "bar", style: { marginTop: "8px" } }, h("i", { style: { width: Math.min(100, weeks ? (qd / (weeks * TARGET.dba)) * 100 : 0) + "%" } }))),
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

export const alTabs = [
  { id: "tracker", label: "Tracker", render: tracker }, { id: "todo", label: "To-do", render: todo }, { id: "news", label: "News", render: staffNews }, { id: "notes", label: "Notes", render: workNotes },
];
