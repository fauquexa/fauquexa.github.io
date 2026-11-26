/* The interactive figures on squats.html: a galaxy rotation curve with an adjustable dark-matter halo, an energy
   ladder, a quasiparticle energy diagram (animated), transmon levels solved live from the Hamiltonian, the
   resonator-free parity readout with a simulated detection, and a finite-element simulation of a SQUAT (mesh and
   field energy, loaded from assets/squat-sim.json). Everything is drawn here, in SVG or canvas. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const $ = (s, r) => (r || document).querySelector(s);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const el = (name, attrs, parent) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  function sizeCanvas(cv) {
    const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight || +cv.getAttribute("height");
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    return { c, w, h };
  }
  // run a frame loop only while a figure is on screen
  function whileVisible(node, frame) {
    let on = false, raf = 0, last = 0;
    const loop = (t) => { raf = 0; const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t; frame(dt, t / 1000); if (on && !document.hidden) raf = requestAnimationFrame(loop); };
    const kick = () => { if (on && !raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    new IntersectionObserver((e) => { on = e[0].isIntersecting; kick(); }, { rootMargin: "100px" }).observe(node);
    document.addEventListener("visibilitychange", kick);
  }
  const fmtSci = (v) => { const e = Math.floor(Math.log10(v)), m = v / 10 ** e; return `${m.toFixed(1)} × 10<tspan dy="-5" font-size="8">${e}</tspan>`; };

  // ================================================================ 1. rotation curve
  (function () {
    const fig = $("#rotFig"); if (!fig) return;
    const svg = $("svg", fig), slider = $("input", fig), out = $("output", fig), read = $(".readout", fig);
    const W = 640, H = 300, L = 54, R = 16, T = 14, B = 40, RMAX = 32, VMAX = 200, G = 4.30e-6;     // kpc (km/s)^2 / Msun
    const X = (r) => L + (r / RMAX) * (W - L - R), Y = (v) => T + (1 - v / VMAX) * (H - T - B);
    const GM = 150850, A = 3.6, RC = 5, VTRUE = 145;
    const vStar2 = (r) => GM * r * r / Math.pow(r * r + A * A, 1.5);
    const vHalo2 = (r, V) => V * V * (1 - (RC / r) * Math.atan(r / RC));
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const data = [];
    for (let r = 0.8; r <= 31; r += 1.25 + rnd() * 0.5) { const err = 4 + rnd() * 5; data.push([r, Math.sqrt(vStar2(r) + vHalo2(r, VTRUE)) + (rnd() - 0.5) * 1.6 * err, err]); }
    const g = el("g", {}, svg);
    const axes = el("g", {}, g);
    for (const v of [0, 50, 100, 150, 200]) { el("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: "var(--rule)" }, axes); el("text", { x: L - 8, y: Y(v) + 4, "text-anchor": "end", class: "svgtext" }, axes).textContent = v; }
    for (const r of [0, 5, 10, 15, 20, 25, 30]) el("text", { x: X(r), y: H - B + 16, "text-anchor": "middle", class: "svgtext" }, axes).textContent = r;
    el("text", { x: (L + W - R) / 2, y: H - 6, "text-anchor": "middle", class: "svgtext ink" }, axes).textContent = "distance from the centre (kpc)";
    el("text", { x: 14, y: (T + H - B) / 2, "text-anchor": "middle", class: "svgtext ink", transform: `rotate(-90 14 ${(T + H - B) / 2})` }, axes).textContent = "orbital speed (km/s)";
    const pStar = el("path", { fill: "none", stroke: "var(--ink-faint)", "stroke-width": 1.6, "stroke-dasharray": "5 4" }, g);
    const pHalo = el("path", { fill: "none", stroke: "var(--accent)", "stroke-width": 1.4, "stroke-dasharray": "2 3" }, g);
    const pTot = el("path", { fill: "none", stroke: "var(--gold)", "stroke-width": 2.4 }, g);
    const dots = el("g", {}, g);
    for (const [r, v, e] of data) { el("line", { x1: X(r), x2: X(r), y1: Y(v - e), y2: Y(v + e), stroke: "var(--ink-soft)", "stroke-width": 1 }, dots); el("circle", { cx: X(r), cy: Y(v), r: 3, fill: "var(--ink)" }, dots); }
    const leg = el("g", { class: "svgtext" }, g);
    const legItem = (y, attrs, label) => { el("line", Object.assign({ x1: W - 190, x2: W - 166, y1: y, y2: y }, attrs), leg); el("text", { x: W - 160, y: y + 4, class: "svgtext ink" }, leg).textContent = label; };
    legItem(T + 14, { stroke: "var(--ink-faint)", "stroke-width": 1.6, "stroke-dasharray": "5 4" }, "stars and gas");
    legItem(T + 32, { stroke: "var(--accent)", "stroke-width": 1.4, "stroke-dasharray": "2 3" }, "dark-matter halo");
    legItem(T + 50, { stroke: "var(--gold)", "stroke-width": 2.4 }, "total");
    const path = (f) => { let d = ""; for (let r = 0.2; r <= RMAX; r += 0.25) d += (d ? " L " : "M ") + X(r).toFixed(1) + " " + Y(Math.min(VMAX, f(r))).toFixed(1); return d; };
    pStar.setAttribute("d", path((r) => Math.sqrt(vStar2(r))));
    function update() {
      const V = (slider.value / 100) * 175;
      pHalo.setAttribute("d", V > 0 ? path((r) => Math.sqrt(vHalo2(r, V))) : "");
      pTot.setAttribute("d", path((r) => Math.sqrt(vStar2(r) + vHalo2(r, V))));
      let chi = 0; for (const [r, v, e] of data) chi += ((Math.sqrt(vStar2(r) + vHalo2(r, V)) - v) / e) ** 2; chi /= data.length;
      const mh = vHalo2(30, V) * 30 / G, ms = vStar2(30) * 30 / G;
      out.textContent = V === 0 ? "none" : (mh / ms).toFixed(1) + "× the stars";
      read.textContent = chi < 1.6 ? "✓ fits the data" : chi < 6 ? "close" : V > VTRUE ? "too much" : "too little mass";
      read.style.color = chi < 1.6 ? "var(--gold)" : "";
    }
    slider.addEventListener("input", update); update();
  })();

  // ================================================================ 2. energy ladder
  (function () {
    const fig = $("#ladderFig"); if (!fig) return;
    const svg = $("svg", fig), W = 640, L = 24, R = 24, E0 = -6, E1 = 10;
    const X = (e) => L + ((Math.log10(e) - E0) / (E1 - E0)) * (W - L - R), AY = 112;
    const bands = [["colliders", 1e9, 1e10, 0], ["time-projection chambers", 1e3, 1e6, 1], ["transition-edge sensors", 1, 1e3, 0], ["SQUATs", 1e-3, 1, 1]];
    bands.forEach(([name, a, b, row]) => {
      const y = row ? 54 : 22, sq = name === "SQUATs";
      el("rect", { x: X(a), y, width: Math.max(2, X(b) - X(a)), height: 22, rx: 4, fill: sq ? "var(--gold)" : "var(--rule)", opacity: sq ? 0.9 : 1 }, svg);
      const t = el("text", { x: (X(a) + X(b)) / 2, y: y + 15, "text-anchor": "middle", class: "svgtext ink" }, svg); t.textContent = name;
      if (sq) { t.setAttribute("fill", "var(--bg)"); t.style.fill = "var(--bg)"; t.style.fontWeight = 600; }
      if (name === "colliders") t.setAttribute("x", X(a) - 8), t.setAttribute("text-anchor", "end");
    });
    el("line", { x1: L, x2: W - R, y1: AY, y2: AY, stroke: "var(--ink-faint)" }, svg);
    for (let e = E0; e <= E1; e++) el("line", { x1: X(10 ** e), x2: X(10 ** e), y1: AY - 3, y2: AY + 3, stroke: "var(--ink-faint)" }, svg);
    for (const [e, lab] of [[-6, "µeV"], [-3, "meV"], [0, "eV"], [3, "keV"], [6, "MeV"], [9, "GeV"]]) el("text", { x: X(10 ** e), y: AY - 8, "text-anchor": "middle", class: "svgtext ink" }, svg).textContent = lab;
    const marks = [[4.3e-6, "thermal energy", "at 50 mK", 0], [3.7e-4, "break a Cooper", "pair in Al (2Δ)", 1], [4.1e-3, "1 THz", "photon", 0], [0.025, "thermal energy", "at room temperature", 2], [1.12, "silicon", "band gap", 0], [2.3, "green", "light", 1]];
    marks.forEach(([e, , , row]) => { const x = X(e); el("line", { x1: x, x2: x, y1: AY, y2: 134 + row * 34 - 4, stroke: "var(--accent)", "stroke-dasharray": "2 2" }, svg); el("circle", { cx: x, cy: AY, r: 3.2, fill: "var(--accent)" }, svg); });
    marks.forEach(([e, a, b, row]) => {
      const x = X(e), y = 134 + row * 34;
      el("text", { x, y: y + 6, "text-anchor": "middle", class: "svgtext ink halo" }, svg).textContent = a;
      el("text", { x, y: y + 20, "text-anchor": "middle", class: "svgtext halo" }, svg).textContent = b;
    });
  })();

  // ================================================================ 3. quasiparticle energy diagram
  (function () {
    const fig = $("#qpFig"); if (!fig) return;
    const svg = $("svg", fig);
    const XI0 = 24, XT0 = 232, XJ0 = 300, XJ1 = 340, XT1 = 408, XI1 = 616;
    const YC = 196, YI = 104, YT = 150, YTOP = 26;                  // condensate, island gap edge, trap gap edge
    const g = el("g", {}, svg);
    // the gaps (no states inside), shaded
    el("rect", { x: XI0, y: YI, width: XT0 - XI0, height: YC - YI, fill: "var(--rule)", opacity: 0.55 }, g);
    el("rect", { x: XT1, y: YI, width: XI1 - XT1, height: YC - YI, fill: "var(--rule)", opacity: 0.55 }, g);
    el("rect", { x: XT0, y: YT, width: XJ0 - XT0, height: YC - YT, fill: "var(--rule)", opacity: 0.55 }, g);
    el("rect", { x: XJ1, y: YT, width: XT1 - XJ1, height: YC - YT, fill: "var(--rule)", opacity: 0.55 }, g);
    el("rect", { x: XJ0, y: YTOP + 20, width: XJ1 - XJ0, height: YC - YTOP - 6, fill: "var(--ink-faint)", opacity: 0.35 }, g);
    const edge = (pts) => el("path", { d: "M " + pts.map((p) => p.join(" ")).join(" L "), fill: "none", stroke: "var(--ink-soft)", "stroke-width": 1.4 }, g);
    edge([[XI0, YI], [XT0, YI], [XT0, YT], [XJ0, YT]]); edge([[XJ1, YT], [XT1, YT], [XT1, YI], [XI1, YI]]);
    edge([[XI0, YC], [XJ0, YC]]); edge([[XJ1, YC], [XI1, YC]]);
    const lab = (x, y, t, cls, anchor) => { const n = el("text", { x, y, "text-anchor": anchor || "middle", class: "svgtext " + (cls || "") }, g); n.textContent = t; return n; };
    lab((XI0 + XT0) / 2, 240, "island (aluminium)", "ink"); lab((XT1 + XI1) / 2, 240, "island (aluminium)", "ink");
    lab((XT0 + XJ0) / 2, 240, "trap", "ink"); lab((XJ1 + XT1) / 2, 240, "trap", "ink"); lab((XJ0 + XJ1) / 2, YTOP + 12, "junction", "ink");
    lab(XI0 + 4, YC - 8, "Cooper pairs", "", "start");
    lab(XI1 - 4, (YI + YC) / 2 + 4, "2Δ", "ink", "end"); el("path", { d: `M ${XI1 - 24} ${YI + 3} L ${XI1 - 24} ${YC - 3}`, stroke: "var(--ink-faint)", "marker-start": "", fill: "none" }, g);
    lab(XI0 + 4, YI - 8, "quasiparticle states", "", "start");
    const pairsG = el("g", {}, g), fx = el("g", {}, g), qpG = el("g", {}, g);
    const pairs = [];
    for (let i = 0; i < 18; i++) { const side = i % 2, x = side ? XT1 + 20 + (i * 23) % 180 : XI0 + 18 + (i * 29) % 190; pairs.push({ x, a: el("circle", { r: 2.4, fill: "var(--ink-faint)" }, pairsG), b: el("circle", { r: 2.4, fill: "var(--ink-faint)" }, pairsG), ph: i }); }
    let t = 0, qps = [], phase = 0;
    const CYCLE = 9;
    function reset() { qpG.innerHTML = ""; fx.innerHTML = ""; qps = []; phase = 0; pairs.forEach((p) => (p.gone = false)); }
    function start() {
      const x = 120;
      const wave = el("path", { fill: "none", stroke: "var(--accent)", "stroke-width": 1.6 }, fx);
      let d = ""; for (let i = 0; i <= 40; i++) { const k = i / 40, px = x - 90 + 90 * k, py = 10 + (YC - 14 - 10) * k + Math.sin(k * 26) * 5; d += (i ? " L " : "M ") + px.toFixed(1) + " " + py.toFixed(1); }
      wave.setAttribute("d", d); wave.dataset.life = "0.9";
      const p = pairs.find((p) => !p.gone && p.x > 90 && p.x < 160) || pairs[0]; p.gone = true;
      for (const s of [-1, 1]) qps.push({ x: x + s * 4, y: YC - 4, vy: -260, mode: "up", node: el("circle", { r: 4.2, fill: "var(--gold)", stroke: "var(--bg)", "stroke-width": 1 }, qpG), s, t: 0, side: 0 });
    }
    whileVisible(fig, (dt) => {
      t += dt;
      if (t > CYCLE) { t = 0; reset(); }
      if (phase === 0 && t > 0.4) { phase = 1; start(); }
      for (const p of pairs) { const o = 2.6 + Math.sin(t * 1.5 + p.ph) * 0.5; p.a.setAttribute("cx", p.x - o); p.b.setAttribute("cx", p.x + o); p.a.setAttribute("cy", YC + 10 + (p.ph % 3) * 6); p.b.setAttribute("cy", YC + 10 + (p.ph % 3) * 6); p.a.style.opacity = p.b.style.opacity = p.gone ? 0.1 : 0.85; }
      for (const n of [...fx.children]) { const life = +n.dataset.life; n.dataset.age = (+(n.dataset.age || 0) + dt); const k = n.dataset.age / life; n.style.opacity = Math.max(0, 1 - k); if (k > 1) n.remove(); }
      for (const q of qps) {
        q.t += dt;
        if (q.mode === "up") { q.y += q.vy * dt; q.x += q.s * 30 * dt; if (q.y <= YTOP + 30) { q.mode = "relax"; q.k = 0; } }
        else if (q.mode === "relax") {             // cascades down to the gap edge, shedding phonons
          q.k += dt; q.y = Math.min(YI - 5, q.y + 90 * dt); if (Math.random() < dt * 9) { const z = el("path", { d: `M ${q.x} ${q.y} q 6 -4 12 0 t 12 0`, fill: "none", stroke: "var(--ink-faint)", "stroke-width": 1 }, fx); z.dataset.life = "0.6"; }
          if (q.y >= YI - 5) { q.mode = "diffuse"; q.v = q.s * 50; }
        } else if (q.mode === "diffuse") {          // random walk along the island, drifting to the trap
          q.v += ((Math.random() - 0.5) * 900 + 60) * dt; q.v *= 0.96; q.x += q.v * dt;
          if (q.x < XI0 + 6) { q.x = XI0 + 6; q.v = Math.abs(q.v); }
          if (q.x > XT0 - 2) { q.mode = "drop"; q.y0 = q.y; q.k = 0; const z = el("path", { d: `M ${XT0 + 4} ${YI + 6} q 6 -4 12 0 t 12 0 t 12 0`, fill: "none", stroke: "var(--ink-faint)", "stroke-width": 1 }, fx); z.dataset.life = "0.8"; }
        } else if (q.mode === "drop") {             // falls into the lower gap and cannot climb back out
          q.k += dt / 0.35; const e = Math.min(1, q.k); q.y = q.y0 + (YT - 5 - q.y0) * e; q.x += (XT0 + 30 + q.s * 10 - q.x) * Math.min(1, dt * 6);
          if (e >= 1) { q.mode = "trapped"; q.next = 0.3 + Math.random() * 0.4; q.side = 0; }
        } else if (q.mode === "trapped") {          // tunnels back and forth through the junction
          q.next -= dt;
          if (q.hop) { q.hop.k += dt / 0.22; const e = Math.min(1, q.hop.k), s = e * e * (3 - 2 * e); q.x = q.hop.a + (q.hop.b - q.hop.a) * s; if (e >= 1) q.hop = null; }
          else { q.x += (Math.random() - 0.5) * 40 * dt; q.x = q.side ? clamp(q.x, XJ1 + 6, XT1 - 6) : clamp(q.x, XT0 + 6, XJ0 - 6); }
          if (!q.hop && q.next < 0 && t < CYCLE - 1.2) {
            q.side = 1 - q.side; q.hop = { k: 0, a: q.x, b: q.side ? XJ1 + 12 + Math.random() * 40 : XJ0 - 12 - Math.random() * 40 }; q.next = 0.35 + Math.random() * 0.5;
            const f = el("circle", { cx: (XJ0 + XJ1) / 2, cy: YT - 5, r: 6, fill: "none", stroke: "var(--gold)", "stroke-width": 1.4 }, fx); f.dataset.life = "0.45";
          }
        }
        q.node.setAttribute("cx", q.x.toFixed(1)); q.node.setAttribute("cy", q.y.toFixed(1));
        q.node.style.opacity = t > CYCLE - 0.8 ? Math.max(0, (CYCLE - t) / 0.8) : 1;
      }
      for (const n of fx.children) if (n.tagName === "circle") n.setAttribute("r", 6 + (+n.dataset.age || 0) * 30);
    });
  })();

  // ================================================================ 4. transmon levels from the Hamiltonian
  // eigenvalues of a symmetric tridiagonal matrix (implicit QL), diagonal d, off-diagonal e (e[0] unused)
  function tridiagEig(d, e) {
    const n = d.length; e = e.slice(1).concat([0]);
    for (let l = 0; l < n; l++) {
      let iter = 0, m;
      do {
        for (m = l; m < n - 1; m++) { const dd = Math.abs(d[m]) + Math.abs(d[m + 1]); if (Math.abs(e[m]) <= 1e-14 * dd) break; }
        if (m !== l) {
          if (iter++ > 60) break;
          let g = (d[l + 1] - d[l]) / (2 * e[l]), r = Math.hypot(g, 1);
          g = d[m] - d[l] + e[l] / (g + (g >= 0 ? Math.abs(r) : -Math.abs(r)));
          let s = 1, c = 1, p = 0, i;
          for (i = m - 1; i >= l; i--) {
            let f = s * e[i]; const b = c * e[i];
            r = Math.hypot(f, g); e[i + 1] = r;
            if (r === 0) { d[i + 1] -= p; e[m] = 0; break; }
            s = f / r; c = g / r; g = d[i + 1] - p; r = (d[i] - g) * s + 2 * c * b; p = s * r; d[i + 1] = g + p; g = c * r - b;
          }
          if (r === 0 && i >= l) continue;
          d[l] -= p; e[l] = g; e[m] = 0;
        }
      } while (m !== l);
    }
    return d.sort((a, b) => a - b);
  }
  const N = 14;
  function levels(xi, ng) {   // energies in units of E_C
    const d = [], e = [0];
    for (let n = -N; n <= N; n++) { d.push(4 * (n - ng) ** 2); if (n > -N) e.push(-xi / 2); }
    return tridiagEig(d, e);
  }
  (function () {
    const fig = $("#bandFig"); if (!fig) return;
    const cv = $("canvas", fig), slider = $("input", fig), out = $("output", fig), read = $(".readout", fig);
    const EC = 0.62;   // GHz
    function draw() {
      const xi = 10 ** +slider.value, { c, w, h } = sizeCanvas(cv);
      const L = 46, R = 12, T = 10, B = 30, NG = 160;
      const curves = [[], []];
      let lo = Infinity, hi = -Infinity;
      for (let p = 0; p < 2; p++) for (let i = 0; i <= NG; i++) { const ng = -1 + (2 * i) / NG, E = levels(xi, ng + p * 0.5).slice(0, 3); curves[p].push(E); }
      const base = curves[0].reduce((s, E) => s + E[0], 0) / (NG + 1);
      for (const cc of curves) for (const E of cc) for (const v of E) { lo = Math.min(lo, v - base); hi = Math.max(hi, v - base); }
      const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
      const X = (ng) => L + ((ng + 1) / 2) * (w - L - R), Y = (v) => T + (1 - (v - base - lo) / (hi - lo)) * (h - T - B);
      c.font = "11px " + css("--sans"); c.fillStyle = css("--ink-faint"); c.strokeStyle = css("--rule"); c.lineWidth = 1;
      c.textAlign = "center";
      for (const ng of [-1, -0.5, 0, 0.5, 1]) { c.beginPath(); c.moveTo(X(ng), T); c.lineTo(X(ng), h - B); c.stroke(); c.fillText(ng, X(ng), h - B + 14); }
      c.fillText("offset charge (Cooper pairs)", (L + w - R) / 2, h - 3);
      c.save(); c.translate(12, (T + h - B) / 2); c.rotate(-Math.PI / 2); c.fillText("energy (units of the charging energy)", 0, 0); c.restore();
      const cols = [css("--gold"), css("--accent"), css("--ink-soft")];
      for (let p = 0; p < 2; p++) for (let m = 0; m < 3; m++) {
        c.strokeStyle = cols[m]; c.lineWidth = m === 0 ? 2 : 1.6; c.setLineDash(p ? [5, 4] : []);
        c.beginPath(); curves[p].forEach((E, i) => { const x = X(-1 + (2 * i) / NG), y = Y(E[m]); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
      }
      c.setLineDash([]);
      // the qubit frequency and its parity splitting, for E_C/h = 620 MHz
      const e0 = levels(xi, 0), eh = levels(xi, 0.5), f0 = (e0[1] - e0[0]) * EC, fh = (eh[1] - eh[0]) * EC, split = Math.abs(f0 - fh) * 1000;
      out.textContent = xi.toFixed(xi < 10 ? 1 : 0);
      read.innerHTML = `f<sub>01</sub> ≈ ${((f0 + fh) / 2).toFixed(2)} GHz · 2χ<sub>0</sub> ≈ ${split >= 1000 ? (split / 1000).toFixed(2) + " GHz" : split >= 10 ? split.toFixed(0) + " MHz" : split.toFixed(1) + " MHz"}`;
    }
    slider.addEventListener("input", draw); addEventListener("resize", draw);
    if (document.fonts) document.fonts.ready.then(draw);
    draw();
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  })();

  // ================================================================ 5. readout and a simulated detection
  (function () {
    const fig = $("#readFig"); if (!fig) return;
    const [cvS, cvT] = fig.querySelectorAll("canvas"), [sNg, sE] = fig.querySelectorAll("input"), [oNg, oE] = fig.querySelectorAll("output"), btn = $("button", fig);
    const CHI = 4.7, FW = 2.6, DEPTH = 0.86;      // MHz: half the published 2chi0 of ~9.5 MHz, a few-MHz linewidth
    const s21 = (f, fq) => { const x = 2 * (f - fq) / FW, den = 1 + x * x; return [1 - DEPTH / den, DEPTH * x / den]; };   // 1 - A/(1+ix)
    let parity = 1, tSim = 0, flips = [], trace = [], ev = null, idle = 0;
    const SPAN = 20, SPEED = 4, DT = 0.004;        // ms shown, ms per second, ms per step
    const BG = 0.02;                               // background switching, per ms (20 Hz)
    const Emev = () => 10 ** +sE.value;
    function rate(t) { if (!ev) return BG; const u = t - ev.t0; if (u < 0) return BG; return BG + ev.peak * (1 - Math.exp(-u / 0.25)) * Math.exp(-u / 1.6); }
    function deposit() { ev = { t0: tSim + 0.4, peak: 1.3 * Emev() }; idle = 0; }       // peak rate: ~1.3 kHz per meV
    btn.addEventListener("click", deposit);
    function labels() { oNg.textContent = (+sNg.value).toFixed(2); const e = Emev(); oE.textContent = (e < 10 ? e.toFixed(1) : e.toFixed(0)) + " meV"; }
    sNg.addEventListener("input", () => { labels(); drawS(); }); sE.addEventListener("input", labels); labels();
    function drawS() {
      const { c, w, h } = sizeCanvas(cvS), L = 30, R = 8, T = 8, B = 28, F = 16;
      const X = (f) => L + ((f + F) / (2 * F)) * (w - L - R), Y = (v) => T + (1 - v) * (h - T - B);
      const ch = CHI * Math.cos(Math.PI * sNg.value);
      c.font = "10.5px " + css("--sans"); c.fillStyle = css("--ink-faint"); c.strokeStyle = css("--rule"); c.textAlign = "center";
      c.beginPath(); c.moveTo(L, h - B); c.lineTo(w - R, h - B); c.stroke();
      for (const f of [-15, -10, -5, 0, 5, 10, 15]) c.fillText(f, X(f), h - B + 13);
      c.fillText("f − f₀ (MHz)", (L + w - R) / 2, h - 2); c.textAlign = "right"; c.fillText("1", L - 5, Y(1) + 4); c.fillText("0", L - 5, Y(0) + 4);
      c.save(); c.translate(9, (T + h - B) / 2); c.rotate(-Math.PI / 2); c.textAlign = "center"; c.fillText("|S21|", 0, 0); c.restore();
      for (const [p, col] of [[-1, css("--accent")], [1, css("--gold")]]) {
        const fq = p * ch; c.strokeStyle = col; c.globalAlpha = p === parity ? 1 : 0.35; c.lineWidth = p === parity ? 2.2 : 1.4;
        c.beginPath(); for (let i = 0; i <= 200; i++) { const f = -F + (2 * F * i) / 200, [re, im] = s21(f, fq); const y = Y(Math.hypot(re, im)); i ? c.lineTo(X(f), y) : c.moveTo(X(f), y); } c.stroke();
      }
      c.globalAlpha = 1; c.strokeStyle = css("--ink"); c.setLineDash([3, 3]); c.lineWidth = 1; c.beginPath(); c.moveTo(X(0), T); c.lineTo(X(0), h - B); c.stroke(); c.setLineDash([]);
      c.textAlign = "left"; c.fillStyle = css("--ink-soft"); c.fillText("tone", X(0) + 4, T + 10);
    }
    function phaseOf(p) { const ch = CHI * Math.cos(Math.PI * sNg.value), [re, im] = s21(0, p * ch); return Math.atan2(im, re); }
    function drawT() {
      const { c, w, h } = sizeCanvas(cvT), L = 34, R = 8, T = 8, mid = h * 0.52, B = 28;
      const X = (t) => L + (1 - (tSim - t) / SPAN) * (w - L - R);
      const pmax = Math.max(0.05, Math.abs(phaseOf(1))) * 1.25 + 0.1;
      const Yp = (v) => T + (mid - T - 6) / 2 * (1 - v / pmax);
      c.font = "10.5px " + css("--sans"); c.fillStyle = css("--ink-faint"); c.textAlign = "right";
      c.fillText("phase", L - 4, T + 10);
      c.strokeStyle = css("--gold"); c.lineWidth = 1.2; c.beginPath();
      trace.forEach(([t, v], i) => { const x = X(t), y = Yp(v); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
      // switching rate in 0.5 ms bins (kHz)
      const BIN = 0.5, n = Math.round(SPAN / BIN), bins = new Array(n).fill(0), t0 = Math.floor((tSim - SPAN) / BIN) * BIN;
      for (const t of flips) { const i = Math.floor((t - t0) / BIN); if (i >= 0 && i < n) bins[i]++; }
      const peak = Math.max(4, ...bins.map((b) => b / BIN)), top = mid + 6, bot = h - B;
      c.fillText("rate", L - 4, top + 10); c.fillText(peak.toFixed(0) + " kHz", w - R, top + 10);
      c.strokeStyle = css("--rule"); c.beginPath(); c.moveTo(L, bot + 0.5); c.lineTo(w - R, bot + 0.5); c.stroke();
      c.fillStyle = css("--accent");
      bins.forEach((b, i) => { if (!b) return; const xa = Math.max(L, X(t0 + i * BIN)), xb = X(t0 + (i + 1) * BIN), y = bot - (b / BIN / peak) * (bot - top - 14); if (xb > L) c.fillRect(xa + 0.5, y, Math.max(1, xb - xa - 1), bot - y); });
      c.fillStyle = css("--ink-faint"); c.textAlign = "center";
      for (let k = 0; k <= 4; k++) { const t = tSim - SPAN + (k * SPAN) / 4; c.fillText(((k * SPAN) / 4 - SPAN).toFixed(0) + " ms", X(t), h - B + 13); }
      c.fillText("time (simulated)", (L + w - R) / 2, h - 2);
    }
    whileVisible(fig, (dt) => {
      const steps = Math.round((dt * SPEED) / DT);
      for (let i = 0; i < steps; i++) {
        tSim += DT;
        if (Math.random() < rate(tSim) * DT) { parity = -parity; flips.push(tSim); }
        if (i % 2 === 0) trace.push([tSim, phaseOf(parity) + (Math.random() - 0.5) * 0.06]);
      }
      while (trace.length && trace[0][0] < tSim - SPAN) trace.shift();
      while (flips.length && flips[0] < tSim - SPAN - 1) flips.shift();
      if (ev && tSim - ev.t0 > 12) ev = null;
      idle += dt; if (idle > 9) deposit();                 // keep it alive if nobody presses the button
      drawS(); drawT();
    });
    drawS(); drawT();
  })();

  // ================================================================ 6. the finite-element simulation
  (function () {
    const fig = $("#simFig"); if (!fig) return;
    const cv = $("canvas", fig), tipEl = $(".sim-tip", fig), [cMesh, cField] = fig.querySelectorAll("input"), read = $(".readout", fig);
    let D = null, grid = null, view = null;
    // inferno-like colour map
    const STOPS = [[0, [0, 0, 4]], [0.15, [31, 12, 72]], [0.3, [85, 15, 109]], [0.45, [136, 34, 106]], [0.6, [186, 54, 85]], [0.72, [227, 89, 51]], [0.85, [249, 140, 10]], [0.95, [249, 201, 50]], [1, [252, 255, 164]]];
    const cmap = (t) => { t = clamp(t, 0, 1); for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) { const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i], k = (t - a) / (b - a); return ca.map((v, j) => Math.round(v + (cb[j] - v) * k)); } return STOPS[STOPS.length - 1][1]; };
    function draw() {
      const { c, w, h } = sizeCanvas(cv);
      if (!D) { c.fillStyle = "#8a8d93"; c.font = "13px " + css("--sans"); c.textAlign = "center"; c.fillText("loading the simulation…", w / 2, h / 2); return; }
      const [x0, y0, x1, y1] = D.bounds, s = Math.min(w / (x1 - x0), h / (y1 - y0)), ox = (w - s * (x1 - x0)) / 2, oy = (h - s * (y1 - y0)) / 2;
      view = { s, ox, oy, x0, y1 };
      const P = (i) => [ox + (D.verts[2 * i] - x0) * s, oy + (y1 - D.verts[2 * i + 1]) * s];
      const lo = D.range[0], hi = D.range[1], tris = D.tris, nT = tris.length / 3;
      c.save(); c.beginPath(); c.rect(ox, oy, s * (x1 - x0), s * (y1 - y0)); c.clip();   // the crop edge is ragged
      if (cField.checked) {
        for (let t = 0; t < nT; t++) {
          const a = P(tris[3 * t]), b = P(tris[3 * t + 1]), d = P(tris[3 * t + 2]), v = (D.logU[t] - lo) / (hi - lo), [r, g, bb] = cmap(v);
          c.fillStyle = `rgb(${r},${g},${bb})`; c.strokeStyle = c.fillStyle; c.lineWidth = 0.6;
          c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...d); c.closePath(); c.fill(); c.stroke();
        }
      }
      if (D.metal) {
        c.fillStyle = cField.checked ? "rgba(214,218,224,0.16)" : "rgba(214,218,224,0.55)";
        for (const poly of D.metal) { c.beginPath(); poly.forEach(([x, y], i) => { const px = ox + (x - x0) * s, py = oy + (y1 - y) * s; i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.closePath(); c.fill("evenodd"); }
      }
      if (cMesh.checked) {
        c.strokeStyle = cField.checked ? "rgba(255,255,255,0.22)" : "rgba(160,190,230,0.5)"; c.lineWidth = 0.5; c.beginPath();
        for (let t = 0; t < nT; t++) { const a = P(tris[3 * t]), b = P(tris[3 * t + 1]), d = P(tris[3 * t + 2]); c.moveTo(...a); c.lineTo(...b); c.lineTo(...d); c.lineTo(...a); }
        c.stroke();
      }
      c.restore();
      // colour bar and scale bar
      const bw = Math.min(160, w * 0.35), bx = w - bw - 14, by = h - 22;
      for (let i = 0; i < bw; i++) { const [r, g, b] = cmap(i / bw); c.fillStyle = `rgb(${r},${g},${b})`; c.fillRect(bx + i, by, 1, 8); }
      c.fillStyle = "#dfe3e8"; c.font = "11px " + css("--sans"); c.textAlign = "left"; c.fillText("field energy density (log)", bx, by - 5);
      const um = 50 * Math.pow(10, Math.round(Math.log10(((x1 - x0) / 5) / 50))), len = um * s;
      c.fillRect(14, h - 18, len, 2); c.fillText(um + " µm", 14, h - 24);
    }
    function locate(px, py) {
      if (!D || !view) return null;
      const x = (px - view.ox) / view.s + view.x0, y = view.y1 - (py - view.oy) / view.s;
      const gx = Math.floor((x - grid.x0) / grid.cs), gy = Math.floor((y - grid.y0) / grid.cs), cell = gx >= 0 && gx < grid.nx && gy >= 0 ? grid.cells[gy * grid.nx + gx] : null;
      if (!cell) return { x, y, t: -1 };
      for (const t of cell) {
        const i = D.tris[3 * t], j = D.tris[3 * t + 1], k = D.tris[3 * t + 2], V = D.verts;
        const ax = V[2 * i], ay = V[2 * i + 1], bx = V[2 * j], by = V[2 * j + 1], cx = V[2 * k], cy = V[2 * k + 1];
        const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy), l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d, l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
        if (l1 >= -1e-9 && l2 >= -1e-9 && l1 + l2 <= 1 + 1e-9) return { x, y, t, size: Math.sqrt(Math.abs(d) / 2) };
      }
      return { x, y, t: -1 };
    }
    cv.addEventListener("pointermove", (e) => {
      const r = cv.getBoundingClientRect(), hit = locate(e.clientX - r.left, e.clientY - r.top);
      if (!hit || hit.t < 0) { tipEl.style.opacity = 0; return; }
      const u = D.logU[hit.t] - D.range[1];
      tipEl.innerHTML = `${hit.x.toFixed(1)}, ${hit.y.toFixed(1)} µm · energy ${u > -0.05 ? "max" : "10<sup>" + u.toFixed(1) + "</sup> × max"} · element ≈ ${hit.size < 1 ? (hit.size * 1000).toFixed(0) + " nm" : hit.size.toFixed(1) + " µm"}`;
      tipEl.style.left = clamp(e.clientX - r.left + 12, 0, r.width - tipEl.offsetWidth) + "px"; tipEl.style.top = (e.clientY - r.top + 14) + "px"; tipEl.style.opacity = 1;
    });
    cv.addEventListener("pointerleave", () => (tipEl.style.opacity = 0));
    [cMesh, cField].forEach((b) => b.addEventListener("change", draw));
    addEventListener("resize", draw);
    draw();
    fetch("assets/squat-sim.json?v=20261127a").then((r) => r.json()).then((d) => {
      D = d; D.verts = Float32Array.from(d.verts.flat ? d.verts.flat() : d.verts); D.tris = Uint32Array.from(d.tris.flat ? d.tris.flat() : d.tris); D.logU = Float32Array.from(d.logU);
      // a coarse grid of triangles for hover lookups
      const [x0, y0, x1, y1] = D.bounds, cs = (x1 - x0) / 80, nx = Math.ceil((x1 - x0) / cs) + 1, ny = Math.ceil((y1 - y0) / cs) + 1, cells = new Array(nx * ny);
      for (let t = 0; t < D.tris.length / 3; t++) {
        let ax = Infinity, ay = Infinity, bx = -Infinity, by = -Infinity;
        for (let q = 0; q < 3; q++) { const v = D.tris[3 * t + q]; ax = Math.min(ax, D.verts[2 * v]); bx = Math.max(bx, D.verts[2 * v]); ay = Math.min(ay, D.verts[2 * v + 1]); by = Math.max(by, D.verts[2 * v + 1]); }
        for (let gy = Math.max(0, Math.floor((ay - y0) / cs)); gy <= Math.min(ny - 1, Math.floor((by - y0) / cs)); gy++) for (let gx = Math.max(0, Math.floor((ax - x0) / cs)); gx <= Math.min(nx - 1, Math.floor((bx - x0) / cs)); gx++) { const k = gy * nx + gx; (cells[k] || (cells[k] = [])).push(t); }
      }
      grid = { x0, y0, cs, nx, cells };
      if (d.caption) $("#simCap").innerHTML = d.caption;
      if (d.readout) read.innerHTML = d.readout;
      draw();
    }).catch(() => { read.textContent = ""; });
  })();
})();
