/* Generated previews for two playground tiles: today's Julia set and a real (tiny) stereogram.
   The other tiles use screenshots in assets/thumbs/. */
(function () {
  const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // ---------- julia: today's set (static)
  function julia(c, w, h) {
    if (typeof JuliaDay === "undefined") return;
    const s = JuliaDay.spec(JuliaDay.dateKey(new Date()));
    const g = c.getContext("2d");
    JuliaDay.renderCPU(c, s, { maxIt: 180, zoom: 2.6 });   // full resolution of the tile (device pixels)
    g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(0, h - 22, w, 22);
    g.fillStyle = "#ececea"; g.font = `${Math.round(h / 14)}px "Public Sans", Arial, sans-serif`; const f = (v) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(3);
    g.fillText("c = " + f(s.c[0]) + (s.c[1] < 0 ? " − " : " + ") + Math.abs(s.c[1]).toFixed(3) + "i", 10, h - 8);
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

  const DRAW = { julia, stereogram };
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
          if (it.dirty) { DRAW[it.kind](it.c, it.c.width, it.c.height); it.dirty = false; }
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
