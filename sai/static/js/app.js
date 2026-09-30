/* ==========================================================================
   AEGIS-QR · Interaction Layer
   --------------------------------------------------------------------------
   1. Particle network background     4. Reveal on scroll
   2. Scroll spy (nav)                5. Animated counters
   3. Mobile nav / sidebar            6. QR threat console simulation
                                        7. Misc (OTP, copy, bars, gauges)
   ========================================================================== */
(function () {
  "use strict";

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1 · PARTICLE NETWORK ---------------------------------- */
  function initParticles() {
    const cv = $("#fx-canvas");
    if (!cv || reduceMotion) return;

    const ctx = cv.getContext("2d");
    let w = 0, h = 0, dpr = 1, pts = [], raf = null, mouse = { x: -999, y: -999 };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      const count = Math.min(88, Math.round((w * h) / 20000));
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.6 + 0.7
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // proximity to cursor adds a brighter link
        const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        const near = dm < 150;

        ctx.beginPath();
        ctx.arc(p.x, p.y, near ? p.r * 1.7 : p.r, 0, Math.PI * 2);
        ctx.fillStyle = near ? "rgba(34,211,238,.95)" : "rgba(125,211,252,.5)";
        ctx.fill();

        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 118) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = "rgba(125,211,252," + (0.15 * (1 - d / 118)).toFixed(3) + ")";
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }

    function start() { if (!raf) raf = requestAnimationFrame(draw); }
    function stop()  { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });
    window.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });
    document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());

    resize();
    start();
  }

  /* ---------- 2 · SCROLL SPY ---------------------------------------- */
  function initScrollSpy() {
    const links = $$('[data-spy]');
    if (!links.length) return;
    const map = new Map();
    links.forEach((l) => {
      const el = document.getElementById(l.dataset.spy);
      if (el) map.set(el, l);
    });
    if (!map.size) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.remove("active"));
        const active = map.get(en.target);
        if (active) active.classList.add("active");
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

    map.forEach((_, el) => obs.observe(el));
  }

  /* ---------- 3 · MOBILE NAV / SIDEBAR ----------------------------- */
  function initToggles() {
    const navBtn = $("[data-nav-toggle]");
    const navMenu = $("[data-nav-menu]");
    if (navBtn && navMenu) {
      navBtn.addEventListener("click", () => {
        const open = navMenu.classList.toggle("open");
        navBtn.setAttribute("aria-expanded", String(open));
      });
      navMenu.addEventListener("click", (e) => {
        if (e.target.closest("a")) {
          navMenu.classList.remove("open");
          navBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    const side = $("[data-side]");
    const scrim = $("[data-scrim]");
    const trigger = $("[data-side-trigger]");
    if (side && scrim && trigger) {
      const close = () => {
        side.classList.remove("open");
        scrim.classList.remove("on");
      };
      trigger.addEventListener("click", () => {
        side.classList.add("open");
        scrim.classList.add("on");
      });
      scrim.addEventListener("click", close);
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    }
  }

  /* ---------- 4 · REVEAL ON SCROLL --------------------------------- */
  function initReveal() {
    const items = $$(".reveal");
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((i) => i.classList.add("in"));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const d = parseInt(en.target.dataset.delay || "0", 10);
        setTimeout(() => en.target.classList.add("in"), d);
        obs.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
    items.forEach((i) => obs.observe(i));
  }

  /* ---------- 5 · ANIMATED COUNTERS -------------------------------- */
  function initCounters() {
    const els = $$("[data-count]");
    if (!els.length) return;

    const run = (el) => {
      const target = parseFloat(el.dataset.count) || 0;
      const dec = parseInt(el.dataset.decimals || "0", 10);
      const suffix = el.dataset.suffix || "";
      const dur = 1500;
      const t0 = performance.now();

      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(run);
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        run(en.target);
        obs.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    els.forEach((e) => obs.observe(e));
  }

  /* ---------- 6a · CONFIDENCE BARS + GAUGES ------------------------ */
  function initBars() {
    const fill = () => {
      $$("[data-bar]").forEach((b) => {
        const v = b.dataset.bar;
        setTimeout(() => { b.style.width = v + "%"; }, 260);
      });
      $$("[data-gauge]").forEach((g) => {
        const v = Math.max(0, Math.min(100, parseFloat(g.dataset.gauge) || 0));
        // r=50 => circumference ≈ 314.16
        setTimeout(() => { g.style.strokeDashoffset = String(314 - (314 * v) / 100); }, 300);
      });
    };
    if (reduceMotion) { fill(); return; }
    const items = $$("[data-bar], [data-gauge]");
    if (!items.length) { return; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        fill();
        obs.disconnect();
      });
    }, { threshold: 0.3 });
    items.forEach((i) => obs.observe(i));
  }

  /* ---------- 6b · COPY TO CLIPBOARD ------------------------------- */
  function initCopy() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-copy]");
      if (!btn) return;
      const text = btn.dataset.copy;
      const done = (ok) => {
        const old = btn.dataset.label || btn.textContent.trim();
        btn.dataset.label = old;
        btn.textContent = ok ? "Copied" : "Failed";
        setTimeout(() => { btn.textContent = old; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch (_) {}
        document.body.removeChild(ta);
        done(ok);
      }
    });
  }

  /* ---------- 6c · OTP AUTO-FOCUS / PASTE -------------------------- */
  function initOtp() {
    const row = $("[data-otp]");
    if (!row) return;
    const inputs = $$("input", row);
    const hidden = $("[data-otp-hidden]");

    const sync = () => {
      if (hidden) hidden.value = inputs.map((i) => i.value).join("");
    };

    inputs.forEach((el, idx) => {
      el.addEventListener("input", () => {
        el.value = el.value.replace(/\D/g, "").slice(0, 1);
        if (el.value && idx < inputs.length - 1) inputs[idx + 1].focus();
        sync();
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !el.value && idx > 0) inputs[idx - 1].focus();
        if (e.key === "ArrowLeft"  && idx > 0) inputs[idx - 1].focus();
        if (e.key === "ArrowRight" && idx < inputs.length - 1) inputs[idx + 1].focus();
      });
      el.addEventListener("paste", (e) => {
        e.preventDefault();
        const digits = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
        if (!digits) return;
        inputs.forEach((inp, k) => { inp.value = digits[k] || ""; });
        const nxt = Math.min(digits.length, inputs.length - 1);
        inputs[nxt].focus();
        sync();
      });
    });
  }

  /* ---------- 7 · QR THREAT CONSOLE (simulated ensemble) ----------- */
  const SAMPLES = [
    { url: "https://www.paytm.com/secure-pay?ref=9f2a", label: "Known-good payment gateway" },
    { url: "http://192.168.44.13/upi/collect?am=5000", label: "Private IP + UPI collect" },
    { url: "https://sbi-kyc-verify-update.xyz/login", label: "Look-alike domain / credential lure" },
    { url: "https://bit.ly/3xQr9Scan", label: "URL shortener hiding destination" }
  ];

  const MODELS = [
    { key: "visual",  label: "Visual Forensics",  weight: 0.24 },
    { key: "payload", label: "Payload Analyzer",  weight: 0.22 },
    { key: "urlfeat", label: "URL Feature Net",  weight: 0.30 },
    { key: "intel",   label: "Threat Intel Link", weight: 0.24 }
  ];

  /* Heuristic-ish scoring so different inputs give different verdicts. */
  function scoreInput(url) {
    const u = (url || "").trim();
    if (!u) return null;
    const raw = u.toLowerCase();
    const hasScheme = /^https?:\/\//i.test(raw);
    const https = raw.startsWith("https://");
    const host = (raw.replace(/^https?:\/\//i, "").split(/[/?#]/)[0] || "").split("@").pop();
    const tld = (host.split(".").pop() || "");
    const path = raw.split(/[/?#]/).slice(1).join("/");
    const digits = (raw.match(/\d/g) || []).length;

    const badTld = ["xyz", "top", "tk", "ml", "ga", "cf", "gq", "zip", "mov", "click", "link", "work", "rest"];
    const shortener = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "cutt.ly", "rb.gy"];
    const isShort = shortener.some((s) => host.endsWith(s));
    const isPrivate = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(host);
    const kw = ["kyc", "verify", "update", "login", "otp", "bank", "upi", "suspend", "confirm", "account", "reward", "gift", "refund"];
    const hasKw = kw.filter((k) => raw.includes(k)).length;
    const looksBank = /(paytm|phonepe|gpay|sbi|hdfc|icici|axis|kotak|amazon|flipkart)/.test(host);
    const hyphens = (host.match(/-/g) || []).length;
    const subdomains = (host.match(/\./g) || []).length;
    const at = raw.indexOf("@");
    const puny = host.includes("xn--");

    // per-model confidence (0..1) that the sample is MALICIOUS
    const visual = Math.min(0.97, 0.30 + hyphens * 0.13 + (puny ? 0.3 : 0) + (subdomains >= 3 ? 0.14 : 0) + (badTld.includes(tld) ? 0.2 : 0));
    const payload = Math.min(0.98, hasKw * 0.17 + (raw.includes("javascript:") ? 0.6 : 0) + (/[<>]/.test(raw) ? 0.4 : 0) + (path.split("=").length > 2 ? 0.1 : 0));
    const urlfeat = Math.min(0.99, (!https ? 0.34 : 0.06) + (!hasScheme ? 0.2 : 0) + (isPrivate ? 0.42 : 0) + digits / Math.max(raw.length, 1) * 1.1 + hyphens * 0.05);
    const intel = Math.min(0.99, (isShort ? 0.55 : 0.04) + (badTld.includes(tld) ? 0.34 : 0) + (looksBank && hyphens >= 1 ? 0.45 : 0) + (hyphens >= 2 ? 0.2 : 0) + (at > 8 ? 0.4 : 0));

    /* ---- ADAPTIVE FUSION ----------------------------------------------
       0. calibrate : squash raw signals off the 0/1 rails
       1. gate      : drop experts below the confidence floor
       2. blend     : agreement-weighted softmax over the survivors
       3. noisy-OR  : a decisive expert must not be averaged away
       4. floor     : a near-certain single expert sets a risk minimum
    ------------------------------------------------------------------- */
    const FLOOR    = 0.20;   // experts under this are gated out
    const DECISIVE = 0.85;   // "near-certain" single expert

    // calibration curve: keeps a noisy model from saturating at 1.0
    const calibrate = (s) => 0.5 + 0.5 * Math.tanh((s - 0.5) * 2.2);

    const rawScores = { visual: visual, payload: payload, urlfeat: urlfeat, intel: intel };
    const scores = {};
    MODELS.forEach((m) => { scores[m.key] = calibrate(rawScores[m.key]); });

    const vals = MODELS.map((m) => scores[m.key]);
    const maxS = Math.max.apply(null, vals);
    const minS = Math.min.apply(null, vals);

    // agreement: how tightly the bank clusters (1 = unanimous)
    const agreement = 1 - (maxS - minS);

    const active = MODELS.filter((m) => scores[m.key] >= FLOOR);
    const gated = MODELS.length - active.length;

    // how far above the gate each survivor actually is, rescaled to 0..1
    const excess = (s) => Math.max(0, (s - FLOOR) / (1 - FLOOR));

    // agreement-weighted blend over survivors
    let blend = 0, wsum = 0;
    active.forEach((m) => {
      const w = m.weight * (0.35 + 0.65 * scores[m.key]);
      blend += scores[m.key] * w;
      wsum += w;
    });
    blend = wsum > 0 ? blend / wsum : 0;

    // noisy-OR over the survivors only, on gate-adjusted excess, so a bank of
    // quiet models cannot accumulate into a false alarm
    let notMalicious = 1;
    active.forEach((m) => { notMalicious *= (1 - Math.pow(excess(scores[m.key]), 1.3)); });
    const noisyOr = 1 - notMalicious;

    let riskF = 0.62 * blend + 0.38 * noisyOr;

    // a single near-certain expert cannot be diluted below this
    let floored = false;
    if (maxS >= DECISIVE) {
      const base = 0.40 + 0.45 * maxS;
      if (base > riskF) { riskF = base; floored = true; }
    }
    const decisiveKey = MODELS.reduce((a, m) => (scores[m.key] > scores[a.key] ? m : a)).key;

    const risk = Math.round(Math.max(0, Math.min(100, riskF * 100)));

    let level, verdict, advice;
    if (risk <= 24)      { level = "safe";     verdict = "Low Risk · Trusted";            advice = "All models agree the destination is well-formed and reputable. Proceed with normal precautions."; }
    else if (risk <= 49) { level = "low";      verdict = "Caution · Mild Signals";         advice = "Some models flag weak anomalies. Verify the domain on a second device before entering credentials."; }
    else if (risk <= 69) { level = "medium";   verdict = "Elevated Risk · Suspicious";      advice = "Multiple independent models agree on suspicious structure. Do not scan; report the code to your administrator."; }
    else if (risk <= 84) { level = "high";     verdict = "High Risk · Likely Malicious";   advice = "Strong phishing indicators detected. Quarantine the code and notify the security team immediately."; }
    else                 { level = "critical"; verdict = "Critical · Active Threat";        advice = "Confirmed hostile payload. Block the destination, preserve the evidence, and escalate for takedown."; }

    return {
      url: u, risk, level, verdict, advice,
      agreement: agreement, scores: scores, raw: rawScores,
      blend: blend, noisyOr: noisyOr, gated: gated, active: active.length,
      floored: floored, decisiveKey: decisiveKey,
      meta: { host, tld, https, isShort, isPrivate, hasKw, hasScheme }
    };
  }

  function renderModels(out) {
    const host = $("[data-model-out]");
    if (!host) return;
    host.innerHTML = MODELS.map((m) => {
      const pct = Math.round(out.scores[m.key] * 100);
      const cls = pct >= 70 ? "rose" : pct >= 45 ? "amber" : "green";
      return '' +
        '<div class="model-chip">' +
          '<div class="mc-top">' +
            '<div class="mc-ico">' + ICONS.chip + '</div>' +
            '<h5>' + m.label + '</h5>' +
          '</div>' +
          '<p>' + MODEL_DESC[m.key] + '</p>' +
          '<div class="mc-meta"><span>malicious signal</span><b>' + pct + '%</b></div>' +
          '<div class="bar ' + cls + '"><span style="width:' + pct + '%"></span></div>' +
        '</div>';
    }).join("");
  }

  const MODEL_DESC = {
    visual:  "CNN / ViT pass over the symbol — logo-swap, overlay tampering, quishing sticker artifacts.",
    payload: "Decodes the QR and runs grammar, obfuscation and keyword rules on the embedded content.",
    urlfeat: "XGBoost over 40+ lexical and structural URL features learned from phishing corpora.",
    intel:  "Cross-references domain age, WHOIS, blocklists and live threat-intel feeds."
  };

  const ICONS = {
    chip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>'
  };

  /* stable pseudo-hash so the console shows a realistic-looking evidence digest */
  function sha256ish(str) {
    const s = String(str);
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < s.length; i++) {
      h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 + s.charCodeAt(i) * (i + 7), 2654435761) >>> 0;
    }
    const hex = (n, len) => n.toString(16).padStart(len, "0");
    let out = "";
    for (let i = 0; i < 4; i++) {
      h1 = (Math.imul(h1 ^ (h2 >>> 13), 2246822519) + i) >>> 0;
      h2 = (Math.imul(h2 ^ (h1 << 7), 3266489917) + i * 31) >>> 0;
      out += hex(h1, 8);
    }
    return out.slice(0, 32) + "…" + out.slice(32, 48);
  }

  /* deterministic pseudo-QR matrix, reused for the console scanner visual */
  function paintScanner() {
    const host = $("#scannerCode");
    if (!host) return;
    const N = 17;
    const finder = (r, c, tr, tc) => {
      if (r < tr || r > tr + 4 || c < tc || c > tc + 4) return null;
      const dr = r - tr, dc = c - tc;
      if (dr === 0 || dr === 4 || dc === 0 || dc === 4) return true;
      if (dr >= 1 && dr <= 3 && dc >= 1 && dc <= 3) return dr === 2 && dc === 2;
      return false;
    };
    const inZone = (r, c) =>
      finder(r, c, 0, 0) !== null || finder(r, c, 0, N - 5) !== null || finder(r, c, N - 5, 0) !== null;

    let s = 20260930;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

    let html = "";
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        let on;
        if (inZone(r, c)) {
          on = finder(r, c, 0, 0) || finder(r, c, 0, N - 5) || finder(r, c, N - 5, 0);
        } else {
          on = rnd() < 0.48;
        }
        html += on ? "<span></span>" : '<span class="off"></span>';
      }
    }
    host.innerHTML = html;
  }

  function initConsole() {
    const form = $("[data-console-form]");
    if (!form) return;

    paintScanner();

    const input    = $("[data-console-input]", form);
    const gauge    = $("[data-console-gauge]");
    const gaugeVal = $("[data-console-gauge-val]");
    const verdictEl= $("[data-console-verdict]");
    const chips    = $("[data-console-chips]");
    const scanLog  = $("[data-scanlog]");
    const riskHud  = $("#scannerRisk");

    const f = {
      scheme: $("#fScheme"), host: $("#fHost"), tld: $("#fTld"),
      kw: $("#fKw"), short: $("#fShort"), private: $("#fPrivate"),
      agree: $("#fAgree"), hash: $("#fHash"),
      active: $("#fActive"), gated: $("#fGated"), blend: $("#fBlend"),
      noisy: $("#fNoisy"), floor: $("#fFloor")
    };

    const yn = (b) => (b
      ? '<span style="color:var(--rose);font-weight:600">yes</span>'
      : '<span style="color:var(--muted)">no</span>');

    if (chips) {
      chips.innerHTML = SAMPLES.map((s, i) =>
        '<button type="button" class="badge badge-violet" style="cursor:pointer" data-sample="' + i + '">' + s.label + "</button>"
      ).join("");
      chips.addEventListener("click", (e) => {
        const b = e.target.closest("[data-sample]");
        if (!b) return;
        input.value = SAMPLES[+b.dataset.sample].url;
        run();
      });
    }

    function log(text, kind) {
      if (!scanLog) return;
      const row = document.createElement("div");
      row.style.cssText = "display:flex;gap:.6rem;align-items:flex-start;padding:.42rem 0;border-top:1px solid rgba(255,255,255,.05);font-size:.8rem;color:var(--text-soft);";
      const dot = document.createElement("span");
      dot.style.cssText = "width:6px;height:6px;border-radius:50%;flex:none;margin-top:.45rem;background:" +
        (kind === "warn" ? "var(--amber)" : kind === "err" ? "var(--rose)" : kind === "ok" ? "var(--emerald)" : "var(--cyan)") + ";";
      const tx = document.createElement("span");
      tx.textContent = text;
      row.append(dot, tx);
      scanLog.prepend(row);
      while (scanLog.children.length > 7) scanLog.lastElementChild.remove();
    }

    function run() {
      const res = scoreInput(input.value);
      if (!res) {
        log("Empty payload — waiting for a QR destination or URL.", "warn");
        return;
      }

      const models = $("[data-model-out]");
      if (models) { models.style.opacity = ".4"; models.style.pointerEvents = "none"; }
      log("Decoding symbol and dispatching to 4-model bank…");

      const steps = [
        [280,  "QR payload decoded · " + (res.meta.host || "unknown host")],
        [620,  "Visual Forensics → " + Math.round(res.scores.visual * 100) + "% malicious signal"],
        [900,  "Payload Analyzer → " + Math.round(res.scores.payload * 100) + "% malicious signal"],
        [1180, "URL Feature Net → " + Math.round(res.scores.urlfeat * 100) + "% malicious signal"],
        [1460, "Threat Intel Link → " + Math.round(res.scores.intel * 100) + "% malicious signal"],
        [1740, "Adaptive fusion · model agreement " + Math.round(res.agreement * 100) + "%"],
        [2020, "Verdict issued → " + res.verdict + " (risk " + res.risk + "/100)"]
      ];

      steps.forEach(([t, txt]) => setTimeout(() => {
        const kind = /Verdict/.test(txt) ? (res.risk >= 70 ? "err" : res.risk >= 45 ? "warn" : "ok") : "info";
        log(txt, kind);
      }, t));

      setTimeout(() => {
        renderModels(res);

        if (gauge) {
          gauge.className = "gauge " + res.level;
          gauge.style.strokeDashoffset = "314";
          // force reflow so the transition replays
          void gauge.getBoundingClientRect();
          gauge.style.strokeDashoffset = String(314 - (314 * res.risk) / 100);
        }
        if (gaugeVal) gaugeVal.textContent = String(res.risk);

        if (riskHud) {
          riskHud.className = "qr-hud h4" + (res.risk >= 70 ? " alert" : "");
          riskHud.innerHTML = '<span class="led"></span>RISK&#8202;' + res.risk;
        }

        if (verdictEl) {
          verdictEl.className = "verdict " + res.level;
          const badge = $(".badge", verdictEl);
          const h = $("[data-verdict-title]", verdictEl);
          const p = $("[data-verdict-advice]", verdictEl);
          if (badge) {
            badge.className = "badge badge-" +
              (res.risk >= 85 ? "rose" : res.risk >= 70 ? "rose" : res.risk >= 45 ? "amber" : "green");
            badge.style.marginBottom = ".6rem";
            badge.textContent = "fused verdict · " + Math.round(res.agreement * 100) + "% agreement";
          }
          if (h) h.textContent = res.verdict;
          if (p) p.textContent = res.advice;
        }

        // extracted features
        if (f.scheme)   f.scheme.innerHTML = res.meta.https
          ? '<span style="color:var(--emerald)">HTTPS · encrypted</span>'
          : '<span style="color:var(--rose)">' + (res.meta.hasScheme ? "HTTP · plaintext" : "no scheme") + "</span>";
        if (f.host)     f.host.textContent = res.meta.host || "—";
        if (f.tld)      f.tld.textContent = "." + (res.meta.tld || "—");
        if (f.kw)       f.kw.innerHTML = res.meta.hasKw
          ? '<span style="color:var(--rose)">' + res.meta.hasKw + " lure token(s)</span>"
          : '<span style="color:var(--muted)">none</span>';
        if (f.short)    f.short.innerHTML = yn(res.meta.isShort);
        if (f.private)  f.private.innerHTML = yn(res.meta.isPrivate);
        if (f.agree)    f.agree.textContent = Math.round(res.agreement * 100) + "%";
        if (f.active)   f.active.textContent = res.active + " / " + MODELS.length;
        if (f.gated)    f.gated.innerHTML = res.gated
          ? '<span style="color:var(--amber)">' + res.gated + " below gate</span>"
          : '<span style="color:var(--muted)">none</span>';
        if (f.blend)    f.blend.textContent = (res.blend * 100).toFixed(1) + "%";
        if (f.noisy)    f.noisy.textContent = (res.noisyOr * 100).toFixed(1) + "%";
        if (f.floor)    f.floor.innerHTML = res.floored
          ? '<span style="color:var(--rose)">applied · M-' + res.decisiveKey.slice(0, 2).toUpperCase() + "</span>"
          : '<span style="color:var(--muted)">not triggered</span>';
        if (f.hash)     f.hash.textContent = sha256ish(res.url);

        if (models) { models.style.opacity = "1"; models.style.pointerEvents = "auto"; }
      }, 2300);
    }

    form.addEventListener("submit", (e) => { e.preventDefault(); run(); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
  }

  /* ---------- BOOT -------------------------------------------------- */
  function boot() {
    initParticles();
    initToggles();
    initScrollSpy();
    initReveal();
    initCounters();
    initBars();
    initCopy();
    initOtp();
    initConsole();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
