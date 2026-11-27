/* LabMate version C — "fancy" layer (no framework, decorative only).
 * - scroll progress line, film grain, blur-up reveals
 * - hero: decorative particle network and title sheen
 * - lab illustration: camera HUD (corners, scan line, live timecode)
 * Everything is optional and is skipped with prefers-reduced-motion. */
(() => {
  if (window.__xf) return;
  window.__xf = true;
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  root.classList.add("xf");
  if (reduce) root.classList.add("xf-reduce");

  const el = (tag, cls, parent) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  };

  /* ---------- global overlays ---------- */
  const bar = el("div", "fx-progress", document.body);
  bar.setAttribute("aria-hidden", "true");

  const onScroll = () => {
    const h = root.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- frame loop (hud clocks) ---------- */
  const clocks = new Set();
  let t0 = performance.now();
  function loop(t) {
    if (t - t0 > 250 && !document.hidden) {
      t0 = t;
      const d = new Date();
      const s =
        String(d.getHours()).padStart(2, "0") +
        ":" +
        String(d.getMinutes()).padStart(2, "0") +
        ":" +
        String(d.getSeconds()).padStart(2, "0") +
        ":" +
        String(Math.floor(d.getMilliseconds() / 40)).padStart(2, "0");
      for (const c of clocks) if (c.isConnected && c.__vis) c.textContent = s;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------- hero particle network ---------- */
  function plexus(host) {
    if (host.querySelector(".fx-plexus")) return;
    const cv = el("canvas", "fx-plexus");
    cv.setAttribute("aria-hidden", "true");
    host.insertBefore(cv, host.firstChild);
    const ctx = cv.getContext("2d");
    let W = 0,
      H = 0,
      dpr = 1,
      pts = [],
      run = false;
    function size() {
      const r = host.getBoundingClientRect();
      dpr = Math.min(2, devicePixelRatio || 1);
      W = r.width;
      H = Math.min(r.height, innerHeight * 1.2);
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.height = H + "px";
      const n = Math.round(Math.min(130, (W * H) / 8000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.4 + 0.6,
      }));
    }
    function frame() {
      if (!run) return;
      const r = cv.getBoundingClientRect();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.vx *= 0.995;
        p.vy *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.x - b.x,
            dy = a.y - b.y,
            d = dx * dx + dy * dy;
          if (d < 120 * 120) {
            ctx.strokeStyle = `rgba(110,210,255,${0.38 * (1 - Math.sqrt(d) / 120)})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(190,236,255,.95)";
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, 6.283);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    size();
    addEventListener("resize", size);
    new IntersectionObserver((ents) => {
      const v = ents[0].isIntersecting;
      if (v && !run) {
        run = true;
        requestAnimationFrame(frame);
      } else if (!v) run = false;
    }).observe(host);
  }

  /* ---------- lab HUD ---------- */
  function hud(lb) {
    if (lb.querySelector(".fx-hud")) return;
    const h = el("div", "fx-hud", lb);
    h.setAttribute("aria-hidden", "true");
    for (const c of ["tl", "tr", "bl", "br"]) el("i", "fx-c fx-c-" + c, h);
    el("i", "fx-scan", h);
    const top = el("div", "fx-hud-top", h);
    el("b", "fx-rec", top).textContent = "LIVE";
    el("span", "", top).textContent = "CAM 01 · UFUG1403 PCR";
    const clk = el("span", "fx-clock", top);
    clocks.add(clk);
    const bot = el("div", "fx-hud-bot", h);
    el("span", "", bot).textContent = "6 / 6 BENCHES TRACKED";
    el("span", "fx-fps", bot).textContent = "30 FPS · 1446×910";
    new IntersectionObserver(
      (ents) => (clk.__vis = ents[0].isIntersecting),
    ).observe(lb);
  }

  /* ---------- story: chapter card, subtitle, step counter ---------- */
  function story(stage) {
    if (stage.__xf) return;
    stage.__xf = true;
    const view = stage.querySelector(".xj-view");
    if (!view) return;
    const deck = el("div", "fx-story", view);
    deck.setAttribute("aria-hidden", "true");
    const card = el("div", "fx-chapter", deck);
    const cn = el("b", "", card);
    const ct = el("span", "", card);
    el("i", "fx-chapter-sweep", card);
    const meta = el("div", "fx-meta", deck);
    const mScene = el("b", "", meta);
    const mStep = el("span", "", meta);
    const flash = el("div", "fx-flash", deck);
    /* AR view: a HUD inside the lens */
    const bench = stage.querySelector(".xj-bench");
    if (bench && !bench.querySelector(".fx-ar")) {
      const zh =
        (stage.closest("[lang]") || root).getAttribute("lang") !== "en" &&
        !(
          stage.closest("[data-lang]") &&
          stage.closest("[data-lang]").dataset.lang === "en"
        );
      const ar = el("div", "fx-ar", bench);
      ar.setAttribute("aria-hidden", "true");
      for (const c of ["tl", "tr", "bl", "br"]) el("i", "fx-c fx-c-" + c, ar);
      el("i", "fx-ar-grid", ar);
      el("i", "fx-scan", ar);
      const top = el("div", "fx-ar-top", ar);
      el("b", "fx-rec", top).textContent = "AR";
      el("span", "", top).textContent = zh
        ? "LabMate · PCR 第 1/9 项"
        : "LabMate · PCR item 1/9";
      const clk = el("span", "fx-clock", top);
      clocks.add(clk);
      new IntersectionObserver(
        (e) => (clk.__vis = e[0].isIntersecting),
      ).observe(bench);
      const side = el("div", "fx-ar-side", ar);
      for (const [k, v] of zh
        ? [
            ["对象", "移液器"],
            ["置信度", "0.97"],
            ["目标", "20 µL"],
          ]
        : [
            ["Object", "Pipette"],
            ["Conf.", "0.97"],
            ["Target", "20 µL"],
          ]) {
        const r = el("p", "", side);
        el("span", "", r).textContent = k;
        el("b", "", r).textContent = v;
      }
      const tick = el("div", "fx-ar-ticks", ar);
      for (let i = 0; i < 21; i++) el("i", i % 5 ? "" : "big", tick);
    }
    const sub = el("div", "fx-sub", deck);
    const subT = el("span", "", sub);
    el("i", "fx-sub-bar", sub);
    let lastScene = null,
      lastKey = "",
      typer = 0;
    const type = (txt) => {
      clearInterval(typer);
      if (reduce) {
        subT.textContent = txt;
        return;
      }
      let i = 0;
      subT.textContent = "";
      typer = setInterval(() => {
        i += 1;
        subT.textContent = txt.slice(0, i);
        if (i >= txt.length) clearInterval(typer);
      }, 28);
    };
    const update = () => {
      const s = stage.dataset.scene,
        k = +stage.dataset.k;
      if (s == null) return;
      const cap = stage.querySelector(`.xj-cap[data-cap="${s}"]`);
      if (!cap) return;
      const steps = cap.querySelectorAll("[data-step]");
      const num = (cap.querySelector(".x-chap b") || {}).textContent || "";
      const title = (cap.querySelector("h2") || {}).textContent || "";
      if (s !== lastScene) {
        /* chapter card + flash on scene change removed: too jumpy */
        lastScene = s;
        stage.dataset.fxScene = s;
      }
      mScene.textContent = num;
      mStep.textContent =
        k >= 0
          ? `${String(k + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`
          : `00 / ${String(steps.length).padStart(2, "0")}`;
      const key = s + ":" + k;
      if (key !== lastKey) {
        lastKey = key;
        const li = k >= 0 ? steps[k] : null;
        sub.classList.toggle("is-on", !!li);
        if (li) type(li.textContent.trim());
        const ol = cap.querySelector(".xj-steps");
        if (ol)
          ol.style.setProperty(
            "--fx-k",
            Math.max(0, k) / Math.max(1, steps.length - 1),
          );
      }
    };
    new MutationObserver(update).observe(stage, {
      attributes: true,
      attributeFilter: ["data-scene", "data-k"],
    });
    update();
  }

  /* ---------- reveals ---------- */
  const rio = new IntersectionObserver(
    (ents) => {
      for (const e of ents)
        if (e.isIntersecting) {
          e.target.classList.add("fx-in");
          rio.unobserve(e.target);
        }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );

  function scan() {
    /* hero particle network and rainbow title sheen removed: too busy */
    document.querySelectorAll(".lb").forEach(hud);
    document.querySelectorAll(".xj-stage").forEach(story);
    document
      .querySelectorAll(".x-head, .x-cta-inner, .x-hand-copy, .x-foot")
      .forEach((n) => {
        if (n.__xfr) return;
        n.__xfr = true;
        n.classList.add("fx-rv");
        rio.observe(n);
      });
  }
  scan();
  /* the static preview swaps views and Next swaps pages: rescan on DOM changes */
  let pend = 0;
  new MutationObserver(() => {
    if (pend) return;
    pend = requestAnimationFrame(() => {
      pend = 0;
      scan();
    });
  }).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden"],
  });
})();
