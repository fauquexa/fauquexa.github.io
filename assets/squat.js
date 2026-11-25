/* The SQUAT figure in Research: a 9 mm chip with three SQUATs on one feedline, which zooms smoothly into a
   single SQUAT and back. Everything is drawn in micrometres in one coordinate system; the view is the SVG viewBox.
   The SQUAT follows our W002 Al SQUATs (salemigroup/squat-design, "W002 November Al SQUATs"): pizza islands of
   110 um with a 160 deg opening and a 17 um gap, six round 5 um flux holes per island on the staggered 40 um grid,
   a 330 um pocket 62 um beyond the islands with 20 um radii that opens onto the feedline 60 um from the island,
   10 / 5.8 um coplanar lines with 300 um pads and tapers, a charge line ending in a thorn recessed 20 um into the
   ground, and the W002 junction: a dome pad with a thick lead narrowing to a 150 nm thin lead on one island, a dome
   pad with an elliptical drop on the other, overlapping across the Dolan bridge (drawn magnified in an inset).

   A detection runs on a loop: each time either a particle hits the silicon (phonons) or a THz photon is absorbed
   by the islands, Cooper pairs break in proportion to the energy, the quasiparticles wander, and those that reach
   the junction get trapped in its lower-gap leads and tunnel back and forth; every tunnelling flips the charge
   parity, which the live trace shows as the qubit frequency jumping by 2 chi. Quasiparticles that recombine before
   reaching the junction leave no trace. Hover or tap a part for what it is. Illustrative, not a simulation. */
