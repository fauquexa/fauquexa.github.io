/* The SQUAT figure in Research: a 9 mm chip with three pizza SQUATs on one feedline, which zooms smoothly
   into a single SQUAT and back. Everything is drawn in micrometres in one coordinate system; the view is the
   SVG viewBox. Pizza islands as on our wafers (radius 90 um, 100 deg opening, 15 um junction gap, four flux
   holes per island at 0.62 R), a charge line ending in a tip above the top island, and a modified-Dolan
   junction whose lower-gap leads trap quasiparticles (shown magnified in an inset).

   A detection runs on a loop: each time either a particle hits the silicon (phonons) or a THz photon is
   absorbed by the islands, Cooper pairs break in proportion to the energy, the quasiparticles wander, get
   trapped in the junction leads and tunnel back and forth, and every tunnelling flips the charge parity, which
   the live trace on the right shows as the qubit frequency jumping by 2 chi. Hover or tap a part for what it
   is; the description appears in the panel on the right. The numbers are illustrative, not a simulation. */
(function () {
  const fig = document.getElementById("squatFig");
  if (!fig) return;
  const NS = "http://www.w3.org/2000/svg";
  const svg = fig.querySelector("svg"), stage = fig.querySelector(".sq-stage");
  const stepEl = fig.querySelector(".sq-step"), infoT = fig.querySelector(".sq-info-t"), infoD = fig.querySelector(".sq-info-d");
  const traceCv = fig.querySelector(".sq-trace canvas"), hint = fig.querySelector(".sq-hint");
  const btnChip = fig.querySelector('[data-view="chip"]'), btnSquat = fig.querySelector('[data-view="squat"]');
  const el = (name, attrs, parent) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };

  // ---------------------------------------------------------------- geometry (um, y down)
  const CHIP = 4500, SX = [-2400, 0, 2400];                     // chip half-size, SQUAT centres along the line
  const R = 90, OPEN = 100, g = 7.5;                            // pizza radius, opening angle, half junction gap
  const LINE_Y = 166, LW = 6, LG = 6;                           // feedline: centre conductor top edge, width, gaps
  const POCKET = { x: -120, y: -150, w: 240, h: LINE_Y - LG + 150 };
  const CL = { w: 4, gap: 4, tipY: -110 };                      // charge line: centre, gaps, tip position
  const PAD_Y = -4150;                                          // charge-line bond pads
  const half = (OPEN / 2) * Math.PI / 180;

  const INFO = {
    chip: ["A three-SQUAT chip", "Three SQUATs share one feedline across a 9 mm silicon chip. Each sits at its own frequency, so one line reads them all, and a particle hit anywhere on the chip sends phonons to every one of them. Click a SQUAT to zoom in."],
    ground: ["Ground plane", "The aluminium film covering most of the chip, held at ground. It shields the qubits and gives the microwaves a return path."],
    launch: ["Launch pad", "Where the feedline meets the outside world: a wire bond connects it to the coaxial cables of the fridge. The line tapers from the wide pad down to the narrow on-chip waveguide."],
    bondpad: ["Charge-line pad", "A bond pad for one SQUAT's charge line. A small voltage here reaches that SQUAT's island."],
    feedline: ["Feedline", "A coplanar waveguide carrying the microwave readout tone. The SQUATs couple to it directly, with no readout resonator, each at its own frequency, so many can share one line."],
    chargeLine: ["Charge line", "A thin coplanar line that ends in a sharp tip a few micrometres from the top island. A voltage on it sets the island's offset charge; the tip keeps the coupling tiny, so the line doesn't drain energy from the qubit."],
    pocket: ["Silicon substrate", "Bare silicon where the aluminium was etched away. Energy deposited in the chip spreads through it as phonons, quantised lattice vibrations, and can reach every SQUAT on the chip."],
    islandTop: ["Superconducting island", "One of the qubit's two aluminium islands, a 90 µm pizza slice. Below about 1.2 K its electrons bind into Cooper pairs, which flow without resistance. A phonon or photon carrying more than twice the superconducting gap (about 0.36 meV) can break a pair into two quasiparticles."],
    islandBottom: ["Superconducting island and antenna", "The second island. Together the two slices form the qubit, a tiny nonlinear LC circuit, and also an antenna: THz photons of the right frequency are absorbed directly in the islands, where they break Cooper pairs."],
    junction: ["Josephson junction (modified Dolan)", "Two thin leads overlap through about 1 nm of aluminium oxide, made with a suspended resist bridge and two angled evaporations. Cooper pairs tunnel through it coherently, which makes the circuit a qubit. The leads have a lower critical temperature, so a smaller gap, than the islands: quasiparticles that wander in lose energy and cannot climb back out. Trapped at the junction, they tunnel again and again, each time flipping the charge parity."],
    holes: ["Flux-trapping holes", "Small holes in the islands that pin magnetic vortices in place, so stray flux trapped in the film cannot wander around and add loss."],
  };

  const parts = [];
  function part(name, kind, k) {
    const gEl = el("g", { "data-part": name, class: "sq-part sq-" + kind, tabindex: "0", role: "button", "aria-label": INFO[name][0] });
    if (k !== undefined) gEl.dataset.sq = k;
    parts.push(gEl); return gEl;
  }
  const P = (x, y) => `${x.toFixed(2)} ${y.toFixed(2)}`;

  // chip: ground metal inside a thin chip edge
  const gGround = part("ground", "metal");
  el("rect", { x: -CHIP, y: -CHIP, width: 2 * CHIP, height: 2 * CHIP, rx: 20 }, gGround);

  // feedline with launch pads at both edges (substrate band first, then the centre conductor on top)
  const gLine = part("feedline", "line");
  const yc = LINE_Y + LW / 2;
  el("rect", { x: -3800, y: LINE_Y - LG, width: 7600, height: LW + 2 * LG, class: "sq-subf" }, gLine);
  el("rect", { x: -3800, y: LINE_Y, width: 7600, height: LW, class: "sq-metalf" }, gLine);
  el("rect", { x: -3800, y: LINE_Y - LG - 10, width: 7600, height: LW + 2 * LG + 20, fill: "transparent" }, gLine);
  for (const s of [-1, 1]) {
    const gL = part("launch", "line pop");
    const xe = s * 4100, xt = s * 3800, xo = s * 4430;
    el("path", { d: `M ${P(xt, yc - LW / 2 - LG)} L ${P(xe, yc - 225)} L ${P(xo, yc - 225)} L ${P(xo, yc + 225)} L ${P(xe, yc + 225)} L ${P(xt, yc + LW / 2 + LG)} Z`, class: "sq-subf" }, gL);
    el("path", { d: `M ${P(xt, yc - LW / 2)} L ${P(xe, yc - 150)} L ${P(s * 4380, yc - 150)} L ${P(s * 4380, yc + 150)} L ${P(xe, yc + 150)} L ${P(xt, yc + LW / 2)} Z`, class: "sq-metalf" }, gL);
  }

  // per SQUAT: pocket, charge line with its pad, two pizza islands, holes, junction
  const squats = SX.map((sx, k) => {
    const o = {};
    // charge-line pad and the line down to the pocket
    const gPad = part("bondpad", "line pop", k);
    el("rect", { x: sx - 225, y: PAD_Y - 225, width: 450, height: 450, rx: 10, class: "sq-subf" }, gPad);
    el("rect", { x: sx - 125, y: PAD_Y - 125, width: 250, height: 250, rx: 6, class: "sq-metalf" }, gPad);
    const gCL = part("chargeLine", "line", k);
    const yTop = PAD_Y + 225, yTaper = yTop + 300, cw = CL.w / 2, cg = CL.w / 2 + CL.gap;
    el("path", { d: `M ${P(sx - 225, yTop)} L ${P(sx - cg, yTaper)} L ${P(sx - cg, POCKET.y)} L ${P(sx + cg, POCKET.y)} L ${P(sx + cg, yTaper)} L ${P(sx + 225, yTop)} Z`, class: "sq-subf" }, gCL);
    el("path", { d: `M ${P(sx - 125, yTop - 10)} L ${P(sx - cw, yTaper)} L ${P(sx - cw, CL.tipY - 12)} L ${P(sx, CL.tipY)} L ${P(sx + cw, CL.tipY - 12)} L ${P(sx + cw, yTaper)} L ${P(sx + 125, yTop - 10)} Z`, class: "sq-metalf" }, gCL);
    el("rect", { x: sx - 14, y: yTaper, width: 28, height: CL.tipY - yTaper + 6, fill: "transparent" }, gCL);
    // the pocket, opening onto the feedline's upper gap
    const gPocket = part("pocket", "sub", k);
    el("rect", { x: sx + POCKET.x, y: POCKET.y, width: POCKET.w, height: POCKET.h + 2, rx: 12 }, gPocket);
    // charge line inside the pocket again on top (the pocket covers its gaps)
    const gCL2 = part("chargeLine", "line", k);
    el("path", { d: `M ${P(sx - cw, POCKET.y - 1)} L ${P(sx - cw, CL.tipY - 12)} L ${P(sx, CL.tipY)} L ${P(sx + cw, CL.tipY - 12)} L ${P(sx + cw, POCKET.y - 1)} Z`, class: "sq-metalf" }, gCL2);
    el("rect", { x: sx - 12, y: POCKET.y, width: 24, height: CL.tipY - POCKET.y + 6, fill: "transparent" }, gCL2);
    o.rings = el("g", { class: "sq-rings", "pointer-events": "none" });
    // pizza islands
    for (const [name, side] of [["islandTop", -1], ["islandBottom", 1]]) {
      const gI = part(name, "metal pop", k), ay = side * g, dir = side * Math.PI / 2;
      const a0 = dir - half, a1 = dir + half;
      el("path", { d: `M ${P(sx, ay)} L ${P(sx + R * Math.cos(a0), ay + R * Math.sin(a0))} A ${R} ${R} 0 0 1 ${P(sx + R * Math.cos(a1), ay + R * Math.sin(a1))} Z`, class: "sq-island" }, gI);
    }
    const gHoles = part("holes", "sub pop", k);
    for (const side of [-1, 1]) for (const f of [-0.75, -0.3, 0.3, 0.75]) {
      const a = side * Math.PI / 2 + f * half;
      el("circle", { cx: sx + 0.62 * R * Math.cos(a), cy: 0.62 * R * Math.sin(a), r: 2.6 }, gHoles);
    }
    // the junction: lower-gap leads from both apexes, overlapping at the centre
    const gJJ = part("junction", "jj pop", k);
    el("rect", { x: sx - 0.9, y: -g - 0.4, width: 1.8, height: g + 1.4, class: "sq-lead" }, gJJ);
    el("rect", { x: sx - 0.5, y: -1, width: 1.0, height: g + 1.4, class: "sq-lead" }, gJJ);
    el("rect", { x: sx - 1.1, y: -1.1, width: 2.2, height: 2.2, rx: 0.4, class: "sq-barrier" }, gJJ);
    el("circle", { cx: sx, cy: 0, r: 11, fill: "transparent" }, gJJ);
    o.sx = sx; return o;
  });

  // thin lines that keep the feedline and charge lines visible when zoomed out to the whole chip
  const gOver = el("g", { class: "sq-over", "pointer-events": "none" });
  el("line", { x1: -3800, y1: yc, x2: 3800, y2: yc }, gOver);
  for (const sx of SX) el("line", { x1: sx, y1: PAD_Y + 225, x2: sx, y2: POCKET.y }, gOver);
  for (const sx of SX) el("circle", { cx: sx, cy: 0, r: 360, class: "sq-mark" }, gOver);      // where the SQUATs are

  // animation layers, and the magnified junction, follow the SQUAT in focus
  const gAnim = el("g", { class: "sq-anim", "pointer-events": "none" });
  const gPairs = el("g", { class: "sq-pairs" }, gAnim), gQP = el("g", { class: "sq-qps" }, gAnim), gFx = el("g", { class: "sq-fx" }, gAnim);
  // the inset: the junction ten times larger, leads in the lower-gap colour, the oxide overlap in gold
  const INS = { x: 86, y: -40, r: 30, m: 10 };
  const gIns = el("g", { class: "sq-inset", "pointer-events": "none" }, gAnim);
  el("line", { x1: 2, y1: -2, x2: INS.x - INS.r * 0.85, y2: INS.y + INS.r * 0.5, class: "sq-ins-guide" }, gIns);
  el("defs", {}, gIns).innerHTML = `<clipPath id="sqInsClip"><circle cx="${INS.x}" cy="${INS.y}" r="${INS.r}"/></clipPath>`;
  const gInsIn = el("g", { "clip-path": "url(#sqInsClip)" }, gIns);
  el("circle", { cx: INS.x, cy: INS.y, r: INS.r, class: "sq-ins-bg" }, gInsIn);
  const ix = (u) => INS.x + u * INS.m / 10, iy = (v) => INS.y + v * INS.m / 10;   // inset units: 0.1 um
  el("rect", { x: ix(-3), y: iy(-40), width: 6 * INS.m / 10, height: 42 * INS.m / 10, class: "sq-lead" }, gInsIn);   // top lead
  el("rect", { x: ix(-1.4), y: iy(-2.5), width: 2.8 * INS.m / 10, height: 43 * INS.m / 10, class: "sq-lead" }, gInsIn);   // bottom lead's finger
  el("rect", { x: ix(-3), y: iy(12), width: 6 * INS.m / 10, height: 30 * INS.m / 10, class: "sq-lead" }, gInsIn);
  el("rect", { x: ix(-1.6), y: iy(-2.6), width: 3.2 * INS.m / 10, height: 5 * INS.m / 10, rx: 0.3, class: "sq-barrier" }, gInsIn);
  const gInsQP = el("g", {}, gInsIn);
  el("circle", { cx: INS.x, cy: INS.y, r: INS.r, class: "sq-ins-ring" }, gIns);
  const insLabel = el("text", { x: INS.x, y: INS.y + INS.r + 8, class: "sq-ins-label" }, gIns); insLabel.textContent = "mDolan junction ×10";

  // ---------------------------------------------------------------- the view: chip <-> one SQUAT, smoothly
  let focus = 1, view = [-200, -208, 400, 400], anim = null;
  const VIEW_SQUAT = (k) => [SX[k] - 200, -208, 400, 400], VIEW_CHIP = [-4700, -4700, 9400, 9400];
  const setView = (v) => { view = v; svg.setAttribute("viewBox", v.map((n) => n.toFixed(2)).join(" ")); };
  function zoomTo(target, dur) {
    const from = view.slice(), w0 = from[2], w1 = target[2];
    const c0 = [from[0] + w0 / 2, from[1] + from[3] / 2], c1 = [target[0] + w1 / 2, target[1] + target[3] / 2];
    anim = { t: 0, dur: dur || 1.4, step(k) {
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;          // ease in-out
      const w = Math.exp(Math.log(w0) + (Math.log(w1) - Math.log(w0)) * e);       // zoom evenly in log scale
      const p = w0 === w1 ? e : (1 / w - 1 / w0) / (1 / w1 - 1 / w0);             // the centre follows the zoom
      setView([c0[0] + (c1[0] - c0[0]) * p - w / 2, c0[1] + (c1[1] - c0[1]) * p - w / 2, w, w]);
    } };
  }
  const zoomedOut = () => view[2] > 2000;
  function viewUi() {
    const w = view[2], o = Math.max(0, Math.min(1, (Math.log(w) - Math.log(1200)) / (Math.log(5000) - Math.log(1200))));
    gOver.style.opacity = o;
    gIns.style.opacity = Math.max(0, Math.min(1, (900 - w) / 400));
    hint.hidden = !zoomedOut() || anim !== null;
    btnChip.classList.toggle("on", w > 2000); btnSquat.classList.toggle("on", w <= 2000);
    btnChip.setAttribute("aria-pressed", String(w > 2000)); btnSquat.setAttribute("aria-pressed", String(w <= 2000));
  }
  function focusOn(k) {
    focus = k; gAnim.setAttribute("transform", `translate(${SX[k]} 0)`);
    resetDetection();
  }
  btnChip.addEventListener("click", () => zoomTo(VIEW_CHIP));
  btnSquat.addEventListener("click", () => zoomTo(VIEW_SQUAT(focus)));

  // ---------------------------------------------------------------- hover and tap: the description on the right
  let pinned = null;
  const DEFAULT = ["Explore the device", "Hover over or tap any part to see what it is and what it does. Use Chip and SQUAT to zoom between the whole chip and one qubit."];
  function describe(name, k) {
    let [t, d] = name ? INFO[name] : DEFAULT;
    if (name && zoomedOut() && k !== undefined && !["ground", "feedline", "launch"].includes(name)) [t, d] = [`SQUAT ${+k + 1} of 3`, INFO.chip[1]];
    infoT.textContent = t; infoD.textContent = d;
    parts.forEach((n) => n.classList.toggle("hl", !!name && n.dataset.part === name && (n.dataset.sq === undefined || n.dataset.sq === k)));
  }
  parts.forEach((n) => {
    const k = n.dataset.sq;
    n.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !pinned) describe(n.dataset.part, k); });
    n.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !pinned) describe(null); });
    n.addEventListener("focus", () => describe(n.dataset.part, k));
    n.addEventListener("click", (e) => {
      e.stopPropagation();
      if (zoomedOut()) { if (k !== undefined) zoomK(+k); else zoomNearest(e); return; }
      if (pinned === n) { pinned = null; describe(null); } else { pinned = n; describe(n.dataset.part, k); }
    });
    n.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); n.dispatchEvent(new MouseEvent("click")); } });
  });
  // zoomed out, a click anywhere on the chip zooms into the nearest SQUAT
  function zoomNearest(e) {
    const m = svg.getScreenCTM(); if (!m) return;
    const x = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()).x;
    let k = 0; SX.forEach((sx, i) => { if (Math.abs(sx - x) < Math.abs(SX[k] - x)) k = i; });
    zoomK(k);
  }
  function zoomK(k) { focusOn(k); zoomTo(VIEW_SQUAT(k)); describe(null); pinned = null; }
  svg.addEventListener("click", (e) => { if (zoomedOut()) zoomNearest(e); });
  document.addEventListener("click", (e) => { if (pinned && !stage.contains(e.target)) { pinned = null; describe(null); } });

  // ---------------------------------------------------------------- the detection
  const rnd = Math.random, TAU = Math.PI * 2;
  const inIsland = (x, y, side) => { const dy = y - side * g, d = Math.hypot(x, dy); if (d > R - 3 || d < 3) return false; const a = Math.atan2(dy, x) - side * Math.PI / 2; return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < half - 0.05; };
  const randomIn = (side) => { for (;;) { const d = 10 + rnd() * (R - 16), a = side * Math.PI / 2 + (rnd() * 2 - 1) * (half - 0.1); const x = d * Math.cos(a), y = side * g + d * Math.sin(a); if (inIsland(x, y, side)) return [x, y]; } };
  const pairs = [];
  for (let i = 0; i < 20; i++) {
    const side = i % 2 ? 1 : -1, [x, y] = randomIn(side);
    pairs.push({ x, y, side, ph: rnd() * TAU, a: el("circle", { r: 1.6 }, gPairs), b: el("circle", { r: 1.6 }, gPairs), broken: false });
  }
  const placePair = (p, t) => { const ox = Math.cos(p.ph + t * 1.3) * 1.8, oy = Math.sin(p.ph + t * 1.3) * 1.8; p.a.setAttribute("cx", p.x + ox); p.a.setAttribute("cy", p.y + oy); p.b.setAttribute("cx", p.x - ox); p.b.setAttribute("cy", p.y - oy); };

  let qps = [], trapped = [], rings = [], fx = [], parity = 1, ev = null, cycleT = 0, flips = 0;
  const CYCLE = 9.5;
  const fmtE = (meV) => (meV >= 1000 ? (meV / 1000).toFixed(2) + " eV" : meV >= 100 ? Math.round(meV) + " meV" : meV.toFixed(1) + " meV");
  function resetDetection() {
    qps.forEach((q) => q.node.remove()); trapped.forEach((q) => { q.node.remove(); q.dot.remove(); });
    rings.forEach((r) => r.node && r.node.remove()); fx.forEach((f) => f.node.remove());
    qps = []; trapped = []; rings = []; fx = []; ev = null; cycleT = 0; flips = 0;
    pairs.forEach((p) => { p.broken = false; p.a.style.opacity = ""; p.b.style.opacity = ""; });
  }
  // Energy -> broken pairs: a THz photon (0.3-1.5 THz, 1.2-6.2 meV) is absorbed in an island and about
  // 60 % of it breaks pairs at roughly 0.6 meV each; a particle hit (20 meV - 2 eV, log-uniform) deposits its
  // energy in the silicon and only about 1 % of it reaches the islands as pair-breaking phonons.
  function newEvent() {
    const photon = rnd() < 0.5;
    let E, label, txt, npairs, x, y, side;
    if (photon) {
      const f = 0.3 + rnd() * 1.2; E = 4.136 * f; npairs = Math.max(1, Math.round(0.6 * E / 0.6));
      label = `γ ${f.toFixed(2)} THz`; txt = `A THz photon (${f.toFixed(2)} THz, ${fmtE(E)}) is absorbed by the islands, which double as its antenna.`;
      side = rnd() < 0.5 ? -1 : 1; [x, y] = randomIn(side);
      const wave = el("path", { d: wavePath(x, y), class: "sq-photon" }, gFx); fx.push({ node: wave, t: 0, life: 1.1, kind: "photon" });
    } else {
      E = Math.exp(Math.log(20) + rnd() * (Math.log(2000) - Math.log(20))); npairs = Math.min(10, Math.max(1, Math.round(0.01 * E / 0.6)));
      label = `phonons ${fmtE(E)}`; txt = `A particle passes through the chip and leaves ${fmtE(E)} in the silicon. It spreads out as phonons.`;
      do { x = (rnd() * 2 - 1) * 110; y = -140 + rnd() * 280; } while (Math.hypot(x, y) < R + 15);
      rings.push({ x, y, t: 0 }, { x, y, t: -0.22 }, { x, y, t: -0.44 });
      fx.push({ node: el("line", { x1: x - 60, y1: y - 110, x2: x + 60, y2: y + 110, class: "sq-track" }, gFx), t: 0, life: 0.9 });
      fx.push({ node: el("circle", { cx: x, cy: y, r: 2.5, class: "sq-hit" }, gFx), t: 0, life: 1.0, grow: 8 });
    }
    ev = { photon, E, label, txt, npairs, x, y, side, broke: false, at: tNow };
    marks.push([tNow, label]);
  }
  function wavePath(x, y) {        // a short wiggle coming in from the upper left
    const x0 = x - 120, y0 = y - 70, n = 40; let d = `M ${P(x0, y0)}`;
    for (let i = 1; i <= n; i++) { const k = i / n, px = x0 + (x - x0) * k, py = y0 + (y - y0) * k, off = Math.sin(k * 14 * Math.PI) * 4 * (1 - k * 0.6); d += ` L ${P(px + off * 0.5, py - off * 0.85)}`; }
    return d;
  }
  function breakPairs() {
    ev.broke = true;
    let spots;
    if (ev.photon) spots = Array.from({ length: ev.npairs }, () => { const [x, y] = [ev.x + (rnd() - 0.5) * 10, ev.y + (rnd() - 0.5) * 10]; return inIsland(x, y, ev.side) ? [x, y, ev.side] : [ev.x, ev.y, ev.side]; });
    else spots = Array.from({ length: ev.npairs }, () => { const side = rnd() < (ev.y < 0 ? 0.7 : 0.3) ? -1 : 1, [x, y] = randomIn(side); return [x, y, side]; });
    fx.push({ node: el("circle", { cx: ev.x, cy: ev.y, r: 3, class: "sq-hit" }, gFx), t: 0, life: 0.8, grow: 6 });
    spots.forEach(([x, y, side], i) => {
      const p = pairs.find((p) => !p.broken && p.side === side);
      if (p) { p.broken = true; p.a.style.opacity = 0; p.b.style.opacity = 0; p.mendAt = 7.8 + rnd(); }
      for (const s of [-1, 1]) {
        const a = rnd() * TAU;
        qps.push({ x, y, vx: Math.cos(a) * 28 * s, vy: Math.sin(a) * 28 * s, side, node: el("circle", { cx: x, cy: y, r: 2.2, class: "sq-qp" }, gQP), t: 0, life: 3.4 + rnd() * 1.4 });
      }
    });
  }
  function trap(q) {               // into the lower-gap lead: it stays at the junction and tunnels
    q.node.remove();
    const tq = { side: q.side, u: (rnd() - 0.5) * 3, v: q.side * (10 + rnd() * 20), vu: (rnd() - 0.5) * 30, vv: (rnd() - 0.5) * 40, t: 0, life: 1.6 + rnd() * 1.8, hop: null,
                 node: el("circle", { r: 2.1, class: "sq-qp" }, gInsQP), dot: el("circle", { r: 1.6, class: "sq-qp" }, gQP) };
    trapped.push(tq);
  }
  function tunnel(tq) {
    tq.hop = { t: 0, from: tq.v, to: -tq.side * (4 + rnd() * 6) }; parity = -parity; flips++;
    fx.push({ node: el("circle", { cx: 0, cy: 0, r: 2, class: "sq-tunnel" }, gFx), t: 0, life: 0.5, grow: 7 });
    fx.push({ node: el("circle", { cx: INS.x, cy: INS.y, r: 3, class: "sq-tunnel" }, gIns), t: 0, life: 0.5, grow: 10 });
  }

  function step(dt) {
    cycleT += dt;
    if (cycleT >= CYCLE) { cycleT -= CYCLE; ev = null; flips = 0; }
    if (!ev && cycleT >= 0.3) newEvent();
    if (ev && !ev.broke && cycleT >= (ev.photon ? 1.15 : 1.35)) breakPairs();
    for (const r of rings) {
      r.t += dt;
      if (!r.node && r.t > 0) r.node = el("circle", { cx: r.x, cy: r.y, class: "sq-ring" }, squats[focus].rings);
      if (r.node) { const k = r.t / 1.5; r.node.setAttribute("r", 3 + k * 260); r.node.setAttribute("transform", `translate(${SX[focus]} 0)`); r.node.style.opacity = Math.max(0, 0.6 * (1 - k)); }
    }
    rings = rings.filter((r) => { if (r.t > 1.5) { r.node && r.node.remove(); return false; } return true; });
    for (const f of fx) { f.t += dt; const k = f.t / f.life; f.node.style.opacity = Math.max(0, 1 - k * k); if (f.grow) f.node.setAttribute("r", 2.5 + f.grow * k); if (f.kind === "photon") f.node.style.strokeDashoffset = String(-k * 60); }
    fx = fx.filter((f) => { if (f.t > f.life) { f.node.remove(); return false; } return true; });
    // free quasiparticles diffuse through the island (sped up), drifting a little towards the junction
    for (const q of qps) {
      q.t += dt;
      const ax = -q.x * 1.2, ay = (q.side * (g + 4) - q.y) * 0.9;
      q.vx += (ax + (rnd() - 0.5) * 900) * dt; q.vy += (ay + (rnd() - 0.5) * 900) * dt; q.vx *= 0.94; q.vy *= 0.94;
      let nx = q.x + q.vx * dt, ny = q.y + q.vy * dt;
      if (!inIsland(nx, ny, q.side)) { q.vx = -q.vx; q.vy = -q.vy; nx = q.x; ny = q.y; }
      q.x = nx; q.y = ny;
      if (Math.hypot(q.x, q.y - q.side * g) < 9 && q.t > 0.4) { q.done = true; trap(q); continue; }
      q.node.setAttribute("cx", q.x); q.node.setAttribute("cy", q.y);
      q.node.style.opacity = Math.min(1, q.t / 0.3) * Math.max(0, Math.min(1, (q.life - q.t) / 0.6));
    }
    qps = qps.filter((q) => { if (q.done) return false; if (q.t > q.life) { q.node.remove(); return false; } return true; });
    // trapped ones jiggle in their lead and tunnel at a steady rate until they recombine
    for (const tq of trapped) {
      tq.t += dt;
      if (tq.hop) {
        tq.hop.t += dt / 0.2; const k = Math.min(1, tq.hop.t); tq.v = tq.hop.from + (tq.hop.to - tq.hop.from) * k; tq.u = 0;
        if (k >= 1) { tq.hop = null; tq.side = -tq.side; }
      } else {
        tq.vu += (rnd() - 0.5) * 400 * dt; tq.vv += (rnd() - 0.5) * 500 * dt; tq.vu *= 0.9; tq.vv *= 0.9;
        tq.u = Math.max(-2.2, Math.min(2.2, tq.u + tq.vu * dt));
        tq.v = tq.side < 0 ? Math.max(-36, Math.min(-3, tq.v + tq.vv * dt)) : Math.max(3, Math.min(36, tq.v + tq.vv * dt));
        if (tq.t > 0.25 && tq.t < tq.life - 0.3 && rnd() < 1.1 * dt) tunnel(tq);
      }
      const fade = Math.min(1, tq.t / 0.2) * Math.max(0, Math.min(1, (tq.life - tq.t) / 0.4));
      tq.node.setAttribute("cx", ix(tq.u)); tq.node.setAttribute("cy", iy(tq.v)); tq.node.style.opacity = fade;
      tq.dot.setAttribute("cx", tq.u * 0.25); tq.dot.setAttribute("cy", tq.v * 0.2); tq.dot.style.opacity = fade;
    }
    trapped = trapped.filter((tq) => { if (tq.t > tq.life) { tq.node.remove(); tq.dot.remove(); return false; } return true; });
    for (const p of pairs) if (p.broken && cycleT > p.mendAt) { p.broken = false; [p.x, p.y] = randomIn(p.side); p.a.style.opacity = ""; p.b.style.opacity = ""; }
    // what is happening, in words
    let s = "Waiting for an event. The qubit frequency sits still, at the level set by the islands' charge parity.";
    if (ev) {
      s = ev.txt;
      if (ev.broke) s = `It breaks ${ev.npairs} Cooper pair${ev.npairs > 1 ? "s" : ""} into ${2 * ev.npairs} quasiparticles, which wander through the aluminium.`;
      if (flips || trapped.length) s = `Quasiparticles trapped in the junction's lower-gap leads tunnel back and forth. Each tunnelling flips the charge parity and shifts the qubit frequency by 2χ: ${flips} switch${flips === 1 ? "" : "es"} so far.`;
      if (cycleT > 7.6 && !trapped.length && !qps.length) s = `${flips} parity switch${flips === 1 ? "" : "es"} from ${fmtE(ev.E)}${ev.photon ? " of light" : " in the chip"}. The quasiparticles recombine into Cooper pairs and the qubit settles.`;
    }
    if (stepEl.textContent !== s) stepEl.textContent = s;
  }

  // ---------------------------------------------------------------- live parity trace
  const SPAN = 10, trace = [], marks = [];
  let tNow = 0;
  function sample(dt) { tNow += dt; trace.push([tNow, parity + (rnd() - 0.5) * 0.1]); while (trace.length && trace[0][0] < tNow - SPAN) trace.shift(); while (marks.length && marks[0][0] < tNow - SPAN) marks.shift(); }
  function drawTrace() {
    const dpr = Math.min(2, devicePixelRatio || 1), w = traceCv.clientWidth, h = traceCv.clientHeight;
    if (!w || !h) return;
    if (traceCv.width !== Math.round(w * dpr) || traceCv.height !== Math.round(h * dpr)) { traceCv.width = Math.round(w * dpr); traceCv.height = Math.round(h * dpr); }
    const c = traceCv.getContext("2d"), cs = getComputedStyle(fig), sans = cs.getPropertyValue("--sans");
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const left = 54, right = w - 8, top = 22, yOf = (v) => top + (h - top) / 2 - v * (h - top) * 0.28;
    const xOf = (t) => right - ((tNow - t) / SPAN) * (right - left);
    c.font = `11px ${sans}`; c.textBaseline = "middle"; c.fillStyle = cs.getPropertyValue("--ink-faint");
    c.strokeStyle = cs.getPropertyValue("--rule"); c.setLineDash([3, 4]); c.lineWidth = 1;
    for (const [v, label] of [[1, "even"], [-1, "odd"]]) { c.beginPath(); c.moveTo(left, yOf(v)); c.lineTo(right, yOf(v)); c.stroke(); c.fillText(label, 6, yOf(v)); }
    c.setLineDash([]);
    let freeRight = Infinity;                     // event markers, newest first; a label that would collide is left out
    for (let i = marks.length - 1; i >= 0; i--) {
      const [t, label] = marks[i], x = xOf(t);
      c.strokeStyle = cs.getPropertyValue("--rule"); c.beginPath(); c.moveTo(x, top - 2); c.lineTo(x, h - 4); c.stroke();
      const tw = c.measureText(label).width, flip = x + 4 + tw > right, x0 = flip ? x - 4 - tw : x + 4;
      if (x0 + tw > freeRight - 6 || x0 < 4) continue;
      c.fillStyle = cs.getPropertyValue("--ink-soft"); c.fillText(label, x0, 10); freeRight = x0;
    }
    c.strokeStyle = cs.getPropertyValue("--gold"); c.lineWidth = 1.6; c.lineJoin = "round"; c.beginPath();
    trace.forEach(([t, v], i) => { const x = xOf(t); i ? c.lineTo(x, yOf(v)) : c.moveTo(x, yOf(v)); });
    c.stroke();
  }

  // ---------------------------------------------------------------- run, always (only idling while off-screen)
  let visible = true, last = 0, raf = 0;
  function frame(t) {
    raf = 0;
    const real = Math.min(0.5, (t - last) / 1000 || 0.016), dt = Math.min(0.05, real); last = t;
    if (anim) { anim.t += real / anim.dur; anim.step(Math.min(1, anim.t)); if (anim.t >= 1) anim = null; }
    viewUi();
    step(dt); sample(dt); drawTrace();
    pairs.forEach((p) => placePair(p, t / 1000));
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  if ("IntersectionObserver" in window) new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; kick(); }).observe(fig);
  document.addEventListener("visibilitychange", kick);
  addEventListener("resize", drawTrace);

  focusOn(1); setView(VIEW_SQUAT(1)); describe(null);
  for (let i = 0; i < 2; i++) sample(SPAN / 2);
  pairs.forEach((p) => placePair(p, 0));
  viewUi(); drawTrace(); kick();
})();
