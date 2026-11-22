/* ------------------------------------------------------------------
   Tiny live previews for the playground tiles on the homepage.
   Each canvas[data-preview] gets a small 2D animation; only visible
   ones animate, and reduced-motion users get a still frame.
   ------------------------------------------------------------------ */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // ---------- flight: parallax mountains and a little jet
  function flight(c, w, h, t) {
    const g = c.getContext("2d");
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#6fa9d9"); sky.addColorStop(1, "#d9ecf6");
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,244,214,.9)"; g.beginPath(); g.arc(w * 0.82, h * 0.2, h * 0.08, 0, 7); g.fill();
    const layers = [
      { base: 0.62, amp: 0.22, f: 0.011, sp: 6, col: "#8fa3b8", snow: true },
      { base: 0.74, amp: 0.16, f: 0.017, sp: 14, col: "#5f8a6a" },
      { base: 0.88, amp: 0.10, f: 0.03, sp: 30, col: "#3f6e3f" },
    ];
    for (const L of layers) {
      g.fillStyle = L.col; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 3) {
        const X = (x + t * L.sp) * L.f * (300 / w) * w / 300;
        const y = h * (L.base - L.amp * (0.55 * Math.abs(Math.sin(X)) + 0.3 * Math.abs(Math.sin(X * 2.3 + 1)) + 0.15 * Math.sin(X * 5.1)));
        g.lineTo(x, y);
      }
      g.lineTo(w, h); g.closePath(); g.fill();
      if (L.snow) {
        g.fillStyle = "rgba(255,255,255,.85)";
        for (let x = 0; x <= w; x += 3) {
          const X = (x + t * L.sp) * L.f;
          const k = 0.55 * Math.abs(Math.sin(X)) + 0.3 * Math.abs(Math.sin(X * 2.3 + 1)) + 0.15 * Math.sin(X * 5.1);
          if (k > 0.72) { const y = h * (L.base - L.amp * k); g.fillRect(x, y, 3, h * L.amp * (k - 0.72) * 1.4); }
        }
      }
    }
    // jet
    const px = w * 0.42, py = h * 0.36 + Math.sin(t * 1.3) * h * 0.025, s = h / 120, bank = Math.sin(t * 0.7) * 0.15;
    g.save(); g.translate(px, py); g.rotate(bank); g.scale(s, s);
    g.fillStyle = "#f4f4f2"; g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 0.6;
    g.beginPath(); g.ellipse(0, 0, 18, 3.2, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-2, 0); g.lineTo(-9, 11); g.lineTo(-5, 11); g.lineTo(5, 0); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-13, -1); g.lineTo(-18, -9); g.lineTo(-15, -9); g.lineTo(-9, -1); g.closePath(); g.fillStyle = "#1f4e8c"; g.fill();
    g.fillStyle = "#1f4e8c"; g.fillRect(-14, -0.6, 26, 1.2);
    g.restore();
    // a gold ring drifting by
    const rx = w - ((t * 40) % (w + 80)) + 40;
    g.strokeStyle = "rgba(224,179,90,.9)"; g.lineWidth = Math.max(2, h / 60); g.beginPath(); g.ellipse(rx, h * 0.34, h * 0.035, h * 0.1, 0, 0, 7); g.stroke();
  }

  // ---------- aquarium: fish, plants, bubbles, rays
  const fishSet = [
    { c: "#ff7a1a", band: true, y: 0.35, s: 1.0, sp: 0.09, ph: 0 },
    { c: "#2f5bff", tail: "#ffd23a", y: 0.55, s: 1.3, sp: -0.07, ph: 2 },
    { c: "#ff9a3c", y: 0.7, s: 0.9, sp: 0.05, ph: 4 },
    { c: "#25b8ff", y: 0.25, s: 0.55, sp: 0.13, ph: 1 }, { c: "#25b8ff", y: 0.28, s: 0.55, sp: 0.13, ph: 1.15 }, { c: "#25b8ff", y: 0.22, s: 0.55, sp: 0.13, ph: 1.3 },
    { c: "#a23ad8", y: 0.45, s: 1.0, sp: -0.04, ph: 5 },
  ];
  function aquarium(c, w, h, t) {
    const g = c.getContext("2d");
    const wat = g.createLinearGradient(0, 0, 0, h); wat.addColorStop(0, "#4fb6dc"); wat.addColorStop(1, "#0c3f5e");
    g.fillStyle = wat; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,.06)";
    for (let i = 0; i < 5; i++) { const x = (i * 0.22 + 0.05 + Math.sin(t * 0.2 + i) * 0.02) * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w * 0.08, 0); g.lineTo(x + w * 0.2, h); g.lineTo(x + w * 0.1, h); g.fill(); }
    // plants
    for (let i = 0; i < 9; i++) {
      const bx = (i * 0.11 + 0.04) * w, hh = h * (0.35 + (i * 37 % 10) / 30);
      g.strokeStyle = i % 3 ? "#2f8a3a" : "#4fae3a"; g.lineWidth = Math.max(2, w / 120);
      g.beginPath(); g.moveTo(bx, h);
      g.quadraticCurveTo(bx + Math.sin(t + i) * w * 0.03, h - hh * 0.5, bx + Math.sin(t * 1.2 + i) * w * 0.04, h - hh); g.stroke();
    }
    // sand
    g.fillStyle = "#d9c79a"; g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) g.lineTo(x, h * 0.9 + Math.sin(x * 0.05) * h * 0.015);
    g.lineTo(w, h); g.fill();
    // fish
    for (const f of fishSet) {
      const span = w + 60, x = ((f.sp > 0 ? 1 : -1) * t * Math.abs(f.sp) * w + f.ph * 97) % span;
      const fx = f.sp > 0 ? x - 30 : w + 30 - x, fy = h * f.y + Math.sin(t * 1.5 + f.ph) * h * 0.03, s = h / 18 * f.s;
      g.save(); g.translate(fx, fy); if (f.sp < 0) g.scale(-1, 1);
      const wag = Math.sin(t * 8 + f.ph) * 0.35;
      g.fillStyle = f.tail || f.c; g.beginPath(); g.moveTo(-s * 0.9, 0); g.lineTo(-s * 1.6, -s * 0.55 + wag * s * 0.4); g.lineTo(-s * 1.6, s * 0.55 + wag * s * 0.4); g.closePath(); g.fill();
      g.fillStyle = f.c; g.beginPath(); g.ellipse(0, 0, s, s * 0.55, 0, 0, 7); g.fill();
      if (f.band) { g.fillStyle = "#fff"; g.fillRect(-s * 0.15, -s * 0.5, s * 0.25, s); g.fillRect(s * 0.45, -s * 0.38, s * 0.18, s * 0.76); }
      g.fillStyle = "#fff"; g.beginPath(); g.arc(s * 0.6, -s * 0.12, s * 0.14, 0, 7); g.fill();
      g.fillStyle = "#000"; g.beginPath(); g.arc(s * 0.64, -s * 0.12, s * 0.07, 0, 7); g.fill();
      g.restore();
    }
    // bubbles
    g.strokeStyle = "rgba(230,248,255,.7)"; g.lineWidth = 1;
    for (let i = 0; i < 12; i++) { const y = h - ((t * 30 + i * 37) % (h + 10)); const x = w * 0.08 + Math.sin(t * 3 + i) * 3; g.beginPath(); g.arc(x, y, 1.5 + (i % 3), 0, 7); g.stroke(); }
  }

  // ---------- maze: a top-down maze with a walker following the right-hand wall
  const mazeState = new WeakMap();
  function buildMaze(cols, rows, seed) {
    const r = rnd(seed), wallE = [], wallS = [], seen = [];
    for (let i = 0; i < cols * rows; i++) { wallE.push(true); wallS.push(true); seen.push(false); }
    const st = [[0, 0]]; seen[0] = true;
    while (st.length) {
      const [x, y] = st[st.length - 1], n = [];
      if (x > 0 && !seen[y * cols + x - 1]) n.push([x - 1, y]); if (x < cols - 1 && !seen[y * cols + x + 1]) n.push([x + 1, y]);
      if (y > 0 && !seen[(y - 1) * cols + x]) n.push([x, y - 1]); if (y < rows - 1 && !seen[(y + 1) * cols + x]) n.push([x, y + 1]);
      if (!n.length) { st.pop(); continue; }
      const [nx, ny] = n[Math.floor(r() * n.length)];
      if (nx > x) wallE[y * cols + x] = false; else if (nx < x) wallE[y * cols + nx] = false; else if (ny > y) wallS[y * cols + x] = false; else wallS[ny * cols + x] = false;
      seen[ny * cols + nx] = true; st.push([nx, ny]);
    }
    const open = (x, y, d) => d === 0 ? x < cols - 1 && !wallE[y * cols + x] : d === 1 ? y < rows - 1 && !wallS[y * cols + x] : d === 2 ? x > 0 && !wallE[y * cols + x - 1] : y > 0 && !wallS[(y - 1) * cols + x];
    const path = [[0, 0]]; let x = 0, y = 0, d = 0;
    for (let k = 0; k < 4000 && !(x === cols - 1 && y === rows - 1); k++) {
      const rd = (d + 1) % 4;
      if (open(x, y, rd)) d = rd; else if (!open(x, y, d)) { d = (d + 3) % 4; continue; }
      x += [1, 0, -1, 0][d]; y += [0, 1, 0, -1][d]; path.push([x, y]);
    }
    return { cols, rows, wallE, wallS, path };
  }
  function maze(c, w, h, t) {
    const g = c.getContext("2d");
    let m = mazeState.get(c);
    const cols = 16, rows = 9;
    if (!m || Math.floor(t / 30) !== m.gen) { m = buildMaze(cols, rows, 7 + Math.floor(t / 30) * 13); m.gen = Math.floor(t / 30); mazeState.set(c, m); }
    g.fillStyle = "#14110f"; g.fillRect(0, 0, w, h);
    const cw = w / (cols + 1), ch = h / (rows + 1), ox = cw / 2, oy = ch / 2;
    // trail
    const pos = Math.min(m.path.length - 1, ((t % 30) / 30) * m.path.length * 1.05);
    g.fillStyle = "rgba(224,179,90,.18)";
    for (let i = 0; i < Math.floor(pos); i++) { const [x, y] = m.path[i]; g.fillRect(ox + x * cw + 1, oy + y * ch + 1, cw - 2, ch - 2); }
    g.strokeStyle = "#b5653f"; g.lineWidth = Math.max(1.5, w / 180); g.lineCap = "round";
    g.strokeRect(ox, oy, cols * cw, rows * ch);
    g.beginPath();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (m.wallE[y * cols + x] && x < cols - 1) { g.moveTo(ox + (x + 1) * cw, oy + y * ch); g.lineTo(ox + (x + 1) * cw, oy + (y + 1) * ch); }
      if (m.wallS[y * cols + x] && y < rows - 1) { g.moveTo(ox + x * cw, oy + (y + 1) * ch); g.lineTo(ox + (x + 1) * cw, oy + (y + 1) * ch); }
    }
    g.stroke();
    g.fillStyle = "#ffd27a"; g.fillRect(ox + (cols - 1) * cw + cw * 0.3, oy + (rows - 1) * ch + ch * 0.3, cw * 0.4, ch * 0.4);
    const i0 = Math.floor(pos), i1 = Math.min(m.path.length - 1, i0 + 1), f = pos - i0;
    const px = m.path[i0][0] + (m.path[i1][0] - m.path[i0][0]) * f, py = m.path[i0][1] + (m.path[i1][1] - m.path[i0][1]) * f;
    g.fillStyle = "#fff"; g.shadowColor = "#ffd27a"; g.shadowBlur = 8;
    g.beginPath(); g.arc(ox + (px + 0.5) * cw, oy + (py + 0.5) * ch, Math.min(cw, ch) * 0.28, 0, 7); g.fill(); g.shadowBlur = 0;
  }

  // ---------- julia: today's set (static)
  function julia(c, w, h) {
    if (typeof JuliaDay === "undefined") return;
    const s = JuliaDay.spec(JuliaDay.dateKey(new Date()));
    const small = document.createElement("canvas"); small.width = Math.round(w / 2); small.height = Math.round(h / 2);
    JuliaDay.renderCPU(small, s, { maxIt: 180, zoom: 2.6 });
    const g = c.getContext("2d"); g.imageSmoothingEnabled = true; g.drawImage(small, 0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(0, h - 22, w, 22);
    g.fillStyle = "#e0b35a"; g.font = "11px JetBrains Mono, monospace"; g.fillText("today: “" + s.name + "”", 8, h - 7);
  }

  // ---------- stereogram: a real (tiny) random-dot stereogram hiding a star
  function stereogram(c, w, h) {
    const W = Math.round(w / 2), H = Math.round(h / 2), mu = 1 / 3, E = Math.round(W / 6.5) * 2;
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.38;
    const inStar = (x, y) => {
      const a = Math.atan2(y - cy, x - cx) + Math.PI / 2, d = Math.hypot(x - cx, y - cy);
      const k = ((a % (Math.PI * 2 / 5)) + Math.PI * 2 / 5) % (Math.PI * 2 / 5) - Math.PI / 5;
      const rr = R * 0.45 + (R - R * 0.45) * (1 - Math.abs(k) / (Math.PI / 5)) ** 1.6;
      return d < rr;
    };
    const img = new ImageData(W, H), px = img.data, same = new Int32Array(W), r = rnd(12345);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) same[x] = x;
      for (let x = 0; x < W; x++) {
        const z = inStar(x, y) ? 1 : 0, s = Math.round((1 - mu * z) * E / (2 - mu * z));
        let left = x - (s >> 1), right = left + s;
        if (left < 0 || right >= W) continue;
        let l = same[left];
        while (l !== left && l !== right) { if (l < right) { left = l; l = same[left]; } else { same[left] = right; left = right; l = same[left]; right = l; } }
        same[left] = right;
      }
      for (let x = W - 1; x >= 0; x--) {
        const o = (y * W + x) * 4;
        if (same[x] === x) { const hh = r() * 6.283; px[o] = 128 + 120 * Math.cos(hh); px[o + 1] = 128 + 120 * Math.cos(hh + 2.1); px[o + 2] = 128 + 120 * Math.cos(hh + 4.2); }
        else { const q = (y * W + same[x]) * 4; px[o] = px[q]; px[o + 1] = px[q + 1]; px[o + 2] = px[q + 2]; }
        px[o + 3] = 255;
      }
    }
    const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H; tmp.getContext("2d").putImageData(img, 0, 0);
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(tmp, 0, 0, w, h);
  }

  const DRAW = { flight, aquarium, maze, julia, stereogram };
  const ANIMATED = { flight: true, aquarium: true, maze: true };
  const items = [];
  function size(it) {
    const r = it.c.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (it.c.width !== w || it.c.height !== h) { it.c.width = w; it.c.height = h; it.dirty = true; }
  }
  function init() {
    document.querySelectorAll("canvas[data-preview]").forEach((c) => {
      const kind = c.dataset.preview; if (!DRAW[kind]) return;
      items.push({ c, kind, visible: false, dirty: true });
    });
    const io = "IntersectionObserver" in window ? new IntersectionObserver((ents) => ents.forEach((e) => { const it = items.find((i) => i.c === e.target); if (it) it.visible = e.isIntersecting; })) : null;
    items.forEach((it) => { size(it); if (io) io.observe(it.c); else it.visible = true; });
    addEventListener("resize", () => items.forEach(size));
    let last = 0;
    const loop = (now) => {
      if (now - last > 33) {
        last = now; const t = now / 1000;
        for (const it of items) {
          if (!it.visible) continue;
          if (ANIMATED[it.kind] && !reduce) DRAW[it.kind](it.c, it.c.width, it.c.height, t);
          else if (it.dirty) { DRAW[it.kind](it.c, it.c.width, it.c.height, 12); it.dirty = false; }
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
