/* Lab toolbox, part two: resonator fit, photon number, transmon, Josephson junction,
   superconductor basics and lumped elements.
   Uses the helpers and constants defined in the main script of toolbox.html
   ($, num, fmt, fmtFixed, rows, ellipK, KK, C0, MU0, EPS0, HP, HBAR, KB, QE, PHI0, PEEK, peekObs, updatePeek). */
"use strict";
(() => {
const NB = " ";
const TAU = 2 * Math.PI;
const RQ = HP / (4 * QE * QE);          // reduced resistance quantum h/4e^2, about 6.453 kOhm

/* ---------------------------------------------------------------- helpers */
function fmtHz(hz, sig = 4) {
  const a = Math.abs(hz);
  if (!isFinite(hz)) return "—";
  if (a >= 1e9) return fmt(hz / 1e9, sig) + NB + "GHz";
  if (a >= 1e6) return fmt(hz / 1e6, sig) + NB + "MHz";
  if (a >= 1e3) return fmt(hz / 1e3, sig) + NB + "kHz";
  return fmt(hz, sig) + NB + "Hz";
}
function segment(id, cb) {
  const box = $(id);
  const btns = [...box.querySelectorAll("button")];
  box.dataset.value = (btns.find(b => b.classList.contains("on")) || btns[0]).dataset.v;
  btns.forEach(b => b.addEventListener("click", () => {
    btns.forEach(x => x.classList.toggle("on", x === b));
    box.dataset.value = b.dataset.v;
    cb && cb(b.dataset.v);
  }));
  return () => box.dataset.value;
}
const showIf = (id, on) => $(id).classList.toggle("hide", !on);
function errOut(bigId, resId, msgId, text) {
  $(bigId).innerHTML = "—";
  if (resId) $(resId).innerHTML = "";
  if (msgId) { $(msgId).className = "msg err"; $(msgId).innerHTML = text; }
}
function okMsg(msgId, html, cls = "msg hint") { $(msgId).className = cls; $(msgId).innerHTML = html || ""; }

// complex numbers as [re, im]
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const cexp = th => [Math.cos(th), Math.sin(th)];
const wrap2pi = x => ((x % TAU) + TAU) % TAU;
const cabs = a => Math.hypot(a[0], a[1]);
const carg = a => Math.atan2(a[1], a[0]);
const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const csqrt = a => {   // principal root, accurate when |Im| << |Re|
  const r = cabs(a);
  if (r === 0) return [0, 0];
  if (a[0] >= 0) { const re = Math.sqrt((r + a[0]) / 2); return [re, a[1] / (2 * re)]; }
  const im = Math.sqrt((r - a[0]) / 2) * (a[1] < 0 ? -1 : 1); return [a[1] / (2 * im), im];
};
function ccoth(z) {   // (1 + e^-2z)/(1 - e^-2z), stable for Re z > 0
  const e = cmul([Math.exp(-2 * z[0]), 0], cexp(-2 * z[1]));
  return cdiv([1 + e[0], e[1]], [1 - e[0], -e[1]]);
}

// linear algebra
function solveLin(A, b) {   // Gaussian elimination with partial pivoting; returns null if singular
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (!(Math.abs(M[p][c]) > 0)) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
  return x;
}
function invert(A) {
  const n = A.length, out = A.map(() => new Array(n).fill(0));
  for (let j = 0; j < n; j++) { const e = new Array(n).fill(0); e[j] = 1; const x = solveLin(A, e); if (!x) return null; for (let i = 0; i < n; i++) out[i][j] = x[i]; }
  return out;
}
// Levenberg–Marquardt for a few parameters; res(p) returns an array of real residuals
function levmar(res, p0, steps, iters = 200) {
  let p = p0.slice(), r = res(p), cost = r.reduce((s, v) => s + v * v, 0), lam = 1e-3;
  const m = p.length;
  for (let it = 0; it < iters; it++) {
    const J = [];
    for (let j = 0; j < m; j++) { const q = p.slice(); q[j] += steps[j]; const rj = res(q); J.push(rj.map((v, i) => (v - r[i]) / steps[j])); }
    const A = [...Array(m)].map((_, i) => [...Array(m)].map((_, k) => J[i].reduce((s, v, n) => s + v * J[k][n], 0)));
    const g = [...Array(m)].map((_, i) => J[i].reduce((s, v, n) => s + v * r[n], 0));
    let improved = false;
    while (lam < 1e12) {
      const Al = A.map((row, i) => row.map((v, k) => i === k ? v * (1 + lam) + 1e-300 : v));
      const d = solveLin(Al, g.map(v => -v));
      if (!d) { lam *= 10; continue; }
      const q = p.map((v, i) => v + d[i]), rq = res(q), cq = rq.reduce((s, v) => s + v * v, 0);
      if (isFinite(cq) && cq < cost) {
        const rel = (cost - cq) / cost;
        p = q; r = rq; cost = cq; lam = Math.max(lam / 3, 1e-12); improved = true;
        if (rel < 1e-13) return { p, r, cost };
        break;
      }
      lam *= 4;
    }
    if (!improved) break;
  }
  return { p, r, cost };
}
function unwrap(a) {
  const out = [a[0]];
  for (let i = 1; i < a.length; i++) {
    let d = a[i] - a[i - 1];
    d -= TAU * Math.round(d / TAU);
    out.push(out[i - 1] + d);
  }
  return out;
}
function linfit(x, y) {
  const n = x.length, mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
  const b = sxy / sxx; return { b, a: my - b * mx };
}

/* ---------------------------------------------------------------- plotting */
function niceTicks(lo, hi, n = 5) {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const s0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(s0))), e = s0 / mag;
  const step = (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag;
  const t = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) t.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return t;
}
function tickLabel(v) {
  if (v === 0) return "0";
  const a = Math.abs(v);
  let s = (a >= 1e4 || a < 1e-3) ? v.toExponential(1).replace("e", "e") : String(Number(v.toPrecision(4)));
  return s.replace(/^-/, "−");
}
function plot(cv, o) {
  const dpr = window.devicePixelRatio || 1, W = Math.max(200, cv.clientWidth || cv.parentNode.clientWidth);
  const H = o.equal ? Math.min(W, 380) : (o.height || Math.round(Math.min(260, W * 0.62)));
  cv.style.height = H + "px";
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const css = getComputedStyle(document.documentElement);
  const soft = css.getPropertyValue("--soft").trim() || "#a0a3a9", rule = css.getPropertyValue("--rule").trim() || "rgba(255,255,255,.1)";
  const L = 60, R = 10, T = 10, B = 36;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const s of o.series) for (let i = 0; i < s.x.length; i++) {
    const x = s.x[i], y = s.y[i];
    if (!isFinite(x) || !isFinite(y)) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (!isFinite(x0)) return;
  if (x1 === x0) { x0 -= 1; x1 += 1; }
  if (y1 === y0) { y0 -= 1; y1 += 1; }
  const px = (x1 - x0) * 0.05, py = (y1 - y0) * 0.06;
  x0 -= px; x1 += px; y0 -= py; y1 += py;
  const pw = W - L - R, ph = H - T - B;
  if (o.equal) {
    const s = Math.min(pw / (x1 - x0), ph / (y1 - y0));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    x0 = cx - pw / s / 2; x1 = cx + pw / s / 2; y0 = cy - ph / s / 2; y1 = cy + ph / s / 2;
  }
  const X = x => L + (x - x0) / (x1 - x0) * pw, Y = y => T + (1 - (y - y0) / (y1 - y0)) * ph;
  g.font = "11px 'Public Sans', Arial, sans-serif";
  g.strokeStyle = rule; g.fillStyle = soft; g.lineWidth = 1;
  g.textAlign = "center"; g.textBaseline = "top";
  for (const t of niceTicks(x0, x1, Math.max(3, Math.round(pw / 80)))) {
    g.beginPath(); g.moveTo(Math.round(X(t)) + .5, T); g.lineTo(Math.round(X(t)) + .5, T + ph); g.stroke();
    g.fillText(tickLabel(t), X(t), T + ph + 4);
  }
  g.textAlign = "right"; g.textBaseline = "middle";
  for (const t of niceTicks(y0, y1, Math.max(3, Math.round(ph / 50)))) {
    g.beginPath(); g.moveTo(L, Math.round(Y(t)) + .5); g.lineTo(L + pw, Math.round(Y(t)) + .5); g.stroke();
    g.fillText(tickLabel(t), L - 5, Y(t));
  }
  g.textAlign = "center"; g.textBaseline = "bottom"; g.fillText(o.xlab || "", L + pw / 2, H - 1);
  g.save(); g.translate(11, T + ph / 2); g.rotate(-Math.PI / 2); g.textBaseline = "middle"; g.fillText(o.ylab || "", 0, 0); g.restore();
  g.save(); g.beginPath(); g.rect(L, T, pw, ph); g.clip();
  for (const s of o.series) {
    g.strokeStyle = g.fillStyle = s.color;
    g.globalAlpha = s.alpha || 1;
    if (s.mode === "line") {
      g.lineWidth = s.width || 1.6; g.beginPath(); let on = false;
      for (let i = 0; i < s.x.length; i++) {
        const x = s.x[i], y = s.y[i];
        if (!isFinite(x) || !isFinite(y)) { on = false; continue; }
        on ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)); on = true;
      }
      g.stroke();
    } else {
      const r = s.size || 1.6;
      for (let i = 0; i < s.x.length; i++) {
        if (!isFinite(s.x[i]) || !isFinite(s.y[i])) continue;
        g.beginPath(); g.arc(X(s.x[i]), Y(s.y[i]), r, 0, TAU); g.fill();
      }
    }
  }
  g.restore(); g.globalAlpha = 1;
}
const COL = { raw: "rgba(160,163,169,.55)", data: "#8fb4ec", fit: "#e3b26b", mark: "#ececea", c2: "#9ccfa4", c3: "#d79bd0" };
const redraw = [];
let rzT = 0;
window.addEventListener("resize", () => { clearTimeout(rzT); rzT = setTimeout(() => redraw.forEach(f => f()), 120); });

