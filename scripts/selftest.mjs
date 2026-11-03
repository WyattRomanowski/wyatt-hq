// Offline self-test: mocks every network call and checks the pipeline writes valid files.
import { rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
const rss = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[Senate passes &amp; sends bill]]></title><link>https://ex.com/a</link><pubDate>Mon, 02 Nov 2026 12:00:00 GMT</pubDate><description><![CDATA[<p>Summary here</p>]]></description></item><item><title>Second story</title><link>https://ex.com/b</link><pubDate>Mon, 02 Nov 2026 11:00:00 GMT</pubDate></item></channel></rss>`;
const atom = `<feed><entry><title>Atom one</title><link href="https://ex.com/c"/><updated>2026-11-02T10:00:00Z</updated><summary>S</summary></entry></feed>`;
const mk = (body, json) => ({ ok: true, status: 200, text: async () => (json ? JSON.stringify(body) : body), json: async () => body });
const hours = Array.from({ length: 48 }, (_, i) => `2026-11-03T${String(i % 24).padStart(2, "0")}:00`);
globalThis.fetch = async (url) => {
  url = String(url);
  if (url.includes("open-meteo")) return mk({ current: { time: "2026-11-03T06:45", temperature_2m: 41.2, apparent_temperature: 36, relative_humidity_2m: 70, weather_code: 3, wind_speed_10m: 8, is_day: 0 }, hourly: { time: hours, temperature_2m: hours.map((_, i) => 40 + i % 5), precipitation_probability: hours.map(() => 10), weather_code: hours.map(() => 3) }, daily: { time: ["2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-08","2026-11-09"], weather_code: [3,3,61,0,0,1,2], temperature_2m_max: [50,52,55,49,48,50,51], temperature_2m_min: [38,39,41,35,34,36,37], precipitation_probability_max: [10,20,70,5,0,0,10], sunrise: Array(7).fill("2026-11-03T06:20"), sunset: Array(7).fill("2026-11-03T16:30") } }, true);
  if (url.includes("finance/quotes") || url.includes("query1.finance.yahoo")) { if (url.includes("BTC")) throw new Error("boom"); return mk({ chart: { result: [{ meta: { regularMarketPrice: 101.5, chartPreviousClose: 100, regularMarketTime: 1793000000 }, indicators: { quote: [{ close: [98, 99, 100, 101.5] }] } }] } }, true); }
  if (url.includes("stooq")) return mk("Date,Open,High,Low,Close,Volume\n2026-11-01,1,1,1,60000,1\n2026-11-02,1,1,1,61000,1\n");
  if (url.includes("espn.com") && url.includes("/schedule")) return mk({ events: [{ id: "1", date: "2026-11-01T23:00Z", shortName: "BOS @ NYK", competitions: [{ status: { type: { state: "post", completed: true, shortDetail: "Final" } }, competitors: [{ homeAway: "away", team: { abbreviation: "BOS" }, score: { displayValue: "120" }, winner: true }, { homeAway: "home", team: { abbreviation: "NYK" }, score: { displayValue: "110" } }] }] }, { id: "2", date: "2026-11-05T23:00Z", shortName: "MIA @ BOS", competitions: [{ status: { type: { state: "pre", completed: false, shortDetail: "Thu 7:30 PM" } }, competitors: [{ homeAway: "home", team: { abbreviation: "BOS" } }, { homeAway: "away", team: { abbreviation: "MIA" } }] }] }] }, true);
  if (url.includes("espn.com") && url.includes("/scoreboard")) return mk({ events: [] }, true);
  if (url.includes("espn.com")) return mk({ team: { record: { items: [{ summary: "5-1" }] } } }, true);
  if (url.includes("jokeapi")) return mk({ joke: "Why did the scarecrow win? Outstanding in his field." }, true);
  if (url.includes("uselessfacts")) return mk({ text: "Honey never spoils." }, true);
  if (url.includes("zenquotes")) return mk([{ q: "Do the work.", a: "Someone" }], true);
  if (url.includes("huffpost")) throw new Error("403");
  return mk(url.includes("theguardian") ? atom : rss);
};
const { main, parseFeed } = await import("./update.mjs");
const items = parseFeed(rss);
if (items.length !== 2 || items[0].t !== "Senate passes & sends bill" || items[0].summary !== "Summary here") throw new Error("parseFeed failed " + JSON.stringify(items));
if (parseFeed(atom)[0].url !== "https://ex.com/c") throw new Error("atom link failed");
const meta = await main();
const must = ["weather","quotes","sports","news","fun"];
for (const m of must) if (!meta.modules[m]?.ok) throw new Error("module failed: " + m + " " + JSON.stringify(meta.modules[m]));
const news = JSON.parse(readFileSync("data/news.json", "utf8"));
if (!news.sections.politics.length || !news.sections.staffing.length) throw new Error("news empty");
const q = JSON.parse(readFileSync("data/quotes.json", "utf8"));
if (q.items.length !== 10 || q.items[0].pct !== 1.5) throw new Error("quotes wrong " + JSON.stringify(q.items[0]));
console.log("selftest OK: parse, weather, quotes, sports, news, fun");
