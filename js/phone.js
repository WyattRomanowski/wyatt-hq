// iPhone-style home screen: app icons (favicons), folders, dock, widgets, wiggle-edit mode, Spotlight search, Spotify player.
import { h, store, uid, ymd, spark, money, sgn, toast, modal, parse } from "./core.js";

const L = (n, u, c, e) => ({ id: uid(), n, u, c, e });
const T = (n, tab, c, e) => ({ id: uid(), n, tab, c, e });
const DEFAULT = () => ({
  dock: [L("Spotify", "https://open.spotify.com", "#1db954", "🎵"), L("Gmail", "https://mail.google.com", "#ea4335", "✉️"), L("Claude", "https://claude.ai", "#d97757", "✳️"), L("Maps", "https://maps.google.com", "#34a853", "🗺️")],
  apps: [
    T("Tasks", "tasks", "#34c759", "✅"), T("Money", "money", "#30b0c7", "💰"), T("News", "news", "#ff3b30", "📰"), T("Sports", "sports", "#ff9500", "🏟️"),
    T("Calendar", "calendar", "#ff453a", "📅"), T("Focus", "focus", "#5e5ce6", "⏱️"), T("Notes", "notes", "#ffcc00", "📝"), T("Habits", "habits", "#ff2d55", "🔥"),
    T("Goals", "goals", "#bf5af2", "🎯"), T("Study", "study", "#0a84ff", "🧠"),
    L("Outlook", "https://outlook.office.com", "#0078d4", "📧"), L("Notion", "https://www.notion.so", "#2b2b2b", "📓"), L("YouTube", "https://www.youtube.com", "#ff0000", "▶️"), L("ESPN", "https://www.espn.com", "#d00000", "🏈"),
    L("LinkedIn", "https://www.linkedin.com", "#0a66c2", "💼"), L("GitHub", "https://github.com", "#24292f", "🐙"), L("Marketplace", "https://www.facebook.com/marketplace", "#1877f2", "🛒"), L("Rocket Money", "https://app.rocketmoney.com", "#6a4cff", "🚀"),
    { id: uid(), n: "Banks", c: "#3a3a3c", e: "🏦", folder: [L("Chase", "https://www.chase.com", "#117aca", "🏦"), L("Bank of America", "https://www.bankofamerica.com", "#e31837", "🏦"), L("Wells Fargo", "https://www.wellsfargo.com", "#d71e28", "🏦"), L("Capital One", "https://www.capitalone.com", "#004977", "💳"), L("Citi", "https://www.citi.com", "#056dae", "🏦")] },
    { id: uid(), n: "Invest", c: "#3a3a3c", e: "📈", folder: [L("E*TRADE", "https://us.etrade.com", "#6633cc", "📈"), L("Robinhood", "https://robinhood.com", "#00c805", "🪶"), L("Fidelity", "https://www.fidelity.com", "#368727", "📊"), L("Vanguard", "https://investor.vanguard.com", "#96151d", "🏛️"), L("Yahoo Finance", "https://finance.yahoo.com", "#6001d2", "💹")] },
    { id: uid(), n: "Work", c: "#3a3a3c", e: "💼", folder: [L("Bullhorn", "https://www.bullhorn.com", "#ff6a00", "🐂"), L("ZoomInfo", "https://app.zoominfo.com", "#e8483f", "🔎"), L("SalesNav", "https://www.linkedin.com/sales", "#0a66c2", "🧭"), L("HubSpot", "https://app.hubspot.com", "#ff7a59", "🧲")] },
  ],
});
const dom = (u) => { try { return new URL(u).hostname; } catch { return ""; } };
const buzz = () => { try { navigator.vibrate?.(8); } catch {} };