/* ======================================================================
   1. Resonator fit (notch / hanger, circle fit with DCM)
   ====================================================================== */
function circleTaubin(x, y) {
  const n = x.length;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
  mx /= n; my /= n;
  let sc = 0;
  for (let i = 0; i < n; i++) sc = Math.max(sc, Math.abs(x[i] - mx), Math.abs(y[i] - my));
  sc = sc || 1;
  let Mxx = 0, Myy = 0, Mxy = 0, Mxz = 0, Myz = 0, Mzz = 0;
  for (let i = 0; i < n; i++) {
    const X = (x[i] - mx) / sc, Y = (y[i] - my) / sc, Z = X * X + Y * Y;
    Mxy += X * Y; Mxx += X * X; Myy += Y * Y; Mxz += X * Z; Myz += Y * Z; Mzz += Z * Z;
  }
  Mxx /= n; Myy /= n; Mxy /= n; Mxz /= n; Myz /= n; Mzz /= n;
  const Mz = Mxx + Myy, Cov = Mxx * Myy - Mxy * Mxy, Var = Mzz - Mz * Mz;
  const A3 = 4 * Mz, A2 = -3 * Mz * Mz - Mzz, A1 = Var * Mz + 4 * Cov * Mz - Mxz * Mxz - Myz * Myz;
  const A0 = Mxz * (Mxz * Myy - Myz * Mxy) + Myz * (Myz * Mxx - Mxz * Mxy) - Var * Cov;
  const A22 = A2 + A2, A33 = A3 + A3 + A3;
  let xn = 0, yn = 1e20;
  for (let it = 0; it < 50; it++) {
    const yo = yn;
    yn = A0 + xn * (A1 + xn * (A2 + xn * A3));
    if (Math.abs(yn) > Math.abs(yo)) { xn = 0; break; }
    const Dy = A1 + xn * (A22 + xn * A33), xo = xn;
    xn = xo - yn / Dy;
    if (Math.abs((xn - xo) / xn) < 1e-12) break;
    if (xn < 0) { xn = 0; break; }
  }
  const D = xn * xn - xn * Mz + Cov;
  const cx = (Mxz * (Myy - xn) - Myz * Mxy) / D / 2, cy = (Myz * (Mxx - xn) - Mxz * Mxy) / D / 2;
  return { xc: cx * sc + mx, yc: cy * sc + my, r: Math.sqrt(cx * cx + cy * cy + Mz) * sc };
}
function circleFit(z) {   // algebraic fit, then a short geometric refinement
  const x = z.map(c => c[0]), y = z.map(c => c[1]);
  const c0 = circleTaubin(x, y);
  const s = c0.r || 1;
  const fitG = levmar(p => z.map(c => (Math.hypot(c[0] - p[0], c[1] - p[1]) - p[2]) / s), [c0.xc, c0.yc, c0.r], [s * 1e-7, s * 1e-7, s * 1e-7], 30);
  const [xc, yc, r] = fitG.p;
  return { xc, yc, r, rss: fitG.cost * s * s };
}

function notchModel(f, p) {   // p: a, alpha, tau, fr, Ql, absQc, phi
  const x = f / p.fr - 1;
  const fr = cdiv(cmul([p.Ql / p.absQc, 0], cexp(p.phi)), [1, 2 * p.Ql * x]);
  return cmul(cmul([p.a, 0], cexp(p.alpha - TAU * f * p.tau)), [1 - fr[0], -fr[1]]);
}

function fitNotch(f, z, conj) {
  const n = f.length;
  if (conj) z = z.map(c => [c[0], -c[1]]);
  const span = f[n - 1] - f[0];
  // 1. cable delay: phase slope of the outer 10 % on each side, then refine on circle residual
  const ph = unwrap(z.map(carg));
  const m = Math.max(3, Math.floor(n * 0.1));
  const ix = [...Array(m).keys(), ...Array.from({ length: m }, (_, i) => n - m + i)];
  const lf = linfit(ix.map(i => f[i] - f[0]), ix.map(i => ph[i]));
  const tau0 = -lf.b / TAU;
  const derot = tau => z.map((c, i) => cmul(c, cexp(TAU * (f[i] - f[0]) * tau)));
  const cost = tau => circleFit(derot(tau)).rss;
  const D = 0.3 / span;
  let best = tau0, bc = Infinity;
  for (let i = -30; i <= 30; i++) { const t = tau0 + D * i / 30, c = cost(t); if (c < bc) { bc = c; best = t; } }
  let lo = best - D / 30, hi = best + D / 30;
  const gr = (Math.sqrt(5) - 1) / 2;
  let c1 = hi - gr * (hi - lo), c2 = lo + gr * (hi - lo), f1 = cost(c1), f2 = cost(c2);
  for (let i = 0; i < 60; i++) {
    if (f1 < f2) { hi = c2; c2 = c1; f2 = f1; c1 = hi - gr * (hi - lo); f1 = cost(c1); }
    else { lo = c1; c1 = c2; f1 = f2; c2 = lo + gr * (hi - lo); f2 = cost(c2); }
  }
  const tau = (lo + hi) / 2;
  // delay referenced to f[0] above; express the rotation as e^{+2 pi i f tau} times a constant phase
  const zd = derot(tau);
  const circ = circleFit(zd);
  const zc = [circ.xc, circ.yc], r = circ.r;
  // 2. phase fit around the circle centre
  const th = unwrap(zd.map(c => carg(csub(c, zc))));
  const w = Math.max(1, Math.round(n / 150));
  let kmax = w, smax = 0;
  for (let i = w; i < n - w; i++) { const s = -(th[i + w] - th[i - w]) / (f[i + w] - f[i - w]); if (Math.abs(s) > Math.abs(smax)) { smax = s; kmax = i; } }
  const frG = f[kmax];
  const Ql0 = Math.abs(smax) * frG / 4;
  const sign = smax >= 0 ? 1 : -1;   // phase must decrease through resonance for this convention
  const fit = levmar(
    p => th.map((t, i) => t - (p[0] + 2 * Math.atan(2 * p[1] * (1 - f[i] / (frG * (1 + p[2] * 1e-9)))))),
    [th[kmax], sign * Ql0, 0], [1e-6, Math.max(1, Ql0 * 1e-6), 1e-3]);
  let [theta0, Ql, dfr] = fit.p;
  const fr = frG * (1 + dfr * 1e-9);
  if (!(Ql > 0)) return conj ? { err: "The phase fit did not converge. Check the data format and that the trace contains one resonance." } : fitNotch(f, z, true);
  // 3. off-resonant point gives the environment a e^{i alpha}
  const P = cadd(zc, [r * Math.cos(theta0 + Math.PI), r * Math.sin(theta0 + Math.PI)]);
  const a = cabs(P);
  // 4. normalise: circle centre and radius in the normalised frame
  const cn = cdiv(zc, P), rn = r / a;
  const absQc = Ql / (2 * rn);
  const phi = carg(csub([1, 0], cn));
  const invQi = 1 / Ql - Math.cos(phi) / absQc;
  const Qi = 1 / invQi;
  // full parameter set: the delay rotation used f - f[0]; fold the constant into alpha
  const alpha = carg(P) + TAU * f[0] * tau;
  const p = { a, alpha, tau, fr, Ql, absQc, phi, Qi, QcCorr: absQc / Math.cos(phi), conj: !!conj };
  // 5. uncertainties from the Jacobian of the full model at the circle-fit solution
  const fc = (f[0] + f[n - 1]) / 2;
  const names = ["a", "beta", "tau", "fr", "Ql", "absQc", "phi"];
  const base = { a, beta: alpha - TAU * fc * tau, tau, fr, Ql, absQc, phi };
  const mdl = q => f.map(fi => notchModel(fi, { a: q.a, alpha: q.beta + TAU * fc * q.tau, tau: q.tau, fr: q.fr, Ql: q.Ql, absQc: q.absQc, phi: q.phi }));
  const m0 = mdl(base);
  let rss = 0;
  for (let i = 0; i < n; i++) rss += (z[i][0] - m0[i][0]) ** 2 + (z[i][1] - m0[i][1]) ** 2;
  const st = { a: a * 1e-6, beta: 1e-6, tau: 1e-6 / (TAU * span), fr: fr / Ql * 1e-5, Ql: Ql * 1e-6, absQc: absQc * 1e-6, phi: 1e-6 };
  const J = names.map(k => {
    const qp = { ...base }, qm = { ...base };
    qp[k] += st[k]; qm[k] -= st[k];
    const mp = mdl(qp), mm = mdl(qm), col = [];
    for (let i = 0; i < n; i++) { col.push((mp[i][0] - mm[i][0]) / (2 * st[k]), (mp[i][1] - mm[i][1]) / (2 * st[k])); }
    return col;
  });
  const A = names.map((_, i) => names.map((_, k) => J[i].reduce((s, v, q) => s + v * J[k][q], 0)));
  const cov = invert(A);
  const s2 = rss / Math.max(1, 2 * n - 7);
  if (cov) {
    const sd = names.map((_, i) => Math.sqrt(Math.max(0, cov[i][i] * s2)));
    p.se = { fr: sd[3], Ql: sd[4], absQc: sd[5], phi: sd[6], a: sd[0], tau: sd[2] };
    const g = [Qi * Qi / (Ql * Ql), -Qi * Qi * Math.cos(phi) / (absQc * absQc), -Qi * Qi * Math.sin(phi) / absQc];   // d Qi / d(Ql, absQc, phi)
    const ii = [4, 5, 6];
    let v = 0;
    for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) v += g[i] * g[k] * cov[ii[i]][ii[k]] * s2;
    p.se.Qi = Math.sqrt(Math.max(0, v));
    const gc = [1 / Math.cos(phi), absQc * Math.sin(phi) / Math.cos(phi) ** 2];   // d QcCorr / d(absQc, phi)
    let vc = 0; const jj = [5, 6];
    for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) vc += gc[i] * gc[k] * cov[jj[i]][jj[k]] * s2;
    p.se.QcCorr = Math.sqrt(Math.max(0, vc));
  }
  p.rmsRel = Math.sqrt(rss / n) / a;
  const back = cexp(TAU * f[0] * tau);   // re-reference the delay rotation to f = 0
  p.zIn = z; p.zd = zd.map(c => cmul(c, back));
  p.circle = { zc: cmul(zc, back), r };
  p.cn = cn; p.rn = rn; p.P = cmul(P, back);
  return p;
}

