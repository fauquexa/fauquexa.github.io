/* Shared extras for the playground scenes.
   1. Cinema mode goes fullscreen: whenever a page puts the "cinema" class on <body>, the page asks
      for fullscreen, and leaving cinema (or leaving fullscreen) ends both.
   2. Calm background music, generated live with the Web Audio API (no recordings, so nothing to
      license), with a small speaker button in the lower right to mute it. Pick a mood with
      <script src="../assets/ambient.js" data-mood="cats|fish|chickens|drive">; without data-mood only
      the fullscreen part runs. */
(function () {
  const me = document.currentScript;
  const mood = me && me.dataset.mood;
  const onReady = (fn) => (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn());

  // ------------------------------------------------------------ fullscreen with cinema mode
  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function enterFs() {
    const el = document.documentElement;
    try {
      const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: "hide" }) : el.webkitRequestFullscreen && el.webkitRequestFullscreen();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* not allowed here (e.g. iPhone): cinema still works without it */ }
  }
  function exitFs() {
    try {
      const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen && document.webkitExitFullscreen();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { }
  }
  onReady(() => {
    let was = document.body.classList.contains("cinema");
    new MutationObserver(() => {
      const on = document.body.classList.contains("cinema");
      if (on === was) return;
      was = on;
      if (on) { if (!fsElement()) enterFs(); }
      else if (fsElement()) exitFs();
    }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    const fsChange = () => {
      if (!fsElement() && document.body.classList.contains("cinema") && typeof window.setCinema === "function") window.setCinema(false);
    };
    document.addEventListener("fullscreenchange", fsChange);
    document.addEventListener("webkitfullscreenchange", fsChange);
    if (mood) setupMusic(mood);
  });

  // ------------------------------------------------------------ music
  // chords are semitone offsets from the root; the melody wanders over a pentatonic scale
  const MOODS = {
    cats: {        // warm, a little lo-fi: soft electric-piano notes over major-seventh pads
      bpm: 68, root: 48, bars: 2, swing: 0.08,
      chords: [[5, 9, 12, 16], [4, 7, 11, 14], [2, 5, 9, 12], [0, 4, 7, 11]],
      scale: [0, 2, 4, 7, 9], mel: { oct: 24, wave: "epiano", decay: 1.6, gain: 0.075, p: 0.42, off: 0.14 },
      pad: { wave: "triangle", gain: 0.03 }, bass: 0.1, cutoff: 1500, wet: 0.32,
    },
    fish: {        // slow and floaty: glassy bells over a deep pad, with the odd bubble
      bpm: 50, root: 50, bars: 2, swing: 0,
      chords: [[0, 4, 7, 11], [2, 6, 9, 13], [-3, 0, 4, 7], [5, 9, 12, 16]],
      scale: [0, 2, 4, 7, 9], mel: { oct: 24, wave: "bell", decay: 2.8, gain: 0.06, p: 0.26, off: 0 },
      pad: { wave: "sine", gain: 0.04 }, bass: 0.09, cutoff: 1100, wet: 0.5, bubbles: true,
    },
    chickens: {    // a sunny back garden: plucked notes and a soft flute over simple folk chords
      bpm: 84, root: 55, bars: 2, swing: 0.1,
      chords: [[0, 4, 7, 12], [5, 9, 12, 17], [7, 11, 14, 19], [-3, 4, 9, 12]],
      scale: [0, 2, 4, 7, 9], mel: { oct: 12, wave: "pluck", decay: 0.9, gain: 0.08, p: 0.5, off: 0.2 },
      pad: { wave: "triangle", gain: 0.022 }, bass: 0.09, cutoff: 2200, wet: 0.24, flute: true,
    },
    drive: {       // night-drive synthwave: four-on-the-floor drums, a pulsing octave bass, a running arpeggio
      bpm: 112, root: 45, bars: 1, swing: 0,
      chords: [[0, 3, 7, 12], [-4, 0, 3, 8], [3, 7, 10, 15], [-2, 2, 5, 10]],   // Am, F, C, G
      scale: [0, 3, 5, 7, 10], mel: { oct: 24, wave: "lead", decay: 0.5, gain: 0.05, p: 0.22, off: 0.1 },
      pad: { wave: "sawtooth", gain: 0.011 }, bass: 0, cutoff: 4200, wet: 0.2, drums: true,
    },
  };

  function setupMusic(name) {
    const M = MOODS[name] || MOODS.cats;
    const KEY = "playground-music", VKEY = "playground-volume";
    let level = 50;   // 0-100 on the slider; 50 is the default loudness
    try { const l = parseInt(localStorage.getItem(VKEY), 10); if (l >= 0 && l <= 100) level = l; } catch (e) { }
    const gain = () => level / 100 * 0.8;
    let muted = false;
    muted = true;   // off until the visitor turns it on with the speaker; their choice is remembered
    try { const v = localStorage.getItem(KEY); if (v) muted = v !== "on"; } catch (e) { }

    // ---- the speaker button
    const css = document.createElement("style");
    css.textContent =
      "#musicCtl{position:fixed;right:16px;bottom:16px;z-index:12;display:flex;flex-direction:column-reverse;align-items:center;gap:8px}" +
      "body.cinema #musicCtl{display:none}" +
      "#musicVol{position:relative;width:40px;height:140px;border-radius:20px;background:rgba(24,25,28,.82);border:1px solid rgba(255,255,255,.14);" +
      "box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .18s,transform .18s}" +
      "#musicCtl:hover #musicVol,#musicCtl:focus-within #musicVol{opacity:1;transform:none;pointer-events:auto}" +
      "#musicCtl.muted:not(:focus-within) #musicVol{opacity:0;transform:translateY(8px);pointer-events:none}" +
      "#musicVol input{position:absolute;left:50%;top:50%;width:112px;margin:0;transform:translate(-50%,-50%) rotate(-90deg);accent-color:#8fb4ec;cursor:pointer}" +
      "#musicBtn{width:40px;height:40px;padding:0;border-radius:50%;flex:none;" +
      "display:grid;place-items:center;background:rgba(24,25,28,.82);border:1px solid rgba(255,255,255,.14);color:#ececea;cursor:pointer;" +
      "box-shadow:0 4px 14px rgba(0,0,0,.25);transition:background .15s,opacity .2s}" +
      "#musicBtn:hover{background:rgba(44,46,52,.92)}#musicBtn svg{width:20px;height:20px;display:block}" +
      "#musicBtn.off{opacity:.75}" +
      "#musicBtn.waiting{animation:musicPulse 1.8s ease-in-out infinite}" +
      "@keyframes musicPulse{0%,100%{box-shadow:0 0 0 0 rgba(143,180,236,.55)}50%{box-shadow:0 0 0 8px rgba(143,180,236,0)}}";
    document.head.appendChild(css);
    const ctl = document.createElement("div"); ctl.id = "musicCtl";
    const btn = document.createElement("button");
    btn.id = "musicBtn"; btn.type = "button";
    const volBox = document.createElement("div"); volBox.id = "musicVol";
    const vol = document.createElement("input"); vol.type = "range"; vol.min = "0"; vol.max = "100"; vol.step = "1"; vol.value = String(level);
    vol.setAttribute("aria-label", "Volume");
    volBox.appendChild(vol); ctl.appendChild(btn); ctl.appendChild(volBox);
    document.body.appendChild(ctl);
    const ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18 6.5a7.6 7.6 0 0 1 0 11"/></svg>';
    const ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
    function paint() {
      btn.innerHTML = muted ? ICON_OFF : ICON_ON;
      btn.classList.toggle("off", muted);
      btn.title = muted ? "Sound off" : "Sound on";
      btn.setAttribute("aria-label", muted ? "Turn the sound on" : "Mute the sound");
      btn.setAttribute("aria-pressed", String(!muted));
      ctl.classList.toggle("muted", muted);
    }
    paint();

    // ---- audio graph
    let ctx = null, master = null, bus = null, sfx = null, timer = null, nextT = 0, step = 0, chord = 0, last = 2;
    const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
    function impulse(sec) {
      const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      return buf;
    }
    function build() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = M.cutoff; lp.Q.value = 0.4;
      const rev = ctx.createConvolver(); rev.buffer = impulse(3.2);
      const wet = ctx.createGain(); wet.gain.value = M.wet;
      const dry = ctx.createGain(); dry.gain.value = 1 - M.wet * 0.5;
      bus = ctx.createGain();
      bus.connect(lp); lp.connect(dry); lp.connect(rev); rev.connect(wet);
      dry.connect(comp); wet.connect(comp); comp.connect(master); master.connect(ctx.destination);
      // sound effects skip the music's filter and get a touch of room
      sfx = ctx.createGain(); sfx.gain.value = 1.6;
      const sWet = ctx.createGain(); sWet.gain.value = 0.12;
      sfx.connect(comp); sfx.connect(rev); rev.connect(sWet); sWet.connect(comp);
      nextT = ctx.currentTime + 0.15;
      timer = setInterval(schedule, 120);
    }
    function env(g, t, a, peak, hold, rel) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.setValueAtTime(peak, t + a + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
    }
    function osc(type, f, t, end, dest, detune = 0) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
      o.connect(dest); o.start(t); o.stop(end); return o;
    }
    function pad(notes, t, dur) {
      for (const n of notes) {
        const g = ctx.createGain(); g.connect(bus);
        env(g, t, 1.8, M.pad.gain, Math.max(0.1, dur - 1.8), 2.4);
        const end = t + dur + 2.6;
        osc(M.pad.wave, midi(M.root + 12 + n), t, end, g, -6);
        osc(M.pad.wave, midi(M.root + 12 + n), t, end, g, 6);
      }
      if (!M.bass) return;
      const gb = ctx.createGain(); gb.connect(bus);
      env(gb, t, 0.6, M.bass, Math.max(0.1, dur - 0.6), 1.6);
      osc("sine", midi(M.root - 12 + notes[0]), t, t + dur + 1.8, gb);
    }
    function note(n, t) {
      const f = midi(M.root + M.mel.oct + n), d = M.mel.decay, w = M.mel.wave, g = ctx.createGain(); g.connect(bus);
      if (w === "epiano") {        // sine plus a quieter octave: a soft Rhodes-like tone
        env(g, t, 0.012, M.mel.gain, 0.02, d);
        osc("sine", f, t, t + d + 0.1, g);
        const g2 = ctx.createGain(); g2.gain.value = 0.25; g2.connect(g); osc("sine", f * 2, t, t + d * 0.5, g2);
      } else if (w === "bell") {   // a slightly inharmonic partial gives a glassy bell
        env(g, t, 0.01, M.mel.gain, 0, d);
        osc("sine", f, t, t + d + 0.1, g);
        const g2 = ctx.createGain(); g2.gain.value = 0.18; g2.connect(g); osc("sine", f * 2.76, t, t + d * 0.4, g2);
      } else if (w === "lead") {   // two detuned saws through a closing filter: a soft synth lead
        env(g, t, 0.01, M.mel.gain, 0.08, d);
        const f2 = ctx.createBiquadFilter(); f2.type = "lowpass"; f2.Q.value = 2;
        f2.frequency.setValueAtTime(2600, t); f2.frequency.exponentialRampToValueAtTime(700, t + d + 0.1);
        f2.connect(g); osc("sawtooth", f, t, t + d + 0.2, f2, -7); osc("sawtooth", f, t, t + d + 0.2, f2, 7);
      } else {                     // pluck: a bright attack that quickly mellows
        env(g, t, 0.006, M.mel.gain, 0, d);
        const f2 = ctx.createBiquadFilter(); f2.type = "lowpass"; f2.Q.value = 0.7;
        f2.frequency.setValueAtTime(3200, t); f2.frequency.exponentialRampToValueAtTime(500, t + d);
        f2.connect(g); osc("triangle", f, t, t + d + 0.1, f2);
      }
    }
    function flute(n, t, len) {     // breathy sine with a gentle vibrato, for the garden
      const g = ctx.createGain(); g.connect(bus);
      env(g, t, 0.25, 0.035, Math.max(0.05, len - 0.25), 0.6);
      const o = osc("sine", midi(M.root + 24 + n), t, t + len + 0.7, g);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5; lg.gain.value = 4;
      lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(t + len + 0.7);
    }
    function bubble(t) {
      const g = ctx.createGain(); g.connect(bus);
      env(g, t, 0.005, 0.03, 0, 0.12);
      const o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(320 + Math.random() * 200, t);
      o.frequency.exponentialRampToValueAtTime(900 + Math.random() * 700, t + 0.1);
      o.connect(g); o.start(t); o.stop(t + 0.2);
    }
    // racing extras: drums from a noise burst and a falling sine, an octave-bouncing bass, a 16th-note arpeggio
    let whiteBuf = null, drumBus = null;
    function white() {
      if (!whiteBuf) {
        const len = ctx.sampleRate; whiteBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = whiteBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        drumBus = ctx.createGain(); drumBus.gain.value = 1; drumBus.connect(master);
      }
      const src = ctx.createBufferSource(); src.buffer = whiteBuf; return src;
    }
    function kick(t) {
      white(); const g = ctx.createGain(); g.connect(drumBus); env(g, t, 0.002, 0.32, 0.02, 0.28);
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      o.connect(g); o.start(t); o.stop(t + 0.4);
    }
    function snare(t) {
      const n = white(), bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1900; bp.Q.value = 0.7;
      const g = ctx.createGain(); env(g, t, 0.002, 0.13, 0.01, 0.17); n.connect(bp); bp.connect(g); g.connect(drumBus);
      const r = ctx.createGain(); r.gain.value = 0.25; g.connect(r); r.connect(bus);   // a little of it into the reverb
      n.start(t); n.stop(t + 0.3);
      const tg = ctx.createGain(); tg.connect(drumBus); env(tg, t, 0.002, 0.07, 0, 0.09); osc("triangle", 190, t, t + 0.15, tg);
    }
    function hat(t, open) {
      const n = white(), hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7500;
      const g = ctx.createGain(); env(g, t, 0.001, open ? 0.035 : 0.028, 0, open ? 0.16 : 0.04);
      n.connect(hp); hp.connect(g); g.connect(drumBus); n.start(t); n.stop(t + 0.25);
    }
    function bassNote(n, t, len) {
      const g = ctx.createGain(); g.connect(bus); env(g, t, 0.005, 0.085, len * 0.4, len * 0.5);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 3;
      lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(220, t + len);
      lp.connect(g); osc("sawtooth", midi(M.root - 12 + n), t, t + len + 0.05, lp);
    }
    function arpNote(n, t) {
      const g = ctx.createGain(); g.connect(bus); env(g, t, 0.003, 0.03, 0, 0.16);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; lp.connect(g);
      osc("square", midi(M.root + 12 + n), t, t + 0.2, lp);
    }
    function racing(t, beat, inBar, bar) {
      const cur = M.chords[(chord - 1 + M.chords.length) % M.chords.length], intro = bar < 2;
      if (!intro || inBar === 0) kick(t);
      if (!intro && (inBar === 1 || inBar === 3)) snare(t);
      for (let k = 0; k < 2; k++) if (!intro) hat(t + k * beat / 2, k === 1 && inBar === 3);
      for (let k = 0; k < 2; k++) bassNote(cur[0] + (k ? 12 : 0), t + k * beat / 2, beat / 2 * 0.9);
      if (bar >= 4) { const order = [0, 1, 2, 3, 2, 1]; for (let k = 0; k < 4; k++) { const q = (inBar * 4 + k) % order.length; arpNote(cur[order[q]] + (q > 3 ? 12 : 0), t + k * beat / 4); } }
    }
    const pick = () => {             // a gentle random walk over the scale, mostly steps
      last = Math.max(0, Math.min(9, last + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      const s = M.scale, o = Math.floor(last / s.length);
      return s[last % s.length] + 12 * o;
    };
    function schedule() {
      if (!ctx) return;
      const beat = 60 / M.bpm, barBeats = 4;
      while (nextT < ctx.currentTime + 0.8) {
        const t = nextT, inBar = step % barBeats;
        if (step % (barBeats * M.bars) === 0) {
          pad(M.chords[chord % M.chords.length], t, beat * barBeats * M.bars);
          chord++;
        }
        if ((!M.drums || step >= 32) && Math.random() < M.mel.p) note(pick(), t + (inBar % 2 ? M.swing * beat : 0));
        if ((!M.drums || step >= 32) && M.mel.off && Math.random() < M.mel.off) note(pick(), t + beat * (0.5 + M.swing));
        if (M.flute && inBar === 0 && Math.random() < 0.18) flute(pick(), t, beat * 2);
        if (M.bubbles && Math.random() < 0.12) bubble(t + Math.random() * beat);
        if (M.drums) racing(t, beat, inBar, Math.floor(step / barBeats));
        nextT += beat; step++;
      }
    }
    function fadeTo(v, sec) {
      if (!ctx) return;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(v, now + sec);
    }
    function play() {
      if (!ctx) build();
      if (ctx.state === "suspended") ctx.resume();
      fadeTo(gain(), 6);   // a slow fade in
    }
    function stop() {
      if (!ctx) return;
      fadeTo(0, 0.6);
      setTimeout(() => { if (muted && ctx.state === "running") ctx.suspend(); }, 700);
    }

    // Start right away. Browsers allow that when the visitor already clicked on this site (say, a
    // tile on the homepage); otherwise the sound waits for the first click or key press, and the
    // speaker gently pulses in the meantime.
    let armed = false;
    const GESTURES = ["pointerdown", "keydown", "touchstart"];
    const firstGesture = () => {
      if (armed) return; armed = true;
      GESTURES.forEach((e) => removeEventListener(e, firstGesture, true));
      btn.classList.remove("waiting");
      if (!muted) play();
    };
    GESTURES.forEach((e) => addEventListener(e, firstGesture, true));
    if (!muted) {
      try { play(); } catch (e) { }
      setTimeout(() => {
        if (ctx && ctx.state === "running") { armed = true; GESTURES.forEach((e) => removeEventListener(e, firstGesture, true)); }
        else if (!armed) { btn.classList.add("waiting"); btn.title = "Click anywhere for sound"; }
      }, 400);
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      armed = true;
      muted = !muted;
      if (!muted && level === 0) { level = 50; vol.value = "50"; }
      try { localStorage.setItem(KEY, muted ? "off" : "on"); localStorage.setItem(VKEY, String(level)); } catch (err) { }
      paint();
      if (muted) stop(); else play();
      btn.blur();
    });
    btn.addEventListener("pointerdown", (e) => e.stopPropagation());   // don't feed the fish when muting
    volBox.addEventListener("pointerdown", (e) => e.stopPropagation());
    volBox.addEventListener("click", (e) => e.stopPropagation());
    vol.addEventListener("keydown", (e) => e.stopPropagation());       // arrow keys move the slider, not the camera
    // the volume slider: shows on hover while the sound is on; all the way down mutes
    vol.addEventListener("input", () => {
      armed = true;
      level = parseInt(vol.value, 10) || 0;
      try { localStorage.setItem(VKEY, String(level)); } catch (err) { }
      if (level === 0) {
        if (!muted) { muted = true; try { localStorage.setItem(KEY, "off"); } catch (err) { } paint(); stop(); }
      } else if (muted) {
        muted = false; try { localStorage.setItem(KEY, "on"); } catch (err) { } paint(); play(); fadeTo(gain(), 0.4);
      } else fadeTo(gain(), 0.12);
    });

    // ---- little cat sounds, also generated: a soft purr and a sweet "miu"
    let noiseBuf = null;
    const live = () => ctx && sfx && !muted && ctx.state === "running";
    function noise() {
      if (!noiseBuf) {
        const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0); let b = 0;
        for (let i = 0; i < len; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 6; }   // brown-ish rumble
      }
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s;
    }
    const purrs = new Map();
    function makePurr(rate) {
      const src = noise(), bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 130; bp.Q.value = 1.1;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
      const am = ctx.createGain(); am.gain.value = 0.55;                   // the ~25 Hz flutter of a purr
      const lfo = ctx.createOscillator(); lfo.type = "triangle"; lfo.frequency.value = rate;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.45; lfo.connect(lfoG); lfoG.connect(am.gain);
      const breath = ctx.createGain(); breath.gain.value = 0.7;             // in and out, about every 2 s
      const bl = ctx.createOscillator(); bl.frequency.value = 0.45 + Math.random() * 0.1;
      const blG = ctx.createGain(); blG.gain.value = 0.3; bl.connect(blG); blG.connect(breath.gain);
      const level = ctx.createGain(); level.gain.value = 0;
      src.connect(bp); bp.connect(lp); lp.connect(am); am.connect(breath); breath.connect(level); level.connect(sfx);
      const t = ctx.currentTime; src.start(t, Math.random() * 1.5); lfo.start(t); bl.start(t);
      return { level, stop() { const n = ctx.currentTime; try { src.stop(n + 0.1); lfo.stop(n + 0.1); bl.stop(n + 0.1); } catch (e) { } } };
    }
    // level 0..1; call every frame or so for each cat (key), it fades smoothly
    function purr(key, lvl, rate = 25) {
      if (!ctx || !sfx) return;
      let p = purrs.get(key);
      if (!p) { if (!(lvl > 0.01) || !live()) return; p = makePurr(rate); purrs.set(key, p); }
      const v = live() ? Math.max(0, Math.min(1, lvl)) * 0.05 : 0;
      p.level.gain.setTargetAtTime(v, ctx.currentTime, 0.4);
      if (v === 0) { p.idle = (p.idle || 0) + 1; if (p.idle > 400) { p.stop(); purrs.delete(key); } } else p.idle = 0;
    }
    // a soft "miu": a little glide in pitch while the vowel moves from "i" to "u"
    function meow(lvl = 0.6, pitch = 1) {
      if (!live() || !(lvl > 0.02)) return;
      const t = ctx.currentTime + 0.02, len = 0.32 + Math.random() * 0.14;
      const o = ctx.createOscillator(); o.type = "sawtooth";
      const f0 = (560 + Math.random() * 80) * pitch;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.linearRampToValueAtTime(f0 * 1.28, t + len * 0.38);
      o.frequency.linearRampToValueAtTime(f0 * 0.92, t + len);
      const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 6; vg.gain.value = 9;
      vib.connect(vg); vg.connect(o.detune);
      const f1 = ctx.createBiquadFilter(); f1.type = "bandpass"; f1.Q.value = 5;
      f1.frequency.setValueAtTime(380, t); f1.frequency.linearRampToValueAtTime(330, t + len);
      const f2 = ctx.createBiquadFilter(); f2.type = "bandpass"; f2.Q.value = 7;
      f2.frequency.setValueAtTime(2400, t); f2.frequency.exponentialRampToValueAtTime(950, t + len);
      const g2 = ctx.createGain(); g2.gain.value = 0.55;
      const nasal = ctx.createBiquadFilter(); nasal.type = "lowpass";       // the closed "m" opening up
      nasal.frequency.setValueAtTime(350, t); nasal.frequency.exponentialRampToValueAtTime(4200, t + 0.07);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      const peak = 0.11 * Math.max(0, Math.min(1, lvl));
      g.gain.exponentialRampToValueAtTime(peak, t + 0.05);
      g.gain.setValueAtTime(peak, t + len * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.12);
      o.connect(nasal); nasal.connect(f1); nasal.connect(f2); f2.connect(g2); f1.connect(g); g2.connect(g); g.connect(sfx);
      o.start(t); vib.start(t); o.stop(t + len + 0.2); vib.stop(t + len + 0.2);
    }
    window.playgroundSound = { purr, meow, get on() { return live(); } };

    window.playgroundMusic = { get state() { return ctx ? ctx.state : "not started"; }, get muted() { return muted; }, get notes() { return step; } };

    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend();
      else if (!muted) { ctx.resume(); nextT = Math.max(nextT, ctx.currentTime + 0.1); }
    });
  }
})();