export function phone({ D, go, render }) {
  const st = store.get("phone", null) || (() => { const d = DEFAULT(); store.set("phone", d); return d; })();
  const save = () => store.set("phone", st);
  let edit = false;
  const root = h("div", { class: "phone-wrap" });
  const frame = h("div", { class: "phone" }); root.append(frame);

  const icon = (a, small) => {
    const img = a.u ? h("img", { src: `https://www.google.com/s2/favicons?domain=${dom(a.u)}&sz=128`, alt: "", onerror: (e) => e.target.remove(), loading: "lazy" }) : null;
    const tiles = a.folder ? h("div", { class: "fold" }, a.folder.slice(0, 9).map((x) => h("i", { style: { background: x.c } }, x.e))) : null;
    const badge = a.tab === "tasks" ? store.get("tasks", []).filter((t) => t.status !== "done").length : a.tab === "news" ? (D.news ? Object.values(D.news.sections).reduce((s, x) => s + x.length, 0) : 0) : 0;
    return h("div", { class: "app-ic" + (small ? " sm" : ""), "data-id": a.id, style: { "--c": a.c } }, h("div", { class: "tile", style: { background: a.folder ? "rgba(255,255,255,.22)" : `linear-gradient(145deg, ${a.c}, color-mix(in srgb, ${a.c} 70%, #000))` } }, tiles || [h("span", { class: "em" }, a.e || a.n[0]), img]), badge ? h("b", { class: "badge" }, badge > 99 ? "99+" : badge) : null, edit ? h("button", { class: "del", onclick: (e) => { e.stopPropagation(); remove(a.id); } }, "−") : null, small ? null : h("span", { class: "lbl" }, a.n));
  };
  const open = (a) => {
    buzz();
    if (a.folder) return folderModal(a);
    if (a.tab) return go(a.tab);
    window.open(a.u, "_blank", "noopener");
  };
  const remove = (id) => { for (const list of [st.apps, st.dock]) { const i = list.findIndex((x) => x.id === id); if (i >= 0) list.splice(i, 1); else for (const f of list.filter((x) => x.folder)) { const j = f.folder.findIndex((x) => x.id === id); if (j >= 0) f.folder.splice(j, 1); } } save(); draw(); };
  const folderModal = (f) => {
    const m = h("div", { class: "modal", onclick: (e) => e.target === m && m.remove() }, h("div", { class: "m folder-m" }, h("h2", {}, f.n), h("div", { class: "app-grid" }, f.folder.map((a) => { const el = icon(a); el.onclick = () => open(a); return el; })), h("div", { class: "row", style: { marginTop: "12px", justifyContent: "flex-end" } }, h("button", { class: "btn sm ghost", onclick: () => { m.remove(); addModal(f); } }, "+ Add here"), h("button", { class: "btn sm", onclick: () => m.remove() }, "Done"))));
    document.body.append(m);
  };
  const addModal = (into) => {
    const n = h("input", { type: "text", placeholder: "Name", class: "grow" }), u = h("input", { type: "text", placeholder: "https://…", class: "grow" }), e = h("input", { type: "text", placeholder: "Emoji", style: { width: "70px" } }), c = h("input", { type: "color", value: "#0a84ff", style: { width: "50px", padding: "2px" } });
    modal("Add app", h("div", { class: "form" }, n, u, e, c), [{ t: "Cancel", ghost: true }, { t: "Add", fn: () => { if (!n.value || !u.value) return false; const url = /^https?:/.test(u.value) ? u.value : "https://" + u.value; (into?.folder || st.apps).push(L(n.value, url, c.value, e.value || "")); save(); draw(); } }]);
  };

  /* ---- widgets ---- */
  const clockW = () => {
    const t = h("div", { class: "clock-time" }), d = h("div", { class: "clock-date" }), w = D.weather?.current;
    const tick = () => { if (!t.isConnected) return clearInterval(iv); const n = new Date(); t.textContent = n.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/ [AP]M/, ""); d.textContent = n.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); sb.textContent = n.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/ [AP]M/, ""); };
    const iv = setInterval(tick, 1000); setTimeout(tick, 0);
    const ev = store.get("events", []).filter((e) => e.date >= ymd()).sort((a, b) => a.date.localeCompare(b.date))[0];
    return h("div", { class: "w w-big", onclick: () => go("happy") }, t, d, h("div", { class: "w-row" }, w ? h("span", {}, `${w.temp}° ${w.desc}`) : null, ev ? h("span", {}, "📌 " + ev.title.slice(0, 26)) : null));
  };
  const stocksW = () => h("div", { class: "w", onclick: () => go("money") }, h("div", { class: "w-t" }, "Stocks"), (D.quotes?.items || []).slice(0, 3).map((q) => h("div", { class: "w-line" }, h("b", {}, q.sym), spark(q.closes.slice(-20), { w: 44, h: 18 }), h("span", { class: q.pct >= 0 ? "gain" : "loss" }, sgn(q.pct) + "%"))));
  const tasksW = () => { const o = store.get("tasks", []).filter((t) => t.status !== "done").slice(0, 3); return h("div", { class: "w", onclick: () => go("tasks") }, h("div", { class: "w-t" }, "Tasks"), o.length ? o.map((t) => h("div", { class: "w-line" }, "○ " + t.title.slice(0, 22))) : h("div", { class: "w-line" }, "All clear ✓")); };
  const spotifyW = () => {
    const link = store.get("spotify", ""), emb = (u) => { const m = u.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/); return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0` : ""; };
    if (emb(link)) return h("div", { class: "w w-wide", style: { padding: 0, overflow: "hidden" } }, h("iframe", { src: emb(link), width: "100%", height: "152", frameborder: "0", allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture", loading: "lazy", style: { border: 0, display: "block", borderRadius: "16px" } }), h("button", { class: "x", style: { position: "absolute", top: "4px", right: "4px" }, onclick: () => { store.set("spotify", ""); draw(); } }, "✕"));
    const i = h("input", { type: "text", placeholder: "Paste a Spotify playlist / album / song link", class: "grow" });
    return h("div", { class: "w w-wide" }, h("div", { class: "w-t" }, "🎵 Spotify player"), h("div", { class: "form" }, i, h("button", { class: "btn sm", onclick: () => { if (emb(i.value)) { store.set("spotify", i.value); draw(); } else toast("Not a Spotify link"); } }, "Load")));
  };

  /* ---- layout ---- */
  const sb = h("span", {});
  const pages = h("div", { class: "pages" }), dots = h("div", { class: "dots" }), dock = h("div", { class: "dock" });
  function draw() {
    frame.classList.toggle("editing", edit); pages.innerHTML = ""; dots.innerHTML = ""; dock.innerHTML = "";
    const per = 20, chunks = []; for (let i = 0; i < st.apps.length; i += per) chunks.push(st.apps.slice(i, i + per));
    chunks.forEach((c, pi) => {
      const grid = h("div", { class: "app-grid" }); c.forEach((a) => grid.append(mk(a, st.apps)));
      pages.append(h("div", { class: "page" }, pi === 0 ? h("div", { class: "widgets" }, clockW(), h("div", { class: "w-pair" }, stocksW(), tasksW()), spotifyW()) : null, grid));
      dots.append(h("i", { class: pi === 0 ? "on" : "" }));
    });
    st.dock.forEach((a) => dock.append(mk(a, st.dock, true)));
    if (edit) pages.lastChild.querySelector(".app-grid").append(h("div", { class: "app-ic add", onclick: () => addModal() }, h("div", { class: "tile", style: { background: "rgba(255,255,255,.18)", fontSize: "30px" } }, "+"), h("span", { class: "lbl" }, "Add")));
  }
  function mk(a, list, small) {
    const el = icon(a, small); let timer, startX, startY, dragging = false;
    el.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".del")) return; startX = e.clientX; startY = e.clientY; dragging = false;
      timer = setTimeout(() => { if (!edit) { edit = true; buzz(); draw(); } }, 550);
      const mv = (ev) => {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8) clearTimeout(timer);
        if (!edit) return; if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8) return;
        dragging = true; const cur = frame.querySelector(`[data-id="${a.id}"]`); if (!cur) return; cur.style.transform = `translate(${ev.clientX - startX}px,${ev.clientY - startY}px) scale(1.15)`; cur.style.zIndex = 50; cur.style.pointerEvents = "none";
        const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.(".app-ic[data-id]"); frame.querySelectorAll(".drop").forEach((x) => x.classList.remove("drop")); if (t && t.dataset.id !== a.id) t.classList.add("drop");
      };
      const up = (ev) => {
        clearTimeout(timer); removeEventListener("pointermove", mv); removeEventListener("pointerup", up);
        if (dragging) { const cur = frame.querySelector(`[data-id="${a.id}"]`); if (cur) cur.style.pointerEvents = "none"; const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.(".app-ic[data-id]"); const tid = t?.dataset.id; if (tid && tid !== a.id) { const all = [st.apps, st.dock]; const from = all.find((l) => l.some((x) => x.id === a.id)), to = all.find((l) => l.some((x) => x.id === tid)); if (from && to) { const [m] = from.splice(from.findIndex((x) => x.id === a.id), 1); to.splice(to.findIndex((x) => x.id === tid), 0, m); save(); } } draw(); }
      };
      addEventListener("pointermove", mv); addEventListener("pointerup", up);
    });
    el.addEventListener("click", () => { if (dragging) { dragging = false; return; } if (!edit) { el.classList.add("pop"); open(a); } });
    return el;
  }

  /* ---- Spotlight ---- */
  const res = h("div", { class: "spot-res" });
  const all = () => [...st.apps.flatMap((a) => (a.folder ? a.folder : [a])), ...st.dock];
  const q = h("input", { type: "text", placeholder: "Search apps or the web", oninput: () => { const v = q.value.trim().toLowerCase(); res.innerHTML = ""; if (!v) return; const m = all().filter((a) => a.n.toLowerCase().includes(v)).slice(0, 6); m.forEach((a) => res.append(h("div", { class: "spot-i", onclick: () => open(a) }, h("span", { class: "sp-e", style: { background: a.c } }, a.e || a.n[0]), a.n))); res.append(h("div", { class: "spot-i", onclick: () => window.open("https://www.google.com/search?q=" + encodeURIComponent(v), "_blank", "noopener") }, h("span", { class: "sp-e", style: { background: "#555" } }, "🔍"), `Search the web for “${q.value}”`)); }, onkeydown: (e) => { if (e.key === "Enter") res.firstChild?.click(); } });

  const status = h("div", { class: "statusbar" }, sb, h("span", { class: "isl" }), h("span", {}, h("button", { class: "edit-btn" }, "")));
  const editBtn = status.querySelector(".edit-btn"); const sync = () => (editBtn.textContent = edit ? "Done" : "Edit");
  editBtn.onclick = () => { edit = !edit; sync(); draw(); }; sync();
  pages.addEventListener("scroll", () => { const i = Math.round(pages.scrollLeft / pages.clientWidth); [...dots.children].forEach((d, k) => d.classList.toggle("on", k === i)); });
  frame.append(status, h("div", { class: "spot" }, q, res), pages, dots, dock);
  draw(); return root;
}