// --- input parsing
function parseTrace(text, fmtSel, fUnit, cols) {
  const lines = text.split(/\r?\n/);
  let format = fmtSel, unit = fUnit, colsUse = cols.slice(), touch = false;
  const fr = [], A = [], B = [];
  for (let raw of lines) {
    let line = raw.trim();
    if (!line) continue;
    if (line[0] === "!") continue;
    if (line[0] === "#") {   // Touchstone option line, e.g. "# GHz S RI R 50"
      const t = line.slice(1).trim().toUpperCase().split(/\s+/);
      touch = true;
      for (const w of t) {
        if (["HZ", "KHZ", "MHZ", "GHZ"].includes(w)) unit = { HZ: 1, KHZ: 1e3, MHZ: 1e6, GHZ: 1e9 }[w];
        if (w === "RI") format = "reim"; if (w === "MA") format = "lindeg"; if (w === "DB") format = "dbdeg";
      }
      continue;
    }
    const parts = line.split(/[,;\t ]+/).filter(Boolean).map(Number);
    if (parts.some(v => !isFinite(v))) continue;   // header or text line
    if (touch && parts.length === 9) colsUse = [1, 4, 5];   // two-port file: use S21
    const need = Math.max(...colsUse);
    if (parts.length < need) continue;
    fr.push(parts[colsUse[0] - 1]); A.push(parts[colsUse[1] - 1]); B.push(parts[colsUse[2] - 1]);
  }
  if (fr.length < 20) return { err: `Found ${fr.length} usable data rows; need at least 20 rows of numbers.` };
  if (unit === "auto") {
    const mx = Math.max(...fr.map(Math.abs));
    unit = mx < 1e3 ? 1e9 : mx < 1e6 ? 1e6 : mx < 1e9 ? 1e3 : 1;
  }
  const idx = fr.map((_, i) => i).sort((i, k) => fr[i] - fr[k]);
  const f = [], z = [];
  for (const i of idx) {
    f.push(fr[i] * unit);
    const a = A[i], b = B[i];
    if (format === "reim") z.push([a, b]);
    else {
      const mag = format.startsWith("db") ? Math.pow(10, a / 20) : a;
      const ph = format.endsWith("rad") ? b : b * Math.PI / 180;
      z.push([mag * Math.cos(ph), mag * Math.sin(ph)]);
    }
  }
  return { f, z, unit, format, touch };
}

// --- synthetic example
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function exampleTrace(seed) {
  const rnd = mulberry(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-300)) * Math.cos(TAU * rnd());
  const t = { fr: 6.0123457e9, Qi: 2.5e5, absQc: 1.2e5, phi: -0.2, a: 0.0316, alpha: 2.0, tau: 62e-9 };
  t.Ql = 1 / (1 / t.Qi + Math.cos(t.phi) / t.absQc);
  t.QcCorr = t.absQc / Math.cos(t.phi);
  const N = 1001, span = 16 * t.fr / t.Ql, sig = 0.006 * t.a;
  const lines = ["# Synthetic notch resonator: frequency (GHz), Re S21, Im S21"];
  for (let i = 0; i < N; i++) {
    const f = t.fr - span / 2 + span * i / (N - 1);
    const m = notchModel(f, t);
    lines.push(`${(f / 1e9).toFixed(10)},${(m[0] + sig * gauss()).toPrecision(8)},${(m[1] + sig * gauss()).toPrecision(8)}`);
  }
  return { text: lines.join("\n"), truth: t };
}

