/* ------------------------------------------------------------------
   Julia-of-the-day: deterministic parameters from the calendar date.
   Shared by the homepage chip and playground/julia.html.
   ------------------------------------------------------------------ */
const JuliaDay = (function () {
  function dateKey(d) {
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function hash(str) {            // FNV-1a
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function rng(seed) {            // mulberry32
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const NAMES_A = ["quiet", "feral", "folded", "lucid", "tidal", "molten", "frosted", "hollow", "spiral", "drifting",
    "brittle", "velvet", "electric", "sunken", "restless", "paper", "glass", "orbiting", "nested", "cryogenic"];
  const NAMES_B = ["seahorse", "fern", "lattice", "coastline", "nebula", "dendrite", "rabbit", "galaxy", "filament", "reef",
    "cathedral", "vortex", "lichen", "snowflake", "archipelago", "qubit", "spindle", "cascade", "dragon", "lantern"];

  /** Parameters for a given seed string (normally a YYYY-MM-DD date). */
  function spec(key) {
    const r = rng(hash("julia:" + key));
    const u = r();
    const th = 2 * Math.PI * r();
    let cr, ci, family;
    if (u < 0.55) {
      // just inside / on the main cardioid boundary — spirals and seahorses
      const s = 0.99 + 0.035 * r();
      cr = (0.5 * Math.cos(th) - 0.25 * Math.cos(2 * th)) * s;
      ci = (0.5 * Math.sin(th) - 0.25 * Math.sin(2 * th)) * s;
      family = "main cardioid";
    } else if (u < 0.82) {
      // period-2 bulb boundary — "basilica"-like
      const s = 0.98 + 0.08 * r();
      cr = -1 + 0.25 * s * Math.cos(th);
      ci = 0.25 * s * Math.sin(th);
      family = "period-2 bulb";
    } else {
      // around the period-3 "rabbit" bulb (mirrored at random)
      const s = 0.95 + 0.2 * r();
      cr = -0.1226 + 0.095 * s * Math.cos(th);
      ci = (0.7449 + 0.095 * s * Math.sin(th)) * (r() < 0.5 ? 1 : -1);
      family = "period-3 bulb";
    }
    // cosine palette (Inigo Quilez style): a + b*cos(2π(c t + d))
    const palette = {
      a: [0.5, 0.5, 0.5],
      b: [0.5, 0.5, 0.5],
      c: [1, 1, r() < 0.5 ? 1 : 0.5],
      d: [r(), r(), r()],
    };
    const name = NAMES_A[Math.floor(r() * NAMES_A.length)] + " " + NAMES_B[Math.floor(r() * NAMES_B.length)];
    const cycles = 0.6 + 1.4 * r();
    const rot = r() * Math.PI * 2;
    return { key, c: [cr, ci], palette, name, family, cycles, rot };
  }

  function color(p, t) {
    return [0, 1, 2].map((k) => p.a[k] + p.b[k] * Math.cos(2 * Math.PI * (p.c[k] * t + p.d[k])));
  }

  /** Small CPU renderer (used for thumbnails). */
  function renderCPU(canvas, s, opts) {
    opts = opts || {};
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(W, H);
    const maxIt = opts.maxIt || 220;
    const scale = (opts.zoom || 3.2) / Math.min(W, H);
    const cosr = Math.cos(s.rot), sinr = Math.sin(s.rot);
    const [cr, ci] = s.c;
    let o = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const px = (x - W / 2) * scale, py = (y - H / 2) * scale;
        let zr = px * cosr - py * sinr, zi = px * sinr + py * cosr;
        let n = 0, m2 = 0;
        for (; n < maxIt; n++) {
          const zr2 = zr * zr, zi2 = zi * zi;
          m2 = zr2 + zi2;
          if (m2 > 256) break;
          zi = 2 * zr * zi + ci;
          zr = zr2 - zi2 + cr;
        }
        let rgb;
        if (n >= maxIt) rgb = [0.03, 0.03, 0.05];
        else {
          const nu = n + 1 - Math.log2(Math.log2(m2) / 2);
          rgb = color(s.palette, Math.sqrt(Math.max(nu, 0) / maxIt) * 3 * s.cycles);
          const k = 1 - Math.exp(-nu / 5); rgb = rgb.map((v) => v * k);
        }
        img.data[o++] = rgb[0] * 255; img.data[o++] = rgb[1] * 255; img.data[o++] = rgb[2] * 255; img.data[o++] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  return { dateKey, spec, renderCPU, color, hash, rng };
})();
