/* Photo strip: slow auto-scroll that the viewer can take over (swipe, drag, wheel, buttons).
 * The track holds the photos twice, so scrolling wraps seamlessly. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const setup = (g) => {
    if (g.__gal) return;
    g.__gal = true;
    const track = g.querySelector(".x-gallery-track");
    if (!track) return;
    const zh = (document.documentElement.lang || "zh").startsWith("zh") && !g.closest('[data-lang="en"]');
    const ctrl = document.createElement("div");
    ctrl.className = "gal-ctrl";
    ctrl.innerHTML =
      `<button type="button" data-d="-1" aria-label="${zh ? "上一张" : "Previous"}"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>` +
      `<button type="button" data-d="1" aria-label="${zh ? "下一张" : "Next"}"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>`;
    g.after(ctrl);
    let pausedUntil = 0, visible = false, last = 0, carry = 0;
    const half = () => track.scrollWidth / 2;
    const wrap = () => {
      const h = half();
      if (h <= 0) return;
      if (g.scrollLeft >= h) g.scrollLeft -= h;
      else if (g.scrollLeft <= 0) g.scrollLeft += h;
    };
    const hold = (ms = 4000) => (pausedUntil = performance.now() + ms);
    const step = (now) => {
      if (!visible) return;
      const dt = Math.min(64, now - (last || now));
      last = now;
      if (!reduce && now > pausedUntil && !document.hidden) {
        carry += dt * 0.035; /* about 35 px per second */
        const px = Math.floor(carry);
        if (px) { g.scrollLeft += px; carry -= px; wrap(); }
      }
      requestAnimationFrame(step);
    };
    new IntersectionObserver((e) => {
      const v = e[0].isIntersecting;
      if (v && !visible) { visible = true; last = 0; requestAnimationFrame(step); }
      visible = v;
    }).observe(g);
    ["wheel", "touchstart", "pointerdown", "keydown"].forEach((t) => g.addEventListener(t, () => hold(), { passive: true }));
    g.addEventListener("scroll", () => wrap(), { passive: true });
    g.addEventListener("pointerenter", () => hold(1e9));
    g.addEventListener("pointerleave", () => hold(1200));
    /* mouse drag */
    let sx = 0, sl = 0, drag = false;
    g.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      drag = true; sx = e.clientX; sl = g.scrollLeft; g.classList.add("is-drag");
      g.setPointerCapture(e.pointerId);
    });
    g.addEventListener("pointermove", (e) => { if (drag) { g.scrollLeft = sl - (e.clientX - sx); wrap(); } });
    const end = () => { drag = false; g.classList.remove("is-drag"); };
    g.addEventListener("pointerup", end);
    g.addEventListener("pointercancel", end);
    ctrl.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      hold(6000);
      const item = track.querySelector(".x-gallery-item");
      const w = item ? item.getBoundingClientRect().width + 16 : 320;
      g.scrollBy({ left: w * +b.dataset.d, behavior: reduce ? "auto" : "smooth" });
    });
  };
  const scan = () => document.querySelectorAll(".x-gallery").forEach((g) => { if (!g.closest("[hidden]")) setup(g); });
  scan();
  new MutationObserver(scan).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["hidden"] });
})();