let fitTruth = null, fitLast = null, fitTimer = 0;
function initFit() {
  $("fit-ex").addEventListener("click", () => {
    const ex = exampleTrace((Math.random() * 2 ** 31) | 0);
    $("fit-data").value = ex.text; fitTruth = ex.truth;
    $("fit-fmt").value = "reim"; $("fit-funit").value = "auto";
    $("fit-c1").value = "1"; $("fit-c2").value = "2"; $("fit-c3").value = "3";
    $("fit-file-name").textContent = "";
    runFit();
  });
  $("fit-file").addEventListener("change", e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 20e6) { okMsg("fit-msg", "That file is larger than 20 MB.", "msg err"); return; }
    const rd = new FileReader();
    rd.onload = () => { $("fit-data").value = rd.result; fitTruth = null; $("fit-file-name").textContent = file.name; runFit(); };
    rd.readAsText(file);
  });
  $("fit-data").addEventListener("input", () => { fitTruth = null; clearTimeout(fitTimer); fitTimer = setTimeout(runFit, 300); });
  ["fit-fmt", "fit-funit"].forEach(id => $(id).addEventListener("change", runFit));
  ["fit-c1", "fit-c2", "fit-c3"].forEach(id => $(id).addEventListener("input", () => { clearTimeout(fitTimer); fitTimer = setTimeout(runFit, 300); }));
  redraw.push(drawFit);
}
function runFit() {
  const text = $("fit-data").value;
  if (!text.trim()) {
    errOut("fit-big", "fit-res", "fit-msg", "Paste a trace, upload a file or load the example.");
    $("fit-msg").className = "msg hint"; fitLast = null; $("fit-plots").classList.add("hide"); updatePeek(); return;
  }
  const cols = ["fit-c1", "fit-c2", "fit-c3"].map(id => Math.round(num(id)));
  if (cols.some(c => !(c >= 1))) return errOut("fit-big", "fit-res", "fit-msg", "Column numbers start at 1.");
  const fu = $("fit-funit").value;
  const d = parseTrace(text, $("fit-fmt").value, fu === "auto" ? "auto" : +fu, cols);
  if (d.err) { fitLast = null; $("fit-plots").classList.add("hide"); return errOut("fit-big", "fit-res", "fit-msg", d.err); }
  let p;
  try { p = fitNotch(d.f, d.z, false); } catch (e) { p = { err: "The fit failed: " + e.message }; }
  if (p.err || !isFinite(p.Qi)) { fitLast = null; $("fit-plots").classList.add("hide"); return errOut("fit-big", "fit-res", "fit-msg", p.err || "The fit did not converge."); }
  p.f = d.f; fitLast = p;
  const e = p.se || {};
  const pm = (v, s, sig = 5) => fmt(v, sig) + (isFinite(s) && s > 0 ? ` <span class="hint">± ${fmt(s, 2)}</span>` : "");
  $("fit-big").innerHTML = `${fmtFixed(p.fr / 1e9, 9)}<span class="u">GHz</span>`;
  $("fit-bigsub").innerHTML = `Q<sub>i</sub> = ${fmt(p.Qi, 4)}, Q<sub>l</sub> = ${fmt(p.Ql, 4)}`;
  const list = [
    ["Resonance frequency f<sub>0</sub>", `${fmt(p.fr / 1e9, 10)}${NB}GHz`],
    ["", `<span class="hint">± ${fmtHz(e.fr, 2)}</span>`],
    ["Internal Q<sub>i</sub>", pm(p.Qi, e.Qi)],
    ["Loaded Q<sub>l</sub>", pm(p.Ql, e.Ql)],
    ["Coupling |Q<sub>c</sub>|", pm(p.absQc, e.absQc)],
    ["Impedance-mismatch angle φ", `${fmt(p.phi, 4)}${NB}rad <span class="hint">± ${fmt(e.phi, 2)}</span>`],
    ["φ-corrected Q<sub>c</sub> = |Q<sub>c</sub>|/cos φ", pm(p.QcCorr, e.QcCorr)],
    ["Linewidth f<sub>0</sub>/Q<sub>l</sub>", fmtHz(p.fr / p.Ql, 4)],
    { grp: "Environment" },
    ["Amplitude a", `${fmt(p.a, 4)} (${fmt(20 * Math.log10(p.a), 4)}${NB}dB)`],
    ["Environment phase at f<sub>0</sub>, α − 2πf<sub>0</sub>τ", `${fmt(wrap2pi(p.alpha - TAU * p.fr * p.tau), 4)}${NB}rad`],
    ["Cable delay τ", `${fmt(p.tau * 1e9, 5)}${NB}ns`],
    ["Residual rms / a", fmt(p.rmsRel, 3)],
    ["Points", String(p.f.length)],
  ];
  $("fit-res").innerHTML = rows(list);
  let note = p.conj ? "The phase ran the other way, so the data were complex-conjugated before fitting (opposite sign convention). " : "";
  if (p.Qi < 0) note += "Q<sub>i</sub> came out negative: the circle is not a notch resonance or φ is badly determined. ";
  if (fitTruth) {
    const t = fitTruth;
    const rel = (x, y) => `${fmt((x - y) / y * 100, 2)}${NB}%`;
    note += `<b>Example:</b> true values f<sub>0</sub> = ${fmt(t.fr / 1e9, 10)}${NB}GHz (fit off by ${fmtHz(p.fr - t.fr, 2)}), Q<sub>i</sub> = ${fmt(t.Qi, 4)} (${rel(p.Qi, t.Qi)}), |Q<sub>c</sub>| = ${fmt(t.absQc, 4)} (${rel(p.absQc, t.absQc)}), Q<sub>l</sub> = ${fmt(t.Ql, 4)} (${rel(p.Ql, t.Ql)}), φ = ${fmt(t.phi, 3)}${NB}rad, τ = ${t.tau * 1e9}${NB}ns, a = ${t.a}, phase at f<sub>0</sub> = ${fmt(wrap2pi(t.alpha - TAU * t.fr * t.tau), 4)}${NB}rad.`;
  }
  okMsg("fit-msg", note, "msg");
  $("fit-plots").classList.remove("hide");
  drawFit(); updatePeek();
}
function drawFit() {
  const p = fitLast;
  if (!p || !$("tool-fit").classList.contains("active")) return;
  const f = p.f, n = f.length;
  const span = f[n - 1] - f[0];
  const [fs, fl] = span < 2e6 ? [1e3, "kHz"] : span < 2e9 ? [1e6, "MHz"] : [1e9, "GHz"];
  const xf = f.map(v => (v - p.fr) / fs);
  const fm = [], fx = [];
  for (let i = 0; i <= 600; i++) { const v = f[0] + span * i / 600; fm.push(v); fx.push((v - p.fr) / fs); }
  const mod = fm.map(v => notchModel(v, p));
  const modD = fm.map(v => cmul(notchModel(v, p), cexp(TAU * v * p.tau)));
  const circ = (c, r) => { const x = [], y = []; for (let i = 0; i <= 240; i++) { x.push(c[0] + r * Math.cos(TAU * i / 240)); y.push(c[1] + r * Math.sin(TAU * i / 240)); } return { x, y }; };
  const c1 = circ(p.circle.zc, p.circle.r);
  plot($("fit-pl-raw"), { equal: true, xlab: "Re S21", ylab: "Im S21", series: [
    { x: p.zIn.map(c => c[0]), y: p.zIn.map(c => c[1]), color: COL.raw, size: 1.4 },
    { x: p.zd.map(c => c[0]), y: p.zd.map(c => c[1]), color: COL.data, size: 1.4 },
    { x: c1.x, y: c1.y, color: COL.fit, mode: "line" },
    { x: [p.P[0]], y: [p.P[1]], color: COL.mark, size: 3.5 },
  ] });
  const zn = p.zd.map(c => cdiv(c, p.P));
  const c2 = circ(p.cn, p.rn);
  const res0 = cdiv(cmul(notchModel(p.fr, p), cexp(TAU * p.fr * p.tau)), p.P);
  plot($("fit-pl-norm"), { equal: true, xlab: "Re (normalised)", ylab: "Im (normalised)", series: [
    { x: zn.map(c => c[0]), y: zn.map(c => c[1]), color: COL.data, size: 1.4 },
    { x: c2.x, y: c2.y, color: COL.fit, mode: "line" },
    { x: [1, res0[0]], y: [0, res0[1]], color: COL.mark, size: 3.5 },
    { x: [0], y: [0], color: COL.raw, size: 2.5 },
  ] });
  plot($("fit-pl-mag"), { xlab: `f − f₀ (${fl})`, ylab: "|S21| (dB)", series: [
    { x: xf, y: p.zIn.map(c => 20 * Math.log10(cabs(c))), color: COL.data, size: 1.4 },
    { x: fx, y: mod.map(c => 20 * Math.log10(cabs(c))), color: COL.fit, mode: "line" },
  ] });
  const phD = unwrap(p.zd.map(carg)), phM = unwrap(modD.map(carg));
  const shift = TAU * Math.round((phD[Math.floor(n / 2)] - phM[300]) / TAU);
  plot($("fit-pl-ph"), { xlab: `f − f₀ (${fl})`, ylab: "phase, delay removed (deg)", series: [
    { x: xf, y: phD.map(v => v * 180 / Math.PI), color: COL.data, size: 1.4 },
    { x: fx, y: phM.map(v => (v + shift) * 180 / Math.PI), color: COL.fit, mode: "line" },
  ] });
}

/* ======================================================================
   2. Transmon (exact diagonalisation in the charge basis)
   ====================================================================== */
