/* The SQUAT figure in Research: one bowler-hat SQUAT from the W005D wafer, drawn from the mask rules of
   squatmask/islands/bowler.py (dome radius 90 um, junction gap 15 um, 5 um brims and fingers, fingers 24 um,
   brims reaching 110 um past the dome, flux holes on an arc at 0.62 R), turned so the feedline runs along the
   bottom. Units are micrometres. Hover or tap a part for what it is; a quiet animation walks through a
   detection: energy -> phonons -> broken Cooper pairs -> quasiparticles tunnelling -> parity switches, with the
   qubit frequency as read out on the feedline in the strip below. */
(function () {
  const fig = document.getElementById("squatFig");
  if (!fig) return;
  const NS = "http://www.w3.org/2000/svg";
  const svg = fig.querySelector("svg"), tip = fig.querySelector(".sq-tip"), stage = fig.querySelector(".sq-stage");
  const stepEl = fig.querySelector(".sq-step"), playBtn = fig.querySelector(".sq-play");
  const traceCv = fig.querySelector(".sq-trace canvas");

  // ---------------------------------------------------------------- geometry (W005D bowler hat)
  const R = 90, GAP = 15, g = GAP / 2, W = 5, FIN = 24, FW = 5, REACH = 110, JOG = R + 10, TIP = R + REACH;
  const PITCH = 2 * (FW + g);
  const POCKET = { x: -272, y: -165, w: 544, h: 325 }, LINE_Y = 166, LINE_W = 6, GAP_W = 6;
  const el = (name, attrs, parent) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };
  const part = (name, kind) => el("g", { "data-part": name, class: "sq-part sq-" + kind, tabindex: "0", role: "button", "aria-label": INFO[name][0] });

  const INFO = {
    ground: ["Ground plane", "The aluminium film around everything, held at ground. It shields the qubit and gives the microwaves a return path."],
    pocket: ["Silicon substrate", "Bare silicon where the aluminium was etched away. Energy deposited in the chip spreads through it as phonons, quantised vibrations of the crystal lattice."],
    feedline: ["Feedline", "A coplanar waveguide carrying the microwave readout tone. The SQUAT couples to it directly, with no readout resonator, so dozens of SQUATs at different frequencies can share one line."],
    islandA: ["Superconducting island", "One of the qubit's two aluminium islands, a 90 µm half-disc. Below about 1.2 K its electrons pair up into Cooper pairs. It is also the absorber: phonons with more than twice the superconducting gap (about 0.36 meV) break those pairs."],
    islandB: ["Superconducting island", "The second island. The two islands and the junction between them form the qubit, a tiny nonlinear LC circuit whose frequency depends on how many electrons sit on each island."],
    brims: ["Interdigitated brims", "Fingers from both islands interleave 7.5 µm apart. They add capacitance between the islands, which lowers the qubit's frequency without making the islands bigger, so quasiparticles still reach the junction quickly."],
    junction: ["Josephson junction", "Two aluminium layers separated by about 1 nm of aluminium oxide. Cooper pairs tunnel through it coherently, which makes the circuit a qubit. Single quasiparticles tunnel through it too, and that is what the SQUAT detects."],
    holes: ["Flux-trapping holes", "Small holes in the islands that pin magnetic vortices in place, so stray magnetic flux trapped in the film cannot wander around and add loss."],
  };

  // ground everywhere, the etched pocket, the feedline with its two gaps
  const gGround = part("ground", "metal");
  el("rect", { x: -330, y: -215, width: 660, height: 430 }, gGround);
  const gPocket = part("pocket", "sub");
  el("rect", { x: POCKET.x, y: POCKET.y, width: POCKET.w, height: POCKET.h + 8, rx: 14 }, gPocket);
  const gLine = part("feedline", "line");
  el("rect", { x: -330, y: LINE_Y - GAP_W, width: 660, height: GAP_W, class: "sq-sub" }, gLine);
  el("rect", { x: -330, y: LINE_Y, width: 660, height: LINE_W, class: "sq-metal" }, gLine);
  el("rect", { x: -330, y: LINE_Y + LINE_W, width: 660, height: GAP_W, class: "sq-sub" }, gLine);
  el("rect", { x: -330, y: LINE_Y - GAP_W - 4, width: 660, height: LINE_W + 2 * GAP_W + 8, fill: "transparent" }, gLine);   // easier to hover

  // phonon rings live on the silicon, under the metal
  const gRings = el("g", { class: "sq-rings", "pointer-events": "none" });

  // the two islands: half-disc domes; A sits next to the feedline (bottom), B on top
  const gA = part("islandA", "metal"), gB = part("islandB", "metal");
  el("path", { d: `M ${-R} ${g} A ${R} ${R} 0 0 0 ${R} ${g} Z` }, gA);
  el("path", { d: `M ${-R} ${-g} A ${R} ${R} 0 0 1 ${R} ${-g} Z` }, gB);

  // brims: a neck rises from each dome corner, jogs out to the spine; fingers interleave with the other island's
  const gBrims = part("brims", "metal");
  for (const side of [1, -1]) {          // +1: island A (bottom), -1: island B (top)
    const yNeck = side * (g + W / 2), yInner = side * (g / 2 + FIN / 2), ySpine = yInner + side * W / 2;
    for (const sx of [1, -1]) {
      el("path", { d: `M ${sx * (R - 6)} ${yNeck} L ${sx * JOG} ${yNeck} L ${sx * JOG} ${ySpine} L ${sx * (TIP - W / 2)} ${ySpine}`, class: "sq-brim", "stroke-width": W }, gBrims);
      for (let x = JOG + W / 2 + g + (side > 0 ? 0 : PITCH / 2); x + FW <= TIP - 2; x += PITCH) {
        const y0 = Math.min(yInner, yInner - side * FIN), y1 = Math.max(yInner, yInner - side * FIN);
        el("rect", { x: sx > 0 ? x : -x - FW, y: y0, width: FW, height: y1 - y0, rx: 2.4 }, gBrims);
      }
    }
  }
  // flux-trapping holes: four per dome on an arc at 0.62 R around the junction
  const gHoles = part("holes", "sub");
  for (const dir of [Math.PI / 2, -Math.PI / 2]) for (const f of [-0.75, -0.3, 0.3, 0.75]) {
    const a = dir + f * Math.PI / 2;
    el("circle", { cx: 0.62 * R * Math.cos(a), cy: 0.62 * R * Math.sin(a), r: 2.6 }, gHoles);
  }
  // the junction: a lead from each dome apex, overlapping at the centre
  const gJJ = part("junction", "jj");
  el("rect", { x: -0.9, y: -g - 0.5, width: 1.8, height: g - 0.6, class: "sq-lead" }, gJJ);
  el("rect", { x: -0.9, y: 1.1, width: 1.8, height: g - 0.6, class: "sq-lead" }, gJJ);
  el("rect", { x: -2.6, y: -1.6, width: 5.2, height: 3.2, rx: 0.8, class: "sq-barrier" }, gJJ);
  el("circle", { cx: 0, cy: 0, r: 13, fill: "transparent" }, gJJ);                          // a fair-sized target

  // animation layers on top
  const gPairs = el("g", { class: "sq-pairs", "pointer-events": "none" });
  const gQP = el("g", { class: "sq-qps", "pointer-events": "none" });
  const gFx = el("g", { class: "sq-fx", "pointer-events": "none" });

  // ---------------------------------------------------------------- hover and tap: what is this?
  let pinned = null;
  function show(name, evt) {
    const [title, text] = INFO[name];
    tip.replaceChildren();
    const b = document.createElement("b"); b.textContent = title; const p = document.createElement("span"); p.textContent = text;
    tip.append(b, p); tip.hidden = false;
    svg.querySelectorAll("[data-part]").forEach((n) => n.classList.toggle("hl", n.dataset.part === name));
    const box = stage.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    let x, y;
    if (evt && evt.clientX !== undefined && evt.clientX !== 0) { x = evt.clientX - box.left + 14; y = evt.clientY - box.top + 14; }
    else { const r = evt.target.getBoundingClientRect(); x = r.left - box.left + r.width / 2; y = r.top - box.top + r.height / 2; }
    if (x + tw > box.width - 4) x = Math.max(4, x - tw - 28);
    if (y + th > box.height - 4) y = Math.max(4, y - th - 28);
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function hide() { tip.hidden = true; svg.querySelectorAll(".hl").forEach((n) => n.classList.remove("hl")); }
  svg.querySelectorAll("[data-part]").forEach((n) => {
    n.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" && !pinned) show(n.dataset.part, e); });
    n.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !pinned) hide(); });
    n.addEventListener("click", (e) => { e.stopPropagation(); if (pinned === n.dataset.part) { pinned = null; hide(); } else { pinned = n.dataset.part; show(pinned, e); } });
    n.addEventListener("focus", (e) => show(n.dataset.part, e));
    n.addEventListener("blur", () => { if (!pinned) hide(); });
    n.addEventListener("keydown", (e) => { if (e.key === "Escape") { pinned = null; hide(); n.blur(); } });
  });
  document.addEventListener("click", (e) => { if (pinned && !stage.contains(e.target)) { pinned = null; hide(); } });

  // ---------------------------------------------------------------- the detection, as a loop
  // Cooper pairs drawn as two dots that slowly orbit each other; a broken pair becomes two quasiparticles that
  // random-walk through the island (drifting a little towards the junction, for the sake of the story); one
  // that reaches the junction may tunnel to the other island, and each tunnelling flips the charge parity.
  const rnd = Math.random, TAU = Math.PI * 2;
  const inDome = (x, y, side) => side * y > g + 1.5 && x * x + (y - side * g) ** 2 < (R - 3) ** 2;
  const randomInDome = (side) => { for (;;) { const x = (rnd() * 2 - 1) * (R - 6), y = side * (g + 4 + rnd() * (R - 8)); if (inDome(x, y, side)) return [x, y]; } };
  const pairs = [];
  for (let i = 0; i < 22; i++) {
    const side = i % 2 ? 1 : -1, [x, y] = randomInDome(side);
    const a = el("circle", { r: 1.7 }, gPairs), b = el("circle", { r: 1.7 }, gPairs);
    pairs.push({ x, y, side, ph: rnd() * TAU, a, b, broken: false });
  }
  function placePair(p, t) { const ox = Math.cos(p.ph + t * 1.3) * 1.9, oy = Math.sin(p.ph + t * 1.3) * 1.9; p.a.setAttribute("cx", p.x + ox); p.a.setAttribute("cy", p.y + oy); p.b.setAttribute("cx", p.x - ox); p.b.setAttribute("cy", p.y - oy); }

  let qps = [], rings = [], flashes = [], parity = 1, parityT = 0, cycleT = 0, impact = null, broke = false;
  const CYCLE = 11;
  const STEPS = [
    [0.0, "Waiting for an event: the qubit frequency sits still, at the level set by the islands' charge parity."],
    [0.4, "1 · A particle passes through the chip and leaves energy in the silicon. It spreads out as phonons."],
    [1.5, "2 · Phonons reach the aluminium islands and break Cooper pairs into quasiparticles."],
    [2.6, "3 · A quasiparticle that reaches the junction can tunnel across, one electron at a time, flipping the islands' charge parity."],
    [4.2, "4 · Each flip shifts the qubit frequency by 2χ. On the feedline this shows up as a burst of jumps: the detection."],
    [8.6, "The quasiparticles recombine into Cooper pairs and the qubit settles down again."],
  ];
  function newEvent() {
    // somewhere on the silicon, clear of the islands
    let x, y;
    do { x = (rnd() * 2 - 1) * 240; y = -150 + rnd() * 290; } while (Math.hypot(x, y) < R + 30 || (Math.abs(x) < TIP + 10 && Math.abs(y) < 30));
    impact = { x, y, t: 0 };
    rings.push({ x, y, t: 0 }, { x, y, t: -0.25 }, { x, y, t: -0.5 });
    const track = el("line", { x1: x - 70, y1: y - 120, x2: x + 70, y2: y + 120, class: "sq-track" }, gFx);
    flashes.push({ node: track, t: 0, life: 0.9 });
    const hit = el("circle", { cx: x, cy: y, r: 3, class: "sq-hit" }, gFx);
    flashes.push({ node: hit, t: 0, life: 1.0, grow: 9 });
    broke = false;
  }
  function breakPairs() {
    broke = true;
    const near = pairs.filter((p) => !p.broken).sort((a, b) => Math.hypot(a.x - impact.x, a.y - impact.y) - Math.hypot(b.x - impact.x, b.y - impact.y)).slice(0, 7);
    for (const p of near) {
      p.broken = true; p.a.style.opacity = 0; p.b.style.opacity = 0; p.mendAt = 7.5 + rnd() * 1.2;
      for (const s of [-1, 1]) {
        const node = el("circle", { cx: p.x, cy: p.y, r: 2.3, class: "sq-qp" }, gQP);
        const a = rnd() * TAU;
        qps.push({ x: p.x, y: p.y, vx: Math.cos(a) * 30 * s, vy: Math.sin(a) * 30 * s, side: p.side, node, life: 4.2 + rnd() * 1.6, t: 0, hops: 0, hop: null });
      }
    }
  }
  function flip() { parity = -parity; parityT = 0; }

  function step(dt) {
    cycleT += dt;
    if (cycleT >= CYCLE) { cycleT -= CYCLE; }
    if (cycleT >= 0.4 && (!impact || impact.cycle !== cycleN())) { newEvent(); impact.cycle = cycleN(); }
    if (impact && !broke && cycleT > 1.5 && impact.cycle === cycleN()) breakPairs();
    // phonon rings
    for (const r of rings) {
      r.t += dt;
      if (!r.node && r.t > 0) r.node = el("circle", { cx: r.x, cy: r.y, class: "sq-ring" }, gRings);
      if (r.node) { const k = r.t / 1.6; r.node.setAttribute("r", 4 + k * 300); r.node.style.opacity = Math.max(0, 0.55 * (1 - k)); }
    }
    rings = rings.filter((r) => { if (r.t > 1.6) { r.node && r.node.remove(); return false; } return true; });
    for (const f of flashes) { f.t += dt; const k = f.t / f.life; f.node.style.opacity = Math.max(0, 1 - k); if (f.grow) f.node.setAttribute("r", 3 + f.grow * k); }
    flashes = flashes.filter((f) => { if (f.t > f.life) { f.node.remove(); return false; } return true; });
    // quasiparticles
    for (const q of qps) {
      q.t += dt;
      if (q.hop) {      // tunnelling across the junction
        q.hop.t += dt / 0.22; const k = Math.min(1, q.hop.t);
        q.x = 0; q.y = q.hop.y0 + (q.hop.y1 - q.hop.y0) * k;
        if (k >= 1) { q.hop = null; q.side = -q.side; q.vx = (rnd() - 0.5) * 40; q.vy = q.side * 25; }
      } else {
        const ax = -q.x * 1.8, ay = (q.side * (g + 2) - q.y) * 1.3;            // a pull towards the junction (diffusion, sped up for the story)
        q.vx += (ax + (rnd() - 0.5) * 900) * dt; q.vy += (ay + (rnd() - 0.5) * 900) * dt;
        q.vx *= 0.94; q.vy *= 0.94;
        let nx = q.x + q.vx * dt, ny = q.y + q.vy * dt;
        if (!inDome(nx, ny, q.side)) { q.vx = -q.vx; q.vy = -q.vy; nx = q.x; ny = q.y; }
        q.x = nx; q.y = ny;
        if (Math.hypot(q.x, q.y - q.side * g) < 8 && q.hops < 2 && q.t > 0.5 && rnd() < 0.22) {
          q.hops++; q.hop = { t: 0, y0: q.side * (g + 1), y1: -q.side * (g + 1) }; flip();
          flashes.push({ node: el("circle", { cx: 0, cy: 0, r: 4, class: "sq-tunnel" }, gFx), t: 0, life: 0.6, grow: 10 });
        }
      }
      const fade = Math.min(1, q.t / 0.3) * Math.max(0, Math.min(1, (q.life - q.t) / 0.6));
      q.node.setAttribute("cx", q.x); q.node.setAttribute("cy", q.y); q.node.style.opacity = fade;
    }
    qps = qps.filter((q) => { if (q.t > q.life) { q.node.remove(); return false; } return true; });
    for (const p of pairs) if (p.broken && cycleT > p.mendAt) { p.broken = false; [p.x, p.y] = randomInDome(p.side); p.a.style.opacity = ""; p.b.style.opacity = ""; }
    // the step text
    let s = STEPS[0][1]; for (const [t0, txt] of STEPS) if (cycleT >= t0) s = txt;
    if (stepEl.textContent !== s) stepEl.textContent = s;
  }
  let cycles = 0, lastCycleT = 0;
  const cycleN = () => cycles;

  // ---------------------------------------------------------------- the readout strip: qubit frequency vs time
  const SPAN = 9, trace = [];
  let tNow = 0;
  function sample(dt) { tNow += dt; trace.push([tNow, parity + (rnd() - 0.5) * 0.12]); while (trace.length && trace[0][0] < tNow - SPAN) trace.shift(); }
  function drawTrace() {
    const dpr = Math.min(2, devicePixelRatio || 1), w = traceCv.clientWidth, h = traceCv.clientHeight;
    if (!w) return;
    if (traceCv.width !== Math.round(w * dpr)) { traceCv.width = Math.round(w * dpr); traceCv.height = Math.round(h * dpr); }
    const c = traceCv.getContext("2d"), cs = getComputedStyle(fig);
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const left = 92, right = w - 8, yOf = (v) => h / 2 - v * h * 0.27;
    c.font = "11.5px " + cs.getPropertyValue("--sans"); c.textBaseline = "middle"; c.fillStyle = cs.getPropertyValue("--ink-faint");
    c.strokeStyle = cs.getPropertyValue("--rule"); c.setLineDash([3, 4]); c.lineWidth = 1;
    for (const [v, label] of [[1, "even parity"], [-1, "odd parity"]]) { c.beginPath(); c.moveTo(left, yOf(v)); c.lineTo(right, yOf(v)); c.stroke(); c.fillText(label, 8, yOf(v)); }
    c.setLineDash([]);
    c.strokeStyle = cs.getPropertyValue("--gold"); c.lineWidth = 1.6; c.lineJoin = "round"; c.beginPath();
    trace.forEach(([t, v], i) => { const x = right - ((tNow - t) / SPAN) * (right - left); i ? c.lineTo(x, yOf(v)) : c.moveTo(x, yOf(v)); });
    c.stroke();
    c.fillStyle = cs.getPropertyValue("--ink-faint"); c.textAlign = "right"; c.fillText("2χ", left - 6, h / 2); c.textAlign = "left";
  }

  // ---------------------------------------------------------------- running it, politely
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let playing = !reduce, visible = true, last = 0, raf = 0;
  function frame(t) {
    raf = 0;
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    const before = cycleT;
    step(dt); if (cycleT < before) cycles++;
    sample(dt); drawTrace();
    pairs.forEach((p) => placePair(p, t / 1000));
    if (playing && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && playing && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  function setPlaying(p) { playing = p; playBtn.textContent = p ? "Pause animation" : "Play animation"; playBtn.setAttribute("aria-pressed", String(!p)); kick(); }
  playBtn.addEventListener("click", () => setPlaying(!playing));
  if ("IntersectionObserver" in window) new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; kick(); }).observe(fig);
  document.addEventListener("visibilitychange", kick);
  addEventListener("resize", drawTrace);

  // a still frame to start from (and to stay on, with reduced motion): the middle of a detection
  for (let i = 0; i < 2; i++) sample(SPAN / 2);
  for (let t = 0; t < 4.6; t += 1 / 60) { const b = cycleT; step(1 / 60); if (cycleT < b) cycles++; sample(1 / 60); }
  pairs.forEach((p) => placePair(p, 0));
  drawTrace();
  setPlaying(playing);
})();
