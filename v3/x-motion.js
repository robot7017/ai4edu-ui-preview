/* LabMate version C: small interaction layer (no framework).
 * - [data-inview]   adds .is-in once visible; counts up [data-count]
 * - [data-replay]   replays the nearest [data-inview]
 * - [data-flow]     student-app walkthrough: tabs, prev/next, swipe, keys, lightbox
 * - [data-tilt]     pointer tilt + light on team cards
 * - [data-collab]   collaboration map: area -> people
 * Everything is optional: without this script the page shows its final state. */
(() => {
  if (window.__xm) {
    window.__xm();
    return;
  }
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("xm");

  /* ---------- count up ---------- */
  function countUp(el) {
    const to = parseFloat(el.dataset.to);
    const dec = +(el.dataset.dec || 0);
    const pre = el.dataset.pre || "";
    if (reduce || isNaN(to)) {
      el.textContent = pre + to.toFixed(dec);
      return;
    }
    const delay = +(el.dataset.delay || 0);
    const dur = 1300;
    let t0 = 0;
    el.textContent = pre + (0).toFixed(dec);
    const step = (t) => {
      if (!t0) t0 = t + delay;
      const k = Math.min(1, Math.max(0, (t - t0) / dur));
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + (to * e).toFixed(dec);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- in view ---------- */
  const io = new IntersectionObserver(
    (ents) => {
      for (const e of ents) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        el.classList.add("is-in");
        el.querySelectorAll("[data-count]").forEach(countUp);
        io.unobserve(el);
      }
    },
    { threshold: 0.15 },
  );

  function replay(btn) {
    const box = btn.closest("[data-inview]");
    if (!box) return;
    box.classList.remove("is-in");
    void box.offsetWidth;
    requestAnimationFrame(() => {
      box.classList.add("is-in");
      box.querySelectorAll("[data-count]").forEach(countUp);
    });
  }

  /* ---------- lightbox ---------- */
  let lb;
  function lightbox(imgs, start, labels) {
    if (!lb) {
      lb = document.createElement("div");
      lb.className = "xm-lb";
      lb.innerHTML =
        '<button class="xm-lb-x" aria-label="Close">×</button>' +
        '<button class="xm-lb-p" aria-label="Previous"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<figure><img alt=""><figcaption></figcaption></figure>' +
        '<button class="xm-lb-n" aria-label="Next"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>';
      document.body.appendChild(lb);
    }
    let i = start;
    const img = lb.querySelector("img");
    const cap = lb.querySelector("figcaption");
    const show = () => {
      img.src = imgs[i].currentSrc || imgs[i].src;
      img.alt = imgs[i].alt;
      cap.textContent = `${i + 1} / ${imgs.length}  ${labels[i] || ""}`;
    };
    const close = () => {
      lb.classList.remove("on");
      document.removeEventListener("keydown", key);
    };
    const go = (d) => {
      i = (i + d + imgs.length) % imgs.length;
      show();
    };
    const key = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    lb.onclick = (e) => {
      if (e.target === lb || e.target.closest(".xm-lb-x")) close();
      if (e.target.closest(".xm-lb-p")) go(-1);
      if (e.target.closest(".xm-lb-n")) go(1);
    };
    document.addEventListener("keydown", key);
    show();
    lb.classList.add("on");
    lb.querySelector(".xm-lb-x").focus();
  }

  /* ---------- student flow ---------- */
  function flow(box) {
    const tabs = [...box.querySelectorAll("[data-flow-step]")];
    const shots = [...box.querySelectorAll("[data-flow-screen]")];
    const count = box.querySelector("[data-flow-count]");
    const n = tabs.length;
    let cur = 0;
    let auto = !reduce;
    let timer = 0;
    let visible = false;
    const set = (i, user) => {
      cur = (i + n) % n;
      if (user) auto = false;
      box.dataset.active = cur;
      box.classList.toggle("is-auto", auto);
      tabs.forEach((t, k) => {
        t.setAttribute("aria-selected", k === cur ? "true" : "false");
        t.tabIndex = k === cur ? 0 : -1;
        t.classList.toggle("on", k === cur);
        t.classList.toggle("done", k < cur);
      });
      shots.forEach((s, k) => {
        s.classList.toggle("on", k === cur);
        s.classList.toggle("before", k < cur);
      });
      if (count) count.textContent = `${cur + 1} / ${n}`;
      schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      if (auto && visible) timer = setTimeout(() => set(cur + 1), 6500);
    };
    tabs.forEach((t, k) => t.addEventListener("click", () => set(k, true)));
    box
      .querySelector("[data-flow-prev]")
      ?.addEventListener("click", () => set(cur - 1, true));
    box
      .querySelector("[data-flow-next]")
      ?.addEventListener("click", () => set(cur + 1, true));
    box.addEventListener("keydown", (e) => {
      if (e.target.closest("[data-flow-step],[data-flow-ctrl]")) {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          set(cur + 1, true);
          box.querySelector(".on[data-flow-step]")?.focus();
        }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          set(cur - 1, true);
          box.querySelector(".on[data-flow-step]")?.focus();
        }
      }
    });
    const screen = box.querySelector("[data-flow-stage]");
    let sx = 0;
    screen?.addEventListener(
      "touchstart",
      (e) => (sx = e.touches[0].clientX),
      { passive: true },
    );
    screen?.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) set(cur + (dx < 0 ? 1 : -1), true);
    });
    const labels = tabs.map((t) => t.querySelector("b")?.textContent || "");
    const open = () =>
      lightbox(
        shots.map((s) => s.querySelector("img") || s),
        cur,
        labels,
      );
    box.querySelector("[data-flow-zoom]")?.addEventListener("click", open);
    screen?.addEventListener("click", (e) => {
      if (!e.target.closest("button")) open();
    });
    box.addEventListener("mouseenter", () => clearTimeout(timer));
    box.addEventListener("mouseleave", schedule);
    new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        schedule();
      },
      { threshold: 0.4 },
    ).observe(box);
    set(0);
  }

  /* ---------- tilt ---------- */
  function tilt(card) {
    if (reduce || matchMedia("(hover: none)").matches) return;
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);
      card.style.setProperty("--ry", `${(x - 0.5) * 7}deg`);
      card.style.setProperty("--rx", `${(0.5 - y) * 6}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--rx", "0deg");
    });
  }

  /* ---------- collaboration map ---------- */
  function collab(box) {
    const areas = [...box.querySelectorAll("[data-area]")];
    const people = [...box.querySelectorAll("[data-person]")];
    let cur = 0;
    let auto = !reduce;
    let timer = 0;
    let visible = false;
    const set = (i, user) => {
      cur = (i + areas.length) % areas.length;
      if (user) auto = false;
      const ids = (areas[cur].dataset.people || "").split(" ");
      areas.forEach((a, k) => {
        a.classList.toggle("on", k === cur);
        a.setAttribute("aria-pressed", k === cur ? "true" : "false");
      });
      people.forEach((p) => {
        const on = ids.includes(p.dataset.person);
        p.classList.toggle("on", on);
        p.style.setProperty("--k", on ? ids.indexOf(p.dataset.person) : 0);
      });
      box.classList.add("has-active");
      clearTimeout(timer);
      if (auto && visible) timer = setTimeout(() => set(cur + 1), 4200);
    };
    areas.forEach((a, k) => {
      a.addEventListener("click", () => set(k, true));
      a.addEventListener("mouseenter", () => set(k, true));
      a.addEventListener("focus", () => set(k, true));
    });
    new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) set(cur);
        else clearTimeout(timer);
      },
      { threshold: 0.35 },
    ).observe(box);
  }

  /* ---------- simple tabs (work without React too) ---------- */
  function tabs(box) {
    const btns = [...box.querySelectorAll("[data-tab]")];
    const panels = [...box.querySelectorAll("[data-panel]")];
    btns.forEach((b) =>
      b.addEventListener("click", () => {
        const k = b.dataset.tab;
        btns.forEach((x) => {
          const on = x === b;
          x.classList.toggle("on", on);
          x.setAttribute("aria-selected", on ? "true" : "false");
        });
        panels.forEach((p) => (p.hidden = p.dataset.panel !== k));
      }),
    );
  }

  /* ---------- journey progress rail ---------- */
  function rail(nav) {
    const links = [...nav.querySelectorAll("[data-rail-for]")];
    const scope = nav.closest(".view") || document;
    const secs = links
      .map((a) => {
        const id = a.dataset.railFor;
        const el =
          scope.querySelector(`[id="${id}"]`) ||
          scope.querySelector(`[id$="--${id}"]`);
        if (el) a.dataset.railFor = el.id;
        return el;
      })
      .filter(Boolean);
    const seen = new Set();
    const rio = new IntersectionObserver(
      (ents) => {
        for (const e of ents) {
          if (e.isIntersecting) seen.add(e.target.id);
          else seen.delete(e.target.id);
        }
        nav.classList.toggle("show", seen.size > 0);
        const cur = secs.find((s) => seen.has(s.id));
        links.forEach((a) =>
          a.classList.toggle("on", !!cur && a.dataset.railFor === cur.id),
        );
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    secs.forEach((s) => rio.observe(s));
  }

  /* ---------- pinned journey: scroll -> scene / sub-step ----------
   * Scenes get scroll length in proportion to their content. Around each
   * boundary a shared variable --xN (0..1) drives the camera move from one
   * scene to the next, so every change is scrubbed by the scroll itself. */
  function journey(sec) {
    const stage = sec.querySelector(".xj-stage");
    const caps = [...sec.querySelectorAll("[data-cap]")];
    const counts = caps.map((c) => c.querySelectorAll("[data-step]").length || 1);
    const bench = sec.querySelector(".xj-bench");
    const fcard = sec.querySelector(".xj-fcard");
    const view = sec.querySelector(".xj-view");
    if (reduce) {
      sec.classList.add("xj-static");
      return;
    }
    sec.classList.add("xj-live");
    /* the lab overview and the AR scene get extra length for their camera moves */
    const extra = [2, 1.4, 1.4, 3.2, 2];
    const total = counts.reduce((a, b) => a + b, 0) + extra.reduce((a, b) => a + b, 0);
    const W = [0.18, 0.18, 0.16, 0.28, 0.2];
    const B = [0];
    W.forEach((w, i) => B.push(B[i] + w));
    const T = 0.035; /* half-width of each scene change, in p */
    const lead = [0, 0, 0, 0.36, 0.08]; /* part of a scene before its steps start */
    const size = () => {
      const per = innerWidth < 860 ? 200 : 260;
      sec.style.height = Math.round(innerHeight + total * per) + "px";
    };
    let last = "";
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const tick = () => {
      const r = sec.getBoundingClientRect();
      const span = r.height - innerHeight;
      const p = clamp(-r.top / (span || 1));
      let s = 0;
      while (s < W.length - 1 && p >= B[s + 1]) s++;
      const q = clamp((p - B[s]) / W[s]);
      const st = clamp((q - lead[s] - 0.04) / (1 - lead[s] - 0.1));
      const k =
        q < lead[s] ? -1 : Math.min(counts[s] - 1, Math.floor(st * counts[s]));
      stage.style.setProperty("--p", p.toFixed(4));
      stage.style.setProperty("--q", q.toFixed(4));
      for (let i = 1; i < W.length; i++) {
        stage.style.setProperty("--x" + i, clamp((p - (B[i] - T)) / (2 * T)).toFixed(4));
      }
      for (let i = 0; i < W.length; i++) {
        stage.style.setProperty("--b" + i, clamp((p - B[i]) / W[i]).toFixed(4));
      }
      /* bench -> flagged card on the teacher screen, measured */
      if (bench && fcard && view && s >= 3) {
        const v = view.getBoundingClientRect();
        const bw = bench.offsetWidth;
        const bh = bench.offsetHeight;
        const bx = v.left + bench.offsetLeft + bw / 2;
        const by = v.top + bench.offsetTop;
        const f = fcard.getBoundingClientRect();
        const sc = f.width / bw;
        stage.style.setProperty("--tx", (f.left + f.width / 2 - bx).toFixed(1) + "px");
        stage.style.setProperty("--ty", (f.top + f.height / 2 - by).toFixed(1) + "px");
        stage.style.setProperty("--ts", sc.toFixed(4));
        stage.style.setProperty(
          "--tc",
          Math.max(0, ((1 - f.height / (bh * sc)) / 2) * 100).toFixed(2) + "%",
        );
      }
      stage.dataset.g3d =
        (s === 2 && p > B[3] - T) || (s === 3 && q < 0.5) ? "on" : "off";
      const key = s + ":" + k;
      if (key !== last) {
        last = key;
        stage.dataset.scene = s;
        stage.dataset.k = k;
        caps.forEach((c, i) => {
          c.classList.toggle("on", i === s);
          c.querySelectorAll("[data-step]").forEach((li, j) => {
            li.classList.toggle("on", i === s && j === k);
            li.classList.toggle("done", i === s && j < k);
          });
        });
      }
    };
    let raf = 0;
    const req = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    addEventListener("scroll", req, { passive: true });
    addEventListener("resize", () => {
      size();
      req();
    });
    size();
    tick();
  }

  function init() {
    document.querySelectorAll("[data-journey]:not([data-xm])").forEach((b) => {
      b.dataset.xm = "1";
      journey(b);
    });
    document.querySelectorAll("[data-tabs]:not([data-xm])").forEach((b) => {
      b.dataset.xm = "1";
      tabs(b);
    });
    document.querySelectorAll("[data-rail]:not([data-xm])").forEach((b) => {
      b.dataset.xm = "1";
      rail(b);
    });
    document.querySelectorAll("[data-inview]:not([data-xm])").forEach((el) => {
      el.dataset.xm = "1";
      io.observe(el);
    });
    document.querySelectorAll("[data-replay]:not([data-xm])").forEach((b) => {
      b.dataset.xm = "1";
      b.addEventListener("click", () => replay(b));
    });
    document.querySelectorAll("[data-flow]:not([data-xm])").forEach((b) => {
      b.dataset.xm = "1";
      flow(b);
    });
    document.querySelectorAll("[data-tilt]:not([data-xm])").forEach((b) => {
      b.dataset.xm = "1";
      tilt(b);
    });
    document.querySelectorAll("[data-collab]:not([data-xm])").forEach((b) => {
      b.dataset.xm = "1";
      collab(b);
    });
  }
  window.__xm = init;
  init();
  let q = 0;
  new MutationObserver(() => {
    cancelAnimationFrame(q);
    q = requestAnimationFrame(init);
  }).observe(document.body, { childList: true, subtree: true });
})();