function tridiagLowest(d, off, k) {
  const n = d.length, e2 = off * off;
  const count = x => {
    let c = 0, q = d[0] - x;
    if (q < 0) c++;
    for (let i = 1; i < n; i++) {
      q = d[i] - x - e2 / (q === 0 ? 1e-300 : q);
      if (q < 0) c++;
    }
    return c;
  };
  let lo0 = Math.min(...d) - 2 * Math.abs(off) - 1e-9, hi0 = Math.max(...d) + 2 * Math.abs(off) + 1e-9;
  const out = [];
  for (let m = 0; m < k; m++) {
    let lo = lo0, hi = hi0;
    for (let it = 0; it < 400; it++) {
      const mid = (lo + hi) / 2;
      if (mid === lo || mid === hi) break;
      if (count(mid) > m) hi = mid; else lo = mid;
    }
    out.push((lo + hi) / 2);
    lo0 = out[m] - 1e-12 * Math.abs(out[m]);
  }
  return out;
}
function transmonE(EC, EJ, ng, N = 30, k = 4) {
  const d = [];
  for (let n = -N; n <= N; n++) d.push(4 * EC * (n - ng) ** 2);
  return tridiagLowest(d, -EJ / 2, k);
}
function koch(EC, EJ) {
  const r = EJ / EC, sq = Math.sqrt(8 * EJ * EC);
  const eps = m => Math.pow(-1, m) * EC * Math.pow(2, 4 * m + 5) / [1, 1, 2, 6][m] * Math.sqrt(2 / Math.PI) * Math.pow(EJ / (2 * EC), m / 2 + 3 / 4) * Math.exp(-Math.sqrt(8 * r));
  return { f01: sq - EC, f12: sq - 2 * EC, alpha: -EC, eps0: eps(0), eps1: eps(1), eps2: eps(2) };
}
let trLast = null;
function initTransmon() {
  $("tr-ecsrc").addEventListener("change", () => { showIf("tr-c-f", $("tr-ecsrc").value === "c"); showIf("tr-ec-f", $("tr-ecsrc").value === "ec"); renderTransmon(); });
  $("tr-ejsrc").addEventListener("change", () => { const v = $("tr-ejsrc").value; ["tr-rn-f", "tr-gap-f"].forEach(id => showIf(id, v === "rn")); showIf("tr-ej-f", v === "ej"); renderTransmon(); });
  $("tool-tr").addEventListener("input", renderTransmon);
  redraw.push(drawTransmon);
}
function renderTransmon() {
  let EC, EJ;
  if ($("tr-ecsrc").value === "c") {
    const C = num("tr-c") * 1e-15;
    if (!(C > 0)) return errOut("tr-big", "tr-res", "tr-msg", "Enter a positive capacitance.");
    EC = QE * QE / (2 * C) / HP / 1e9;
  } else {
    EC = num("tr-ec") / 1e3;
    if (!(EC > 0)) return errOut("tr-big", "tr-res", "tr-msg", "Enter a positive E<sub>C</sub>.");
  }
  let EJsrc = "";
  if ($("tr-ejsrc").value === "rn") {
    const RN = num("tr-rn") * 1e3, gap = num("tr-gap") * 1e-6 * QE;
    if (!(RN > 0 && gap > 0)) return errOut("tr-big", "tr-res", "tr-msg", "Enter positive R<sub>N</sub> and Δ.");
    EJ = RQ * gap / (2 * RN) / HP / 1e9;   // Ambegaokar–Baratoff at T = 0
    EJsrc = `I<sub>c</sub> = ${fmt(Math.PI * gap / (2 * QE * RN) * 1e9, 4)}${NB}nA from Ambegaokar–Baratoff`;
  } else {
    EJ = num("tr-ej");
    if (!(EJ > 0)) return errOut("tr-big", "tr-res", "tr-msg", "Enter a positive E<sub>J</sub>.");
  }
  const N = 30;
  const e0 = transmonE(EC, EJ, 0, N, 4), e5 = transmonE(EC, EJ, 0.5, N, 4);
  const f01 = [e0[1] - e0[0], e5[1] - e5[0]], f12 = [e0[2] - e0[1], e5[2] - e5[1]];
  const f01m = (f01[0] + f01[1]) / 2, f12m = (f12[0] + f12[1]) / 2;
  const eps = [0, 1, 2].map(m => e5[m] - e0[m]);
  const k = koch(EC, EJ);
  trLast = { EC, EJ };
  $("tr-big").innerHTML = `${fmtFixed(f01m, 5)}<span class="u">GHz</span>`;
  $("tr-bigsub").innerHTML = `E<sub>J</sub>/E<sub>C</sub> = ${fmt(EJ / EC, 4)}. ${EJsrc}`;
  const prec = 1e-13 * Math.max(EJ, EC);
  const dsp = v => Math.abs(v) < 20 * prec ? `< ${fmtHz(20 * prec * 1e9, 1)} <span class="hint">(below precision)</span>` : fmtHz(v * 1e9, 4);
  const tr = (name, ex, as) => `<tr><td>${name}</td><td class="num">${ex}</td><td class="num">${as}</td></tr>`;
  $("tr-tbody").innerHTML = [
    tr("E<sub>C</sub>/h", fmtHz(EC * 1e9, 5), ""),
    tr("E<sub>J</sub>/h", fmtHz(EJ * 1e9, 5), ""),
    tr("f<sub>01</sub>, average over n<sub>g</sub>", fmtHz(f01m * 1e9, 6), fmtHz(k.f01 * 1e9, 6)),
    tr("f<sub>01</sub> at n<sub>g</sub> = 0 / 0.5", `${fmt(f01[0], 7)} / ${fmt(f01[1], 7)}${NB}GHz`, ""),
    tr("f<sub>12</sub>, average", fmtHz(f12m * 1e9, 6), fmtHz(k.f12 * 1e9, 6)),
    tr("Anharmonicity f<sub>12</sub> − f<sub>01</sub>", fmtHz((f12m - f01m) * 1e9, 4), fmtHz(k.alpha * 1e9, 4)),
    tr("Ground-level dispersion ε<sub>0</sub>", dsp(eps[0]), fmtHz(k.eps0 * 1e9, 3)),
    tr("First-level dispersion ε<sub>1</sub>", dsp(eps[1]), fmtHz(k.eps1 * 1e9, 3)),
    tr("Second-level dispersion ε<sub>2</sub>", dsp(eps[2]), fmtHz(k.eps2 * 1e9, 3)),
    tr("f<sub>01</sub> peak-to-peak |ε<sub>1</sub> − ε<sub>0</sub>|", dsp(Math.abs(eps[1] - eps[0])), fmtHz(Math.abs(k.eps1 - k.eps0) * 1e9, 3)),
  ].join("");
  const msgs = [];
  if (EJ / EC < 20) msgs.push("E<sub>J</sub>/E<sub>C</sub> is below about 20: the asymptotic transmon formulas are not reliable here; trust the exact column.");
  if (EJ / EC > 1000) msgs.push("Very large E<sub>J</sub>/E<sub>C</sub>: the charge basis (|n| ≤ 30) may be too small; results become approximate.");
  okMsg("tr-msg", msgs.join("<br>"), "msg warn");
  drawTransmon(); updatePeek();
}
function drawTransmon() {
  if (!trLast || !$("tool-tr").classList.contains("active")) return;
  const { EC, EJ } = trLast;
  const ngs = [], lev = [[], [], [], []];
  for (let i = 0; i <= 120; i++) { const ng = -1 + 2 * i / 120; ngs.push(ng); const e = transmonE(EC, EJ, ng, 30, 4); e.forEach((v, m) => lev[m].push(v)); }
  const e0min = Math.min(...lev[0]);
  plot($("tr-plot"), { xlab: "offset charge n_g", ylab: "E − E₀ (GHz)", height: 240, series: lev.map((l, m) => ({ x: ngs, y: l.map(v => v - e0min), color: [COL.data, COL.fit, COL.c2, COL.c3][m], mode: "line" })) });
}

/* ======================================================================
   3. Josephson junction
   ====================================================================== */
const JJ_UNITS = { rn: "kΩ", ic: "nA", ej: "GHz", lj: "nH" };
function jjGap() {
  const Tc = num("jj-tc"), T = num("jj-t") * 1e-3;
  if (!(Tc > 0 && T >= 0 && T < Tc)) return null;
  const D = 1.764 * KB * Tc;
  const th = T > 0 ? Math.tanh(D / (2 * KB * T)) : 1;
  return { D, th, Tc, T };
}
function initJJ() {
  $("jj-from").addEventListener("change", () => {
    const v = $("jj-from").value;
    $("jj-val-u").textContent = JJ_UNITS[v];
    $("jj-val").value = { rn: "10", ic: "30", ej: "15", lj: "10" }[v];
    renderJJ();
  });
  $("jj-amode").addEventListener("change", () => { showIf("jj-ra-f", $("jj-amode").value === "area"); showIf("jj-area-f", $("jj-amode").value === "ra"); renderJJ(); });
  $("tool-jj").addEventListener("input", renderJJ);
}
function renderJJ() {
  const g = jjGap();
  if (!g) return errOut("jj-big", "jj-res", "jj-msg", "Enter T<sub>c</sub> > 0 and an operating temperature below T<sub>c</sub>.");
  const IcRn = Math.PI * g.D / (2 * QE) * g.th;   // volts
  const v = num("jj-val"), from = $("jj-from").value;
  if (!(v > 0)) return errOut("jj-big", "jj-res", "jj-msg", "Enter a positive value.");
  let Ic;
  if (from === "rn") Ic = IcRn / (v * 1e3);
  else if (from === "ic") Ic = v * 1e-9;
  else if (from === "ej") Ic = v * 1e9 * HP * 2 * QE / HBAR;
  else Ic = PHI0 / (TAU * v * 1e-9);
  const RN = IcRn / Ic, EJ = HBAR * Ic / (2 * QE), LJ = PHI0 / (TAU * Ic);
  $("jj-big").innerHTML = from === "rn" ? `${fmtFixed(Ic * 1e9, 4)}<span class="u">nA</span>` : `${fmtFixed(RN / 1e3, 4)}<span class="u">kΩ</span>`;
  $("jj-bigcap").textContent = from === "rn" ? "Critical current" : "Normal-state resistance";
  const list = [
    ["Normal-state resistance R<sub>N</sub>", `${fmt(RN / 1e3, 5)}${NB}kΩ`],
    ["Critical current I<sub>c</sub>", `${fmt(Ic * 1e9, 5)}${NB}nA`],
    ["Josephson energy E<sub>J</sub>/h", fmtHz(EJ / HP, 5)],
    ["E<sub>J</sub>/k<sub>B</sub>", `${fmt(EJ / KB, 4)}${NB}K`],
    ["E<sub>J</sub>", `${fmt(EJ / QE * 1e6, 4)}${NB}µeV`],
    ["Josephson inductance L<sub>J</sub> = Φ<sub>0</sub>/2πI<sub>c</sub>", `${fmt(LJ * 1e9, 5)}${NB}nH`],
    { grp: "Gap" },
    ["Δ = 1.764 k<sub>B</sub>T<sub>c</sub>", `${fmt(g.D / QE * 1e6, 4)}${NB}µeV`],
    ["I<sub>c</sub>R<sub>N</sub> = (πΔ/2e) tanh(Δ/2k<sub>B</sub>T)", `${fmt(IcRn * 1e6, 4)}${NB}µV`],
    ["tanh factor at the operating temperature", fmt(g.th, 6)],
  ];
  const am = $("jj-amode").value;
  if (am === "area") {
    const RA = num("jj-ra");
    if (RA > 0) { const A = RA / RN; /* Ohm um^2 / Ohm = um^2 */ list.push({ grp: "Junction area" }, ["Area A = RA/R<sub>N</sub>", `${fmt(A, 4)}${NB}µm²`], ["Square side √A", `${fmt(Math.sqrt(A) * 1e3, 4)}${NB}nm`], ["Critical current density J<sub>c</sub>", `${fmt(Ic / A * 1e6, 4)}${NB}µA/µm²`]); }
  } else {
    const A = num("jj-area");
    if (A > 0) list.push({ grp: "Resistance-area product" }, ["RA = R<sub>N</sub>A", `${fmt(RN * A, 4)}${NB}Ω·µm²`], ["Critical current density J<sub>c</sub>", `${fmt(Ic / A * 1e6, 4)}${NB}µA/µm²`]);
  }
  $("jj-res").innerHTML = rows(list);
  okMsg("jj-msg", g.T > g.Tc / 3 ? "The operating temperature is above T<sub>c</sub>/3; the constant-gap assumption underestimates the drop of I<sub>c</sub>." : "", "msg warn");
}

