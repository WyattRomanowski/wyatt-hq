// Refreshes every live-data file in ../data. Runs in GitHub Actions on a schedule (Node 20+, no dependencies).
// Each module is independent: if one source fails, the previous file is kept and flagged stale, the others still update.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const UA = "Mozilla/5.0 (compatible; WyattHQ/1.0; +https://github.com/WyattRomanowski/wyatt-hq)";
const TZ = "America/New_York";

/* ---------- helpers ---------- */
export async function get(url, { json = false, timeout = 15000, headers = {} } = {}) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*", ...headers }, signal: AbortSignal.timeout(timeout), redirect: "follow" });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return json ? r.json() : r.text();
}
const read = async f => { try { return JSON.parse(await readFile(path.join(DATA, f), "utf8")); } catch { return null; } };
const write = async (f, v) => { await mkdir(DATA, { recursive: true }); await writeFile(path.join(DATA, f), JSON.stringify(v, null, 1) + "\n"); };
const nowISO = () => new Date().toISOString();
const round = (n, d = 2) => (n == null || Number.isNaN(+n) ? null : Math.round(+n * 10 ** d) / 10 ** d);
const decode = s => String(s ?? "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, " ");
const strip = s => decode(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
async function settle(tasks) { return Promise.all(tasks.map(t => t.catch(e => ({ __err: String(e.message || e) })))); }

/* ---------- RSS / Atom ---------- */
export function parseFeed(xml, max = 20) {
  const out = [];
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/g) || [];
  for (const it of items) {
    const tag = n => { const m = it.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, "i")); return m ? m[1] : ""; };
    let link = strip(tag("link"));
    if (!link) { const m = it.match(/<link[^>]*href=["']([^"']+)["']/i); link = m ? decode(m[1]) : ""; }
    const t = strip(tag("title"));
    if (!t) continue;
    const when = tag("pubDate") || tag("published") || tag("updated") || tag("dc:date");
    const ts = Date.parse(strip(when)) || 0;
    const desc = strip(tag("description") || tag("summary") || tag("content:encoded")).slice(0, 240);
    out.push({ t, url: link, ts, summary: desc });
    if (out.length >= max) break;
  }
  return out;
}

