// Browser-side live refresh for sources that allow CORS (weather, sports) + news via rss2json when the repo data is old.
const WMO = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Freezing fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Rain showers", 81: "Rain showers", 82: "Violent showers", 85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm, hail", 99: "Thunderstorm, hail" };
const j = async (u, ms = 9000) => { const r = await fetch(u, { signal: AbortSignal.timeout(ms) }); if (!r.ok) throw new Error(r.status); return r.json(); };
const rd = (n) => (n == null ? null : Math.round(n));

export async function liveWeather() {
  const u = "https://api.open-meteo.com/v1/forecast?latitude=42.4801&longitude=-71.1062&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=7";
  const w = await j(u), c = w.current, hrs = w.hourly, d = w.daily;
  const nowIdx = Math.max(0, hrs.time.findIndex((t) => t >= c.time.slice(0, 13)));
  return { updated: new Date().toISOString(), live: true, location: "Stoneham, MA", current: { temp: rd(c.temperature_2m), feels: rd(c.apparent_temperature), humidity: c.relative_humidity_2m, wind: rd(c.wind_speed_10m), code: c.weather_code, desc: WMO[c.weather_code] || "", isDay: !!c.is_day },
    hourly: hrs.time.slice(nowIdx, nowIdx + 24).map((t, i) => ({ t, temp: rd(hrs.temperature_2m[nowIdx + i]), rain: hrs.precipitation_probability[nowIdx + i], code: hrs.weather_code[nowIdx + i] })),
    daily: d.time.map((t, i) => ({ d: t, hi: rd(d.temperature_2m_max[i]), lo: rd(d.temperature_2m_min[i]), rain: d.precipitation_probability_max[i], code: d.weather_code[i], desc: WMO[d.weather_code[i]] || "", sunrise: d.sunrise[i], sunset: d.sunset[i] })) };
}

const LEAGUES = [{ key: "nba", path: "basketball/nba", team: "bos", teamName: "Celtics", emoji: "🏀" }, { key: "nhl", path: "hockey/nhl", team: "bos", teamName: "Bruins", emoji: "🏒" }, { key: "nfl", path: "football/nfl", team: "ne", teamName: "Patriots", emoji: "🏈" }, { key: "mlb", path: "baseball/mlb", team: "bos", teamName: "Red Sox", emoji: "⚾" }];
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/";
const scoreOf = (c) => (typeof c?.score === "object" ? c.score?.displayValue ?? c.score?.value : c?.score);
function shapeEvent(ev) {
  const comp = ev.competitions?.[0]; if (!comp) return null; const st = comp.status?.type || ev.status?.type || {};
  const teams = (comp.competitors || []).map((c) => ({ home: c.homeAway === "home", abbr: c.team?.abbreviation, name: c.team?.displayName || c.team?.shortDisplayName, logo: c.team?.logo || c.team?.logos?.[0]?.href, score: scoreOf(c) ?? null, winner: !!c.winner, record: c.records?.[0]?.summary || null }));
  return { id: ev.id, date: ev.date, name: ev.shortName || ev.name, state: st.state || "pre", detail: st.shortDetail || st.detail || "", done: !!st.completed, teams };
}
export async function liveSports(prev) {
  const out = { updated: new Date().toISOString(), live: true, leagues: {}, errors: [] };
  await Promise.all(LEAGUES.map(async (L) => {
    const res = { key: L.key, emoji: L.emoji, teamName: L.teamName, record: null, results: [], next: [], slate: [] };
    const [tm, sch, sb] = await Promise.allSettled([j(`${ESPN}${L.path}/teams/${L.team}`), j(`${ESPN}${L.path}/teams/${L.team}/schedule`), j(`${ESPN}${L.path}/scoreboard`)]);
    if (tm.status === "fulfilled") res.record = tm.value.team?.record?.items?.[0]?.summary || null;
    if (sch.status === "fulfilled") { const evs = (sch.value.events || []).map(shapeEvent).filter(Boolean).sort((a, b) => (a.date < b.date ? -1 : 1)); res.results = evs.filter((e) => e.done).slice(-5).reverse(); res.next = evs.filter((e) => !e.done && e.state !== "in").slice(0, 5); const lv = evs.find((e) => e.state === "in"); if (lv) res.live = lv; }
    if (sb.status === "fulfilled") res.slate = (sb.value.events || []).map(shapeEvent).filter(Boolean).slice(0, 16);
    out.leagues[L.key] = res.results.length || res.next.length || res.slate.length ? res : prev?.leagues?.[L.key] || res;
  }));
  if (Object.values(out.leagues).every((l) => !l.results?.length && !l.next?.length && !l.slate?.length)) throw new Error("no sports");
  return out;
}