/* ======================================================================
   4. Photon number from drive power
   ====================================================================== */
function initPhoton() {
  $("ph-qmode").addEventListener("change", () => { showIf("ph-ql-f", $("ph-qmode").value === "lc"); showIf("ph-qi-f", $("ph-qmode").value === "ic"); renderPhoton(); });
  $("ph-conv").addEventListener("change", () => {
    $("ph-qc-lab").innerHTML = $("ph-conv").value === "trans" ? "Input-port coupling Q<sub>c,in</sub>" : "Coupling Q<sub>c</sub>";
    renderPhoton();
  });
  $("tool-ph").addEventListener("input", renderPhoton);
}
function renderPhoton() {
  const f0 = num("ph-f") * 1e9, Pg = num("ph-p"), att = num("ph-att"), Qc = num("ph-qc");
  let Ql, Qi;
  if ($("ph-qmode").value === "lc") { Ql = num("ph-ql"); Qi = 1 / (1 / Ql - 1 / Qc); }
  else { Qi = num("ph-qi"); Ql = 1 / (1 / Qi + 1 / Qc); }
  if (!(f0 > 0 && isFinite(Pg) && att >= 0 && Qc > 0 && Ql > 0)) return errOut("ph-big", "ph-res", "ph-msg", "Enter a positive frequency and Q values, a power in dBm and an attenuation ≥ 0.");
  const conv = $("ph-conv").value;
  const factor = conv === "notch" ? 2 : 4;
  const Pd = Pg - att, P = 1e-3 * Math.pow(10, Pd / 10), w0 = TAU * f0;
  const nbar = factor * Ql * Ql * P / (Qc * HBAR * w0 * w0);
  const P1 = 1 / (factor * Ql * Ql / (Qc * HBAR * w0 * w0));
  const dBm = x => 10 * Math.log10(x / 1e-3);
  $("ph-big").innerHTML = `${fmtFixed(nbar, 4)}<span class="u">photons</span>`;
  $("ph-bigsub").innerHTML = `${fmt(Pd, 4)}${NB}dBm at the device, ${({ notch: "notch (hanger)", refl: "reflection", trans: "transmission" })[conv]} convention`;
  const list = [
    ["Power at the device", `${fmt(Pd, 4)}${NB}dBm = ${fmt(P, 4)}${NB}W`],
    ["Photon flux in the line P/ħω<sub>0</sub>", `${fmt(P / (HBAR * w0), 4)}${NB}photons/s`],
    ["Loaded Q<sub>l</sub>", fmt(Ql, 5)],
    ["Internal Q<sub>i</sub>", Qi > 0 ? fmt(Qi, 5) : `<span class="err">negative: Q<sub>l</sub> must be below Q<sub>c</sub></span>`],
    ["Total linewidth κ/2π = f<sub>0</sub>/Q<sub>l</sub>", fmtHz(f0 / Ql, 4)],
    ["Coupling rate κ<sub>c</sub>/2π", fmtHz(f0 / Qc, 4)],
    ["Stored energy", `${fmt(nbar * HBAR * w0, 4)}${NB}J`],
    { grp: "For one photon" },
    ["Power at the device", `${fmt(dBm(P1), 4)}${NB}dBm`],
    ["Generator power with this attenuation", `${fmt(dBm(P1) + att, 4)}${NB}dBm`],
  ];
  $("ph-res").innerHTML = rows(list);
  okMsg("ph-msg", Qi > 0 ? "" : "Q<sub>l</sub> ≥ Q<sub>c</sub> gives a negative internal Q; check the inputs.", "msg warn");
  updatePeek();
}

/* ======================================================================
   6. Superconductor basics and Mattis–Bardeen
   ====================================================================== */
