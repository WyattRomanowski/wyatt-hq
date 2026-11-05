// Visual effects: particle field background, 3D wireframe hero, card tilt + glow. Respects reduced motion.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const cssv = (n) => getComputedStyle(document.body).getPropertyValue(n).trim() || "#4f8cff";

export function startBackground(cv) {
  if (reduce) return;
  const ctx = cv.getContext("2d"); let W, H, pts = [], mx = 0, my = 0;
  const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; pts = Array.from({ length: Math.min(70, Math.floor(W / 22)) }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.8 + 0.2, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25 })); };
  size(); addEventListener("resize", size);
  addEventListener("pointermove", (e) => { mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5; });
  const loop = () => {
    if (document.hidden || document.body.classList.contains("mode-alku")) return requestAnimationFrame(loop);
    ctx.clearRect(0, 0, W, H); const c = cssv("--accent");
    for (const p of pts) { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0; }
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
      if (d < 16000) { ctx.globalAlpha = (1 - d / 16000) * 0.18; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(a.x - mx * 30 * a.z, a.y - my * 30 * a.z); ctx.lineTo(b.x - mx * 30 * b.z, b.y - my * 30 * b.z); ctx.stroke(); }
    }
    ctx.fillStyle = c; for (const p of pts) { ctx.globalAlpha = 0.5 * p.z; ctx.beginPath(); ctx.arc(p.x - mx * 30 * p.z, p.y - my * 30 * p.z, 1.6 * p.z + 0.4, 0, 6.3); ctx.fill(); }
    requestAnimationFrame(loop);
  };
  loop();
}

// rotating wireframe icosahedron + orbiting rings, perspective-projected on a canvas
export function hero3d(cv) {
  const ctx = cv.getContext("2d"), S = 300, dpr = Math.min(2, devicePixelRatio || 1); cv.width = cv.height = S * dpr; ctx.scale(dpr, dpr);
  const t = (1 + Math.sqrt(5)) / 2;
  const V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((v) => v.map((x) => x / 1.9));
  const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const E = new Set(); F.forEach((f) => [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(([a, b]) => E.add(a < b ? a + "," + b : b + "," + a)));
  let a = 0, mx = 0, my = 0;
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  const rot = (p, ax, ay) => { let [x, y, z] = p; let c = Math.cos(ay), s = Math.sin(ay); [x, z] = [x * c + z * s, -x * s + z * c]; c = Math.cos(ax); s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c]; return [x, y, z]; };
  const proj = ([x, y, z], k = 1) => { const f = 3 / (3 + z); return [S / 2 + x * f * S * 0.3 * k, S / 2 + y * f * S * 0.3 * k, z]; };
  const draw = () => {
    if (document.hidden || document.body.classList.contains("mode-alku") || cv.offsetParent === null) return requestAnimationFrame(draw);
    ctx.clearRect(0, 0, S, S); a += reduce ? 0 : 0.008; const ax = a * 0.7 + my * 1.2, ay = a + mx * 1.6, c = cssv("--accent"), c2 = cssv("--a2");
    const P = V.map((v) => proj(rot(v, ax, ay)));
    // faces (back to front) with soft fill
    const faces = F.map((f) => ({ f, z: (P[f[0]][2] + P[f[1]][2] + P[f[2]][2]) / 3 })).sort((p, q) => q.z - p.z);
    ctx.lineJoin = "round";
    for (const { f, z } of faces) { ctx.globalAlpha = 0.07 + (1 - (z + 1) / 2) * 0.1; ctx.fillStyle = c; ctx.beginPath(); f.forEach((i, n) => (n ? ctx.lineTo(P[i][0], P[i][1]) : ctx.moveTo(P[i][0], P[i][1]))); ctx.fill(); }
    ctx.lineWidth = 1.6; ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10;
    for (const e of E) { const [i, j] = e.split(",").map(Number); ctx.globalAlpha = 0.35 + (1 - (P[i][2] + P[j][2] + 2) / 4) * 0.5; ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke(); }
    ctx.shadowBlur = 0; { const gr = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, 70); gr.addColorStop(0, c + "66"); gr.addColorStop(1, "transparent"); ctx.globalAlpha = 0.9; ctx.fillStyle = gr; ctx.fillRect(0, 0, S, S); }
    ctx.fillStyle = "#fff"; for (const p of P) { ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, 6.3); ctx.fill(); }
    // orbit ring
    ctx.strokeStyle = c2; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.55; ctx.beginPath();
    for (let i = 0; i <= 64; i++) { const th = (i / 64) * 6.283, q = proj(rot([Math.cos(th) * 1.45, Math.sin(th) * 0.25, Math.sin(th) * 0.5], ax * 0.6 + 0.6, ay * 1.3)); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
    ctx.stroke(); ctx.globalAlpha = 1; requestAnimationFrame(draw);
  };
  draw();
}

// 3D tilt + cursor glow on every .card (delegated)
export function tilt(root) {
  if (reduce) return;
  root.addEventListener("pointermove", (e) => {
    if (document.body.classList.contains("mode-alku")) return;
    const c = e.target.closest?.(".card"); if (!c || e.pointerType === "touch") return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty("--mx", x * 100 + "%"); c.style.setProperty("--my", y * 100 + "%");
    c.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 3.2}deg) rotateY(${(x - 0.5) * 4.2}deg) translateZ(0)`;
  });
  root.addEventListener("pointerout", (e) => { const c = e.target.closest?.(".card"); if (c && !c.contains(e.relatedTarget)) c.style.transform = ""; });
}

let lx = innerWidth / 2, ly = innerHeight / 2; addEventListener("pointermove", (e) => { lx = e.clientX; ly = e.clientY; }, { passive: true });
export function confetti(n = 70) {
  if (reduce) return; const cv = document.createElement("canvas"); cv.width = innerWidth; cv.height = innerHeight; cv.style.cssText = "position:fixed;inset:0;z-index:400;pointer-events:none"; document.body.append(cv);
  const ctx = cv.getContext("2d"), cols = ["#4f8cff", "#8b5cf6", "#22d3ee", "#34d399", "#fbbf24", "#fb7185"];
  const P = Array.from({ length: n }, () => ({ x: lx, y: ly, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 11 - 3, r: Math.random() * 6.3, s: 4 + Math.random() * 5, c: cols[(Math.random() * 6) | 0] })); let f = 0;
  (function loop() { ctx.clearRect(0, 0, cv.width, cv.height); P.forEach((p) => { p.vy += 0.38; p.x += p.vx; p.y += p.vy; p.r += 0.2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - f / 90); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }); if (++f < 90) requestAnimationFrame(loop); else cv.remove(); })();
}
export function chime() { try { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.setValueAtTime(0.15, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.8); o.start(); o.stop(a.currentTime + 0.8); } catch {} }