const GN = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
const FEEDS = {
  politics: [["CBS News", "C", "https://www.cbsnews.com/latest/rss/politics"], ["Fox News", "R", "https://moxie.foxnews.com/google-publisher/politics.xml"], ["NPR", "C", "https://feeds.npr.org/1014/rss.xml"], ["The Guardian US", "L", "https://www.theguardian.com/us-news/us-politics/rss"], ["NY Post", "R", "https://nypost.com/politics/feed/"], ["BBC US", "C", "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml"]],
  trending: [["Google News", null, "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"], ["BBC", "C", "https://feeds.bbci.co.uk/news/rss.xml"], ["Fox News", "R", "https://moxie.foxnews.com/google-publisher/latest.xml"], ["CBS News", "C", "https://www.cbsnews.com/latest/rss/main"]],
  business: [["CNBC", "C", "https://www.cnbc.com/id/10001147/device/rss/rss.html"], ["Fox Business", "R", "https://moxie.foxbusiness.com/google-publisher/latest.xml"], ["Business Insider", "L", "https://feeds.businessinsider.com/custom/all"]],
  finance: [["CNBC Markets", "C", "https://www.cnbc.com/id/20910258/device/rss/rss.html"], ["MarketWatch (GN)", "C", GN("site:marketwatch.com stocks when:1d")]],
  staffing: [["Staffing (GN)", null, GN('"staffing industry" OR "staffing firms" OR "engineering staffing" when:3d')], ["Hiring (GN)", null, GN("hiring labor market jobs report staffing when:2d")]],
  boston: [["Boston Globe (GN)", "L", GN("site:bostonglobe.com when:1d")], ["Boston Herald (GN)", "R", GN("site:bostonherald.com when:1d")], ["Boston (GN)", null, GN("Boston Massachusetts when:1d")]],
};
export async function liveNews(prev) {
  const sections = {}, errors = [];
  await Promise.all(Object.entries(FEEDS).map(async ([sec, list]) => {
    const rs = await Promise.allSettled(list.map(([src, lean, url]) => j("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(url), 12000).then((r) => (r.items || []).slice(0, 12).map((i) => ({ t: i.title, url: i.link, ts: Date.parse(i.pubDate.replace(" ", "T") + "Z") || Date.now(), summary: String(i.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200), src, lean })))));
    const by = {}; rs.forEach((r) => r.status === "fulfilled" && r.value.sort((a, b) => b.ts - a.ts).forEach((i) => (by[i.src] ||= []).push(i)));
    const lists = Object.values(by), mixed = [], seen = new Set();
    for (let n = 0; mixed.length < 30 && lists.some((l) => l[n]); n++) for (const l of lists) if (l[n]) { const k = l[n].t.toLowerCase().replace(/[^a-z0-9]+/g, " ").slice(0, 70); if (!seen.has(k)) { seen.add(k); mixed.push(l[n]); } }
    sections[sec] = mixed.length ? mixed : prev?.sections?.[sec] || [];
  }));
  if (!Object.values(sections).some((a) => a.length)) throw new Error("no news");
  return { updated: new Date().toISOString(), live: true, errors, sections };
}
