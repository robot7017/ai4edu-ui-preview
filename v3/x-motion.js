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
        '<button class="xm-lb-p" aria-label="Previous">‹</button>' +
        '<figure><img alt=""><figcaption></figcaption></figure>' +
        '<button class="xm-lb-n" aria-label="Next">›</button>';
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
      if (e.target === lb || e.target.classList.contains("xm-lb-x")) close();
      if (e.target.classList.contains("xm-lb-p")) go(-1);
      if (e.target.classList.contains("xm-lb-n")) go(1);
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

  function init() {
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
