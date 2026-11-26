/* LabMate version C — "fancy" layer (no framework, decorative only).
 * - scroll progress line, pointer spotlight, film grain, trailing cursor ring
 * - hero: particle network that follows the pointer, title sheen
 * - magnetic buttons, spotlight + tilt cards, blur-up reveals
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
  el("div", "fx-spot", document.body);
  el("div", "fx-grain", document.body);
  bar.setAttribute("aria-hidden", "true");

  let mx = innerWidth / 2,
    my = innerHeight / 3,
    rx = mx,
    ry = my,
    hoverish = false;
  const ring = fine && !reduce ? el("div", "fx-cursor", document.body) : null;
  const dot = ring ? el("div", "fx-cursor-dot", document.body) : null;

  addEventListener(
    "pointermove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      root.style.setProperty("--mx", mx + "px");
      root.style.setProperty("--my", my + "px");
      if (ring) {
        const t = e.target;
        hoverish = !!(
          t &&
          t.closest &&
          t.closest("a,button,[role=tab],.fx-card,.xj-steps li")
        );
        dot.style.transform = `translate(${mx}px,${my}px)`;
      }
    },
    { passive: true },
  );
  addEventListener("pointerdown", () => ring && ring.classList.add("is-down"));
  addEventListener("pointerup", () => ring && ring.classList.remove("is-down"));
  addEventListener("pointerleave", () => ring && ring.classList.add("is-out"));
  addEventListener(
    "pointerenter",
    () => ring && ring.classList.remove("is-out"),
  );

  const onScroll = () => {
    const h = root.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- frame loop (cursor ring + hud clocks) ---------- */
  const clocks = new Set();
  let t0 = performance.now();
  function loop(t) {
    if (ring) {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px,${ry}px) scale(${hoverish ? 1.9 : 1})`;
      ring.classList.toggle("is-hover", hoverish);
    }
    if (t - t0 > 80) {
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
      const px = mx - r.left,
        py = my - r.top;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        const dx = px - p.x,
          dy = py - p.y,
          d2 = dx * dx + dy * dy;
        if (d2 < 220 * 220) {
          p.vx += dx * 0.00002 * 6;
          p.vy += dy * 0.00002 * 6;
        }
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
        const dx = a.x - px,
          dy = a.y - py,
          d = Math.sqrt(dx * dx + dy * dy);
        if (d < 180) {
          ctx.strokeStyle = `rgba(140,225,255,${0.45 * (1 - d / 180)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(px, py);
          ctx.stroke();
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
    /* screens tilt toward the pointer */
    let vx = 0,
      vy = 0;
    const tilt = () => {
      const ay = -7 + vx * 6,
        ax = 4 - vy * 5;
      const a = Math.hypot(ax, ay) || 1;
      stage.style.setProperty(
        "--fx-rot",
        `${(ax / a).toFixed(3)} ${(ay / a).toFixed(3)} 0 ${a.toFixed(2)}deg`,
      );
      stage.style.setProperty("--fx-gx", 50 + vx * 40 + "%");
      stage.style.setProperty("--fx-gy", 50 + vy * 40 + "%");
    };
    tilt();
    if (!reduce)
      view.addEventListener("pointermove", (e) => {
        const r = view.getBoundingClientRect();
        vx = ((e.clientX - r.left) / r.width) * 2 - 1;
        vy = ((e.clientY - r.top) / r.height) * 2 - 1;
        tilt();
      });
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
        if (lastScene !== null && !reduce) {
          cn.textContent = num;
          ct.textContent = title;
          card.classList.remove("is-play");
          void card.offsetWidth;
          card.classList.add("is-play");
          flash.classList.remove("is-play");
          view.classList.remove("fx-cut");
          void flash.offsetWidth;
          flash.classList.add("is-play");
          view.classList.add("fx-cut");
        }
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

  /* ---------- magnetic buttons ---------- */
  function magnet(b) {
    if (b.__xf) return;
    b.__xf = true;
    b.classList.add("fx-mag");
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2,
        y = e.clientY - r.top - r.height / 2;
      b.style.setProperty("--tx", x * 0.25 + "px");
      b.style.setProperty("--ty", y * 0.35 + "px");
      b.style.setProperty("--bx", ((e.clientX - r.left) / r.width) * 100 + "%");
    });
    b.addEventListener("pointerleave", () => {
      b.style.setProperty("--tx", "0px");
      b.style.setProperty("--ty", "0px");
    });
  }

  /* ---------- spotlight + tilt cards ---------- */
  function card(c) {
    if (c.__xf) return;
    c.__xf = true;
    c.classList.add("fx-card");
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width,
        y = (e.clientY - r.top) / r.height;
      c.style.setProperty("--gx", x * 100 + "%");
      c.style.setProperty("--gy", y * 100 + "%");
      c.style.setProperty("--ry", (x - 0.5) * 8 + "deg");
      c.style.setProperty("--rx", (0.5 - y) * 6 + "deg");
    });
    c.addEventListener("pointerleave", () => {
      c.style.setProperty("--ry", "0deg");
      c.style.setProperty("--rx", "0deg");
    });
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
    document.querySelectorAll(".x-hero").forEach((h) => !reduce && plexus(h));
    document
      .querySelectorAll(".x-hero h1")
      .forEach((h) => h.classList.add("fx-sheen"));
    document.querySelectorAll(".lb").forEach(hud);
    document.querySelectorAll(".xj-stage").forEach(story);
    document
      .querySelectorAll(".x-btn, .site-cta")
      .forEach((b) => !reduce && magnet(b));
    document
      .querySelectorAll(
        ".x-site, .rc-grid > li, .x-gallery-item, .tm-card, [data-tilt]",
      )
      .forEach((c) => !reduce && card(c));
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
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden"],
  });
})();