const SC = [
  { id: "Al", name: "Aluminium (film)", Tc: 1.2, rho: 0.8, N0: 1.72e10 },
  { id: "Nb", name: "Niobium (film)", Tc: 9.2, rho: 5 },
  { id: "Ta", name: "α-tantalum (film)", Tc: 4.4, rho: 2 },
  { id: "TiN", name: "TiN (film)", Tc: 4.5, rho: 100 },
  { id: "NbTiN", name: "NbTiN (film)", Tc: 14, rho: 100 },
  { id: "custom", name: "Custom" },
];
function besselK0(x) {   // Abramowitz & Stegun 9.8.5 / 9.8.6; returns K0(x) and e^x K0(x)
  if (x <= 2) {
    const t = x / 3.75, t2 = t * t;
    const I0 = 1 + t2 * (3.5156229 + t2 * (3.0899424 + t2 * (1.2067492 + t2 * (0.2659732 + t2 * (0.0360768 + t2 * 0.0045813)))));
    const y = x * x / 4;
    const K0 = -Math.log(x / 2) * I0 - 0.57721566 + y * (0.42278420 + y * (0.23069756 + y * (0.03488590 + y * (0.00262698 + y * (0.00010750 + y * 0.0000074)))));
    return { K0, K0s: K0 * Math.exp(x) };
  }
  const y = 2 / x;
  const K0s = (1.25331414 + y * (-0.07832358 + y * (0.02189568 + y * (-0.01062446 + y * (0.00587872 + y * (-0.00251540 + y * 0.00053208)))))) / Math.sqrt(x);
  return { K0: K0s * Math.exp(-x), K0s };
}
const fermi = x => x > 0 ? Math.exp(-x) / (1 + Math.exp(-x)) : 1 / (1 + Math.exp(x));
function mattisBardeen(D, hw, kT) {   // returns sigma1/sigma_n, sigma2/sigma_n
  const F = E => kT > 0 ? fermi(E / kT) : (E > 0 ? 0 : 1);
  const num_ = E => E * E + D * D + hw * E;
  // sigma1, thermal part: E = D cosh u removes the 1/sqrt(E^2 - D^2) edge
  let s1 = 0;
  if (kT > 0) {
    const Emax = D + 60 * kT + hw, U = Math.acosh(Emax / D), M = 6000, h = U / M;
    let acc = 0;
    for (let i = 0; i <= M; i++) {
      const u = i * h, E = D * Math.cosh(u);
      const g = (F(E) - F(E + hw)) * num_(E) / Math.sqrt((E + hw) ** 2 - D * D);
      acc += g * (i === 0 || i === M ? 1 : i % 2 ? 4 : 2);
    }
    s1 = 2 / hw * acc * h / 3;
  }
  // pair breaking for hw > 2D, and sigma2: E = (a+b)/2 - (b-a)/2 cos(theta) removes both edge singularities
  const cosInt = (a, b, fn) => {
    const M = 4000, h = Math.PI / M; let acc = 0;
    for (let i = 0; i < M; i++) {
      const th = (i + 0.5) * h, E = (a + b) / 2 - (b - a) / 2 * Math.cos(th);
      acc += fn(E) * (b - a) / 2 * Math.sin(th);
    }
    return acc * h;
  };
  if (hw > 2 * D) s1 -= 1 / hw * cosInt(D - hw, -D, E => (1 - 2 * F(E + hw)) * num_(E) /   /* E(E + hw) < 0 here, so this term is positive */ (Math.sqrt(E * E - D * D) * Math.sqrt((E + hw) ** 2 - D * D)));
  const lo = Math.max(D - hw, -D);
  const s2 = 1 / hw * cosInt(lo, D, E => (1 - 2 * F(E + hw)) * num_(E) / (Math.sqrt(Math.max(0, D * D - E * E)) * Math.sqrt(Math.max(0, (E + hw) ** 2 - D * D))));
  return { s1, s2 };
}
function initSC() {
  $("sc-mat").innerHTML = SC.map(m => `<option value="${m.id}">${m.name}</option>`).join("");
  $("sc-mat").addEventListener("change", () => {
    const m = SC.find(x => x.id === $("sc-mat").value);
    if (m.Tc) { $("sc-tc").value = m.Tc; $("sc-rho").value = m.rho; $("sc-n0").value = m.N0 ? String(m.N0) : ""; }
    renderSC();
  });
  ["sc-tc", "sc-rho"].forEach(id => $(id).addEventListener("input", () => {
    const m = SC.find(x => x.id === $("sc-mat").value);
    if (m.Tc && (num("sc-tc") !== m.Tc || num("sc-rho") !== m.rho)) $("sc-mat").value = "custom";
  }));
  $("tool-sc").addEventListener("input", renderSC);
}
function renderSC() {
  const Tc = num("sc-tc"), ratio = num("sc-ratio"), rho = num("sc-rho") * 1e-8, t = num("sc-thk") * 1e-9, T = num("sc-t") * 1e-3, f = num("sc-f") * 1e9;
  const N0s = $("sc-n0").value.trim(), N0 = N0s === "" ? NaN : num("sc-n0");
  if (N0s === "") $("sc-n0").classList.remove("bad");
  if (!(Tc > 0 && ratio > 0 && rho > 0 && t > 0 && T > 0 && f > 0)) return errOut("sc-big", "sc-res", "sc-msg", "Enter positive T<sub>c</sub>, gap ratio, ρ<sub>n</sub>, thickness, temperature and frequency.");
  if (T >= Tc) return errOut("sc-big", "sc-res", "sc-msg", "The temperature is at or above T<sub>c</sub>: the film is normal.");
  const D0 = ratio * KB * Tc;
  const DT = D0 * Math.tanh(1.74 * Math.sqrt(Tc / T - 1));
  const kT = KB * T, hw = HP * f, w = TAU * f;
  const xqp = Math.sqrt(TAU * kT / DT) * Math.exp(-DT / kT);
  const nqp = isFinite(N0) ? 2 * N0 * (DT / QE) * xqp : NaN;   // N0 in eV^-1 um^-3 gives um^-3
  const mb = mattisBardeen(DT, hw, kT);
  const sn = 1 / rho, s1 = mb.s1 * sn, s2 = mb.s2 * sn;
  // approximations for hw << D, kT << D
  const xi = hw / (2 * kT), k0 = besselK0(xi);
  const s1a = 4 * DT / hw * Math.exp(-DT / kT) * k0.K0s * (1 - Math.exp(-2 * xi)) / 2;   // sinh(xi) K0(xi)
  const s2a = Math.PI * DT / hw * Math.tanh(DT / (2 * kT));
  // local surface impedance of a film of thickness t: Zs = sqrt(i w mu0 / sigma) coth(k t), k = sqrt(i w mu0 sigma), sigma = s1 - i s2
  const k = csqrt([w * MU0 * s2, w * MU0 * s1]);
  const Zs = cmul(cdiv([0, w * MU0], k), ccoth([k[0] * t, k[1] * t]));
  const lam = 1 / Math.sqrt(MU0 * w * s2);
  const LsThin = HBAR * (rho / t) / (Math.PI * D0);
  $("sc-big").innerHTML = `${fmtFixed(D0 / QE * 1e6, 4)}<span class="u">µeV</span>`;
  $("sc-bigsub").innerHTML = `Δ<sub>0</sub> = ${fmt(ratio, 4)} k<sub>B</sub>T<sub>c</sub>; pair breaking above 2Δ<sub>0</sub>/h = ${fmtHz(2 * D0 / HP, 4)}`;
  const list = [
    ["Δ<sub>0</sub>/k<sub>B</sub>", `${fmt(D0 / KB, 4)}${NB}K`],
    ["Δ<sub>0</sub>/h", fmtHz(D0 / HP, 4)],
    ["Δ(T) at this temperature", `${fmt(DT / QE * 1e6, 5)}${NB}µeV`],
    { grp: "Thermal quasiparticles" },
    ["x<sub>qp</sub> = √(2πk<sub>B</sub>T/Δ) e<sup>−Δ/k<sub>B</sub>T</sup>", fmt(xqp, 4)],
    ["n<sub>qp</sub> = 2N<sub>0</sub>Δ x<sub>qp</sub>", isFinite(nqp) ? `${fmt(nqp, 4)}${NB}µm<sup>−3</sup>` : `<span class="hint">enter N<sub>0</sub></span>`],
    { grp: "Mattis–Bardeen at f = " + fmtHz(f, 4) },
    ["σ<sub>1</sub>/σ<sub>n</sub> (numerical)", fmt(mb.s1, 5)],
    ["σ<sub>1</sub>/σ<sub>n</sub> (low-T, ħω ≪ Δ)", fmt(s1a, 5)],
    ["σ<sub>2</sub>/σ<sub>n</sub> (numerical)", fmt(mb.s2, 5)],
    ["σ<sub>2</sub>/σ<sub>n</sub> (πΔ/ħω) tanh(Δ/2k<sub>B</sub>T)", fmt(s2a, 5)],
    ["σ<sub>2</sub>/σ<sub>1</sub>", fmt(mb.s2 / mb.s1, 4)],
    ["Penetration depth λ = 1/√(μ<sub>0</sub>ωσ<sub>2</sub>)", `${fmt(lam * 1e9, 4)}${NB}nm`],
    { grp: `Film of ${fmt(t * 1e9, 4)}${NB}nm` },
    ["Surface resistance R<sub>s</sub>", `${fmt(Zs[0], 4)}${NB}Ω/□`],
    ["Surface reactance X<sub>s</sub>", `${fmt(Zs[1], 4)}${NB}Ω/□`],
    ["Sheet kinetic inductance L<sub>s</sub> = X<sub>s</sub>/ω", `${fmt(Zs[1] / w * 1e12, 4)}${NB}pH/□`],
    ["Thin-film, T = 0 value ħR<sub>n</sub>/(πΔ<sub>0</sub>)", `${fmt(LsThin * 1e12, 4)}${NB}pH/□`],
    ["Normal sheet resistance R<sub>n</sub> = ρ<sub>n</sub>/t", `${fmt(rho / t, 4)}${NB}Ω/□`],
  ];
  $("sc-res").innerHTML = rows(list);
  const msgs = [];
  if (hw > 2 * DT) msgs.push("ħω > 2Δ: photons break pairs; the low-temperature approximations do not apply.");
  else if (hw > 0.2 * DT || kT > 0.2 * DT) msgs.push("ħω or k<sub>B</sub>T is not small compared with Δ, so the approximate column differs from the numerical one.");
  if (T > Tc / 2) msgs.push("Above T<sub>c</sub>/2 the Δ(T) interpolation and Mattis–Bardeen theory are approximate.");
  okMsg("sc-msg", msgs.join("<br>"), "msg warn");
  updatePeek();
}

/* ======================================================================
   7. Lumped elements
   ====================================================================== */
