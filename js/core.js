// Core helpers: DOM, storage, formatting, SVG charts, UI primitives. No dependencies.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export function h(tag, a, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (v === true) e.setAttribute(k, "");
    else e.setAttribute(k, v);
  }
  for (const k of kids.flat(9)) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
export const svg = (s) => { const t = document.createElement("template"); t.innerHTML = s.trim(); return t.content.firstChild; };

/* ---- storage (personal data lives only in this browser) ---- */
const P = "whq:";
export const store = {
  get(k, d) { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch {} },
  all() { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(P)) o[k.slice(P.length)] = JSON.parse(localStorage.getItem(k)); } } catch {} return o; },
  load(o) { for (const [k, v] of Object.entries(o || {})) this.set(k, v); },
};
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

/* ---- dates ---- */
export const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const weekStart = (d = new Date()) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const quarterOf = (d = new Date()) => ({ q: Math.floor(d.getMonth() / 3) + 1, y: d.getFullYear(), start: new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1), end: new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0) });
export function ago(iso) {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "just now"; if (m < 60) return m + " min ago";
  const hr = Math.round(m / 60); if (hr < 36) return hr + " hr ago";
  return Math.round(hr / 24) + " d ago";
}
export const money = (n, dec = 0) => (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const sgn = (n) => (n > 0 ? "+" : "") + n.toFixed(2);
export const clock = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export const dayShort = (iso) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/* ---- data fetch (relative URLs; cache-busted) ---- */
export async function load(name) {
  try { const r = await fetch(`./data/${name}.json?t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" }); if (!r.ok) throw 0; return await r.json(); } catch { return null; }
}

/* ---- SVG charts ---- */
const NS = "http://www.w3.org/2000/svg";
const vals = (a) => a.filter((x) => x != null && !isNaN(x));
export function spark(data, { w = 110, h: ht = 34, color } = {}) {
  data = vals(data); if (data.length < 2) return h("span");
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const up = data[data.length - 1] >= data[0], c = color || (up ? "var(--gain)" : "var(--loss)");
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, ht - 3 - ((v - mn) / r) * (ht - 6)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
  const id = "g" + uid();
  return svg(`<svg width="${w}" height="${ht}" viewBox="0 0 ${w} ${ht}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs><path d="${d}L${w} ${ht}L0 ${ht}Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
}
// Generic line/area chart with axes. series:[{name,data:[{x,y}],color}], xl: label fn for x, opts.bars adds rain bars
export function lineChart(points, { w = 560, h: ht = 190, xlabel = (p) => p.x, ylabel = (v) => Math.round(v), color = "var(--accent)", bars = null, ticks = 5, yfmt } = {}) {
  const ys = points.map((p) => p.y), mn = Math.min(...ys), mx = Math.max(...ys), pad_ = (mx - mn || 1) * 0.15;
  const lo = mn - pad_, hi = mx + pad_, L = 42, R = 10, T = 12, B = 26, iw = w - L - R, ih = ht - T - B;
  const X = (i) => L + (i / Math.max(1, points.length - 1)) * iw, Y = (v) => T + ih - ((v - lo) / (hi - lo)) * ih;
  const line = points.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.y).toFixed(1)).join("");
  const id = "a" + uid();
  let g = "";
  for (let i = 0; i <= 3; i++) { const v = lo + ((hi - lo) * i) / 3, y = Y(v); g += `<line x1="${L}" x2="${w - R}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${(yfmt || ylabel)(v)}</text>`; }
  const step = Math.max(1, Math.ceil(points.length / ticks));
  points.forEach((p, i) => { if (i % step === 0) g += `<text x="${X(i)}" y="${ht - 6}" text-anchor="middle" font-size="10" fill="var(--muted)">${xlabel(p, i)}</text>`; });
  let b = "";
  if (bars) points.forEach((p, i) => { const v = bars[i] || 0, bh = (v / 100) * ih * 0.45; b += `<rect x="${X(i) - 3}" y="${T + ih - bh}" width="6" height="${bh}" rx="2" fill="var(--a3)" opacity=".28"/>`; });
  const dots = points.length <= 40 ? points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.y)}" r="2.6" fill="${color}"><title>${xlabel(p, i)}: ${(yfmt || ylabel)(p.y)}</title></circle>`).join("") : "";
  return svg(`<svg viewBox="0 0 ${w} ${ht}" width="100%" style="display:block;max-height:${ht + 20}px"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".4"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${g}${b}<path d="${line}L${X(points.length - 1)} ${T + ih}L${L} ${T + ih}Z" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`);
}
export function barChart(items, { w = 520, h: ht = 160, max, target, color = "var(--accent)" } = {}) {
  const mx = max || Math.max(1, ...items.map((i) => i.v), target || 0), L = 8, B = 24, T = 14, iw = w - L * 2, ih = ht - T - B, bw = iw / items.length;
  let g = "";
  items.forEach((it, i) => { const bh = (it.v / mx) * ih, x = L + i * bw + bw * 0.16; g += `<rect x="${x}" y="${T + ih - bh}" width="${bw * 0.68}" height="${Math.max(bh, 1)}" rx="5" fill="${it.color || color}" opacity="${it.dim ? 0.45 : 1}"><title>${it.l}: ${it.v}</title></rect><text x="${x + bw * 0.34}" y="${T + ih - bh - 4}" text-anchor="middle" font-size="10" fill="var(--ink)">${it.v || ""}</text><text x="${x + bw * 0.34}" y="${ht - 8}" text-anchor="middle" font-size="9.5" fill="var(--muted)">${it.l}</text>`; });
  if (target) { const y = T + ih - (target / mx) * ih; g += `<line x1="${L}" x2="${w - L}" y1="${y}" y2="${y}" stroke="var(--target,var(--warn))" stroke-dasharray="5 4"/><text x="${w - L}" y="${y - 4}" text-anchor="end" font-size="10" fill="var(--target,var(--warn))">target ${target}</text>`; }
  return svg(`<svg viewBox="0 0 ${w} ${ht}" width="100%" style="display:block">${g}</svg>`);
}
export function ring(pct, { size = 110, label = "", sub = "", color = "var(--accent)", stroke = 11 } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  const e = svg(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface2)" stroke-width="${stroke}"/><circle class="arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)"/><text x="50%" y="${sub ? "46%" : "52%"}" text-anchor="middle" dominant-baseline="middle" font-size="${size * 0.22}" font-weight="700" fill="var(--ink)">${label}</text>${sub ? `<text x="50%" y="66%" text-anchor="middle" font-size="${size * 0.1}" fill="var(--muted)">${sub}</text>` : ""}</svg>`);
  requestAnimationFrame(() => requestAnimationFrame(() => { const a = e.querySelector(".arc"); if (a) a.style.strokeDashoffset = c * (1 - p); }));
  return e;
}
export function donut(parts, { size = 150 } = {}) {
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1, r = size / 2 - 12, c = 2 * Math.PI * r; let off = 0, s = "";
  for (const p of parts) { const len = (p.v / tot) * c; s += `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.color}" stroke-width="18" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"><title>${p.l}: ${p.v}</title></circle>`; off += len; }
  return svg(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${s}</svg>`);
}
export function heat(map, { weeks = 18, color = "var(--accent)" } = {}) {
  const end = new Date(), start = weekStart(addDays(end, -7 * (weeks - 1))); let s = "";
  for (let w = 0; w < weeks; w++) for (let d = 0; d < 7; d++) {
    const dt = addDays(start, w * 7 + d); if (dt > end) continue;
    const v = map[ymd(dt)] || 0;
    s += `<rect x="${w * 14}" y="${d * 14}" width="11" height="11" rx="3" fill="${v ? color : "var(--surface2)"}" opacity="${v ? 0.35 + Math.min(0.65, v * 0.3) : 1}"><title>${ymd(dt)}: ${v}</title></rect>`;
  }
  return svg(`<svg viewBox="0 0 ${weeks * 14} 98" width="100%" style="display:block;max-width:${weeks * 14 * 1.4}px">${s}</svg>`);
}

/* ---- UI primitives ---- */
export function toast(msg, ms = 2400) { const t = h("div", { class: "toast" }, msg); document.body.append(t); setTimeout(() => t.remove(), ms); }
export function modal(title, body, actions = []) {
  const m = h("div", { class: "modal", onclick: (e) => e.target === m && m.remove() }, h("div", { class: "m" }, h("h2", {}, title), body, h("div", { class: "row", style: { marginTop: "16px", justifyContent: "flex-end" } }, actions.map((a) => h("button", { class: "btn " + (a.ghost ? "ghost" : ""), onclick: () => { if (a.fn?.() !== false) m.remove(); } }, a.t)))));
  document.body.append(m); return m;
}
export function card(title, icon, ...kids) {
  const c = h("section", { class: "card" }, h("h3", {}, icon ? h("span", { class: "ic" }, icon) : null, title), ...kids);
  return c;
}
export function download(name, text, type = "application/json") {
  const a = h("a", { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); a.remove();
}
export const debounce = (f, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