(function () {
  const fig = document.getElementById("squatFig");
  if (!fig) return;
  const NS = "http://www.w3.org/2000/svg";
  const svg = fig.querySelector("svg"), stage = fig.querySelector(".sq-stage");
  const tip = document.createElement("div"); tip.className = "sq-tip"; tip.setAttribute("role", "tooltip"); tip.innerHTML = "<b></b><span></span>";
  document.body.appendChild(tip);
  const traceCv = fig.querySelector(".sq-trace canvas"), hint = fig.querySelector(".sq-hint");
  const btnChip = fig.querySelector('[data-view="chip"]'), btnSquat = fig.querySelector('[data-view="squat"]');
  const el = (name, attrs, parent) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };

  // ---------------------------------------------------------------- geometry (um, y down)
  const CHIP = 4500, SX = [-2400, 0, 2400];                     // chip half-size, SQUAT centres along the line
  const R = 110, OPEN = 160, g = 8.5;                           // pizza radius, opening angle, half junction gap (W002)
  const half = (OPEN / 2) * Math.PI / 180;
  const CPW = { s: 10, w: 5.806 };                              // centre width and gaps of the feedline and charge lines
  const LINE_Y = R + g + 60, LW = CPW.s, LG = CPW.w;            // feedline centre conductor 60 um beyond the island
  const BITE = { half: 165, top: -(R + g + 62), r: 20 };        // pocket: half-width, top edge, corner and feedline radii
  const THORN = { tip: BITE.top - 20, len: 60, r: 1 };          // charge-line tip: recessed 20 um, 60 um taper, 1 um radius
  const LAUNCH = { edge: 4430, gapEnd: 100, pad: 300, taper: 300, padHalf: 100, gapHalf: 216.12 };   // W002 launches
  const LINE_START = LAUNCH.edge - LAUNCH.gapEnd - LAUNCH.pad - LAUNCH.taper;                     // |coordinate| where a launch has tapered to the line
  const HOLE = 5, HOLES = [[20, 43.6], [60, 63.6], [20, 83.6]].flatMap(([x, y]) => [[-x, y], [x, y], [-x, -y], [x, -y]]);
  // the W002 junction, in um around the junction centre: dome pads on both island edges, a thick lead (top) narrowing
  // to the thin lead, an elliptical drop (bottom) reaching up into the gap; they overlap at the Dolan bridge
  const JJ = { padA: 3.25, padB: 4.6, thick: 1.2, thickEnd: -0.5, thin: 0.15, dropW: 3, dropTip: 3.4, bridge: 4.0 };
  const PAD_C = g + 3;                                           // where quasiparticles from an island enter its lead

  const INFO = {
    chip: ["A three-SQUAT chip", "Three SQUATs share one feedline across a 9 mm silicon chip. Each sits at its own frequency, so one line reads them all, and a particle hit anywhere on the chip sends phonons to every one of them. Click a SQUAT to zoom in."],
    ground: ["Ground plane", "The aluminium film covering most of the chip, held at ground. It shields the qubits and gives the microwaves a return path."],
    launch: ["Launch pad", "Where the feedline meets the outside world: a wire bond connects the 200 µm pad to the coaxial cables of the fridge, and a 300 µm taper brings the line down to the 10 µm on-chip waveguide."],
    bondpad: ["Charge-line launch", "The same launch as the feedline's: a wire-bond pad that tapers down to the on-chip charge line. A small voltage applied here reaches that SQUAT's island."],
    feedline: ["Feedline", "A coplanar waveguide (a 10 µm centre strip between 5.8 µm gaps) carrying the microwave readout tone. The SQUATs couple to it directly, with no readout resonator, each at its own frequency, so many can share one line."],
    chargeLine: ["Charge line", "A coplanar line like the feedline that ends in a thorn: a 60 µm taper to a 1 µm-radius tip, recessed 20 µm into the ground plane, about 80 µm from the island. A voltage on it sets the island's offset charge; keeping the tip back keeps the coupling tiny, so the line doesn't drain energy from the qubit."],
    islands: ["Superconducting islands", "The qubit's two aluminium islands, 110 µm pizza slices with a 160° opening, 17 µm apart. Below about 1.2 K their electrons bind into Cooper pairs, which flow without resistance. Together the slices form the qubit, a tiny nonlinear LC circuit, and also an antenna: THz photons are absorbed directly in them. A phonon or photon carrying more than twice the superconducting gap (about 0.36 meV) breaks a pair into two quasiparticles."],
    jjpads: ["Junction connection pads", "Dome-shaped pads where the junction layer, evaporated in a separate step, lands on the islands. A brief argon ion clean first removes the islands' native oxide, so the contact is a clean superconducting connection rather than a second, accidental junction. Quasiparticles from the islands enter the junction leads here."],
    pocket: ["Silicon substrate", "Bare silicon where the aluminium was etched away: a 330 µm pocket around the islands that opens onto the feedline. Energy deposited in the chip spreads through the silicon as phonons, quantised lattice vibrations, and can reach every SQUAT on the chip."],
    junction: ["Josephson junction (modified Dolan)", "From one island a lead narrows to a 150 nm thin lead; from the other an elliptical drop reaches into the gap. Evaporated from two angles past a 150 nm suspended resist bridge, the two overlap through about 1 nm of aluminium oxide. Cooper pairs tunnel through it coherently, which makes the circuit a qubit. The leads have a lower critical temperature, so a smaller gap, than the islands: quasiparticles that wander in lose energy and cannot climb back out. Trapped at the junction, they tunnel again and again, each time flipping the charge parity."],
    holes: ["Flux-trapping holes", "Six round 5 µm holes per island on a staggered 40 µm grid, at least 10 µm from every edge. Any magnetic flux left over when the film turns superconducting gets caught here as a vortex. Pinned in a hole, the vortex cannot drift through the aluminium, where a moving vortex would dissipate energy and break Cooper pairs."],
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

  // a W002 launch: wire-bond pad, then a linear taper down to the coplanar line, with its gap envelope.
  // u runs along the line from the chip edge inwards (u = 0 at the outer end of the gap), v across it.
  function launch(gr, toXY) {
    const E = 0, pe = LAUNCH.gapEnd, ps = pe + LAUNCH.pad, ts = ps + LAUNCH.taper, gh = LAUNCH.gapHalf, mh = LAUNCH.padHalf;
    const sub = [[E, -gh], [ps, -gh], [ts, -(CPW.s / 2 + CPW.w)], [ts, CPW.s / 2 + CPW.w], [ps, gh], [E, gh]];
    const met = [[pe, -mh], [ps, -mh], [ts, -CPW.s / 2], [ts, CPW.s / 2], [ps, mh], [pe, mh]];
    for (const [pts, cls] of [[sub, "sq-subf"], [met, "sq-metalf"]]) el("path", { d: "M " + pts.map(([u, v]) => P(...toXY(u, v))).join(" L ") + " Z", class: cls }, gr);
  }

  // feedline: coplanar waveguide with a launch at both chip edges
  const gLine = part("feedline", "line");
  const yc = LINE_Y + LW / 2;
  el("rect", { x: -LINE_START, y: LINE_Y - LG, width: 2 * LINE_START, height: LW + 2 * LG, class: "sq-subf" }, gLine);
  el("rect", { x: -LINE_START - 1, y: LINE_Y, width: 2 * LINE_START + 2, height: LW, class: "sq-metalf" }, gLine);
  el("rect", { x: -LINE_START, y: LINE_Y - LG - 10, width: 2 * LINE_START, height: LW + 2 * LG + 20, fill: "transparent" }, gLine);
  for (const s of [-1, 1]) launch(part("launch", "line pop"), (u, v) => [s * (LAUNCH.edge - u), yc + v]);

  // per SQUAT: charge line with its launch, pocket, two pizza islands, holes, junction
  function drawJunction(gr, x0, cls) {   // the junction metal (leads, drop, bridge overlap), shared by the inset
    const c = (x) => x0 + x;
    el("rect", { x: c(-JJ.thick / 2), y: -g, width: JJ.thick, height: g + JJ.thickEnd, class: cls }, gr);                  // thick lead
    el("rect", { x: c(-JJ.thin / 2), y: JJ.thickEnd - 0.1, width: JJ.thin, height: JJ.bridge + 0.6 - JJ.thickEnd, class: cls }, gr);   // thin lead
    const w = JJ.dropW / 2;                                                                                      // the drop
    el("path", { d: `M ${P(c(-w), g + 0.3)} L ${P(c(-w), g)} C ${P(c(-w), g - 2.6)} ${P(c(-0.45), JJ.dropTip + 0.2)} ${P(c(0), JJ.dropTip)} C ${P(c(0.45), JJ.dropTip + 0.2)} ${P(c(w), g - 2.6)} ${P(c(w), g)} L ${P(c(w), g + 0.3)} Z`, class: cls }, gr);
    el("rect", { x: c(-0.35), y: JJ.bridge - 0.35, width: 0.7, height: 0.7, rx: 0.15, class: "sq-barrier" }, gr);    // the overlap
  }
  function drawPad(gr, x0, s, cls) {     // a dome pad on an island edge (s = -1 top island, +1 bottom)
    const a = JJ.padA, b = JJ.padB + (s > 0 ? 0.9 : 0);
    el("path", { d: `M ${P(x0 - a, s * (g - 0.3))} L ${P(x0 - a, s * g)} A ${a} ${b} 0 0 ${s < 0 ? 1 : 0} ${P(x0 + a, s * g)} L ${P(x0 + a, s * (g - 0.3))} Z`, class: cls }, gr);
  }
  const squats = SX.map((sx, k) => {
    const o = {};
    // charge-line launch at the chip edge, the line down to the pocket, and the thorn recessed into the ground
    launch(part("bondpad", "line pop", k), (u, v) => [sx + v, -(LAUNCH.edge - u)]);
    const gCL = part("chargeLine", "line", k), cw = CPW.s / 2, cg = CPW.s / 2 + CPW.w, base = THORN.tip - THORN.len;
    el("rect", { x: sx - cg, y: -LINE_START - 1, width: 2 * cg, height: BITE.top + LINE_START + 2, class: "sq-subf" }, gCL);
    el("path", { d: `M ${P(sx - cw, -LINE_START - 1)} L ${P(sx - cw, base - 8)} Q ${P(sx - cw, base)} ${P(sx - cw + 0.5, base + 7)} L ${P(sx - THORN.r, THORN.tip - THORN.r)} A ${THORN.r} ${THORN.r} 0 0 0 ${P(sx + THORN.r, THORN.tip - THORN.r)} L ${P(sx + cw - 0.5, base + 7)} Q ${P(sx + cw, base)} ${P(sx + cw, base - 8)} L ${P(sx + cw, -LINE_START - 1)} Z`, class: "sq-metalf" }, gCL);
    el("rect", { x: sx - 16, y: -LINE_START, width: 32, height: BITE.top + LINE_START, fill: "transparent" }, gCL);
    // the pocket ("bite"): rounded corners at the top, opening onto the feedline's gap with outward fillets, and
    // filleted where the charge line's gap opens into it
    const gPocket = part("pocket", "sub", k);
    const x0 = sx - BITE.half, x1 = sx + BITE.half, yT = BITE.top, yB = LINE_Y - LG, r = BITE.r;
    el("path", { d: `M ${P(x0 - r, yB + 1)} L ${P(x0 - r, yB)} A ${r} ${r} 0 0 0 ${P(x0, yB - r)} L ${P(x0, yT + r)} A ${r} ${r} 0 0 1 ${P(x0 + r, yT)} L ${P(x1 - r, yT)} A ${r} ${r} 0 0 1 ${P(x1, yT + r)} L ${P(x1, yB - r)} A ${r} ${r} 0 0 0 ${P(x1 + r, yB)} L ${P(x1 + r, yB + 1)} Z` }, gPocket);
    el("path", { d: `M ${P(sx - cg, yT - r)} A ${r} ${r} 0 0 1 ${P(sx - cg - r, yT)} L ${P(sx - cg, yT + 0.5)} Z M ${P(sx + cg, yT - r)} A ${r} ${r} 0 0 0 ${P(sx + cg + r, yT)} L ${P(sx + cg, yT + 0.5)} Z` }, gPocket);
    o.rings = el("g", { class: "sq-rings", "pointer-events": "none" });
    // the two pizza islands: one part, they pop up together (their holes lift with them)
    const gI = part("islands", "metal pop", k);
    for (const side of [-1, 1]) {
      const ay = side * g, dir = side * Math.PI / 2, a0 = dir - half, a1 = dir + half;
      el("path", { d: `M ${P(sx, ay)} L ${P(sx + R * Math.cos(a0), ay + R * Math.sin(a0))} A ${R} ${R} 0 0 1 ${P(sx + R * Math.cos(a1), ay + R * Math.sin(a1))} Z`, class: "sq-island" }, gI);
    }
    const gHoles = part("holes", "sub pop", k);
    for (const [x, y] of HOLES) el("circle", { cx: sx + x, cy: y, r: HOLE / 2 }, gHoles);
    // the junction and its two connection pads
    const gJJ = part("junction", "jj pop", k);
    drawJunction(gJJ, sx, "sq-lead");
    el("rect", { x: sx - 5, y: -g, width: 10, height: 2 * g, fill: "transparent" }, gJJ);
    for (const s of [-1, 1]) drawPad(part("jjpads", "pads pop", k), sx, s, "sq-padj");
    o.sx = sx; return o;
  });

  // thin lines that keep the feedline and charge lines visible when zoomed out to the whole chip
  const gOver = el("g", { class: "sq-over", "pointer-events": "none" });
  el("line", { x1: -LINE_START, y1: yc, x2: LINE_START, y2: yc }, gOver);
  for (const sx of SX) el("line", { x1: sx, y1: -LINE_START, x2: sx, y2: BITE.top }, gOver);

  // animation layers, and the magnified junction, follow the SQUAT in focus
  const gAnim = el("g", { class: "sq-anim", "pointer-events": "none" });
  const gPairs = el("g", { class: "sq-pairs" }, gAnim), gQP = el("g", { class: "sq-qps" }, gAnim), gFx = el("g", { class: "sq-fx" }, gAnim);
  // the inset: the whole junction three times larger, with the island edges for context
  const INS = { x: 178, y: -122, r: 42, m: 3 };
  const gIns = el("g", { class: "sq-inset", "pointer-events": "none" }, gAnim);
  el("line", { x1: 2, y1: -2, x2: INS.x - INS.r * 0.72, y2: INS.y + INS.r * 0.7, class: "sq-ins-guide" }, gIns);
  el("defs", {}, gIns).innerHTML = `<clipPath id="sqInsClip"><circle cx="${INS.x}" cy="${INS.y}" r="${INS.r}"/></clipPath>`;
  const gInsIn = el("g", { "clip-path": "url(#sqInsClip)" }, gIns);
  el("circle", { cx: INS.x, cy: INS.y, r: INS.r, class: "sq-ins-bg" }, gInsIn);
  const gInsJ = el("g", { transform: `translate(${INS.x} ${INS.y}) scale(${INS.m})` }, gInsIn);
  const tn = Math.tan(Math.PI / 2 - half), W = 16;
  for (const s of [-1, 1]) el("path", { d: `M ${P(-W, s * (g + W * tn))} L ${P(0, s * g)} L ${P(W, s * (g + W * tn))} L ${P(W, s * 20)} L ${P(-W, s * 20)} Z`, class: "sq-ins-island" }, gInsJ);
  for (const s of [-1, 1]) drawPad(gInsJ, 0, s, "sq-lead");
  drawJunction(gInsJ, 0, "sq-lead");
  const gInsQP = el("g", {}, gInsJ);
  el("circle", { cx: INS.x, cy: INS.y, r: INS.r, class: "sq-ins-ring" }, gIns);
  const insLabel = el("text", { x: INS.x, y: INS.y + INS.r + 8, class: "sq-ins-label" }, gIns); insLabel.textContent = "Junction ×3";

  // ---------------------------------------------------------------- the view: chip <-> one SQUAT, smoothly
  let focus = 1, view = [-235, -255, 470, 470], anim = null;
  const VIEW_SQUAT = (k) => [SX[k] - 235, -255, 470, 470], VIEW_CHIP = [-4700, -4700, 9400, 9400];
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
    gIns.style.opacity = Math.max(0, Math.min(1, (1100 - w) / 450));
    hint.hidden = !zoomedOut() || anim !== null;
    btnChip.classList.toggle("on", w > 2000); btnSquat.classList.toggle("on", w <= 2000);
    btnChip.setAttribute("aria-pressed", String(w > 2000)); btnSquat.setAttribute("aria-pressed", String(w <= 2000));
  }
  function focusOn(k) {
    focus = k; gAnim.setAttribute("transform", `translate(${SX[k]} 0)`);
    resetDetection();
  }
  btnChip.addEventListener("click", () => { pinned = null; describe(null); zoomTo(VIEW_CHIP); });
  btnSquat.addEventListener("click", () => zoomTo(VIEW_SQUAT(focus)));

  // ---------------------------------------------------------------- hover and tap: a description box at the cursor
  // Only in the SQUAT view; zoomed out to the chip, parts neither light up nor explain themselves.
  let pinned = null, lifted = false;
  function placeTip(x, y) {
    const w = tip.offsetWidth, h = tip.offsetHeight, m = 8;
    let left = x + 16, top = y + 18;
    if (left + w > innerWidth - m) left = Math.max(m, x - 16 - w);
    if (top + h > innerHeight - m) top = Math.max(m, y - 18 - h);
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }
  function describe(name, k, at) {
    if (zoomedOut()) name = null;
    if (name) {
      tip.firstChild.textContent = INFO[name][0]; tip.lastChild.textContent = INFO[name][1];
      tip.classList.add("on");
      if (at) placeTip(at[0], at[1]);
    } else tip.classList.remove("on");
    const same = (n) => n.dataset.sq === undefined || n.dataset.sq === k, lifts = { islands: "holes", holes: "islands" };
    parts.forEach((n) => {
      n.classList.toggle("hl", !!name && n.dataset.part === name && same(n));
      n.classList.toggle("lift", !!name && n.dataset.part === lifts[name] && same(n));
    });
    lifted = !!name && (name === "islands" || name === "holes") && +k === focus;
  }
  const centreOf = (n) => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  parts.forEach((n) => {
    const k = n.dataset.sq;
    n.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !pinned) describe(n.dataset.part, k, [e.clientX, e.clientY]); });
    n.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !pinned) describe(null); });
    n.addEventListener("focus", () => describe(n.dataset.part, k, centreOf(n)));
    n.addEventListener("blur", () => { if (!pinned) describe(null); });
    n.addEventListener("click", (e) => {
      e.stopPropagation();
      if (zoomedOut()) { if (k !== undefined) zoomK(+k); else zoomNearest(e); return; }
      if (pinned === n) { pinned = null; describe(null); }
      else { pinned = n; describe(n.dataset.part, k, e.clientX || e.clientY ? [e.clientX, e.clientY] : centreOf(n)); }
    });
    n.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); n.dispatchEvent(new MouseEvent("click")); } });
  });
  svg.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" && !pinned && tip.classList.contains("on")) placeTip(e.clientX, e.clientY); });
  addEventListener("scroll", () => { if (tip.classList.contains("on")) { pinned = null; describe(null); } }, { passive: true });
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
  const randomIn = (side) => { for (;;) { const d = 34 + rnd() * (R - 40), a = side * Math.PI / 2 + (rnd() * 2 - 1) * (half - 0.1); const x = d * Math.cos(a), y = side * g + d * Math.sin(a); if (inIsland(x, y, side)) return [x, y]; } };
  const pairs = [];
  for (let i = 0; i < 20; i++) {
    const side = i % 2 ? 1 : -1, [x, y] = randomIn(side);
    pairs.push({ x, y, side, ph: rnd() * TAU, a: el("circle", { r: 1.6 }, gPairs), b: el("circle", { r: 1.6 }, gPairs), broken: false });
  }
  const placePair = (p, t) => { const ox = Math.cos(p.ph + t * 1.3) * 1.8, oy = Math.sin(p.ph + t * 1.3) * 1.8; p.a.setAttribute("cx", p.x + ox); p.a.setAttribute("cy", p.y + oy); p.b.setAttribute("cx", p.x - ox); p.b.setAttribute("cy", p.y - oy); };

  let qps = [], trapped = [], rings = [], fx = [], parity = 1, ev = null, cycleT = 0, flips = 0;
  const CYCLE = 11.5;
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
      do { x = (rnd() * 2 - 1) * 200; y = -190 + rnd() * 360; } while (Math.hypot(x, y) < R + 25);
      rings.push({ x, y, t: 0 }, { x, y, t: -0.22 }, { x, y, t: -0.44 });
      fx.push({ node: el("line", { x1: x - 70, y1: y - 130, x2: x + 70, y2: y + 130, class: "sq-track" }, gFx), t: 0, life: 0.9 });
      fx.push({ node: el("circle", { cx: x, cy: y, r: 2.5, class: "sq-hit" }, gFx), t: 0, life: 1.0, grow: 8 });
    }
    ev = { photon, E, label, txt, npairs, x, y, side, broke: false, at: tNow, mark: [tNow, label] };
    marks.push(ev.mark);
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
      if (p) { p.broken = true; p.a.style.opacity = 0; p.b.style.opacity = 0; p.mendAt = 9.6 + rnd(); }
      for (const s of [-1, 1]) {
        const a = rnd() * TAU, sure = i === 0 && s < 0;     // one quasiparticle of every deposit is sure to reach the junction
        qps.push({ x, y, vx: Math.cos(a) * 28 * s, vy: Math.sin(a) * 28 * s, side, node: el("circle", { cx: x, cy: y, r: 2.2, class: "sq-qp" }, gQP), t: 0,
                   life: sure ? 30 : 3 + rnd() * 1.8, reach: sure ? 3 : 0.35 + 1.2 * rnd() });
      }
    });
  }
  // A quasiparticle in the lower-gap lead stays at the junction for a while and tunnels back and forth quickly: a
  // burst of parity switches. A thermal one (dark count) shows up in a lead, tunnels once and is gone.
  function trap(q, dark) {
    if (q) q.node.remove();
    const side = q ? q.side : (rnd() < 0.5 ? -1 : 1);
    const tq = { side, u: 0, v: side * (g + 1 + rnd() * 2.5), vu: 0, vv: (rnd() - 0.5) * 8, t: 0, life: dark ? 0.7 : 1.4 + rnd() * 1.4, hop: null, lastHop: 0, dark,
                 node: el("circle", { r: 0.75, class: "sq-qp" }, gInsQP), dot: el("circle", { r: 2, class: "sq-qp" }, gQP) };
    trapped.push(tq);
  }
  function tunnel(tq) {
    tq.hop = { t: 0, from: tq.v, to: tq.side < 0 ? JJ.bridge + 0.8 + rnd() * 3 : JJ.bridge - 0.8 - rnd() * 4 }; parity = -parity; flips++;
    if (!tq.dark && fx.filter((f) => f.kind === "tun").length > 3) return;      // keep the flashes readable in a burst
    fx.push({ node: el("circle", { cx: 0, cy: JJ.bridge, r: 2, class: "sq-tunnel" }, gFx), t: 0, life: 0.4, grow: 7, kind: "tun" });
    fx.push({ node: el("circle", { cx: INS.x, cy: INS.y + JJ.bridge * INS.m, r: 3, class: "sq-tunnel" }, gIns), t: 0, life: 0.5, grow: 10 });
  }

  const DARK = 0.3;                  // thermally activated quasiparticles: single switches per second, in the background
  function step(dt) {
    cycleT += dt;
    if (rnd() < DARK * dt) trap(null, true);
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
      const ax = -q.x * 1.2 * q.reach, ay = (q.side * PAD_C - q.y) * 0.9 * q.reach;
      q.vx += (ax + (rnd() - 0.5) * 900) * dt; q.vy += (ay + (rnd() - 0.5) * 900) * dt; q.vx *= 0.94; q.vy *= 0.94;
      let nx = q.x + q.vx * dt, ny = q.y + q.vy * dt;
      if (!inIsland(nx, ny, q.side)) { q.vx = -q.vx; q.vy = -q.vy; nx = q.x; ny = q.y; }
      q.x = nx; q.y = ny;
      if (Math.hypot(q.x, q.y - q.side * PAD_C) < 13 && q.t > 0.4) { q.done = true; trap(q); continue; }
      q.node.setAttribute("cx", q.x); q.node.setAttribute("cy", q.y);
      q.node.style.opacity = Math.min(1, q.t / 0.3) * Math.max(0, Math.min(1, (q.life - q.t) / 0.6));
    }
    qps = qps.filter((q) => {
      if (q.done) return false;
      if (q.t > q.life) { q.node.remove(); fx.push({ node: el("circle", { cx: q.x, cy: q.y, r: 1.5, class: "sq-recomb" }, gFx), t: 0, life: 0.6, grow: 4 }); return false; }
      return true;
    });
    // trapped ones jiggle in their lead and tunnel at a steady rate until they recombine
    for (const tq of trapped) {
      tq.t += dt;
      if (tq.hop) {
        tq.hop.t += dt / 0.05; const k = Math.min(1, tq.hop.t); tq.v = tq.hop.from + (tq.hop.to - tq.hop.from) * k; tq.u = 0;
        if (k >= 1) { tq.hop = null; tq.side = -tq.side; tq.lastHop = tq.t; }
      } else {
        tq.vu += (rnd() - 0.5) * 60 * dt; tq.vv += (rnd() - 0.5) * 120 * dt; tq.vu *= 0.9; tq.vv *= 0.9;
        tq.v = tq.side < 0 ? Math.max(-g - 3, Math.min(JJ.bridge - 0.6, tq.v + tq.vv * dt)) : Math.max(JJ.bridge + 0.6, Math.min(g + 4, tq.v + tq.vv * dt));
        const room = Math.abs(tq.v) > g ? JJ.padA * 0.8 : tq.side < 0 ? (tq.v < JJ.thickEnd ? JJ.thick / 2 : 0.05) : JJ.dropW / 2 * Math.min(1, (tq.v - JJ.dropTip) / (g - JJ.dropTip));
        tq.u = Math.max(-room, Math.min(room, tq.u + tq.vu * dt));
        if (tq.dark) { if (!tq.lastHop && tq.t > 0.25) tunnel(tq); }
        else if (tq.t > 0.15 && tq.t - tq.lastHop > 0.07 && tq.t < tq.life - 0.15 && rnd() < 9 * dt) tunnel(tq);
      }
      const fade = Math.min(1, tq.t / 0.2) * Math.max(0, Math.min(1, (tq.life - tq.t) / 0.4));
      tq.node.setAttribute("cx", tq.u); tq.node.setAttribute("cy", tq.v); tq.node.style.opacity = fade;
      tq.dot.setAttribute("cx", tq.u); tq.dot.setAttribute("cy", tq.v); tq.dot.style.opacity = fade;
    }
    trapped = trapped.filter((tq) => { if (tq.t > tq.life) { tq.node.remove(); tq.dot.remove(); return false; } return true; });
    for (const p of pairs) if (p.broken && cycleT > p.mendAt) { p.broken = false; [p.x, p.y] = randomIn(p.side); p.a.style.opacity = ""; p.b.style.opacity = ""; }
  }

  // ---------------------------------------------------------------- live parity trace
  const SPAN = 14, trace = [], marks = [];
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
  let visible = true, last = 0, raf = 0, pairScale = 1;
  function frame(t) {
    raf = 0;
    const real = Math.min(0.5, (t - last) / 1000 || 0.016), dt = Math.min(0.05, real); last = t;
    if (anim) { anim.t += real / anim.dur; anim.step(Math.min(1, anim.t)); if (anim.t >= 1) anim = null; }
    viewUi();
    step(dt); sample(dt); drawTrace();
    pairs.forEach((p) => placePair(p, t / 1000));
    pairScale += ((lifted ? 1.07 : 1) - pairScale) * Math.min(1, real * 12);
    const sc = Math.abs(pairScale - 1) < 1e-4 ? "" : `scale(${pairScale.toFixed(4)})`;
    gPairs.setAttribute("transform", sc); gQP.setAttribute("transform", sc);
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