const DIEL = [
  { n: "SiO₂ (thermal) 3.9", e: 3.9 }, { n: "Si₃N₄ (LPCVD) 7.5", e: 7.5 }, { n: "a-Si:H ≈ 11", e: 11 },
  { n: "Al₂O₃ (ALD) ≈ 8", e: 8 }, { n: "Vacuum 1", e: 1 }, { n: "Custom", e: null },
];
function idc(N, L, W, G, er) {   // Igreja & Silva, semi-infinite substrate, air above
  const eta = W / (W + G);
  const kI = Math.sin(Math.PI * eta / 2), kE = 2 * Math.sqrt(eta) / (1 + eta);
  const kIp = Math.cos(Math.PI * eta / 2), kEp = (1 - eta) / (1 + eta);
  const CI = EPS0 * (er + 1) * L * KK(kI, kIp), CE = EPS0 * (er + 1) * L * KK(kE, kEp);
  const C = (N - 3) * CI / 2 + 2 * CI * CE / (CI + CE);
  const alley = (er + 1) * (L * 1e6) * ((N - 3) * 4.409e-6 + 9.92e-6) * 1e-12;   // pF formula, L in um
  return { C, CI, CE, alley, eta };
}
function stripSelf(l, w, t) { return MU0 * l / TAU * (Math.log(2 * l / (w + t)) + 0.5 + 0.2235 * (w + t) / l); }
function filMutual(l, d) { return MU0 * l / TAU * (Math.log(l / d + Math.sqrt(1 + (l / d) ** 2)) - Math.sqrt(1 + (d / l) ** 2) + d / l); }
function meander(N, l, w, p, t) {
  let L = N * stripSelf(l, w, t);
  for (let k = 1; k < N; k++) L += 2 * (N - k) * (k % 2 ? -1 : 1) * filMutual(l, k * p);
  const len = N * l + (N - 1) * p;
  return { L, len, sq: len / w };
}
function spiral(n, dout, w, s) {
  const din = dout - 2 * n * w - 2 * (n - 1) * s;
  if (!(din > 0)) return { err: true, din };
  const davg = (dout + din) / 2, rho = (dout - din) / (dout + din);
  const wheeler = 2.34 * MU0 * n * n * davg / (1 + 2.75 * rho);
  const sheet = MU0 * n * n * davg * 1.27 / 2 * (Math.log(2.07 / rho) + 0.18 * rho + 0.13 * rho * rho);
  return { din, davg, rho, wheeler, sheet, len: 4 * n * davg, sq: 4 * n * davg / w };
}
const lcVals = {};
function initLC() {
  $("lc-pd").innerHTML = DIEL.map((d, i) => `<option value="${i}">${d.n}</option>`).join("");
  $("lc-pd").addEventListener("change", () => { const d = DIEL[+$("lc-pd").value]; if (d.e) $("lc-pe").value = d.e; renderLC(); });
  $("lc-pe").addEventListener("input", () => { const d = DIEL[+$("lc-pd").value]; if (d.e && num("lc-pe") !== d.e) $("lc-pd").value = String(DIEL.length - 1); });
  $("tool-lumped").addEventListener("input", renderLC);
}
function renderLC() {
  const out = (id, list) => { $(id).innerHTML = rows(list); };
  // IDC
  const N = Math.round(num("lc-in")), Lf = num("lc-il") * 1e-6, W = num("lc-iw") * 1e-6, G = num("lc-ig") * 1e-6, er = num("lc-ie");
  if (N >= 4 && Lf > 0 && W > 0 && G > 0 && er >= 1) {
    const r = idc(N, Lf, W, G, er);
    lcVals.idc = r.C;
    out("lc-ires", [["Capacitance (Igreja–Dias)", `<b>${fmt(r.C * 1e15, 4)}${NB}fF</b>`], ["Alley/Bahl closed form (assumes W = G)", `${fmt(r.alley * 1e15, 4)}${NB}fF`], ["Metallisation ratio η = W/(W+G)", fmt(r.eta, 3)], ["Footprint", `${fmt(N * (W + G) * 1e6, 4)} × ${fmt(Lf * 1e6, 4)}${NB}µm`]]);
  } else { lcVals.idc = NaN; out("lc-ires", [["", `<span class="err">Need N ≥ 4 fingers and positive sizes, ε<sub>r</sub> ≥ 1.</span>`]]); }
  // parallel plate
  const pw = num("lc-pw") * 1e-6, pl = num("lc-pl") * 1e-6, d = num("lc-pt") * 1e-9, pe = num("lc-pe");
  if (pw > 0 && pl > 0 && d > 0 && pe >= 1) {
    const C = EPS0 * pe * pw * pl / d;
    lcVals.pp = C;
    out("lc-pres", [["Capacitance ε<sub>0</sub>ε<sub>r</sub>A/d", `<b>${fmt(C * 1e15, 4)}${NB}fF</b>`], ["Per area", `${fmt(EPS0 * pe / d * 1e15 * 1e-12, 4)}${NB}fF/µm²`]]);
  } else { lcVals.pp = NaN; out("lc-pres", [["", `<span class="err">Enter positive sizes and ε<sub>r</sub> ≥ 1.</span>`]]); }
  // meander
  const mN = Math.round(num("lc-mn")), ml = num("lc-ml") * 1e-6, mw = num("lc-mw") * 1e-6, mp = num("lc-mp") * 1e-6, mt = num("lc-mt") * 1e-9, mLs = num("lc-mls") * 1e-12;
  if (mN >= 1 && ml > 0 && mw > 0 && mp > mw && mt >= 0 && mLs >= 0) {
    const r = meander(mN, ml, mw, mp, mt), Lk = mLs * r.sq;
    lcVals.mea = r.L + Lk;
    out("lc-mres", [["Geometric inductance", `${fmt(r.L * 1e9, 4)}${NB}nH`], ["Kinetic inductance L<sub>s</sub> × squares", `${fmt(Lk * 1e9, 4)}${NB}nH`], ["Total", `<b>${fmt((r.L + Lk) * 1e9, 4)}${NB}nH</b>`], ["Wire length / squares", `${fmt(r.len * 1e6, 4)}${NB}µm / ${fmt(r.sq, 4)}`]]);
  } else { lcVals.mea = NaN; out("lc-mres", [["", `<span class="err">Need N ≥ 1, positive sizes and pitch larger than the width.</span>`]]); }
  // spiral
  const sn = num("lc-sn"), sd = num("lc-sd") * 1e-6, sw = num("lc-sw") * 1e-6, ss = num("lc-ss") * 1e-6, sLs = num("lc-sls") * 1e-12;
  const sp = sn >= 1 && sd > 0 && sw > 0 && ss >= 0 ? spiral(sn, sd, sw, ss) : { err: true };
  if (!sp.err && sLs >= 0) {
    const Lk = sLs * sp.sq;
    lcVals.spi = sp.sheet + Lk;
    out("lc-sres", [["Current-sheet formula", `<b>${fmt(sp.sheet * 1e9, 4)}${NB}nH</b>`], ["Modified Wheeler formula", `${fmt(sp.wheeler * 1e9, 4)}${NB}nH`], ["Kinetic inductance (approx.)", `${fmt(Lk * 1e9, 4)}${NB}nH`], ["Total (current sheet + kinetic)", `${fmt((sp.sheet + Lk) * 1e9, 4)}${NB}nH`], ["Inner size d<sub>in</sub>, fill ratio ρ", `${fmt(sp.din * 1e6, 4)}${NB}µm, ${fmt(sp.rho, 3)}`]]);
  } else { lcVals.spi = NaN; out("lc-sres", [["", `<span class="err">${isFinite(sp.din) ? "The turns do not fit: inner size " + fmt(sp.din * 1e6, 3) + " µm." : "Enter positive sizes."}</span>`]]); }
  // resonance
  const Lsel = $("lc-rl").value, Csel = $("lc-rc").value;
  showIf("lc-rlc-f", Lsel === "custom"); showIf("lc-rcc-f", Csel === "custom");
  const L = Lsel === "custom" ? num("lc-rlc") * 1e-9 : lcVals[Lsel], C = Csel === "custom" ? num("lc-rcc") * 1e-15 : lcVals[Csel];
  if (L > 0 && C > 0) {
    const f = 1 / (TAU * Math.sqrt(L * C));
    $("lc-big").innerHTML = `${fmtFixed(f / 1e9, 5)}<span class="u">GHz</span>`;
    out("lc-rres", [["L", `${fmt(L * 1e9, 4)}${NB}nH`], ["C", `${fmt(C * 1e15, 4)}${NB}fF`], ["Characteristic impedance √(L/C)", `${fmt(Math.sqrt(L / C), 4)}${NB}Ω`]]);
  } else { $("lc-big").innerHTML = "—"; out("lc-rres", [["", `<span class="err">Fix the selected inductor or capacitor inputs.</span>`]]); }
  updatePeek();
}

/* ---------------------------------------------------------------- dimension diagrams */
// The dimension that belongs to the focused input lights up; clicking a dimension focuses its input.
function hlDims(id) {
  document.querySelectorAll("svg.dia [data-for]").forEach(g => g.classList.toggle("hl", !!id && g.dataset.for.split(" ").includes(id)));
}
document.addEventListener("focusin", e => hlDims(e.target.id));
document.addEventListener("focusout", () => hlDims(null));
document.querySelectorAll("svg.dia [data-for]").forEach(g => g.addEventListener("click", () => {
  const id = g.dataset.for.split(" ").find(i => $(i) && !$(i).disabled && $(i).offsetParent !== null);
  if (id) $(id).focus();
}));
// quarter-wave: shorted end; half-wave: open end
const resEnd = () => { $("res-dia-short").classList.toggle("hide", resType !== 4); $("res-dia-open").classList.toggle("hide", resType === 4); };
document.querySelectorAll("#res-type button").forEach(b => b.addEventListener("click", () => setTimeout(resEnd)));
resEnd();

/* ---------------------------------------------------------------- wiring */
initFit(); initTransmon(); initJJ(); initPhoton(); initSC(); initLC();
runFit(); renderTransmon(); renderJJ(); renderPhoton(); renderSC(); renderLC();
// redraw plots when their tab becomes visible
document.querySelectorAll("#tabs button").forEach(b => b.addEventListener("click", () => setTimeout(() => redraw.forEach(f => f()), 30)));
window.addEventListener("hashchange", () => setTimeout(() => redraw.forEach(f => f()), 30));
setTimeout(() => redraw.forEach(f => f()), 60);
// phone result bar
Object.assign(PEEK, { fit: ["fit-big", "f₀"], tr: ["tr-big", "f₀₁"], ph: ["ph-big", "n̄"], sc: ["sc-big", "Δ₀"], lumped: ["lc-big", "LC resonance"] });
[["fit-big", "fit-out"], ["tr-big", "tr-out"], ["jj-big", "jj-out"], ["ph-big", "ph-out"], ["sc-big", "sc-out"], ["lc-big", "lumped-out"]].forEach(([b, id]) => {
  const card = $(b).closest(".card"); card.id = id; peekObs.observe(card);
});
Object.defineProperty(PEEK, "jj", { get: () => ["jj-big", $("jj-bigcap").textContent], configurable: true, enumerable: true });
updatePeek();

})();