const GN = q => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
// lean: L / C / R (omit for trade press). Spread across the spectrum on purpose.
export const NEWS_SOURCES = {
  politics: [
    { src: "CBS News", lean: "C", url: "https://www.cbsnews.com/latest/rss/politics" },
    { src: "Fox News", lean: "R", url: "https://moxie.foxnews.com/google-publisher/politics.xml" },
    { src: "HuffPost", lean: "L", url: "https://www.huffpost.com/section/politics/feed" },
    { src: "NPR", lean: "C", url: "https://feeds.npr.org/1014/rss.xml" },
    { src: "Washington Examiner", lean: "R", url: "https://www.washingtonexaminer.com/feed" },
    { src: "The Guardian US", lean: "L", url: "https://www.theguardian.com/us-news/us-politics/rss" },
    { src: "The Hill", lean: "C", url: "https://thehill.com/feed/" },
    { src: "NY Post", lean: "R", url: "https://nypost.com/politics/feed/" },
    { src: "BBC US", lean: "C", url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml" },
    { src: "Politico", lean: "C", url: "https://rss.politico.com/politics-news.xml" },
  ],
  business: [
    { src: "Fox Business", lean: "R", url: "https://moxie.foxbusiness.com/google-publisher/latest.xml" },
    { src: "CNBC", lean: "C", url: "https://www.cnbc.com/id/10001147/device/rss/rss.html" },
    { src: "MarketWatch", lean: "C", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
    { src: "Business Insider", lean: "L", url: "https://feeds.businessinsider.com/custom/all" },
  ],
  finance: [
    { src: "CNBC Markets", lean: "C", url: "https://www.cnbc.com/id/20910258/device/rss/rss.html" },
    { src: "Yahoo Finance (GN)", lean: "C", url: GN("site:finance.yahoo.com when:1d") },
    { src: "MarketWatch (GN)", lean: "C", url: GN("site:marketwatch.com stocks when:1d") },
  ],
  trending: [
    { src: "Google News", url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en" },
    { src: "BBC", lean: "C", url: "https://feeds.bbci.co.uk/news/rss.xml" },
    { src: "Fox News", lean: "R", url: "https://moxie.foxnews.com/google-publisher/latest.xml" },
    { src: "CBS News", lean: "C", url: "https://www.cbsnews.com/latest/rss/main" },
  ],
  staffing: [
    { src: "Staffing Industry (Google News)", url: GN('"staffing industry" OR "staffing firms" OR "engineering staffing" when:3d') },
    { src: "Hiring & labor (Google News)", url: GN('hiring labor market jobs report staffing when:2d') },
    { src: "SIA (GN)", url: GN("site:staffingindustry.com when:7d") },
    { src: "Recruiter.com", url: "https://www.recruiter.com/feed/" },
  ],
  boston: [
    { src: "Boston Globe", lean: "L", url: GN("site:bostonglobe.com when:1d") },
    { src: "Boston Herald", lean: "R", url: GN("site:bostonherald.com when:1d") },
    { src: "Boston (Google News)", url: GN("Boston Massachusetts when:1d") },
  ],
};

async function newsModule() {
  const prev = (await read("news.json")) || { sections: {} };
  const sections = {};
  const errors = [];
  for (const [sec, sources] of Object.entries(NEWS_SOURCES)) {
    const results = await settle(sources.map(async s => {
      const xml = await get(s.url, { timeout: 14000 });
      return parseFeed(xml, 12).map(i => ({ ...i, src: s.src, lean: s.lean || null }));
    }));
    let items = [];
    results.forEach((r, i) => { if (r.__err) errors.push(`${sources[i].src}: ${r.__err}`); else items = items.concat(r); });
    // dedupe by normalized headline
    const seen = new Set();
    items = items.filter(i => { const k = i.t.toLowerCase().replace(/[^a-z0-9]+/g, " ").slice(0, 70); if (seen.has(k)) return false; seen.add(k); return true; });
    // interleave sources so one outlet does not dominate: newest first within each source, round-robin
    const by = {};
    for (const i of items.sort((a, b) => b.ts - a.ts)) (by[i.src] ||= []).push(i);
    const lists = Object.values(by), mixed = [];
    for (let n = 0; mixed.length < 30 && lists.some(l => l[n]); n++) for (const l of lists) if (l[n]) mixed.push(l[n]);
    sections[sec] = mixed.length ? mixed : (prev.sections?.[sec] || []);
    if (!mixed.length) errors.push(`${sec}: no items, kept previous`);
  }
  const fresh = Object.values(sections).some(a => a.length);
  if (!fresh) throw new Error("all news sources failed");
  return { updated: nowISO(), errors, sections };
}

/* ---------- weather (Open-Meteo, no key) ---------- */
export const WMO = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Freezing fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Rain showers", 81: "Rain showers", 82: "Violent showers", 85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm, hail", 99: "Thunderstorm, hail" };
async function weatherModule() {
  const lat = 42.4801, lon = -71.1062;
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=${encodeURIComponent(TZ)}&forecast_days=7`;
  const w = await get(u, { json: true });
  const c = w.current, hrs = w.hourly, d = w.daily;
  const nowIdx = Math.max(0, hrs.time.findIndex(t => t >= c.time.slice(0, 13)));
  return {
    updated: nowISO(), location: "Stoneham, MA",
    current: { temp: round(c.temperature_2m, 0), feels: round(c.apparent_temperature, 0), humidity: c.relative_humidity_2m, wind: round(c.wind_speed_10m, 0), code: c.weather_code, desc: WMO[c.weather_code] || "", isDay: !!c.is_day },
    hourly: hrs.time.slice(nowIdx, nowIdx + 24).map((t, i) => ({ t, temp: round(hrs.temperature_2m[nowIdx + i], 0), rain: hrs.precipitation_probability[nowIdx + i], code: hrs.weather_code[nowIdx + i] })),
    daily: d.time.map((t, i) => ({ d: t, hi: round(d.temperature_2m_max[i], 0), lo: round(d.temperature_2m_min[i], 0), rain: d.precipitation_probability_max[i], code: d.weather_code[i], desc: WMO[d.weather_code[i]] || "", sunrise: d.sunrise[i], sunset: d.sunset[i] })),
  };
}

/* ---------- market quotes ---------- */
export const SYMBOLS = [
  { sym: "VTI", name: "Vanguard Total Market", y: "VTI", s: "vti.us", w: 4 },
  { sym: "VXUS", name: "Vanguard Intl", y: "VXUS", s: "vxus.us", w: 1 },
  { sym: "TSLA", name: "Tesla", y: "TSLA", s: "tsla.us", w: 3 },
  { sym: "NVDA", name: "Nvidia", y: "NVDA", s: "nvda.us", w: 2 },
  { sym: "AMZN", name: "Amazon", y: "AMZN", s: "amzn.us", w: 2 },
  { sym: "GOLD", name: "Gold /oz", y: "GC=F", s: "xauusd", w: 1 },
  { sym: "SPX", name: "S&P 500", y: "^GSPC", s: "^spx", w: 0 },
  { sym: "NDX", name: "Nasdaq", y: "^IXIC", s: "^ndq", w: 0 },
  { sym: "DJI", name: "Dow", y: "^DJI", s: "^dji", w: 0 },
  { sym: "BTC", name: "Bitcoin", y: "BTC-USD", s: "btcusd", w: 0 },
];
function shape(sym, closes, price, prev, time) {
  const cl = closes.filter(x => x != null).slice(-90).map(x => round(x, 2));
  const p = price ?? cl.at(-1), pv = prev ?? cl.at(-2);
  return { sym: sym.sym, name: sym.name, w: sym.w, price: round(p, 2), chg: round(p - pv, 2), pct: pv ? round(((p - pv) / pv) * 100, 2) : 0, closes: cl, time: time || null };
}
async function yahoo(sym) {
  const j = await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym.y)}?range=6mo&interval=1d`, { json: true });
  const r = j.chart?.result?.[0]; if (!r) throw new Error("no result " + sym.y);
  const cl = r.indicators.quote[0].close;
  const m = r.meta;
  // chartPreviousClose is the close BEFORE the 6-month window, so derive the real previous close from the daily bars instead.
  const ts = r.timestamp || [], day = (t) => new Date(t * 1000).toISOString().slice(0, 10), lastBar = ts.length ? day(ts[ts.length - 1]) : null, liveDay = m.regularMarketTime ? day(m.regularMarketTime) : null;
  const valid = cl.filter((x) => x != null), prevClose = lastBar && liveDay && lastBar === liveDay ? valid[valid.length - 2] : valid[valid.length - 1];
  return shape(sym, cl, m.regularMarketPrice, prevClose ?? m.previousClose, m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : null);
}
async function stooq(sym) {
  const csv = await get(`https://stooq.com/q/d/l/?s=${encodeURIComponent(sym.s)}&i=d`);
  const rows = csv.trim().split("\n").slice(1).map(l => l.split(","));
  if (rows.length < 2) throw new Error("stooq empty " + sym.s);
  return shape(sym, rows.map(r => parseFloat(r[4])), null, null, rows.at(-1)[0]);
}
async function quotesModule() {
  const prev = await read("quotes.json");
  const items = [], errors = [];
  for (const s of SYMBOLS) {
    try { items.push(await yahoo(s)); }
    catch (e1) {
      try { items.push(await stooq(s)); }
      catch (e2) { errors.push(`${s.sym}: ${e1.message} / ${e2.message}`); const old = prev?.items?.find(x => x.sym === s.sym); if (old) items.push({ ...old, stale: true }); }
    }
  }
  if (!items.length || items.every(i => i.stale)) throw new Error("no quotes: " + errors.join("; "));
  return { updated: nowISO(), errors, items };
}

/* ---------- sports (ESPN public endpoints) ---------- */
const LEAGUES = [
  { key: "nba", path: "basketball/nba", team: "bos", teamName: "Celtics", emoji: "🏀" },
  { key: "nhl", path: "hockey/nhl", team: "bos", teamName: "Bruins", emoji: "🏒" },
  { key: "nfl", path: "football/nfl", team: "ne", teamName: "Patriots", emoji: "🏈" },
  { key: "mlb", path: "baseball/mlb", team: "bos", teamName: "Red Sox", emoji: "⚾" },
];
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/";
const scoreOf = c => (typeof c?.score === "object" ? c.score?.displayValue ?? c.score?.value : c?.score);
function shapeEvent(ev) {
  const comp = ev.competitions?.[0]; if (!comp) return null;
  const st = comp.status?.type || ev.status?.type || {};
  const teams = (comp.competitors || []).map(c => ({ home: c.homeAway === "home", abbr: c.team?.abbreviation, name: c.team?.displayName || c.team?.shortDisplayName, logo: c.team?.logo || c.team?.logos?.[0]?.href, score: scoreOf(c) ?? null, winner: !!c.winner, record: c.records?.[0]?.summary || null }));
  return { id: ev.id, date: ev.date, name: ev.shortName || ev.name, state: st.state || "pre", detail: st.shortDetail || st.detail || "", done: !!st.completed, teams };
}
export function ymd(d) { return d.toISOString().slice(0, 10).replace(/-/g, ""); }
async function sportsModule() {
  const prev = await read("sports.json");
  const out = { updated: nowISO(), leagues: {}, errors: [] };
  const today = new Date();
  for (const L of LEAGUES) {
    const res = { key: L.key, emoji: L.emoji, teamName: L.teamName, record: null, results: [], next: [], slate: [] };
    try {
      const [tm, sch, sb] = await settle([
        get(`${ESPN}${L.path}/teams/${L.team}`, { json: true }),
        get(`${ESPN}${L.path}/teams/${L.team}/schedule`, { json: true }),
        get(`${ESPN}${L.path}/scoreboard`, { json: true }),
      ]);
      if (!tm.__err) res.record = tm.team?.record?.items?.[0]?.summary || null;
      if (!sch.__err) {
        const evs = (sch.events || []).map(shapeEvent).filter(Boolean).sort((a, b) => a.date < b.date ? -1 : 1);
        res.results = evs.filter(e => e.done).slice(-5).reverse();
        res.next = evs.filter(e => !e.done && e.state !== "in").slice(0, 5);
        const live = evs.find(e => e.state === "in"); if (live) res.live = live;
      } else out.errors.push(`${L.key} schedule: ${sch.__err}`);
      if (!sb.__err) res.slate = (sb.events || []).map(shapeEvent).filter(Boolean).slice(0, 16);
      else out.errors.push(`${L.key} scoreboard: ${sb.__err}`);
    } catch (e) { out.errors.push(`${L.key}: ${e.message}`); }
    const old = prev?.leagues?.[L.key];
    if (!res.results.length && !res.next.length && !res.slate.length && old) { out.leagues[L.key] = { ...old, stale: true }; }
    else out.leagues[L.key] = res;
  }
  if (Object.values(out.leagues).every(l => !l.results.length && !l.next.length && !l.slate.length)) throw new Error("ESPN returned nothing: " + out.errors.join("; "));
  return out;
}

/* ---------- joke / fact / quote ---------- */
async function funModule() {
  const prev = (await read("fun.json")) || {};
  const out = { updated: nowISO(), joke: prev.joke || null, fact: prev.fact || null, quote: prev.quote || null };
  const [j, f, q] = await settle([
    get("https://v2.jokeapi.dev/joke/Pun,Misc?safe-mode&type=single&blacklistFlags=nsfw,religious,political,racist,sexist,explicit", { json: true }),
    get("https://uselessfacts.jsph.pl/api/v2/facts/today", { json: true }),
    get("https://zenquotes.io/api/today", { json: true }),
  ]);
  if (!j.__err && j.joke) out.joke = j.joke.replace(/\s+/g, " ");
  if (!f.__err && f.text) out.fact = f.text;
  if (!q.__err && q[0]?.q) out.quote = { text: q[0].q, author: q[0].a };
  if (j.__err && f.__err && q.__err) throw new Error("fun sources failed");
  return out;
}

/* ---------- runner ---------- */
const MODULES = { weather: weatherModule, quotes: quotesModule, sports: sportsModule, news: newsModule, fun: funModule };

export async function main(only) {
  const meta = (await read("meta.json")) || { modules: {} };
  const names = only?.length ? only : Object.keys(MODULES);
  for (const n of names) {
    const at = nowISO();
    try {
      const data = await MODULES[n]();
      await write(`${n}.json`, data);
      meta.modules[n] = { ok: true, at, errors: (data.errors || []).length };
      console.log(`ok   ${n}${data.errors?.length ? ` (${data.errors.length} source errors)` : ""}`);
    } catch (e) {
      meta.modules[n] = { ...(meta.modules[n] || {}), ok: false, failedAt: at, error: String(e.message || e).slice(0, 300) };
      console.error(`FAIL ${n}: ${e.message}`);
    }
  }
  meta.updated = nowISO();
  await write("meta.json", meta);
  return meta;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const only = process.argv.slice(2);
  main(only).then(m => { const v = Object.values(m.modules); process.exit(v.length && v.every(x => x.ok === false) ? 1 : 0); });
}
